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
    ts, vals = hourly(7, 40, 2)
    out = projection_series(ts, vals, rate_per_day=2, current=54, threshold=80)
    assert out["days_to_limit"] == 13.0
    assert out["limit"] == 80
    assert out["horizon_days"] == 30
    # The dashed line starts at "now" from the current value and stops at 100 %.
    assert out["projection"][0] == [0, 54]
    assert out["projection"][1] == [23.0, 100.0]


def test_flat_trend_has_no_crossing():
    ts, vals = hourly(7, 50, 0)
    out = projection_series(ts, vals, rate_per_day=0.0, current=50, threshold=80)
    assert out["days_to_limit"] is None
    assert out["projection"] == [[0, 50], [30.0, 50.0]]


def test_decreasing_trend_has_no_crossing():
    ts, vals = hourly(7, 70, -1)
    out = projection_series(ts, vals, rate_per_day=-1, current=63, threshold=80)
    assert out["days_to_limit"] is None
    assert out["projection"][1] == [30.0, 33.0]


def test_falling_line_stops_at_zero():
    out = projection_series([NOW - DAY, NOW], [20, 10], rate_per_day=-10, current=10, threshold=80)
    assert out["projection"][1] == [1.0, 0.0]


def test_horizon_cap():
    # 40 days away: beyond the default 30-day horizon, inside a 60-day one.
    ts, vals = hourly(7, 39, 1)
    assert projection_series(ts, vals, 1, 40, 80)["days_to_limit"] is None
    assert projection_series(ts, vals, 1, 40, 80, horizon_days=60)["days_to_limit"] == 40.0


def test_already_over_limit_has_no_crossing():
    out = projection_series([NOW - DAY, NOW], [80, 90], rate_per_day=10, current=90, threshold=80)
    assert out["days_to_limit"] is None


def test_never_zero_days():
    out = projection_series([NOW - DAY, NOW], [70, 79.99], rate_per_day=10, current=79.99, threshold=80)
    assert out["days_to_limit"] == 0.1


def test_no_threshold():
    out = projection_series([NOW - DAY, NOW], [10, 20], rate_per_day=10, current=20, threshold=None)
    assert out["days_to_limit"] is None


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
