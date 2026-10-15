"""
Fake Proxmox VE API for the ProxBalance demo cluster.

Serves ``/api2/json/...`` over HTTPS (default port 8006) from the made-up
cluster in ``scenario.py``. It answers the reads ProxBalance makes (cluster
resources, node and guest RRD data, storage, disks, HA, pools, quorum,
permissions, tasks) and simulates the writes it sends: a migrate POST
starts a task that finishes after a few seconds and moves the guest; tag
edits, start and stop change the stored state.

Nothing here talks to a real Proxmox host. Any token is accepted.

Usage::

    python3 fake_pve.py --cert cert.pem --key key.pem [--port 8006]
"""

import argparse
import logging
import math
import os
import sys
import threading
import time
from typing import Any, Dict, List

from flask import Flask, jsonify, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scenario as sc  # noqa: E402

app = Flask(__name__)
log = logging.getLogger("fake_pve")
LOCK = threading.RLock()
STATE: Dict[str, Any] = {}

# RRD layouts: (step seconds, points, sub-samples averaged per point)
TIMEFRAMES = {
    "hour": (60, 70, 1),
    "day": (60, 1440, 1),
    "week": (300, 2016, 1),
    "month": (1800, 1488, 2),
    "year": (21600, 1460, 6),
}

_rrd_cache: Dict[Any, Any] = {}


def ok(data: Any):
    return jsonify({"data": data})


def err(code: int, msg: str):
    return jsonify({"data": None, "errors": {"message": msg}, "message": msg}), code


def now() -> float:
    return time.time()


def save():
    sc.save_state(STATE)


def guest_node(vmid: int) -> str:
    return STATE["guests"][str(vmid)]["history"][-1][1]


def guest_status(vmid: int) -> str:
    return STATE["guests"][str(vmid)]["status"]


def guest_uptime(vmid: int) -> int:
    """Seconds since the guest last started (its last move restarts nothing for VMs)."""
    days = sc.NODES[guest_node(vmid)]["uptime_days"]
    return int(days * sc.DAY * (0.4 + 0.6 * sc._h("up", vmid)))


def _resource_guest(vmid: int) -> Dict[str, Any]:
    g = sc.GUESTS[vmid]
    t = now()
    run = guest_status(vmid) == "running"
    cpu = sc.guest_cpu(vmid, t) if run else 0
    mem = sc.guest_mem(vmid, t) * g["mem"] * sc.GB if run else 0
    res = {
        "id": f"{g['t']}/{vmid}", "type": g["t"], "vmid": vmid, "name": g["name"],
        "node": guest_node(vmid), "status": guest_status(vmid),
        "cpu": round(cpu, 4), "maxcpu": g["cores"],
        "mem": int(mem), "maxmem": int(g["mem"] * sc.GB),
        "disk": int(g.get("disk", 8) * sc.GB * (0.35 + 0.4 * sc._h("d", vmid))),
        "maxdisk": int(g.get("disk", 8) * sc.GB),
        "uptime": guest_uptime(vmid) if run else 0,
        "template": 0,
        "tags": STATE["guests"][str(vmid)]["tags"],
        "hastate": "started" if g.get("ha") else None,
        "pool": g.get("pool"),
    }
    return {k: v for k, v in res.items() if v is not None}


def _resource_node(name: str) -> Dict[str, Any]:
    n = sc.NODES[name]
    s = sc.node_sample(STATE, name, now(), sc.node_members(STATE, name))
    return {
        "id": f"node/{name}", "type": "node", "node": name, "status": "online",
        "cpu": round(s["cpu"], 4), "maxcpu": n["cores"],
        "mem": int(s["mem"]), "maxmem": int(s["maxmem"]),
        "disk": int(40 * sc.GB), "maxdisk": int(100 * sc.GB),
        "uptime": int(n["uptime_days"] * sc.DAY), "level": "", "cgroup-mode": 2,
    }


