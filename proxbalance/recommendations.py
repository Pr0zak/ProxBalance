"""
ProxBalance Recommendation Engine

Generates intelligent migration recommendations using penalty-based scoring.
Evaluates guest placement across cluster nodes, considering current load,
predicted post-migration load, storage compatibility, anti-affinity rules,
maintenance mode evacuation, and distribution balancing.
"""

import os
import sys
import json
import traceback
from typing import Any, Dict, List, Optional, Set, Union
from datetime import datetime, timezone

from proxbalance.scoring import (
    calculate_node_health_score,
    predict_post_migration_load,
    calculate_target_node_score,
    calculate_intelligent_thresholds,
    calculate_migration_risk,
    DEFAULT_PENALTY_CONFIG,
)
from proxbalance.config_manager import (
    load_penalty_config,
    load_config,
    get_proxmox_client,
    DISK_PREFIXES,
    BASE_PATH,
)
from proxbalance.forecasting import (
    project_trend,
    generate_forecast_recommendations as _generate_forecast_recommendations,
    save_score_snapshot as _save_score_snapshot,
    SCORE_HISTORY_FILE,
)
from proxbalance.execution_planner import compute_execution_order as _compute_execution_order
from proxbalance.reporting import (
    build_summary as _build_summary,
    generate_capacity_advisories as _generate_capacity_advisories,
)
from proxbalance.storage import (
    build_storage_cache,
    check_storage_compatibility,
)
from proxbalance.distribution import (
    calculate_node_guest_counts,
    find_distribution_candidates,
)
from proxbalance.recommendation_analysis import (
    calculate_confidence as _calculate_confidence,
    build_structured_reason as _build_structured_reason,
    detect_migration_conflicts as _detect_migration_conflicts,
)
from proxbalance.patterns import get_node_seasonal_baseline
from proxbalance.guest_profiles import get_guest_profile

# Lazy import for trend analysis (may not have data yet)
_trend_module = None

def _get_trend_module():
    global _trend_module
    if _trend_module is None:
        try:
            from proxbalance import trend_analysis
            _trend_module = trend_analysis
        except Exception:
            pass
    return _trend_module


# ---------------------------------------------------------------------------
# Guest selection
# ---------------------------------------------------------------------------

def select_guests_to_migrate(node: Dict[str, Any], guests: Dict[str, Any], cpu_threshold: float, mem_threshold: float, overload_reason: str, iowait_threshold: float = 30.0) -> List[str]:
    """
    Intelligently select which guests to migrate from an overloaded node.
    Uses knapsack-style algorithm to minimize migrations while resolving overload.

    overload_reason can be: "maintenance", "cpu", "mem", "iowait", or combined.
    """
    node_name = node.get("name")
    metrics = node.get("metrics", {})

    # Calculate how much we need to reduce
    current_cpu = metrics.get("avg_cpu", 0) if metrics.get("has_historical") else metrics.get("current_cpu", 0)
    current_mem = metrics.get("avg_mem", 0) if metrics.get("has_historical") else metrics.get("current_mem", 0)
    current_iowait = metrics.get("avg_iowait", 0) if metrics.get("has_historical") else metrics.get("current_iowait", 0)

    # Special handling for maintenance: evacuate all guests
    if overload_reason == "maintenance":
        # For maintenance mode, set very high reduction targets to evacuate everything
        cpu_reduction_needed = 999999
        mem_reduction_needed = 999999
    else:
        # Target reduction (get back below threshold with 10% buffer)
        cpu_reduction_needed = max(0, current_cpu - (cpu_threshold - 10))
        mem_reduction_needed = max(0, current_mem - (mem_threshold - 10))

    # Build candidate list with impact scores
    candidates = []
    for vmid in node.get("guests", []):
        vmid_key = str(vmid) if str(vmid) in guests else vmid
        if vmid_key not in guests:
            continue

        guest = guests[vmid_key]

        # Skip stopped guests
        if guest.get("status") != "running":
            continue

        # For maintenance mode, ignore tags and HA status (evacuation is priority)
        if overload_reason != "maintenance":
            # Skip ignored guests and HA-managed guests (only when NOT in maintenance)
            if guest.get("tags", {}).get("has_ignore", False):
                continue
            if guest.get("ha_managed", False):
                continue  # Don't recommend migrating HA-managed guests

        # Calculate guest's impact on node resources
        guest_cpu_cores = guest.get("cpu_cores", 1)
        guest_cpu_usage = guest.get("cpu_current", 0)
        node_cores = node.get("cpu_cores", 1)
        cpu_impact = (guest_cpu_usage * guest_cpu_cores / node_cores) if node_cores > 0 else 0

        guest_mem_gb = guest.get("mem_used_gb", 0)
        node_mem_gb = node.get("total_mem_gb", 1)
        mem_impact = (guest_mem_gb / node_mem_gb * 100) if node_mem_gb > 0 else 0

        # Calculate migration cost (prefer smaller, less active guests)
        disk_io_mbps = (guest.get("disk_read_bps", 0) + guest.get("disk_write_bps", 0)) / (1024**2)
        migration_cost = guest.get("mem_max_gb", 0) + (disk_io_mbps / 10)  # Factor in I/O activity

        # Disk I/O impact: for IOWait overload, the highest-I/O guest gives the most relief
        io_impact = disk_io_mbps  # MB/s — direct measure of I/O pressure contribution

        # Efficiency score: impact per migration cost (higher is better)
        if overload_reason == "cpu":
            efficiency = cpu_impact / migration_cost if migration_cost > 0 else 0
        elif overload_reason == "mem":
            efficiency = mem_impact / migration_cost if migration_cost > 0 else 0
        elif overload_reason == "iowait":
            # For IOWait, prioritize guests generating the most disk I/O
            efficiency = io_impact / migration_cost if migration_cost > 0 else 0
        else:
            efficiency = (cpu_impact + mem_impact) / (2 * migration_cost) if migration_cost > 0 else 0

        candidates.append({
            "vmid_key": vmid_key,
            "guest": guest,
            "cpu_impact": cpu_impact,
            "mem_impact": mem_impact,
            "io_impact": io_impact,
            "migration_cost": migration_cost,
            "efficiency": efficiency
        })

    # Sort by efficiency (highest efficiency first)
    candidates.sort(key=lambda x: x["efficiency"], reverse=True)

    # Greedy selection: pick guests until we've reduced load enough
    selected = []
    cpu_reduction = 0
    mem_reduction = 0

    # Track IOWait reduction heuristically: each I/O-heavy guest removed reduces IOWait
    iowait_reduction_needed = max(0, current_iowait - (iowait_threshold - 5)) if overload_reason == "iowait" else 0
    io_reduction = 0.0

    for candidate in candidates:
        # For maintenance mode, don't stop early - evacuate ALL guests
        if overload_reason != "maintenance":
            if overload_reason == "cpu" and cpu_reduction >= cpu_reduction_needed:
                break
            if overload_reason == "mem" and mem_reduction >= mem_reduction_needed:
                break
            if overload_reason == "iowait" and io_reduction >= iowait_reduction_needed:
                break
            if overload_reason not in ["cpu", "mem", "iowait"] and (cpu_reduction >= cpu_reduction_needed and mem_reduction >= mem_reduction_needed):
                break

        selected.append(candidate["vmid_key"])
        cpu_reduction += candidate["cpu_impact"]
        mem_reduction += candidate["mem_impact"]
        # Rough heuristic: each MB/s of disk I/O removed reduces IOWait by ~0.05%
        io_reduction += candidate.get("io_impact", 0) * 0.05

        # Limit to 5 migrations per node (skip limit for maintenance mode)
        if overload_reason != "maintenance" and len(selected) >= 5:
            break

    return selected


