"""Bucketed score history keeps per-node cpu/mem averages, not just suitability."""

import json

import pytest

from proxbalance import db, forecasting


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
    _insert(tmp_db, "2026-09-27T12:01:00+00:00", {"pve3": {"suitability": 70.0, "cpu": 20.0, "mem": 40.0}})
    _insert(tmp_db, "2026-09-27T12:20:00+00:00", {"pve3": {"suitability": 80.0, "cpu": 30.0, "mem": 50.0}})
    rows = forecasting.get_score_history_bucketed(bucket_minutes=60)
    assert len(rows) == 1
    assert rows[0]["nodes"]["pve3"] == {"suitability": 75.0, "cpu": 25.0, "mem": 45.0}


def test_missing_cpu_does_not_skew_other_fields(tmp_db):
    _insert(tmp_db, "2026-09-27T12:01:00+00:00", {"pve3": {"suitability": 70.0, "cpu": None, "mem": 40.0}})
    _insert(tmp_db, "2026-09-27T12:20:00+00:00", {"pve3": {"suitability": 80.0, "cpu": 30.0, "mem": 50.0}})
    node = forecasting.get_score_history_bucketed(bucket_minutes=60)[0]["nodes"]["pve3"]
    assert node == {"suitability": 75.0, "cpu": 30.0, "mem": 45.0}


def test_node_without_suitability_is_skipped(tmp_db):
    _insert(tmp_db, "2026-09-27T12:01:00+00:00", {"pve3": {"cpu": 30.0}, "pve4": {"suitability": 60.0}})
    nodes = forecasting.get_score_history_bucketed(bucket_minutes=60)[0]["nodes"]
    assert "pve3" not in nodes
    assert nodes["pve4"] == {"suitability": 60.0}
