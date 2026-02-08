"""
ProxBalance Execution Planner

Determines optimal execution order for multiple migrations using
dependency graph analysis, topological sorting, and parallel grouping.
"""

from typing import Dict, List


def compute_execution_order(recommendations: List[Dict], nodes: Dict) -> Dict:
    """
    Determine optimal execution order for multiple migrations based on
    dependencies and resource sequencing.

    Algorithm:
    1. Build a directed dependency graph: if recommendation A frees capacity
       on node X (A.source_node == X) and recommendation B sends a guest TO
       node X (B.target_node == X), then A should execute before B.
    2. Detect and break circular dependencies by removing the edge for the
       recommendation with the lower score_improvement.
    3. Compute topological order using Kahn's algorithm.
    4. Group independent migrations into parallel execution sets.
    5. Within each group, sort by highest confidence / lowest risk first.

    Args:
        recommendations: List of recommendation dicts from generate_recommendations.
        nodes: Dictionary of node data.

    Returns:
        Dictionary with ordered_recommendations, parallel_groups,
        total_steps, and can_parallelize.
    """
    n = len(recommendations)

    # Trivial cases: 0 or 1 recommendations
    if n == 0:
        return {
            "ordered_recommendations": [],
            "parallel_groups": [],
            "total_steps": 0,
            "can_parallelize": False,
        }

    if n == 1:
        rec = recommendations[0]
        return {
            "ordered_recommendations": [
                {
                    "step": 1,
                    "parallel_group": 1,
                    "vmid": rec.get("vmid"),
                    "name": rec.get("name", "unknown"),
                    "source_node": rec.get("source_node") or rec.get("current_node", ""),
                    "target_node": rec.get("target_node", ""),
                    "reason_for_order": "Only migration in plan",
                }
            ],
            "parallel_groups": [[0]],
            "total_steps": 1,
            "can_parallelize": False,
        }

    # --- Step 1: Build dependency graph ---
    # adjacency list: edges[i] contains set of j where i must execute before j
    edges = {i: set() for i in range(n)}
    # reverse adjacency: who depends on i
    in_degree = {i: 0 for i in range(n)}

    # Index recommendations by source_node for quick lookup
    # If rec A frees capacity on node X (source_node == X), and rec B
    # needs to send a guest TO X (target_node == X), then A -> B
    source_by_node = {}  # node_name -> list of rec indices that FREE capacity on that node
    target_by_node = {}  # node_name -> list of rec indices that SEND TO that node

    for i, rec in enumerate(recommendations):
        src = rec.get("source_node") or rec.get("current_node", "")
        tgt = rec.get("target_node", "")

        if src:
            if src not in source_by_node:
                source_by_node[src] = []
            source_by_node[src].append(i)

        if tgt:
            if tgt not in target_by_node:
                target_by_node[tgt] = []
            target_by_node[tgt].append(i)

    # For each node X: if rec A frees capacity on X (source_node == X)
    # and rec B sends to X (target_node == X), add edge A -> B
    for node_name in source_by_node:
        if node_name not in target_by_node:
            continue
        for a_idx in source_by_node[node_name]:
            for b_idx in target_by_node[node_name]:
                if a_idx == b_idx:
                    continue
                # A frees capacity, B needs it -> A before B
                edges[a_idx].add(b_idx)
                in_degree[b_idx] += 1

    # --- Step 2: Detect and break circular dependencies ---
    # Use iterative cycle detection: repeatedly try topological sort;
    # if stuck, break the weakest edge in the remaining graph.
    def _break_cycles(edges, in_degree, recs):
        """Break cycles by removing edges from lower-improvement recommendations."""
        working_edges = {i: set(s) for i, s in edges.items()}
        working_in = dict(in_degree)

        max_iterations = n * n  # safety bound
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            # Try to find a node with in_degree 0
            queue = [i for i in working_in if working_in[i] == 0]
            if not queue:
                # All remaining nodes are in cycles; break the weakest edge
                # Find the node in the cycle with the lowest score_improvement
                remaining = [i for i in working_in if working_in.get(i, -1) >= 0]
                if not remaining:
                    break

                # Find the edge to break: pick the dependency where the
                # "depended-upon" rec has the lowest improvement
                worst_edge = None
                worst_improvement = float('inf')
                for i in remaining:
                    if i not in working_edges:
                        continue
                    for j in working_edges[i]:
                        if j not in working_in or working_in[j] < 0:
                            continue
                        imp = recs[i].get("score_improvement", 0)
                        if imp < worst_improvement:
                            worst_improvement = imp
                            worst_edge = (i, j)

                if worst_edge is None:
                    break

                # Remove this edge
                a, b = worst_edge
                working_edges[a].discard(b)
                working_in[b] = max(0, working_in[b] - 1)
                # Also update the original structures
                edges[a].discard(b)
                in_degree[b] = max(0, in_degree[b] - 1)
                continue

            # Process the zero-in-degree node to verify progress
            node = queue[0]
            working_in[node] = -1  # mark as processed
            for neighbor in list(working_edges.get(node, [])):
                if neighbor in working_in and working_in[neighbor] >= 0:
                    working_in[neighbor] -= 1
            working_edges.pop(node, None)

            # Check if all nodes are processed
            if all(working_in.get(i, -1) < 0 for i in range(n)):
                break

    _break_cycles(edges, in_degree, recommendations)

    # --- Step 3: Topological sort (Kahn's algorithm) with parallel grouping ---
    # Nodes with the same "depth" can run in parallel
    topo_order = []
    parallel_groups = []
    current_in = dict(in_degree)

    group_num = 0
    while True:
        # Find all nodes with in_degree 0
        ready = [i for i in range(n) if current_in.get(i, -1) == 0]
        if not ready:
            break

        group_num += 1

        # Sort within group: highest confidence first, then lowest risk, then highest improvement
        def _sort_key(idx):
            rec = recommendations[idx]
            confidence = rec.get("confidence_score", 50)
            risk = rec.get("risk_score", 50)
            improvement = rec.get("score_improvement", 0)
            return (-confidence, risk, -improvement)

        ready.sort(key=_sort_key)

        group_indices = []
        for idx in ready:
            topo_order.append(idx)
            group_indices.append(idx)
            current_in[idx] = -1  # mark processed

        parallel_groups.append(group_indices)

        # Decrease in_degree for successors
        for idx in ready:
            for neighbor in edges.get(idx, set()):
                if current_in.get(neighbor, -1) >= 0:
                    current_in[neighbor] -= 1

    # Handle any nodes not reached (should not happen after cycle breaking, but safety)
    unprocessed = [i for i in range(n) if current_in.get(i, -1) >= 0]
    if unprocessed:
        group_num += 1
        unprocessed.sort(key=lambda idx: -recommendations[idx].get("score_improvement", 0))
        topo_order.extend(unprocessed)
        parallel_groups.append(unprocessed)
        for idx in unprocessed:
            current_in[idx] = -1

    # --- Step 4: Build ordered output ---
    ordered = []
    step = 0
    for group_idx, group in enumerate(parallel_groups):
        group_id = group_idx + 1
        for rec_idx in group:
            step += 1
            rec = recommendations[rec_idx]
            src = rec.get("source_node") or rec.get("current_node", "")
            tgt = rec.get("target_node", "")

            # Determine reason for ordering
            predecessors = [j for j in range(n) if rec_idx in edges.get(j, set())]
            if predecessors:
                pred_nodes = set()
                for p in predecessors:
                    pred_src = recommendations[p].get("source_node") or recommendations[p].get("current_node", "")
                    if pred_src == tgt:
                        pred_nodes.add(pred_src)
                if pred_nodes:
                    reason = "Waits for capacity to be freed on {}".format(", ".join(sorted(pred_nodes)))
                else:
                    reason = "Depends on prior migration(s)"
            elif group_id == 1:
                # First group — check if this rec frees capacity for later ones
                successors_nodes = set()
                for s in edges.get(rec_idx, set()):
                    s_tgt = recommendations[s].get("target_node", "")
                    if s_tgt == src:
                        successors_nodes.add(src)
                if successors_nodes:
                    reason = "Frees capacity on {}".format(", ".join(sorted(successors_nodes)))
                else:
                    reason = "No dependencies — can run first"
            else:
                reason = "Independent — grouped for parallel execution"

            ordered.append({
                "step": step,
                "parallel_group": group_id,
                "vmid": rec.get("vmid"),
                "name": rec.get("name", "unknown"),
                "source_node": src,
                "target_node": tgt,
                "reason_for_order": reason,
            })

    can_parallelize = any(len(g) > 1 for g in parallel_groups)

    return {
        "ordered_recommendations": ordered,
        "parallel_groups": parallel_groups,
        "total_steps": step,
        "can_parallelize": can_parallelize,
    }
