"""
Placement rule routes: list affinity / anti-affinity rules, plan the moves
that make every hard rule hold, and run that plan.

- GET  /api/placement-rules              rules with hard/soft, members, status
- GET  /api/placement-rules/enforce-plan moves that fix hard-rule violations
- POST /api/placement-rules/enforce      run the plan (dry run when automation is in dry-run mode)
"""

import sys
from typing import Any, Dict, Optional

from flask import Blueprint, current_app, jsonify, request

from proxbalance.config_manager import get_proxmox_client, load_config, load_penalty_config
from proxbalance.error_handlers import api_route
from proxbalance.execution_planner import compute_execution_order
from proxbalance.ha_rules import check_ha_placement
from proxbalance.placement_rules import (
    build_rules,
    is_hard,
    plan_enforcement,
    rule_status,
    soft_penalty_from_config,
)
from proxbalance.pve_client import PVE_WRITE_TIMEOUT
from proxbalance.scoring import annotate_anchored_load, calculate_target_node_score

rules_bp = Blueprint("rules", __name__)


def _cache() -> Optional[Dict[str, Any]]:
    return current_app.config["cache_manager"].get()


def _auto_config() -> Dict[str, Any]:
    return load_config().get("automated_migrations", {}) or {}


def build_enforce_plan(cache_data: Dict[str, Any], auto_config: Dict[str, Any],
                       penalty_cfg: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Enforcement plan for the cached cluster state (no Proxmox calls).

    Args:
        cache_data: Cluster cache.
        auto_config: ``automated_migrations`` config.
        penalty_cfg: Penalty config for target scoring (default: loaded).

    Returns:
        :func:`proxbalance.placement_rules.plan_enforcement` result plus
        ``execution_plan`` and ``dry_run``.
    """
    nodes = cache_data.get("nodes", {}) or {}
    guests = cache_data.get("guests", {}) or {}
    rules_cfg = auto_config.get("rules", {}) or {}
    rules = build_rules(guests, rules_cfg, cache_data.get("pools_available"))
    if penalty_cfg is None:
        penalty_cfg = load_penalty_config()
    annotate_anchored_load(nodes, guests)
    ha_data = cache_data.get("ha_rules")

    def score(node, guest, pending):
        return calculate_target_node_score(node, guest, pending, 60.0, 70.0, penalty_config=penalty_cfg)

    def ha_check(vmid, target, pending_moves):
        if not ha_data:
            return None
        verdict = check_ha_placement(vmid, target, ha_data, guests, pending_moves=pending_moves)
        return verdict["blocks"][0] if verdict["blocks"] else None

    plan = plan_enforcement(nodes, guests, rules, score_fn=score,
                            maintenance_nodes=auto_config.get("maintenance_nodes", []) or [],
                            ha_check=ha_check)
    plan["execution_plan"] = compute_execution_order(plan["moves"], nodes) if plan["moves"] else {}
    plan["dry_run"] = bool(auto_config.get("dry_run", True))
    return plan


@rules_bp.route("/api/placement-rules", methods=["GET"])
@api_route
def list_placement_rules():
    """Every affinity / anti-affinity rule, whether it is hard, and whether it holds now."""
    cache_data = _cache()
    if not cache_data:
        return jsonify({"success": False, "error": "No cluster data available"}), 503
    guests = cache_data.get("guests", {}) or {}
    rules_cfg = _auto_config().get("rules", {}) or {}
    out = []
    for rule in build_rules(guests, rules_cfg, cache_data.get("pools_available")):
        st = rule_status(rule, guests)
        members = []
        for m in rule["members"]:
            g = guests.get(m) or {}
            members.append({"vmid": int(m) if m.isdigit() else m, "name": g.get("name", m),
                            "node": g.get("node"), "status": g.get("status")})
        out.append({**{k: rule[k] for k in ("id", "name", "kind", "required", "source")},
                    "hard": is_hard(rule), "members": members, "ok": st["ok"],
                    "nodes": sorted(st["by_node"])})
    return jsonify({
        "success": True,
        "rules": out,
        "violations": sum(1 for r in out if r["hard"] and not r["ok"] and len(r["members"]) > 1),
        "soft_penalty": soft_penalty_from_config(rules_cfg),
        "pools_available": cache_data.get("pools_available"),
        "respect_affinity_rules": rules_cfg.get("respect_affinity_rules", True),
    })


@rules_bp.route("/api/placement-rules/enforce-plan", methods=["GET"])
@api_route
def get_enforce_plan():
    """Moves that make every hard rule hold. Plans only."""
    cache_data = _cache()
    if not cache_data:
        return jsonify({"success": False, "error": "No cluster data available"}), 503
    return jsonify({"success": True, **build_enforce_plan(cache_data, _auto_config())})


@rules_bp.route("/api/placement-rules/enforce", methods=["POST"])
@api_route
def run_enforce_plan():
    """Run the enforcement plan.

    Body: ``{"vmids": [...]}``, the moves the user confirmed. The plan is
    recomputed here; only confirmed moves that are still in it run, so a stale
    page cannot start a move the rules no longer call for. When automation is
    in dry-run mode nothing moves and the response lists what would.
    """
    cache_data = _cache()
    if not cache_data:
        return jsonify({"success": False, "error": "No cluster data available"}), 503
    body = request.get_json(silent=True) or {}
    confirmed = {str(v) for v in (body.get("vmids") or [])}
    if not confirmed:
        return jsonify({"success": False, "error": "No moves confirmed"}), 400

    auto_config = _auto_config()
    plan = build_enforce_plan(cache_data, auto_config)
    moves = [m for m in plan["moves"] if str(m["vmid"]) in confirmed]
    dropped = sorted(confirmed - {str(m["vmid"]) for m in moves})
    if not moves:
        return jsonify({"success": False, "error": "None of the confirmed moves are still needed",
                        "dropped": dropped}), 409

    if plan["dry_run"]:
        return jsonify({"success": True, "dry_run": True, "moves": moves, "dropped": dropped,
                        "message": f"Dry run: {len(moves)} move(s) not started"})

    try:
        proxmox = get_proxmox_client(load_config(), timeout=PVE_WRITE_TIMEOUT)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500

    from proxbalance.migrations import execute_batch_migration
    batch = [{"vmid": m["vmid"], "target_node": m["target_node"], "source_node": m["source_node"],
              "type": m["type"]} for m in moves]
    print(f"Enforcing placement rules: {len(batch)} move(s)", file=sys.stderr)
    result, status = execute_batch_migration(proxmox, batch)
    from proxbalance import audit_log
    audit_log.record_batch(batch, result, "rules.enforce", "Enforce placement rules")
    return jsonify({**result, "dry_run": False, "moves": moves, "dropped": dropped}), status
