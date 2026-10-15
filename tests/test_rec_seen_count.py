""""Seen in N runs" counts: automigrate tracking and the API annotation."""
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import automigrate  # noqa: E402
from proxbalance.rec_observation import (  # noqa: E402
    SEEN_FIELDS, annotate_seen_counts, same_target_streak,
)

NOW = datetime(2026, 10, 11, 12, 0, tzinfo=timezone.utc)
IM = {'enabled': True, 'observation_periods': 3, 'observation_window_hours': 128}
AUTO = {'enabled': True, 'check_interval_minutes': 30, 'maintenance_nodes': [],
        'rules': {'intelligent_migrations': IM}}


def rec(vmid=101, target='vega', source='rigel', **kw):
    return {'vmid': vmid, 'name': f'g{vmid}', 'source_node': source, 'target_node': target,
            'confidence_score': 90, 'score_improvement': 50, **kw}


def entry(count=2, target='vega', streak=None, minutes_ago=10, status='observing', obs=None, **kw):
    e = {'vmid': 101, 'consecutive_count': count, 'last_target_node': target, 'status': status,
         'last_seen': (NOW - timedelta(minutes=minutes_ago)).isoformat(),
         'first_seen': (NOW - timedelta(hours=2)).isoformat(),
         'observations': obs if obs is not None else [{'target_node': target}] * count, **kw}
    if streak is not None:
        e['target_streak'] = streak
    return e


# --- annotate_seen_counts ----------------------------------------------------

def test_annotates_count_and_required():
    [r] = annotate_seen_counts([rec()], {'101': entry(count=2, streak=2)}, AUTO, now=NOW)
    assert r['seen_count'] == 2
    assert r['seen_required'] == 3
    assert r['seen_same_target'] == 2
    assert r['seen_status'] == 'observing'
    assert r['seen_last_at']


@pytest.mark.parametrize('auto', [
    {**AUTO, 'enabled': False},
    {**AUTO, 'rules': {'intelligent_migrations': {**IM, 'enabled': False}}},
    {},
])
def test_nothing_when_automation_or_intelligent_off(auto):
    [r] = annotate_seen_counts([rec()], {'101': entry()}, auto, now=NOW)
    assert not any(f in r for f in SEEN_FIELDS)


@pytest.mark.parametrize('tracked', [
    {},                                                  # never observed
    {'101': entry(count=0)},                             # chain broken
    {'101': entry(stale_since=NOW.isoformat())},         # stale
    {'101': entry(minutes_ago=200)},                     # automation hasn't refreshed it
    {'101': {**entry(), 'last_seen': 'garbage'}},
])
def test_unknown_count_is_omitted_not_zero(tracked):
    [r] = annotate_seen_counts([rec()], tracked, AUTO, now=NOW)
    assert 'seen_count' not in r


def test_freshness_scales_with_check_interval():
    auto = {**AUTO, 'check_interval_minutes': 120}
    [r] = annotate_seen_counts([rec()], {'101': entry(minutes_ago=200)}, auto, now=NOW)
    assert r['seen_count'] == 2


def test_bypassed_recs_not_annotated():
    auto = {**AUTO, 'maintenance_nodes': ['rigel']}
    recs = [rec(), rec(vmid=102, source='orion', distribution_balancing=True)]
    tracked = {'101': entry(), '102': entry()}
    out = annotate_seen_counts(recs, tracked, auto, now=NOW)
    assert all('seen_count' not in r for r in out)


def test_old_seen_fields_are_cleared():
    r = rec(seen_count=9, seen_required=3)
    [r] = annotate_seen_counts([r], {}, AUTO, now=NOW)
    assert 'seen_count' not in r and 'seen_required' not in r


def test_default_required_is_three():
    auto = {**AUTO, 'rules': {'intelligent_migrations': {'enabled': True}}}
    [r] = annotate_seen_counts([rec()], {'101': entry()}, auto, now=NOW)
    assert r['seen_required'] == 3


# --- same_target_streak ------------------------------------------------------

def test_streak_zero_when_automation_last_saw_another_target():
    assert same_target_streak(entry(count=4, target='lyra', streak=4), 'vega') == 0


def test_streak_uses_field_capped_at_count():
    assert same_target_streak(entry(count=2, streak=5), 'vega') == 2


