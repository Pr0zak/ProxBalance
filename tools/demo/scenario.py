"""
Demo cluster: made-up nodes and guests plus a deterministic load model.

Everything the demo shows comes from here: the fake Proxmox API
(``fake_pve.py``) answers from it and ``seed.py`` writes past history from
it, so live values, RRD charts and seeded history agree with each other.

Names are invented on purpose. Screenshots taken from the demo never show a
real cluster, so nothing has to be blurred.

Load model
----------
Each running guest has a CPU utilisation (share of its own cores) and a
memory use (share of its maximum). Both are functions of time: a base level,
a daily cycle, slow noise, optional short spikes and optional growth. A
node's load is the sum over the guests that were on it at that moment plus
a small host overhead, so a move in ``moves`` shows up in the node charts
at the time it happened.

The state file (``STATE_FILE``) keeps what changes while the demo runs:
where each guest is (with its move history), power state and tags.
"""

import json
import math
import os
import time
import zlib
from typing import Any, Dict, List, Optional

DAY = 86400
HOUR = 3600
GB = 1024 ** 3

STATE_FILE = os.environ.get("PB_DEMO_STATE", "/var/lib/pb-demo/state.json")

# Local time used for daily cycles (US Central, daylight time).
TZ_OFFSET_HOURS = -5

CLUSTER_NAME = "demo-lab"
PVE_VERSION = "9.2.1"

# name: cores, memory GiB, host CPU cores used, host memory GiB, base IO wait,
#       uptime days, disks, storages
NODES: Dict[str, Dict[str, Any]] = {
    "orion": {
        "cores": 16, "mem_gb": 128, "host_cpu": 0.5, "host_mem": 6.0, "io": 0.012, "uptime_days": 41,
        "disks": [
            ("/dev/nvme0n1", "Samsung SSD 990 PRO 2TB", "nvme", 2000, "PASSED", 94),
            ("/dev/nvme1n1", "Samsung SSD 990 PRO 2TB", "nvme", 2000, "PASSED", 95),
            ("/dev/sda", "Crucial MX500 500GB", "ssd", 500, "PASSED", 88),
        ],
        "local": [("local-lvm", "lvmthin", 1800, 0.46)],
    },
    "lyra": {
        "cores": 16, "mem_gb": 128, "host_cpu": 0.5, "host_mem": 6.0, "io": 0.015, "uptime_days": 41,
        "disks": [
            ("/dev/nvme0n1", "WD Black SN850X 2TB", "nvme", 2000, "PASSED", 90),
            ("/dev/nvme1n1", "WD Black SN850X 2TB", "nvme", 2000, "PASSED", 91),
        ],
        "local": [("local-lvm", "lvmthin", 1800, 0.52)],
    },
    "vega": {
        "cores": 8, "mem_gb": 64, "host_cpu": 0.4, "host_mem": 4.0, "io": 0.03, "uptime_days": 97,
        "disks": [
            ("/dev/nvme0n1", "Kingston KC3000 1TB", "nvme", 1000, "PASSED", 77),
            ("/dev/sda", "WDC WD120EFBX", "hdd", 12000, "PASSED", None),
            ("/dev/sdb", "WDC WD120EFBX", "hdd", 12000, "PASSED", None),
            ("/dev/sdc", "WDC WD120EFBX", "hdd", 12000, "PASSED", None),
            ("/dev/sdd", "WDC WD120EFBX", "hdd", 12000, "PASSED", None),
        ],
        "local": [("local-lvm", "lvmthin", 850, 0.84)],
    },
    "draco": {
        "cores": 12, "mem_gb": 96, "host_cpu": 0.5, "host_mem": 5.0, "io": 0.02, "uptime_days": 12,
        "disks": [
            ("/dev/nvme0n1", "Samsung SSD 980 PRO 1TB", "nvme", 1000, "PASSED", 63),
            ("/dev/nvme1n1", "Samsung SSD 980 PRO 1TB", "nvme", 1000, "PASSED", 61),
        ],
        "local": [("local-lvm", "lvmthin", 900, 0.58)],
    },
    "cygnus": {
        "cores": 8, "mem_gb": 64, "host_cpu": 0.3, "host_mem": 4.0, "io": 0.01, "uptime_days": 203,
        "disks": [
            ("/dev/nvme0n1", "Intel SSD 670p 1TB", "nvme", 1000, "PASSED", 9),
            ("/dev/sda", "Seagate ST4000VN008", "hdd", 4000, "FAILED", None),
            ("/dev/sdb", "Seagate ST4000VN008", "hdd", 4000, "PASSED", None),
        ],
        "local": [("local-lvm", "lvmthin", 850, 0.31)],
    },
}

