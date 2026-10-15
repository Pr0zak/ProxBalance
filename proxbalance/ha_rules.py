"""
ProxBalance Proxmox HA rule checks

Proxmox VE 9 replaced HA groups with HA rules (``/cluster/ha/rules``):

- ``node-affinity`` rules list nodes with priorities (``"lyra:2,orion:1"``) for
  a set of HA resources. A ``strict`` rule only lets those resources run on the
  listed nodes; a non-strict rule only states a preference, which the HA
  manager acts on by moving the resource back to the highest-priority node.
- ``resource-affinity`` rules keep resources together (``positive``: Proxmox
  migrates all of them when one moves) or apart (``negative``: no two of them
  may run on the same node).

Rules can be disabled (``disable=1``); a disabled rule has no effect.
PVE 8 has no rules endpoint, only HA groups (``/cluster/ha/groups``); a
``restricted`` group confines its resources to the group's nodes.

This module turns the raw API responses into a compact form that the
collector stores in ``cluster_cache.json`` under ``ha_rules`` and answers one
question: what does Proxmox HA say about moving guest X to node Y? Everything
except :func:`fetch_ha_data` is pure, so the recommendation engine, automated
migrations, evacuation planning and the manual migration endpoint all share
the same verdicts. When no HA data is available every check returns an empty
result, so clusters without HA (or the endpoints) behave exactly as before.
"""

import sys
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

# HA service states (from /cluster/ha/status/current) in which the resource
# occupies its node. "stopped", "request_stop", "freeze", "disabled" and
# "ignored" do not.
HA_RUNNING_STATES = frozenset({
    "started", "starting", "migrate", "relocate", "recovery", "error", "fence",
})

# Score penalty for a target that a non-strict node-affinity rule (or an
# unrestricted legacy group) ranks below another online node. Large enough to
# make an equally loaded preferred node win, small enough that a much better
# target can still be chosen.
HA_PREFERENCE_PENALTY = 10.0


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _truthy(value: Any) -> bool:
    """Interpret a Proxmox boolean (0/1, "0"/"1", bool) as a Python bool."""
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def parse_node_list(value: Any) -> Dict[str, int]:
    """Parse a Proxmox node list such as ``"lyra:2,orion"`` into ``{node: priority}``.

    Args:
        value: Comma-separated string, list of strings, or dict.

    Returns:
        Mapping of node name to priority (0 when no priority is given).
    """
    if not value:
        return {}
    if isinstance(value, dict):
        return {str(k): int(v or 0) for k, v in value.items()}
    items: Iterable[Any] = value if isinstance(value, (list, tuple)) else str(value).split(",")
    nodes: Dict[str, int] = {}
    for item in items:
        item = str(item).strip()
        if not item:
            continue
        name, _, prio = item.partition(":")
        try:
            nodes[name.strip()] = int(prio) if prio.strip() else 0
        except ValueError:
            nodes[name.strip()] = 0
    return nodes


def parse_resource_list(value: Any) -> List[str]:
    """Parse ``"vm:100,ct:101"`` (or a list) into a list of HA resource IDs."""
    if not value:
        return []
    items: Iterable[Any] = value if isinstance(value, (list, tuple)) else str(value).split(",")
    return [str(i).strip() for i in items if str(i).strip()]


def sid_vmid(sid: str) -> str:
    """Return the VMID part of an HA resource ID (``"ct:101"`` -> ``"101"``)."""
    return str(sid).rsplit(":", 1)[-1].strip()


