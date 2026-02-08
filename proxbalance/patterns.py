"""
ProxBalance Workload Pattern Recognition

Analyzes historical score data to detect recurring daily and weekly
workload patterns, burst detection, and optimal migration timing.
"""

from typing import Dict, List


def analyze_workload_patterns(score_history: List[Dict], node_name: str) -> Dict:
    """Analyze historical score data to detect recurring workload patterns.

    Identifies daily cycles (business-hours vs off-hours), weekly patterns,
    and burst detection using hour-of-day and day-of-week bucketing on
    historical score snapshots.

    Args:
        score_history: List of score snapshot dicts from score_history.json,
            each with 'timestamp' and 'nodes' dict.
        node_name: The node to analyze.

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

    # Recommendation timing: suggest best window for migrations
    if hourly_avgs:
        best_hours = sorted(hourly_avgs.keys(), key=lambda h: hourly_avgs[h])[:4]
        best_start = min(best_hours)
        best_end = max(best_hours) + 1
        result["recommendation_timing"] = (
            f"Migrate during {best_start:02d}:00-{best_end:02d}:00 "
            f"when load is minimal (avg {hourly_avgs[best_hours[0]]:.0f}%)"
        )

    return result
