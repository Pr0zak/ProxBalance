"""
Penalty-based scoring engine for ProxBalance.

Provides the core scoring algorithm used to evaluate node health,
predict post-migration load, rank target nodes for migration suitability,
and suggest intelligent thresholds based on cluster characteristics.

Scoring philosophy:
  - Penalties are applied for undesirable conditions (high CPU, memory
    pressure, IOWait, rising trends, spikes).
  - Three time-period weights blend immediate, 24-hour, and 7-day metrics.
  - Suitability ratings are normalised to 0-100 (lower is better/healthier).
  - All penalty weights are configurable via DEFAULT_PENALTY_CONFIG or by
    passing a custom ``penalty_config`` dict to each function.
"""

import sys
from typing import Dict


# ---------------------------------------------------------------------------
# Default penalty scoring configuration
# These values can be customized via the settings UI
# ---------------------------------------------------------------------------

DEFAULT_PENALTY_CONFIG = {
    # Current load penalties (immediate state)
    "cpu_high_penalty": 20,           # Penalty when CPU > threshold
    "cpu_very_high_penalty": 50,      # Penalty when CPU > threshold+10
    "cpu_extreme_penalty": 100,       # Penalty when CPU > threshold+20
    "mem_high_penalty": 20,           # Penalty when Memory > threshold
    "mem_very_high_penalty": 50,      # Penalty when Memory > threshold+10
    "mem_extreme_penalty": 100,       # Penalty when Memory > threshold+20

    # Sustained load penalties (7-day averages)
    "cpu_sustained_high": 40,         # Penalty when 7d avg CPU > 70%
    "cpu_sustained_very_high": 80,    # Penalty when 7d avg CPU > 80%
    "cpu_sustained_critical": 150,    # Penalty when 7d avg CPU > 90%
    "mem_sustained_high": 40,         # Penalty when 7d avg Memory > 70%
    "mem_sustained_very_high": 80,    # Penalty when 7d avg Memory > 80%
    "mem_sustained_critical": 150,    # Penalty when 7d avg Memory > 90%

    # IOWait penalties
    "iowait_high_penalty": 20,        # Penalty when immediate IOWait > 10%
    "iowait_very_high_penalty": 40,   # Penalty when immediate IOWait > 20%
    "iowait_extreme_penalty": 80,     # Penalty when immediate IOWait > 30%
    "iowait_sustained_elevated": 15,  # Penalty when 7d avg IOWait > 10%
    "iowait_sustained_high": 30,      # Penalty when 7d avg IOWait > 15%
    "iowait_sustained_critical": 60,  # Penalty when 7d avg IOWait > 20%

    # Trend penalties
    "cpu_trend_rising_penalty": 15,   # Penalty for rising CPU trend
    "mem_trend_rising_penalty": 15,   # Penalty for rising Memory trend

    # Spike penalties (max values in week)
    "cpu_spike_moderate": 5,          # Penalty when max CPU > 70%
    "cpu_spike_high": 10,             # Penalty when max CPU > 80%
    "cpu_spike_very_high": 20,        # Penalty when max CPU > 90%
    "cpu_spike_extreme": 30,          # Penalty when max CPU > 95%
    "mem_spike_moderate": 5,          # Penalty when max Memory > 75%
    "mem_spike_high": 10,             # Penalty when max Memory > 85%
    "mem_spike_very_high": 20,        # Penalty when max Memory > 90%
    "mem_spike_extreme": 30,          # Penalty when max Memory > 95%

    # Predicted post-migration penalties
    "predicted_cpu_over_penalty": 25,        # Penalty when predicted CPU > threshold
    "predicted_cpu_high_penalty": 50,        # Penalty when predicted CPU > threshold+10
    "predicted_cpu_extreme_penalty": 100,    # Penalty when predicted CPU > threshold+20
    "predicted_mem_over_penalty": 25,        # Penalty when predicted Memory > threshold
    "predicted_mem_high_penalty": 50,        # Penalty when predicted Memory > threshold+10
    "predicted_mem_extreme_penalty": 100,    # Penalty when predicted Memory > threshold+20

    # Threshold offsets
    "cpu_threshold_offset_1": 10,     # First threshold offset (used for +10 calculations)
    "cpu_threshold_offset_2": 20,     # Second threshold offset (used for +20 calculations)
    "mem_threshold_offset_1": 10,     # First threshold offset (used for +10 calculations)
    "mem_threshold_offset_2": 20,     # Second threshold offset (used for +20 calculations)

    # Score improvement requirements
    "min_score_improvement": 15,      # Minimum score improvement to recommend migration
    "maintenance_score_boost": 100,   # Extra score added to maintenance nodes for evacuation priority

    # Time period weighting (for historical data)
    "weight_current": 0.5,            # Weight for current/immediate metrics (50%)
    "weight_24h": 0.3,                # Weight for 24-hour average metrics (30%)
    "weight_7d": 0.2,                 # Weight for 7-day average metrics (20%)
}


