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

def generate_recommendations(nodes: Dict, guests: Dict, cpu_threshold: float = 60.0, mem_threshold: float = 70.0, iowait_threshold: float = 30.0, maintenance_nodes: set = None) -> List[Dict]:
    """
    Generate intelligent migration recommendations using pure score-based analysis

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

            # Skip guests with ignore tag (unless on maintenance node)
            if guest.get("tags", {}).get("has_ignore", False) and src_node_name not in maintenance_nodes:
                continue

            # Skip HA-managed guests (unless on maintenance node)
            if guest.get("ha_managed", False) and src_node_name not in maintenance_nodes:
                continue

            # Skip stopped guests (unless on maintenance node)
            if guest.get("status") != "running" and src_node_name not in maintenance_nodes:
                continue

            # Skip guests with passthrough disks (hardware-bound, cannot migrate)
            local_disk_info = guest.get("local_disks", {})
            if local_disk_info.get("is_pinned", False):
                # Passthrough disks cannot be migrated even for maintenance
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
                        continue

                # For shared bind mounts, add informational note but allow migration
                elif mount_info.get("has_shared_mount", False):
                    mount_points = mount_info.get("mount_points", [])
                    shared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and mp.get("is_shared", False)]
                    if shared_mounts:
                        shared_paths = [mp.get("source", "") for mp in shared_mounts]
                        bind_mount_warning = f"Container has {len(shared_mounts)} shared bind mount(s): {', '.join(shared_paths[:2])}{'...' if len(shared_paths) > 2 else ''}. Ensure paths exist on target node."

            # Calculate current score (how well current node suits this guest)
            current_score = calculate_target_node_score(src_node, guest, {}, cpu_threshold, mem_threshold)

            # For maintenance nodes, artificially inflate current score to prioritize evacuation
            if src_node_name in maintenance_nodes:
                current_score += MAINTENANCE_SCORE_BOOST

            # Find best alternative target
            best_target = None
            best_target_score = 999999

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
                        continue

                    # Check storage compatibility (skip target if storage is incompatible)
                    if proxmox and not check_storage_compatibility(guest, src_node_name, tgt_name, proxmox, storage_cache):
                        continue

                    # Calculate target suitability score
                    score = calculate_target_node_score(tgt_node, guest, pending_target_guests, cpu_threshold, mem_threshold)

                    if score < best_target_score:
                        best_target_score = score
                        best_target = tgt_name

                except Exception as e:
                    print(f"Error evaluating target {tgt_name} for guest {vmid_key}: {str(e)}", file=sys.stderr)
                    traceback.print_exc()
                    continue

            # Calculate score improvement
            score_improvement = current_score - best_target_score

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
                    "is_maintenance": src_node_name in maintenance_nodes
                })

                # Track pending migration IMMEDIATELY so next guest evaluation considers it
                if best_target not in pending_target_guests:
                    pending_target_guests[best_target] = []
                pending_target_guests[best_target].append(guest)

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

            cmd_type = "qm" if guest.get("type") == "VM" else "pct"
            cmd_flag = "--online" if guest.get("type") == "VM" else "--restart"
            vmid_int = int(vmid_key) if isinstance(vmid_key, str) else vmid_key

            # Generate reason based on primary benefit
            if candidate["is_maintenance"]:
                reason = f"Node maintenance - evacuating {src_node_name}"
            else:
                src_metrics = nodes[src_node_name].get("metrics", {})
                tgt_metrics = nodes[best_target].get("metrics", {})

                # Use configured weights for metrics
                config = load_config()
                weight_current = config.get('automated_migrations', {}).get('weight_config', {}).get('weight_current', 1)
                weight_24h = config.get('automated_migrations', {}).get('weight_config', {}).get('weight_24h', 0)
                weight_7d = config.get('automated_migrations', {}).get('weight_config', {}).get('weight_7d', 0)

                # Normalize weights to sum to 1
                total_weight = weight_current + weight_24h + weight_7d
                if total_weight > 0:
                    w_current = weight_current / total_weight
                    w_24h = weight_24h / total_weight
                    w_7d = weight_7d / total_weight
                else:
                    w_current, w_24h, w_7d = 1, 0, 0

                # Weighted metrics for reason
                src_cpu = (src_metrics.get("current_cpu", 0) * w_current + src_metrics.get("avg_cpu", 0) * w_24h + src_metrics.get("avg_cpu_week", 0) * w_7d)
                src_mem = (src_metrics.get("current_mem", 0) * w_current + src_metrics.get("avg_mem", 0) * w_24h + src_metrics.get("avg_mem_week", 0) * w_7d)
                tgt_cpu = (tgt_metrics.get("current_cpu", 0) * w_current + tgt_metrics.get("avg_cpu", 0) * w_24h + tgt_metrics.get("avg_cpu_week", 0) * w_7d)
                tgt_mem = (tgt_metrics.get("current_mem", 0) * w_current + tgt_metrics.get("avg_mem", 0) * w_24h + tgt_metrics.get("avg_mem_week", 0) * w_7d)

                if src_cpu > src_mem:
                    reason = f"Balance CPU load (src: {src_cpu:.1f}%, target: {tgt_cpu:.1f}%)"
                else:
                    reason = f"Balance Memory load (src: {src_mem:.1f}%, target: {tgt_mem:.1f}%)"

            # Convert raw score to suitability rating (0-100, higher is better)
            # Raw scores are penalties (lower = better), so invert them
            # Cap at 100 for the conversion formula
            suitability_rating = round(max(0, 100 - min(best_score, 100)), 1)

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
                "reason": reason,
                "mem_gb": guest.get("mem_max_gb", 0),
                "command": "{} migrate {} {} {}".format(cmd_type, vmid_int, best_target, cmd_flag),
                "confidence_score": round(min(100, score_improvement * 2), 1)  # Convert improvement to confidence
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

    return recommendations
