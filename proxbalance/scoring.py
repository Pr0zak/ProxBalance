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
from typing import Any, Dict, List, Optional, Tuple, Union

# Lazy import to avoid circular dependency — used only when trend data is available
_trend_analysis = None


def _get_trend_analysis():
    """Lazy import of trend_analysis module."""
    global _trend_analysis
    if _trend_analysis is None:
        try:
            from proxbalance import trend_analysis as ta
            _trend_analysis = ta
        except Exception:
            pass
    return _trend_analysis


# ---------------------------------------------------------------------------
# Default penalty scoring configuration
# These values can be customized via the settings UI
# ---------------------------------------------------------------------------

DEFAULT_PENALTY_CONFIG = {
    # Current load penalties (immediate state)
    # CPU is the primary resource that fluctuates — penalize heavily.
    # Memory is mostly static in Proxmox (fixed VM/CT allocations) — only
    # penalize when approaching host capacity or exceeding thresholds.
    "cpu_high_penalty": 20,           # Penalty when CPU > threshold
    "cpu_very_high_penalty": 50,      # Penalty when CPU > threshold+10
    "cpu_extreme_penalty": 100,       # Penalty when CPU > threshold+20
    "mem_high_penalty": 8,            # Penalty when Memory > threshold
    "mem_very_high_penalty": 20,      # Penalty when Memory > threshold+10
    "mem_extreme_penalty": 50,        # Penalty when Memory > threshold+20

    # Sustained load penalties (7-day averages)
    "cpu_sustained_high": 40,         # Penalty when 7d avg CPU > 70%
    "cpu_sustained_very_high": 80,    # Penalty when 7d avg CPU > 80%
    "cpu_sustained_critical": 150,    # Penalty when 7d avg CPU > 90%
    "mem_sustained_high": 10,         # Penalty when 7d avg Memory > 70%
    "mem_sustained_very_high": 25,    # Penalty when 7d avg Memory > 80%
    "mem_sustained_critical": 60,     # Penalty when 7d avg Memory > 90%

    # IOWait penalties
    "iowait_high_penalty": 20,        # Penalty when immediate IOWait > 10%
    "iowait_very_high_penalty": 40,   # Penalty when immediate IOWait > 20%
    "iowait_extreme_penalty": 80,     # Penalty when immediate IOWait > 30%
    "iowait_sustained_elevated": 15,  # Penalty when 7d avg IOWait > 10%
    "iowait_sustained_high": 30,      # Penalty when 7d avg IOWait > 15%
    "iowait_sustained_critical": 60,  # Penalty when 7d avg IOWait > 20%

    # Trend penalties
    "cpu_trend_rising_penalty": 15,   # Penalty for rising CPU trend
    "mem_trend_rising_penalty": 5,    # Penalty for rising Memory trend (low — mem is static)

    # Spike penalties (max values in week)
    "cpu_spike_moderate": 5,          # Penalty when max CPU > 70%
    "cpu_spike_high": 10,             # Penalty when max CPU > 80%
    "cpu_spike_very_high": 20,        # Penalty when max CPU > 90%
    "cpu_spike_extreme": 30,          # Penalty when max CPU > 95%
    "mem_spike_moderate": 2,          # Penalty when max Memory > 85%
    "mem_spike_high": 5,              # Penalty when max Memory > 90%
    "mem_spike_very_high": 10,        # Penalty when max Memory > 95%
    "mem_spike_extreme": 20,          # Penalty when max Memory > 98%

    # Predicted post-migration penalties
    "predicted_cpu_over_penalty": 25,        # Penalty when predicted CPU > threshold
    "predicted_cpu_high_penalty": 50,        # Penalty when predicted CPU > threshold+10
    "predicted_cpu_extreme_penalty": 100,    # Penalty when predicted CPU > threshold+20
    "predicted_mem_over_penalty": 10,        # Penalty when predicted Memory > threshold
    "predicted_mem_high_penalty": 25,        # Penalty when predicted Memory > threshold+10
    "predicted_mem_extreme_penalty": 50,     # Penalty when predicted Memory > threshold+20

    # Memory overcommit penalties (running guests' allocated memory > physical RAM)
    # Proxmox commonly overcommits memory via ballooning, so only penalize
    # meaningfully above 1.2x (moderate) and heavily above 1.5x (severe).
    "mem_overcommit_penalty": 8,             # Penalty when overcommit ratio > 1.2
    "mem_overcommit_high_penalty": 25,       # Penalty when overcommit ratio > 1.5

    # Threshold offsets
    "cpu_threshold_offset_1": 10,     # First threshold offset (used for +10 calculations)
    "cpu_threshold_offset_2": 20,     # Second threshold offset (used for +20 calculations)
    "mem_threshold_offset_1": 10,     # First threshold offset (used for +10 calculations)
    "mem_threshold_offset_2": 20,     # Second threshold offset (used for +20 calculations)

    # Score improvement requirements
    "min_score_improvement": 15,      # Minimum score improvement to recommend migration
    "maintenance_score_boost": 100,   # Extra score added to maintenance nodes for evacuation priority
    "iowait_score_boost": 30,        # Extra score added to IOWait-stressed nodes to trigger migrations

    # Time period weighting (for historical data)
    "weight_current": 0.5,            # Weight for current/immediate metrics (50%)
    "weight_24h": 0.3,                # Weight for 24-hour average metrics (30%)
    "weight_7d": 0.2,                 # Weight for 7-day average metrics (20%)

    # Intelligent migration: cluster convergence
    "cluster_convergence_threshold": 8.0,  # Suppress recommendations when node spread < this %

    # Intelligent migration: seasonal baseline
    "seasonal_baseline": {
        "enabled": False,
        "sigma_threshold": 2.0,       # Only flag overload if > N sigma above seasonal baseline
    },
}


