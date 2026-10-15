"""IO pressure (Linux PSI): collection, storage and the sustained-pressure penalty.

Pure: no cluster. The metrics-store tests use a temporary SQLite database.
"""

import pytest

from proxbalance import db, metrics_store, scoring
from proxbalance.scoring import DEFAULT_PENALTY_CONFIG, calculate_target_node_score

DUMMY_GUEST = {"cpu_cores": 1, "cpu_current": 0, "mem_used_gb": 1.0, "mem_max_gb": 1.0}


class _StubTrends:
    """Stands in for trend_analysis so scoring never touches the metrics database."""

    def analyze_node_trends(self, *args, **kwargs):
        return {"cpu": {"rate_per_day": 0.0, "confidence": "high"},
                "memory": {"rate_per_day": 0.0, "confidence": "high"},
                "overall_stability": 50}


@pytest.fixture(autouse=True)
def trends(monkeypatch):
    monkeypatch.setattr(scoring, "_trend_analysis", _StubTrends())


def make_node(io_pressure_week=None, iowait=2.0, exempt=False):
    metrics = {
        "has_historical": True,
        "current_cpu": 20.0, "recent_cpu": 20.0, "avg_cpu": 20.0, "avg_cpu_week": 20.0,
        "current_mem": 40.0, "avg_mem": 40.0, "avg_mem_week": 40.0,
        "current_iowait": iowait, "recent_iowait": iowait, "avg_iowait": iowait, "avg_iowait_week": iowait,
        "max_cpu_week": 20.0, "max_mem_week": 40.0, "avg_load": 1.0,
    }
    if io_pressure_week is not None:
        metrics.update({"avg_io_pressure_week": io_pressure_week,
                        "recent_io_pressure": io_pressure_week, "avg_io_pressure": io_pressure_week})
    node = {
        "name": "pve-test", "status": "online", "cpu_cores": 4, "total_mem_gb": 32.0,
        "storage": [{"active": True, "type": "lvmthin", "usage_pct": 30.0}],
        "metrics": metrics,
    }
    if exempt:
        node["iowait_exempt"] = True
    return node


def score(node, penalty_config=None):
    return calculate_target_node_score(
        target_node=node, guest=DUMMY_GUEST, pending_target_guests={},
        cpu_threshold=60, mem_threshold=70, penalty_config=penalty_config, return_details=True,
    )


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def test_missing_psi_scores_exactly_as_before():
    total, details = score(make_node())
    assert "io_pressure_sustained" not in details["penalties"]
    assert "io_pressure_7d" not in details["metrics"]
    # Same node with PSI under every threshold: same total.
    total_low, details_low = score(make_node(io_pressure_week=5.0))
    assert total_low == total
    assert details_low["penalties"]["io_pressure_sustained"] == 0
    assert details_low["metrics"]["io_pressure_7d"] == 5.0


def test_missing_psi_with_none_values_is_ignored():
    node = make_node()
    node["metrics"]["avg_io_pressure_week"] = None
    total, details = score(node)
    assert total == score(make_node())[0]
    assert "io_pressure_sustained" not in details["penalties"]


@pytest.mark.parametrize("pressure, points", [
    (30.0, 0),                                   # strict: exactly 30% is not over
    (30.1, DEFAULT_PENALTY_CONFIG["io_pressure_sustained_high"]),
    (50.0, DEFAULT_PENALTY_CONFIG["io_pressure_sustained_high"]),
    (50.1, DEFAULT_PENALTY_CONFIG["io_pressure_sustained_critical"]),
    (95.0, DEFAULT_PENALTY_CONFIG["io_pressure_sustained_critical"]),
])
def test_penalty_tiers_at_boundaries(pressure, points):
    base, _ = score(make_node())
    total, details = score(make_node(io_pressure_week=pressure))
    assert details["penalties"]["io_pressure_sustained"] == points
    assert total == pytest.approx(base + points)
    if points:
        item = next(i for i in details["penalty_items"] if i["key"] == "io_pressure_sustained")
        assert item["category"] == "iowait"
        assert item["label"] == "IO pressure 7-day avg"
        assert item["value"] == pytest.approx(round(pressure, 1))


def test_penalty_weight_is_configurable():
    cfg = dict(DEFAULT_PENALTY_CONFIG, io_pressure_sustained_high=0)
    _, details = score(make_node(io_pressure_week=40.0), cfg)
    assert details["penalties"]["io_pressure_sustained"] == 0


def test_no_penalty_without_weekly_weight():
    cfg = dict(DEFAULT_PENALTY_CONFIG, weight_current=0.7, weight_24h=0.3, weight_7d=0.0)
    _, details = score(make_node(io_pressure_week=80.0), cfg)
    assert "io_pressure_sustained" not in details["penalties"]


def test_iowait_exempt_node_drops_io_pressure_penalty():
    _, details = score(make_node(io_pressure_week=80.0, exempt=True))
    assert details["penalties"]["io_pressure_sustained"] == 0
    assert "IO pressure" in details["score_breakdown"]["notes"][0]


def test_sensitivity_scales_io_pressure_points():
    from proxbalance.settings_mapper import map_simplified_to_penalty_config
    aggressive = map_simplified_to_penalty_config({"sensitivity": 3})
    conservative = map_simplified_to_penalty_config({"sensitivity": 1})
    assert aggressive["io_pressure_sustained_high"] > conservative["io_pressure_sustained_high"]


# ---------------------------------------------------------------------------
# Collector
# ---------------------------------------------------------------------------

