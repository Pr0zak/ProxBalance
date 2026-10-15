"""Disk health (SMART) from GET /nodes/{node}/disks/list: parsing, the
cached summary, and the collector's quiet failure when the token lacks
Sys.Audit. No cluster needed."""

import threading

from proxmoxer.core import ResourceException

import collector_api
from proxbalance.disk_health import (
    is_notable,
    parse_health,
    parse_wearout,
    summarize_disks,
)

# Shapes copied from this cluster's pve4 (2026-10-14), serials trimmed.
NVME = {"devpath": "/dev/nvme0n1", "health": "PASSED", "model": "SPCC M.2 PCIe SSD",
        "size": 2048408248320, "type": "nvme", "wearout": 87, "used": "LVM"}
SATA_SSD = {"devpath": "/dev/sda", "health": "PASSED", "model": "T-FORCE_T253TY004T",
            "size": 4096805658624, "type": "ssd", "wearout": "N/A"}
HDD = {"devpath": "/dev/sdb", "health": "PASSED", "model": "ST5000LM000-2AN170",
       "size": 5000981078016, "type": "hdd", "wearout": "N/A", "rpm": "5526"}


def test_parse_health_values():
    assert parse_health("PASSED") == "PASSED"
    assert parse_health("OK") == "PASSED"  # SAS disks
    assert parse_health("passed ") == "PASSED"
    assert parse_health("FAILED") == "FAILED"
    assert parse_health("UNKNOWN") == "UNKNOWN"
    assert parse_health(None) == "UNKNOWN"
    assert parse_health("") == "UNKNOWN"
    assert parse_health(1) == "UNKNOWN"


def test_parse_wearout_absent_is_none_not_zero():
    assert parse_wearout(87) == 87
    assert parse_wearout("15") == 15
    assert parse_wearout(0) == 0
    assert parse_wearout("N/A") is None
    assert parse_wearout(None) is None
    assert parse_wearout("") is None
    assert parse_wearout(float("nan")) is None
    assert parse_wearout(True) is None
    assert parse_wearout(140) == 100


def test_summary_all_passed():
    s = summarize_disks([HDD, NVME, SATA_SSD])
    assert s["count"] == 3
    assert s["failed"] == 0 and s["unknown"] == 0 and s["notable"] == 0
    assert [d["devpath"] for d in s["disks"]] == ["/dev/nvme0n1", "/dev/sda", "/dev/sdb"]
    by = {d["devpath"]: d for d in s["disks"]}
    assert by["/dev/nvme0n1"]["wearout"] == 87
    assert by["/dev/sda"]["wearout"] is None
    assert by["/dev/sdb"]["size_bytes"] == 5000981078016


def test_summary_failed_unknown_and_worn():
    s = summarize_disks([
        {**HDD, "health": "FAILED"},
        {**SATA_SSD, "health": "UNKNOWN"},
        {**NVME, "wearout": 20},
        {**NVME, "devpath": "/dev/nvme1n1", "wearout": 21},
    ])
    assert s["count"] == 4
    assert s["failed"] == 1
    assert s["unknown"] == 1
    assert s["notable"] == 3  # FAILED, UNKNOWN, 20% left; 21% is fine


def test_missing_fields_stay_none():
    s = summarize_disks([{"devpath": "/dev/sdz"}])
    d = s["disks"][0]
    assert d == {"devpath": "/dev/sdz", "model": None, "type": None,
                 "size_bytes": None, "health": "UNKNOWN", "wearout": None}
    assert is_notable(d)


def test_not_a_list_is_none_empty_list_is_zero_disks():
    assert summarize_disks(None) is None
    assert summarize_disks({"errors": "x"}) is None
    assert summarize_disks([]) == {"count": 0, "failed": 0, "unknown": 0, "notable": 0, "disks": []}


# ---------------------------------------------------------------------------
# Collector: one call per node, permission error → None, logged once
# ---------------------------------------------------------------------------

class _Endpoint:
    def __init__(self, fn):
        self._fn = fn

    def __getattr__(self, name):
        if name == "get":
            return self._fn
        return self

    def __call__(self, *args, **kwargs):
        return self


def _collector(get_fn):
    c = collector_api.ProxmoxAPICollector.__new__(collector_api.ProxmoxAPICollector)
    c.collection_errors = []
    c._disk_health_logged = False
    c._disk_health_lock = threading.Lock()
    c.proxmox_slow = _Endpoint(get_fn)
    return c


def test_collector_returns_summary():
    c = _collector(lambda: [NVME, HDD])
    s = c.get_disk_health("pve4")
    assert s["count"] == 2 and s["notable"] == 0


def test_collector_permission_error_is_none_and_logged_once(capsys):
    def denied():
        raise ResourceException(403, "Forbidden", "Permission check failed (/nodes/pve4, Sys.Audit)")

    c = _collector(denied)
    assert c.get_disk_health("pve3") is None
    assert c.get_disk_health("pve4") is None
    err = capsys.readouterr().err
    assert err.count("disk health unavailable") == 1
    assert "[auth]" in err and "Sys.Audit" in err
    # Not a collection error: the UI shows nothing, no banner.
    assert c.collection_errors == []
