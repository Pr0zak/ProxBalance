"""Forecast chart data (proxbalance.forecasting.projection_series) and its
wiring into the node trend fit (trend_analysis, series=True)."""

import pytest

from proxbalance import trend_analysis
from proxbalance.forecasting import projection_series

DAY = 86400
NOW = 1_800_000_000


def hourly(days, start, rate_per_day):
    """Hourly samples over `days`, a straight line ending at NOW."""
    n = int(days * 24)
    ts = [NOW - (n - 1 - i) * 3600 for i in range(n)]
    vals = [start + rate_per_day * (t - ts[0]) / DAY for t in ts]
    return ts, vals


def test_crossing_day():
    ts, vals = hourly(16, 22, 2)  # 16 days of history: the full 30-day horizon applies
    out = projection_series(ts, vals, rate_per_day=2, current=54, threshold=80)
    assert out["days_to_limit"] == 13.0
    assert out["status"] == "crossing"
    assert out["limit"] == 80
    assert out["horizon_days"] == 30
    assert out["max_horizon_days"] == 30
    assert out["days_to_full"] == 23.0
    # The dashed line starts at "now" from the current value and stops at 100 %.
    assert out["projection"][0] == [0, 54]
    assert out["projection"][1] == [23.0, 100.0]


def test_flat_trend_has_no_crossing():
    ts, vals = hourly(16, 50, 0)
    out = projection_series(ts, vals, rate_per_day=0.0, current=50, threshold=80)
    assert out["days_to_limit"] is None
    assert out["status"] == "not_rising"
    assert out["projection"] == [[0, 50], [30.0, 50.0]]


def test_decreasing_trend_has_no_crossing():
    ts, vals = hourly(16, 79, -1)
    out = projection_series(ts, vals, rate_per_day=-1, current=63, threshold=80)
    assert out["days_to_limit"] is None
    assert out["status"] == "not_rising"
    assert out["projection"][1] == [30.0, 33.0]


def test_falling_line_stops_at_zero():
    out = projection_series([NOW - DAY, NOW], [20, 10], rate_per_day=-10, current=10, threshold=80)
    assert out["projection"][1] == [1.0, 0.0]


def test_horizon_cap():
    # 40 days away: beyond the default 30-day horizon, inside a 60-day one.
    ts, vals = hourly(31, 9, 1)
    out = projection_series(ts, vals, 1, 40, 80)
    assert out["days_to_limit"] is None
    assert out["status"] == "beyond_horizon"
    assert projection_series(ts, vals, 1, 40, 80, horizon_days=60)["days_to_limit"] == 40.0


def test_short_history_shrinks_the_horizon():
    # 3 days of samples: projected at most 6 days ahead, not 30.
    ts, vals = hourly(3, 60, 1)
    out = projection_series(ts, vals, rate_per_day=1, current=63, threshold=70)
    assert out["window_days"] == pytest.approx(3, abs=0.05)
    assert out["horizon_days"] == pytest.approx(6, abs=0.1)
    assert out["max_horizon_days"] == 30
    # 7 days to the limit is past the 6-day horizon.
    assert out["days_to_limit"] is None
    assert out["status"] == "beyond_horizon"
    # The dashed line stops at the horizon too.
    assert out["projection"][1][0] == pytest.approx(6, abs=0.1)
    # Inside the shortened horizon it is still a crossing.
    near = projection_series(ts, vals, rate_per_day=1, current=66, threshold=70)
    assert near["days_to_limit"] == 4.0


def test_horizon_never_exceeds_the_request():
    ts, vals = hourly(60, 10, 0.5)
    assert projection_series(ts, vals, 0.5, 40, 80, horizon_days=30)["horizon_days"] == 30


def test_effective_horizon():
    from proxbalance.forecasting import effective_horizon_days
    assert effective_horizon_days(1) == 2
    assert effective_horizon_days(7) == 14
    assert effective_horizon_days(30) == 30
    assert effective_horizon_days(0) == 0
    assert effective_horizon_days(-1) == 0
    assert effective_horizon_days(1, max_days=1) == 1


def test_over_limit_and_rising():
    # Already past the limit: no crossing, but the line still says when it is full.
    ts, vals = hourly(30, 65, 0.5)
    out = projection_series(ts, vals, rate_per_day=0.5, current=80, threshold=70)
    assert out["status"] == "over_limit"
    assert out["days_to_limit"] is None
    assert out["days_to_full"] is None  # 40 days to 100 %, past the horizon
    fast = projection_series(ts, vals, rate_per_day=2, current=80, threshold=70)
    assert fast["days_to_full"] == 10.0


