"""Read-path regressions: migration history order and outcome vmid filtering."""

import json

import pytest
from flask import Flask

from proxbalance import db, migration_db


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    yield
    db.close_all()
    db._local.conn = None


def _client(blueprint):
    app = Flask(__name__)
    app.register_blueprint(blueprint)
    return app.test_client()


def test_migration_history_limit_returns_newest_first(tmp_db):
    from proxbalance.routes.automation import automation_bp

    for day in range(1, 6):
        migration_db.record_migration({
            "migration_id": f"m{day}",
            "vmid": 100 + day,
            "timestamp": f"2026-09-0{day}T12:00:00+00:00",
            "status": "completed",
        })

    resp = _client(automation_bp).get("/api/automigrate/history?type=migrations&limit=2")
    body = resp.get_json()

    assert resp.status_code == 200
    assert [m["timestamp"][:10] for m in body["migrations"]] == ["2026-09-05", "2026-09-04"]
    assert body["total"] == 5


def _insert_outcome(conn, key, vmid):
    conn.execute(
        "INSERT INTO migration_outcomes (key, vmid, source_node, target_node, guest_type, "
        "status, pre_migration_json) VALUES (?, ?, 'pve3', 'pve4', 'CT', 'completed', ?)",
        (key, vmid, json.dumps({})),
    )


def test_outcomes_vmid_filter_matches_text_vmid_and_total_counts_matches(tmp_db):
    from proxbalance.routes.migrations import migrations_bp

    conn = db.get_connection()
    for i in range(3):
        _insert_outcome(conn, f"240_{i}", "240")
    _insert_outcome(conn, "101_0", "101")
    conn.commit()

    resp = _client(migrations_bp).get("/api/migrate/outcomes?vmid=240&limit=2")
    body = resp.get_json()

    assert resp.status_code == 200
    assert len(body["outcomes"]) == 2
    assert all(o["vmid"] == "240" for o in body["outcomes"])
    assert body["total"] == 3