def test_streak_derived_from_observations_when_field_missing():
    obs = [{'target_node': 'lyra'}, {'target_node': 'vega'}, {'target_node': 'vega'}]
    assert same_target_streak(entry(count=5, obs=obs), 'vega') == 2


def test_streak_unknown_when_window_holds_no_break_shorter_than_count():
    obs = [{'target_node': 'vega'}]
    assert same_target_streak(entry(count=4, obs=obs), 'vega') is None


def test_streak_full_when_window_covers_count():
    assert same_target_streak(entry(count=3), 'vega') == 3


# --- automigrate tracking ----------------------------------------------------

def run(tracking, recs):
    tracking, ready, observing = automigrate.update_recommendation_tracking(tracking, recs, IM)
    return tracking, ready, observing


def test_target_streak_restarts_on_target_change_but_gate_count_does_not():
    t = {'tracked': {}}
    t, _, _ = run(t, [rec(target='vega')])
    t, _, _ = run(t, [rec(target='vega')])
    e = t['tracked']['101']
    assert (e['consecutive_count'], e['target_streak']) == (2, 2)
    t, ready, _ = run(t, [rec(target='lyra')])
    e = t['tracked']['101']
    assert (e['consecutive_count'], e['target_streak']) == (3, 1)
    assert ready  # gating is per guest, unchanged


def test_empty_run_breaks_the_chain():
    t = {'tracked': {}}
    t, _, _ = run(t, [rec()])
    t, _, _ = run(t, [rec()])
    t, _, _ = run(t, [])
    e = t['tracked']['101']
    assert e['consecutive_count'] == 0 and e['target_streak'] == 0 and 'stale_since' in e
    t, _, observing = run(t, [rec()])
    e = t['tracked']['101']
    assert (e['consecutive_count'], e['target_streak']) == (1, 1)
    assert observing


def test_record_run_without_candidates_saves_stale(monkeypatch):
    saved = {}
    monkeypatch.delenv('PROXBALANCE_FORCE_DRY_RUN', raising=False)
    monkeypatch.setattr(automigrate, 'load_tracking',
                        lambda: {'tracked': {'101': entry(count=2, streak=2)}})
    monkeypatch.setattr(automigrate, 'save_tracking', lambda t: saved.update(t))
    automigrate.record_run_without_candidates(IM)
    assert saved['tracked']['101']['consecutive_count'] == 0


def test_record_run_without_candidates_skips_forced_dry_run(monkeypatch):
    called = []
    monkeypatch.setenv('PROXBALANCE_FORCE_DRY_RUN', '1')
    monkeypatch.setattr(automigrate, 'load_tracking', lambda: called.append(1) or {'tracked': {}})
    monkeypatch.setattr(automigrate, 'save_tracking', lambda t: called.append(2))
    automigrate.record_run_without_candidates(IM)
    assert called == []


# --- GET /api/recommendations ------------------------------------------------

def test_get_recommendations_adds_seen_fields(tmp_path, monkeypatch):
    import json
    from flask import Flask
    from proxbalance import db, migration_db
    from proxbalance.routes import recommendations as routes

    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    try:
        (tmp_path / "recommendations_cache.json").write_text(json.dumps(
            {"success": True, "recommendations": [rec(), rec(vmid=102)]}))
        monkeypatch.setattr(routes, "BASE_PATH", str(tmp_path))
        monkeypatch.setattr(routes, "load_config", lambda: {"automated_migrations": AUTO})
        fresh = entry(count=2, streak=2)
        fresh['last_seen'] = datetime.now(timezone.utc).isoformat()
        migration_db.upsert_tracking('101', fresh)

        app = Flask(__name__)
        app.register_blueprint(routes.recommendations_bp)
        body = app.test_client().get("/api/recommendations").get_json()
        by_vmid = {r['vmid']: r for r in body['recommendations']}
        assert by_vmid[101]['seen_count'] == 2 and by_vmid[101]['seen_required'] == 3
        assert 'seen_count' not in by_vmid[102]
        # The cache file itself is not rewritten with counts.
        cached = json.loads((tmp_path / "recommendations_cache.json").read_text())
        assert 'seen_count' not in cached['recommendations'][0]
    finally:
        db.close_all()
        db._local.conn = None
