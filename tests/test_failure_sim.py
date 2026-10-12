"""Node-failure (N-1) simulation: placement rules, verdicts and the route."""

import pytest
from flask import Flask

from proxbalance.failure_sim import (
    simulate_node_failure, simulate_all_failures, guest_mem_demand_gb,
)


def _node(name, mem_pct=20.0, cpu=10.0, total=32.0, status="online", local=("local-lvm",)):
    storage = [{"storage": s, "shared": False} for s in local] + [{"storage": "nas", "shared": True}]
    return {"name": name, "status": status, "mem_percent": mem_pct, "cpu_percent": cpu,
            "total_mem_gb": total, "cpu_cores": 4, "storage": storage}


def _guest(vmid, node, mem, kind="VM", status="running", tags=(), storages=("nas",), **extra):
    excl = [t for t in tags if t.startswith("exclude_")]
    g = {
        "vmid": vmid, "name": f"g{vmid}", "type": kind, "node": node, "status": status,
        "mem_max_gb": mem, "mem_used_gb": mem, "cpu_avg_hour": 20.0, "cpu_cores": 2,
        "tags": {"all_tags": list(tags), "exclude_groups": excl, "has_ignore": "ignore" in tags},
        "local_disks": {"is_pinned": False},
        "disks": [{"key": f"scsi{i}", "storage": st, "volume": f"{st}:vm-{vmid}-disk-{i}", "size_gb": 8.0}
                  for i, st in enumerate(storages)],
        "passthrough_devices": [],
        "mount_points": {},
    }
    g.update(extra)
    return g


def _cluster(*guests, **node_overrides):
    nodes = {n: _node(n, **node_overrides.get(n, {})) for n in ("pve3", "pve4", "pve5")}
    return nodes, {str(g["vmid"]): g for g in guests}


def test_everything_fits():
    nodes, guests = _cluster(_guest(101, "pve4", 4), _guest(102, "pve4", 2), _guest(201, "pve3", 8))
    r = simulate_node_failure("pve4", nodes, guests)
    assert r["status"] == "ok"
    assert {p["vmid"] for p in r["placements"]} == {101, 102}
    assert r["cant_restart"] == [] and r["doesnt_fit"] == []
    assert r["verdict"].startswith("pve4 can fail: all 2 guests restart elsewhere, busiest node")
    survivors = {n["node"]: n for n in r["nodes"]}
    assert set(survivors) == {"pve3", "pve5"}
    # 20% of 32 GB = 6.4 GB used before; the added guests move memory up.
    assert sum(n["added_gb"] for n in r["nodes"]) == pytest.approx(6.0)
    assert all(n["cpu_after"] >= n["cpu_before"] for n in r["nodes"])


def test_largest_first_onto_most_free_memory():
    # pve3 has more free memory than pve5, so the biggest guest goes there first;
    # the next one lands wherever has the most room after that.
    nodes, guests = _cluster(
        _guest(101, "pve4", 2), _guest(102, "pve4", 10), _guest(103, "pve4", 6),
        pve3={"mem_pct": 10.0}, pve5={"mem_pct": 30.0},
    )
    r = simulate_node_failure("pve4", nodes, guests)
    order = [(p["vmid"], p["to"]) for p in r["placements"]]
    assert [v for v, _ in order] == [102, 103, 101]
    # pve3 free: 0.95*32-3.2=27.2 -> 102 there (17.2 left). pve5 free: 30.4-9.6=20.8 -> 103 there.
    assert order == [(102, "pve3"), (103, "pve5"), (101, "pve3")]


def test_local_disk_guest_capacity_by_default_strict_on_request():
    nodes, guests = _cluster(_guest(101, "pve4", 4, storages=("local-lvm",)), _guest(102, "pve4", 2))
    # Default (capacity): placed, flagged, and the note says it won't come back on its own.
    c = simulate_node_failure("pve4", nodes, guests)
    assert c["storage_mode"] == "capacity"
    placed = {p["vmid"]: p for p in c["placements"]}
    assert placed[101]["local_storage"] == ["local-lvm"]
    assert c["status"] == "ok"
    assert c["local_disk_note"] == (
        "If pve4 fails unexpectedly, 1 of its 2 guests doesn't restart elsewhere: "
        "its disks are node-local (restore from backup)")
    # Strict ("unplanned failure"): can't restart elsewhere.
    r = simulate_node_failure("pve4", nodes, guests, storage_mode="strict")
    assert [g["vmid"] for g in r["cant_restart"]] == [101]
    assert "node-local storage (local-lvm)" in r["cant_restart"][0]["reason"]
    assert r["status"] == "stranded"
    assert r["local_storage_guests"] == 1


