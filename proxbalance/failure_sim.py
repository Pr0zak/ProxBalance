"""
ProxBalance node-failure (N-1) simulation

Answers "what happens to the guests on node X if it goes down?" from the latest
collected snapshot (``cluster_cache.json``) alone; nothing here calls Proxmox.

Rules, in order:

1. Only running guests on the failed node are displaced.
2. A guest that is tied to the failed node can't restart elsewhere: passthrough
   disks or other passthrough hardware, unshared bind mounts (the host folder
   lives on that node) and — in ``strict`` ("unplanned failure") mode — disks
   on node-local storage (LVM-thin, local directory, ...), which die with the node unless a
   backup or replica is restored somewhere else. The ``ignore`` tag is not a
   blocker: it stops ProxBalance from moving a guest, not the guest from
   starting elsewhere after a failure, so ignored guests are placed (and
   flagged) like any other. The default ``capacity`` mode assumes node-local
   disks are restored elsewhere and only asks whether the survivors have room;
   ``local_disk_note`` still says which guests would not come back on their own.
3. The remaining guests are placed largest memory first, each onto the
   surviving online node with the most free memory that can take it while
   staying at or under the memory ceiling (95 % by default). Tag anti-affinity
   (``exclude_*``) and Proxmox HA rules (``cluster_cache['ha_rules']``) are
   respected: a node a rule blocks is skipped and the next one tried. CPU is
   reported but is not a limit.
4. A guest no survivor can take is "doesn't fit". A guest that every survivor
   refuses because of a rule (not memory) can't restart elsewhere, with the
   rule as the reason.

Memory demand follows the collector's committed-memory rule: a VM needs its
full allocation (QEMU can touch all of it), a container needs what it uses
now (its memory setting is only a cgroup ceiling).
"""

from typing import Any, Dict, List, Optional, Tuple

from proxbalance.ha_rules import check_ha_placement
from proxbalance.storage_projection import is_shared_storage

DEFAULT_MEM_CEILING = 95.0   # % of a survivor's RAM a placement may reach
DEFAULT_TIGHT_PCT = 85.0     # a survivor ending above this makes the result "tight"

STORAGE_MODES = ("strict", "capacity")


