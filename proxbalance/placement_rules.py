"""
ProxBalance placement rules (affinity / anti-affinity)

One place that turns guest tags and config into placement rules and answers
the questions the recommendation engine, automated migrations and the
"enforce rules now" action ask about them.

Rule sources:

- Tags. ``exclude_<name>``: anti-affinity, guests with the same tag run on
  different nodes. ``affinity_<name>``: affinity, guests with the same tag
  run on the same node. ``affinity_req_<name>``: the same group as
  ``affinity_<name>``, but required. One ``affinity_req_`` tag on any member
  makes the whole group required. All are valid Proxmox tags
  (``[a-z0-9_][a-z0-9_+.-]*``).
- Proxmox pools, from ``automated_migrations.rules.pool_rules`` in config:
  ``{"<pool>": "affinity" | "anti-affinity"}`` or
  ``{"<pool>": {"type": "affinity", "required": true}}``. Members are the
  guests whose ``pool`` field (set by the collector from ``/pools``) matches.

Hard and soft:

- Anti-affinity is always hard: a target that already runs another member is
  skipped.
- Affinity is soft unless required: a target that splits the group from its
  members adds ``affinity_soft_penalty`` (default
  ``DEFAULT_SOFT_AFFINITY_PENALTY``) to the target's score, so the move needs
  a bigger gain but is still allowed. Required affinity groups move together
  (companion migrations), as every affinity group did before.

Everything here is pure (no Proxmox calls), so it is easy to test.
"""

import sys
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

TAG_ANTI_AFFINITY = "exclude_"
TAG_AFFINITY = "affinity_"
TAG_REQUIRED_AFFINITY = "affinity_req_"

KIND_AFFINITY = "affinity"
KIND_ANTI_AFFINITY = "anti-affinity"

# Added to a target's score when the move splits a soft affinity group.
# Equal to the default min_score_improvement: a split needs about twice the
# usual gain.
DEFAULT_SOFT_AFFINITY_PENALTY = 15.0

# Hard memory ceiling used when placing enforcement moves (same as the
# recommendation engine's capacity gate).
_MEM_CEILING = 0.95

_pool_warning_logged = False


# ---------------------------------------------------------------------------
# Rule building
# ---------------------------------------------------------------------------

def parse_affinity_tag(tag: str) -> Optional[Tuple[str, bool]]:
    """Group key and required flag for an affinity tag.

    ``affinity_req_web`` and ``affinity_web`` both map to group
    ``affinity_web``; only the first is required.

    Returns:
        ``(group, required)`` or None when *tag* is not an affinity tag.
    """
    t = str(tag or "").strip().lower()
    if t.startswith(TAG_REQUIRED_AFFINITY) and len(t) > len(TAG_REQUIRED_AFFINITY):
        return TAG_AFFINITY + t[len(TAG_REQUIRED_AFFINITY):], True
    if t.startswith(TAG_AFFINITY) and len(t) > len(TAG_AFFINITY):
        return t, False
    return None


def _guest_tags(guest: Dict[str, Any]) -> List[str]:
    tags = guest.get("tags") or {}
    if isinstance(tags, str):
        return [t.strip().lower() for t in tags.replace(",", ";").split(";") if t.strip()]
    found = list(tags.get("all_tags") or [])
    # Older caches / fixtures may only carry the parsed lists.
    for key in ("exclude_groups", "affinity_groups"):
        for t in tags.get(key) or []:
            if t not in found:
                found.append(t)
    return [str(t).strip().lower() for t in found if str(t).strip()]


def normalize_pool_rules(raw: Any) -> Dict[str, Dict[str, Any]]:
    """``pool_rules`` config -> ``{pool: {"kind", "required"}}``; bad entries are dropped."""
    out: Dict[str, Dict[str, Any]] = {}
    if not isinstance(raw, dict):
        return out
    for pool, spec in raw.items():
        if isinstance(spec, str):
            kind, required = spec, False
        elif isinstance(spec, dict):
            kind, required = spec.get("type", ""), bool(spec.get("required", False))
        else:
            continue
        kind = str(kind).strip().lower().replace("_", "-")
        if kind in ("anti", "antiaffinity"):
            kind = KIND_ANTI_AFFINITY
        if kind not in (KIND_AFFINITY, KIND_ANTI_AFFINITY):
            continue
        out[str(pool)] = {"kind": kind, "required": True if kind == KIND_ANTI_AFFINITY else required}
    return out


