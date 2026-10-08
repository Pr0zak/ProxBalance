"""Bucketed score history keeps per-node cpu/mem averages, not just suitability."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from proxbalance import db, forecasting

# Two samples inside one recent hour; the reader only scans the window the
# requested buckets cover, so fixed dates would age out of it.
_HOUR = (datetime.now(timezone.utc) - timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
T1 = (_HOUR + timedelta(minutes=1)).isoformat()
T2 = (_HOUR + timedelta(minutes=20)).isoformat()


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    yield db.get_connection()
    db.close_all()
    db._local.conn = None


def _insert(conn, ts, nodes, health=80.0):
    conn.execute(
        "INSERT INTO score_history (timestamp, nodes_json, cluster_health, recommendation_count) "
        "VALUES (?, ?, ?, 0)",
        (ts, json.dumps(nodes), health),
    )
    conn.commit()


def test_bucket_averages_cpu_and_mem(tmp_db):
    _insert(tmp_db, T1, {"pve3": {"suitability": 70.0, "cpu": 20.0, "mem": 40.0}})
    _insert(tmp_db, T2, {"pve3": {"suitability": 80.0, "cpu": 30.0, "mem": 50.0}})
    rows = forecasting.get_score_history_bucketed(bucket_minutes=60)
    assert len(rows) == 1
    assert rows[0]["nodes"]["pve3"] == {"suitability": 75.0, "cpu": 25.0, "mem": 45.0}


def test_missing_cpu_does_not_skew_other_fields(tmp_db):
    _insert(tmp_db, T1, {"pve3": {"suitability": 70.0, "cpu": None, "mem": 40.0}})
    _insert(tmp_db, T2, {"pve3": {"suitability": 80.0, "cpu": 30.0, "mem": 50.0}})
    node = forecasting.get_score_history_bucketed(bucket_minutes=60)[0]["nodes"]["pve3"]
    assert node == {"suitability": 75.0, "cpu": 30.0, "mem": 45.0}


def test_node_without_suitability_is_skipped(tmp_db):
    _insert(tmp_db, T1, {"pve3": {"cpu": 30.0}, "pve4": {"suitability": 60.0}})
    nodes = forecasting.get_score_history_bucketed(bucket_minutes=60)[0]["nodes"]
    assert "pve3" not in nodes
    assert nodes["pve4"] == {"suitability": 60.0}


def test_rows_older_than_requested_window_are_not_scanned(tmp_db):
    old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    _insert(tmp_db, old, {"pve3": {"suitability": 10.0}})
    _insert(tmp_db, T1, {"pve3": {"suitability": 70.0}})
    rows = forecasting.get_score_history_bucketed(bucket_minutes=60, limit=48)
    assert [r["nodes"]["pve3"]["suitability"] for r in rows] == [70.0]
