"""
ProxBalance Forecasting Module

Provides trend projection using linear regression and generates proactive
migration recommendations based on predicted threshold crossings. Also
manages score history snapshots for time-series analysis.
"""

import os
import sys
import json
from typing import Any, Dict, List
from datetime import datetime, timezone

from proxbalance.constants import SCORE_HISTORY_FILE, SCORE_HISTORY_MAX_ENTRIES
from proxbalance.scoring import calculate_node_health_score


def project_trend(values: List[float], timestamps: List[float], hours_ahead: float = 48) -> Dict[str, Any]:
    """
    Project a metric trend into the future using simple linear regression.

    Args:
        values: List of numeric metric values (e.g. CPU %, memory %).
        timestamps: List of corresponding Unix timestamps (seconds).
        hours_ahead: How many hours to project into the future (default 48).

    Returns a dict with:
        - current_value: Most recent value in the series.
        - projected_value: Predicted value at hours_ahead from now.
        - trend_rate_per_day: Units of change per day (positive = rising).
        - confidence: "high" | "medium" | "low" based on R² goodness of fit.
        - r_squared: Coefficient of determination (0-1).
    """
    n = len(values)
    if n < 2 or len(timestamps) < 2:
        last = values[-1] if values else 0.0
        return {
            "current_value": round(last, 2),
            "projected_value": round(last, 2),
            "trend_rate_per_day": 0.0,
            "confidence": "low",
            "r_squared": 0.0,
        }

    # Convert timestamps to hours relative to the first timestamp for numerical stability
    t0 = timestamps[0]
    x = [(t - t0) / 3600.0 for t in timestamps]  # hours since start
    y = list(values)

    # Simple linear regression: y = a + b*x
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)

    denominator = n * sum_x2 - sum_x * sum_x
    if abs(denominator) < 1e-12:
        # All x values are effectively the same — no trend determinable
        last = y[-1]
        return {
            "current_value": round(last, 2),
            "projected_value": round(last, 2),
            "trend_rate_per_day": 0.0,
            "confidence": "low",
            "r_squared": 0.0,
        }

    b = (n * sum_xy - sum_x * sum_y) / denominator  # slope (units per hour)
    a = (sum_y - b * sum_x) / n  # intercept

    # R² (coefficient of determination)
    y_mean = sum_y / n
    ss_tot = sum((yi - y_mean) ** 2 for yi in y)
    ss_res = sum((yi - (a + b * xi)) ** 2 for xi, yi in zip(x, y))

    if ss_tot < 1e-12:
        r_squared = 0.0  # All values are essentially the same
    else:
        r_squared = max(0.0, 1.0 - ss_res / ss_tot)

    # Confidence based on R²
    if r_squared >= 0.7:
        confidence = "high"
    elif r_squared >= 0.4:
        confidence = "medium"
    else:
        confidence = "low"

    # Current value (most recent data point)
    current_value = y[-1]

    # Projected value: extrapolate from the last timestamp by hours_ahead
    last_x = x[-1]
    projected_x = last_x + hours_ahead
    projected_value = a + b * projected_x

    # Trend rate per day (slope * 24 hours)
    trend_rate_per_day = b * 24.0

    return {
        "current_value": round(current_value, 2),
        "projected_value": round(projected_value, 2),
        "trend_rate_per_day": round(trend_rate_per_day, 2),
        "confidence": confidence,
        "r_squared": round(r_squared, 4),
    }


