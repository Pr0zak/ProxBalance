"""
ProxBalance Recommendation Engine

Generates intelligent migration recommendations using penalty-based scoring.
Evaluates guest placement across cluster nodes, considering current load,
predicted post-migration load, storage compatibility, anti-affinity rules,
maintenance mode evacuation, and distribution balancing.
"""

import sys
import json
import traceback
from typing import Dict, List

from proxbalance.scoring import (
    calculate_node_health_score,
    predict_post_migration_load,
    calculate_target_node_score,
    calculate_intelligent_thresholds,
    DEFAULT_PENALTY_CONFIG,
)
from proxbalance.config_manager import (
    load_penalty_config,
    load_config,
    get_proxmox_client,
    DISK_PREFIXES,
)


# ---------------------------------------------------------------------------
# Guest selection
# ---------------------------------------------------------------------------

def select_guests_to_migrate(node: Dict, guests: Dict, cpu_threshold: float, mem_threshold: float, overload_reason: str) -> List[str]:
    """
    Intelligently select which guests to migrate from an overloaded node
    Uses knapsack-style algorithm to minimize migrations while resolving overload
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

        # Efficiency score: impact per migration cost (higher is better)
        if overload_reason == "cpu":
            efficiency = cpu_impact / migration_cost if migration_cost > 0 else 0
        elif overload_reason == "mem":
            efficiency = mem_impact / migration_cost if migration_cost > 0 else 0
        else:
            efficiency = (cpu_impact + mem_impact) / (2 * migration_cost) if migration_cost > 0 else 0

        candidates.append({
            "vmid_key": vmid_key,
            "guest": guest,
            "cpu_impact": cpu_impact,
            "mem_impact": mem_impact,
            "migration_cost": migration_cost,
            "efficiency": efficiency
        })

    # Sort by efficiency (highest efficiency first)
    candidates.sort(key=lambda x: x["efficiency"], reverse=True)

    # Greedy selection: pick guests until we've reduced load enough
    selected = []
    cpu_reduction = 0
    mem_reduction = 0

    for candidate in candidates:
        # For maintenance mode, don't stop early - evacuate ALL guests
        if overload_reason != "maintenance":
            if overload_reason == "cpu" and cpu_reduction >= cpu_reduction_needed:
                break
            if overload_reason == "mem" and mem_reduction >= mem_reduction_needed:
                break
            if overload_reason not in ["cpu", "mem"] and (cpu_reduction >= cpu_reduction_needed and mem_reduction >= mem_reduction_needed):
                break

        selected.append(candidate["vmid_key"])
        cpu_reduction += candidate["cpu_impact"]
        mem_reduction += candidate["mem_impact"]

        # Limit to 5 migrations per node (skip limit for maintenance mode)
        if overload_reason != "maintenance" and len(selected) >= 5:
            break

    return selected


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def build_storage_cache(nodes: Dict, proxmox) -> Dict[str, set]:
    """
    Build a cache of available storage for all nodes.

    Args:
        nodes: Dictionary of nodes
        proxmox: ProxmoxAPI client

    Returns:
        Dictionary mapping node names to sets of available storage IDs
    """
    storage_cache = {}

    if not proxmox:
        return storage_cache

    for node_name in nodes:
        try:
            storage_list = proxmox.nodes(node_name).storage.get()
            available_storage = set()
            for storage in storage_list:
                if storage.get('enabled', 1) and storage.get('active', 0):
                    available_storage.add(storage.get('storage'))
            storage_cache[node_name] = available_storage
            print(f"Cached {len(available_storage)} storage volumes for node {node_name}", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not get storage for node {node_name}: {e}", file=sys.stderr)
            storage_cache[node_name] = set()

    return storage_cache


def check_storage_compatibility(guest: Dict, src_node_name: str, tgt_node_name: str, proxmox, storage_cache: Dict[str, set] = None) -> bool:
    """
    Check if target node has all storage volumes required by the guest.

    Args:
        guest: Guest dictionary with vmid and type
        src_node_name: Source node name
        tgt_node_name: Target node name
        proxmox: ProxmoxAPI client
        storage_cache: Optional pre-built cache of node storage (for performance)

    Returns:
        True if target has all required storage, False otherwise
    """
    try:
        vmid = guest.get('vmid')
        guest_type = guest.get('type', 'VM')

        # Get guest configuration to extract storage volumes
        guest_config = None
        try:
            if guest_type == 'VM':
                guest_config = proxmox.nodes(src_node_name).qemu(vmid).config.get()
            else:  # CT
                guest_config = proxmox.nodes(src_node_name).lxc(vmid).config.get()
        except Exception as e:
            print(f"Warning: Could not get config for guest {vmid}: {e}", file=sys.stderr)
            return True  # Allow migration if we can't determine storage (avoid blocking valid migrations)

        if not guest_config:
            return True

        # Extract storage volumes from config
        storage_volumes = set()
        for key, value in guest_config.items():
            # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
            if key.startswith(DISK_PREFIXES):
                # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                if isinstance(value, str) and ':' in value:
                    storage_id = value.split(':')[0]
                    storage_volumes.add(storage_id)

        if not storage_volumes:
            return True  # No storage requirements, allow migration

        # Get target node storage (use cache if available, otherwise query API)
        available_storage = set()
        if storage_cache and tgt_node_name in storage_cache:
            # Use cached storage data (much faster!)
            available_storage = storage_cache[tgt_node_name]
        else:
            # Fallback to API query if cache not available
            try:
                target_storage_list = proxmox.nodes(tgt_node_name).storage.get()
                for storage in target_storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available_storage.add(storage.get('storage'))
            except Exception as e:
                print(f"Warning: Could not get storage for node {tgt_node_name}: {e}", file=sys.stderr)
                return True  # Allow migration if we can't determine target storage

        # Check if all required storage is available on target
        missing_storage = storage_volumes - available_storage

        if missing_storage:
            print(f"Storage incompatibility: Guest {vmid} requires storage {missing_storage} not available on {tgt_node_name}", file=sys.stderr)
            return False

        return True

    except Exception as e:
        print(f"Error checking storage compatibility for guest {guest.get('vmid')}: {e}", file=sys.stderr)
        traceback.print_exc()
        return True  # Allow migration on error to avoid blocking valid migrations


# ---------------------------------------------------------------------------
# Distribution balancing helpers
# ---------------------------------------------------------------------------

def calculate_node_guest_counts(nodes: Dict, guests: Dict) -> Dict[str, int]:
    """
    Calculate the number of running guests on each node.

    Args:
        nodes: Dictionary of node data
        guests: Dictionary of guest data

    Returns:
        Dictionary mapping node names to running guest counts
    """
    guest_counts = {}

    # Initialize all nodes with 0 counts
    for node_name in nodes.keys():
        guest_counts[node_name] = 0

    # Count running guests per node
    for guest_id, guest in guests.items():
        if guest.get('status') == 'running':
            node = guest.get('node')
            if node in guest_counts:
                guest_counts[node] += 1

    return guest_counts


def find_distribution_candidates(
    nodes: Dict,
    guests: Dict,
    guest_count_threshold: int = 2,
    max_cpu_cores: int = 2,
    max_memory_gb: int = 4
) -> List[Dict]:
    """
    Find small guests on overloaded nodes that could be migrated for distribution balancing.

    Args:
        nodes: Dictionary of node data
        guests: Dictionary of guest data
        guest_count_threshold: Minimum difference in guest counts to trigger balancing
        max_cpu_cores: Maximum CPU cores for a guest to be considered (0 = no limit)
        max_memory_gb: Maximum memory in GB for a guest to be considered (0 = no limit)

    Returns:
        List of candidate dictionaries with guest and migration details
    """
    guest_counts = calculate_node_guest_counts(nodes, guests)

    # Find nodes with max and min guest counts
    if not guest_counts:
        return []

    max_count = max(guest_counts.values())
    min_count = min(guest_counts.values())

    # Only proceed if difference exceeds threshold
    if (max_count - min_count) < guest_count_threshold:
        return []

    # Find overloaded and underloaded nodes
    overloaded_nodes = [node for node, count in guest_counts.items() if count == max_count]
    underloaded_nodes = [node for node, count in guest_counts.items() if count == min_count]

    if not overloaded_nodes or not underloaded_nodes:
        return []

    candidates = []

    # Find small guests on overloaded nodes
    for guest_id, guest in guests.items():
        if guest.get('status') != 'running':
            continue

        current_node = guest.get('node')
        if current_node not in overloaded_nodes:
            continue

        # Skip guests with ignore tag
        tags = guest.get('tags', {})
        if isinstance(tags, dict) and tags.get('has_ignore', False):
            print(f"Skipping {guest_id} ({guest.get('name')}) - has ignore tag", file=sys.stderr)
            continue

        # Check guest size constraints
        # Try both field names for compatibility with different cache formats
        cpu_cores = guest.get('cpu_cores', guest.get('maxcpu', 0))

        # Try mem_max_gb first, then fall back to maxmem in bytes
        memory_gb = guest.get('mem_max_gb', 0)
        if memory_gb == 0:
            memory_bytes = guest.get('maxmem', 0)
            memory_gb = memory_bytes / (1024**3) if memory_bytes > 0 else 0

        # Apply size filters (0 means no limit)
        if max_cpu_cores > 0 and cpu_cores > max_cpu_cores:
            print(f"Skipping {guest_id} ({guest.get('name')}) - CPU cores {cpu_cores} > {max_cpu_cores}", file=sys.stderr)
            continue
        if max_memory_gb > 0 and memory_gb > max_memory_gb:
            print(f"Skipping {guest_id} ({guest.get('name')}) - Memory {memory_gb:.2f} GB > {max_memory_gb} GB", file=sys.stderr)
            continue

        # This guest is a candidate for distribution balancing
        for target_node in underloaded_nodes:
            if target_node == current_node:
                continue

            candidates.append({
                'guest_id': guest_id,
                'guest_name': guest.get('name', f'VM {guest_id}'),
                'guest_type': guest.get('type', 'unknown'),
                'source_node': current_node,
                'target_node': target_node,
                'source_count': guest_counts[current_node],
                'target_count': guest_counts[target_node],
                'cpu_cores': cpu_cores,
                'memory_gb': round(memory_gb, 2),
                'reason': f"\u2696\ufe0f DISTRIBUTION BALANCING: {current_node} ({guest_counts[current_node]} guests) \u2192 {target_node} ({guest_counts[target_node]} guests)"
            })

    return candidates


# ---------------------------------------------------------------------------
# Main recommendation engine
# ---------------------------------------------------------------------------

def _calculate_confidence(score_improvement: float, target_details: Dict, guest: Dict, penalty_cfg: Dict) -> float:
    """
    Calculate multi-factor confidence score (0-100) for a migration recommendation.

    Factors:
    - Score improvement (40%): How much the penalty score improves
    - Target headroom (25%): How much capacity the target has after migration
    - Migration complexity (20%): Guest size and storage complexity
    - Stability signal (15%): Whether trends are favorable
    """
    min_improvement = penalty_cfg.get("min_score_improvement", 15)

    # Factor 1: Score improvement (40%) — maps improvement to 0-100
    if score_improvement >= 60:
        improvement_factor = 100
    elif score_improvement >= 40:
        improvement_factor = 75
    elif score_improvement >= 25:
        improvement_factor = 55
    elif score_improvement >= min_improvement:
        improvement_factor = 30 + ((score_improvement - min_improvement) / max(1, 25 - min_improvement)) * 25
    else:
        improvement_factor = max(0, (score_improvement / max(1, min_improvement)) * 30)

    # Factor 2: Target headroom (25%) — more room = higher confidence
    target_metrics = target_details.get("metrics", {}) if target_details else {}
    cpu_headroom = target_metrics.get("cpu_headroom", 50)
    mem_headroom = target_metrics.get("mem_headroom", 50)
    avg_headroom = (cpu_headroom + mem_headroom) / 2
    headroom_factor = min(100, avg_headroom * 1.5)  # 67% headroom = 100

    # Factor 3: Migration complexity (20%) — smaller/simpler = higher confidence
    guest_mem_gb = guest.get("mem_max_gb", 0)
    guest_cores = guest.get("cpu_cores", 1)
    has_bind_mounts = guest.get("mount_points", {}).get("has_unshared_bind_mount", False)

    if has_bind_mounts:
        complexity_factor = 20  # Bind mounts add significant risk
    elif guest_mem_gb > 32 or guest_cores > 8:
        complexity_factor = 40  # Large VM
    elif guest_mem_gb > 16 or guest_cores > 4:
        complexity_factor = 60  # Medium VM
    elif guest_mem_gb > 4:
        complexity_factor = 80  # Small-medium VM
    else:
        complexity_factor = 100  # Small VM, easy migration

    # Factor 4: Stability signal (15%) — favorable trends = higher confidence
    if target_details:
        cpu_trend = target_metrics.get("cpu_trend", "stable")
        mem_trend = target_metrics.get("mem_trend", "stable")
        total_penalties = target_details.get("total_penalties", 0)

        if cpu_trend == "rising" or mem_trend == "rising":
            stability_factor = 30  # Target has rising trends
        elif total_penalties > 50:
            stability_factor = 50  # Target already has significant penalties
        elif total_penalties > 20:
            stability_factor = 70
        else:
            stability_factor = 100  # Clean target
    else:
        stability_factor = 60

    # Weighted combination
    confidence = (
        improvement_factor * 0.40 +
        headroom_factor * 0.25 +
        complexity_factor * 0.20 +
        stability_factor * 0.15
    )

    return round(min(100, max(0, confidence)), 1)


def _build_structured_reason(guest: Dict, src_node: Dict, tgt_node: Dict, src_details: Dict, tgt_details: Dict, is_maintenance: bool, penalty_cfg: Dict) -> Dict:
    """
    Build a structured, multi-factor reason for a migration recommendation.

    Returns a dict with:
    - primary_reason: machine-readable reason key
    - primary_label: human-readable short label
    - contributing_factors: list of factor dicts
    - summary: one-sentence human-readable explanation
    """
    if is_maintenance:
        return {
            "primary_reason": "maintenance_evacuation",
            "primary_label": "Maintenance evacuation",
            "contributing_factors": [
                {"factor": "maintenance", "label": f"Source node {src_node.get('name')} is in maintenance mode"}
            ],
            "summary": f"{guest.get('name')} must be evacuated because {src_node.get('name')} is entering maintenance."
        }

    src_metrics = src_node.get("metrics", {})
    tgt_metrics = tgt_node.get("metrics", {})
    factors = []

    # Get penalty config weights
    weight_current = penalty_cfg.get("weight_current", 0.5)
    weight_24h = penalty_cfg.get("weight_24h", 0.3)
    weight_7d = penalty_cfg.get("weight_7d", 0.2)

    # Calculate weighted metrics
    def _weighted(m, key_current, key_24h, key_7d):
        if m.get("has_historical"):
            return (m.get(key_current, 0) * weight_current +
                    m.get(key_24h, 0) * weight_24h +
                    m.get(key_7d, 0) * weight_7d)
        return m.get(key_current, 0)

    src_cpu = _weighted(src_metrics, "current_cpu", "avg_cpu", "avg_cpu_week")
    src_mem = _weighted(src_metrics, "current_mem", "avg_mem", "avg_mem_week")
    tgt_cpu = _weighted(tgt_metrics, "current_cpu", "avg_cpu", "avg_cpu_week")
    tgt_mem = _weighted(tgt_metrics, "current_mem", "avg_mem", "avg_mem_week")

    # Identify dominant factor
    cpu_diff = src_cpu - tgt_cpu
    mem_diff = src_mem - tgt_mem

    # Source CPU high
    if src_cpu > 60:
        factors.append({
            "factor": "source_cpu",
            "value": round(src_cpu, 1),
            "severity": "high" if src_cpu > 80 else "medium",
            "label": f"Source CPU at {src_cpu:.0f}%"
        })

    # Source memory high
    if src_mem > 65:
        factors.append({
            "factor": "source_mem",
            "value": round(src_mem, 1),
            "severity": "high" if src_mem > 85 else "medium",
            "label": f"Source memory at {src_mem:.0f}%"
        })

    # Target has headroom
    if tgt_details:
        tgt_det_metrics = tgt_details.get("metrics", {})
        cpu_headroom = tgt_det_metrics.get("cpu_headroom", 50)
        mem_headroom = tgt_det_metrics.get("mem_headroom", 50)
        if cpu_headroom > 30:
            factors.append({
                "factor": "target_cpu_headroom",
                "value": round(cpu_headroom, 1),
                "severity": "positive",
                "label": f"Target has {cpu_headroom:.0f}% CPU headroom"
            })
        if mem_headroom > 30:
            factors.append({
                "factor": "target_mem_headroom",
                "value": round(mem_headroom, 1),
                "severity": "positive",
                "label": f"Target has {mem_headroom:.0f}% memory headroom"
            })

    # Trends
    if src_metrics.get("cpu_trend") == "rising":
        factors.append({"factor": "source_cpu_trend", "severity": "medium", "label": "Source CPU trending upward"})
    if src_metrics.get("mem_trend") == "rising":
        factors.append({"factor": "source_mem_trend", "severity": "medium", "label": "Source memory trending upward"})

    # IOWait
    src_iowait = src_metrics.get("current_iowait", 0)
    if src_iowait > 15:
        factors.append({
            "factor": "source_iowait",
            "value": round(src_iowait, 1),
            "severity": "high" if src_iowait > 25 else "medium",
            "label": f"Source IOWait at {src_iowait:.0f}%"
        })

    # Primary reason
    if cpu_diff > mem_diff:
        primary_reason = "cpu_imbalance"
        primary_label = "Balance CPU load"
    else:
        primary_reason = "mem_imbalance"
        primary_label = "Balance memory load"

    # Build human-readable summary
    src_name = src_node.get("name", "source")
    tgt_name = tgt_node.get("name", "target")
    guest_name = guest.get("name", "guest")

    dominant = "CPU" if cpu_diff > mem_diff else "memory"
    trend_note = ""
    if src_metrics.get("cpu_trend") == "rising" or src_metrics.get("mem_trend") == "rising":
        trend_note = " with an upward trend"

    summary = (
        f"{guest_name} should move to {tgt_name} because {src_name} has high {dominant} usage "
        f"({src_cpu:.0f}% CPU, {src_mem:.0f}% mem{trend_note}), "
        f"while {tgt_name} has more capacity ({tgt_cpu:.0f}% CPU, {tgt_mem:.0f}% mem)."
    )

    return {
        "primary_reason": primary_reason,
        "primary_label": primary_label,
        "contributing_factors": factors,
        "summary": summary
    }


def _build_summary(recommendations: List[Dict], skipped_guests: List[Dict], nodes: Dict, penalty_cfg: Dict) -> Dict:
    """
    Build a recommendation digest / summary for the UI.
    """
    total_improvement = sum(r.get("score_improvement", 0) for r in recommendations)
    maintenance_count = sum(1 for r in recommendations if r.get("structured_reason", {}).get("primary_reason") == "maintenance_evacuation")
    cpu_count = sum(1 for r in recommendations if r.get("structured_reason", {}).get("primary_reason") == "cpu_imbalance")
    mem_count = sum(1 for r in recommendations if r.get("structured_reason", {}).get("primary_reason") == "mem_imbalance")
    other_count = len(recommendations) - maintenance_count - cpu_count - mem_count

    # Calculate average cluster health
    online_nodes = [n for n in nodes.values() if n.get("status") == "online"]
    if online_nodes:
        avg_cpu = sum(n.get("metrics", {}).get("current_cpu", 0) for n in online_nodes) / len(online_nodes)
        avg_mem = sum(n.get("metrics", {}).get("current_mem", 0) for n in online_nodes) / len(online_nodes)
        # Simple health score: 100 - weighted average of resource usage
        cluster_health = round(max(0, 100 - (avg_cpu * 0.5 + avg_mem * 0.5)), 1)
    else:
        avg_cpu = 0
        avg_mem = 0
        cluster_health = 0

    # Estimate post-migration health
    predicted_health = round(min(100, cluster_health + (total_improvement * 0.3 / max(1, len(online_nodes)))), 1)

    # Build breakdown of reasons
    reasons_breakdown = []
    if cpu_count > 0:
        reasons_breakdown.append(f"{cpu_count} to balance CPU")
    if mem_count > 0:
        reasons_breakdown.append(f"{mem_count} to balance memory")
    if maintenance_count > 0:
        reasons_breakdown.append(f"{maintenance_count} for maintenance evacuation")
    if other_count > 0:
        reasons_breakdown.append(f"{other_count} for other reasons")

    # Skipped breakdown
    skip_reasons = {}
    for s in skipped_guests:
        reason = s.get("reason", "unknown")
        skip_reasons[reason] = skip_reasons.get(reason, 0) + 1

    # Urgency assessment
    if maintenance_count > 0:
        urgency = "high"
        urgency_label = "Maintenance evacuations pending"
    elif any(r.get("score_improvement", 0) >= 50 for r in recommendations):
        urgency = "medium"
        urgency_label = "Significant imbalance detected"
    elif len(recommendations) > 0:
        urgency = "low"
        urgency_label = "Minor optimizations available"
    else:
        urgency = "none"
        urgency_label = "Cluster is balanced"

    # --- Batch Impact Assessment ---
    import statistics

    # "Before" state: current node metrics for online nodes
    before_node_scores = {}
    for node_name, node in nodes.items():
        if node.get("status") != "online":
            continue
        metrics = node.get("metrics", {})
        before_node_scores[node_name] = {
            "cpu": round(metrics.get("current_cpu", 0), 1),
            "mem": round(metrics.get("current_mem", 0), 1),
            "guest_count": len(node.get("guests", [])),
        }

    # "After" state: simulate all recommended migrations
    after_node_scores = {n: dict(d) for n, d in before_node_scores.items()}

    for rec in recommendations:
        source = rec.get("source_node") or rec.get("current_node")
        target = rec.get("target_node")

        if not source or not target:
            continue
        if source not in after_node_scores or target not in after_node_scores:
            continue

        # Estimate guest memory contribution from allocated mem_gb
        guest_mem_gb = rec.get("mem_gb", 0)
        source_total_mem = nodes.get(source, {}).get("total_mem_gb", 1) or 1
        target_total_mem = nodes.get(target, {}).get("total_mem_gb", 1) or 1
        mem_delta_source = (guest_mem_gb / source_total_mem) * 100
        mem_delta_target = (guest_mem_gb / target_total_mem) * 100

        # Estimate guest CPU contribution from score_details predicted metrics
        cpu_delta_target = 0.0
        score_details = rec.get("score_details") or {}
        target_det = score_details.get("target", {}) if isinstance(score_details, dict) else {}
        target_met = target_det.get("metrics", {}) if isinstance(target_det, dict) else {}

        predicted_cpu = target_met.get("predicted_cpu")
        immediate_cpu = target_met.get("immediate_cpu")
        if predicted_cpu is not None and immediate_cpu is not None:
            cpu_delta_target = max(0.0, predicted_cpu - immediate_cpu)

        # Fallback: rough estimate from memory ratio when no score_details
        if cpu_delta_target == 0.0 and guest_mem_gb > 0:
            cpu_delta_target = mem_delta_target * 0.5

        # Scale CPU delta from target to source based on core count ratio
        source_cores = nodes.get(source, {}).get("cpu_cores", 1) or 1
        target_cores = nodes.get(target, {}).get("cpu_cores", 1) or 1
        cpu_delta_source = cpu_delta_target * (target_cores / source_cores)

        # Apply: remove guest from source, add to target
        after_node_scores[source]["cpu"] = round(max(0, after_node_scores[source]["cpu"] - cpu_delta_source), 1)
        after_node_scores[source]["mem"] = round(max(0, after_node_scores[source]["mem"] - mem_delta_source), 1)
        after_node_scores[source]["guest_count"] = max(0, after_node_scores[source]["guest_count"] - 1)

        after_node_scores[target]["cpu"] = round(min(100, after_node_scores[target]["cpu"] + cpu_delta_target), 1)
        after_node_scores[target]["mem"] = round(min(100, after_node_scores[target]["mem"] + mem_delta_target), 1)
        after_node_scores[target]["guest_count"] += 1

    # Compute score variance (combined CPU + memory load spread across nodes)
    def _calc_variance(node_scores):
        if len(node_scores) < 2:
            return 0.0
        combined = [(s["cpu"] + s["mem"]) / 2.0 for s in node_scores.values()]
        return round(statistics.variance(combined), 1)

    before_variance = _calc_variance(before_node_scores)
    after_variance = _calc_variance(after_node_scores)

    # Determine if every node's combined load improved or held steady
    all_nodes_improved = True
    for name in before_node_scores:
        if name not in after_node_scores:
            continue
        before_load = (before_node_scores[name]["cpu"] + before_node_scores[name]["mem"]) / 2.0
        after_load = (after_node_scores[name]["cpu"] + after_node_scores[name]["mem"]) / 2.0
        if after_load > before_load + 0.5:  # small tolerance for rounding
            all_nodes_improved = False
            break

    variance_reduction_pct = (
        round((1.0 - after_variance / before_variance) * 100, 1)
        if before_variance > 0 else 0.0
    )

    batch_impact = {
        "before": {
            "node_scores": before_node_scores,
            "score_variance": before_variance,
        },
        "after": {
            "node_scores": after_node_scores,
            "score_variance": after_variance,
        },
        "improvement": {
            "health_delta": round(predicted_health - cluster_health, 1),
            "variance_reduction_pct": variance_reduction_pct,
            "all_nodes_improved": all_nodes_improved,
        },
    }

    return {
        "total_recommendations": len(recommendations),
        "total_skipped": len(skipped_guests),
        "total_improvement": round(total_improvement, 1),
        "reasons_breakdown": reasons_breakdown,
        "cluster_health": cluster_health,
        "predicted_health": predicted_health,
        "avg_cpu": round(avg_cpu, 1),
        "avg_mem": round(avg_mem, 1),
        "urgency": urgency,
        "urgency_label": urgency_label,
        "skip_reasons": skip_reasons,
        "batch_impact": batch_impact,
    }


def generate_recommendations(nodes: Dict, guests: Dict, cpu_threshold: float = 60.0, mem_threshold: float = 70.0, iowait_threshold: float = 30.0, maintenance_nodes: set = None) -> Dict:
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
    pending_target_guests = {}

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

            # Calculate current score (how well current node suits this guest)
            current_score, src_details = calculate_target_node_score(src_node, guest, {}, cpu_threshold, mem_threshold, penalty_config=penalty_cfg, return_details=True)

            # For maintenance nodes, artificially inflate current score to prioritize evacuation
            if src_node_name in maintenance_nodes:
                current_score += MAINTENANCE_SCORE_BOOST

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

                    # Check storage compatibility (skip target if storage is incompatible)
                    if proxmox and not check_storage_compatibility(guest, src_node_name, tgt_name, proxmox, storage_cache):
                        skip_reasons_per_target.append(f"{tgt_name}: storage incompatible")
                        continue

                    # Calculate target suitability score with details
                    score, tgt_details = calculate_target_node_score(tgt_node, guest, pending_target_guests, cpu_threshold, mem_threshold, penalty_config=penalty_cfg, return_details=True)

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

    # Sort candidates by improvement (best first), prioritizing maintenance evacuations
    migration_candidates.sort(key=lambda x: (not x["is_maintenance"], -x["improvement"]))

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
            structured_reason = _build_structured_reason(
                guest, nodes[src_node_name], nodes[best_target],
                src_details, tgt_details, candidate["is_maintenance"], penalty_cfg
            )

            # Keep backward-compatible reason string from structured data
            reason = structured_reason["summary"] if structured_reason.get("summary") else structured_reason.get("primary_label", "Score improvement")

            # Convert raw score to suitability rating (0-100, higher is better)
            # Raw scores are penalties (lower = better), so invert them
            # Cap at 100 for the conversion formula
            suitability_rating = round(max(0, 100 - min(best_score, 100)), 1)

            # Calculate multi-factor confidence score
            confidence = _calculate_confidence(score_improvement, tgt_details, guest, penalty_cfg)

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
            }

            # Add mount point metadata and warnings if present
            if mount_point_info:
                recommendation["mount_point_info"] = mount_point_info
            if bind_mount_warning:
                recommendation["bind_mount_warning"] = bind_mount_warning

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

    # Build recommendation summary / digest
    summary = _build_summary(recommendations, skipped_guests, nodes, penalty_cfg)

    return {
        "recommendations": recommendations,
        "skipped_guests": skipped_guests,
        "summary": summary,
    }
