"""
ProxBalance Workload Pattern Recognition

Analyzes historical score data to detect recurring daily and weekly
workload patterns, burst detection, and optimal migration timing.
"""

from typing import Any, Dict, List, Optional


QUIET_STRETCH_HOURS = 3


def _resolve_tz(tz_name: Optional[str]):
    """Return a tzinfo for ``tz_name``, falling back to UTC when unset or unknown."""
    from datetime import timezone

    if not tz_name:
        return timezone.utc
    try:
        from zoneinfo import ZoneInfo

        return ZoneInfo(tz_name)
    except Exception:
        return timezone.utc


def quietest_stretch(hourly_avgs: Dict[int, float], length: int = QUIET_STRETCH_HOURS) -> Optional[Dict[str, float]]:
    """Find the contiguous ``length``-hour stretch with the lowest mean load.

    The search wraps midnight (22:00-01:00 is a valid stretch). Stretches
    containing an hour with no samples are skipped.

    Args:
        hourly_avgs: Mapping of hour-of-day (0-23) to average load.
        length: Stretch length in hours.

    Returns:
        ``{"start": int, "end": int, "avg": float}`` (``end`` is exclusive and
        taken modulo 24), or None when no complete stretch has data.
    """
    best = None
    for start in range(24):
        hours = [(start + i) % 24 for i in range(length)]
        if any(h not in hourly_avgs for h in hours):
            continue
        avg = sum(hourly_avgs[h] for h in hours) / length
        if best is None or avg < best["avg"]:
            best = {"start": start, "end": (start + length) % 24, "avg": avg}
    return best


def analyze_workload_patterns(score_history: List[Dict[str, Any]], node_name: str, tz_name: Optional[str] = None) -> Dict[str, Any]:
    """Analyze historical score data to detect recurring workload patterns.

    Identifies daily cycles (business-hours vs off-hours), weekly patterns,
    and burst detection using hour-of-day and day-of-week bucketing on
    historical score snapshots.

    Args:
        score_history: List of score snapshot dicts from score_history.json,
            each with 'timestamp' and 'nodes' dict.
        node_name: The node to analyze.
        tz_name: IANA timezone (e.g. the automation schedule's) used for
            hour-of-day and day-of-week bucketing. Defaults to UTC.

    Returns:
        A dict describing detected patterns::

            {
                "node": str,
                "data_points": int,
                "daily_pattern": { ... } or None,
                "weekly_pattern": { ... } or None,
                "burst_detection": { ... },
                "recommendation_timing": str or None,
            }
    """
    from datetime import datetime, timezone

    tzinfo = _resolve_tz(tz_name)
    result: Dict = {
        "node": node_name,
        "data_points": 0,
        "daily_pattern": None,
        "weekly_pattern": None,
        "burst_detection": {
            "detected": False,
            "recurring_bursts": 0,
            "burst_hours": [],
        },
        "recommendation_timing": None,
    }

    if not score_history or len(score_history) < 12:
        return result

    # Extract per-hour-of-day and per-day-of-week CPU values
    hourly_buckets: Dict[int, List[float]] = {h: [] for h in range(24)}
    daily_buckets: Dict[int, List[float]] = {d: [] for d in range(7)}

    for snapshot in score_history:
        node_data = snapshot.get("nodes", {}).get(node_name)
        if node_data is None:
            continue

        cpu = node_data.get("cpu", 0)

        ts_str = snapshot.get("timestamp", "")
        try:
            if ts_str.endswith("Z"):
                ts_str = ts_str[:-1] + "+00:00"
            ts = datetime.fromisoformat(ts_str)
        except (ValueError, TypeError):
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        ts = ts.astimezone(tzinfo)

        result["data_points"] += 1
        hourly_buckets[ts.hour].append(cpu)
        daily_buckets[ts.weekday()].append(cpu)

    if result["data_points"] < 12:
        return result

    # Compute hourly averages
    hourly_avgs = {}
    for h, vals in hourly_buckets.items():
        if vals:
            hourly_avgs[h] = sum(vals) / len(vals)

    if len(hourly_avgs) < 6:
        return result

    all_avgs = list(hourly_avgs.values())
    overall_avg = sum(all_avgs) / len(all_avgs)

    # Detect daily pattern: business hours (8-18) vs off-hours
    business_hours = [hourly_avgs.get(h) for h in range(8, 18) if h in hourly_avgs]
    off_hours = [hourly_avgs.get(h) for h in list(range(0, 8)) + list(range(18, 24)) if h in hourly_avgs]

    if business_hours and off_hours:
        biz_avg = sum(business_hours) / len(business_hours)
        off_avg = sum(off_hours) / len(off_hours)
        spread = abs(biz_avg - off_avg)

        if spread > 8:  # Significant difference between business and off hours
            peak_hours = sorted(hourly_avgs.keys(), key=lambda h: hourly_avgs[h], reverse=True)[:5]
            trough_hours = sorted(hourly_avgs.keys(), key=lambda h: hourly_avgs[h])[:5]

            confidence = "high" if spread > 20 else "medium" if spread > 12 else "low"

            result["daily_pattern"] = {
                "cycle_type": "daily",
                "peak_hours": sorted(peak_hours),
                "trough_hours": sorted(trough_hours),
                "peak_avg_cpu": round(max(biz_avg, off_avg), 1),
                "trough_avg_cpu": round(min(biz_avg, off_avg), 1),
                "business_hours_avg": round(biz_avg, 1),
                "off_hours_avg": round(off_avg, 1),
                "spread": round(spread, 1),
                "pattern_confidence": confidence,
            }

    # Detect weekly pattern
    daily_avgs = {}
    for d, vals in daily_buckets.items():
        if vals:
            daily_avgs[d] = sum(vals) / len(vals)

    if len(daily_avgs) >= 5:
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekday_vals = [daily_avgs.get(d) for d in range(5) if d in daily_avgs]
        weekend_vals = [daily_avgs.get(d) for d in range(5, 7) if d in daily_avgs]

        if weekday_vals and weekend_vals:
            wd_avg = sum(weekday_vals) / len(weekday_vals)
            we_avg = sum(weekend_vals) / len(weekend_vals)
            weekly_spread = abs(wd_avg - we_avg)

            if weekly_spread > 5:
                peak_days = sorted(daily_avgs.keys(), key=lambda d: daily_avgs[d], reverse=True)[:3]
                result["weekly_pattern"] = {
                    "cycle_type": "weekly",
                    "peak_days": [day_names[d] for d in sorted(peak_days)],
                    "weekday_avg": round(wd_avg, 1),
                    "weekend_avg": round(we_avg, 1),
                    "spread": round(weekly_spread, 1),
                    "pattern_confidence": "high" if weekly_spread > 15 else "medium",
                }

    # Burst detection: identify hours with consistently high CPU
    burst_threshold = overall_avg + 20
    burst_hours = []
    for h, avg in hourly_avgs.items():
        if avg > burst_threshold and len(hourly_buckets[h]) >= 3:
            burst_hours.append(h)

    if burst_hours:
        result["burst_detection"] = {
            "detected": True,
            "recurring_bursts": len(burst_hours),
            "burst_hours": sorted(burst_hours),
            "avg_burst_cpu": round(sum(hourly_avgs[h] for h in burst_hours) / len(burst_hours), 1),
            "threshold_used": round(burst_threshold, 1),
        }

    # Recommendation timing: the quietest contiguous stretch (wrapping
    # midnight). Picking the N lowest hours independently and reporting
    # min..max produced spans like "04:00-23:00" that were mostly busy.
    quiet = quietest_stretch(hourly_avgs)
    if quiet:
        result["quiet_window"] = {
            "start_hour": quiet["start"],
            "end_hour": quiet["end"],
            "avg_cpu": round(quiet["avg"], 1),
        }
        result["recommendation_timing"] = (
            f"Migrate during {quiet['start']:02d}:00-{quiet['end']:02d}:00 "
            f"when load is minimal (avg {quiet['avg']:.0f}%)"
        )

    return result


