"""
Semi-automatic automation mode (decision D5).

In ``automated_migrations.mode = "semi"`` an automation run executes only

* maintenance evacuations (the source node is in ``maintenance_nodes``),
* moves whose source node is over its critical limits, and
* moves the user approved from the approval queue,

and queues every other move it would have executed for approval. The critical
limits are the ones that already stop a node receiving guests:
``safety_checks.max_node_cpu_percent`` (default 85) and
``safety_checks.max_node_memory_percent`` (default 90). Every other rule
(windows, cooldown, inflow cap, HA rules, observation) applies before this
split, so it never lets a move through that automatic mode would refuse.

Pure helpers only; the queue itself lives in :mod:`proxbalance.migration_db`.
"""

from typing import Any, Dict, List, Optional, Tuple

from proxbalance.scoring import recent_cpu

MODE_AUTOMATIC = "automatic"
MODE_SEMI = "semi"
MODES = (MODE_AUTOMATIC, MODE_SEMI)

DEFAULT_APPROVAL_TTL_HOURS = 24
MIN_APPROVAL_TTL_HOURS = 1
MAX_APPROVAL_TTL_HOURS = 168

# Why a move ran on its own in semi mode (decision['auto_run']).
AUTO_EVACUATION = "evacuation"
AUTO_CRITICAL = "critical"
AUTO_APPROVED = "approved"


def get_mode(auto_config: Optional[Dict[str, Any]]) -> str:
    """The configured automation mode; anything unknown means automatic."""
    mode = (auto_config or {}).get("mode", MODE_AUTOMATIC)
    return mode if mode in MODES else MODE_AUTOMATIC


def get_approval_ttl_hours(auto_config: Optional[Dict[str, Any]]) -> int:
    """Hours a queued move waits for approval before it expires (lenient read)."""
    value = (auto_config or {}).get("approval_ttl_hours", DEFAULT_APPROVAL_TTL_HOURS)
    if isinstance(value, bool):
        return DEFAULT_APPROVAL_TTL_HOURS
    try:
        hours = int(value)
    except (TypeError, ValueError):
        return DEFAULT_APPROVAL_TTL_HOURS
    return max(MIN_APPROVAL_TTL_HOURS, min(MAX_APPROVAL_TTL_HOURS, hours))


def validate_mode(value: Any) -> str:
    """Validate a mode from the API. Raises ValueError."""
    if value not in MODES:
        raise ValueError(f"mode must be one of: {', '.join(MODES)}")
    return value


def validate_approval_ttl_hours(value: Any) -> int:
    """Validate approval_ttl_hours from the API. Raises ValueError."""
    if isinstance(value, bool):
        raise ValueError("approval_ttl_hours must be a whole number of hours")
    try:
        as_float = float(value)
    except (TypeError, ValueError):
        raise ValueError("approval_ttl_hours must be a whole number of hours")
    if as_float != int(as_float):
        raise ValueError("approval_ttl_hours must be a whole number of hours")
    hours = int(as_float)
    if not MIN_APPROVAL_TTL_HOURS <= hours <= MAX_APPROVAL_TTL_HOURS:
        raise ValueError(
            f"approval_ttl_hours must be {MIN_APPROVAL_TTL_HOURS}-{MAX_APPROVAL_TTL_HOURS}"
        )
    return hours


def critical_limits(config: Dict[str, Any]) -> Tuple[float, float]:
    """(max CPU %, max memory %) beyond which a node counts as critical."""
    safety = config.get("automated_migrations", {}).get("safety_checks", {})
    return safety.get("max_node_cpu_percent", 85), safety.get("max_node_memory_percent", 90)


def node_over_critical(
    node_name: str, config: Dict[str, Any], cache_data: Dict[str, Any]
) -> Tuple[bool, str]:
    """Is *node_name* over its critical CPU or memory limit?

    Uses the same figures as the target-node safety check (~15-minute CPU
    average, current memory), so "critical" means one thing everywhere.

    Returns:
        (over, message) — the message names the metric, e.g. "orion CPU 92% > 85%".
    """
    node = (cache_data.get("nodes") or {}).get(node_name)
    if not node:
        return False, ""
    metrics = node.get("metrics") or {}
    cpu = recent_cpu(metrics) if metrics else node.get("cpu_percent", 0)
    mem = node.get("mem_percent", 0)
    max_cpu, max_mem = critical_limits(config)
    if cpu is not None and cpu > max_cpu:
        return True, f"{node_name} CPU {cpu:.0f}% > {max_cpu}%"
    if mem is not None and mem > max_mem:
        return True, f"{node_name} memory {mem:.0f}% > {max_mem}%"
    return False, ""


def auto_run_reason(
    rec: Dict[str, Any],
    maintenance_nodes: List[str],
    config: Dict[str, Any],
    cache_data: Dict[str, Any],
    approved: Dict[int, str],
) -> Tuple[Optional[str], str]:
    """Why *rec* may run without approval in semi mode, or (None, "").

    Args:
        rec: A recommendation that passed every automation filter.
        maintenance_nodes: Nodes being evacuated.
        config: Full configuration.
        cache_data: Cluster cache.
        approved: vmid -> target node of approved queue entries.

    Returns:
        (code, detail) with code one of AUTO_EVACUATION / AUTO_CRITICAL /
        AUTO_APPROVED, or (None, "") when the move needs approval.
    """
    source = rec.get("source_node") or rec.get("current_node")
    if source in maintenance_nodes:
        return AUTO_EVACUATION, f"Evacuating {source}"
    over, msg = node_over_critical(source, config, cache_data)
    if over:
        return AUTO_CRITICAL, msg
    try:
        vmid = int(rec.get("vmid"))
    except (TypeError, ValueError):
        vmid = None
    if vmid is not None and approved.get(vmid) == rec.get("target_node"):
        return AUTO_APPROVED, "Approved"
    return None, ""


def split_for_approval(
    filtered: List[Dict[str, Any]],
    maintenance_nodes: List[str],
    config: Dict[str, Any],
    cache_data: Dict[str, Any],
    approved: Dict[int, str],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Split filtered recommendations into (may run now, needs approval).

    Order is kept in both lists. Each runnable rec gets ``_auto_run`` and
    ``_auto_run_detail`` keys saying why.
    """
    runnable, held = [], []
    for r in filtered:
        code, detail = auto_run_reason(r, maintenance_nodes, config, cache_data, approved)
        if code:
            r["_auto_run"] = code
            r["_auto_run_detail"] = detail
            runnable.append(r)
        else:
            held.append(r)
    return runnable, held