# ---------------------------------------------------------------------------
# Intelligent migration helper functions
# ---------------------------------------------------------------------------

def _check_cluster_convergence(nodes: Dict[str, Any], penalty_cfg: Dict[str, Any],
                                cpu_threshold: float, mem_threshold: float,
                                convergence_threshold: float) -> Optional[str]:
    """
    Check if the cluster is already well-balanced enough that migrations
    would provide negligible benefit. Returns a message if converged, None otherwise.
    """
    online_nodes = {k: v for k, v in nodes.items() if v.get('status') == 'online'}
    if len(online_nodes) < 2:
        return None

    weight_current = penalty_cfg.get('weight_current', 0.5)
    weight_24h = penalty_cfg.get('weight_24h', 0.3)
    weight_7d = penalty_cfg.get('weight_7d', 0.2)

    cpus = []
    mems = []
    for node in online_nodes.values():
        metrics = node.get('metrics', {})
        if metrics.get('has_historical'):
            cpu = (metrics.get('current_cpu', 0) * weight_current +
                   metrics.get('avg_cpu', 0) * weight_24h +
                   metrics.get('avg_cpu_week', 0) * weight_7d)
            mem = (metrics.get('current_mem', 0) * weight_current +
                   metrics.get('avg_mem', 0) * weight_24h +
                   metrics.get('avg_mem_week', 0) * weight_7d)
        else:
            cpu = metrics.get('current_cpu', 0)
            mem = metrics.get('current_mem', 0)
        cpus.append(cpu)
        mems.append(mem)

    cpu_spread = max(cpus) - min(cpus)
    mem_spread = max(mems) - min(mems)

    # Only suppress if NO node exceeds thresholds
    any_over_threshold = any(c > cpu_threshold for c in cpus) or any(m > mem_threshold for m in mems)

    if not any_over_threshold and cpu_spread < convergence_threshold and mem_spread < convergence_threshold:
        return (f"Cluster is well-balanced (CPU spread: {cpu_spread:.1f}%, "
                f"memory spread: {mem_spread:.1f}%, threshold: {convergence_threshold:.0f}%)")

    return None