# ---------------------------------------------------------------------------
# Scoring functions
# ---------------------------------------------------------------------------

def calculate_intelligent_thresholds(nodes: Dict[str, Dict[str, Any]], penalty_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
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


def calculate_node_health_score(node: Dict[str, Any], metrics: Dict[str, Any], penalty_config: Optional[Dict[str, Any]] = None) -> float:
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
    # CPU dominates because it fluctuates with workload.
    # Memory is mostly static in Proxmox (fixed VM/CT allocations) so it
    # matters mainly for capacity (can-it-fit), not for migration triggers.
    # CPU: 40%, Memory: 15%, IOWait: 25%, Load: 10%, Storage: 10%
    health_score = (
        cpu * 0.40 +
        mem * 0.15 +
        iowait * 0.25 +
        load_per_core * 0.10 +
        storage_pressure * 0.10
    )

    return health_score


def predict_post_migration_load(node: Dict[str, Any], guest: Dict[str, Any], adding: bool = True, penalty_config: Optional[Dict[str, Any]] = None, guest_profile: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
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

    # Phase 3c: Profile-based adjustments for better load prediction
    if guest_profile and guest_profile.get('behavior') != 'unknown':
        behavior = guest_profile['behavior']
        peak_mult = guest_profile.get('peak_multiplier', 1.0)
        growth_rate = guest_profile.get('growth_rate_per_day', 0)

        if behavior == 'bursty':
            # Use p95 load for bursty guests instead of current snapshot
            guest_cpu_impact *= max(1.0, peak_mult * 0.8)  # Dampen slightly
        elif behavior == 'growing':
            # Project 48 hours of growth
            growth_factor = 1.0 + (growth_rate * 2 / 100)
            guest_cpu_impact *= min(2.0, max(1.0, growth_factor))  # Cap at 2x

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


def calculate_target_node_score(target_node: Dict[str, Any], guest: Dict[str, Any], pending_target_guests: Dict[str, List[Dict[str, Any]]], cpu_threshold: float, mem_threshold: float, penalty_config: Optional[Dict[str, Any]] = None, return_details: bool = False, guest_profile: Optional[Dict[str, Any]] = None) -> Union[float, Tuple[float, Dict[str, Any]]]:
    """
    Calculate weighted score for target node suitability (lower is better).
    Considers current load, predicted post-migration load, storage availability, and headroom.

    When return_details=True, returns (score, details_dict) with full penalty breakdown.
    When return_details=False (default), returns just the score float for backward compatibility.
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

    # Initialize penalty tracking — individual categories for breakdown
    penalty_breakdown = {
        "current_cpu": 0,
        "current_mem": 0,
        "sustained_cpu": 0,
        "sustained_mem": 0,
        "iowait_current": 0,
        "iowait_sustained": 0,
        "cpu_trend": 0,
        "mem_trend": 0,
        "cpu_spikes": 0,
        "mem_spikes": 0,
        "predicted_cpu": 0,
        "predicted_mem": 0,
    }
    cpu_stability_factor = 1.0  # Default: no adjustment (overridden by trend analysis)

    # Get configurable threshold offsets
    cpu_offset_1 = penalty_config.get("cpu_threshold_offset_1", 10)
    cpu_offset_2 = penalty_config.get("cpu_threshold_offset_2", 20)
    mem_offset_1 = penalty_config.get("mem_threshold_offset_1", 10)
    mem_offset_2 = penalty_config.get("mem_threshold_offset_2", 20)

    # Current load penalty - heavily penalize nodes with high current load
    if immediate_cpu > (cpu_threshold + cpu_offset_2):
        penalty_breakdown["current_cpu"] = penalty_config.get("cpu_extreme_penalty", 100)
    elif immediate_cpu > (cpu_threshold + cpu_offset_1):
        penalty_breakdown["current_cpu"] = penalty_config.get("cpu_very_high_penalty", 50)
    elif immediate_cpu > cpu_threshold:
        penalty_breakdown["current_cpu"] = penalty_config.get("cpu_high_penalty", 20)

    if immediate_mem > (mem_threshold + mem_offset_2):
        penalty_breakdown["current_mem"] = penalty_config.get("mem_extreme_penalty", 100)
    elif immediate_mem > (mem_threshold + mem_offset_1):
        penalty_breakdown["current_mem"] = penalty_config.get("mem_very_high_penalty", 50)
    elif immediate_mem > mem_threshold:
        penalty_breakdown["current_mem"] = penalty_config.get("mem_high_penalty", 20)

    # Sustained load penalties - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if long_cpu > 90:
            penalty_breakdown["sustained_cpu"] = penalty_config.get("cpu_sustained_critical", 150)
        elif long_cpu > 80:
            penalty_breakdown["sustained_cpu"] = penalty_config.get("cpu_sustained_very_high", 80)
        elif long_cpu > 70:
            penalty_breakdown["sustained_cpu"] = penalty_config.get("cpu_sustained_high", 40)

        if long_mem > 95:
            penalty_breakdown["sustained_mem"] = penalty_config.get("mem_sustained_critical", 60)
        elif long_mem > 90:
            penalty_breakdown["sustained_mem"] = penalty_config.get("mem_sustained_very_high", 25)
        elif long_mem > 80:
            penalty_breakdown["sustained_mem"] = penalty_config.get("mem_sustained_high", 10)

    # IOWait penalty - penalize high disk wait times (current always applies)
    if immediate_iowait > 30:
        penalty_breakdown["iowait_current"] = penalty_config.get("iowait_extreme_penalty", 80)
    elif immediate_iowait > 20:
        penalty_breakdown["iowait_current"] = penalty_config.get("iowait_very_high_penalty", 40)
    elif immediate_iowait > 10:
        penalty_breakdown["iowait_current"] = penalty_config.get("iowait_high_penalty", 20)

    # Sustained IOWait penalties - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if long_iowait > 20:
            penalty_breakdown["iowait_sustained"] = penalty_config.get("iowait_sustained_critical", 60)
        elif long_iowait > 15:
            penalty_breakdown["iowait_sustained"] = penalty_config.get("iowait_sustained_high", 30)
        elif long_iowait > 10:
            penalty_breakdown["iowait_sustained"] = penalty_config.get("iowait_sustained_elevated", 15)

    # Trend penalty - use quantified trend data from metrics store when available,
    # fall back to simple rising/falling/stable labels from cluster_cache
    _ta = _get_trend_analysis()
    _node_trend_data = None
    if _ta and (weight_24h > 0 or weight_7d > 0):
        try:
            _node_trend_data = _ta.analyze_node_trends(
                target_name,
                lookback_hours=168,
                cpu_threshold=cpu_threshold,
                mem_threshold=mem_threshold,
            )
            cpu_rate = _node_trend_data.get("cpu", {}).get("rate_per_day", 0)
            mem_rate = _node_trend_data.get("memory", {}).get("rate_per_day", 0)
            node_stability = _node_trend_data.get("overall_stability", 50)

            # Quantified trend penalties: scale with rate of change
            base_trend_penalty = penalty_config.get("cpu_trend_rising_penalty", 15)
            if cpu_rate > 3.0:
                penalty_breakdown["cpu_trend"] = int(base_trend_penalty * 3)
            elif cpu_rate > 1.0:
                penalty_breakdown["cpu_trend"] = int(base_trend_penalty * 2)
            elif cpu_rate > 0.5:
                penalty_breakdown["cpu_trend"] = base_trend_penalty

            base_mem_trend_penalty = penalty_config.get("mem_trend_rising_penalty", 15)
            if mem_rate > 3.0:
                penalty_breakdown["mem_trend"] = int(base_mem_trend_penalty * 3)
            elif mem_rate > 1.0:
                penalty_breakdown["mem_trend"] = int(base_mem_trend_penalty * 2)
            elif mem_rate > 0.5:
                penalty_breakdown["mem_trend"] = base_mem_trend_penalty

            # CPU stability factor: scale CPU-related penalties by node volatility.
            # Stable nodes get CPU penalties *reduced* (the high reading is likely
            # transient); volatile nodes get penalties *inflated* (unpredictable).
            if node_stability >= 80:
                cpu_stability_factor = 0.7   # Excellent — reduce CPU penalties 30%
            elif node_stability >= 60:
                cpu_stability_factor = 0.85  # Good — reduce CPU penalties 15%
            elif node_stability < 40:
                cpu_stability_factor = 1.3   # Volatile — inflate CPU penalties 30%
            else:
                cpu_stability_factor = 1.0   # Moderate — no change

            for _cpu_key in ("current_cpu", "sustained_cpu", "cpu_trend",
                             "cpu_spikes", "predicted_cpu"):
                if _cpu_key in penalty_breakdown:
                    penalty_breakdown[_cpu_key] = int(
                        round(penalty_breakdown[_cpu_key] * cpu_stability_factor)
                    )
        except Exception:
            _node_trend_data = None

    # Fallback to simple trend labels if metrics store analysis failed
    if _node_trend_data is None and (weight_24h > 0 or weight_7d > 0):
        if cpu_trend == "rising":
            penalty_breakdown["cpu_trend"] = penalty_config.get("cpu_trend_rising_penalty", 15)
        if mem_trend == "rising":
            penalty_breakdown["mem_trend"] = penalty_config.get("mem_trend_rising_penalty", 15)

    # Max spike penalty - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if max_cpu_week > 95:
            penalty_breakdown["cpu_spikes"] = penalty_config.get("cpu_spike_extreme", 30)
        elif max_cpu_week > 90:
            penalty_breakdown["cpu_spikes"] = penalty_config.get("cpu_spike_very_high", 20)
        elif max_cpu_week > 80:
            penalty_breakdown["cpu_spikes"] = penalty_config.get("cpu_spike_high", 10)
        elif max_cpu_week > 70:
            penalty_breakdown["cpu_spikes"] = penalty_config.get("cpu_spike_moderate", 5)

        if max_mem_week > 98:
            penalty_breakdown["mem_spikes"] = penalty_config.get("mem_spike_extreme", 20)
        elif max_mem_week > 95:
            penalty_breakdown["mem_spikes"] = penalty_config.get("mem_spike_very_high", 10)
        elif max_mem_week > 90:
            penalty_breakdown["mem_spikes"] = penalty_config.get("mem_spike_high", 5)
        elif max_mem_week > 85:
            penalty_breakdown["mem_spikes"] = penalty_config.get("mem_spike_moderate", 5)

    # Predict post-migration load
    predicted = predict_post_migration_load(target_node, guest, adding=True, penalty_config=penalty_config, guest_profile=guest_profile)

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
        penalty_breakdown["predicted_cpu"] = penalty_config.get("predicted_cpu_extreme_penalty", 100)
    elif predicted["cpu"] > (cpu_threshold + cpu_offset_1):
        penalty_breakdown["predicted_cpu"] = penalty_config.get("predicted_cpu_high_penalty", 50)
    elif predicted["cpu"] > cpu_threshold:
        penalty_breakdown["predicted_cpu"] = penalty_config.get("predicted_cpu_over_penalty", 25)

    if predicted["mem"] > (mem_threshold + mem_offset_2):
        penalty_breakdown["predicted_mem"] = penalty_config.get("predicted_mem_extreme_penalty", 100)
    elif predicted["mem"] > (mem_threshold + mem_offset_1):
        penalty_breakdown["predicted_mem"] = penalty_config.get("predicted_mem_high_penalty", 50)
    elif predicted["mem"] > mem_threshold:
        penalty_breakdown["predicted_mem"] = penalty_config.get("predicted_mem_over_penalty", 25)

    # Memory overcommit penalty — running guests' allocated memory exceeds physical RAM.
    # Proxmox commonly overcommits via ballooning, so use relaxed thresholds:
    # 1.2x is moderate (ballooning is active), 1.5x is severe (risk of OOM).
    overcommit_ratio = target_node.get("mem_overcommit_ratio", 0)
    if overcommit_ratio > 1.5:
        penalty_breakdown["mem_overcommit"] = penalty_config.get("mem_overcommit_high_penalty", 25)
    elif overcommit_ratio > 1.2:
        penalty_breakdown["mem_overcommit"] = penalty_config.get("mem_overcommit_penalty", 8)

    # Cap total memory penalties to prevent memory from dominating the score.
    # Memory is mostly static in Proxmox (fixed allocations), so it should not
    # single-handedly make a node unsuitable — that's what the hard capacity
    # gate in recommendations.py is for.  CPU and IOWait are the real drivers.
    mem_penalty_keys = ("current_mem", "sustained_mem", "mem_spikes",
                        "mem_trend", "predicted_mem", "mem_overcommit")
    total_mem_penalties = sum(penalty_breakdown.get(k, 0) for k in mem_penalty_keys)
    mem_penalty_cap = 60  # Maximum combined memory penalty contribution
    if total_mem_penalties > mem_penalty_cap:
        # Scale all memory penalties proportionally to fit within the cap
        scale = mem_penalty_cap / total_mem_penalties
        for k in mem_penalty_keys:
            if k in penalty_breakdown and penalty_breakdown[k] > 0:
                penalty_breakdown[k] = int(round(penalty_breakdown[k] * scale))

    # Sum all penalties
    penalties = sum(penalty_breakdown.values())

    # Health score (current state)
    health_score = calculate_node_health_score(target_node, metrics, penalty_config=penalty_config)

    # Predicted health after migration
    # CPU-heavy weighting — memory is static, CPU drives actual migration value
    predicted_health = (
        predicted["cpu"] * 0.40 +
        predicted["mem"] * 0.15 +
        predicted["iowait"] * 0.25 +
        current_cpu * 0.15 +  # Factor in current CPU state
        current_mem * 0.05
    )

    # Headroom score (how much capacity remains) - prefer nodes with more headroom
    # CPU headroom weighted higher — memory capacity is a hard constraint checked
    # separately; CPU headroom indicates ability to absorb workload fluctuations
    cpu_headroom = 100 - predicted["cpu"]
    mem_headroom = 100 - predicted["mem"]
    headroom_score = 100 - (cpu_headroom * 0.65 + mem_headroom * 0.35)  # Lower = more headroom

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

    if not return_details:
        return total_score

    # Build detailed breakdown for transparency
    details = {
        "penalties": penalty_breakdown,
        "total_penalties": round(penalties, 1),
        "components": {
            "health_score": round(health_score, 1),
            "predicted_health": round(predicted_health, 1),
            "headroom_score": round(headroom_score, 1),
            "storage_score": round(storage_score, 1),
        },
        "component_weights": {
            "health": 0.25,
            "predicted": 0.40,
            "headroom": 0.20,
            "storage": 0.15,
        },
        "metrics": {
            "weighted_cpu": round(current_cpu, 1),
            "weighted_mem": round(current_mem, 1),
            "weighted_iowait": round(current_iowait, 1),
            "immediate_cpu": round(immediate_cpu, 1),
            "immediate_mem": round(immediate_mem, 1),
            "immediate_iowait": round(immediate_iowait, 1),
            "predicted_cpu": round(predicted["cpu"], 1),
            "predicted_mem": round(predicted["mem"], 1),
            "predicted_iowait": round(predicted["iowait"], 1),
            "cpu_headroom": round(cpu_headroom, 1),
            "mem_headroom": round(mem_headroom, 1),
            "cpu_trend": cpu_trend,
            "mem_trend": mem_trend,
            "max_cpu_week": round(max_cpu_week, 1),
            "max_mem_week": round(max_mem_week, 1),
        },
        "total_score": round(total_score, 1),
    }

    # Attach trend analysis data when available for UI transparency
    if _node_trend_data:
        details["trend_analysis"] = {
            "cpu_rate_per_day": _node_trend_data.get("cpu", {}).get("rate_per_day", 0),
            "cpu_direction": _node_trend_data.get("cpu", {}).get("direction", "unknown"),
            "mem_rate_per_day": _node_trend_data.get("memory", {}).get("rate_per_day", 0),
            "mem_direction": _node_trend_data.get("memory", {}).get("direction", "unknown"),
            "stability_score": _node_trend_data.get("overall_stability", 50),
            "stability_label": _node_trend_data.get("overall_stability_label", "unknown"),
            "cpu_stability_factor": cpu_stability_factor,
            "overall_direction": _node_trend_data.get("overall_direction", "unknown"),
            "data_quality": _node_trend_data.get("data_quality", {}),
        }

    return total_score, details


# ---------------------------------------------------------------------------
# Migration risk scoring
# ---------------------------------------------------------------------------

def calculate_migration_risk(guest: Dict[str, Any], source_node: Dict[str, Any], target_node: Dict[str, Any], cluster_health: float = 100.0) -> Dict[str, Any]:
    """
    Calculate a risk score (0-100, lower is safer) for a migration.

    Evaluates risk factors:
    - Guest size (30%): Larger memory = longer migration, more downtime risk
    - I/O activity (25%): High disk I/O during migration increases failure chance
    - Storage complexity (20%): Multi-disk, snapshot presence
    - Network sensitivity (15%): High network I/O suggests latency-sensitive workload
    - Cluster health (10%): If cluster is stressed, migration adds load

    Returns a dict with risk_score, risk_level, and risk_factors.
    """
    risk_factors = []

    # Factor 1: Guest size risk (30%) — based on allocated memory
    guest_mem_gb = guest.get("mem_max_gb", 0)
    if guest_mem_gb >= 64:
        size_risk = 100
        size_detail = f"Very large guest ({guest_mem_gb:.0f} GB RAM) — long migration time"
    elif guest_mem_gb >= 32:
        size_risk = 75
        size_detail = f"Large guest ({guest_mem_gb:.0f} GB RAM) — extended migration time"
    elif guest_mem_gb >= 16:
        size_risk = 50
        size_detail = f"Medium guest ({guest_mem_gb:.0f} GB RAM)"
    elif guest_mem_gb >= 4:
        size_risk = 25
        size_detail = f"Small-medium guest ({guest_mem_gb:.1f} GB RAM)"
    else:
        size_risk = 10
        size_detail = f"Small guest ({guest_mem_gb:.1f} GB RAM) — quick migration"

    risk_factors.append({
        "factor": "guest_memory",
        "value": f"{guest_mem_gb:.1f} GB",
        "risk": _risk_label(size_risk),
        "risk_score": size_risk,
        "detail": size_detail,
    })

    # Factor 2: I/O activity risk (25%) — disk read/write rates
    disk_read = guest.get("disk_read_bps", 0) / (1024 ** 2)  # MB/s
    disk_write = guest.get("disk_write_bps", 0) / (1024 ** 2)  # MB/s
    total_disk_io = disk_read + disk_write

    if total_disk_io >= 100:
        io_risk = 100
        io_detail = f"Very high disk I/O ({total_disk_io:.0f} MB/s) — migration may stall"
    elif total_disk_io >= 50:
        io_risk = 75
        io_detail = f"High disk I/O ({total_disk_io:.0f} MB/s) — may extend migration"
    elif total_disk_io >= 20:
        io_risk = 50
        io_detail = f"Moderate disk I/O ({total_disk_io:.0f} MB/s)"
    elif total_disk_io >= 5:
        io_risk = 25
        io_detail = f"Low disk I/O ({total_disk_io:.1f} MB/s)"
    else:
        io_risk = 5
        io_detail = f"Minimal disk I/O ({total_disk_io:.1f} MB/s)"

    risk_factors.append({
        "factor": "disk_io",
        "value": f"{total_disk_io:.1f} MB/s",
        "risk": _risk_label(io_risk),
        "risk_score": io_risk,
        "detail": io_detail,
    })

    # Factor 3: Storage complexity (20%) — disk count, local disks, snapshots
    local_disks = guest.get("local_disks", {})
    disk_count = local_disks.get("disk_count", 1)
    has_snapshots = guest.get("snapshots", 0) > 0
    guest_type = guest.get("type", "VM")
    has_bind_mounts = guest.get("mount_points", {}).get("has_shared_mount", False)

    storage_risk = 10  # base
    storage_details = []

    if disk_count > 4:
        storage_risk = max(storage_risk, 80)
        storage_details.append(f"{disk_count} disks")
    elif disk_count > 2:
        storage_risk = max(storage_risk, 50)
        storage_details.append(f"{disk_count} disks")
    elif disk_count > 1:
        storage_risk = max(storage_risk, 30)
        storage_details.append(f"{disk_count} disks")

    if has_snapshots:
        storage_risk = min(100, storage_risk + 20)
        storage_details.append("has snapshots")

    if has_bind_mounts:
        storage_risk = min(100, storage_risk + 15)
        storage_details.append("bind mounts")

    storage_value = f"{disk_count} disk(s)"
    if storage_details:
        storage_value = ", ".join(storage_details)

    risk_factors.append({
        "factor": "storage",
        "value": storage_value,
        "risk": _risk_label(storage_risk),
        "risk_score": storage_risk,
        "detail": f"Storage complexity: {storage_value}",
    })

    # Factor 4: Network sensitivity (15%) — based on network I/O rates
    net_in = guest.get("net_in_bps", 0) / (1024 ** 2)  # MB/s
    net_out = guest.get("net_out_bps", 0) / (1024 ** 2)  # MB/s
    total_net = net_in + net_out

    if total_net >= 100:
        net_risk = 90
        net_detail = f"Very high network I/O ({total_net:.0f} MB/s) — latency-sensitive"
    elif total_net >= 50:
        net_risk = 65
        net_detail = f"High network I/O ({total_net:.0f} MB/s)"
    elif total_net >= 10:
        net_risk = 35
        net_detail = f"Moderate network I/O ({total_net:.1f} MB/s)"
    else:
        net_risk = 10
        net_detail = f"Low network I/O ({total_net:.1f} MB/s)"

    risk_factors.append({
        "factor": "network_io",
        "value": f"{total_net:.1f} MB/s",
        "risk": _risk_label(net_risk),
        "risk_score": net_risk,
        "detail": net_detail,
    })

    # Factor 5: Cluster health risk (10%) — stressed cluster = riskier migration
    if cluster_health < 30:
        cluster_risk = 90
        cluster_detail = "Cluster under heavy stress — migration adds load"
    elif cluster_health < 50:
        cluster_risk = 60
        cluster_detail = "Cluster moderately stressed"
    elif cluster_health < 70:
        cluster_risk = 30
        cluster_detail = "Cluster in fair health"
    else:
        cluster_risk = 10
        cluster_detail = "Cluster healthy — safe to migrate"

    risk_factors.append({
        "factor": "cluster_health",
        "value": f"{cluster_health:.0f}/100",
        "risk": _risk_label(cluster_risk),
        "risk_score": cluster_risk,
        "detail": cluster_detail,
    })

    # Weighted combination
    risk_score = round(
        size_risk * 0.30 +
        io_risk * 0.25 +
        storage_risk * 0.20 +
        net_risk * 0.15 +
        cluster_risk * 0.10,
        1,
    )

    # Determine risk level
    if risk_score <= 25:
        risk_level = "low"
    elif risk_score <= 50:
        risk_level = "moderate"
    elif risk_score <= 75:
        risk_level = "high"
    else:
        risk_level = "very_high"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
    }


def _risk_label(score: int) -> str:
    """Map a numeric risk score to a label."""
    if score <= 25:
        return "low"
    elif score <= 50:
        return "medium"
    elif score <= 75:
        return "high"
    return "very_high"


# ---------------------------------------------------------------------------
# Re-exports for backwards compatibility
# ---------------------------------------------------------------------------

# project_trend moved to proxbalance.forecasting
from proxbalance.forecasting import project_trend  # noqa: E402, F401

# analyze_workload_patterns moved to proxbalance.patterns
from proxbalance.patterns import analyze_workload_patterns  # noqa: E402, F401