def test_local_disk_note_all_guests_and_shared_fallback():
    nodes, guests = _cluster(_guest(101, "pve4", 4, storages=("local-lvm",)),
                             _guest(102, "pve4", 2, storages=("local-lvm", "nas")))
    assert simulate_node_failure("pve4", nodes, guests)["local_disk_note"].startswith(
        "If pve4 fails unexpectedly, its 2 guests don't restart elsewhere")
    # Storage entries without the shared flag fall back to the type (lvmthin = local).
    for n in nodes.values():
        n["storage"] = [{"storage": "local-lvm", "type": "lvmthin"}, {"storage": "nas", "type": "nfs"}]
    assert simulate_node_failure("pve4", nodes, guests)["local_storage_guests"] == 2
    only_nas = {"103": _guest(103, "pve4", 1)}
    assert simulate_node_failure("pve4", nodes, only_nas)["local_disk_note"] is None


def test_passthrough_and_bind_mount_cant_restart_but_ignore_is_placed():
    pinned = _guest(101, "pve4", 4)
    pinned["local_disks"].update(is_pinned=True, passthrough_disks=[{"device": "/dev/disk/by-id/x"}])
    bound = _guest(102, "pve4", 1, kind="CT", mount_points={
        "has_unshared_bind_mount": True,
        "mount_points": [{"is_bind_mount": True, "is_shared": False, "source": "/srv/data"}]})
    ignored = _guest(103, "pve4", 2, tags=("ignore",))
    nodes, guests = _cluster(pinned, bound, ignored)
    r = simulate_node_failure("pve4", nodes, guests)
    reasons = {g["vmid"]: g["reason"] for g in r["cant_restart"]}
    assert "passthrough disk /dev/disk/by-id/x" in reasons[101]
    assert "/srv/data" in reasons[102]
    assert [(p["vmid"], p["ignored"]) for p in r["placements"]] == [(103, True)]


def test_doesnt_fit_list():
    nodes, guests = _cluster(
        _guest(101, "pve4", 20), _guest(102, "pve4", 20), _guest(103, "pve4", 12),
        pve3={"mem_pct": 50.0}, pve5={"mem_pct": 50.0},
    )
    r = simulate_node_failure("pve4", nodes, guests)
    # Each survivor has 30.4 - 16 = 14.4 GB under the ceiling: only the 12 GB guest fits.
    assert [p["vmid"] for p in r["placements"]] == [103]
    assert sorted(g["vmid"] for g in r["doesnt_fit"]) == [101, 102]
    assert r["status"] == "short"
    assert r["verdict"] == "If pve4 fails, 2 guests (40 GB) don't fit"


def test_tight_when_survivor_ends_above_85():
    nodes, guests = _cluster(_guest(101, "pve4", 10), pve3={"mem_pct": 60.0}, pve5={"mem_pct": 60.0})
    r = simulate_node_failure("pve4", nodes, guests)
    assert r["status"] == "tight"
    assert r["busiest"]["mem_after"] > 85


def test_container_needs_what_it_uses():
    ct = _guest(101, "pve4", 8, kind="CT")
    ct["mem_used_gb"] = 0.5
    assert guest_mem_demand_gb(ct) == 0.5
    assert guest_mem_demand_gb(_guest(102, "pve4", 8)) == 8


def test_anti_affinity_tag_respected():
    # pve3 has the most room but runs the other DNS server.
    nodes, guests = _cluster(
        _guest(101, "pve4", 1, tags=("exclude_dns",)),
        _guest(201, "pve3", 1, tags=("exclude_dns",)),
        pve3={"mem_pct": 5.0}, pve5={"mem_pct": 40.0},
    )
    r = simulate_node_failure("pve4", nodes, guests)
    assert r["placements"][0]["to"] == "pve5"


def test_anti_affinity_everywhere_is_cant_restart():
    nodes, guests = _cluster(
        _guest(101, "pve4", 1, tags=("exclude_dns",)),
        _guest(201, "pve3", 1, tags=("exclude_dns",)),
        _guest(301, "pve5", 1, tags=("exclude_dns",)),
    )
    r = simulate_node_failure("pve4", nodes, guests)
    assert r["placements"] == []
    assert "anti-affinity tag exclude_dns" in r["cant_restart"][0]["reason"]


def test_ha_negative_rule_respected():
    ha = {"rules": [{"id": "keep-apart", "type": "resource-affinity", "affinity": "negative",
                     "resources": ["vm:101", "vm:201"]}], "resources": {}, "groups": {}}
    nodes, guests = _cluster(
        _guest(101, "pve4", 2), _guest(201, "pve3", 2),
        pve3={"mem_pct": 5.0}, pve5={"mem_pct": 40.0},
    )
    assert simulate_node_failure("pve4", nodes, guests)["placements"][0]["to"] == "pve3"
    r = simulate_node_failure("pve4", nodes, guests, ha_rules=ha)
    assert r["placements"][0]["to"] == "pve5"