def _storage_rows(name: str) -> List[Dict[str, Any]]:
    rows = []
    for sid, stype, total_gb, used in sc.NODES[name]["local"]:
        rows.append(dict(storage=sid, type=stype, content="images,rootdir", active=1, enabled=1, shared=0,
                         total=int(total_gb * sc.GB), used=int(total_gb * used * sc.GB),
                         avail=int(total_gb * (1 - used) * sc.GB)))
    rows.append(dict(storage="local", type="dir", content="iso,vztmpl,backup", active=1, enabled=1, shared=0,
                     total=int(94 * sc.GB), used=int(21 * sc.GB), avail=int(73 * sc.GB)))
    for sid, stype, content, total_gb, used in sc.SHARED_STORAGE:
        rows.append(dict(storage=sid, type=stype, content=content, active=1, enabled=1, shared=1,
                         total=int(total_gb * sc.GB), used=int(total_gb * used * sc.GB),
                         avail=int(total_gb * (1 - used) * sc.GB)))
    return rows


# ---------------------------------------------------------------------------
# RRD
# ---------------------------------------------------------------------------

def _node_rrd(name: str, timeframe: str) -> List[Dict[str, Any]]:
    step, points, sub = TIMEFRAMES.get(timeframe, TIMEFRAMES["hour"])
    end = math.floor(now() / step) * step
    key = ("n", name, timeframe, end)
    if key in _rrd_cache:
        return _rrd_cache[key]
    members = sc.node_members(STATE, name)
    rows = []
    for i in range(points):
        t0 = end - (points - 1 - i) * step
        acc: Dict[str, float] = {}
        for j in range(sub):
            s = sc.node_sample(STATE, name, t0 - j * step / sub, members)
            for k, v in s.items():
                acc[k] = acc.get(k, 0) + v / sub
        rows.append({
            "time": int(t0), "cpu": round(acc["cpu"], 5), "maxcpu": sc.NODES[name]["cores"],
            "memused": int(acc["mem"]), "memtotal": int(acc["maxmem"]),
            "iowait": round(acc["iowait"], 5), "loadavg": round(acc["loadavg"], 2),
            "netin": round(2e6 * (1 + acc["cpu"] * 3), 1), "netout": round(1.5e6 * (1 + acc["cpu"] * 3), 1),
            "pressureiosome": round(acc["psi_io"], 2), "pressureiofull": round(acc["psi_io"] * 0.55, 2),
            "pressurecpusome": round(acc["psi_cpu"], 2), "pressurememorysome": round(acc["psi_mem"], 2),
            "rootused": int(21 * sc.GB), "roottotal": int(94 * sc.GB),
        })
    _rrd_cache.clear() if len(_rrd_cache) > 200 else None
    _rrd_cache[key] = rows
    return rows


def _guest_rrd(vmid: int, timeframe: str) -> List[Dict[str, Any]]:
    step, points, sub = TIMEFRAMES.get(timeframe, TIMEFRAMES["hour"])
    g = sc.GUESTS[vmid]
    end = math.floor(now() / step) * step
    run = guest_status(vmid) == "running"
    rows = []
    for i in range(points):
        t = end - (points - 1 - i) * step
        cpu = sc.guest_cpu(vmid, t) if run else 0
        io = sc.guest_io(vmid, t)
        rows.append({
            "time": int(t), "cpu": round(cpu, 5), "maxcpu": g["cores"],
            "mem": int(sc.guest_mem(vmid, t) * g["mem"] * sc.GB) if run else 0, "maxmem": int(g["mem"] * sc.GB),
            "diskread": round((2e5 + io * 4e8) * (0.5 + cpu), 1), "diskwrite": round((1e5 + io * 2e8) * (0.5 + cpu), 1),
            "netin": round(5e4 + cpu * 3e6, 1), "netout": round(4e4 + cpu * 2e6, 1),
            "pressureiosome": round(min(100, io * 150 + cpu * 3), 2), "pressureiofull": round(min(100, io * 80), 2),
            "pressurecpusome": round(max(0, cpu - 0.6) * 40, 2), "pressurememorysome": 0.0,
        })
    return rows


# ---------------------------------------------------------------------------
# Guest config
# ---------------------------------------------------------------------------

