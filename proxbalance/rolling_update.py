"""
ProxBalance rolling update planner (plan only)

Answers "can I upgrade and reboot the nodes one at a time, and what has to
move each time?" from the latest collected snapshot. Nothing here executes
anything: no migrations, no apt, no reboots. The operator runs each step with
the existing maintenance / evacuation flow.

Quorum: every corosync member has ``quorum_votes`` (default 1); a QDevice adds
one vote. Expected votes is the sum; quorum needs ``expected // 2 + 1``. A
step is safe for quorum when the votes still present without the node reach
that number.

Steps: for each node in order, its running guests are placed on the other
online nodes, largest memory first. A target must hold every storage the
guest uses, stay at or under the memory ceiling, and satisfy hard placement
rules (tag/pool anti-affinity, required affinity) and Proxmox HA rules.
Nodes already updated in an earlier step are preferred while they stay under
the "tight" line, so a guest is not moved twice. Guests tied to the node
(passthrough disks or hardware, unshared bind mounts) must be shut down for
the reboot. Stopped guests stay where they are.

Between steps the plan assumes the node came back with only its pinned
guests, so it is a valid target for the later steps.
"""

import socket
from typing import Any, Dict, Iterable, List, Optional, Tuple

from proxbalance.failure_sim import (
    DEFAULT_MEM_CEILING, DEFAULT_TIGHT_PCT, guest_cpu_impact, guest_mem_demand_gb,
    guest_storages, node_local_storages, restart_blocker,
)
from proxbalance.ha_rules import check_ha_placement
from proxbalance.placement_rules import (
    KIND_AFFINITY, anti_affinity_conflict, build_rules, rules_for_guest,
)

QDEVICE_VOTES = 1  # Proxmox's QDevice (ffsplit) contributes one vote


# ---------------------------------------------------------------------------
# Quorum
# ---------------------------------------------------------------------------

def _int(value: Any, default: int = 1) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def fetch_quorum_inputs(proxmox: Any) -> Optional[Dict[str, Any]]:
    """Read corosync membership, votes and QDevice presence (GET only).

    Returns:
        ``{"members": [{"name", "votes", "online"}], "qdevice": bool | None}``
        or None when the member list can't be read. ``qdevice`` is None when
        the QDevice endpoint can't be read.
    """
    try:
        config_nodes = proxmox.cluster.config.nodes.get() or []
    except Exception:
        return None
    online: Dict[str, bool] = {}
    try:
        for item in proxmox.cluster.status.get() or []:
            if item.get("type") == "node":
                online[item.get("name")] = bool(item.get("online", 0))
    except Exception:
        pass
    qdevice: Optional[bool]
    try:
        qdevice = bool(proxmox.cluster.config.qdevice.get())
    except Exception:
        qdevice = None
    members = []
    for n in config_nodes:
        name = n.get("node") or n.get("name")
        if not name:
            continue
        members.append({"name": name, "votes": _int(n.get("quorum_votes"), 1),
                        "online": online.get(name)})
    return {"members": sorted(members, key=lambda m: m["name"]), "qdevice": qdevice}


