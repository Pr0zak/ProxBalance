"""
ProxBalance Recommendation Analysis

Provides confidence scoring, structured reason building, and migration
conflict detection for the recommendation engine. These are post-generation
analysis functions used to enrich and validate recommendations.
"""

from typing import Any, Dict, List, Optional


def calculate_confidence(score_improvement: float, target_details: Optional[Dict[str, Any]], guest: Dict[str, Any], penalty_cfg: Dict[str, Any],
                         trend_evidence: Optional[Dict[str, Any]] = None, outcome_stats: Optional[Dict[str, Any]] = None) -> float:
    """
    Calculate multi-factor confidence score (0-100) for a migration recommendation.

    Factors:
    - Score improvement (35%): How much the penalty score improves
    - Target headroom (20%): How much capacity the target has after migration
    - Migration complexity (15%): Guest size and storage complexity
    - Stability signal (15%): Whether trends are favorable
    - Outcome history (15%): Historical success rate of similar migrations
    """
    min_improvement = penalty_cfg.get("min_score_improvement", 15)

    # Factor 1: Score improvement (35%) — continuous mapping to 0-100
    # Uses linear interpolation within bands to avoid cliff effects
    if score_improvement >= 60:
        improvement_factor = 100
    elif score_improvement >= 40:
        improvement_factor = 80 + (score_improvement - 40) / 20 * 20  # 80-100
    elif score_improvement >= 25:
        improvement_factor = 55 + (score_improvement - 25) / 15 * 25  # 55-80
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
    # Only CPU and IOWait trends matter here. Memory in Proxmox is essentially
    # static (allocated, not dynamic), so a "rising" memory trend is just
    # migration churn, not a workload signal. The scoring algorithm disables
    # memory trend penalties entirely (mem_trend_rising_penalty=0).
    if target_details:
        cpu_trend = target_metrics.get("cpu_trend", "stable")
        total_penalties = target_details.get("total_penalties", 0)

        if cpu_trend == "rising":
            # Scale by CPU headroom — generous headroom with a slow rise
            # is much less concerning than tight headroom
            if cpu_headroom >= 50:
                stability_factor = 70  # Plenty of room despite rising trend
            elif cpu_headroom >= 30:
                stability_factor = 50  # Moderate room, moderate concern
            else:
                stability_factor = 30  # Low headroom + rising = high concern
        elif total_penalties > 50:
            stability_factor = 50  # Target already has significant penalties
        elif total_penalties > 20:
            stability_factor = 70
        else:
            stability_factor = 100  # Clean target
    else:
        stability_factor = 60

    # Factor 5: Outcome history (15%) — past success rate influences confidence
    outcome_factor = 65  # neutral default
    if outcome_stats and outcome_stats.get("total_completed", 0) >= 5:
        success_rate = outcome_stats.get("success_rate")
        beneficial_rate = outcome_stats.get("beneficial_rate")
        if success_rate is not None:
            outcome_factor = min(100, success_rate)
        # Boost if most migrations are actively beneficial (not just neutral)
        if beneficial_rate is not None and beneficial_rate > 70:
            outcome_factor = min(100, outcome_factor + 10)
        # Penalize if accuracy is consistently poor
        avg_accuracy = outcome_stats.get("avg_accuracy_pct")
        if avg_accuracy is not None and avg_accuracy < 40:
            outcome_factor = max(0, outcome_factor - 15)

    # Trend evidence bonus — if trend analysis strongly supports the migration
    if trend_evidence and trend_evidence.get("available"):
        factors = trend_evidence.get("decision_factors", [])
        strong_factors = sum(1 for f in factors if f.get("weight") == "problem" or f.get("weight") == "positive")
        if strong_factors >= 3:
            stability_factor = min(100, stability_factor + 15)

    # Weighted combination
    confidence = (
        improvement_factor * 0.35 +
        headroom_factor * 0.20 +
        complexity_factor * 0.15 +
        stability_factor * 0.15 +
        outcome_factor * 0.15
    )

    return round(min(100, max(0, confidence)), 1)