def _guest_config(vmid: int) -> Dict[str, Any]:
    g = sc.GUESTS[vmid]
    tags = STATE["guests"][str(vmid)]["tags"]
    if g["t"] == "qemu":
        cfg = {"name": g["name"], "cores": g["cores"], "sockets": 1, "memory": str(g["mem"] * 1024),
               "scsi0": f"local-lvm:vm-{vmid}-disk-0,iothread=1,size={g.get('disk', 32)}G",
               "net0": f"virtio=BC:24:11:{vmid % 100:02X}:1A:2B,bridge=vmbr0", "ostype": "l26",
               "agent": "1", "boot": "order=scsi0", "digest": "demo"}
        if g["name"].startswith("win"):
            cfg["ostype"] = "win11"
    else:
        cfg = {"hostname": g["name"], "cores": g["cores"], "memory": g["mem"] * 1024, "swap": 512,
               "rootfs": f"local-lvm:vm-{vmid}-disk-0,size={g.get('disk', 8)}G",
               "net0": f"name=eth0,bridge=vmbr0,hwaddr=BC:24:11:{vmid % 100:02X}:3C:4D,ip=dhcp,type=veth",
               "ostype": "debian", "unprivileged": 1, "digest": "demo"}
    if tags:
        cfg["tags"] = tags
    cfg.update(g.get("extra", {}))
    return cfg


def _find_guest(vmid: str, kind: str):
    try:
        v = int(vmid)
    except ValueError:
        return None
    g = sc.GUESTS.get(v)
    if not g or g["t"] != kind:
        return None
    return v


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

def _new_task(node: str, ttype: str, vmid: int, duration: float, on_done=None) -> str:
    start = int(now())
    upid = f"UPID:{node}:{os.getpid():08X}:{int(sc._h(start, vmid) * 1e8):08X}:{start:08X}:{ttype}:{vmid}:proxbalance@pam!demo:"
    task = {"upid": upid, "node": node, "type": ttype, "id": str(vmid), "user": "proxbalance@pam!demo",
            "starttime": start, "duration": duration, "status": "running", "exitstatus": None}
    with LOCK:
        STATE.setdefault("tasks", []).append(task)
        STATE["tasks"] = STATE["tasks"][-200:]
        save()

    def finish():
        time.sleep(duration)
        with LOCK:
            if on_done:
                on_done()
            task["status"] = "stopped"
            task["exitstatus"] = "OK"
            task["endtime"] = int(now())
            for t in STATE["tasks"]:
                if t["upid"] == upid:
                    t.update(task)
            save()
    threading.Thread(target=finish, daemon=True).start()
    return upid


def _task(upid: str):
    for t in STATE.get("tasks", []):
        if t["upid"] == upid:
            return t
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

P = "/api2/json"


@app.route(f"{P}/version")
@app.route(f"{P}/nodes/<node>/version")
def version(node=None):
    return ok({"version": sc.PVE_VERSION, "release": "9.2", "repoid": "demo0000"})


@app.route(f"{P}/cluster/resources")
def cluster_resources():
    rtype = request.args.get("type")
    with LOCK:
        out = []
        if rtype in (None, "node"):
            out += [_resource_node(n) for n in sc.NODES]
        if rtype in (None, "vm"):
            out += [_resource_guest(v) for v in sc.GUESTS]
        if rtype in (None, "storage"):
            for n in sc.NODES:
                for s in _storage_rows(n):
                    out.append({"id": f"storage/{n}/{s['storage']}", "type": "storage", "node": n,
                                "storage": s["storage"], "status": "available", "shared": s["shared"],
                                "disk": s["used"], "maxdisk": s["total"], "plugintype": s["type"], "content": s["content"]})
    return ok(out)


@app.route(f"{P}/cluster/status")
def cluster_status():
    out = [{"type": "cluster", "id": "cluster", "name": sc.CLUSTER_NAME, "quorate": 1,
            "nodes": len(sc.NODES), "version": 7}]
    for i, n in enumerate(sc.NODES, 1):
        out.append({"type": "node", "id": f"node/{n}", "name": n, "nodeid": i, "online": 1,
                    "ip": f"192.168.10.{10 + i}", "local": 1 if i == 1 else 0, "level": ""})
    return ok(out)


@app.route(f"{P}/cluster/config/nodes")
def cluster_config_nodes():
    return ok([{"node": n, "name": n, "nodeid": str(i), "quorum_votes": "1", "ring0_addr": f"192.168.10.{10 + i}"}
               for i, n in enumerate(sc.NODES, 1)])