def quorum_math(
    members: List[Dict[str, Any]],
    qdevice: Optional[bool] = False,
    nodes: Optional[Iterable[str]] = None,
    votes_assumed: bool = False,
) -> Dict[str, Any]:
    """Vote math for taking each member down on its own.

    Args:
        members: ``{"name", "votes", "online"}`` per corosync member. A member
            with ``online`` None is counted as online.
        qdevice: True when a QDevice is configured (adds one vote, assumed
            reachable), None when unknown.
        nodes: Names to check (default: every member).
        votes_assumed: True when votes were not read and 1 per node is assumed.

    Returns:
        Dict with ``expected_votes``, ``quorum``, ``present_votes``,
        ``per_node`` (name -> {votes, remaining, keeps_quorum}),
        ``all_ok``, ``flags`` (short warnings) and a one-line ``verdict``.
    """
    qd_votes = QDEVICE_VOTES if qdevice else 0
    expected = sum(_int(m.get("votes"), 1) for m in members) + qd_votes
    quorum = expected // 2 + 1 if expected else 0
    present = sum(_int(m.get("votes"), 1) for m in members if m.get("online") is not False) + qd_votes
    names = list(nodes) if nodes is not None else [m["name"] for m in members]
    by_name = {m["name"]: m for m in members}
    per_node: Dict[str, Dict[str, Any]] = {}
    for name in names:
        m = by_name.get(name)
        votes = _int(m.get("votes"), 1) if m else 0
        down_already = bool(m) and m.get("online") is False
        remaining = present - (0 if down_already else votes)
        per_node[name] = {"votes": votes, "remaining": remaining, "keeps_quorum": remaining >= quorum}

    flags: List[str] = []
    real_nodes = len(members)
    if real_nodes == 2 and not qdevice:
        flags.append("Two-node cluster without a QDevice: rebooting either node loses quorum")
    elif real_nodes == 2:
        flags.append("Two-node cluster: quorum during each reboot depends on the QDevice")
    if qdevice:
        flags.append("QDevice configured: keep it reachable during the update")
    elif qdevice is None:
        flags.append("QDevice status unknown (counted as none)")
    offline = [m["name"] for m in members if m.get("online") is False]
    if offline:
        flags.append(f"Already offline: {', '.join(offline)}")
    if votes_assumed:
        flags.append("Votes not read from corosync: 1 per node assumed")

    all_ok = bool(per_node) and all(v["keeps_quorum"] for v in per_node.values())
    if not members:
        verdict = "No cluster members known"
    elif all_ok:
        verdict = (f"{present} of {expected} votes present, {quorum} needed: "
                   f"any one node can be down")
    else:
        bad = [n for n, v in per_node.items() if not v["keeps_quorum"]]
        verdict = (f"{present} of {expected} votes present, {quorum} needed: "
                   f"taking down {' or '.join(bad)} loses quorum")
    return {
        "expected_votes": expected, "quorum": quorum, "present_votes": present,
        "qdevice": qdevice, "qdevice_votes": qd_votes, "members": real_nodes,
        "per_node": per_node, "all_ok": all_ok, "flags": flags, "verdict": verdict,
    }