def test_ha_negative_rule_between_displaced_guests():
    # Both members of a keep-apart rule fail together; they must land apart.
    ha = {"rules": [{"id": "keep-apart", "type": "resource-affinity", "affinity": "negative",
                     "resources": ["vm:101", "vm:102"]}], "resources": {}, "groups": {}}
    nodes, guests = _cluster(_guest(101, "pve4", 2), _guest(102, "pve4", 2), pve3={"mem_pct": 5.0})
    r = simulate_node_failure("pve4", nodes, guests, ha_rules=ha)
    assert len({p["to"] for p in r["placements"]}) == 2


def test_offline_node_excluded():
    nodes, guests = _cluster(_guest(101, "pve4", 4), pve5={"status": "offline", "mem_pct": 0.0})
    r = simulate_node_failure("pve4", nodes, guests)
    assert [n["node"] for n in r["nodes"]] == ["pve3"]
    assert r["placements"][0]["to"] == "pve3"
    assert simulate_node_failure("pve5", nodes, guests)["status"] == "offline"


def test_stopped_guests_are_not_displaced():
    nodes, guests = _cluster(_guest(101, "pve4", 4, status="stopped"))
    r = simulate_node_failure("pve4", nodes, guests)
    assert r["running_guests"] == 0
    assert r["verdict"] == "pve4 can fail: no guests running on it"


def test_all_nodes_summary():
    nodes, guests = _cluster(
        _guest(101, "pve3", 2), _guest(201, "pve4", 20), _guest(202, "pve4", 20), _guest(203, "pve4", 20),
        _guest(301, "pve5", 2, storages=("local-lvm",)),
    )
    s = simulate_all_failures(nodes, guests, storage_mode="strict")
    by = {r["node"]: r for r in s["nodes"]}
    assert by["pve3"]["status"] == "ok"
    assert by["pve4"]["status"] == "short" and by["pve4"]["doesnt_fit"] == 1
    assert by["pve5"]["status"] == "stranded"
    assert s["can_lose"] == ["pve3"]
    assert s["n1_ok"] is False
    assert s["verdict"].startswith("The cluster can lose pve3; losing pve4 leaves 1 guest")
    assert simulate_all_failures(*_cluster(_guest(101, "pve3", 2)))["verdict"] == "The cluster can lose any one node"
    # Default capacity view: pve5's local-disk guest is placed, so pve5 can fail.
    cap = {r["node"]: r for r in simulate_all_failures(nodes, guests)["nodes"]}
    assert cap["pve5"]["status"] == "ok" and cap["pve5"]["local_disk_note"]


class _FakeCache:
    def __init__(self, data):
        self.data = data

    def get(self):
        return self.data


def _client(cache):
    from proxbalance.routes.simulate import simulate_bp
    app = Flask(__name__)
    app.config["cache_manager"] = _FakeCache(cache)
    app.register_blueprint(simulate_bp)
    return app.test_client()


def test_route_single_node_and_summary():
    nodes, guests = _cluster(_guest(101, "pve4", 4))
    c = _client({"nodes": nodes, "guests": guests, "collected_at": "2026-10-11T00:00:00Z"})
    r = c.get("/api/simulate/node-failure?node=pve4").get_json()
    assert r["success"] and r["data"]["node"] == "pve4"
    assert r["data"]["placements"][0]["vmid"] == 101
    assert r["data"]["collected_at"] == "2026-10-11T00:00:00Z"
    s = c.get("/api/simulate/node-failure").get_json()
    assert s["success"] and [n["node"] for n in s["data"]["nodes"]] == ["pve3", "pve4", "pve5"]
    assert c.get("/api/simulate/node-failure?node=nope").status_code == 404
    assert c.get("/api/simulate/node-failure?storage=bogus").status_code == 400


def test_route_without_cache():
    assert _client(None).get("/api/simulate/node-failure").status_code == 503


def test_collector_records_passthrough_devices():
    import collector_api
    col = object.__new__(collector_api.ProxmoxAPICollector)
    assert col.detect_passthrough_devices({
        "scsi0": "local-lvm-2t:vm-507-disk-0,size=32G",
        "hostpci0": "0000:00:02.0,pcie=1",
        "usb0": "spice",
        "usb1": "host=1234:5678",
    }) == [{"key": "hostpci0", "device": "0000:00:02.0"}, {"key": "usb1", "device": "host=1234:5678"}]
    assert col.detect_passthrough_devices({
        "rootfs": "local-lvm:vm-244-disk-0,size=32G",
        "dev0": "/dev/dri/renderD128,gid=992",
    }) == [{"key": "dev0", "device": "/dev/dri/renderD128"}]


def test_passthrough_device_cant_restart():
    g = _guest(101, "pve4", 2)
    g["passthrough_devices"] = [{"key": "hostpci0", "device": "0000:00:02.0"}]
    nodes, guests = _cluster(g)
    r = simulate_node_failure("pve4", nodes, guests)
    assert r["cant_restart"][0]["reason"] == "passthrough hardware (hostpci0)"