def test_already_over_limit_has_no_crossing():
    out = projection_series([NOW - DAY, NOW], [80, 90], rate_per_day=10, current=90, threshold=80)
    assert out["days_to_limit"] is None
    assert out["status"] == "over_limit"


def test_never_zero_days():
    out = projection_series([NOW - DAY, NOW], [70, 79.99], rate_per_day=10, current=79.99, threshold=80)
    assert out["days_to_limit"] == 0.1


def test_no_threshold():
    out = projection_series([NOW - DAY, NOW], [10, 20], rate_per_day=10, current=20, threshold=None)
    assert out["days_to_limit"] is None
    assert out["status"] == "no_limit"


def test_history_is_downsampled_and_relative_to_last_sample():
    ts, vals = hourly(30, 10, 1)  # 720 samples
    hist = projection_series(ts, vals, 1, 40, 80)["history"]
    assert len(hist) <= 120
    days = [d for d, _ in hist]
    assert days == sorted(days)
    assert -0.5 < days[-1] <= 0
    assert days[0] == pytest.approx(-30, abs=0.5)
    # Averaging keeps the values on the line.
    assert hist[-1][1] == pytest.approx(10 + 30 - 0.1, abs=0.3)


def test_empty_history():
    out = projection_series([], [], 0.0, 0.0, 80)
    assert out["history"] == []
    assert out["days_to_limit"] is None


def samples(ts, vals, field="memory"):
    return [{"ts": t, field: v} for t, v in zip(ts, vals)]


def test_trend_fit_carries_forecast_only_when_asked():
    ts, vals = hourly(7, 40, 2)
    plain = trend_analysis._analyze_metric_trend(samples(ts, vals), "memory", 168, 80)
    assert "forecast" not in plain
    fit = trend_analysis._analyze_metric_trend(samples(ts, vals), "memory", 168, 80, series=True)
    fc = fit["forecast"]
    # The chart's crossing matches the fit's hours_to_threshold.
    assert fc["days_to_limit"] == pytest.approx(fit["hours_to_threshold"] / 24, abs=0.1)
    assert fc["projection"][0][1] == fit["current_avg"]
    assert fc["history"]


def test_trend_fit_too_few_samples_has_null_forecast():
    fit = trend_analysis._analyze_metric_trend(samples([NOW], [50]), "memory", 168, 80, series=True)
    assert fit["forecast"] is None


def test_route_passes_series_and_iowait_threshold(monkeypatch):
    from flask import Flask
    from proxbalance.routes.penalty import penalty_bp

    seen = {}

    def fake_summary(**kwargs):
        seen.update(kwargs)
        return {"nodes": {}, "data_available": False}

    monkeypatch.setattr(trend_analysis, "get_cluster_trend_summary", fake_summary)
    app = Flask(__name__)
    app.register_blueprint(penalty_bp)
    res = app.test_client().get("/api/trends/nodes?series=1&iowait_threshold=20&horizon_days=999")
    assert res.status_code == 200
    assert seen["series"] is True
    assert seen["iowait_threshold"] == 20.0
    assert seen["horizon_days"] == 365


def _score_history(hours, start, rate_per_hour, node="nodeA"):
    """Hourly score-history snapshots ending now, memory rising linearly."""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    return [
        {
            "timestamp": (now - timedelta(hours=hours - i)).isoformat(),
            "nodes": {node: {"cpu": 10.0, "mem": start + rate_per_hour * i}},
        }
        for i in range(hours + 1)
    ]


def test_engine_short_history_shrinks_look_ahead():
    from proxbalance.forecasting import generate_forecast_recommendations
    nodes = {"nodeA": {"status": "online"}}
    # Both end at 60 % and climb 0.25 points an hour: 70 % is 40 hours away.
    # 6 hours of samples are projected 12 hours ahead, so no alert.
    assert generate_forecast_recommendations(nodes, _score_history(6, 58.5, 0.25), 80, 70) == []
    # Two days of samples get the full 48-hour look-ahead.
    out = generate_forecast_recommendations(nodes, _score_history(48, 48, 0.25), 80, 70)
    assert [f["metric"] for f in out] == ["memory"]
    assert out[0]["estimated_hours_to_crossing"] == pytest.approx(40, abs=0.5)


def test_trend_fit_short_history_horizon():
    # Two days of hourly samples: the forecast block uses a 4-day horizon.
    ts, vals = hourly(2, 60, 1)
    fit = trend_analysis._analyze_metric_trend(samples(ts, vals), "memory", 48, 70, series=True)
    assert fit["forecast"]["horizon_days"] == pytest.approx(4, abs=0.1)
    assert fit["forecast"]["status"] == "beyond_horizon"