def normalize_ha_data(
    rules_raw: Optional[List[Dict[str, Any]]],
    resources_raw: Optional[List[Dict[str, Any]]],
    status_raw: Optional[List[Dict[str, Any]]],
    groups_raw: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build the compact HA snapshot stored in ``cluster_cache.json``.

    Args:
        rules_raw: ``/cluster/ha/rules`` response, or None when the endpoint
            does not exist (PVE 8).
        resources_raw: ``/cluster/ha/resources`` response.
        status_raw: ``/cluster/ha/status/current`` response.
        groups_raw: ``/cluster/ha/groups`` response (PVE 8 only).

    Returns:
        Dict with ``source`` ("rules" or "groups"), ``rules`` (list),
        ``groups`` (name -> {restricted, nodes}) and ``resources``
        (HA resource ID -> {state, node, group}).
    """
    rules: List[Dict[str, Any]] = []
    for r in rules_raw or []:
        rtype = r.get("type")
        if rtype not in ("node-affinity", "resource-affinity"):
            continue
        entry: Dict[str, Any] = {
            "id": r.get("rule") or r.get("id") or "",
            "type": rtype,
            "resources": parse_resource_list(r.get("resources")),
        }
        if _truthy(r.get("disable", 0)):
            entry["disabled"] = True
        if rtype == "node-affinity":
            entry["nodes"] = parse_node_list(r.get("nodes"))
            entry["strict"] = _truthy(r.get("strict", 0))
        else:
            entry["affinity"] = str(r.get("affinity") or "").lower()
        rules.append(entry)

    groups: Dict[str, Dict[str, Any]] = {}
    for g in groups_raw or []:
        name = g.get("group")
        if not name:
            continue
        groups[name] = {
            "restricted": _truthy(g.get("restricted", 0)),
            "nodes": parse_node_list(g.get("nodes")),
        }

    resources: Dict[str, Dict[str, Any]] = {}
    for res in resources_raw or []:
        sid = res.get("sid")
        if not sid:
            continue
        resources[sid] = {"state": res.get("state"), "node": None, "group": res.get("group") or None}
    # Live CRM state wins over the requested state from /cluster/ha/resources.
    for item in status_raw or []:
        if item.get("type") != "service":
            continue
        sid = item.get("sid") or str(item.get("id", "")).replace("service:", "", 1)
        if not sid:
            continue
        entry = resources.setdefault(sid, {"state": None, "node": None, "group": None})
        if item.get("state"):
            entry["state"] = item.get("state")
        if item.get("node"):
            entry["node"] = item.get("node")

    return {
        "source": "rules" if rules_raw is not None else "groups",
        "rules": rules,
        "groups": groups,
        "resources": resources,
    }


def _is_missing_endpoint(exc: Exception) -> bool:
    """True when an API error means "no such endpoint" (PVE 8: 404 or 501)."""
    code = getattr(exc, "status_code", None)
    if code in (404, 501):
        return True
    text = str(exc).lower()
    return any(m in text for m in ("404", "501", "not implemented", "no such", "not found"))


def fetch_ha_data(proxmox: Any, resources_raw: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """Fetch and normalize HA rules, resources and state from a proxmoxer client.

    Never raises. Returns None when the HA data cannot be read at all, so
    callers can fall back to the cached snapshot or skip the checks.

    Args:
        proxmox: ProxmoxAPI client.
        resources_raw: Already-fetched ``/cluster/ha/resources`` response
            (the collector has it); fetched here when None.

    Returns:
        Compact HA snapshot (see :func:`normalize_ha_data`) or None.
    """
    if proxmox is None:
        return None
    if resources_raw is None:
        try:
            resources_raw = proxmox.cluster.ha.resources.get() or []
        except Exception as e:
            print(f"Warning: Failed to fetch HA resources: {e}", file=sys.stderr)
            return None
    try:
        status_raw = proxmox.cluster.ha.status.current.get() or []
    except Exception as e:
        print(f"Warning: Failed to fetch HA status: {e}", file=sys.stderr)
        status_raw = []

    rules_raw: Optional[List[Dict[str, Any]]]
    groups_raw: List[Dict[str, Any]] = []
    try:
        rules_raw = proxmox.cluster.ha.rules.get() or []
    except Exception as e:
        if not _is_missing_endpoint(e):
            print(f"Warning: Failed to fetch HA rules: {e}", file=sys.stderr)
            return None
        # PVE 8 answers 404/501 (no such endpoint): fall back to HA groups.
        print(f"Info: HA rules endpoint unavailable ({e}); using HA groups", file=sys.stderr)
        rules_raw = None
        try:
            groups_raw = proxmox.cluster.ha.groups.get() or []
        except Exception as ge:
            print(f"Warning: Failed to fetch HA groups: {ge}", file=sys.stderr)
            return None
    try:
        return normalize_ha_data(rules_raw, resources_raw, status_raw, groups_raw)
    except Exception as e:
        print(f"Warning: Failed to normalize HA data: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def _label(vmid: str, guests: Dict[str, Any]) -> str:
    """Readable guest label: ``"CT 101 (dns-01)"`` or ``"101"``."""
    g = guests.get(str(vmid)) or {}
    name = g.get("name")
    kind = g.get("type")
    base = f"{kind} {vmid}" if kind else str(vmid)
    return f"{base} ({name})" if name else base


def _peer_node(vmid: str, ha: Dict[str, Any], guests: Dict[str, Any],
               pending_moves: Dict[str, str]) -> Optional[str]:
    """Where a peer is (or is about to be): pending move > HA state > cache."""
    if vmid in pending_moves:
        return pending_moves[vmid]
    for sid, res in ha.get("resources", {}).items():
        if sid_vmid(sid) == vmid and res.get("node"):
            return res["node"]
    return (guests.get(vmid) or {}).get("node")


def _peer_running(vmid: str, ha: Dict[str, Any], guests: Dict[str, Any]) -> bool:
    """Whether a peer occupies its node, by HA state or else guest status."""
    for sid, res in ha.get("resources", {}).items():
        if sid_vmid(sid) == vmid:
            state = res.get("state")
            if state and state != "ignored":
                return state in HA_RUNNING_STATES
            break
    return (guests.get(vmid) or {}).get("status") == "running"


def _guest_group(vmid: str, ha: Dict[str, Any], guests: Dict[str, Any]) -> Optional[str]:
    """Legacy HA group of a guest, from the HA snapshot or the guest record."""
    for sid, res in ha.get("resources", {}).items():
        if sid_vmid(sid) == vmid and res.get("group"):
            return res["group"]
    return (guests.get(vmid) or {}).get("ha_group") or None


def _fmt_nodes(nodes: Dict[str, int]) -> str:
    """``"lyra (priority 2), orion"`` — priorities only shown when they differ."""
    if len(set(nodes.values())) <= 1:
        return ", ".join(sorted(nodes))
    ordered = sorted(nodes.items(), key=lambda kv: (-kv[1], kv[0]))
    return ", ".join(f"{n} (priority {p})" for n, p in ordered)


def _node_preference(
    nodes: Dict[str, int], strict: bool, target: str, online_nodes: Optional[Set[str]],
    what: str, subject: str,
) -> Tuple[Optional[str], Optional[str]]:
    """Judge *target* against a node list. Returns (block, warning)."""
    if not nodes:
        return None, None
    if target not in nodes:
        if strict:
            return (f"{what} only allows {subject} on {_fmt_nodes(nodes)}", None)
        if online_nodes is not None and not any(n in online_nodes for n in nodes):
            return None, None  # every preferred node is down; HA places it anywhere
        return (None,f"{what} prefers {_fmt_nodes(nodes)} for {subject}; "
                      f"Proxmox HA may move it back there")
    usable = {n: p for n, p in nodes.items() if online_nodes is None or n in online_nodes or n == target}
    top = max(usable.values()) if usable else nodes[target]
    if nodes[target] < top:
        better = sorted(n for n, p in usable.items() if p == top)
        return (None, f"{what} prefers {', '.join(better)} (priority {top}) over {target} "
                      f"(priority {nodes[target]}) for {subject}; Proxmox HA may move it back")
    return None, None


def _node_checks(
    vmid: str, target: str, ha: Dict[str, Any], guests: Dict[str, Any],
    online_nodes: Optional[Set[str]], subject: str,
) -> Tuple[List[str], List[str]]:
    """Node-affinity rules and legacy groups for one guest. Returns (blocks, warnings)."""
    blocks: List[str] = []
    warnings: List[str] = []
    for rule in ha.get("rules", []):
        if rule.get("disabled") or rule.get("type") != "node-affinity":
            continue
        if vmid not in {sid_vmid(s) for s in rule.get("resources", [])}:
            continue
        kind = "strict node affinity" if rule.get("strict") else "node affinity"
        block, warn = _node_preference(
            rule.get("nodes", {}), bool(rule.get("strict")), target, online_nodes,
            f"HA rule '{rule.get('id')}' ({kind})", subject,
        )
        if block:
            blocks.append(block)
        if warn:
            warnings.append(warn)

    group_name = _guest_group(vmid, ha, guests)
    group = ha.get("groups", {}).get(group_name) if group_name else None
    if group:
        restricted = bool(group.get("restricted"))
        block, warn = _node_preference(
            group.get("nodes", {}), restricted, target, online_nodes,
            f"HA group '{group_name}'" + (" (restricted)" if restricted else ""), subject,
        )
        if block:
            blocks.append(block)
        if warn:
            warnings.append(warn)
    return blocks, warnings


def check_ha_placement(
    vmid: Any,
    target_node: str,
    ha_data: Optional[Dict[str, Any]],
    guests: Optional[Dict[str, Any]] = None,
    pending_moves: Optional[Dict[str, str]] = None,
    online_nodes: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """Check what Proxmox HA rules say about moving a guest to a node.

    Args:
        vmid: Guest ID (int or str).
        target_node: Candidate target node.
        ha_data: Compact HA snapshot (``cluster_cache['ha_rules']``). None or
            empty means no checks.
        guests: Cluster cache guests (vmid str -> guest), used for names, for
            the location of peers and for the running state of peers that HA
            does not report.
        pending_moves: vmid (str) -> node for moves already planned in the
            same pass (recommendations, evacuation), which count as done.
        online_nodes: Nodes that are online. A non-strict preference for an
            offline node is not held against the target.

    Returns:
        Dict with ``blocks`` (reasons the move must not happen),
        ``warnings`` (readable notes), ``co_migrate`` (vmids Proxmox will move
        along with the guest) and ``lower_preference`` (True when a
        node-affinity rule or group prefers another node).
    """
    result: Dict[str, Any] = {"blocks": [], "warnings": [], "co_migrate": [], "lower_preference": False}
    if not ha_data or not target_node:
        return result
    guests = guests or {}
    pending = {str(k): v for k, v in (pending_moves or {}).items()}
    online = set(online_nodes) if online_nodes is not None else None
    vmid = str(vmid)

    blocks, warnings = _node_checks(vmid, target_node, ha_data, guests, online, "this guest")
    result["blocks"].extend(blocks)
    result["warnings"].extend(warnings)
    result["lower_preference"] = bool(warnings)

    for rule in ha_data.get("rules", []):
        if rule.get("disabled") or rule.get("type") != "resource-affinity":
            continue
        members = [sid_vmid(s) for s in rule.get("resources", [])]
        if vmid not in members:
            continue
        peers = [m for m in members if m != vmid]
        rule_id = rule.get("id")
        if rule.get("affinity") == "negative":
            for peer in peers:
                if (_peer_node(peer, ha_data, guests, pending) == target_node
                        and _peer_running(peer, ha_data, guests)):
                    result["blocks"].append(
                        f"HA rule '{rule_id}' keeps this guest apart from {_label(peer, guests)}, "
                        f"which runs on {target_node}"
                    )
        elif rule.get("affinity") == "positive":
            moving = [p for p in peers if _peer_node(p, ha_data, guests, pending) != target_node]
            if not moving:
                continue
            for peer in moving:
                if peer not in result["co_migrate"]:
                    result["co_migrate"].append(peer)
                # The peer goes to the same node, so its own node rules apply too.
                p_blocks, _ = _node_checks(peer, target_node, ha_data, guests, online,
                                           _label(peer, guests))
                for b in p_blocks:
                    result["blocks"].append(f"{_label(peer, guests)} must move with it, but {b}")
            result["warnings"].append(
                f"HA rule '{rule_id}' keeps this guest together with "
                f"{', '.join(_label(p, guests) for p in moving)}; Proxmox will move "
                f"{'it' if len(moving) == 1 else 'them'} to {target_node} too"
            )
    return result


def ha_involved_vmids(ha_data: Optional[Dict[str, Any]], guests: Optional[Dict[str, Any]] = None) -> Set[str]:
    """VMIDs that any enabled rule or legacy group constrains."""
    involved: Set[str] = set()
    if not ha_data:
        return involved
    for rule in ha_data.get("rules", []):
        if not rule.get("disabled"):
            involved.update(sid_vmid(s) for s in rule.get("resources", []))
    groups = ha_data.get("groups", {})
    if groups:
        for sid, res in ha_data.get("resources", {}).items():
            if res.get("group") in groups:
                involved.add(sid_vmid(sid))
        for vmid, g in (guests or {}).items():
            if g.get("ha_group") in groups:
                involved.add(str(vmid))
    return involved


def annotate_ha_placement(
    guests: Dict[str, Any], nodes: Dict[str, Any], ha_data: Optional[Dict[str, Any]],
) -> int:
    """Store per-target HA verdicts on each constrained guest for the UI.

    Sets ``guest['ha_placement'] = {node: {"blocks": [...], "warnings": [...]}}``
    for every guest an enabled rule or group mentions, covering each other node
    that has something to say. Guests without HA constraints are left alone.

    Args:
        guests: Cluster cache guests (modified in place).
        nodes: Cluster cache nodes.
        ha_data: Compact HA snapshot.

    Returns:
        Number of guests annotated.
    """
    count = 0
    if not ha_data:
        return count
    online = [n for n, d in nodes.items() if d.get("status", "online") == "online"]
    for vmid in ha_involved_vmids(ha_data, guests):
        guest = guests.get(vmid)
        if not guest:
            continue
        placement: Dict[str, Dict[str, List[str]]] = {}
        for node_name in nodes:
            if node_name == guest.get("node"):
                continue
            verdict = check_ha_placement(vmid, node_name, ha_data, guests, online_nodes=online)
            if verdict["blocks"] or verdict["warnings"]:
                placement[node_name] = {"blocks": verdict["blocks"], "warnings": verdict["warnings"]}
        if placement:
            guest["ha_placement"] = placement
            count += 1
    return count


def check_move_live(
    proxmox: Any,
    vmid: Any,
    target_node: str,
    cache_data: Optional[Dict[str, Any]],
    pending_moves: Optional[Dict[str, str]] = None,
    ha_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Check one move against the current HA rules, right before executing it.

    Reads the HA rules and state live from Proxmox (the cached snapshot can be
    an hour or more old), falling back to ``cache_data['ha_rules']`` when the
    live read fails. Never raises.

    Args:
        proxmox: ProxmoxAPI client, or None to use the cache only.
        vmid: Guest ID.
        target_node: Target node.
        cache_data: Cluster cache (guests/nodes give names and statuses).
        pending_moves: vmid (str) -> node for moves already done or planned.
        ha_data: Pre-fetched live HA snapshot to use instead of reading it again.

    Returns:
        The :func:`check_ha_placement` result plus ``source``
        ("live", "cache" or "none").
    """
    cache_data = cache_data or {}
    source = "none"
    if ha_data is None and proxmox is not None:
        ha_data = fetch_ha_data(proxmox)
    if ha_data is not None:
        source = "live"
    elif cache_data.get("ha_rules"):
        ha_data = cache_data.get("ha_rules")
        source = "cache"
    try:
        nodes = cache_data.get("nodes") or {}
        online = [n for n, d in nodes.items() if d.get("status") == "online"] if nodes else None
        verdict = check_ha_placement(vmid, target_node, ha_data, cache_data.get("guests") or {},
                                     pending_moves=pending_moves, online_nodes=online)
    except Exception as e:
        print(f"Warning: HA rule check failed for {vmid} -> {target_node}: {e}", file=sys.stderr)
        verdict = {"blocks": [], "warnings": [], "co_migrate": [], "lower_preference": False}
    verdict["source"] = source
    return verdict