# ---------------------------------------------------------------------------
# Scoring functions
# ---------------------------------------------------------------------------

def calculate_intelligent_thresholds(nodes: Dict, penalty_config: Dict = None) -> Dict:
    """
    Analyze cluster health and suggest optimal thresholds.
    Returns suggested CPU and Memory thresholds based on cluster characteristics.
    """
    if penalty_config is None:
        penalty_config = DEFAULT_PENALTY_CONFIG

    if not nodes:
        return {
            "suggested_cpu_threshold": 60.0,
            "suggested_mem_threshold": 70.0,
            "confidence": "low",
            "reasoning": "Insufficient data for analysis"
        }

    # Collect metrics from all online nodes using 7-day averages for more stable analysis
    cpu_values = []
    mem_values = []
    iowait_values = []

    for node_name, node in nodes.items():
        if node.get("status") != "online":
            continue

        metrics = node.get("metrics", {})
        if metrics.get("has_historical"):
            # Prefer 7-day averages for more stable threshold suggestions
            cpu_values.append(metrics.get("avg_cpu_week") or metrics.get("avg_cpu", 0))
            mem_values.append(metrics.get("avg_mem_week") or metrics.get("avg_mem", 0))
            iowait_values.append(metrics.get("avg_iowait_week") or metrics.get("avg_iowait", 0))

    if not cpu_values or not mem_values:
        return {
            "suggested_cpu_threshold": 60.0,
            "suggested_mem_threshold": 70.0,
            "confidence": "low",
            "reasoning": "Insufficient historical data"
        }

    # Calculate cluster statistics
    avg_cpu = sum(cpu_values) / len(cpu_values)
    max_cpu = max(cpu_values)
    avg_mem = sum(mem_values) / len(mem_values)
    max_mem = max(mem_values)
    avg_iowait = sum(iowait_values) / len(iowait_values) if iowait_values else 0

    # Calculate standard deviation for load variance
    cpu_variance = sum((x - avg_cpu) ** 2 for x in cpu_values) / len(cpu_values)
    mem_variance = sum((x - avg_mem) ** 2 for x in mem_values) / len(mem_values)

    # Determine cluster characteristics
    node_count = len(cpu_values)

    # Better cluster size categories
    if node_count <= 2:
        cluster_size = "minimal"
        size_adjustment = -10  # Very conservative
    elif node_count <= 4:
        cluster_size = "small"
        size_adjustment = -5  # Conservative
    elif node_count <= 8:
        cluster_size = "medium"
        size_adjustment = 0  # Neutral
    elif node_count <= 16:
        cluster_size = "large"
        size_adjustment = 5  # More tolerant
    else:
        cluster_size = "xlarge"
        size_adjustment = 8  # Most tolerant

    # Calculate variance percentage (coefficient of variation)
    cpu_cv = (cpu_variance ** 0.5) / avg_cpu * 100 if avg_cpu > 0 else 0
    mem_cv = (mem_variance ** 0.5) / avg_mem * 100 if avg_mem > 0 else 0

    # Better balance detection
    is_balanced = cpu_cv < 30 and mem_cv < 30  # Coefficient of variation < 30%
    balance_status = "balanced" if is_balanced else "imbalanced"

    # More granular load detection
    if avg_cpu > 70 or avg_mem > 80:
        load_level = "very high"
        load_adjustment = 15  # Much more tolerant to avoid migration storms
    elif avg_cpu > 50 or avg_mem > 60:
        load_level = "high"
        load_adjustment = 10  # More tolerant
    elif avg_cpu > 30 or avg_mem > 40:
        load_level = "moderate"
        load_adjustment = 0  # Neutral
    else:
        load_level = "low"
        load_adjustment = -5  # Can be more aggressive

    # IOWait level detection
    if avg_iowait > 30:
        iowait_level = "critical"
        iowait_adjustment = -15
    elif avg_iowait > 20:
        iowait_level = "high"
        iowait_adjustment = -10
    elif avg_iowait > 10:
        iowait_level = "elevated"
        iowait_adjustment = -5
    else:
        iowait_level = "normal"
        iowait_adjustment = 0

    # Calculate intelligent thresholds
    # Base thresholds
    cpu_threshold = 60.0
    mem_threshold = 70.0
    iowait_threshold = 30.0

    # Build adjustments with detailed tracking
    adjustments = []

    # 1. Adjust for cluster size
    cpu_threshold += size_adjustment
    mem_threshold += size_adjustment
    iowait_threshold += size_adjustment
    adjustments.append({
        "factor": "Cluster Size",
        "value": f"{node_count} nodes ({cluster_size})",
        "adjustment": f"{size_adjustment:+.0f}%",
        "direction": "more tolerant" if size_adjustment > 0 else "more conservative" if size_adjustment < 0 else "neutral"
    })

    # 2. Adjust for load distribution balance
    balance_adjustment = 10 if is_balanced else -5
    cpu_threshold += balance_adjustment
    mem_threshold += balance_adjustment
    iowait_threshold += balance_adjustment // 2
    adjustments.append({
        "factor": "Load Balance",
        "value": f"{balance_status} (CPU variance: {cpu_cv:.1f}%, Mem variance: {mem_cv:.1f}%)",
        "adjustment": f"{balance_adjustment:+.0f}%",
        "direction": "less aggressive" if is_balanced else "more aggressive"
    })

    # 3. Adjust for overall cluster load
    cpu_threshold += load_adjustment
    mem_threshold += load_adjustment
    iowait_threshold += load_adjustment // 2
    adjustments.append({
        "factor": "Overall Load",
        "value": f"{load_level} (avg CPU: {avg_cpu:.1f}%, avg Memory: {avg_mem:.1f}%)",
        "adjustment": f"{load_adjustment:+.0f}%",
        "direction": "reduce churn" if load_adjustment > 0 else "can rebalance" if load_adjustment < 0 else "neutral"
    })

    # 4. Adjust for IOWait pressure
    cpu_threshold += iowait_adjustment // 3
    iowait_threshold += iowait_adjustment
    adjustments.append({
        "factor": "I/O Pressure",
        "value": f"{iowait_level} (avg IOWait: {avg_iowait:.1f}%)",
        "adjustment": f"{iowait_adjustment:+.0f}%",
        "direction": "address I/O contention" if iowait_adjustment < 0 else "I/O healthy"
    })

    # Clamp thresholds to reasonable ranges
    cpu_threshold = max(40, min(85, cpu_threshold))
    mem_threshold = max(50, min(90, mem_threshold))
    iowait_threshold = max(15, min(40, iowait_threshold))

    # Determine confidence based on data quality
    confidence = "high" if len(cpu_values) >= 3 and all(m.get("has_historical") for m in [n.get("metrics", {}) for n in nodes.values()]) else "medium"

    # Build summary reasoning
    summary = f"{cluster_size.capitalize()} cluster ({node_count} nodes), {balance_status} load, {load_level} utilization, {iowait_level} I/O"

    # Determine analysis period based on available data
    has_week_data = any(n.get("metrics", {}).get("avg_cpu_week") for n in nodes.values())
    analysis_period = "7 days" if has_week_data else "24 hours"

    return {
        "suggested_cpu_threshold": round(cpu_threshold, 1),
        "suggested_mem_threshold": round(mem_threshold, 1),
        "suggested_iowait_threshold": round(iowait_threshold, 1),
        "confidence": confidence,
        "summary": summary,
        "analysis_period": analysis_period,
        "adjustments": adjustments,
        "cluster_stats": {
            "node_count": node_count,
            "cluster_size": cluster_size,
            "avg_cpu": round(avg_cpu, 1),
            "max_cpu": round(max_cpu, 1),
            "avg_mem": round(avg_mem, 1),
            "max_mem": round(max_mem, 1),
            "avg_iowait": round(avg_iowait, 1),
            "cpu_variance": round(cpu_cv, 1),
            "mem_variance": round(mem_cv, 1),
            "balance_status": balance_status,
            "load_level": load_level,
            "iowait_level": iowait_level
        }
    }


