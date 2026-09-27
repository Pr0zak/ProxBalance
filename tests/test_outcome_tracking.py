"""Outcome tracking: records are created and late post-snapshots are flagged."""

import json
from datetime import datetime, timedelta

import pytest

from proxbalance import db, outcomes

CACHE = {"nodes": {
    "pve3": {"cpu_percent": 60.0, "mem_percent": 45.0, "metrics": {"current_iowait": 5.0}, "guest_count": 15},
    "pve4": {"cpu_percent": 10.0, "mem_percent": 30.0, "metrics": {"current_iowait": 1.0}, "guest_count": 31},
}}


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    monkeypatch.setattr(outcomes, "read_cache_file", lambda: CACHE)
    yield
    db.close_all()
    db._local.conn = None


def _record(minutes_ago):
    snap = outcomes.capture_pre_migration_snapshot(101, "pve3", "pve4")
    snap["timestamp"] = (datetime.utcnow() - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert outcomes.record_migration_outcome(101, "pve3", "pve4", "CT", snap, predicted_improvement=20)


def test_timely_capture_is_not_late(tmp_db):
    _record(minutes_ago=6)
    outcomes.update_post_migration_metrics()
    row = outcomes.get_migration_outcomes()[0]
    assert row["status"] == "pending_1h"
    assert row["post_5min"]["late"] is False


def test_capture_weeks_later_is_flagged_late(tmp_db):
    _record(minutes_ago=60 * 24 * 30)
    outcomes.update_post_migration_metrics()
    row = outcomes.get_migration_outcomes()[0]
    assert row["post_5min"]["late"] is True