def _gb(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def guest_mem_demand_gb(guest: Dict[str, Any]) -> float:
    """Memory a guest needs on the node it restarts on, in GB.

    A VM needs its allocation; a container needs what it uses now (falling
    back to its limit when usage is unknown).
    """
    if guest.get("type") == "CT":
        used = guest.get("mem_used_gb")
        if used is not None:
            return _gb(used)
    return _gb(guest.get("mem_max_gb", guest.get("mem_used_gb", 0)))


def guest_cpu_impact(guest: Dict[str, Any], node: Dict[str, Any]) -> float:
    """CPU percentage points a guest adds to *node* (hour average, as scoring does)."""
    cpu = guest.get("cpu_avg_hour")
    if cpu is None:
        cpu = guest.get("cpu_current", 0)
    cores = guest.get("cpu_cores", 1) or 1
    node_cores = node.get("cpu_cores", 1) or 1
    return _gb(cpu) * cores / node_cores


def node_local_storages(node: Dict[str, Any]) -> set:
    """Storage IDs on *node* that are not shared across nodes.

    Uses the collector's ``shared`` flag, falling back to the storage type for
    entries that predate it (same rule as the target storage projection).
    """
    out = set()
    for s in node.get("storage", []) or []:
        if isinstance(s, dict) and s.get("storage") and not is_shared_storage(s):
            out.add(s["storage"])
    return out


def guest_storages(guest: Dict[str, Any]) -> set:
    """Storage IDs the guest's disks live on, from the collector's ``disks`` list."""
    return {d["storage"] for d in guest.get("disks") or [] if isinstance(d, dict) and d.get("storage")}


def _paths(items: List[Dict[str, Any]], key: str) -> str:
    vals = [str(i.get(key, "")) for i in items if i.get(key)]
    return ", ".join(vals[:2]) + ("…" if len(vals) > 2 else "")


def restart_blocker(guest: Dict[str, Any], local_storages: set, storage_mode: str = "capacity") -> Optional[str]:
    """Why *guest* can't start on another node, or None if it can.

    Args:
        guest: Cluster cache guest.
        local_storages: Node-local storage IDs of the guest's node.
        storage_mode: ``strict`` treats disks on node-local storage as lost
            with the node; ``capacity`` assumes they can be restored elsewhere.
    """
    ld = guest.get("local_disks") or {}
    if ld.get("is_pinned") or ld.get("has_passthrough"):
        devices = _paths(ld.get("passthrough_disks") or [], "device")
        return f"passthrough disk{f' {devices}' if devices else ''}"
    hardware = [d.get("key") for d in guest.get("passthrough_devices") or [] if isinstance(d, dict) and d.get("key")]
    if hardware:
        return f"passthrough hardware ({', '.join(hardware[:3])})"
    mp = guest.get("mount_points") or {}
    if guest.get("type") == "CT" and mp.get("has_unshared_bind_mount"):
        unshared = [m for m in mp.get("mount_points", []) if m.get("is_bind_mount") and not m.get("is_shared")]
        paths = _paths(unshared, "source")
        return f"unshared bind mount{f' {paths}' if paths else ''} on its host"
    if storage_mode == "strict":
        local = sorted(guest_storages(guest) & local_storages)
        if local:
            return f"disks on node-local storage ({', '.join(local)})"
    return None


def _label(guest: Dict[str, Any], vmid: str) -> Dict[str, Any]:
    return {
        "vmid": int(vmid) if str(vmid).isdigit() else vmid,
        "name": guest.get("name") or f"Guest {vmid}",
        "type": guest.get("type", "VM"),
    }


def _anti_affinity_conflict(guest: Dict[str, Any], others: List[Dict[str, Any]]) -> Optional[str]:
    """First running guest in *others* that shares an ``exclude_*`` tag with *guest*."""
    groups = (guest.get("tags") or {}).get("exclude_groups") or []
    if not groups:
        return None
    for other in others:
        tags = (other.get("tags") or {}).get("all_tags") or []
        for g in groups:
            if g in tags:
                return f"anti-affinity tag {g} (with {other.get('name') or other.get('vmid')})"
    return None


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def _fmt_gb(gb: float) -> str:
    return f"{gb:.0f} GB" if gb >= 10 else f"{gb:.1f} GB"


def _verdict(failed: str, res: Dict[str, Any]) -> str:
    placed, stuck, nofit = res["placements"], res["cant_restart"], res["doesnt_fit"]
    busiest = res.get("busiest")
    tail = f"busiest node {busiest['node']} at {busiest['mem_after']:.0f}% memory" if busiest and placed else ""
    if res["status"] == "offline":
        return f"{failed} is already offline"
    if not (placed or stuck or nofit):
        return f"{failed} can fail: no guests running on it"
    if nofit:
        gb = sum(g["mem_gb"] for g in nofit)
        line = f"If {failed} fails, {_plural(len(nofit), 'guest')} ({_fmt_gb(gb)}) don't fit"
        if len(nofit) == 1:
            line = f"If {failed} fails, 1 guest ({_fmt_gb(gb)}) doesn't fit"
        if stuck:
            line += f" and {len(stuck)} can't restart elsewhere"
        return line
    if stuck:
        names = ", ".join(g["name"] for g in stuck[:2]) + ("…" if len(stuck) > 2 else "")
        if not placed:
            return f"If {failed} fails, its {_plural(len(stuck), 'guest')} can't restart elsewhere ({names})"
        moved = "1 guest restarts" if len(placed) == 1 else f"{len(placed)} guests restart"
        return (f"If {failed} fails, {moved} elsewhere and "
                f"{len(stuck)} can't ({names}); {tail}")
    every = "the only guest restarts" if len(placed) == 1 else f"all {len(placed)} guests restart"
    return f"{failed} can fail: {every} elsewhere, {tail}"


def simulate_node_failure(
    failed_node: str,
    nodes: Dict[str, Any],
    guests: Dict[str, Any],
    ha_rules: Optional[Dict[str, Any]] = None,
    mem_ceiling: float = DEFAULT_MEM_CEILING,
    tight_pct: float = DEFAULT_TIGHT_PCT,
    storage_mode: str = "capacity",
) -> Dict[str, Any]:
    """Simulate *failed_node* going down and restarting its guests elsewhere.

    Args:
        failed_node: Node to fail.
        nodes: Cluster cache nodes (name -> node).
        guests: Cluster cache guests (vmid str -> guest).
        ha_rules: Compact HA snapshot (``cluster_cache['ha_rules']``) or None.
        mem_ceiling: Highest memory % a survivor may reach.
        tight_pct: A survivor ending above this % makes the result "tight".
        storage_mode: ``capacity`` (default: could the other nodes hold its
            guests? node-local disks are assumed restored, and those
            placements are flagged with ``local_storage``) or ``strict``
            (unplanned failure: node-local disks can't restart elsewhere).

    Returns:
        Dict with ``status`` (ok | tight | stranded | short | offline),
        ``verdict`` (one line), ``nodes`` (per survivor before/after memory
        and CPU %), ``placements``, ``cant_restart``, ``doesnt_fit``,
        ``busiest`` and the parameters used.

    Raises:
        KeyError: *failed_node* is not in *nodes*.
    """
    if failed_node not in nodes:
        raise KeyError(failed_node)
    if storage_mode not in STORAGE_MODES:
        storage_mode = "capacity"
    guests = guests or {}
    failed = nodes[failed_node]
    res: Dict[str, Any] = {
        "node": failed_node, "status": "ok", "verdict": "",
        "nodes": [], "placements": [], "cant_restart": [], "doesnt_fit": [],
        "busiest": None, "running_guests": 0, "local_storage_guests": 0, "local_disk_note": None,
        "mem_ceiling": mem_ceiling, "tight_pct": tight_pct, "storage_mode": storage_mode,
    }
    if failed.get("status", "online") != "online":
        res["status"] = "offline"
        res["verdict"] = _verdict(failed_node, res)
        return res

    survivors = {n: d for n, d in nodes.items() if n != failed_node and d.get("status", "online") == "online"}
    state: Dict[str, Dict[str, Any]] = {}
    for name, d in survivors.items():
        total = _gb(d.get("total_mem_gb"))
        state[name] = {
            "total": total,
            "used": _gb(d.get("mem_percent")) / 100.0 * total,
            "cpu": _gb(d.get("cpu_percent")),
            "mem_before": _gb(d.get("mem_percent")),
            "cpu_before": _gb(d.get("cpu_percent")),
            "added_gb": 0.0, "added": 0,
            # Running guests on the node, for tag anti-affinity.
            "residents": [g for g in guests.values() if g.get("node") == name and g.get("status") == "running"],
        }

    local = node_local_storages(failed)
    displaced: List[Tuple[str, Dict[str, Any]]] = [
        (str(vmid), g) for vmid, g in guests.items()
        if g.get("node") == failed_node and g.get("status") == "running"
    ]
    res["running_guests"] = len(displaced)

    movable: List[Tuple[str, Dict[str, Any], float]] = []
    for vmid, g in displaced:
        mem = round(guest_mem_demand_gb(g), 2)
        on_local = sorted(guest_storages(g) & local)
        if on_local:
            res["local_storage_guests"] += 1
        reason = restart_blocker(g, local, storage_mode)
        if reason:
            res["cant_restart"].append({**_label(g, vmid), "mem_gb": mem, "reason": reason})
        else:
            movable.append((vmid, g, mem))

    movable.sort(key=lambda t: (-t[2], str(t[1].get("name") or ""), t[0]))
    pending: Dict[str, str] = {}
    online_names = list(survivors)
    for vmid, g, mem in movable:
        rule_blocks: List[str] = []
        allowed_any = False
        chosen = None
        order = sorted(state, key=lambda n: (-(state[n]["total"] * mem_ceiling / 100.0 - state[n]["used"]), n))
        for name in order:
            st = state[name]
            conflict = _anti_affinity_conflict(g, st["residents"])
            if conflict:
                rule_blocks.append(f"{name}: {conflict}")
                continue
            if ha_rules:
                verdict = check_ha_placement(vmid, name, ha_rules, guests,
                                             pending_moves=pending, online_nodes=online_names)
                if verdict["blocks"]:
                    rule_blocks.append(f"{name}: {verdict['blocks'][0]}")
                    continue
            allowed_any = True
            if st["used"] + mem <= st["total"] * mem_ceiling / 100.0 + 1e-9:
                chosen = name
                break
        entry = {**_label(g, vmid), "mem_gb": mem}
        if chosen:
            st = state[chosen]
            st["used"] += mem
            st["cpu"] += guest_cpu_impact(g, survivors[chosen])
            st["added_gb"] += mem
            st["added"] += 1
            st["residents"].append(g)
            pending[vmid] = chosen
            on_local = sorted(guest_storages(g) & local)
            res["placements"].append({
                **entry, "from": failed_node, "to": chosen,
                "ha_managed": bool(g.get("ha_managed")),
                "ignored": bool((g.get("tags") or {}).get("has_ignore")),
                **({"local_storage": on_local} if on_local else {}),
            })
        elif not allowed_any and rule_blocks:
            res["cant_restart"].append({**entry, "reason": "; ".join(rule_blocks)})
        else:
            reason = (f"no survivor has {_fmt_gb(mem)} free under {mem_ceiling:.0f}% memory"
                      if survivors else "no other node is online")
            res["doesnt_fit"].append({**entry, "reason": reason})

    for name in sorted(state):
        st = state[name]
        total = st["total"] or 1.0
        res["nodes"].append({
            "node": name,
            "mem_total_gb": round(st["total"], 2),
            "mem_before": round(st["mem_before"], 1),
            "mem_after": round(st["used"] / total * 100.0, 1),
            "cpu_before": round(st["cpu_before"], 1),
            "cpu_after": round(st["cpu"], 1),
            "added_gb": round(st["added_gb"], 2),
            "added": st["added"],
        })
    if res["nodes"]:
        top = max(res["nodes"], key=lambda n: n["mem_after"])
        res["busiest"] = {"node": top["node"], "mem_after": top["mem_after"]}

    if res["doesnt_fit"]:
        res["status"] = "short"
    elif res["cant_restart"]:
        res["status"] = "stranded"
    elif any(n["mem_after"] > tight_pct for n in res["nodes"] if n["added"]):
        res["status"] = "tight"
    res["verdict"] = _verdict(failed_node, res)
    res["local_disk_note"] = _local_disk_note(failed_node, res)
    return res


def _local_disk_note(failed: str, res: Dict[str, Any]) -> Optional[str]:
    """Plain line for guests whose disks die with the node (shown in either mode)."""
    n = res["local_storage_guests"]
    if not n:
        return None
    verb = "doesn't" if n == 1 else "don't"
    if n == res["running_guests"]:
        who = "its guest" if n == 1 else f"its {n} guests"
    else:
        who = f"{n} of its {res['running_guests']} guests"
    disks = "its disks are" if n == 1 else "their disks are"
    return (f"If {failed} fails unexpectedly, {who} {verb} restart elsewhere: "
            f"{disks} node-local (restore from backup)")


def simulate_all_failures(
    nodes: Dict[str, Any],
    guests: Dict[str, Any],
    ha_rules: Optional[Dict[str, Any]] = None,
    mem_ceiling: float = DEFAULT_MEM_CEILING,
    tight_pct: float = DEFAULT_TIGHT_PCT,
    storage_mode: str = "capacity",
) -> Dict[str, Any]:
    """Run :func:`simulate_node_failure` for every online node (N-1 status).

    Returns:
        Dict with ``nodes`` (per node: status, verdict, counts, busiest),
        ``can_lose`` (nodes whose failure leaves nothing out and nothing
        stuck), ``n1_ok`` (True when every online node is in ``can_lose``),
        ``local_storage_guests`` and a one-line ``verdict``.
    """
    rows: List[Dict[str, Any]] = []
    local_total = 0
    for name in sorted(nodes):
        if nodes[name].get("status", "online") != "online":
            rows.append({"node": name, "status": "offline", "verdict": f"{name} is already offline"})
            continue
        r = simulate_node_failure(name, nodes, guests, ha_rules, mem_ceiling, tight_pct, storage_mode)
        local_total += r["local_storage_guests"]
        rows.append({
            "node": name,
            "status": r["status"],
            "verdict": r["verdict"],
            "running_guests": r["running_guests"],
            "placed": len(r["placements"]),
            "cant_restart": len(r["cant_restart"]),
            "doesnt_fit": len(r["doesnt_fit"]),
            "doesnt_fit_gb": round(sum(g["mem_gb"] for g in r["doesnt_fit"]), 2),
            "busiest": r["busiest"],
            "local_storage_guests": r["local_storage_guests"],
            "local_disk_note": r["local_disk_note"],
        })
    online = [r for r in rows if r["status"] != "offline"]
    can_lose = [r["node"] for r in online if r["status"] in ("ok", "tight")]
    short = [r for r in online if r["status"] == "short"]
    stranded = [r for r in online if r["status"] == "stranded"]
    if online and len(can_lose) == len(online):
        tight = [r["node"] for r in online if r["status"] == "tight"]
        verdict = "The cluster can lose any one node" + (
            f" (tight if {', '.join(tight)} fails)" if tight else "")
    elif not online:
        verdict = "No node is online"
    else:
        parts = []
        if can_lose:
            parts.append(f"The cluster can lose {' or '.join(can_lose)}")
        for r in short:
            parts.append(f"losing {r['node']} leaves {_plural(r['doesnt_fit'], 'guest')} "
                         f"({_fmt_gb(r['doesnt_fit_gb'])}) without room")
        for r in stranded:
            parts.append(f"losing {r['node']} strands {_plural(r['cant_restart'], 'guest')} that can't restart elsewhere")
        verdict = "; ".join(parts)
        verdict = verdict[0].upper() + verdict[1:]
    return {
        "nodes": rows,
        "can_lose": can_lose,
        "n1_ok": bool(online) and len(can_lose) == len(online),
        "local_storage_guests": local_total,
        "verdict": verdict,
        "mem_ceiling": mem_ceiling,
        "tight_pct": tight_pct,
        "storage_mode": storage_mode,
    }