def calculate_node_health_score(node: Dict, metrics: Dict, penalty_config: Dict = None) -> float:
    """
    Calculate comprehensive health score for a node (0-100, lower is better/healthier).
    Considers CPU, Memory, IOWait, Load Average, and Storage pressure.
    Uses configured time period weights.
    """
    if penalty_config is None:
        penalty_config = DEFAULT_PENALTY_CONFIG

    # Load penalty config to get time period weights
    weight_current = penalty_config.get("weight_current", 0.5)
    weight_24h = penalty_config.get("weight_24h", 0.3)
    weight_7d = penalty_config.get("weight_7d", 0.2)

    # Get metrics at different time scales
    immediate_cpu = metrics.get("current_cpu", 0)
    immediate_mem = metrics.get("current_mem", 0)
    immediate_iowait = metrics.get("current_iowait", 0)

    short_cpu = metrics.get("avg_cpu", 0)
    short_mem = metrics.get("avg_mem", 0)
    short_iowait = metrics.get("avg_iowait", 0)

    long_cpu = metrics.get("avg_cpu_week", 0)
    long_mem = metrics.get("avg_mem_week", 0)
    long_iowait = metrics.get("avg_iowait_week", 0)

    # Calculate weighted metrics using configured weights
    if metrics.get("has_historical"):
        cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
        mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
        iowait = (immediate_iowait * weight_current) + (short_iowait * weight_24h) + (long_iowait * weight_7d)
    else:
        cpu = immediate_cpu
        mem = immediate_mem
        iowait = immediate_iowait

    load = metrics.get("avg_load", 0)
    cores = node.get("cpu_cores", 1)

    # Normalize load average by core count (load per core)
    load_per_core = (load / cores) * 100 if cores > 0 else 0

    # Storage pressure score (average usage across all storage)
    storage_pressure = 0
    storage_list = node.get("storage", [])
    if storage_list:
        storage_usages = [s.get("usage_pct", 0) for s in storage_list if s.get("active", False)]
        storage_pressure = sum(storage_usages) / len(storage_usages) if storage_usages else 0

    # Weighted health score
    # CPU: 30%, Memory: 30%, IOWait: 20%, Load: 10%, Storage: 10%
    health_score = (
        cpu * 0.30 +
        mem * 0.30 +
        iowait * 0.20 +
        load_per_core * 0.10 +
        storage_pressure * 0.10
    )

    return health_score