@app.route(f"{P}/cluster/config/qdevice")
def cluster_qdevice():
    return ok({})


@app.route(f"{P}/cluster/options")
def cluster_options():
    return ok({"crs": "ha=static", "keyboard": "en-us", "migration": "type=secure"})


@app.route(f"{P}/cluster/options", methods=["PUT"])
def cluster_options_put():
    return ok(None)


@app.route(f"{P}/cluster/ha/resources")
def ha_resources():
    return ok([{"sid": f"vm:{v}", "state": "started", "type": "vm", "max_relocate": 1, "max_restart": 1}
               for v, g in sc.GUESTS.items() if g.get("ha")])


@app.route(f"{P}/cluster/ha/status/current")
def ha_status_current():
    out = [{"id": "quorum", "type": "quorum", "status": "OK", "quorate": 1}]
    for v, g in sc.GUESTS.items():
        if g.get("ha"):
            out.append({"id": f"service:vm:{v}", "sid": f"vm:{v}", "type": "service",
                        "node": guest_node(v), "state": "started", "crm_state": "started"})
    return ok(out)


@app.route(f"{P}/cluster/ha/status/manager_status")
def ha_manager_status():
    return ok({"manager_status": {"master_node": "orion", "node_status": {n: "online" for n in sc.NODES}},
               "quorum": {"node": "orion", "quorate": "1"}})


@app.route(f"{P}/cluster/ha/rules")
def ha_rules():
    return ok(sc.HA_RULES)


@app.route(f"{P}/cluster/ha/groups")
def ha_groups():
    return ok([])


@app.route(f"{P}/cluster/backup-info/not-backed-up")
def not_backed_up():
    return ok([{"vmid": v, "name": sc.GUESTS[v]["name"], "type": sc.GUESTS[v]["t"]} for v in sc.NOT_BACKED_UP])


@app.route(f"{P}/pools")
def pools():
    names = sorted({g["pool"] for g in sc.GUESTS.values() if g.get("pool")})
    return ok([{"poolid": p, "comment": "", "members": [
        {"vmid": v, "type": sc.GUESTS[v]["t"], "node": guest_node(v), "name": sc.GUESTS[v]["name"], "id": f"{sc.GUESTS[v]['t']}/{v}"}
        for v, g in sc.GUESTS.items() if g.get("pool") == p]} for p in names])


@app.route(f"{P}/pools/<pid>")
def pool(pid):
    return ok({"members": [{"vmid": v, "type": g["t"], "node": guest_node(v)}
                           for v, g in sc.GUESTS.items() if g.get("pool") == pid]})


@app.route(f"{P}/cluster/tasks")
def cluster_tasks():
    rows = sorted(STATE.get("tasks", []), key=lambda t: -t["starttime"])[:50]
    return ok([{k: v for k, v in t.items() if k != "duration"} for t in rows])


@app.route(f"{P}/access/permissions")
def permissions():
    privs = {p: 1 for p in (
        "Sys.Audit", "Sys.Modify", "VM.Audit", "VM.Migrate", "VM.PowerMgmt", "VM.Config.Options",
        "VM.Monitor", "Datastore.Audit", "Datastore.AllocateSpace", "Pool.Audit", "SDN.Audit")}
    return ok({"/": privs, "/vms": privs, "/nodes": privs, "/storage": privs})


@app.route(f"{P}/access/acl")
def acl():
    return ok([{"path": "/", "roleid": "PVEVMAdmin", "type": "token", "ugid": "proxbalance@pam!demo", "propagate": 1}])


@app.route(f"{P}/nodes")
def nodes():
    out = []
    with LOCK:
        for n in sc.NODES:
            r = _resource_node(n)
            out.append({k: r[k] for k in ("node", "status", "cpu", "maxcpu", "mem", "maxmem", "uptime", "disk", "maxdisk")})
    return ok(out)