def _rrd(n, with_psi, io=40.0):
    rows = []
    for i in range(n):
        row = {"time": 1_000_000 + i * 60, "cpu": 0.2, "memused": 8.0, "memtotal": 32.0,
               "iowait": 0.05, "loadavg": 1.0}
        if with_psi:
            row.update({"pressureiosome": io, "pressureiofull": io / 2, "pressurecpusome": 1.5,
                        "pressurememorysome": 0.0, "pressurememoryfull": 0.0})
        rows.append(row)
    return rows


def _collector(with_psi):
    import collector_api
    col = object.__new__(collector_api.ProxmoxAPICollector)
    col.get_node_rrd_data = lambda node, tf: _rrd(60, with_psi)
    col.get_storage_status = lambda node: []
    col.get_disk_health = lambda node: None
    return col


NODE = {"node": "pve4", "cpu": 0.2, "mem": 8, "maxmem": 32, "maxcpu": 4, "status": "online"}


def test_collector_keeps_psi_fields():
    out = _collector(True)._process_single_node(dict(NODE))
    m = out["metrics"]
    assert m["recent_io_pressure"] == 40.0          # already a percentage, not scaled
    assert m["recent_io_pressure_full"] == 20.0
    assert m["recent_cpu_pressure"] == 1.5
    assert m["recent_mem_pressure"] == 0.0          # a real 0, kept
    assert m["current_io_pressure"] == 40.0
    assert m["avg_io_pressure"] == 40.0 and m["max_io_pressure"] == 40.0
    assert m["avg_io_pressure_week"] == 40.0
    assert all(p["io_pressure"] == 40.0 for p in out["trend_data"]["day"])


def test_collector_without_psi_adds_nothing():
    out = _collector(False)._process_single_node(dict(NODE))
    assert not [k for k in out["metrics"] if "pressure" in k]
    assert all("io_pressure" not in p for p in out["trend_data"]["day"])
    assert out["metrics"]["avg_iowait"] == pytest.approx(5.0)


def test_psi_metrics_helper_skips_missing_and_none():
    import collector_api
    rows = [{"pressureiosome": None}, {"pressureiosome": 10.0}, {}]
    got = collector_api.ProxmoxAPICollector._psi_metrics(rows, (("io", "pressureiosome"), ("cpu", "pressurecpusome")))
    assert got == {"io": 10.0}


# ---------------------------------------------------------------------------
# Metrics store
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    yield
    db.close_all()
    db._local.conn = None


def test_store_keeps_io_pressure_and_null_when_absent(tmp_db):
    metrics_store.append_node_sample("pve4", {"cpu": 10.0, "iowait": 2.0, "io_pressure": 33.333})
    metrics_store.append_node_sample("pve5", {"cpu": 10.0, "iowait": 2.0})
    metrics_store.append_guest_sample("101", {"cpu": 5.0, "node": "pve4", "io_pressure": 0.0})
    assert metrics_store.get_node_history("pve4")[0]["io_pressure"] == 33.33
    assert metrics_store.get_node_history("pve5")[0]["io_pressure"] is None
    assert metrics_store.get_guest_history("101")[0]["io_pressure"] == 0.0


def test_aggregates_leave_out_absent_io_pressure():
    agg = metrics_store._aggregate_samples(
        [{"ts": 1.0, "cpu": 10.0, "io_pressure": None}, {"ts": 2.0, "cpu": 20.0}],
        metrics_store.NODE_STORED_FIELDS)
    assert "io_pressure" not in agg
    assert agg["cpu"]["avg"] == 15.0
    agg2 = metrics_store._aggregate_samples(
        [{"ts": 1.0, "io_pressure": 10.0}, {"ts": 2.0, "io_pressure": 30.0}], metrics_store.NODE_STORED_FIELDS)
    assert agg2["io_pressure"]["avg"] == 20.0
    row = {"ts": 1.0, "aggregated": 1, "agg_stats": '{"cpu": {"min": 1, "max": 1, "avg": 1, "p95": 1}}'}
    assert metrics_store._row_to_sample(row, metrics_store.NODE_STORED_FIELDS)["io_pressure"] is None


def test_init_db_adds_io_pressure_to_an_old_database(tmp_path, monkeypatch):
    import sqlite3
    path = tmp_path / "old.db"
    old = sqlite3.connect(path)
    old.execute("CREATE TABLE node_metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, node_name TEXT NOT NULL, "
                "ts REAL NOT NULL, cpu REAL, memory REAL, iowait REAL, load_avg REAL, guest_count INTEGER, "
                "storage_usage_pct REAL, aggregated INTEGER DEFAULT 0, tier TEXT, ts_start REAL, ts_end REAL, "
                "sample_count INTEGER DEFAULT 1, agg_stats TEXT)")
    old.execute("INSERT INTO node_metrics (node_name, ts, cpu) VALUES ('pve3', 1.0, 5.0)")
    old.commit()
    old.close()
    monkeypatch.setattr(db, "get_db_path", lambda: str(path))
    db.close_all()
    db._local.conn = None
    try:
        db.init_db()
        db.init_db()  # idempotent
        cols = {r[1] for r in db.get_connection().execute("PRAGMA table_info(node_metrics)")}
        assert "io_pressure" in cols
        row = db.get_connection().execute("SELECT io_pressure FROM node_metrics").fetchone()
        assert row[0] is None
    finally:
        db.close_all()
        db._local.conn = None
