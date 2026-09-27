"""
ProxBalance Reporting Module

Generates cluster health summaries, batch impact assessments,
urgency classifications, and capacity planning advisories.
"""

import statistics
from typing import Any, Dict, List, Optional

from proxbalance.recommendation_analysis import estimate_move_deltas
from proxbalance.scoring import calculate_node_health_score


def build_summary(recommendations: List[Dict[str, Any]], skipped_guests: List[Dict[str, Any]], nodes: Dict[str, Any], penalty_cfg: Dict[str, Any],
                  guests: Optional[Dict[str, Any]] = None,
                  limits: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """
    Build a recommendation digest / summary for the UI.

    Args:
        recommendations: Generated recommendations.
        skipped_guests: Guests the engine considered and skipped.
        nodes: Node records keyed by name.
        penalty_cfg: Penalty scoring config.
        guests: Guest records keyed by vmid string. Used to estimate how
            much each move actually frees on its source node; optional for
            backward compatibility.
        limits: Per-node safety limits {"cpu": %, "mem": %} the conflict
            detector checked against; echoed in batch_impact so the UI can
            flag a node whose predicted load crosses them.

    Returns:
        Summary dict including batch_impact (before/after/improvement/moves).
    """
    total_improvement = sum(r.get("score_improvement", 0) for r in recommendations)
    maintenance_count = sum(1 for r in recommendations if r.get("structured_reason", {}).get("primary_reason") == "maintenance_evacuation")
    cpu_count = sum(1 for r in recommendations if r.get("structured_reason", {}).get("primary_reason") == "cpu_imbalance")
    mem_count = sum(1 for r in recommendations if r.get("structured_reason", {}).get("primary_reason") == "mem_imbalance")
    other_count = len(recommendations) - maintenance_count - cpu_count - mem_count

    # Calculate average cluster health using penalty-based scoring
    # (consistent with recommendations.py and forecasting.py)
    online_nodes = [n for n in nodes.values() if n.get("status") == "online"]
    if online_nodes:
        avg_cpu = sum(n.get("metrics", {}).get("current_cpu", 0) for n in online_nodes) / len(online_nodes)
        avg_mem = sum(n.get("metrics", {}).get("current_mem", 0) for n in online_nodes) / len(online_nodes)
        avg_score = sum(
            calculate_node_health_score(n, n.get("metrics", {}), penalty_config=penalty_cfg)
            for n in online_nodes
        ) / len(online_nodes)
        cluster_health = round(max(0, 100 - avg_score), 1)
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

    # "After" state: simulate all recommended migrations.
    #
    # Each move is estimated on its own (see estimate_move_deltas), the raw
    # deltas are summed, and the result is clamped once at the end. Emitting
    # the per-move deltas lets the UI recompute the "after" picture for any
    # subset of the suggestions (selected / not deferred) with the same math.
    n_online = max(1, len(online_nodes))
    after_raw = {n: {"cpu": d["cpu"], "mem": d["mem"], "guest_count": d["guest_count"]}
                 for n, d in before_node_scores.items()}
    moves: List[Dict[str, Any]] = []

    for rec in recommendations:
        source = rec.get("source_node")
        target = rec.get("target_node")

        if not source or not target:
            continue
        if source not in after_raw or target not in after_raw:
            continue

        guest = (guests or {}).get(str(rec.get("vmid")))
        deltas = estimate_move_deltas(rec, guest, nodes.get(source, {}), nodes.get(target, {}))

        after_raw[source]["cpu"] -= deltas["source_cpu"]
        after_raw[source]["mem"] -= deltas["source_mem"]
        after_raw[source]["guest_count"] -= 1
        after_raw[target]["cpu"] += deltas["target_cpu"]
        after_raw[target]["mem"] += deltas["target_mem"]
        after_raw[target]["guest_count"] += 1

        moves.append({
            "vmid": rec.get("vmid"),
            "source_node": source,
            "target_node": target,
            **{k: round(v, 2) for k, v in deltas.items()},
            "health_delta": round(rec.get("score_improvement", 0) * 0.3 / n_online, 2),
        })

    after_node_scores = {
        name: {
            "cpu": round(min(100.0, max(0.0, d["cpu"])), 1),
            "mem": round(min(100.0, max(0.0, d["mem"])), 1),
            "guest_count": max(0, d["guest_count"]),
        }
        for name, d in after_raw.items()
    }

    # Compute score variance (combined CPU + memory load spread across nodes)
    def _calc_variance(node_scores: Dict[str, Dict[str, Any]]) -> float:
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
        # Per-move deltas (percentage points) behind the "after" picture, so a
        # client can re-simulate any subset of the suggestions.
        "moves": moves,
        "limits": limits,
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


def generate_capacity_advisories(nodes: Dict[str, Any], recommendations: List[Dict[str, Any]], penalty_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate capacity planning advisories based on cluster-wide resource utilization.

    Returns advisory messages when the cluster is approaching saturation,
    when migration headroom is limited, or when nodes are uniformly stressed.
    """
    advisories = []

    online_nodes = {n: d for n, d in nodes.items() if d.get("status") == "online"}
    if not online_nodes:
        return advisories

    node_count = len(online_nodes)

    # Collect metrics
    cpu_values = []
    mem_values = []
    for name, node in online_nodes.items():
        m = node.get("metrics", {})
        cpu_values.append(m.get("current_cpu", 0))
        mem_values.append(m.get("current_mem", 0))

    avg_cpu = sum(cpu_values) / node_count
    avg_mem = sum(mem_values) / node_count
    max_cpu = max(cpu_values)
    max_mem = max(mem_values)

    cpu_threshold = penalty_cfg.get("cpu_threshold", 60)
    mem_threshold = penalty_cfg.get("mem_threshold", 70)

    nodes_above_cpu = sum(1 for v in cpu_values if v > cpu_threshold)
    nodes_above_mem = sum(1 for v in mem_values if v > mem_threshold)

    # Advisory 1: Cluster-wide saturation
    if avg_cpu > 70 or avg_mem > 80:
        severity = "critical" if (avg_cpu > 85 or avg_mem > 90) else "warning"
        suggestions = [
            "Add a new node to increase cluster capacity",
            "Review guest resource allocations for over-provisioning",
            "Consider offloading low-priority workloads",
        ]
        advisories.append({
            "type": "capacity_saturation",
            "severity": severity,
            "message": f"Cluster-wide utilization is high (avg CPU: {avg_cpu:.0f}%, avg Memory: {avg_mem:.0f}%). "
                       f"Rebalancing can improve individual node health but overall capacity is constrained.",
            "metrics": {
                "cluster_cpu_avg": round(avg_cpu, 1),
                "cluster_mem_avg": round(avg_mem, 1),
                "nodes_above_cpu_threshold": nodes_above_cpu,
                "nodes_above_mem_threshold": nodes_above_mem,
            },
            "suggestions": suggestions,
        })

    # Advisory 2: Limited migration headroom (most nodes above threshold)
    if nodes_above_cpu >= node_count - 1 and node_count > 1:
        advisories.append({
            "type": "limited_cpu_headroom",
            "severity": "warning",
            "message": f"{nodes_above_cpu} of {node_count} nodes are above the CPU threshold ({cpu_threshold}%). "
                       f"Migration can redistribute load but won't reduce total CPU usage.",
            "metrics": {
                "nodes_above_cpu_threshold": nodes_above_cpu,
                "total_nodes": node_count,
                "cpu_threshold": cpu_threshold,
            },
            "suggestions": ["Add compute capacity", "Reduce CPU-intensive workloads"],
        })

    if nodes_above_mem >= node_count - 1 and node_count > 1:
        advisories.append({
            "type": "limited_mem_headroom",
            "severity": "warning",
            "message": f"{nodes_above_mem} of {node_count} nodes are above the memory threshold ({mem_threshold}%). "
                       f"Consider adding RAM or a new node.",
            "metrics": {
                "nodes_above_mem_threshold": nodes_above_mem,
                "total_nodes": node_count,
                "mem_threshold": mem_threshold,
            },
            "suggestions": ["Add memory to constrained nodes", "Add a new node"],
        })

    # Advisory 3: Single-node bottleneck
    for name, node in online_nodes.items():
        m = node.get("metrics", {})
        cpu = m.get("current_cpu", 0)
        mem = m.get("current_mem", 0)

        if cpu > 90 or mem > 95:
            advisories.append({
                "type": "node_bottleneck",
                "severity": "critical",
                "message": f"Node {name} is critically loaded (CPU: {cpu:.0f}%, Memory: {mem:.0f}%). "
                           f"Immediate action recommended.",
                "metrics": {
                    "node": name,
                    "cpu": round(cpu, 1),
                    "mem": round(mem, 1),
                },
                "suggestions": [
                    f"Migrate guests off {name} immediately",
                    f"Check for runaway processes on {name}",
                ],
            })

    # Advisory 4: Minimal cluster (only 1-2 nodes)
    if node_count <= 2 and len(recommendations) > 0:
        advisories.append({
            "type": "small_cluster",
            "severity": "info",
            "message": f"Cluster has only {node_count} node(s). Migration options are limited. "
                       f"Adding nodes would improve resilience and balancing options.",
            "metrics": {"node_count": node_count},
            "suggestions": ["Add at least one more node for better redundancy"],
        })

    return advisories
