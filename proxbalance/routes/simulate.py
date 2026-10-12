"""
Simulation routes: "what if a node fails?" (N-1 capacity).

Both endpoints read the latest collected snapshot only; nothing calls Proxmox.
"""

from flask import Blueprint, current_app, request

from proxbalance.error_handlers import api_route, api_success, api_error
from proxbalance.failure_sim import (
    DEFAULT_MEM_CEILING, DEFAULT_TIGHT_PCT, STORAGE_MODES,
    simulate_node_failure, simulate_all_failures,
)

simulate_bp = Blueprint("simulate", __name__)


def _pct_arg(name: str, default: float) -> float:
    """Read a percentage query argument, clamped to 50–100."""
    try:
        value = float(request.args.get(name, default))
    except (TypeError, ValueError):
        return default
    return max(50.0, min(100.0, value))


@simulate_bp.route("/api/simulate/node-failure", methods=["GET"])
@api_route
def simulate_failure():
    """Simulate one node failing (``?node=pve4``) or every node in turn.

    Query args:
        node: Node to fail. Omitted: N-1 summary across all online nodes.
        storage: ``capacity`` (default; pure capacity, node-local disks
            assumed restored) or ``strict`` (unplanned failure: guests on
            node-local storage can't restart elsewhere).
        mem_ceiling: Highest memory % a survivor may reach (default 95).
        tight_pct: Survivor memory % above which the result is "tight" (85).
    """
    data = current_app.config["cache_manager"].get()
    if not data or not data.get("nodes"):
        return api_error("No cached data available", 503)
    nodes = data.get("nodes", {})
    guests = data.get("guests", {})
    ha_rules = data.get("ha_rules")
    storage = request.args.get("storage", "capacity")
    if storage not in STORAGE_MODES:
        return api_error(f"storage must be one of: {', '.join(STORAGE_MODES)}", 400)
    kwargs = {
        "mem_ceiling": _pct_arg("mem_ceiling", DEFAULT_MEM_CEILING),
        "tight_pct": _pct_arg("tight_pct", DEFAULT_TIGHT_PCT),
        "storage_mode": storage,
    }
    node = request.args.get("node")
    if node:
        if node not in nodes:
            return api_error(f"Unknown node: {node}", 404)
        result = simulate_node_failure(node, nodes, guests, ha_rules, **kwargs)
    else:
        result = simulate_all_failures(nodes, guests, ha_rules, **kwargs)
    result["collected_at"] = data.get("collected_at")
    return api_success(result)