def get_node_seasonal_baseline(score_history: List[Dict[str, Any]], node_name: str, current_hour: int) -> Optional[Dict[str, float]]:
    """
    Calculate the node's typical CPU/memory at the current hour of day.

    Filters score history snapshots matching the given UTC hour and computes
    statistics. Requires at least 5 matching data points.

    Args:
        score_history: List of score snapshot dicts from score_history.json.
        node_name: The node to analyze.
        current_hour: The current UTC hour (0-23).

    Returns:
        Dict with avg_cpu, avg_mem, std_cpu, std_mem, data_points,
        or None if insufficient data.
    """
    from datetime import datetime as dt

    cpu_values: List[float] = []
    mem_values: List[float] = []

    for snapshot in score_history:
        node_data = snapshot.get('nodes', {}).get(node_name)
        if not node_data:
            continue

        ts_str = snapshot.get('timestamp', '')
        try:
            if ts_str.endswith('Z'):
                ts_str = ts_str[:-1] + '+00:00'
            ts = dt.fromisoformat(ts_str)
        except (ValueError, TypeError):
            continue

        if ts.hour == current_hour:
            cpu = node_data.get('cpu')
            mem = node_data.get('mem')
            if cpu is not None:
                cpu_values.append(float(cpu))
            if mem is not None:
                mem_values.append(float(mem))

    if len(cpu_values) < 5:
        return None

    avg_cpu = sum(cpu_values) / len(cpu_values)
    avg_mem = sum(mem_values) / len(mem_values) if mem_values else 0
    std_cpu = (sum((x - avg_cpu)**2 for x in cpu_values) / len(cpu_values)) ** 0.5
    std_mem = (sum((x - avg_mem)**2 for x in mem_values) / len(mem_values)) ** 0.5 if mem_values else 0

    return {
        "avg_cpu": round(avg_cpu, 1),
        "avg_mem": round(avg_mem, 1),
        "std_cpu": round(std_cpu, 1),
        "std_mem": round(std_mem, 1),
        "data_points": len(cpu_values),
    }