def _calculate_cost_benefit(recommendation: Dict[str, Any], guest: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate cost-benefit ratio for a migration recommendation.
    Benefit: score improvement and confidence.
    Cost: estimated migration duration and disruption.
    """
    score_improvement = recommendation.get('score_improvement', 0)
    confidence = recommendation.get('confidence_score', 50)
    benefit = (score_improvement * 0.7 + confidence * 0.3)

    mem_gb = guest.get('mem_max_gb', 0)
    disk_io = (guest.get('disk_read_bps', 0) + guest.get('disk_write_bps', 0)) / (1024**2)
    is_ct = guest.get('type') == 'CT'

    # Duration estimate: ~1 min per 4GB RAM + I/O penalty
    est_duration = max(1, mem_gb / 4) + (disk_io / 50)
    if is_ct:
        est_duration *= 0.5

    # Disruption factor
    disruption = 1.0
    if is_ct and not guest.get('mount_points', {}).get('has_shared_mount'):
        disruption = 1.5
    if mem_gb > 32:
        disruption *= 1.3

    cost = est_duration * disruption
    ratio = benefit / max(cost, 0.1)

    return {
        "ratio": round(ratio, 2),
        "benefit_score": round(benefit, 1),
        "cost_score": round(cost, 1),
        "est_duration_minutes": round(est_duration, 1),
        "viable": ratio >= 1.0,
    }


# ---------------------------------------------------------------------------
# Main recommendation engine
# ---------------------------------------------------------------------------


def generate_recommendations(nodes: Dict[str, Any], guests: Dict[str, Any], cpu_threshold: float = 60.0, mem_threshold: float = 70.0, iowait_threshold: float = 30.0, maintenance_nodes: Optional[Set[str]] = None, initial_pending_guests: Optional[Dict[str, List[Dict[str, Any]]]] = None) -> Dict[str, Any]:
    """
    Generate intelligent migration recommendations using pure score-based analysis.

    Returns a dict with:
    - recommendations: List of recommendation dicts
    - skipped_guests: List of evaluated-but-skipped guests with reasons
    - summary: Cluster health summary and recommendation digest

    Pure score-based approach:
    - Calculates suitability score for each guest on its current node
    - Calculates suitability score for each guest on all potential target nodes
    - Recommends migration if score improvement is significant (>min_score_improvement points, default 15)
    - No arbitrary thresholds - uses penalty-based scoring system

    Scoring factors (lower score = better):
    - Current load (CPU, Memory, IOWait) - weighted 50% current, 30% 24h, 20% 7d
    - Predicted load after migration
    - Historical trends (rising/falling)
    - Load spikes and sustained high load
    - Storage compatibility
    - Anti-affinity rules
    - Maintenance mode (priority evacuation)

    Thresholds are only used internally by calculate_target_node_score for reference
    """
    if maintenance_nodes is None:
        maintenance_nodes = set()

    recommendations = []
    skipped_guests = []
    pending_target_guests = dict(initial_pending_guests) if initial_pending_guests else {}

    # Get Proxmox client for storage compatibility checks
    proxmox = None
    storage_cache = {}
    try:
        config = load_config()
        try:
            proxmox = get_proxmox_client(config)
        except ValueError:
            pass  # proxmox remains None, storage compatibility checks will be skipped

        if proxmox:
            # Build storage cache once for all compatibility checks (major performance boost!)
            print(f"Building storage cache for {len(nodes)} nodes...", file=sys.stderr)
            storage_cache = build_storage_cache(nodes, proxmox)
            print(f"\u2713 Storage cache built for {len(storage_cache)} nodes", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Could not initialize Proxmox client for storage checks: {e}", file=sys.stderr)

    # Load penalty configuration
    penalty_cfg = load_penalty_config()

    # Minimum score improvement required to recommend migration (in points)
    MIN_SCORE_IMPROVEMENT = penalty_cfg.get("min_score_improvement", 15)

    # Maintenance nodes get priority evacuation regardless of score
    MAINTENANCE_SCORE_BOOST = penalty_cfg.get("maintenance_score_boost", 100)  # Extra improvement to prioritize evacuation

    # Phase 4a: Cluster convergence check - suppress if all nodes are balanced
    convergence_threshold = penalty_cfg.get("cluster_convergence_threshold", 8.0)
    convergence_message = _check_cluster_convergence(nodes, penalty_cfg, cpu_threshold, mem_threshold, convergence_threshold)

    # Pre-scan for IOWait-stressed nodes (needed to decide if convergence should be overridden)
    iowait_stressed_nodes = set()
    IOWAIT_SCORE_BOOST = penalty_cfg.get("iowait_score_boost", 30)
    for _nname, _ndata in nodes.items():
        if _ndata.get("status") != "online" or _nname in maintenance_nodes:
            continue
        _nmetrics = _ndata.get("metrics", {})
        _current_iow = _nmetrics.get("current_iowait", 0)
        _avg_iow = _nmetrics.get("avg_iowait", 0) if _nmetrics.get("has_historical") else _current_iow
        # Require both current AND average to be elevated (avoids reacting to transient spikes)
        if _current_iow > iowait_threshold and _avg_iow > (iowait_threshold * 0.7):
            iowait_stressed_nodes.add(_nname)
            print(f"IOWait trigger: {_nname} iowait={_current_iow:.1f}% (avg={_avg_iow:.1f}%) > threshold={iowait_threshold}%", file=sys.stderr)

    # Only suppress if no maintenance nodes AND no IOWait-stressed nodes need relief
    if convergence_message and not maintenance_nodes and not iowait_stressed_nodes:
        print(f"Cluster convergence: {convergence_message}", file=sys.stderr)
        summary = _build_summary([], [], nodes, penalty_cfg)
        summary["convergence_message"] = convergence_message
        return {
            "recommendations": [],
            "skipped_guests": [],
            "summary": summary,
            "conflicts": [],
            "capacity_advisories": [],
            "forecasts": [],
            "execution_plan": {},
        }

    # Phase 4d: Load score history for seasonal baseline (once, outside loop)
    seasonal_cfg = penalty_cfg.get("seasonal_baseline", {})
    seasonal_enabled = seasonal_cfg.get("enabled", False)
    sigma_threshold = seasonal_cfg.get("sigma_threshold", 2.0)
    score_history_data = None
    seasonal_skip_nodes = set()  # Cache per-node seasonal baseline decisions

    if seasonal_enabled:
        try:
            if os.path.exists(SCORE_HISTORY_FILE):
                with open(SCORE_HISTORY_FILE, 'r') as f:
                    score_history_data = json.load(f)
                if not isinstance(score_history_data, list) or len(score_history_data) < 5:
                    score_history_data = None
        except Exception as e:
            print(f"Warning: Could not load score history for seasonal baseline: {e}", file=sys.stderr)

    # Step 1: Calculate current score for each guest on its current node
    # Step 2: Calculate potential scores on all other nodes
    # Step 3: Recommend migration if score improvement is significant

    # Create list of all migration candidates sorted by potential benefit
    migration_candidates = []

    for vmid_key, guest in guests.items():
        try:
            src_node_name = guest.get("node")
            if not src_node_name or src_node_name not in nodes:
                continue

            src_node = nodes[src_node_name]
            if src_node.get("status") != "online":
                continue

            guest_name = guest.get("name", str(vmid_key))
            guest_type = guest.get("type", "VM")

            # Skip guests with ignore tag (unless on maintenance node)
            if guest.get("tags", {}).get("has_ignore", False) and src_node_name not in maintenance_nodes:
                skipped_guests.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest_name, "type": guest_type, "node": src_node_name,
                    "reason": "has_ignore_tag",
                    "detail": "Guest has the 'proxbalance_ignore' tag and will not be considered for migration."
                })
                continue

            # Skip HA-managed guests (unless on maintenance node)
            if guest.get("ha_managed", False) and src_node_name not in maintenance_nodes:
                skipped_guests.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest_name, "type": guest_type, "node": src_node_name,
                    "reason": "ha_managed",
                    "detail": "Guest is HA-managed. Proxmox HA controls its placement."
                })
                continue

            # Skip stopped guests (unless on maintenance node)
            if guest.get("status") != "running" and src_node_name not in maintenance_nodes:
                skipped_guests.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest_name, "type": guest_type, "node": src_node_name,
                    "reason": "stopped",
                    "detail": f"Guest is not running (status: {guest.get('status', 'unknown')})."
                })
                continue

            # Skip guests with passthrough disks (hardware-bound, cannot migrate)
            local_disk_info = guest.get("local_disks", {})
            if local_disk_info.get("is_pinned", False):
                # Passthrough disks cannot be migrated even for maintenance
                skipped_guests.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest_name, "type": guest_type, "node": src_node_name,
                    "reason": "passthrough_disk",
                    "detail": "Guest has passthrough/local disk hardware that prevents migration."
                })
                continue

            # Check for bind mounts on containers
            has_bind_mount = False
            bind_mount_warning = None
            if guest.get("type") == "CT":
                mount_info = guest.get("mount_points", {})

                # Only skip if container has UNSHARED bind mounts
                # Shared bind mounts (shared=1) can be migrated if path exists on target
                if mount_info.get("has_unshared_bind_mount", False):
                    has_bind_mount = True
                    mount_points = mount_info.get("mount_points", [])
                    unshared_bind_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and not mp.get("is_shared", False)]
                    bind_paths = [mp.get("source", "") for mp in unshared_bind_mounts]
                    bind_mount_warning = f"Container has {len(unshared_bind_mounts)} unshared bind mount(s): {', '.join(bind_paths[:2])}{'...' if len(bind_paths) > 2 else ''}. Migration requires --restart --force and manual path verification on target node."

                    # Skip CTs with unshared bind mounts (unless on maintenance node where evacuation is priority)
                    if src_node_name not in maintenance_nodes:
                        skipped_guests.append({
                            "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                            "name": guest_name, "type": guest_type, "node": src_node_name,
                            "reason": "unshared_bind_mount",
                            "detail": bind_mount_warning
                        })
                        continue

                # For shared bind mounts, add informational note but allow migration
                elif mount_info.get("has_shared_mount", False):
                    mount_points = mount_info.get("mount_points", [])
                    shared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and mp.get("is_shared", False)]
                    if shared_mounts:
                        shared_paths = [mp.get("source", "") for mp in shared_mounts]
                        bind_mount_warning = f"Container has {len(shared_mounts)} shared bind mount(s): {', '.join(shared_paths[:2])}{'...' if len(shared_paths) > 2 else ''}. Ensure paths exist on target node."

            # Phase 4d: Seasonal baseline — skip if source node load is within normal for this time
            if seasonal_enabled and score_history_data and src_node_name not in maintenance_nodes:
                if src_node_name not in seasonal_skip_nodes:
                    current_hour = datetime.now(timezone.utc).hour
                    baseline = get_node_seasonal_baseline(score_history_data, src_node_name, current_hour)
                    if baseline and baseline.get("data_points", 0) >= 5:
                        src_cpu = src_node.get("cpu_percent", 0)
                        baseline_upper = baseline["avg_cpu"] + (sigma_threshold * baseline["std_cpu"])
                        if src_cpu <= baseline_upper and src_cpu <= cpu_threshold:
                            seasonal_skip_nodes.add(src_node_name)

                if src_node_name in seasonal_skip_nodes:
                    skipped_guests.append({
                        "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                        "name": guest_name, "type": guest_type, "node": src_node_name,
                        "reason": "seasonal_baseline",
                        "detail": f"Source node {src_node_name} load is within seasonal baseline for current hour."
                    })
                    continue

            # Load guest behavioral profile for profile-aware scoring (Phase 3c)
            guest_profile = get_guest_profile(vmid_key)

            # Calculate current score (how well current node suits this guest)
            current_score, src_details = calculate_target_node_score(src_node, guest, {}, cpu_threshold, mem_threshold, penalty_config=penalty_cfg, return_details=True, guest_profile=guest_profile)

            # For maintenance nodes, artificially inflate current score to prioritize evacuation
            if src_node_name in maintenance_nodes:
                current_score += MAINTENANCE_SCORE_BOOST

            # For IOWait-stressed nodes, boost score to help pass min_score_improvement gate
            if src_node_name in iowait_stressed_nodes:
                current_score += IOWAIT_SCORE_BOOST

            # Find best alternative target
            best_target = None
            best_target_score = 999999
            best_target_details = None
            skip_reasons_per_target = []

            for tgt_name, tgt_node in nodes.items():
                try:
                    # Skip same node, offline nodes, and maintenance nodes
                    if tgt_name == src_node_name or tgt_node.get("status") != "online" or tgt_name in maintenance_nodes:
                        continue

                    # Check for anti-affinity conflicts
                    conflict = False
                    if guest.get("tags", {}).get("exclude_groups", []):
                        for other_vmid in tgt_node.get("guests", []):
                            other_key = str(other_vmid) if str(other_vmid) in guests else other_vmid
                            if other_key not in guests:
                                continue
                            other = guests[other_key]
                            for excl_group in guest["tags"]["exclude_groups"]:
                                if excl_group in other.get("tags", {}).get("all_tags", []):
                                    conflict = True
                                    break
                            if conflict:
                                break

                        # Check conflicts with pending migrations
                        if not conflict and tgt_name in pending_target_guests:
                            for pending_guest in pending_target_guests[tgt_name]:
                                for excl_group in guest["tags"]["exclude_groups"]:
                                    if excl_group in pending_guest.get("tags", {}).get("all_tags", []):
                                        conflict = True
                                        break
                                if conflict:
                                    break

                    if conflict:
                        skip_reasons_per_target.append(f"{tgt_name}: anti-affinity conflict")
                        continue

                    # Hard memory capacity gate: skip targets that can't physically
                    # fit this guest's allocated memory.
                    # Use actual node memory usage (mem_percent) rather than summing
                    # guest committed memory (mem_max_gb). This correctly handles
                    # environments with memory ballooning / overcommitment where
                    # VMs are allocated more RAM than they actually use.
                    guest_mem_max_gb = guest.get("mem_max_gb", guest.get("mem_used_gb", 0))
                    if guest_mem_max_gb > 0:
                        target_total_mem_gb = tgt_node.get("total_mem_gb", 1)
                        # Use actual memory usage as reported by Proxmox
                        target_used_mem_gb = (tgt_node.get("mem_percent", 0) / 100.0) * target_total_mem_gb
                        # Also account for guests already pending migration to this target
                        # (not yet reflected in actual node memory usage)
                        pending_mem_gb = 0.0
                        if tgt_name in pending_target_guests:
                            pending_mem_gb = sum(
                                pg.get("mem_max_gb", 0)
                                for pg in pending_target_guests[tgt_name]
                            )
                        # Leave 5% headroom for host OS overhead
                        if (target_used_mem_gb + pending_mem_gb + guest_mem_max_gb) > (target_total_mem_gb * 0.95):
                            skip_reasons_per_target.append(f"{tgt_name}: insufficient memory capacity ({target_used_mem_gb:.1f}+{guest_mem_max_gb:.1f} > {target_total_mem_gb:.1f}GB)")
                            continue

                    # Check storage compatibility (skip target if storage is incompatible)
                    if proxmox and not check_storage_compatibility(guest, src_node_name, tgt_name, proxmox, storage_cache):
                        skip_reasons_per_target.append(f"{tgt_name}: storage incompatible")
                        continue

                    # Calculate target suitability score with details
                    score, tgt_details = calculate_target_node_score(tgt_node, guest, pending_target_guests, cpu_threshold, mem_threshold, penalty_config=penalty_cfg, return_details=True, guest_profile=guest_profile)

                    if score < best_target_score:
                        best_target_score = score
                        best_target = tgt_name
                        best_target_details = tgt_details

                except Exception as e:
                    print(f"Error evaluating target {tgt_name} for guest {vmid_key}: {str(e)}", file=sys.stderr)
                    traceback.print_exc()
                    continue

            # Calculate score improvement
            score_improvement = current_score - best_target_score if best_target else 0

            # Only recommend if improvement is significant
            if best_target and score_improvement >= MIN_SCORE_IMPROVEMENT:
                migration_candidates.append({
                    "vmid": vmid_key,
                    "guest": guest,
                    "source_node": src_node_name,
                    "target_node": best_target,
                    "current_score": current_score,
                    "target_score": best_target_score,
                    "improvement": score_improvement,
                    "is_maintenance": src_node_name in maintenance_nodes,
                    "is_iowait_triggered": src_node_name in iowait_stressed_nodes,
                    "source_details": src_details,
                    "target_details": best_target_details,
                })

                # Track pending migration IMMEDIATELY so next guest evaluation considers it
                if best_target not in pending_target_guests:
                    pending_target_guests[best_target] = []
                pending_target_guests[best_target].append(guest)

            elif best_target:
                # Tracked as skipped — insufficient improvement
                skipped_guests.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest_name, "type": guest_type, "node": src_node_name,
                    "reason": "insufficient_improvement",
                    "detail": f"Best target ({best_target}) would improve score by only {score_improvement:.1f} points (minimum required: {MIN_SCORE_IMPROVEMENT}).",
                    "best_target": best_target,
                    "score_improvement": round(score_improvement, 1),
                    "current_score": round(current_score, 1),
                    "best_target_score": round(best_target_score, 1),
                })
            elif not best_target and skip_reasons_per_target:
                # All targets disqualified
                skipped_guests.append({
                    "vmid": int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key,
                    "name": guest_name, "type": guest_type, "node": src_node_name,
                    "reason": "no_suitable_target",
                    "detail": f"No suitable target node found. Reasons: {'; '.join(skip_reasons_per_target[:3])}{'...' if len(skip_reasons_per_target) > 3 else ''}",
                })

        except Exception as e:
            print(f"Error analyzing guest {vmid_key}: {str(e)}", file=sys.stderr)
            traceback.print_exc()
            continue

    # Sort candidates by improvement (best first), prioritizing maintenance evacuations,
    # then IOWait-triggered migrations, then normal recommendations
    migration_candidates.sort(key=lambda x: (
        not x["is_maintenance"],
        not x.get("is_iowait_triggered", False),
        -x["improvement"],
    ))

    # Build final recommendations from candidates
    for candidate in migration_candidates:
        try:
            vmid_key = candidate["vmid"]
            guest = candidate["guest"]
            src_node_name = candidate["source_node"]
            best_target = candidate["target_node"]
            best_score = candidate["target_score"]
            score_improvement = candidate["improvement"]
            src_details = candidate.get("source_details", {})
            tgt_details = candidate.get("target_details", {})

            cmd_type = "qm" if guest.get("type") == "VM" else "pct"
            cmd_flag = "--online" if guest.get("type") == "VM" else "--restart"
            vmid_int = int(vmid_key) if isinstance(vmid_key, str) else vmid_key

            # Build structured reason
            is_iowait_triggered = candidate.get("is_iowait_triggered", False)
            structured_reason = _build_structured_reason(
                guest, nodes[src_node_name], nodes[best_target],
                src_details, tgt_details, candidate["is_maintenance"], penalty_cfg,
                is_iowait_triggered=is_iowait_triggered,
            )

            # Keep backward-compatible reason string from structured data
            reason = structured_reason["summary"] if structured_reason.get("summary") else structured_reason.get("primary_label", "Score improvement")

            # Convert raw score to suitability rating (0-100, higher is better)
            # Raw scores are penalties (lower = better), so invert them
            # Cap at 100 for the conversion formula
            suitability_rating = round(max(0, 100 - min(best_score, 100)), 1)

            # Calculate multi-factor confidence score
            confidence = _calculate_confidence(score_improvement, tgt_details, guest, penalty_cfg)

            # Calculate migration risk score
            cluster_health_for_risk = 100 - (sum(
                calculate_node_health_score(n, n.get("metrics", {}), penalty_config=penalty_cfg)
                for n in nodes.values() if n.get("status") == "online"
            ) / max(1, sum(1 for n in nodes.values() if n.get("status") == "online")))
            risk_info = calculate_migration_risk(
                guest, nodes[src_node_name], nodes[best_target],
                cluster_health=max(0, cluster_health_for_risk)
            )

            # Check for mount points and prepare warnings/metadata
            bind_mount_warning = None
            mount_point_info = {}
            if guest.get("type") == "CT":
                mount_info = guest.get("mount_points", {})
                if mount_info.get("has_mount_points", False):
                    mount_points = mount_info.get("mount_points", [])

                    # Add mount point metadata for UI
                    mount_point_info = {
                        "has_mount_points": True,
                        "mount_count": mount_info.get("mount_count", 0),
                        "has_shared_mount": mount_info.get("has_shared_mount", False),
                        "has_unshared_bind_mount": mount_info.get("has_unshared_bind_mount", False),
                        "mount_paths": [mp.get("source", "") for mp in mount_points]
                    }

                    # Generate appropriate warnings
                    if mount_info.get("has_unshared_bind_mount", False):
                        # Unshared bind mounts (only appears for maintenance evacuations)
                        unshared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and not mp.get("is_shared", False)]
                        bind_paths = [mp.get("source", "") for mp in unshared_mounts]
                        bind_mount_warning = f"\u26a0\ufe0f Container has {len(unshared_mounts)} unshared bind mount(s): {', '.join(bind_paths[:2])}{'...' if len(bind_paths) > 2 else ''}. Migration requires --restart --force and manual path verification on target node."
                    elif mount_info.get("has_shared_mount", False):
                        # Shared bind mounts (informational)
                        shared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and mp.get("is_shared", False)]
                        if shared_mounts:
                            shared_paths = [mp.get("source", "") for mp in shared_mounts]
                            bind_mount_warning = f"\u2139\ufe0f Container has {len(shared_mounts)} shared bind mount(s): {', '.join(shared_paths[:2])}{'...' if len(shared_paths) > 2 else ''}. Ensure these paths exist on {best_target}."

            # Build trend evidence for transparency
            trend_evidence = _build_trend_evidence(
                src_node_name, best_target, vmid_key,
                src_details, tgt_details, penalty_cfg,
                cpu_threshold, mem_threshold,
            )

            # Build human-readable decision explanation
            decision_explanation = _build_decision_explanation(
                guest, src_node_name, best_target, trend_evidence, score_improvement,
            )

            recommendation = {
                "vmid": vmid_int,
                "name": guest.get("name", "unknown"),
                "type": guest.get("type", "unknown"),
                "source_node": src_node_name,
                "target_node": best_target,
                "target_node_score": round(best_score, 2),  # Raw penalty score (internal use)
                "suitability_rating": suitability_rating,  # 0-100, higher is better (user-facing)
                "score_improvement": round(score_improvement, 2),  # How much better
                "reason": reason,  # Backward-compatible string (now the full summary sentence)
                "structured_reason": structured_reason,  # New: detailed structured reason
                "score_details": {
                    "source": src_details,
                    "target": tgt_details,
                },
                "mem_gb": guest.get("mem_max_gb", 0),
                "command": "{} migrate {} {} {}".format(cmd_type, vmid_int, best_target, cmd_flag),
                "confidence_score": confidence,  # New: multi-factor confidence
                "risk_score": risk_info["risk_score"],  # 0-100, lower is safer
                "risk_level": risk_info["risk_level"],  # low/moderate/high/very_high
                "risk_factors": risk_info["risk_factors"],  # Detailed breakdown
                "trend_evidence": trend_evidence,  # Trend-based decision evidence
                "decision_explanation": decision_explanation,  # Human-readable explanation
            }

            # Add mount point metadata and warnings if present
            if mount_point_info:
                recommendation["mount_point_info"] = mount_point_info
            if bind_mount_warning:
                recommendation["bind_mount_warning"] = bind_mount_warning

            # Phase 4b: Calculate cost-benefit ratio
            recommendation["cost_benefit"] = _calculate_cost_benefit(recommendation, guest)

            recommendations.append(recommendation)

            # Note: pending_target_guests was already updated when the candidate was added

        except Exception as e:
            print(f"Error creating recommendation for {vmid_key}: {str(e)}", file=sys.stderr)
            traceback.print_exc()
            continue

    # Distribution Balancing: Add recommendations for small guests to balance node guest counts
    try:
        config = load_config()
        dist_config = config.get('distribution_balancing', {})

        if dist_config.get('enabled', False):
            print("Distribution balancing is enabled, finding candidates...", file=sys.stderr)

            guest_count_threshold = dist_config.get('guest_count_threshold', 2)
            max_cpu_cores = dist_config.get('max_cpu_cores', 2)
            max_memory_gb = dist_config.get('max_memory_gb', 4)

            distribution_candidates = find_distribution_candidates(
                nodes=nodes,
                guests=guests,
                guest_count_threshold=guest_count_threshold,
                max_cpu_cores=max_cpu_cores,
                max_memory_gb=max_memory_gb
            )

            print(f"Found {len(distribution_candidates)} distribution balancing candidates", file=sys.stderr)

            # Convert distribution candidates to recommendation format
            for candidate in distribution_candidates:
                guest_id = candidate['guest_id']
                guest = guests.get(guest_id)

                if not guest:
                    continue

                # Check if this guest already has a performance-based recommendation
                already_recommended = any(
                    rec.get('vmid') == guest_id for rec in recommendations
                )

                if already_recommended:
                    print(f"Skipping distribution recommendation for {guest_id} - already has performance recommendation", file=sys.stderr)
                    continue

                # Check storage compatibility
                if proxmox and storage_cache:
                    if not check_storage_compatibility(guest, candidate['source_node'], candidate['target_node'], proxmox, storage_cache):
                        print(f"Skipping {guest_id}: storage incompatible with {candidate['target_node']}", file=sys.stderr)
                        continue

                # Create recommendation
                vmid_int = int(guest_id) if isinstance(guest_id, str) and guest_id.isdigit() else guest_id
                guest_type = guest.get('type', 'qemu')
                cmd_type = 'pct' if guest_type == 'lxc' else 'qm'
                cmd_flag = '--restart' if guest_type == 'lxc' else '--online'

                recommendation = {
                    "vmid": guest_id,
                    "name": candidate['guest_name'],
                    "type": candidate['guest_type'],
                    "current_node": candidate['source_node'],
                    "target_node": candidate['target_node'],
                    "target_node_score": 50,  # Neutral score for distribution balancing
                    "suitability_rating": 50,  # Neutral suitability
                    "score_improvement": 10,  # Modest improvement score
                    "reason": candidate['reason'],
                    "mem_gb": candidate['memory_gb'],
                    "command": f"{cmd_type} migrate {vmid_int} {candidate['target_node']} {cmd_flag}",
                    "confidence_score": 60,  # Moderate confidence for distribution moves
                    "distribution_balancing": True  # Flag to identify these recommendations
                }

                recommendations.append(recommendation)
                print(f"Added distribution recommendation: {candidate['guest_name']} ({guest_id}) from {candidate['source_node']} to {candidate['target_node']}", file=sys.stderr)

    except Exception as e:
        print(f"Error in distribution balancing: {str(e)}", file=sys.stderr)
        traceback.print_exc()

    # Affinity Rules: Generate companion migrations for affinity_* groups
    # When a VM with an affinity_* tag is recommended to move, all other VMs
    # sharing the same affinity_* tag should move to the same target node.
    try:
        config = load_config()
        auto_config = config.get('automated_migrations', {})
        rules = auto_config.get('rules', {})
        respect_affinity = rules.get('respect_affinity_rules', True)

        if respect_affinity:
            # Build a map of affinity_group -> list of recommended vmids with their target
            affinity_moves = {}  # {affinity_group: [(vmid, target_node, rec), ...]}
            for rec in recommendations:
                rec_vmid = str(rec.get('vmid'))
                guest = guests.get(rec_vmid)
                if not guest:
                    continue
                affinity_groups = guest.get('tags', {}).get('affinity_groups', [])
                for ag in affinity_groups:
                    if ag not in affinity_moves:
                        affinity_moves[ag] = []
                    affinity_moves[ag].append((rec_vmid, rec.get('target_node'), rec))

            if affinity_moves:
                print(f"Checking affinity groups: {list(affinity_moves.keys())}", file=sys.stderr)

            # For each affinity group with a recommended move, find group members not yet recommended
            already_recommended = {str(r.get('vmid')) for r in recommendations}
            companion_recs = []

            for ag, moves in affinity_moves.items():
                # Determine the target node for this group (use the target of the highest-improvement move)
                best_move = max(moves, key=lambda m: m[2].get('score_improvement', 0))
                group_target = best_move[1]

                # Find all guests with this affinity group
                for vmid_key, guest in guests.items():
                    if vmid_key in already_recommended:
                        continue
                    guest_affinity = guest.get('tags', {}).get('affinity_groups', [])
                    if ag not in guest_affinity:
                        continue
                    # Guest is in this affinity group but not yet recommended
                    src_node = guest.get('node')
                    if src_node == group_target:
                        continue  # Already on the target node

                    # Skip guests that can't be migrated (same filters as main loop)
                    if guest.get('tags', {}).get('has_ignore', False) and src_node not in maintenance_nodes:
                        continue
                    if guest.get('ha_managed', False) and src_node not in maintenance_nodes:
                        continue
                    if guest.get('status') != 'running' and src_node not in maintenance_nodes:
                        continue
                    if guest.get('local_disks', {}).get('is_pinned', False):
                        continue
                    if guest.get('type') == 'CT':
                        mount_info = guest.get('mount_points', {})
                        if mount_info.get('has_unshared_bind_mount', False) and src_node not in maintenance_nodes:
                            continue

                    # Check storage compatibility
                    if proxmox and storage_cache:
                        if not check_storage_compatibility(guest, src_node, group_target, proxmox, storage_cache):
                            print(f"Affinity companion {vmid_key}: storage incompatible with {group_target}", file=sys.stderr)
                            continue

                    # Check anti-affinity conflicts on target
                    conflict = False
                    if guest.get('tags', {}).get('exclude_groups', []):
                        for other_vmid in nodes.get(group_target, {}).get('guests', []):
                            other_key = str(other_vmid) if str(other_vmid) in guests else other_vmid
                            if other_key not in guests or other_key == vmid_key:
                                continue
                            other = guests[other_key]
                            for excl_group in guest['tags']['exclude_groups']:
                                if excl_group in other.get('tags', {}).get('all_tags', []):
                                    conflict = True
                                    break
                            if conflict:
                                break
                    if conflict:
                        print(f"Affinity companion {vmid_key}: anti-affinity conflict on {group_target}", file=sys.stderr)
                        continue

                    # Generate companion recommendation
                    vmid_int = int(vmid_key) if isinstance(vmid_key, str) and vmid_key.isdigit() else vmid_key
                    cmd_type = "qm" if guest.get("type") == "VM" else "pct"
                    cmd_flag = "--online" if guest.get("type") == "VM" else "--restart"

                    # Calculate a basic target score for the companion
                    tgt_node = nodes.get(group_target)
                    companion_target_score = 50  # Default neutral score
                    if tgt_node:
                        companion_target_score = calculate_target_node_score(
                            tgt_node, guest, pending_target_guests, cpu_threshold, mem_threshold
                        )

                    suitability_rating = round(max(0, 100 - min(companion_target_score, 100)), 1)

                    companion_rec = {
                        "vmid": vmid_int,
                        "name": guest.get("name", "unknown"),
                        "type": guest.get("type", "unknown"),
                        "source_node": src_node,
                        "target_node": group_target,
                        "target_node_score": round(companion_target_score, 2),
                        "suitability_rating": suitability_rating,
                        "score_improvement": best_move[2].get('score_improvement', 15),
                        "reason": f"Affinity group '{ag}' - follows {best_move[2].get('name', 'unknown')} (VM {best_move[0]})",
                        "mem_gb": guest.get("mem_max_gb", 0),
                        "command": f"{cmd_type} migrate {vmid_int} {group_target} {cmd_flag}",
                        "confidence_score": best_move[2].get('confidence_score', 50),
                        "affinity_group": ag,
                        "affinity_leader_vmid": int(best_move[0]) if isinstance(best_move[0], str) and best_move[0].isdigit() else best_move[0],
                    }

                    # Add mount point metadata if CT
                    if guest.get("type") == "CT":
                        mount_info = guest.get("mount_points", {})
                        if mount_info.get("has_mount_points", False):
                            companion_rec["mount_point_info"] = {
                                "has_mount_points": True,
                                "mount_count": mount_info.get("mount_count", 0),
                                "has_shared_mount": mount_info.get("has_shared_mount", False),
                                "has_unshared_bind_mount": mount_info.get("has_unshared_bind_mount", False),
                                "mount_paths": [mp.get("source", "") for mp in mount_info.get("mount_points", [])]
                            }

                    companion_recs.append(companion_rec)
                    already_recommended.add(vmid_key)

                    # Track pending migration
                    if group_target not in pending_target_guests:
                        pending_target_guests[group_target] = []
                    pending_target_guests[group_target].append(guest)

                    print(f"Added affinity companion: {guest.get('name')} ({vmid_key}) -> {group_target} (group: {ag})", file=sys.stderr)

            # Also tag the original recommendations that triggered affinity companions
            if companion_recs:
                companion_vmids = {str(r['vmid']) for r in companion_recs}
                for rec in recommendations:
                    rec_vmid = str(rec.get('vmid'))
                    guest = guests.get(rec_vmid)
                    if not guest:
                        continue
                    affinity_groups = guest.get('tags', {}).get('affinity_groups', [])
                    for ag in affinity_groups:
                        companions_for_group = [r for r in companion_recs if r.get('affinity_group') == ag]
                        if companions_for_group:
                            rec['affinity_group'] = ag
                            rec['affinity_companions'] = [r['vmid'] for r in companions_for_group]
                            break

                recommendations.extend(companion_recs)
                print(f"Added {len(companion_recs)} affinity companion migration(s)", file=sys.stderr)

    except Exception as e:
        print(f"Error in affinity rules processing: {str(e)}", file=sys.stderr)
        traceback.print_exc()

    # G1: Post-generation conflict detection
    conflicts = _detect_migration_conflicts(recommendations, nodes, guests, cpu_threshold, mem_threshold, penalty_cfg)

    # F3: Capacity planning advisories
    advisories = _generate_capacity_advisories(nodes, recommendations, penalty_cfg)

    # Build recommendation summary / digest
    summary = _build_summary(recommendations, skipped_guests, nodes, penalty_cfg)

    # Save score history snapshot
    _save_score_snapshot(nodes, recommendations, penalty_cfg)

    # F1: Proactive forecast recommendations based on trend projection
    forecasts = []
    try:
        score_history = []
        if os.path.exists(SCORE_HISTORY_FILE):
            with open(SCORE_HISTORY_FILE, 'r') as f:
                score_history = json.load(f)
            if not isinstance(score_history, list):
                score_history = []
        forecasts = _generate_forecast_recommendations(nodes, score_history, cpu_threshold, mem_threshold)
        if forecasts:
            print(f"Generated {len(forecasts)} forecast recommendation(s)", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to generate forecast recommendations: {e}", file=sys.stderr)

    # G2: Compute execution order and dependencies for migration plan
    execution_plan = {}
    try:
        execution_plan = _compute_execution_order(recommendations, nodes)
        if execution_plan.get("total_steps", 0) > 0:
            print(f"Computed execution plan: {execution_plan['total_steps']} steps, "
                  f"{len(execution_plan.get('parallel_groups', []))} parallel groups, "
                  f"can_parallelize={execution_plan.get('can_parallelize', False)}",
                  file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to compute execution order: {e}", file=sys.stderr)

    return {
        "recommendations": recommendations,
        "skipped_guests": skipped_guests,
        "summary": summary,
        "conflicts": conflicts,
        "capacity_advisories": advisories,
        "forecasts": forecasts,
        "execution_plan": execution_plan,
    }


# ---------------------------------------------------------------------------
# Trend evidence and decision explanation helpers
# ---------------------------------------------------------------------------

def _build_trend_evidence(
    src_node_name: str,
    tgt_node_name: str,
    vmid_key: str,
    src_details: Dict,
    tgt_details: Dict,
    penalty_cfg: Dict,
    cpu_threshold: float,
    mem_threshold: float,
) -> Dict[str, Any]:
    """Build the trend_evidence object for a recommendation.

    Gracefully returns minimal evidence if the metrics store has no data.
    """
    ta = _get_trend_module()
    if not ta:
        return {"available": False, "reason": "Trend analysis module not available"}

    try:
        lookback = penalty_cfg.get("_lookback_hours", 168)  # default 7 days

        src_trend = ta.analyze_node_trends(src_node_name, lookback, cpu_threshold, mem_threshold)
        tgt_trend = ta.analyze_node_trends(tgt_node_name, lookback, cpu_threshold, mem_threshold)
        guest_trend = ta.analyze_guest_trends(str(vmid_key), lookback)

        # Check data quality
        src_quality = src_trend.get("data_quality", {})
        tgt_quality = tgt_trend.get("data_quality", {})

        if src_quality.get("total_samples", 0) < 2 and tgt_quality.get("total_samples", 0) < 2:
            return {
                "available": False,
                "reason": "Insufficient historical data. Trends will be available after a few collection cycles.",
            }

        # Build decision factors list
        decision_factors = []

        # Source node factors
        src_cpu_rate = src_trend.get("cpu", {}).get("rate_per_day", 0)
        src_mem_rate = src_trend.get("memory", {}).get("rate_per_day", 0)

        if src_cpu_rate > 0.5:
            decision_factors.append({
                "factor": f"Source node CPU trending up {src_trend['cpu'].get('rate_display', '')} over {lookback // 24}d",
                "weight": "high" if src_cpu_rate > 2.0 else "medium",
                "type": "problem",
            })
        if src_mem_rate > 0.5:
            decision_factors.append({
                "factor": f"Source node memory trending up {src_trend['memory'].get('rate_display', '')} over {lookback // 24}d",
                "weight": "high" if src_mem_rate > 2.0 else "medium",
                "type": "problem",
            })
        if src_trend.get("cpu_above_baseline"):
            decision_factors.append({
                "factor": f"Source node CPU is above seasonal baseline ({src_trend.get('cpu_baseline_sigma', 0):.1f}σ)",
                "weight": "medium",
                "type": "problem",
            })

        # Target node factors
        tgt_stab = tgt_trend.get("overall_stability", 50)
        tgt_cpu_rate = tgt_trend.get("cpu", {}).get("rate_per_day", 0)

        if tgt_stab >= 70:
            decision_factors.append({
                "factor": f"Target node is stable (score {tgt_stab}/100), predictable performance",
                "weight": "high",
                "type": "positive",
            })
        if tgt_cpu_rate < -0.5:
            decision_factors.append({
                "factor": f"Target node CPU trending down {tgt_trend['cpu'].get('rate_display', '')}",
                "weight": "medium",
                "type": "positive",
            })
        elif tgt_cpu_rate > 1.0:
            decision_factors.append({
                "factor": f"Target node CPU also trending up {tgt_trend['cpu'].get('rate_display', '')}",
                "weight": "medium",
                "type": "concern",
            })

        # Guest factors
        guest_behavior = guest_trend.get("behavior", "unknown")
        guest_cpu_rate = guest_trend.get("cpu", {}).get("rate_per_day", 0)
        guest_migrations = guest_trend.get("migration_count", 0)

        if guest_behavior == "growing":
            decision_factors.append({
                "factor": f"Guest CPU growing {guest_trend['cpu'].get('rate_display', '')}, contributing to source overload",
                "weight": "high",
                "type": "problem",
            })
        elif guest_behavior == "bursty":
            decision_factors.append({
                "factor": "Guest is bursty — load spikes may self-resolve",
                "weight": "low",
                "type": "concern",
            })

        if guest_migrations > 0:
            decision_factors.append({
                "factor": f"Guest has been migrated {guest_migrations} time(s) before",
                "weight": "low",
                "type": "info",
            })

        # Data quality
        node_days = max(
            src_quality.get("coverage_days", 0),
            tgt_quality.get("coverage_days", 0),
        )
        guest_days = guest_trend.get("data_points", 0) / 12  # approx days

        return {
            "available": True,
            "source_node_trend": {
                "cpu_trend": src_trend.get("cpu", {}).get("rate_display", "0%/day"),
                "cpu_direction": src_trend.get("cpu", {}).get("direction", "unknown"),
                "mem_trend": src_trend.get("memory", {}).get("rate_display", "0%/day"),
                "mem_direction": src_trend.get("memory", {}).get("direction", "unknown"),
                "stability_score": src_trend.get("overall_stability", 50),
                "above_baseline": src_trend.get("cpu_above_baseline", False),
                "baseline_deviation_sigma": src_trend.get("cpu_baseline_sigma"),
            },
            "target_node_trend": {
                "cpu_trend": tgt_trend.get("cpu", {}).get("rate_display", "0%/day"),
                "cpu_direction": tgt_trend.get("cpu", {}).get("direction", "unknown"),
                "mem_trend": tgt_trend.get("memory", {}).get("rate_display", "0%/day"),
                "mem_direction": tgt_trend.get("memory", {}).get("direction", "unknown"),
                "stability_score": tgt_trend.get("overall_stability", 50),
                "above_baseline": tgt_trend.get("cpu_above_baseline", False),
            },
            "guest_trend": {
                "cpu_growth_rate": guest_trend.get("cpu", {}).get("rate_display", "0%/day"),
                "behavior": guest_behavior,
                "peak_hours": guest_trend.get("peak_hours", []),
                "previous_migrations": guest_migrations,
            },
            "decision_factors": decision_factors,
            "data_quality": {
                "node_history_days": round(node_days, 1),
                "guest_history_days": round(guest_days, 1),
                "confidence_note": "High data availability" if node_days >= 7 else (
                    "Moderate data" if node_days >= 2 else "Limited data — trends will improve with more collection cycles"
                ),
            },
        }

    except Exception as e:
        print(f"Warning: Failed to build trend evidence for {vmid_key}: {e}", file=sys.stderr)
        return {"available": False, "reason": f"Error computing trends: {str(e)}"}


def _build_decision_explanation(
    guest: Dict,
    src_node: str,
    tgt_node: str,
    trend_evidence: Dict,
    score_improvement: float,
) -> str:
    """Build a human-readable 1-2 sentence decision explanation."""
    if not trend_evidence.get("available"):
        name = guest.get("name", "Guest")
        return f"{name} would improve cluster balance by {score_improvement:.0f} points by moving from {src_node} to {tgt_node}."

    parts = []
    src_trend = trend_evidence.get("source_node_trend", {})
    tgt_trend = trend_evidence.get("target_node_trend", {})
    guest_info = trend_evidence.get("guest_trend", {})

    # Source description
    src_cpu_dir = src_trend.get("cpu_direction", "unknown")
    if src_cpu_dir in ("sustained_increase", "rising"):
        parts.append(f"Source node '{src_node}' CPU is trending up ({src_trend.get('cpu_trend', '')})")
    elif src_trend.get("above_baseline"):
        parts.append(f"Source node '{src_node}' is above its normal baseline")
    else:
        parts.append(f"Source node '{src_node}' has higher load than '{tgt_node}'")

    # Guest description
    behavior = guest_info.get("behavior", "")
    name = guest.get("name", "Guest")
    if behavior == "growing":
        parts.append(f"{name} is growing ({guest_info.get('cpu_growth_rate', '')})")
    elif behavior == "bursty":
        parts.append(f"{name} has bursty workload patterns")

    # Target description
    tgt_stab = tgt_trend.get("stability_score", 50)
    if tgt_stab >= 70:
        parts.append(f"Target '{tgt_node}' is stable with predictable performance")
    else:
        parts.append(f"Target '{tgt_node}' has available capacity")

    return ". ".join(parts) + f". Expected improvement: {score_improvement:.0f} points."