def build_structured_reason(guest: Dict[str, Any], src_node: Dict[str, Any], tgt_node: Dict[str, Any], src_details: Dict[str, Any], tgt_details: Optional[Dict[str, Any]], is_maintenance: bool, penalty_cfg: Dict[str, Any], is_iowait_triggered: bool = False) -> Dict[str, Any]:
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
    tgt_cpu = _weighted(tgt_metrics, "current_cpu", "avg_cpu", "avg_cpu_week")
    # Memory uses current value directly — it's a step-function resource
    # (only changes with migrations), so blending creates stale phantom values.
    src_mem = src_metrics.get("current_mem", 0)
    tgt_mem = tgt_metrics.get("current_mem", 0)

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
        factors.append({"factor": "source_mem_trend", "severity": "low", "label": "Source memory trending upward (memory is largely static)"})

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
    if is_iowait_triggered:
        primary_reason = "iowait_relief"
        primary_label = "Relieve I/O pressure"
    elif cpu_diff > mem_diff:
        primary_reason = "cpu_imbalance"
        primary_label = "Balance CPU load"
    else:
        primary_reason = "mem_imbalance"
        primary_label = "Balance memory load"

    # Build human-readable summary
    src_name = src_node.get("name", "source")
    tgt_name = tgt_node.get("name", "target")
    guest_name = guest.get("name", "guest")

    trend_note = ""
    if src_metrics.get("cpu_trend") == "rising" or src_metrics.get("mem_trend") == "rising":
        trend_note = " with an upward trend"

    # Use graduated severity language instead of always saying "high"
    def _severity_label(value: float) -> str:
        if value > 85:
            return "critical"
        elif value > 70:
            return "high"
        elif value > 50:
            return "elevated"
        return "moderate"

    if is_iowait_triggered:
        iowait_severity = _severity_label(src_iowait)
        summary = (
            f"{guest_name} should move to {tgt_name} because {src_name} has {iowait_severity} I/O wait "
            f"({src_iowait:.0f}%{trend_note}), "
            f"while {tgt_name} has more capacity ({tgt_cpu:.0f}% CPU, {tgt_mem:.0f}% mem)."
        )
    else:
        dominant = "CPU" if cpu_diff > mem_diff else "memory"
        dominant_value = src_cpu if cpu_diff > mem_diff else src_mem
        severity = _severity_label(dominant_value)
        summary = (
            f"{guest_name} should move to {tgt_name} because {src_name} has {severity} {dominant} usage "
            f"({src_cpu:.0f}% CPU, {src_mem:.0f}% mem{trend_note}), "
            f"while {tgt_name} has more capacity ({tgt_cpu:.0f}% CPU, {tgt_mem:.0f}% mem)."
        )

    return {
        "primary_reason": primary_reason,
        "primary_label": primary_label,
        "contributing_factors": factors,
        "summary": summary
    }


