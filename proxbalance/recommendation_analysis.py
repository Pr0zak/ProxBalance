"""
ProxBalance Recommendation Analysis

Provides confidence scoring, structured reason building, and migration
conflict detection for the recommendation engine. These are post-generation
analysis functions used to enrich and validate recommendations.
"""

from typing import Any, Dict, List, Optional


def calculate_confidence(score_improvement: float, target_details: Optional[Dict[str, Any]], guest: Dict[str, Any], penalty_cfg: Dict[str, Any]) -> float:
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


def build_structured_reason(guest: Dict[str, Any], src_node: Dict[str, Any], tgt_node: Dict[str, Any], src_details: Dict[str, Any], tgt_details: Optional[Dict[str, Any]], is_maintenance: bool, penalty_cfg: Dict[str, Any]) -> Dict[str, Any]:
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
    factors: List[Dict[str, Any]] = []

    # Get penalty config weights
    weight_current = penalty_cfg.get("weight_current", 0.5)
    weight_24h = penalty_cfg.get("weight_24h", 0.3)
    weight_7d = penalty_cfg.get("weight_7d", 0.2)

    # Calculate weighted metrics
    def _weighted(m: Dict[str, Any], key_current: str, key_24h: str, key_7d: str) -> float:
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


def detect_migration_conflicts(recommendations: List[Dict[str, Any]], nodes: Dict[str, Any], guests: Dict[str, Any],
                               cpu_threshold: float, mem_threshold: float, penalty_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Post-generation validation: detect conflicts among recommended migrations.

    Groups recommendations by target node and simulates the combined
    post-migration load. If the combined load exceeds thresholds, flags
    the conflict with a resolution suggestion.
    """
    if len(recommendations) < 2:
        return []

    conflicts: List[Dict[str, Any]] = []

    # Group recommendations by target node
    target_groups: Dict[str, List[Dict[str, Any]]] = {}
    for rec in recommendations:
        target = rec.get("target_node")
        if not target:
            continue
        if target not in target_groups:
            target_groups[target] = []
        target_groups[target].append(rec)

    for target_node, recs in target_groups.items():
        if len(recs) < 2:
            continue  # No conflict possible with a single migration

        node = nodes.get(target_node, {})
        if not node or node.get("status") != "online":
            continue

        metrics = node.get("metrics", {})
        current_cpu = metrics.get("current_cpu", 0)
        current_mem = metrics.get("current_mem", 0)
        node_total_mem = node.get("total_mem_gb", 1) or 1
        node_cores = node.get("cpu_cores", 1) or 1

        # Simulate combined post-migration load
        combined_cpu = current_cpu
        combined_mem = current_mem
        incoming: List[Dict[str, Any]] = []

        for rec in recs:
            vmid_key = str(rec.get("vmid"))
            guest = guests.get(vmid_key, {})
            mem_gb = rec.get("mem_gb", 0) or guest.get("mem_max_gb", 0)
            mem_impact = (mem_gb / node_total_mem * 100) if node_total_mem > 0 else 0

            # Estimate CPU impact from score_details or rough heuristic
            cpu_impact = 0
            score_details = rec.get("score_details") or {}
            tgt_met: Dict[str, Any] = {}
            if isinstance(score_details, dict):
                tgt_det = score_details.get("target", {})
                if isinstance(tgt_det, dict):
                    tgt_met = tgt_det.get("metrics", {})
            predicted_cpu = tgt_met.get("predicted_cpu")
            immediate_cpu = tgt_met.get("immediate_cpu")
            if predicted_cpu is not None and immediate_cpu is not None:
                cpu_impact = max(0, predicted_cpu - immediate_cpu)
            elif mem_gb > 0:
                cpu_impact = mem_impact * 0.5  # rough fallback

            combined_cpu += cpu_impact
            combined_mem += mem_impact
            incoming.append({
                "vmid": rec.get("vmid"),
                "name": rec.get("name", "unknown"),
                "predicted_cpu_impact": round(cpu_impact, 1),
                "predicted_mem_impact": round(mem_impact, 1),
            })

        # Check if combined load exceeds thresholds
        cpu_exceeded = combined_cpu > cpu_threshold
        mem_exceeded = combined_mem > mem_threshold

        if cpu_exceeded or mem_exceeded:
            # Find best alternative target for the lowest-improvement recommendation
            recs_sorted = sorted(recs, key=lambda r: r.get("score_improvement", 0))
            weakest = recs_sorted[0]

            resolution = f"Consider deferring migration of {weakest.get('name', 'unknown')} (VM {weakest.get('vmid')})"

            # Try to find an alternative target
            for alt_name, alt_node in nodes.items():
                if alt_name == target_node or alt_node.get("status") != "online":
                    continue
                alt_cpu = alt_node.get("metrics", {}).get("current_cpu", 0)
                alt_mem = alt_node.get("metrics", {}).get("current_mem", 0)
                if alt_cpu < cpu_threshold - 10 and alt_mem < mem_threshold - 10:
                    resolution = f"Consider moving {weakest.get('name', 'unknown')} (VM {weakest.get('vmid')}) to {alt_name} instead"
                    break

            conflict = {
                "target_node": target_node,
                "incoming_guests": incoming,
                "combined_predicted_cpu": round(combined_cpu, 1),
                "combined_predicted_mem": round(combined_mem, 1),
                "cpu_threshold": cpu_threshold,
                "mem_threshold": mem_threshold,
                "exceeds_cpu": cpu_exceeded,
                "exceeds_mem": mem_exceeded,
                "resolution": resolution,
            }
            conflicts.append(conflict)

            # Tag affected recommendations with conflict info
            for rec in recs:
                rec["has_conflict"] = True
                rec["conflict_target"] = target_node

    return conflicts