def predict_post_migration_load(node: Dict, guest: Dict, adding: bool = True, penalty_config: Dict = None) -> Dict:
    """
    Predict node load after adding or removing a guest.
    Returns predicted CPU%, Memory%, and IOWait%.
    Uses configured time period weights.
    """
    if penalty_config is None:
        penalty_config = DEFAULT_PENALTY_CONFIG

    metrics = node.get("metrics", {})

    # Load penalty config to get time period weights
    weight_current = penalty_config.get("weight_current", 0.5)
    weight_24h = penalty_config.get("weight_24h", 0.3)
    weight_7d = penalty_config.get("weight_7d", 0.2)

    # Get metrics at different time scales
    immediate_cpu = metrics.get("current_cpu", 0)
    immediate_mem = metrics.get("current_mem", 0)
    immediate_iowait = metrics.get("current_iowait", 0)

    short_cpu = metrics.get("avg_cpu", 0)
    short_mem = metrics.get("avg_mem", 0)
    short_iowait = metrics.get("avg_iowait", 0)

    long_cpu = metrics.get("avg_cpu_week", 0)
    long_mem = metrics.get("avg_mem_week", 0)
    long_iowait = metrics.get("avg_iowait_week", 0)

    # Calculate weighted current state using configured weights
    if metrics.get("has_historical"):
        current_cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
        current_mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
        current_iowait = (immediate_iowait * weight_current) + (short_iowait * weight_24h) + (long_iowait * weight_7d)
    else:
        current_cpu = immediate_cpu
        current_mem = immediate_mem
        current_iowait = immediate_iowait

    # Guest resource usage
    guest_cpu = guest.get("cpu_current", 0)  # Percentage of guest's allocated CPUs
    guest_mem_gb = guest.get("mem_used_gb", 0)
    guest_disk_io = (guest.get("disk_read_bps", 0) + guest.get("disk_write_bps", 0)) / (1024**2)  # MB/s

    # Node capacity
    node_total_mem_gb = node.get("total_mem_gb", 1)
    node_cores = node.get("cpu_cores", 1)

    # Estimate guest's contribution to node CPU (guest uses X% of its cores)
    guest_cpu_cores = guest.get("cpu_cores", 1)
    guest_cpu_impact = (guest_cpu * guest_cpu_cores / node_cores) if node_cores > 0 else 0

    # Estimate guest's memory impact
    guest_mem_impact = (guest_mem_gb / node_total_mem_gb * 100) if node_total_mem_gb > 0 else 0

    # Estimate IOWait impact (rough heuristic: high disk I/O contributes to IOWait)
    # Assume 100 MB/s disk I/O = ~5% IOWait contribution
    guest_iowait_impact = min(guest_disk_io / 100 * 5, 20)  # Cap at 20%

    # Calculate predicted load
    if adding:
        predicted_cpu = current_cpu + guest_cpu_impact
        predicted_mem = current_mem + guest_mem_impact
        predicted_iowait = current_iowait + guest_iowait_impact
    else:
        predicted_cpu = max(0, current_cpu - guest_cpu_impact)
        predicted_mem = max(0, current_mem - guest_mem_impact)
        predicted_iowait = max(0, current_iowait - guest_iowait_impact)

    return {
        "cpu": min(predicted_cpu, 100),
        "mem": min(predicted_mem, 100),
        "iowait": min(predicted_iowait, 100)
    }