def estimate_move_deltas(rec: Dict[str, Any], guest: Optional[Dict[str, Any]],
                         source_node: Dict[str, Any], target_node: Dict[str, Any]) -> Dict[str, float]:
    """
    Estimate how one migration shifts CPU / memory (percentage points).

    The target side uses the same conservative estimate as the conflict
    detector (allocated memory, the engine's predicted CPU), so the impact
    view and the conflict warnings agree. The source side only gets back
    what the guest actually uses right now: subtracting the allocation there
    over-states the relief and used to drive a source node that still had
    guests down to 0% CPU / 0% memory.

    Args:
        rec: Recommendation dict (mem_gb = allocated memory, score_details).
        guest: The guest's collector record, or None when unknown.
        source_node: Source node record (total_mem_gb, cpu_cores).
        target_node: Target node record (total_mem_gb, cpu_cores).

    Returns:
        Dict with source_cpu, source_mem, target_cpu, target_mem (all >= 0).
    """
    source_total_mem = source_node.get("total_mem_gb", 0) or 0
    target_total_mem = target_node.get("total_mem_gb", 0) or 0
    source_cores = source_node.get("cpu_cores", 0) or 0
    target_cores = target_node.get("cpu_cores", 0) or 0

    alloc_mem_gb = rec.get("mem_gb", 0) or (guest or {}).get("mem_max_gb", 0) or 0
    target_mem = (alloc_mem_gb / target_total_mem * 100) if target_total_mem > 0 else 0.0

    # Target CPU: the engine's predicted-minus-current when it has one.
    target_cpu = None
    score_details = rec.get("score_details") or {}
    target_det = score_details.get("target", {}) if isinstance(score_details, dict) else {}
    target_met = target_det.get("metrics", {}) if isinstance(target_det, dict) else {}
    predicted_cpu = target_met.get("predicted_cpu")
    immediate_cpu = target_met.get("immediate_cpu")
    if predicted_cpu is not None and immediate_cpu is not None:
        target_cpu = max(0.0, predicted_cpu - immediate_cpu)

    if guest:
        guest_cores = guest.get("cpu_cores", 0) or 1
        guest_cpu = guest.get("cpu_current", 0) or 0  # % of the guest's own cores
        used_mem_gb = guest.get("mem_used_gb", 0) or 0
        source_cpu = (guest_cpu * guest_cores / source_cores) if source_cores > 0 else 0.0
        source_mem = (used_mem_gb / source_total_mem * 100) if source_total_mem > 0 else 0.0
        if target_cpu is None:
            target_cpu = (guest_cpu * guest_cores / target_cores) if target_cores > 0 else 0.0
    else:
        # No guest record: fall back to the allocation-based estimate.
        if target_cpu is None:
            target_cpu = target_mem * 0.5
        source_mem = (alloc_mem_gb / source_total_mem * 100) if source_total_mem > 0 else 0.0
        if source_cores > 0 and target_cores > 0:
            source_cpu = target_cpu * (target_cores / source_cores)
        else:
            source_cpu = target_cpu

    return {
        "source_cpu": max(0.0, source_cpu),
        "source_mem": max(0.0, source_mem),
        "target_cpu": max(0.0, target_cpu),
        "target_mem": max(0.0, target_mem),
    }