def generate_forecast_recommendations(nodes: Dict[str, Any], score_history_data: List[Dict[str, Any]], cpu_threshold: float, mem_threshold: float) -> List[Dict[str, Any]]:
    """
    Generate forecast recommendations by projecting metric trends into the future.

    Reads historical score snapshots and uses linear regression to identify nodes
    whose CPU or memory metrics are trending toward their thresholds. Generates
    proactive warnings before the threshold is actually crossed.

    Args:
        nodes: Current node data dict.
        score_history_data: List of score history snapshot dicts (from score_history.json).
        cpu_threshold: Current CPU threshold (e.g. 60.0).
        mem_threshold: Current memory threshold (e.g. 70.0).

    Returns:
        List of forecast dicts with type, node, metric, projections, and severity.
    """
    forecasts = []

    if not score_history_data or len(score_history_data) < 3:
        return forecasts

    # Filter to last 7 days of data
    now_ts = datetime.now(timezone.utc).timestamp()
    seven_days_ago = now_ts - (7 * 24 * 3600)

    recent_history = []
    for entry in score_history_data:
        ts_str = entry.get("timestamp", "")
        try:
            entry_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if entry_dt.timestamp() >= seven_days_ago:
                recent_history.append((entry_dt.timestamp(), entry))
        except (ValueError, TypeError):
            continue

    if len(recent_history) < 3:
        return forecasts

    # Sort by timestamp
    recent_history.sort(key=lambda x: x[0])

    # Get all online, non-maintenance node names
    online_nodes = set()
    for node_name, node in nodes.items():
        if node.get("status") == "online":
            online_nodes.add(node_name)

    if not online_nodes:
        return forecasts

    # For each online node, extract CPU and memory time series
    for node_name in online_nodes:
        cpu_values = []
        cpu_timestamps = []
        mem_values = []
        mem_timestamps = []

        for ts, entry in recent_history:
            node_data = entry.get("nodes", {}).get(node_name)
            if not node_data:
                continue

            cpu_val = node_data.get("cpu")
            mem_val = node_data.get("mem")

            if cpu_val is not None:
                cpu_values.append(float(cpu_val))
                cpu_timestamps.append(ts)

            if mem_val is not None:
                mem_values.append(float(mem_val))
                mem_timestamps.append(ts)

        # Project CPU trend
        if len(cpu_values) >= 3:
            cpu_projection = project_trend(cpu_values, cpu_timestamps, hours_ahead=48)
            current_cpu = cpu_projection["current_value"]
            projected_cpu = cpu_projection["projected_value"]

            # Only generate forecast if currently below threshold but projected to cross
            if current_cpu < cpu_threshold and projected_cpu >= cpu_threshold and cpu_projection["trend_rate_per_day"] > 0:
                # Estimate hours until crossing
                rate_per_hour = cpu_projection["trend_rate_per_day"] / 24.0
                if rate_per_hour > 0:
                    hours_to_crossing = (cpu_threshold - current_cpu) / rate_per_hour
                else:
                    hours_to_crossing = 48.0  # fallback

                # Determine severity based on time to crossing
                if hours_to_crossing < 12:
                    severity = "critical"
                elif hours_to_crossing <= 36:
                    severity = "warning"
                else:
                    severity = "info"

                hours_display = round(hours_to_crossing)
                forecasts.append({
                    "type": "forecast",
                    "node": node_name,
                    "metric": "cpu",
                    "current_value": round(current_cpu, 1),
                    "threshold": cpu_threshold,
                    "projected_value": round(projected_cpu, 1),
                    "trend_rate_per_day": cpu_projection["trend_rate_per_day"],
                    "estimated_hours_to_crossing": round(hours_to_crossing, 1),
                    "confidence": cpu_projection["confidence"],
                    "r_squared": cpu_projection["r_squared"],
                    "message": f"CPU on {node_name} trending toward {cpu_threshold:.0f}% threshold — projected to cross in ~{hours_display} hours",
                    "severity": severity,
                })

        # Project memory trend
        if len(mem_values) >= 3:
            mem_projection = project_trend(mem_values, mem_timestamps, hours_ahead=48)
            current_mem = mem_projection["current_value"]
            projected_mem = mem_projection["projected_value"]

            # Only generate forecast if currently below threshold but projected to cross
            if current_mem < mem_threshold and projected_mem >= mem_threshold and mem_projection["trend_rate_per_day"] > 0:
                # Estimate hours until crossing
                rate_per_hour = mem_projection["trend_rate_per_day"] / 24.0
                if rate_per_hour > 0:
                    hours_to_crossing = (mem_threshold - current_mem) / rate_per_hour
                else:
                    hours_to_crossing = 48.0  # fallback

                # Determine severity based on time to crossing
                if hours_to_crossing < 12:
                    severity = "critical"
                elif hours_to_crossing <= 36:
                    severity = "warning"
                else:
                    severity = "info"

                hours_display = round(hours_to_crossing)
                forecasts.append({
                    "type": "forecast",
                    "node": node_name,
                    "metric": "memory",
                    "current_value": round(current_mem, 1),
                    "threshold": mem_threshold,
                    "projected_value": round(projected_mem, 1),
                    "trend_rate_per_day": mem_projection["trend_rate_per_day"],
                    "estimated_hours_to_crossing": round(hours_to_crossing, 1),
                    "confidence": mem_projection["confidence"],
                    "r_squared": mem_projection["r_squared"],
                    "message": f"Memory on {node_name} trending toward {mem_threshold:.0f}% threshold — projected to cross in ~{hours_display} hours",
                    "severity": severity,
                })

    # Sort by severity (critical first) then by hours to crossing (soonest first)
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    forecasts.sort(key=lambda f: (severity_order.get(f["severity"], 3), f["estimated_hours_to_crossing"]))

    return forecasts


def save_score_snapshot(nodes: Dict[str, Any], recommendations: List[Dict[str, Any]], penalty_cfg: Dict[str, Any]) -> None:
    """
    Save a point-in-time snapshot of per-node scores to score_history.json.

    Each snapshot records score, suitability, CPU%, and memory% for every
    online node, plus the cluster health and recommendation count.
    Keeps at most SCORE_HISTORY_MAX_ENTRIES entries (oldest trimmed first).
    """
    try:
        node_snapshots = {}
        online_scores = []

        for node_name, node in nodes.items():
            if node.get("status") != "online":
                continue
            metrics = node.get("metrics", {})
            score = calculate_node_health_score(node, metrics, penalty_config=penalty_cfg)
            suitability = round(max(0, 100 - min(score, 100)), 1)
            cpu = round(metrics.get("current_cpu", 0), 1)
            mem = round(metrics.get("current_mem", 0), 1)

            node_snapshots[node_name] = {
                "score": round(score, 2),
                "suitability": suitability,
                "cpu": cpu,
                "mem": mem,
            }
            online_scores.append(score)

        # Cluster health: average suitability across online nodes
        cluster_health = 0.0
        if online_scores:
            avg_score = sum(online_scores) / len(online_scores)
            cluster_health = round(max(0, 100 - avg_score), 1)

        snapshot = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "nodes": node_snapshots,
            "cluster_health": cluster_health,
            "recommendation_count": len(recommendations),
        }

        # Load existing history
        history = []
        if os.path.exists(SCORE_HISTORY_FILE):
            try:
                with open(SCORE_HISTORY_FILE, 'r') as f:
                    history = json.load(f)
                if not isinstance(history, list):
                    history = []
            except (json.JSONDecodeError, IOError):
                history = []

        history.append(snapshot)

        # Trim to max entries
        if len(history) > SCORE_HISTORY_MAX_ENTRIES:
            history = history[-SCORE_HISTORY_MAX_ENTRIES:]

        with open(SCORE_HISTORY_FILE, 'w') as f:
            json.dump(history, f)

    except Exception as e:
        print(f"Warning: Failed to save score snapshot: {e}", file=sys.stderr)