# Shared storages (same on every node): name, type, content, total GB, used share.
SHARED_STORAGE = [
    ("nas-backups", "nfs", "backup,iso,vztmpl", 20000, 0.47),
    ("pbs", "pbs", "backup", 8000, 0.61),
]

# Guests. Keys:
#   t: "qemu" | "lxc"; node: where it is now; cores; mem (GiB max)
#   cpu: base CPU share of its cores; amp: daily swing (0-1); peak: local hour
#   memf: memory share in use now; grow: memory share added over 30 days
#   spiky / bursty: short spikes / CI-style bursts; io: IO wait it adds to its node
#   weekday: True for office-hours work (quieter at weekends)
#   tags, ha, pool, stopped, disk (GB), extra config keys (passthrough, mounts)
GUESTS: Dict[int, Dict[str, Any]] = {
    # orion
    101: dict(name="web-01", t="lxc", node="orion", cores=2, mem=4, cpu=0.22, amp=0.6, peak=14, memf=0.48, tags="web;exclude_web", disk=16),
    102: dict(name="web-02", t="lxc", node="orion", cores=2, mem=4, cpu=0.20, amp=0.6, peak=14, memf=0.45, tags="web;exclude_web", disk=16),
    110: dict(name="postgres-primary", t="qemu", node="orion", cores=4, mem=16, cpu=0.28, amp=0.5, peak=13, memf=0.82, tags="db", ha=True, disk=200, weekday=True),
    130: dict(name="dns1", t="lxc", node="orion", cores=1, mem=1, cpu=0.04, amp=0.3, peak=19, memf=0.35, tags="infra;exclude_dns", disk=4),
    140: dict(name="k8s-cp-1", t="qemu", node="orion", cores=2, mem=8, cpu=0.18, amp=0.2, peak=12, memf=0.61, pool="k8s", disk=64),
    150: dict(name="prometheus", t="lxc", node="orion", cores=2, mem=8, cpu=0.21, amp=0.1, peak=12, memf=0.66, tags="monitoring;affinity_monitoring", disk=120),
    151: dict(name="grafana", t="lxc", node="orion", cores=1, mem=2, cpu=0.05, amp=0.5, peak=10, memf=0.40, tags="monitoring;affinity_monitoring", disk=8),
    160: dict(name="vaultwarden", t="lxc", node="orion", cores=1, mem=1, cpu=0.02, amp=0.5, peak=9, memf=0.30, tags="apps", disk=4),
    170: dict(name="mail", t="lxc", node="orion", cores=2, mem=4, cpu=0.06, amp=0.4, peak=9, memf=0.55, tags="apps", disk=40),
    180: dict(name="win-dc01", t="qemu", node="orion", cores=2, mem=8, cpu=0.05, amp=0.5, peak=9, memf=0.24, tags="windows", ha=True, disk=80, weekday=True),
    # lyra
    111: dict(name="postgres-replica", t="qemu", node="lyra", cores=4, mem=16, cpu=0.14, amp=0.4, peak=13, memf=0.78, tags="db", ha=True, disk=200, weekday=True),
    141: dict(name="k8s-cp-2", t="qemu", node="lyra", cores=2, mem=8, cpu=0.17, amp=0.2, peak=12, memf=0.60, pool="k8s", disk=64),
    142: dict(name="k8s-worker-1", t="qemu", node="lyra", cores=4, mem=16, cpu=0.35, amp=0.5, peak=15, memf=0.70, pool="k8s", disk=100, weekday=True),
    143: dict(name="k8s-worker-2", t="qemu", node="lyra", cores=4, mem=16, cpu=0.33, amp=0.5, peak=15, memf=0.68, pool="k8s", disk=100, weekday=True),
    190: dict(name="elastic-1", t="qemu", node="lyra", cores=4, mem=20, cpu=0.25, amp=0.3, peak=11, memf=0.80, grow=0.30, tags="logging", disk=400),
    191: dict(name="elastic-2", t="qemu", node="lyra", cores=4, mem=20, cpu=0.24, amp=0.3, peak=11, memf=0.80, grow=0.30, tags="logging", disk=400),
    192: dict(name="elastic-3", t="qemu", node="lyra", cores=4, mem=20, cpu=0.22, amp=0.3, peak=11, memf=0.79, grow=0.30, tags="logging", disk=400),
    152: dict(name="loki", t="lxc", node="lyra", cores=2, mem=6, cpu=0.12, amp=0.2, peak=12, memf=0.62, tags="monitoring;affinity_monitoring", disk=200),
    161: dict(name="nextcloud", t="lxc", node="lyra", cores=2, mem=6, cpu=0.25, amp=0.7, peak=20, memf=0.58, tags="apps", disk=60),
    171: dict(name="minio", t="lxc", node="lyra", cores=2, mem=4, cpu=0.08, amp=0.4, peak=2, memf=0.52, tags="storage", disk=20),
    # vega
    200: dict(name="nas-01", t="qemu", node="vega", cores=2, mem=16, cpu=0.20, amp=0.6, peak=2, memf=0.88, io=0.20, tags="storage", disk=32,
              extra={"hostpci0": "0000:03:00.0,pcie=1", "scsi1": "/dev/disk/by-id/ata-WDC_WD120EFBX-68B0EN0_D7G0A1B2,size=11176G"}),
    201: dict(name="backup-proxy", t="lxc", node="vega", cores=2, mem=2, cpu=0.06, amp=0.9, peak=2, memf=0.40, io=0.03, tags="storage", disk=8),
    202: dict(name="syncthing", t="lxc", node="vega", cores=1, mem=1, cpu=0.05, amp=0.4, peak=21, memf=0.38, tags="storage", disk=8,
              extra={"mp0": "/mnt/tank/sync,mp=/data"}),
    203: dict(name="photoprism", t="lxc", node="vega", cores=2, mem=6, cpu=0.10, amp=0.6, peak=21, memf=0.50, tags="apps", disk=30),
    204: dict(name="unifi", t="lxc", node="vega", cores=1, mem=2, cpu=0.06, amp=0.2, peak=12, memf=0.62, tags="infra", disk=12),
    # draco (busy: CI and builds)
    120: dict(name="gitlab", t="qemu", node="draco", cores=4, mem=12, cpu=0.30, amp=0.6, peak=14, memf=0.74, tags="dev;affinity_req_gitlab", disk=250, weekday=True),
    121: dict(name="gitlab-runner-1", t="lxc", node="draco", cores=4, mem=4, cpu=0.38, amp=0.4, peak=15, memf=0.55, bursty=True, tags="dev;ci;affinity_req_gitlab", disk=50, weekday=True),
    122: dict(name="build-agent-1", t="qemu", node="draco", cores=4, mem=8, cpu=0.36, amp=0.4, peak=15, memf=0.63, bursty=True, tags="dev;ci", disk=80, weekday=True),
    123: dict(name="build-agent-2", t="qemu", node="draco", cores=4, mem=8, cpu=0.34, amp=0.4, peak=16, memf=0.60, bursty=True, tags="dev;ci", disk=80, weekday=True),
    124: dict(name="ci-cache", t="lxc", node="draco", cores=1, mem=2, cpu=0.06, amp=0.5, peak=15, memf=0.45, tags="dev;ci", disk=100),
    144: dict(name="k8s-cp-3", t="qemu", node="draco", cores=2, mem=8, cpu=0.17, amp=0.2, peak=12, memf=0.60, pool="k8s", disk=64),
    145: dict(name="k8s-worker-3", t="qemu", node="draco", cores=4, mem=16, cpu=0.30, amp=0.5, peak=15, memf=0.71, pool="k8s", disk=100, weekday=True),
    172: dict(name="redis-cache", t="lxc", node="draco", cores=1, mem=4, cpu=0.12, amp=0.5, peak=14, memf=0.94, tags="db", disk=8),
    181: dict(name="win-rdp", t="qemu", node="draco", cores=4, mem=12, cpu=0.10, amp=0.8, peak=10, memf=0.55, tags="windows", disk=120, weekday=True),
    # cygnus (quiet)
    131: dict(name="dns2", t="lxc", node="cygnus", cores=1, mem=1, cpu=0.04, amp=0.3, peak=19, memf=0.34, tags="infra;exclude_dns", disk=4),
    153: dict(name="jellyfin", t="lxc", node="cygnus", cores=4, mem=8, cpu=0.08, amp=0.9, peak=21, memf=0.42, spiky=True, tags="media", disk=40,
              extra={"dev0": "/dev/dri/renderD128,gid=104"}),
    173: dict(name="wiki", t="lxc", node="cygnus", cores=1, mem=2, cpu=0.04, amp=0.5, peak=10, memf=0.45, tags="apps", disk=10),
    174: dict(name="uptime-kuma", t="lxc", node="cygnus", cores=1, mem=1, cpu=0.05, amp=0.1, peak=12, memf=0.50, tags="infra", disk=4),
    175: dict(name="dev-sandbox", t="qemu", node="cygnus", cores=4, mem=16, cpu=0.0, amp=0, peak=12, memf=0.0, stopped=True, tags="dev", disk=60),
    176: dict(name="legacy-erp", t="qemu", node="cygnus", cores=2, mem=8, cpu=0.03, amp=0.3, peak=10, memf=0.12, tags="apps", disk=60, weekday=True),
    177: dict(name="mqtt-broker", t="lxc", node="cygnus", cores=1, mem=1, cpu=0.03, amp=0.2, peak=18, memf=0.40, tags="infra;ignore", disk=4),
}

