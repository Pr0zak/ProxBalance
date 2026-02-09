"""
ProxBalance Distribution Balancing

Provides guest count analysis and candidate selection for distributing
guests evenly across cluster nodes. Used by the recommendation engine
to suggest migrations that balance guest counts.
"""

import sys
from typing import Any, Dict, List


def calculate_node_guest_counts(nodes: Dict[str, Any], guests: Dict[str, Any]) -> Dict[str, int]:
    """
    Calculate the number of running guests on each node.

    Args:
        nodes: Dictionary of node data
        guests: Dictionary of guest data

    Returns:
        Dictionary mapping node names to running guest counts
    """
    guest_counts: Dict[str, int] = {}

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
    nodes: Dict[str, Any],
    guests: Dict[str, Any],
    guest_count_threshold: int = 2,
    max_cpu_cores: int = 2,
    max_memory_gb: int = 4
) -> List[Dict[str, Any]]:
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

    candidates: List[Dict[str, Any]] = []

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