def build_rules(
    guests: Dict[str, Any],
    rules_cfg: Optional[Dict[str, Any]] = None,
    pools_available: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """All placement rules for the cluster.

    Args:
        guests: Cluster cache guests.
        rules_cfg: ``automated_migrations.rules`` from config (for ``pool_rules``).
        pools_available: False when the collector could not read ``/pools``
            (for example the token lacks Pool.Audit). Pool rules are then
            dropped and a warning is logged once per process.

    Returns:
        List of rules: ``{"id", "name", "kind", "required", "source",
        "members"}`` with members as sorted vmid strings.
    """
    global _pool_warning_logged
    tag_groups: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for vmid, guest in (guests or {}).items():
        vid = str(guest.get("vmid", vmid))
        for tag in _guest_tags(guest):
            if tag.startswith(TAG_ANTI_AFFINITY) and len(tag) > len(TAG_ANTI_AFFINITY):
                key = (KIND_ANTI_AFFINITY, tag)
                rule = tag_groups.setdefault(key, {"name": tag, "kind": KIND_ANTI_AFFINITY,
                                                   "required": True, "members": set()})
                rule["members"].add(vid)
                continue
            parsed = parse_affinity_tag(tag)
            if parsed:
                group, required = parsed
                rule = tag_groups.setdefault((KIND_AFFINITY, group), {
                    "name": group, "kind": KIND_AFFINITY, "required": False, "members": set()})
                rule["members"].add(vid)
                rule["required"] = rule["required"] or required

    rules: List[Dict[str, Any]] = []
    for (_kind, name), r in sorted(tag_groups.items()):
        rules.append({"id": f"tag:{name}", "name": name, "kind": r["kind"], "required": r["required"],
                      "source": "tag", "members": sorted(r["members"], key=_vmid_sort)})

    pool_cfg = normalize_pool_rules((rules_cfg or {}).get("pool_rules"))
    if pool_cfg and pools_available is False:
        if not _pool_warning_logged:
            print("Warning: pool rules configured but pool membership could not be read "
                  "(token needs Pool.Audit); pool rules ignored", file=sys.stderr)
            _pool_warning_logged = True
        pool_cfg = {}
    for pool, spec in sorted(pool_cfg.items()):
        members = sorted((str(g.get("vmid", k)) for k, g in (guests or {}).items() if g.get("pool") == pool),
                         key=_vmid_sort)
        rules.append({"id": f"pool:{pool}", "name": pool, "kind": spec["kind"], "required": spec["required"],
                      "source": "pool", "members": members})
    return rules


def _vmid_sort(v: str) -> Tuple[int, str]:
    return (int(v), "") if str(v).isdigit() else (sys.maxsize, str(v))


def rules_for_guest(vmid: Any, rules: Iterable[Dict[str, Any]], kind: Optional[str] = None,
                    required: Optional[bool] = None) -> List[Dict[str, Any]]:
    """Rules that include *vmid*, optionally filtered by kind and required flag."""
    vid = str(vmid)
    return [r for r in rules
            if vid in r["members"]
            and (kind is None or r["kind"] == kind)
            and (required is None or r["required"] == required)]


def is_hard(rule: Dict[str, Any]) -> bool:
    """Anti-affinity is always hard; affinity only when required."""
    return rule["kind"] == KIND_ANTI_AFFINITY or bool(rule["required"])


def soft_penalty_from_config(rules_cfg: Optional[Dict[str, Any]]) -> float:
    """``affinity_soft_penalty`` from config, clamped to 0..100."""
    try:
        value = float((rules_cfg or {}).get("affinity_soft_penalty", DEFAULT_SOFT_AFFINITY_PENALTY))
    except (TypeError, ValueError):
        value = DEFAULT_SOFT_AFFINITY_PENALTY
    return max(0.0, min(100.0, value))


# ---------------------------------------------------------------------------
# Placement checks
# ---------------------------------------------------------------------------

def _label(vmid: str, guests: Dict[str, Any]) -> str:
    g = guests.get(vmid) or guests.get(int(vmid) if str(vmid).isdigit() else vmid) or {}
    name = g.get("name")
    return f"{name} ({vmid})" if name else str(vmid)


def _guest(vmid: str, guests: Dict[str, Any]) -> Dict[str, Any]:
    return guests.get(vmid) or guests.get(int(vmid) if str(vmid).isdigit() else vmid) or {}


def anti_affinity_conflict(
    vmid: Any,
    target: str,
    rules: Iterable[Dict[str, Any]],
    guests: Dict[str, Any],
    pending_target_guests: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    node_guests: Optional[Iterable[Any]] = None,
) -> Optional[str]:
    """Why *target* breaks a (hard) anti-affinity rule for *vmid*, or None.

    A conflict is another member already on *target* (by its current node, or
    the node's guest list when *node_guests* is given) or a member already
    planned to move there (*pending_target_guests*).
    """
    vid = str(vmid)
    on_target = {str(v) for v in node_guests} if node_guests is not None else {
        str(g.get("vmid", k)) for k, g in guests.items() if g.get("node") == target}
    pending = {str(g.get("vmid")) for g in (pending_target_guests or {}).get(target, []) if isinstance(g, dict)}
    for rule in rules_for_guest(vid, rules, kind=KIND_ANTI_AFFINITY):
        for other in rule["members"]:
            if other == vid:
                continue
            if other in on_target or other in pending:
                return f"anti-affinity {rule['name']} with {_label(other, guests)}"
    return None


def _location(vmid: str, guests: Dict[str, Any], pending_moves: Optional[Dict[str, str]]) -> Optional[str]:
    if pending_moves and vmid in pending_moves:
        return pending_moves[vmid]
    return _guest(vmid, guests).get("node")


def soft_affinity_penalty(
    vmid: Any,
    source: str,
    target: str,
    rules: Iterable[Dict[str, Any]],
    guests: Dict[str, Any],
    pending_moves: Optional[Dict[str, str]] = None,
    penalty: float = DEFAULT_SOFT_AFFINITY_PENALTY,
) -> Tuple[float, List[str]]:
    """Score penalty for moving *vmid* from *source* to *target*.

    A soft affinity group is split by the move when more of the guest's
    group-mates are on *source* than on *target* (moving toward the mates is
    never penalised). Each such group adds *penalty* once.

    Returns:
        ``(total_penalty, [group names split])``.
    """
    vid = str(vmid)
    total = 0.0
    split: List[str] = []
    for rule in rules_for_guest(vid, rules, kind=KIND_AFFINITY, required=False):
        at_source = at_target = 0
        for other in rule["members"]:
            if other == vid:
                continue
            loc = _location(other, guests, pending_moves)
            if loc == source:
                at_source += 1
            elif loc == target:
                at_target += 1
        if at_source > at_target:
            total += penalty
            split.append(rule["name"])
    return total, split


# ---------------------------------------------------------------------------
# Violations and the "enforce rules now" plan
# ---------------------------------------------------------------------------

def rule_status(rule: Dict[str, Any], guests: Dict[str, Any]) -> Dict[str, Any]:
    """Where a rule's members run and whether the rule holds right now."""
    by_node: Dict[str, List[str]] = {}
    for m in rule["members"]:
        node = _guest(m, guests).get("node")
        if node:
            by_node.setdefault(node, []).append(m)
    if rule["kind"] == KIND_ANTI_AFFINITY:
        ok = all(len(v) <= 1 for v in by_node.values())
    else:
        ok = len(by_node) <= 1
    return {"by_node": by_node, "ok": ok}


def find_violations(rules: Iterable[Dict[str, Any]], guests: Dict[str, Any],
                    hard_only: bool = True) -> List[Dict[str, Any]]:
    """Rules that do not hold now (hard rules only unless *hard_only* is False)."""
    out = []
    for rule in rules:
        if hard_only and not is_hard(rule):
            continue
        if len(rule["members"]) < 2:
            continue
        st = rule_status(rule, guests)
        if st["ok"]:
            continue
        if rule["kind"] == KIND_ANTI_AFFINITY:
            shared = {n: v for n, v in st["by_node"].items() if len(v) > 1}
            detail = "; ".join(f"{len(v)} on {n}" for n, v in sorted(shared.items()))
        else:
            detail = f"split across {', '.join(sorted(st['by_node']))}"
        out.append({"rule_id": rule["id"], "name": rule["name"], "kind": rule["kind"],
                    "required": rule["required"], "source": rule["source"],
                    "by_node": st["by_node"], "detail": detail})
    return out


def _movable(guest: Dict[str, Any]) -> Optional[str]:
    """Why a guest cannot be moved by enforcement, or None."""
    tags = guest.get("tags") or {}
    if isinstance(tags, dict) and tags.get("has_ignore"):
        return "has the 'ignore' tag"
    local_disks = guest.get("local_disks") or {}
    if local_disks.get("is_pinned"):
        if local_disks.get("pinned_devices"):
            return f"has {local_disks.get('pinned_reason') or 'passthrough hardware'}"
        return "has passthrough disks"
    if guest.get("type") == "CT" and (guest.get("mount_points") or {}).get("has_unshared_bind_mount"):
        return "has an unshared bind mount"
    return None


def plan_enforcement(
    nodes: Dict[str, Any],
    guests: Dict[str, Any],
    rules: List[Dict[str, Any]],
    score_fn: Optional[Callable[[Dict[str, Any], Dict[str, Any], Dict[str, List[Dict[str, Any]]]], float]] = None,
    maintenance_nodes: Optional[Iterable[str]] = None,
    ha_check: Optional[Callable[[str, str, Dict[str, str]], Optional[str]]] = None,
    storage_check: Optional[Callable[[Dict[str, Any], str, str], bool]] = None,
) -> Dict[str, Any]:
    """Moves that make every hard rule hold. Plans only; executes nothing.

    - Anti-affinity: on each node with two or more members, the member that
      is hardest to move (unmovable first, then the most memory) stays; the
      others go to the best-scoring node that holds no member.
    - Required affinity: the group's home is the node holding an unmovable
      member, else the node with the most members (then most memory, then
      name); the rest move there.

    Soft rules are never enforced.

    Args:
        nodes: Cluster cache nodes.
        guests: Cluster cache guests.
        rules: From :func:`build_rules`.
        score_fn: ``(node, guest, pending_target_guests) -> score``, lower is
            better. Default: target memory use.
        maintenance_nodes: Never targets.
        ha_check: ``(vmid, target, pending_moves) -> block reason or None``.
        storage_check: ``(guest, source, target) -> compatible``.

    Returns:
        ``{"violations", "moves", "unresolved"}``. Each move has ``vmid``,
        ``name``, ``type``, ``source_node``, ``target_node``, ``rule``,
        ``reason``, ``mem_gb``.
    """
    maint = set(maintenance_nodes or [])
    violations = find_violations(rules, guests)
    moves: List[Dict[str, Any]] = []
    unresolved: List[Dict[str, Any]] = []
    pending_moves: Dict[str, str] = {}
    pending_target_guests: Dict[str, List[Dict[str, Any]]] = {}
    online = [n for n, d in nodes.items() if d.get("status") == "online" and n not in maint]

    def mem_gb(g: Dict[str, Any]) -> float:
        return float(g.get("mem_max_gb") or g.get("mem_used_gb") or 0)

    def fits(target: str, g: Dict[str, Any]) -> bool:
        node = nodes.get(target) or {}
        total = float(node.get("total_mem_gb") or 0)
        if total <= 0:
            return True
        used = float(node.get("mem_percent") or 0) / 100.0 * total
        pend = sum(mem_gb(p) for p in pending_target_guests.get(target, []))
        return used + pend + mem_gb(g) <= total * _MEM_CEILING

    def default_score(node: Dict[str, Any], g: Dict[str, Any], pend: Dict[str, List[Dict[str, Any]]]) -> float:
        return float(node.get("mem_percent") or 0) + 10 * len(pend.get(node.get("name", ""), []))

    score = score_fn or default_score

    def current_location(vid: str) -> Optional[str]:
        return _location(vid, guests, pending_moves)

    def target_problem(vid: str, g: Dict[str, Any], source: str, target: str) -> Optional[str]:
        if target == source or target not in online:
            return "not available"
        # Members moved by this plan count at their new node.
        others_on_target = [v for v in (str(x.get("vmid", k)) for k, x in guests.items())
                            if v != vid and current_location(v) == target]
        conflict = anti_affinity_conflict(vid, target, rules, guests, node_guests=others_on_target)
        if conflict:
            return conflict
        if not fits(target, g):
            return "not enough memory"
        if storage_check and not storage_check(g, source, target):
            return "storage not available"
        if ha_check:
            block = ha_check(vid, target, pending_moves)
            if block:
                return block
        return None

    def add_move(vid: str, g: Dict[str, Any], source: str, target: str, rule: Dict[str, Any], reason: str) -> None:
        pending_moves[vid] = target
        pending_target_guests.setdefault(target, []).append(g)
        vmid_out = int(vid) if vid.isdigit() else vid
        moves.append({
            "vmid": vmid_out, "name": g.get("name", vid), "type": g.get("type", "VM"),
            "source_node": source, "target_node": target, "rule": rule["name"], "rule_id": rule["id"],
            "reason": reason, "mem_gb": round(mem_gb(g), 1),
            # Fields the execution planner reads.
            "score_improvement": 0, "confidence_score": 100,
        })

    def fail(vid: str, g: Dict[str, Any], rule: Dict[str, Any], why: str) -> None:
        unresolved.append({"vmid": int(vid) if vid.isdigit() else vid, "name": g.get("name", vid),
                           "node": g.get("node"), "rule": rule["name"], "reason": why})

    rule_by_id = {r["id"]: r for r in rules}

    # Required affinity first: a group's home is chosen before anti-affinity
    # moves pick targets, so they do not land between group members.
    for v in sorted(violations, key=lambda x: x["kind"] != KIND_AFFINITY):
        rule = rule_by_id[v["rule_id"]]
        if rule["kind"] == KIND_AFFINITY:
            st = rule_status(rule, guests)
            pinned_nodes = {n for n, ms in st["by_node"].items() if any(_movable(_guest(m, guests)) for m in ms)}
            if len(pinned_nodes) > 1:
                for m in rule["members"]:
                    g = _guest(m, guests)
                    if _movable(g):
                        fail(m, g, rule, f"members that cannot move run on {', '.join(sorted(pinned_nodes))}")
                continue
            if pinned_nodes:
                home = next(iter(pinned_nodes))
            else:
                home = max(st["by_node"], key=lambda n: (len(st["by_node"][n]),
                                                          sum(mem_gb(_guest(m, guests)) for m in st["by_node"][n]),
                                                          [-ord(c) for c in n]))
            for m in rule["members"]:
                g = _guest(m, guests)
                src = g.get("node")
                if not src or current_location(m) == home:
                    continue
                problem = target_problem(m, g, src, home)
                if problem:
                    fail(m, g, rule, f"{home}: {problem}")
                else:
                    add_move(m, g, src, home, rule, f"Join {rule['name']} on {home}")
        else:
            for node, members in sorted(v["by_node"].items()):
                if len(members) < 2:
                    continue
                ranked = sorted(members, key=lambda m: (_movable(_guest(m, guests)) is None,
                                                        -mem_gb(_guest(m, guests)), _vmid_sort(m)))
                for m in ranked[1:]:
                    g = _guest(m, guests)
                    why_not = _movable(g)
                    if why_not:
                        fail(m, g, rule, why_not)
                        continue
                    if rules_for_guest(m, rules, kind=KIND_AFFINITY, required=True):
                        fail(m, g, rule, "also in a required affinity group")
                        continue
                    best, best_score, reasons = None, None, []
                    for t in online:
                        problem = target_problem(m, g, node, t)
                        if problem:
                            if t != node:
                                reasons.append(f"{t}: {problem}")
                            continue
                        s = score(nodes[t], g, pending_target_guests)
                        if best_score is None or s < best_score:
                            best, best_score = t, s
                    if best:
                        add_move(m, g, node, best, rule, f"Leave {node}, which also runs another {rule['name']} member")
                    else:
                        fail(m, g, rule, "; ".join(reasons) or "no other online node")

    return {"violations": violations, "moves": moves, "unresolved": unresolved}