@app.route(f"{P}/nodes/<node>/status")
def node_status(node):
    if node not in sc.NODES:
        return err(500, f"hostname lookup '{node}' failed")
    r = _resource_node(node)
    n = sc.NODES[node]
    return ok({"cpu": r["cpu"], "uptime": r["uptime"], "loadavg": ["0.5", "0.6", "0.7"],
               "memory": {"total": r["maxmem"], "used": r["mem"], "free": r["maxmem"] - r["mem"]},
               "cpuinfo": {"cpus": n["cores"], "cores": n["cores"] // 2, "sockets": 1, "model": "Demo CPU"},
               "pveversion": f"pve-manager/{sc.PVE_VERSION}/demo", "kversion": "Linux 7.0.2-6-pve"})


@app.route(f"{P}/nodes/<node>/rrddata")
def node_rrd(node):
    if node not in sc.NODES:
        return err(500, "no such node")
    with LOCK:
        return ok(_node_rrd(node, request.args.get("timeframe", "hour")))


@app.route(f"{P}/nodes/<node>/storage")
def node_storage(node):
    return ok(_storage_rows(node)) if node in sc.NODES else err(500, "no such node")


@app.route(f"{P}/nodes/<node>/disks/list")
def node_disks(node):
    if node not in sc.NODES:
        return err(500, "no such node")
    return ok([{"devpath": d[0], "model": d[1], "type": d[2], "size": int(d[3] * 1e9), "health": d[4],
                "wearout": d[5] if d[5] is not None else "N/A", "serial": f"DEMO{i:04d}", "used": "LVM"}
               for i, d in enumerate(sc.NODES[node]["disks"])])


@app.route(f"{P}/nodes/<node>/<kind>")
def node_guests(node, kind):
    if kind not in ("qemu", "lxc"):
        return err(501, "Method not implemented")
    out = []
    for v, g in sc.GUESTS.items():
        if g["t"] == kind and guest_node(v) == node:
            r = _resource_guest(v)
            out.append({**r, "cpus": g["cores"]})
    return ok(out)


@app.route(f"{P}/nodes/<node>/<kind>/<vmid>/config", methods=["GET", "PUT", "POST"])
def guest_config(node, kind, vmid):
    v = _find_guest(vmid, kind)
    if v is None or guest_node(v) != node:
        return err(500, f"Configuration file '{kind}/{vmid}.conf' does not exist")
    if request.method != "GET":
        body = request.form.to_dict() or (request.get_json(silent=True) or {})
        if "tags" in body:
            with LOCK:
                STATE["guests"][str(v)]["tags"] = body["tags"]
                save()
        return ok(None)
    return ok(_guest_config(v))


@app.route(f"{P}/nodes/<node>/<kind>/<vmid>/rrddata")
def guest_rrd(node, kind, vmid):
    v = _find_guest(vmid, kind)
    if v is None:
        return err(500, "no such guest")
    return ok(_guest_rrd(v, request.args.get("timeframe", "hour")))


@app.route(f"{P}/nodes/<node>/<kind>/<vmid>/status/current")
def guest_current(node, kind, vmid):
    v = _find_guest(vmid, kind)
    if v is None or guest_node(v) != node:
        return err(500, "no such guest")
    r = _resource_guest(v)
    return ok({**r, "qmpstatus": r["status"], "ha": {"managed": 1 if sc.GUESTS[v].get("ha") else 0}})


@app.route(f"{P}/nodes/<node>/<kind>/<vmid>/status/<action>", methods=["POST"])
def guest_power(node, kind, vmid, action):
    v = _find_guest(vmid, kind)
    if v is None or guest_node(v) != node:
        return err(500, "no such guest")
    new = {"start": "running", "stop": "stopped", "shutdown": "stopped", "reboot": "running"}.get(action)
    if not new:
        return err(501, "Method not implemented")

    def done():
        STATE["guests"][str(v)]["status"] = new
    ttype = {"qemu": "qm", "lxc": "vz"}[kind] + action
    return ok(_new_task(node, ttype, v, 3, done))


@app.route(f"{P}/nodes/<node>/qemu/<vmid>/agent/info")
def agent_info(node, vmid):
    return ok({"result": {"version": "8.1.3", "supported_commands": [{"name": "guest-ping", "enabled": True}] * 30}})


@app.route(f"{P}/nodes/<node>/<kind>/<vmid>/migrate", methods=["GET"])
def migrate_check(node, kind, vmid):
    v = _find_guest(vmid, kind)
    if v is None:
        return err(500, "no such guest")
    extra = sc.GUESTS[v].get("extra", {})
    local_res = [k for k in extra if k.startswith(("hostpci", "usb", "dev"))]
    return ok({"running": 1 if guest_status(v) == "running" else 0,
               "allowed_nodes": [n for n in sc.NODES if n != node and not local_res],
               "not_allowed_nodes": {}, "local_disks": [], "local_resources": local_res})


@app.route(f"{P}/nodes/<node>/<kind>/<vmid>/migrate", methods=["POST"])
def migrate(node, kind, vmid):
    v = _find_guest(vmid, kind)
    if v is None or guest_node(v) != node:
        return err(500, f"guest {vmid} is not on {node}")
    body = request.form.to_dict() or (request.get_json(silent=True) or {})
    target = body.get("target")
    if target not in sc.NODES or target == node:
        return err(400, "parameter verification failed: target")
    extra = sc.GUESTS[v].get("extra", {})
    if any(k.startswith(("hostpci", "usb")) for k in extra) or any(str(x).startswith("/") for x in extra.values()):
        return err(500, "can't migrate guest with local devices or bind mounts")
    duration = 8 + sc.GUESTS[v]["mem"] * 1.5

    def done():
        STATE["guests"][str(v)]["history"].append([int(now()), target])
        _rrd_cache.clear()
    ttype = "qmigrate" if kind == "qemu" else "vzmigrate"
    log.info("migrate %s %s -> %s (%.0fs)", vmid, node, target, duration)
    return ok(_new_task(node, ttype, v, duration, done))


@app.route(f"{P}/nodes/<node>/tasks")
def node_tasks(node):
    vmid = request.args.get("vmid")
    rows = [t for t in STATE.get("tasks", []) if t["node"] == node and (not vmid or t["id"] == str(vmid))]
    return ok([{k: v for k, v in t.items() if k != "duration"} for t in rows])


@app.route(f"{P}/nodes/<node>/tasks/<path:upid>/status")
def task_status(node, upid):
    t = _task(upid)
    if not t:
        return err(500, "no such task")
    out = {k: v for k, v in t.items() if k not in ("duration", "exitstatus")}
    if t["status"] == "stopped":
        out["exitstatus"] = t["exitstatus"]
    out["pid"] = 1234
    return ok(out)


@app.route(f"{P}/nodes/<node>/tasks/<path:upid>/log")
def task_log(node, upid):
    t = _task(upid)
    if not t:
        return err(500, "no such task")
    elapsed = int(now() - t["starttime"])
    lines = [f"{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(t['starttime']))} starting migration of {t['id']} to node"]
    total = max(1, int(t["duration"]))
    for i in range(1, min(elapsed, total) // 2 + 1):
        pct = min(100, int(i * 2 / total * 100))
        lines.append(f"migration active, transferred {pct * 40} MiB of 4.0 GiB VM-state ({pct}%)")
    if t["status"] == "stopped":
        lines.append(f"migration finished successfully (duration {time.strftime('%H:%M:%S', time.gmtime(total))})")
        lines.append("TASK OK")
    return ok([{"n": i + 1, "t": line} for i, line in enumerate(lines)])


@app.route(f"{P}/nodes/<node>/tasks/<path:upid>", methods=["DELETE"])
def task_stop(node, upid):
    return ok(None)


@app.route(f"{P}/<path:rest>", methods=["GET", "POST", "PUT", "DELETE"])
def unknown(rest):
    log.warning("not implemented: %s /%s", request.method, rest)
    return err(501, f"Method '{request.method} /{rest}' not implemented")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--port", type=int, default=8006)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--cert")
    ap.add_argument("--key")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    STATE.update(sc.load_state())
    # A task still "running" from before a restart is finished now.
    for t in STATE.get("tasks", []):
        if t["status"] == "running":
            t["status"], t["exitstatus"] = "stopped", "OK"
    ssl = (args.cert, args.key) if args.cert and args.key else None
    app.run(host=args.host, port=args.port, ssl_context=ssl, threaded=True)


if __name__ == "__main__":
    main()
