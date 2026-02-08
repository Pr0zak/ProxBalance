"""
ProxBalance Reporting Module

Generates cluster health summaries, batch impact assessments,
urgency classifications, and capacity planning advisories.
"""

import statistics
from typing import Dict, List


def build_summary(recommendations: List[Dict], skipped_guests: List[Dict], nodes: Dict, penalty_cfg: Dict) -> Dict:
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


def generate_capacity_advisories(nodes: Dict, recommendations: List[Dict], penalty_cfg: Dict) -> List[Dict]:
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