# Guests without a backup (shown on Insights / guest table).
NOT_BACKED_UP = [124, 175]

# HA rules (Proxmox VE 9 format).
HA_RULES = [
    {"rule": "db-apart", "type": "resource-affinity", "affinity": "negative",
     "resources": "vm:110,vm:111", "disable": 0},
    {"rule": "db-primary-fast", "type": "node-affinity", "resources": "vm:110",
     "nodes": "orion:2,lyra:1", "strict": 0, "disable": 0},
]

# Past moves: (days ago, vmid, from, to, why). Applied to the move history at
# install time, so node charts show the relief when each move happened.
PAST_MOVES = [
    (16, 142, "orion", "lyra", "cpu"),
    (15, 143, "draco", "lyra", "cpu"),
    (14, 161, "draco", "lyra", "cpu"),
    (12, 145, "lyra", "draco", "cpu"),
    (10, 153, "draco", "cygnus", "cpu"),
    (9, 176, "orion", "cygnus", "cpu"),
    (8, 203, "draco", "vega", "cpu"),
    (4.2, 190, "orion", "lyra", "mem"),
    (2.6, 131, "orion", "cygnus", "rule"),
    (1.4, 102, "lyra", "orion", "manual"),
]


# ---------------------------------------------------------------------------
# Deterministic noise
# ---------------------------------------------------------------------------