def quorum_from_cache(data: Dict[str, Any], live: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Quorum math from the cache's ``cluster_health.quorum`` or *live* inputs.

    Falls back to one vote per node in the cache when neither is available.
    """
    nodes = data.get("nodes") or {}
    inputs = live or (data.get("cluster_health") or {}).get("quorum")
    if inputs and inputs.get("members"):
        return quorum_math(inputs["members"], inputs.get("qdevice"), sorted(nodes) or None)
    members = [{"name": n, "votes": 1, "online": (d.get("status", "online") == "online")}
               for n, d in sorted(nodes.items())]
    return quorum_math(members, None, votes_assumed=True)


# ---------------------------------------------------------------------------
# Which guest is ProxBalance?
# ---------------------------------------------------------------------------

def find_self_guest(guests: Dict[str, Any], config: Optional[Dict[str, Any]] = None,
                    hostname: Optional[str] = None) -> Optional[str]:
    """vmid (str) of the guest ProxBalance runs in, or None.

    Order: ``rolling_update.self_vmid`` in config, then a guest named like
    this host's hostname, then a guest named exactly "proxbalance".
    """
    cfg = ((config or {}).get("rolling_update") or {}).get("self_vmid")
    if cfg is not None and str(cfg) in {str(k) for k in guests}:
        return str(cfg)
    if hostname is None:
        try:
            hostname = socket.gethostname()
        except Exception:
            hostname = ""
    host = (hostname or "").split(".")[0].strip().lower()
    for want in (host, "proxbalance"):
        if not want:
            continue
        for vmid, g in sorted(guests.items(), key=lambda kv: str(kv[0])):
            if str(g.get("name") or "").strip().lower() == want:
                return str(g.get("vmid", vmid))
    return None


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------

def _gb(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _label(guest: Dict[str, Any], vmid: str) -> Dict[str, Any]:
    return {"vmid": int(vmid) if str(vmid).isdigit() else vmid,
            "name": guest.get("name") or f"Guest {vmid}", "type": guest.get("type", "VM")}


def _node_storages(node: Dict[str, Any]) -> set:
    return {s["storage"] for s in node.get("storage") or []
            if isinstance(s, dict) and s.get("storage") and s.get("active", True) is not False}


def local_copy_gb(guest: Dict[str, Any], local: set) -> float:
    """Size of the guest's disks on node-local storage (what a migration copies)."""
    return round(sum(_gb(d.get("size_gb")) for d in guest.get("disks") or []
                     if isinstance(d, dict) and d.get("storage") in local), 1)


def _running_on(guests: Dict[str, Any], loc: Dict[str, str], node: str) -> List[Tuple[str, Dict[str, Any]]]:
    return [(v, g) for v, g in guests.items() if loc.get(v) == node and g.get("status") == "running"]


def suggest_order(
    nodes: Dict[str, Any],
    guests: Dict[str, Any],
    self_node: Optional[str] = None,
) -> List[str]:
    """Online nodes, fewest running guests to move first; the ProxBalance host last."""
    def key(name: str) -> Tuple[int, int, float, str]:
        local = node_local_storages(nodes[name])
        running = [g for g in guests.values() if g.get("node") == name and g.get("status") == "running"]
        movable = [g for g in running if not restart_blocker(g, local)]
        return (1 if name == self_node else 0, len(movable),
                round(sum(guest_mem_demand_gb(g) for g in movable), 2), name)
    online = [n for n, d in nodes.items() if d.get("status", "online") == "online"]
    return sorted(online, key=key)


def plan_rolling_update(
    nodes: Dict[str, Any],
    guests: Dict[str, Any],
    order: Optional[List[str]] = None,
    ha_rules: Optional[Dict[str, Any]] = None,
    rules_cfg: Optional[Dict[str, Any]] = None,
    pools_available: Optional[bool] = None,
    quorum: Optional[Dict[str, Any]] = None,
    self_vmid: Optional[str] = None,
    mem_ceiling: float = DEFAULT_MEM_CEILING,
    tight_pct: float = DEFAULT_TIGHT_PCT,
) -> Dict[str, Any]:
    """Plan updating the nodes one at a time.

    Args:
        nodes: Cluster cache nodes.
        guests: Cluster cache guests (vmid str -> guest).
        order: Nodes in update order (default: :func:`suggest_order`).
        ha_rules: Compact HA snapshot or None.
        rules_cfg: ``automated_migrations.rules`` (pool rules).
        pools_available: Collector flag for pool membership.
        quorum: Result of :func:`quorum_math` (for per-step quorum lines).
        self_vmid: The guest ProxBalance runs in, if known.
        mem_ceiling: Highest memory % a target may reach.
        tight_pct: A target ending above this % is "tight".

    Returns:
        Dict with ``order``, ``suggested_order``, ``self`` (guest + node),
        ``steps`` (per node: moves, must_stop, doesnt_fit, targets' memory
        after, copy_gb), ``status`` and a one-line ``verdict``.

    Raises:
        ValueError: *order* names an unknown node or repeats one.
    """
    guests = {str(k): g for k, g in (guests or {}).items()}
    self_guest = guests.get(str(self_vmid)) if self_vmid is not None else None
    self_node = self_guest.get("node") if self_guest else None
    suggested = suggest_order(nodes, guests, self_node)
    if order:
        unknown = [n for n in order if n not in nodes]
        if unknown:
            raise ValueError(f"Unknown node: {', '.join(unknown)}")
        if len(set(order)) != len(order):
            raise ValueError("A node is listed twice")
        planned = list(order)
    else:
        planned = suggested
    rules = [r for r in build_rules(guests, rules_cfg, pools_available)
             if r["kind"] != KIND_AFFINITY or r["required"]]

    online = [n for n, d in nodes.items() if d.get("status", "online") == "online"]
    used = {n: _gb(nodes[n].get("mem_percent")) / 100.0 * _gb(nodes[n].get("total_mem_gb")) for n in online}
    cpu = {n: _gb(nodes[n].get("cpu_percent")) for n in online}
    loc = {v: g.get("node") for v, g in guests.items()}
    done: set = set()
    steps: List[Dict[str, Any]] = []

    for name in planned:
        node = nodes[name]
        step: Dict[str, Any] = {
            "node": name, "status": "ok", "moves": [], "must_stop": [], "doesnt_fit": [],
            "stays_stopped": 0, "copy_gb": 0.0, "targets": [], "hosts_proxbalance": False,
            "keeps_quorum": (quorum or {}).get("per_node", {}).get(name, {}).get("keeps_quorum"),
        }
        if name not in used:
            step["status"] = "offline"
            steps.append(step)
            continue
        local = node_local_storages(node)
        targets = [n for n in online if n != name]
        before = {t: used[t] for t in targets}
        added = {t: 0 for t in targets}
        step["stays_stopped"] = sum(1 for v, g in guests.items()
                                    if loc.get(v) == name and g.get("status") != "running")
        running = _running_on(guests, loc, name)
        movable: List[Tuple[str, Dict[str, Any], float]] = []
        for vmid, g in running:
            mem = round(guest_mem_demand_gb(g), 2)
            if self_vmid is not None and vmid == str(self_vmid):
                step["hosts_proxbalance"] = True
            reason = restart_blocker(g, local)
            if reason:
                step["must_stop"].append({**_label(g, vmid), "mem_gb": mem, "reason": reason})
            else:
                movable.append((vmid, g, mem))
        movable.sort(key=lambda t: (-t[2], str(t[1].get("name") or ""), t[0]))

        pending: Dict[str, str] = {}
        for vmid, g, mem in movable:
            need = guest_storages(g)
            want = _required_affinity_node(vmid, rules, loc, pending, name)
            blocks: List[str] = []
            chosen = None
            any_allowed = False

            def rank(t: str) -> Tuple[int, int, float, str]:
                total = _gb(nodes[t].get("total_mem_gb")) or 1.0
                tight = (used[t] + mem) / total * 100.0 > tight_pct
                return (0 if want == t else 1, 1 if tight else 0, 0 if t in done else 1,
                        -(total * mem_ceiling / 100.0 - used[t]), t)

            for t in sorted(targets, key=rank):
                if want and t != want:
                    blocks.append(f"{t}: required affinity keeps it with its group on {want}")
                    continue
                missing = sorted(need - _node_storages(nodes[t]))
                if missing:
                    blocks.append(f"{t}: no storage {', '.join(missing)}")
                    continue
                residents = [v for v, n in loc.items() if n == t and v != vmid]
                conflict = anti_affinity_conflict(vmid, t, rules, guests, node_guests=residents)
                if conflict:
                    blocks.append(f"{t}: {conflict}")
                    continue
                if ha_rules:
                    verdict = check_ha_placement(vmid, t, ha_rules, guests, pending_moves={**_moved(loc, guests), **pending},
                                                 online_nodes=targets)
                    if verdict["blocks"]:
                        blocks.append(f"{t}: {verdict['blocks'][0]}")
                        continue
                any_allowed = True
                total = _gb(nodes[t].get("total_mem_gb"))
                if used[t] + mem <= total * mem_ceiling / 100.0 + 1e-9:
                    chosen = t
                    break
            entry = {**_label(g, vmid), "mem_gb": mem}
            if chosen:
                copy = local_copy_gb(g, local)
                used[chosen] += mem
                used[name] = max(0.0, used[name] - mem)
                cpu[chosen] += guest_cpu_impact(g, nodes[chosen])
                added[chosen] += 1
                pending[vmid] = chosen
                step["copy_gb"] += copy
                step["moves"].append({
                    **entry, "from": name, "to": chosen, "copy_gb": copy,
                    "restarts": g.get("type") == "CT",
                    "ha_managed": bool(g.get("ha_managed")),
                    "ignored": bool((g.get("tags") or {}).get("has_ignore")),
                    "proxbalance": self_vmid is not None and vmid == str(self_vmid),
                })
            elif not any_allowed and blocks:
                step["doesnt_fit"].append({**entry, "reason": "; ".join(blocks)})
            else:
                step["doesnt_fit"].append({
                    **entry, "reason": f"no other node has {mem:.1f} GB free under {mem_ceiling:.0f}% memory"
                    if targets else "no other node is online"})
        for vmid, t in pending.items():
            loc[vmid] = t
        step["copy_gb"] = round(step["copy_gb"], 1)
        for t in sorted(targets):
            total = _gb(nodes[t].get("total_mem_gb")) or 1.0
            step["targets"].append({
                "node": t, "mem_before": round(before[t] / total * 100.0, 1),
                "mem_after": round(used[t] / total * 100.0, 1), "added": added[t],
                "cpu_after": round(cpu[t], 1), "updated": t in done,
            })
        if step["keeps_quorum"] is False:
            step["status"] = "no_quorum"
        elif step["doesnt_fit"]:
            step["status"] = "short"
        elif any(x["mem_after"] > tight_pct for x in step["targets"] if x["added"]):
            step["status"] = "tight"
        step["verdict"] = _step_verdict(step)
        done.add(name)
        steps.append(step)

    bad = [s for s in steps if s["status"] in ("short", "no_quorum")]
    stops = sum(len(s["must_stop"]) for s in steps)
    if not steps:
        verdict = "No online node to update"
    elif bad:
        verdict = "; ".join(s["verdict"] for s in bad)
    else:
        verdict = f"{len(steps)} steps, {sum(len(s['moves']) for s in steps)} moves"
        if stops:
            verdict += f", {stops} guest{'' if stops == 1 else 's'} must shut down"
    return {
        "order": planned, "suggested_order": suggested,
        "self": ({**_label(self_guest, str(self_vmid)), "node": self_node} if self_guest else None),
        "steps": steps, "status": "short" if bad else "ok", "verdict": verdict,
        "mem_ceiling": mem_ceiling, "tight_pct": tight_pct,
    }


def _moved(loc: Dict[str, str], guests: Dict[str, Any]) -> Dict[str, str]:
    """Guests the plan has already moved in earlier steps (vmid -> node)."""
    return {v: n for v, n in loc.items() if guests.get(v, {}).get("node") != n}


def _required_affinity_node(vmid: str, rules: List[Dict[str, Any]], loc: Dict[str, str],
                            pending: Dict[str, str], leaving: str) -> Optional[str]:
    """Node a required-affinity group pins *vmid* to, or None for a free choice."""
    for rule in rules_for_guest(vmid, rules, kind=KIND_AFFINITY, required=True):
        for other in rule["members"]:
            if other == vmid:
                continue
            where = pending.get(other) or loc.get(other)
            if where and where != leaving:
                return where
    return None


def _step_verdict(step: Dict[str, Any]) -> str:
    name = step["node"]
    if step["status"] == "offline":
        return f"{name} is offline"
    parts = []
    if step["keeps_quorum"] is False:
        parts.append("loses quorum")
    n = len(step["moves"])
    parts.append("nothing to move" if not n else f"{n} move{'' if n == 1 else 's'}")
    if step["copy_gb"]:
        parts.append(f"~{step['copy_gb']:.0f} GB to copy")
    if step["must_stop"]:
        parts.append(f"{len(step['must_stop'])} must shut down")
    if step["doesnt_fit"]:
        parts.append(f"{len(step['doesnt_fit'])} don't fit")
    return f"{name}: " + ", ".join(parts)
