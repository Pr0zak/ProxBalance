"""Reads never start work, and no path+method is registered twice.

GET /api/analyze and GET /api/cluster-summary used to start a collector run
when the cache was empty. GETs sit outside the CSRF guard, so they must not
start anything; POST /api/refresh is the way to start a collection.
"""

import os
import sys
from collections import Counter

import pytest
from flask import Flask

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from proxbalance.routes import analysis, register_blueprints  # noqa: E402


class _EmptyCache:
    def get(self):
        return None


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['cache_manager'] = _EmptyCache()
    register_blueprints(app)
    return app


@pytest.fixture
def spy(monkeypatch):
    calls = []
    monkeypatch.setattr(analysis, "trigger_collection", lambda: calls.append(1) or True)
    monkeypatch.setattr(analysis, "load_config", lambda: {})
    return calls


@pytest.mark.parametrize("path", ["/api/analyze", "/api/cluster-summary"])
def test_get_without_cache_does_not_collect(app, spy, path):
    r = app.test_client().get(path)
    assert r.status_code == 503
    body = r.get_json()
    assert body["success"] is False
    assert body["no_data"] is True
    assert body["collection_triggered"] is False
    assert "No data collected yet" in body["error"]
    assert spy == []


def test_post_refresh_still_collects(app, spy):
    r = app.test_client().post("/api/refresh")
    assert r.status_code == 200
    assert r.get_json()["success"] is True
    assert spy == [1]


def test_no_duplicate_routes(app):
    """Each (path, method) pair is served by exactly one rule. Flask quietly
    serves the first registered handler, so a duplicate is dead code."""
    pairs = Counter(
        (rule.rule, method)
        for rule in app.url_map.iter_rules()
        for method in rule.methods - {"HEAD", "OPTIONS"}
    )
    dupes = sorted(pair for pair, n in pairs.items() if n > 1)
    assert dupes == []


def test_score_history_registered_once(app):
    rules = [r for r in app.url_map.iter_rules()
             if r.rule == "/api/score-history" and "GET" in r.methods]
    assert len(rules) == 1
    assert rules[0].endpoint == "analysis.get_score_history"
