"""Workload patterns: quiet window is contiguous and follows the schedule timezone."""

from datetime import datetime, timedelta, timezone

from proxbalance.patterns import analyze_workload_patterns, quietest_stretch


def _history(cpu_for_utc_hour, days=3):
    """Hourly snapshots for one node, CPU chosen by the UTC hour."""
    start = datetime(2026, 9, 1, tzinfo=timezone.utc)
    out = []
    for i in range(days * 24):
        ts = start + timedelta(hours=i)
        out.append({
            "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "nodes": {"pve3": {"cpu": cpu_for_utc_hour(ts.hour)}},
        })
    return out


def test_quietest_stretch_wraps_midnight():
    avgs = {h: 50.0 for h in range(24)}
    avgs.update({23: 5.0, 0: 5.0, 1: 5.0})
    assert quietest_stretch(avgs) == {"start": 23, "end": 2, "avg": 5.0}


def test_quietest_stretch_skips_gaps():
    avgs = {h: 10.0 for h in range(24) if h != 4}
    q = quietest_stretch({**avgs, 3: 1.0, 5: 1.0})
    # 03-06 would include the empty 04:00 hour, so it must not be chosen.
    assert q["start"] not in (2, 3, 4)


def test_timing_is_contiguous_not_scattered_lows():
    # Two separate dips far apart used to yield "Migrate during 04:00-23:00".
    def cpu(h):
        return {4: 5, 5: 6, 6: 7, 21: 4, 22: 30}.get(h, 40)

    res = analyze_workload_patterns(_history(cpu), "pve3")
    assert res["quiet_window"]["start_hour"] == 4
    assert res["quiet_window"]["end_hour"] == 7
    assert res["recommendation_timing"].startswith("Migrate during 04:00-07:00")


def test_hours_bucketed_in_schedule_timezone():
    # Quiet at 08-11 UTC == 03-06 in America/Chicago (CDT, UTC-5, in September).
    def cpu(h):
        return 5 if 8 <= h < 11 else 40

    utc = analyze_workload_patterns(_history(cpu), "pve3")
    chicago = analyze_workload_patterns(_history(cpu), "pve3", tz_name="America/Chicago")
    assert utc["quiet_window"]["start_hour"] == 8
    assert chicago["quiet_window"]["start_hour"] == 3


def test_unknown_timezone_falls_back_to_utc():
    def cpu(h):
        return 5 if 8 <= h < 11 else 40

    res = analyze_workload_patterns(_history(cpu), "pve3", tz_name="Not/AZone")
    assert res["quiet_window"]["start_hour"] == 8