def _h(*parts: Any) -> float:
    """Stable hash of ``parts`` in [0, 1)."""
    return (zlib.crc32("|".join(str(p) for p in parts).encode()) & 0xFFFFFFFF) / 2 ** 32


def _smooth(key: Any, t: float, step: float) -> float:
    """Smooth value noise in [-1, 1] with features about ``step`` seconds long."""
    k = math.floor(t / step)
    f = t / step - k
    a = _h(key, step, k) * 2 - 1
    b = _h(key, step, k + 1) * 2 - 1
    w = (1 - math.cos(math.pi * f)) / 2
    return a + (b - a) * w


def _local_hour(t: float) -> float:
    return ((t / HOUR) + TZ_OFFSET_HOURS) % 24


def _weekday(t: float) -> int:
    """0 = Monday ... 6 = Sunday, local time."""
    return int(((t + TZ_OFFSET_HOURS * HOUR) // DAY + 3) % 7)  # 1970-01-01 was a Thursday


def _daily(t: float, peak: float) -> float:
    """Daily cycle in [0, 1], 1 at ``peak`` local hour."""
    return 0.5 + 0.5 * math.cos(2 * math.pi * (_local_hour(t) - peak) / 24)


# ---------------------------------------------------------------------------
# Guest and node load
# ---------------------------------------------------------------------------

def guest_cpu(vmid: int, t: float) -> float:
    """CPU use of a running guest as a share of its own cores (0-1)."""
    g = GUESTS[vmid]
    base = g["cpu"]
    if base <= 0:
        return 0.0
    level = base * (1 + g.get("amp", 0) * (_daily(t, g.get("peak", 12)) - 0.5) * 1.6)
    if g.get("weekday") and _weekday(t) >= 5:
        level *= 0.45
    level *= 1 + 0.18 * _smooth(("c", vmid), t, 2 * HOUR) + 0.10 * _smooth(("c2", vmid), t, 900)
    if g.get("bursty"):
        burst = max(0.0, _smooth(("b", vmid), t, 1200))
        level *= 0.65 + 0.75 * burst
    if g.get("spiky") and _h("s", vmid, math.floor(t / 600)) > 0.965:
        level += 0.55
    return max(0.005, min(level, 1.0))


def guest_mem(vmid: int, t: float, now: Optional[float] = None) -> float:
    """Memory use of a running guest as a share of its maximum (0-1)."""
    g = GUESTS[vmid]
    if g.get("memf", 0) <= 0:
        return 0.0
    now = now or time.time()
    level = g["memf"] - g.get("grow", 0) * max(0.0, now - t) / (30 * DAY)
    level += 0.015 * _smooth(("m", vmid), t, 3 * HOUR)
    return max(0.02, min(level, 0.99))


def guest_io(vmid: int, t: float) -> float:
    """IO wait share this guest adds to its node."""
    io = GUESTS[vmid].get("io", 0)
    if not io:
        return 0.0
    return io * (0.55 + 0.9 * _daily(t, GUESTS[vmid].get("peak", 2))) * (1 + 0.25 * _smooth(("io", vmid), t, HOUR))


def node_of(state: Dict[str, Any], vmid: int, t: float) -> str:
    """Where a guest was at time ``t`` according to its move history."""
    hist = state["guests"][str(vmid)]["history"]
    where = hist[0][1]
    for ts, node in hist:
        if ts <= t:
            where = node
        else:
            break
    return where


def running(state: Dict[str, Any], vmid: int) -> bool:
    return state["guests"][str(vmid)]["status"] == "running"


def node_sample(state: Dict[str, Any], node: str, t: float, members: Optional[List[int]] = None) -> Dict[str, float]:
    """Node load at time ``t``: cpu/iowait as shares, memory in bytes."""
    n = NODES[node]
    if members is None:
        members = [v for v in GUESTS if node in {h[1] for h in state["guests"][str(v)]["history"]}]
    cpu_cores = n["host_cpu"] * (1 + 0.3 * _smooth(("hc", node), t, HOUR))
    mem_gb = n["host_mem"]
    io = n["io"] * (1 + 0.3 * _smooth(("hio", node), t, 2 * HOUR))
    for vmid in members:
        if not running(state, vmid) or node_of(state, vmid, t) != node:
            continue
        g = GUESTS[vmid]
        cpu_cores += guest_cpu(vmid, t) * g["cores"]
        mem_gb += guest_mem(vmid, t) * g["mem"]
        io += guest_io(vmid, t)
    cpu = min(cpu_cores / n["cores"], 0.99)
    io = min(io, 0.6)
    return {
        "cpu": cpu,
        "mem": min(mem_gb, n["mem_gb"] * 0.98) * GB,
        "maxmem": n["mem_gb"] * GB,
        "iowait": io,
        "loadavg": cpu * n["cores"] * 1.05,
        "psi_io": min(100.0, io * 100 * 1.5 + 1.5 * (1 + _smooth(("pio", node), t, 1800))),
        "psi_cpu": max(0.0, (cpu - 0.45) * 55),
        "psi_mem": max(0.0, (mem_gb / n["mem_gb"] - 0.8) * 20),
    }


def node_members(state: Dict[str, Any], node: str) -> List[int]:
    """Guests that were on ``node`` at any time (for history lookups)."""
    return [v for v in GUESTS if node in {h[1] for h in state["guests"][str(v)]["history"]}]


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

def move_time(now: float, days: float, why: str) -> float:
    """When a past move happened: ``days`` ago, but CPU moves land on a
    Monday-Thursday afternoon (so the day after is a working day too, and
    the outcome compares like with like)."""
    t = now - days * DAY
    if why != "cpu":
        return t
    local = t + TZ_OFFSET_HOURS * HOUR
    t = t - (local % DAY) + 11 * HOUR  # 11:00 local that day
    while _weekday(t) > 3:
        t -= DAY
    return t


def initial_state(now: Optional[float] = None) -> Dict[str, Any]:
    """Placement with the past moves applied, as absolute timestamps."""
    now = now or time.time()
    guests: Dict[str, Any] = {}
    for vmid, g in GUESTS.items():
        guests[str(vmid)] = {
            "history": [[0, g["node"]]],
            "status": "stopped" if g.get("stopped") else "running",
            "tags": g.get("tags", ""),
        }
    # Rebuild each moved guest's history: it started on the source node.
    for days, vmid, src, dst, _why in sorted(PAST_MOVES, key=lambda m: -m[0]):
        hist = guests[str(vmid)]["history"]
        if hist == [[0, GUESTS[vmid]["node"]]]:
            hist[0] = [0, src]
        hist.append([round(move_time(now, days, _why)), dst])
    return {"created": now, "guests": guests, "tasks": []}


def load_state() -> Dict[str, Any]:
    with open(STATE_FILE) as f:
        return json.load(f)


def save_state(state: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f)
    os.replace(tmp, STATE_FILE)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "init":
        save_state(initial_state())
        print(f"wrote {STATE_FILE}")
    else:
        st = initial_state()
        now = time.time()
        for name in NODES:
            s = node_sample(st, name, now)
            print(f"{name:7s} cpu {s['cpu']*100:5.1f}%  mem {s['mem']/s['maxmem']*100:5.1f}%  io {s['iowait']*100:4.1f}%")
