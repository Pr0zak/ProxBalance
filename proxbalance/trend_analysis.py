"""
ProxBalance Trend Analysis Engine

Provides statistical trend analysis for node and guest performance metrics
using data from the persistent metrics store. Replaces the simple
"rising/falling/stable" labels with quantified trends, stability scores,
baseline comparisons, and threshold-crossing projections.
"""

import math
import statistics
from typing import Any, Dict, List, Optional, Tuple

from proxbalance.metrics_store import (
    get_node_history,
    get_guest_history,
    get_data_quality,
    get_metric_value,
    get_all_node_names,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Minimum data points required for meaningful trend analysis
MIN_SAMPLES_FOR_TREND = 4
MIN_SAMPLES_FOR_CONFIDENCE = 12
MIN_SAMPLES_FOR_BASELINE = 24

# Trend classification thresholds (rate per day as percentage points)
TREND_RISING_FAST = 3.0       # >= 3%/day is fast rise
TREND_RISING = 0.5            # >= 0.5%/day is rising
TREND_FALLING = -0.5          # <= -0.5%/day is falling
TREND_FALLING_FAST = -3.0     # <= -3%/day is fast fall

# Stability score thresholds (coefficient of variation)
STABILITY_EXCELLENT = 0.10    # CV < 10% = very stable
STABILITY_GOOD = 0.20         # CV < 20% = stable
STABILITY_MODERATE = 0.35     # CV < 35% = moderate
# Above 35% = volatile


# ---------------------------------------------------------------------------
# Core statistical helpers
# ---------------------------------------------------------------------------

def _linear_regression(x_vals: List[float], y_vals: List[float]) -> Tuple[float, float, float]:
    """Simple linear regression. Returns (slope, intercept, r_squared).

    Uses the least-squares method.
    """
    n = len(x_vals)
    if n < 2:
        return 0.0, 0.0, 0.0

    mean_x = statistics.mean(x_vals)
    mean_y = statistics.mean(y_vals)

    ss_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
    ss_xx = sum((x - mean_x) ** 2 for x in x_vals)
    ss_yy = sum((y - mean_y) ** 2 for y in y_vals)

    if ss_xx == 0:
        return 0.0, mean_y, 0.0

    slope = ss_xy / ss_xx
    intercept = mean_y - slope * mean_x

    if ss_yy == 0:
        r_squared = 1.0 if ss_xy == 0 else 0.0
    else:
        r_squared = (ss_xy ** 2) / (ss_xx * ss_yy)

    return slope, intercept, r_squared


def _classify_trend(rate_per_day: float) -> str:
    """Classify trend direction from rate of change per day."""
    if rate_per_day >= TREND_RISING_FAST:
        return "sustained_increase"
    elif rate_per_day >= TREND_RISING:
        return "rising"
    elif rate_per_day <= TREND_FALLING_FAST:
        return "sustained_decrease"
    elif rate_per_day <= TREND_FALLING:
        return "falling"
    else:
        return "stable"


def _stability_score(values: List[float]) -> int:
    """Calculate stability score (0-100) from a list of metric values.

    100 = perfectly stable, 0 = extremely volatile.
    """
    if len(values) < 2:
        return 50  # Unknown, return neutral

    mean_val = statistics.mean(values)
    if mean_val == 0:
        return 100  # No load = perfectly stable

    stdev = statistics.stdev(values)
    cv = stdev / abs(mean_val)  # Coefficient of variation

    if cv <= STABILITY_EXCELLENT:
        return max(90, 100 - int(cv * 100))
    elif cv <= STABILITY_GOOD:
        return max(70, 90 - int((cv - STABILITY_EXCELLENT) * 200))
    elif cv <= STABILITY_MODERATE:
        return max(40, 70 - int((cv - STABILITY_GOOD) * 200))
    else:
        return max(5, 40 - int((cv - STABILITY_MODERATE) * 100))


def _stability_label(score: int) -> str:
    """Human-readable stability label from score."""
    if score >= 80:
        return "stable"
    elif score >= 55:
        return "moderate"
    else:
        return "volatile"


# ---------------------------------------------------------------------------
# Per-metric trend analysis
# ---------------------------------------------------------------------------

def _analyze_metric_trend(
    samples: List[Dict],
    field: str,
    lookback_hours: int,
    threshold: Optional[float] = None,
) -> Dict[str, Any]:
    """Analyze trend for a single metric across historical samples.

    Returns a dict with direction, magnitude, confidence, projected value,
    stability, and optional threshold crossing estimate.
    """
    values = []
    timestamps = []

    for sample in samples:
        val = get_metric_value(sample, field)
        ts = sample.get("ts", 0)
        if val is not None and ts > 0:
            values.append(val)
            timestamps.append(ts)

    if len(values) < MIN_SAMPLES_FOR_TREND:
        return {
            "direction": "unknown",
            "rate_per_day": 0,
            "rate_display": "0%/day",
            "confidence": "low",
            "r_squared": 0,
            "current_avg": round(statistics.mean(values), 2) if values else 0,
            "stability_score": 50,
            "stability_label": "unknown",
            "projected_value": None,
            "hours_to_threshold": None,
            "data_points": len(values),
        }

    # Normalize timestamps to hours for numerical stability
    t0 = min(timestamps)
    x_hours = [(t - t0) / 3600 for t in timestamps]

    slope, intercept, r_squared = _linear_regression(x_hours, values)

    # Convert slope from per-hour to per-day
    rate_per_day = slope * 24

    direction = _classify_trend(rate_per_day)
    stab_score = _stability_score(values)

    # Confidence based on R² and sample count
    if r_squared >= 0.7 and len(values) >= MIN_SAMPLES_FOR_CONFIDENCE:
        confidence = "high"
    elif r_squared >= 0.4 and len(values) >= MIN_SAMPLES_FOR_TREND:
        confidence = "medium"
    else:
        confidence = "low"

    # Project value 48 hours ahead
    max_x = max(x_hours)
    projected_value = slope * (max_x + 48) + intercept
    projected_value = max(0, min(100, projected_value))

    # Current value (recent average of last few samples)
    recent_count = min(3, len(values))
    current_avg = statistics.mean(values[-recent_count:])

    # Threshold crossing estimate
    hours_to_threshold = None
    if threshold is not None and slope > 0 and current_avg < threshold:
        hours_remaining = (threshold - current_avg) / slope if slope > 0 else None
        if hours_remaining and hours_remaining > 0:
            hours_to_threshold = round(hours_remaining, 1)

    # Format rate display
    sign = "+" if rate_per_day >= 0 else ""
    rate_display = f"{sign}{rate_per_day:.1f}%/day"

    return {
        "direction": direction,
        "rate_per_day": round(rate_per_day, 2),
        "rate_display": rate_display,
        "confidence": confidence,
        "r_squared": round(r_squared, 3),
        "current_avg": round(current_avg, 2),
        "stability_score": stab_score,
        "stability_label": _stability_label(stab_score),
        "projected_value": round(projected_value, 2),
        "hours_to_threshold": hours_to_threshold,
        "data_points": len(values),
    }


# ---------------------------------------------------------------------------
# Baseline and anomaly detection
# ---------------------------------------------------------------------------

def _compute_baseline(
    samples: List[Dict], field: str, current_hour: int
) -> Optional[Dict[str, Any]]:
    """Compute the typical value for this metric at this hour of day.

    Groups historical samples by hour-of-day and returns stats for the
    matching hour bucket.
    """
    hourly_buckets: Dict[int, List[float]] = {}
    for sample in samples:
        ts = sample.get("ts", 0)
        if ts <= 0:
            continue
        from datetime import datetime, timezone
        hour = datetime.fromtimestamp(ts, tz=timezone.utc).hour
        val = get_metric_value(sample, field)
        if val is not None:
            hourly_buckets.setdefault(hour, []).append(val)

    bucket = hourly_buckets.get(current_hour, [])
    if len(bucket) < 3:
        return None

    avg = statistics.mean(bucket)
    std = statistics.stdev(bucket) if len(bucket) >= 2 else 0

    return {
        "baseline_avg": round(avg, 2),
        "baseline_std": round(std, 2),
        "data_points": len(bucket),
    }


def _anomaly_sigma(current_value: float, baseline: Optional[Dict]) -> Optional[float]:
    """Calculate sigma deviation from baseline. Returns None if no baseline."""
    if not baseline or baseline["baseline_std"] == 0:
        return None
    return round((current_value - baseline["baseline_avg"]) / baseline["baseline_std"], 2)


# ---------------------------------------------------------------------------
# Public API: Node trend analysis
# ---------------------------------------------------------------------------

def analyze_node_trends(
    node_name: str,
    lookback_hours: int = 168,
    cpu_threshold: float = 60.0,
    mem_threshold: float = 70.0,
    iowait_threshold: float = 30.0,
) -> Dict[str, Any]:
    """Comprehensive trend analysis for a single node.

    Args:
        node_name: Proxmox node name.
        lookback_hours: How far back to look (default 7 days).
        cpu_threshold: CPU threshold for crossing projection.
        mem_threshold: Memory threshold for crossing projection.
        iowait_threshold: IOWait threshold for crossing projection.

    Returns:
        Dict with per-metric trends, stability scores, baseline info,
        and overall node trend summary.
    """
    samples = get_node_history(node_name, lookback_hours)
    quality = get_data_quality(node_name)

    from datetime import datetime, timezone
    current_hour = datetime.now(timezone.utc).hour

    # Analyze each metric
    cpu_trend = _analyze_metric_trend(samples, "cpu", lookback_hours, cpu_threshold)
    mem_trend = _analyze_metric_trend(samples, "memory", lookback_hours, mem_threshold)
    iowait_trend = _analyze_metric_trend(samples, "iowait", lookback_hours, iowait_threshold)

    # Baseline comparison
    cpu_baseline = _compute_baseline(samples, "cpu", current_hour)
    mem_baseline = _compute_baseline(samples, "memory", current_hour)

    cpu_sigma = _anomaly_sigma(cpu_trend["current_avg"], cpu_baseline)
    mem_sigma = _anomaly_sigma(mem_trend["current_avg"], mem_baseline)

    # Overall stability (weighted average)
    overall_stability = int(
        cpu_trend["stability_score"] * 0.4
        + mem_trend["stability_score"] * 0.4
        + iowait_trend["stability_score"] * 0.2
    )

    # Overall direction summary
    directions = [cpu_trend["direction"], mem_trend["direction"]]
    if any(d in ("sustained_increase",) for d in directions):
        overall_direction = "degrading"
    elif any(d == "rising" for d in directions):
        overall_direction = "warming"
    elif all(d in ("stable", "falling", "sustained_decrease") for d in directions):
        overall_direction = "healthy"
    else:
        overall_direction = "stable"

    return {
        "node": node_name,
        "lookback_hours": lookback_hours,
        "data_quality": quality,
        "cpu": cpu_trend,
        "memory": mem_trend,
        "iowait": iowait_trend,
        "cpu_baseline": cpu_baseline,
        "mem_baseline": mem_baseline,
        "cpu_above_baseline": cpu_sigma is not None and cpu_sigma > 2.0,
        "cpu_baseline_sigma": cpu_sigma,
        "mem_above_baseline": mem_sigma is not None and mem_sigma > 2.0,
        "mem_baseline_sigma": mem_sigma,
        "overall_stability": overall_stability,
        "overall_stability_label": _stability_label(overall_stability),
        "overall_direction": overall_direction,
    }


# ---------------------------------------------------------------------------
# Public API: Guest trend analysis
# ---------------------------------------------------------------------------

def analyze_guest_trends(
    vmid: str,
    lookback_hours: int = 168,
) -> Dict[str, Any]:
    """Comprehensive trend analysis for a single guest (VM/CT).

    Args:
        vmid: Guest VMID as string.
        lookback_hours: How far back to look (default 7 days).

    Returns:
        Dict with per-metric trends, stability, growth rate, and
        migration impact history.
    """
    samples = get_guest_history(str(vmid), lookback_hours)

    cpu_trend = _analyze_metric_trend(samples, "cpu", lookback_hours)
    mem_trend = _analyze_metric_trend(samples, "memory", lookback_hours)

    # Detect node changes (implicit migration tracking)
    node_changes = []
    prev_node = None
    for sample in samples:
        node = sample.get("node", "")
        if node and node != prev_node and prev_node is not None:
            node_changes.append({
                "ts": sample.get("ts", 0),
                "from_node": prev_node,
                "to_node": node,
            })
        if node:
            prev_node = node

    # Overall guest behavior classification
    cpu_rate = abs(cpu_trend.get("rate_per_day", 0))
    mem_rate = abs(mem_trend.get("rate_per_day", 0))
    cpu_stab = cpu_trend.get("stability_score", 50)

    if cpu_trend["direction"] in ("sustained_increase", "rising") and cpu_rate > 1.0:
        behavior = "growing"
    elif cpu_stab < 40:
        behavior = "bursty"
    elif cpu_stab >= 75:
        behavior = "steady"
    else:
        behavior = "variable"

    # Detect peak hours
    peak_hours = _detect_peak_hours(samples, "cpu")

    return {
        "vmid": str(vmid),
        "lookback_hours": lookback_hours,
        "data_points": cpu_trend.get("data_points", 0),
        "cpu": cpu_trend,
        "memory": mem_trend,
        "behavior": behavior,
        "peak_hours": peak_hours,
        "migration_history": node_changes,
        "migration_count": len(node_changes),
    }


def _detect_peak_hours(samples: List[Dict], field: str) -> List[int]:
    """Detect typical peak usage hours for a metric."""
    from datetime import datetime, timezone

    hourly: Dict[int, List[float]] = {}
    for sample in samples:
        ts = sample.get("ts", 0)
        if ts <= 0:
            continue
        hour = datetime.fromtimestamp(ts, tz=timezone.utc).hour
        val = get_metric_value(sample, field)
        if val is not None:
            hourly.setdefault(hour, []).append(val)

    if not hourly:
        return []

    hourly_avgs = {h: statistics.mean(vals) for h, vals in hourly.items() if vals}
    if not hourly_avgs:
        return []

    overall_avg = statistics.mean(hourly_avgs.values())
    # Peak hours are those > 1.3x the overall average
    peaks = [h for h, avg in hourly_avgs.items() if avg > overall_avg * 1.3]
    return sorted(peaks)


# ---------------------------------------------------------------------------
# Public API: Node comparison
# ---------------------------------------------------------------------------

def compare_node_stability(node_a: str, node_b: str, lookback_hours: int = 168) -> Dict[str, Any]:
    """Compare stability between two nodes.

    Returns dict indicating which node is more stable and by how much.
    """
    trend_a = analyze_node_trends(node_a, lookback_hours)
    trend_b = analyze_node_trends(node_b, lookback_hours)

    stab_a = trend_a["overall_stability"]
    stab_b = trend_b["overall_stability"]

    if stab_a > stab_b:
        more_stable = node_a
        difference = stab_a - stab_b
    elif stab_b > stab_a:
        more_stable = node_b
        difference = stab_b - stab_a
    else:
        more_stable = "equal"
        difference = 0

    return {
        "node_a": {"name": node_a, "stability": stab_a, "direction": trend_a["overall_direction"]},
        "node_b": {"name": node_b, "stability": stab_b, "direction": trend_b["overall_direction"]},
        "more_stable": more_stable,
        "stability_difference": difference,
    }


# ---------------------------------------------------------------------------
# Public API: Cluster-wide trend summary
# ---------------------------------------------------------------------------

def get_cluster_trend_summary(
    lookback_hours: int = 168,
    cpu_threshold: float = 60.0,
    mem_threshold: float = 70.0,
) -> Dict[str, Any]:
    """Generate a cluster-wide trend summary for all known nodes.

    Returns per-node trend summaries, cluster direction, top movers,
    and data quality overview.
    """
    node_names = get_all_node_names()
    if not node_names:
        return {
            "nodes": {},
            "cluster_direction": "unknown",
            "top_movers": [],
            "data_available": False,
        }

    node_trends = {}
    for name in node_names:
        node_trends[name] = analyze_node_trends(
            name, lookback_hours, cpu_threshold, mem_threshold
        )

    # Cluster direction
    directions = [t["overall_direction"] for t in node_trends.values()]
    if any(d == "degrading" for d in directions):
        cluster_direction = "degrading"
    elif any(d == "warming" for d in directions):
        cluster_direction = "warming"
    else:
        cluster_direction = "healthy"

    # Top movers — nodes with biggest absolute rate of change
    movers = []
    for name, trends in node_trends.items():
        cpu_rate = abs(trends["cpu"].get("rate_per_day", 0))
        mem_rate = abs(trends["memory"].get("rate_per_day", 0))
        max_rate = max(cpu_rate, mem_rate)
        metric = "cpu" if cpu_rate >= mem_rate else "memory"
        movers.append({
            "node": name,
            "metric": metric,
            "rate_per_day": trends[metric]["rate_per_day"],
            "rate_display": trends[metric]["rate_display"],
            "direction": trends[metric]["direction"],
        })

    movers.sort(key=lambda m: abs(m["rate_per_day"]), reverse=True)

    return {
        "nodes": node_trends,
        "cluster_direction": cluster_direction,
        "top_movers": movers[:5],
        "data_available": True,
    }