def detect_migration_conflicts(recommendations: List[Dict[str, Any]], nodes: Dict[str, Any], guests: Dict[str, Any],
                               cpu_threshold: float, mem_threshold: float, penalty_cfg: Dict[str, Any],
                               max_migrations_per_run: int = 0) -> List[Dict[str, Any]]:
    """
    Post-generation validation: detect conflicts among recommended migrations.

    Groups recommendations by target node and simulates the combined
    post-migration load (net of guests the batch moves off that node). If
    the combined load exceeds thresholds, flags the conflict with a
    resolution suggestion, in text (`resolution`) and in structured form
    (`resolution_action`, `resolution_vmid`, `resolution_target`).

    When max_migrations_per_run is set (> 0), conflict detection is scoped
    to the number of migrations that can actually execute per automation
    cycle instead of assuming all recommendations land simultaneously.
    Only the top N recommendations per target (by score improvement) are
    checked, since automigrate processes them in priority order. Remaining
    recommendations beyond the batch window are not flagged as conflicted
    because fresh recommendations will be regenerated before they execute.
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

        # Sort by score improvement (highest first) to match automigrate priority
        recs_by_priority = sorted(recs, key=lambda r: r.get("score_improvement", 0), reverse=True)

        # Scope conflict check to what can actually execute per run.
        # When max_migrations_per_run is configured, only the top N recs
        # targeting this node can execute before recommendations regenerate.
        if max_migrations_per_run > 0:
            batch_recs = recs_by_priority[:max_migrations_per_run]
        else:
            batch_recs = recs_by_priority

        # Guests the batch moves *off* this node free what they use today.
        # The execution planner runs those moves first ("frees capacity"), so
        # they count before the incoming ones land. Same estimator as the
        # summary's batch impact, so the UI's numbers and these agree.
        outgoing: List[Dict[str, Any]] = []
        freed_cpu = 0.0
        freed_mem = 0.0
        for rec in recommendations:
            if rec.get("source_node") != target_node or not rec.get("target_node"):
                continue
            d = estimate_move_deltas(rec, guests.get(str(rec.get("vmid"))), node,
                                     nodes.get(rec.get("target_node"), {}))
            freed_cpu += d["source_cpu"]
            freed_mem += d["source_mem"]
            outgoing.append({
                "vmid": rec.get("vmid"),
                "name": rec.get("name", "unknown"),
                "freed_cpu": round(d["source_cpu"], 1),
                "freed_mem": round(d["source_mem"], 1),
            })

        # Simulate combined post-migration load for the batch
        combined_cpu = max(0.0, current_cpu - freed_cpu)
        combined_mem = max(0.0, current_mem - freed_mem)
        incoming: List[Dict[str, Any]] = []

        for rec in batch_recs:
            d = estimate_move_deltas(rec, guests.get(str(rec.get("vmid"))),
                                     nodes.get(rec.get("source_node"), {}), node)
            combined_cpu += d["target_cpu"]
            combined_mem += d["target_mem"]
            incoming.append({
                "vmid": rec.get("vmid"),
                "name": rec.get("name", "unknown"),
                "predicted_cpu_impact": round(d["target_cpu"], 1),
                "predicted_mem_impact": round(d["target_mem"], 1),
            })

        # Check if combined load exceeds thresholds
        cpu_exceeded = combined_cpu > cpu_threshold
        mem_exceeded = combined_mem > mem_threshold

        if cpu_exceeded or mem_exceeded:
            # Find best alternative target for the lowest-improvement recommendation
            batch_sorted_asc = sorted(batch_recs, key=lambda r: r.get("score_improvement", 0))
            weakest = batch_sorted_asc[0]
            weakest_label = f"{weakest.get('name', 'unknown')} ({weakest.get('type') or 'VM'} {weakest.get('vmid')})"

            resolution = f"Consider deferring migration of {weakest_label}"
            resolution_target = None

            # Try to find an alternative target (never the guest's own source node)
            for alt_name, alt_node in nodes.items():
                if alt_name in (target_node, weakest.get("source_node")) or alt_node.get("status") != "online":
                    continue
                alt_cpu = alt_node.get("metrics", {}).get("current_cpu", 0)
                alt_mem = alt_node.get("metrics", {}).get("current_mem", 0)
                if alt_cpu < cpu_threshold - 10 and alt_mem < mem_threshold - 10:
                    resolution = f"Consider moving {weakest_label} to {alt_name} instead"
                    resolution_target = alt_name
                    break

            conflict = {
                "target_node": target_node,
                "incoming_guests": incoming,
                "outgoing_guests": outgoing,
                "combined_predicted_cpu": round(combined_cpu, 1),
                "combined_predicted_mem": round(combined_mem, 1),
                "cpu_threshold": cpu_threshold,
                "mem_threshold": mem_threshold,
                "exceeds_cpu": cpu_exceeded,
                "exceeds_mem": mem_exceeded,
                "resolution": resolution,
                # Structured form of `resolution` so clients need not parse the text:
                # action is "retarget" (send resolution_vmid to resolution_target)
                # or "defer" (leave resolution_vmid out of this run).
                "resolution_action": "retarget" if resolution_target else "defer",
                "resolution_vmid": weakest.get("vmid"),
                "resolution_name": weakest.get("name", "unknown"),
                "resolution_target": resolution_target,
            }
            conflicts.append(conflict)

            # Only tag the batch recs as conflicted, not all recs for this target
            for rec in batch_recs:
                rec["has_conflict"] = True
                rec["conflict_target"] = target_node

    return conflicts