def calculate_target_node_score(target_node: Dict, guest: Dict, pending_target_guests: Dict, cpu_threshold: float, mem_threshold: float, penalty_config: Dict = None) -> float:
    """
    Calculate weighted score for target node suitability (lower is better).
    Considers current load, predicted post-migration load, storage availability, and headroom.
    """
    if penalty_config is None:
        penalty_config = DEFAULT_PENALTY_CONFIG

    target_name = target_node.get("name")
    metrics = target_node.get("metrics", {})

    # Weighted time-based scoring: configurable weights from penalty config
    # This balances responsiveness with stability
    immediate_cpu = metrics.get("current_cpu", 0)
    immediate_mem = metrics.get("current_mem", 0)
    immediate_iowait = metrics.get("current_iowait", 0)

    short_cpu = metrics.get("avg_cpu", 0)  # 24-hour average
    short_mem = metrics.get("avg_mem", 0)
    short_iowait = metrics.get("avg_iowait", 0)

    long_cpu = metrics.get("avg_cpu_week", 0)  # 7-day average
    long_mem = metrics.get("avg_mem_week", 0)
    long_iowait = metrics.get("avg_iowait_week", 0)

    # Calculate weighted scores using configurable weights
    weight_current = penalty_config.get("weight_current", 0.5)
    weight_24h = penalty_config.get("weight_24h", 0.3)
    weight_7d = penalty_config.get("weight_7d", 0.2)

    if metrics.get("has_historical"):
        current_cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
        current_mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
        current_iowait = (immediate_iowait * weight_current) + (short_iowait * weight_24h) + (long_iowait * weight_7d)
    else:
        # No historical data, use current only
        current_cpu = immediate_cpu
        current_mem = immediate_mem
        current_iowait = immediate_iowait

    # Get max values over the week to avoid migrating to nodes that spike
    max_cpu_week = metrics.get("max_cpu_week", metrics.get("max_cpu", 0))
    max_mem_week = metrics.get("max_mem_week", metrics.get("max_mem", 0))

    # Consider trends - penalize nodes with rising load
    cpu_trend = metrics.get("cpu_trend", "stable")
    mem_trend = metrics.get("mem_trend", "stable")

    # Initialize penalty accumulator
    penalties = 0

    # Get configurable threshold offsets
    cpu_offset_1 = penalty_config.get("cpu_threshold_offset_1", 10)
    cpu_offset_2 = penalty_config.get("cpu_threshold_offset_2", 20)
    mem_offset_1 = penalty_config.get("mem_threshold_offset_1", 10)
    mem_offset_2 = penalty_config.get("mem_threshold_offset_2", 20)

    # Current load penalty - heavily penalize nodes with high current load
    if immediate_cpu > (cpu_threshold + cpu_offset_2):
        penalties += penalty_config.get("cpu_extreme_penalty", 100)  # Extreme current CPU load
    elif immediate_cpu > (cpu_threshold + cpu_offset_1):
        penalties += penalty_config.get("cpu_very_high_penalty", 50)   # Very high current CPU load
    elif immediate_cpu > cpu_threshold:
        penalties += penalty_config.get("cpu_high_penalty", 20)   # High current CPU load

    if immediate_mem > (mem_threshold + mem_offset_2):
        penalties += penalty_config.get("mem_extreme_penalty", 100)  # Extreme current memory load
    elif immediate_mem > (mem_threshold + mem_offset_1):
        penalties += penalty_config.get("mem_very_high_penalty", 50)   # Very high current memory load
    elif immediate_mem > mem_threshold:
        penalties += penalty_config.get("mem_high_penalty", 20)   # High current memory load

    # Sustained load penalty - penalize sustained high averages
    # Sustained load penalties - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if long_cpu > 90:
            penalties += penalty_config.get("cpu_sustained_critical", 150)  # Critically high sustained CPU
        elif long_cpu > 80:
            penalties += penalty_config.get("cpu_sustained_very_high", 80)   # Very high sustained CPU
        elif long_cpu > 70:
            penalties += penalty_config.get("cpu_sustained_high", 40)   # High sustained CPU

        if long_mem > 90:
            penalties += penalty_config.get("mem_sustained_critical", 150)  # Critically high sustained memory
        elif long_mem > 80:
            penalties += penalty_config.get("mem_sustained_very_high", 80)   # Very high sustained memory
        elif long_mem > 70:
            penalties += penalty_config.get("mem_sustained_high", 40)   # High sustained memory

    # IOWait penalty - penalize high disk wait times (current always applies)
    if immediate_iowait > 30:
        penalties += penalty_config.get("iowait_extreme_penalty", 80)   # Extreme current IOWait
    elif immediate_iowait > 20:
        penalties += penalty_config.get("iowait_very_high_penalty", 40)   # Very high current IOWait
    elif immediate_iowait > 10:
        penalties += penalty_config.get("iowait_high_penalty", 20)   # High current IOWait

    # Sustained IOWait penalties - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if long_iowait > 20:
            penalties += penalty_config.get("iowait_sustained_critical", 60)   # Critically high sustained IOWait
        elif long_iowait > 15:
            penalties += penalty_config.get("iowait_sustained_high", 30)   # High sustained IOWait
        elif long_iowait > 10:
            penalties += penalty_config.get("iowait_sustained_elevated", 15)   # Elevated sustained IOWait

    # Trend penalty - only apply if using historical data (24h or 7d weights > 0)
    if weight_24h > 0 or weight_7d > 0:
        if cpu_trend == "rising":
            penalties += penalty_config.get("cpu_trend_rising_penalty", 15)  # Rising CPU trend
        if mem_trend == "rising":
            penalties += penalty_config.get("mem_trend_rising_penalty", 15)  # Rising memory trend

    # Max spike penalty - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if max_cpu_week > 95:
            penalties += penalty_config.get("cpu_spike_extreme", 30)  # Extreme CPU spike
        elif max_cpu_week > 90:
            penalties += penalty_config.get("cpu_spike_very_high", 20)  # Very high CPU spike
        elif max_cpu_week > 80:
            penalties += penalty_config.get("cpu_spike_high", 10)  # High CPU spike
        elif max_cpu_week > 70:
            penalties += penalty_config.get("cpu_spike_moderate", 5)   # Moderate CPU spike

        if max_mem_week > 95:
            penalties += penalty_config.get("mem_spike_extreme", 30)  # Extreme memory spike
        elif max_mem_week > 90:
            penalties += penalty_config.get("mem_spike_very_high", 20)  # Very high memory spike
        elif max_mem_week > 85:
            penalties += penalty_config.get("mem_spike_high", 10)  # High memory spike
        elif max_mem_week > 75:
            penalties += penalty_config.get("mem_spike_moderate", 5)   # Moderate memory spike

    # Predict post-migration load
    predicted = predict_post_migration_load(target_node, guest, adding=True, penalty_config=penalty_config)

    # Account for pending migrations to this target
    if target_name in pending_target_guests:
        for pending_guest in pending_target_guests[target_name]:
            predicted = predict_post_migration_load(
                {"metrics": {"current_cpu": predicted["cpu"], "current_mem": predicted["mem"], "current_iowait": predicted["iowait"]},
                 "total_mem_gb": target_node.get("total_mem_gb", 1),
                 "cpu_cores": target_node.get("cpu_cores", 1)},
                pending_guest,
                adding=True,
                penalty_config=penalty_config
            )

    # Penalize if predicted load exceeds thresholds (don't disqualify)
    if predicted["cpu"] > (cpu_threshold + cpu_offset_2):
        penalties += penalty_config.get("predicted_cpu_extreme_penalty", 100)  # Predicted CPU way over threshold
    elif predicted["cpu"] > (cpu_threshold + cpu_offset_1):
        penalties += penalty_config.get("predicted_cpu_high_penalty", 50)   # Predicted CPU significantly over threshold
    elif predicted["cpu"] > cpu_threshold:
        penalties += penalty_config.get("predicted_cpu_over_penalty", 25)   # Predicted CPU over threshold

    if predicted["mem"] > (mem_threshold + mem_offset_2):
        penalties += penalty_config.get("predicted_mem_extreme_penalty", 100)  # Predicted memory way over threshold
    elif predicted["mem"] > (mem_threshold + mem_offset_1):
        penalties += penalty_config.get("predicted_mem_high_penalty", 50)   # Predicted memory significantly over threshold
    elif predicted["mem"] > mem_threshold:
        penalties += penalty_config.get("predicted_mem_over_penalty", 25)   # Predicted memory over threshold

    # Health score (current state)
    health_score = calculate_node_health_score(target_node, metrics, penalty_config=penalty_config)

    # Predicted health after migration
    predicted_health = (
        predicted["cpu"] * 0.30 +
        predicted["mem"] * 0.30 +
        predicted["iowait"] * 0.20 +
        current_cpu * 0.10 +  # Factor in current state
        current_mem * 0.10
    )

    # Headroom score (how much capacity remains) - prefer nodes with more headroom
    cpu_headroom = 100 - predicted["cpu"]
    mem_headroom = 100 - predicted["mem"]
    headroom_score = 100 - (cpu_headroom * 0.5 + mem_headroom * 0.5)  # Lower = more headroom

    # Storage availability score
    storage_score = 0
    storage_list = target_node.get("storage", [])
    if storage_list:
        # Prefer nodes with more available storage
        avg_storage_usage = sum(s.get("usage_pct", 0) for s in storage_list if s.get("active", False)) / len(storage_list) if storage_list else 0
        storage_score = avg_storage_usage  # Lower = more available

    # Combined weighted score (lower is better)
    # Current health: 25%, Predicted health: 40%, Headroom: 20%, Storage: 15%
    # Plus all accumulated penalties (current load, sustained load, trends, spikes, predicted)
    total_score = (
        health_score * 0.25 +
        predicted_health * 0.40 +
        headroom_score * 0.20 +
        storage_score * 0.15 +
        penalties  # All accumulated penalties
    )

    return total_score
