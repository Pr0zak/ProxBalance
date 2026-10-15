"""Alert hysteresis, fingerprint dedupe and silences (proxbalance/alert_state.py)."""

import json
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask

import notifications
from proxbalance import alert_state, config_manager, db

T0 = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)
SETTINGS = {"resolve_collections": 3, "resolve_margin": 5.0, "event_dedupe_seconds": 120}

CONFIG = {
    "automated_migrations": {
        "safety_checks": {"max_node_cpu_percent": 85, "max_node_memory_percent": 90},
        "notifications": {
            "enabled": True,
            "on_resource_threshold": True,
            "on_capacity_warning": True,
            "on_recommendations": True,
            "on_recommendations_cleared": True,
            "providers": {"webhook": {"enabled": True, "url": "http://example.invalid/hook"}},
        },
    },
}


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    monkeypatch.setattr(alert_state, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    yield
    db.close_all()


@pytest.fixture()
def sent(monkeypatch, tmp_path):
    """Capture (title) of every message the webhook channel would send."""
    calls = []
    monkeypatch.setattr(notifications, "STATUS_FILE", str(tmp_path / "status.json"))
    monkeypatch.setattr(notifications.WebhookProvider, "send",
                        lambda self, title, message, priority="normal": calls.append(title) or True)
    notifications._cached_manager.update({"instance": None, "config_hash": None})
    return calls


def at(minutes):
    return T0 + timedelta(minutes=minutes)


def observe(value, minute, warn=85.0):
    return alert_state.observe_threshold("resource_threshold", "orion/cpu", value, warn,
                                         settings=SETTINGS, now=at(minute))["action"]


def test_oscillating_value_fires_once():
    actions = [observe(v, i) for i, v in enumerate([86, 84, 87, 83, 90, 84.5, 88, 82])]
    assert actions.count("fire") == 1
    assert actions[0] == "fire"
    assert "resolve" not in actions


def test_resolves_only_after_three_low_collections():
    assert observe(92, 0) == "fire"
    assert observe(70, 1) == "pending"
    assert observe(70, 2) == "pending"
    assert observe(70, 3) == "resolve"
    assert alert_state.get_active_alerts(now=at(3)) == []
    # A new crossing after resolution is a new alert.
    assert observe(91, 4) == "fire"


def test_dip_less_than_margin_does_not_count():
    assert observe(92, 0) == "fire"
    assert observe(80, 1) == "pending"   # 5 under: counts
    assert observe(80.5, 2) == "active"  # 4.5 under: does not count, resets
    assert observe(80, 3) == "pending"
    assert observe(80, 4) == "pending"
    assert observe(84, 5) == "active"    # under the limit but inside the margin
    for minute in (6, 7):
        assert observe(79, minute) == "pending"
    assert observe(79, 8) == "resolve"


def test_lower_is_worse_threshold():
    def health(v, m):
        return alert_state.observe_threshold("capacity_warning", "cluster", v, 50, higher_is_worse=False,
                                             settings=SETTINGS, now=at(m))["action"]
    assert health(45, 0) == "fire"
    assert health(52, 1) == "active"  # above 50 but within 5
    assert [health(56, m) for m in (2, 3, 4)] == ["pending", "pending", "resolve"]


def test_fingerprint_dedupe_is_per_subject():
    assert observe(90, 0) == "fire"
    assert observe(91, 1) == "active"
    other = alert_state.observe_threshold("resource_threshold", "rigel/cpu", 90, 85, settings=SETTINGS, now=at(1))
    assert other["action"] == "fire"
    active = {a["fingerprint"]: a for a in alert_state.get_active_alerts(now=at(1))}
    assert set(active) == {"resource_threshold:orion/cpu", "resource_threshold:rigel/cpu"}
    assert active["resource_threshold:orion/cpu"]["repeats"] == 1


def test_silence_suppresses_then_expires():
    s = alert_state.create_silence(fingerprint="resource_threshold:orion/cpu", duration="1h", now=at(0))
    assert alert_state.is_silenced("resource_threshold:orion/cpu", "resource_threshold", now=at(30))
    t = alert_state.observe_threshold("resource_threshold", "orion/cpu", 95, 85, settings=SETTINGS, now=at(30))
    assert t["action"] == "fire" and t["silenced"] is True
    assert not alert_state.is_silenced("resource_threshold:orion/cpu", "resource_threshold", now=at(61))
    assert alert_state.list_silences(now=at(61)) == []
    assert alert_state.delete_silence(s["id"]) is False  # already pruned


def test_type_silence_and_until_resolved():
    alert_state.create_silence(alert_type="resource_threshold", duration="resolved", now=at(0))
    t = alert_state.observe_threshold("resource_threshold", "orion/cpu", 95, 85, settings=SETTINGS, now=at(1))
    assert t["silenced"] is True
    for m in (2, 3, 4):
        observe(60, m)
    assert alert_state.list_silences(now=at(5)) == []  # ended with the last alert of that type


def test_silence_validation():
    with pytest.raises(ValueError):
        alert_state.create_silence(fingerprint="x:y", duration="2h")
    with pytest.raises(ValueError):
        alert_state.create_silence(duration="1h")


def test_notify_threshold_sends_once_and_respects_silence(sent):
    data = {"node": "orion", "resource": "CPU", "value": 90.0, "threshold": 85}
    for v in (90, 84, 91, 83, 90):
        notifications.notify_threshold(CONFIG, "resource_threshold", "orion/cpu", v, 85, dict(data, value=float(v)))
    assert len(sent) == 1 and sent[0].startswith("Resource Alert: orion CPU")

    alert_state.create_silence(fingerprint="resource_threshold:rigel/cpu", duration="8h")
    notifications.notify_threshold(CONFIG, "resource_threshold", "rigel/cpu", 99, 85, dict(data, node="rigel", value=99.0))
    assert len(sent) == 1


def test_recommendations_cleared_on_resolve(sent):
    def run(count):
        notifications.notify_condition(
            CONFIG, "recommendations", "cluster", count > 0,
            {"count": count, "ai_enhanced": False, "top_recommendation": None}, value=count,
            resolved_event="recommendations_cleared",
            resolved_data=lambda t: {"previous_count": int(t.get("previous_value") or 0)})
    for c in (2, 0, 3, 0, 0, 0):
        run(c)
    assert sent == ["New Migration Recommendations", "Cluster Balanced - No Migrations Needed"]


def test_event_exact_repeat_guard():
    assert alert_state.is_recent_duplicate("action", "t", "m", 120, now=at(0)) is False
    assert alert_state.is_recent_duplicate("action", "t", "m", 120, now=at(1)) is True
    assert alert_state.is_recent_duplicate("action", "t", "other", 120, now=at(1)) is False
    assert alert_state.is_recent_duplicate("action", "t", "m", 120, now=at(5)) is False
    assert alert_state.is_recent_duplicate("action", "t", "m", 0, now=at(5)) is False


def test_settings_from_config_defaults_and_overrides():
    assert alert_state.settings_from_config({}) == {
        "resolve_collections": 3, "resolve_margin": 5.0, "event_dedupe_seconds": 120}
    cfg = {"automated_migrations": {"notifications": {"alert_resolve_collections": 5,
                                                      "alert_resolve_margin": "bad"}}}
    s = alert_state.settings_from_config(cfg)
    assert s["resolve_collections"] == 5 and s["resolve_margin"] == 5.0


def test_collector_thresholds_and_node_status(sent):
    import collector_api
    cfg = json.loads(json.dumps(CONFIG))
    cfg["automated_migrations"]["notifications"]["on_node_status"] = True

    def collect(cpu, status="online"):
        collector_api._check_resource_thresholds(cfg, {"nodes": {"orion": {
            "status": status, "cpu_percent": cpu, "mem_percent": 40}}})
    for cpu in (90, 86, 84, 88, 70, 70):
        collect(cpu)
    assert sent == ["Resource Alert: orion CPU at 90.0%"]

    collector_api._check_node_status_changes(cfg, {"rigel": "online"}, {"nodes": {"rigel": {"status": "offline"}}})
    collector_api._check_node_status_changes(cfg, {"rigel": "offline"}, {"nodes": {"rigel": {"status": "unknown"}}})
    collector_api._check_node_status_changes(cfg, {"rigel": "unknown"}, {"nodes": {"rigel": {"status": "online"}}})
    assert sent[1:] == ["Node Offline: rigel", "Node Back Online: rigel"]


def test_endpoints(tmp_path, monkeypatch):
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps(CONFIG))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    from proxbalance.routes.notifications import notifications_bp
    app = Flask(__name__)
    app.register_blueprint(notifications_bp)
    client = app.test_client()

    observe(95, 0)
    body = client.get("/api/notifications/alerts").get_json()
    assert [a["fingerprint"] for a in body["alerts"]] == ["resource_threshold:orion/cpu"]
    assert body["settings"] == {"resolve_collections": 3, "resolve_margin": 5.0}

    r = client.post("/api/notifications/silences", json={"fingerprint": "resource_threshold:orion/cpu",
                                                        "duration": "24h"})
    sid = r.get_json()["silence"]["id"]
    body = client.get("/api/notifications/alerts").get_json()
    assert body["alerts"][0]["silence"]["id"] == sid and len(body["silences"]) == 1

    assert client.post("/api/notifications/silences", json={"duration": "1h"}).status_code == 400
    assert client.delete(f"/api/notifications/silences/{sid}").status_code == 200
    assert client.delete(f"/api/notifications/silences/{sid}").status_code == 404
