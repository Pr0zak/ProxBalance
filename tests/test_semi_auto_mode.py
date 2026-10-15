"""Semi-automatic automation mode (item 10, decision D5).

Runs automigrate.main() end to end against a fake cluster: the Proxmox API,
the recommendation API and execute_migration are replaced, the SQLite
database is a temp file.
"""

import copy
import json
import os
import sys

import pytest
from flask import Flask

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import automigrate  # noqa: E402
from proxbalance import config_manager, db, migration_db  # noqa: E402
from proxbalance.semi_auto import (  # noqa: E402
    get_approval_ttl_hours, get_mode, node_over_critical, validate_approval_ttl_hours,
    validate_mode,
)

BASE_CONFIG = {
    "automated_migrations": {
        "enabled": True,
        "dry_run": False,
        "maintenance_nodes": [],
        "rules": {
            "max_migrations_per_run": 3,
            "max_concurrent_migrations": 3,
            "grace_period_seconds": 0,
            "cooldown_minutes": 30,
            "min_confidence_score": 50,
            "intelligent_migrations": {"enabled": False},
        },
        "safety_checks": {"max_node_cpu_percent": 85, "max_node_memory_percent": 90},
    },
}


def node(cpu, mem):
    return {"status": "online", "cpu_percent": cpu, "mem_percent": mem,
            "metrics": {"current_cpu": cpu, "recent_cpu": cpu}}


def guest(vmid, node_name):
    return {"vmid": vmid, "name": f"g{vmid}", "type": "CT", "node": node_name, "tags": {}}


def make_cache():
    return {
        "cluster_health": {"quorate": True},
        "nodes": {"pve3": node(30, 40), "pve4": node(60, 70), "pve5": node(92, 60), "pve6": node(20, 30)},
        "guests": {str(v): guest(v, n) for v, n in [(101, "pve4"), (102, "pve5"), (103, "pve3"), (104, "pve4")]},
    }


def rec(vmid, source, target, reason="Balance CPU load (src: 60.0%, target: 20.0%)"):
    return {"vmid": vmid, "name": f"g{vmid}", "type": "CT", "source_node": source,
            "target_node": target, "reason": reason, "confidence_score": 80,
            "target_node_score": 10, "score_improvement": 20}


class Cluster:
    """Fake cluster state shared with automigrate during one main() call."""

    def __init__(self, recs):
        self.recs = recs
        self.executed = []
        self.notifications = []


@pytest.fixture()
def harness(tmp_path, monkeypatch):
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(tmp_path / "pb.db"))
    monkeypatch.delenv("PROXBALANCE_FORCE_DRY_RUN", raising=False)
    db.close_all()
    db.init_db()
    monkeypatch.setattr(automigrate, "LOCK_FILE", tmp_path / "automigrate.lock")

    def run(recs, config_overrides=None, cache=None):
        cluster = Cluster(recs)
        config = copy.deepcopy(BASE_CONFIG)
        for k, v in (config_overrides or {}).items():
            config["automated_migrations"][k] = v
        cache_data = cache or make_cache()

        def fake_execute(vmid, target, source, gtype, cfg, dry_run=True):
            if dry_run:
                return {"success": True, "dry_run": True}
            cluster.executed.append((vmid, source, target))
            # Once moved, the guest no longer has a recommendation.
            cluster.recs = [r for r in cluster.recs if r["vmid"] != vmid]
            return {"success": True, "status": "completed", "duration": 1}

        monkeypatch.setattr(automigrate, "load_config", lambda: config)
        monkeypatch.setattr(automigrate, "read_cache", lambda: cache_data)
        monkeypatch.setattr(automigrate, "is_in_migration_window", lambda c: (True, "Always"))
        monkeypatch.setattr(automigrate, "is_in_blackout_window", lambda c: (False, ""))
        monkeypatch.setattr(automigrate, "get_recommendations",
                            lambda c: {"success": True, "recommendations": copy.deepcopy(cluster.recs)})
        monkeypatch.setattr(automigrate, "execute_migration", fake_execute)
        monkeypatch.setattr(automigrate, "is_migration_in_progress", lambda *a: False)
        monkeypatch.setattr(automigrate, "verify_guest_on_node", lambda *a: (True, "ok"))
        monkeypatch.setattr(automigrate, "check_ha_rules_for_move", lambda *a, **k: (True, "No HA rule conflicts"))
        monkeypatch.setattr(automigrate, "capture_pre_migration_snapshot", lambda *a: None)
        monkeypatch.setattr(automigrate, "send_notification",
                            lambda c, event, data: cluster.notifications.append((event, data)))
        db.close_all()
        assert automigrate.main() == 0
        db.close_all()
        cluster.last_run = migration_db.get_automation_state("last_run")
        cluster.queue = migration_db.get_approval_queue(include_dismissed=True)
        db.close_all()
        return cluster

    yield run
    db.close_all()


def actions(cluster):
    return {d["vmid"]: d["action"] for d in cluster.last_run["decisions"]}


# ---------------------------------------------------------------- default mode

def test_default_mode_is_automatic_and_executes_everything(harness):
    c = harness([rec(101, "pve4", "pve6"), rec(103, "pve3", "pve6")])
    assert [e[0] for e in c.executed] == [101, 103]
    assert "automation_mode" not in c.last_run
    assert all("auto_run" not in d for d in c.last_run["decisions"])
    assert c.queue == []
    assert not [n for n in c.notifications if n[0] == "queued"]


def test_unknown_mode_falls_back_to_automatic():
    assert get_mode({}) == "automatic"
    assert get_mode({"mode": "bogus"}) == "automatic"
    assert get_mode({"mode": "semi"}) == "semi"


# ---------------------------------------------------------------- semi mode

def test_semi_normal_move_queues(harness):
    c = harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    assert c.executed == []
    assert actions(c) == {101: "queued"}
    assert [(e["vmid"], e["source_node"], e["target_node"], e["status"]) for e in c.queue] == [
        (101, "pve4", "pve6", "pending")]
    assert c.last_run["status"] == "no_action"
    assert [n[1]["vmid"] for n in c.notifications if n[0] == "queued"] == [101]


def test_semi_evacuation_auto_runs(harness):
    c = harness([rec(101, "pve4", "pve6", reason="Maintenance evacuation")],
                {"mode": "semi", "maintenance_nodes": ["pve4"]})
    assert c.executed == [(101, "pve4", "pve6")]
    d = c.last_run["decisions"][0]
    assert d["action"] == "executed" and d["auto_run"] == "evacuation"
    assert c.queue == []


def test_semi_move_off_critical_node_auto_runs(harness):
    # pve5 is at 92% CPU (> 85%): its move runs, the pve4 one waits.
    c = harness([rec(102, "pve5", "pve6"), rec(101, "pve4", "pve6")], {"mode": "semi"})
    assert c.executed == [(102, "pve5", "pve6")]
    acts = actions(c)
    assert acts[102] == "executed" and acts[101] == "queued"
    d102 = next(d for d in c.last_run["decisions"] if d["vmid"] == 102)
    assert d102["auto_run"] == "critical" and "CPU 92% > 85%" in d102["auto_run_detail"]
    assert [e["vmid"] for e in c.queue] == [101]


def test_semi_queue_is_one_entry_per_guest_and_notifies_once(harness):
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    c = harness([rec(101, "pve4", "pve3")], {"mode": "semi"})
    assert [(e["vmid"], e["target_node"]) for e in c.queue] == [(101, "pve3")]
    c = harness([rec(101, "pve4", "pve3")], {"mode": "semi"})
    assert len(c.queue) == 1
    assert not [n for n in c.notifications if n[0] == "queued"]  # same move again: no repeat


def test_semi_entry_expires_when_recommendation_disappears(harness):
    harness([rec(101, "pve4", "pve6"), rec(104, "pve4", "pve3")], {"mode": "semi"})
    c = harness([rec(104, "pve4", "pve3")], {"mode": "semi"})
    assert [e["vmid"] for e in c.queue] == [104]
    c = harness([], {"mode": "semi"})
    assert c.queue == []


def test_semi_entry_expires_after_ttl(harness):
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    conn = db.get_connection()
    conn.execute("UPDATE approval_queue SET expires_at = '2000-01-01T00:00:00+00:00'")
    conn.commit()
    assert migration_db.get_approval_queue() == []
    db.close_all()


def test_semi_queue_holds_no_more_than_the_run_would_have_executed(harness):
    recs = [rec(101, "pve4", "pve6"), rec(103, "pve3", "pve6"), rec(104, "pve4", "pve3")]
    c = harness(recs, {"mode": "semi", "rules": {**BASE_CONFIG["automated_migrations"]["rules"],
                                                 "max_migrations_per_run": 2}})
    acts = actions(c)
    assert [v for v, a in acts.items() if a == "queued"] == [101, 103]
    assert acts[104] == "skipped"


def test_semi_approved_move_runs_on_next_run(harness):
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    assert migration_db.set_queue_status(101, migration_db.QUEUE_APPROVED)
    db.close_all()
    c = harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    assert c.executed == [(101, "pve4", "pve6")]
    assert c.last_run["decisions"][0]["auto_run"] == "approved"
    assert c.queue == []


def test_semi_approval_rechecks_rules(harness):
    """An approved move still has to pass every rule at run time."""
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    migration_db.set_queue_status(101, migration_db.QUEUE_APPROVED)
    db.close_all()
    cache = make_cache()
    cache["nodes"]["pve6"] = node(95, 30)  # target now too busy to receive guests
    c = harness([rec(101, "pve4", "pve6")], {"mode": "semi"}, cache=cache)
    assert c.executed == []
    d = c.last_run["decisions"][-1]
    assert d["action"] == "skipped" and "CPU too high" in d["reason"]
    assert c.queue[0]["status"] == "approved"  # still approved for a later run


def test_semi_approval_for_another_target_does_not_run(harness):
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    migration_db.set_queue_status(101, migration_db.QUEUE_APPROVED)
    db.close_all()
    c = harness([rec(101, "pve4", "pve3")], {"mode": "semi"})
    assert c.executed == []
    assert [(e["target_node"], e["status"]) for e in c.queue] == [("pve3", "pending")]


def test_semi_dismissed_move_is_not_asked_again(harness):
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    migration_db.set_queue_status(101, migration_db.QUEUE_DISMISSED)
    db.close_all()
    c = harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    assert actions(c) == {101: "filtered"}
    assert c.executed == []
    assert not [n for n in c.notifications if n[0] == "queued"]


# ---------------------------------------------------------------- dry run wins

def test_dry_run_wins_in_semi_mode(harness):
    # Prior live run queued 101 and the user approved it; then dry run went on.
    harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    migration_db.set_queue_status(101, migration_db.QUEUE_APPROVED)
    db.close_all()
    recs = [rec(101, "pve4", "pve6"), rec(102, "pve5", "pve6"), rec(104, "pve4", "pve3")]
    c = harness(recs, {"mode": "semi", "dry_run": True})
    assert c.executed == []  # nothing really moves, approved or critical
    acts = actions(c)
    assert acts[102] == "executed"  # dry-run "executed" (logged only)
    assert acts[101] == "queued" and acts[104] == "queued"  # approval ignored in dry run
    # The queue is untouched: still only the approved 101 from the live run.
    assert [(e["vmid"], e["status"]) for e in c.queue] == [(101, "approved")]
    assert not [n for n in c.notifications if n[0] == "queued"]


def test_forced_dry_run_test_never_writes_the_queue(harness, monkeypatch):
    monkeypatch.setenv("PROXBALANCE_FORCE_DRY_RUN", "1")
    c = harness([rec(101, "pve4", "pve6")], {"mode": "semi"})
    assert actions(c) == {101: "queued"}
    assert c.queue == []


# ---------------------------------------------------------------- helpers

def test_node_over_critical_uses_safety_limits():
    cfg = copy.deepcopy(BASE_CONFIG)
    cache = make_cache()
    assert node_over_critical("pve5", cfg, cache)[0] is True
    assert node_over_critical("pve4", cfg, cache)[0] is False
    cache["nodes"]["pve4"]["mem_percent"] = 91
    over, msg = node_over_critical("pve4", cfg, cache)
    assert over and msg == "pve4 memory 91% > 90%"
    assert node_over_critical("nope", cfg, cache) == (False, "")


@pytest.mark.parametrize("value,expected", [(24, 24), ("6", 6), (1, 1), (168, 168)])
def test_ttl_validation_accepts(value, expected):
    assert validate_approval_ttl_hours(value) == expected


@pytest.mark.parametrize("value", [0, 169, -1, 1.5, "x", None, True])
def test_ttl_validation_rejects(value):
    with pytest.raises(ValueError):
        validate_approval_ttl_hours(value)


def test_ttl_runtime_read_is_lenient():
    assert get_approval_ttl_hours({}) == 24
    assert get_approval_ttl_hours({"approval_ttl_hours": 999}) == 168
    assert get_approval_ttl_hours({"approval_ttl_hours": "junk"}) == 24


def test_mode_validation():
    assert validate_mode("semi") == "semi"
    with pytest.raises(ValueError):
        validate_mode("manual")


def test_example_config_ships_automatic_mode():
    with open(os.path.join(os.path.dirname(__file__), "..", "config.example.json")) as fh:
        example = json.load(fh)["automated_migrations"]
    assert example["mode"] == "automatic"
    assert example["approval_ttl_hours"] == 24


# ---------------------------------------------------------------- API

@pytest.fixture()
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(tmp_path / "pb.db"))
    db.close_all()
    db.init_db()
    cfg_file = tmp_path / "config.json"
    cfg = copy.deepcopy(BASE_CONFIG)
    cfg["proxmox_host"] = "h"
    cfg["automated_migrations"]["mode"] = "semi"
    cfg_file.write_text(json.dumps(cfg))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg_file))
    from proxbalance.routes import automation
    spawned = []
    monkeypatch.setattr(automation, "_spawn_automigrate",
                        lambda **k: (spawned.append(k) or object(), "log"))
    monkeypatch.setattr(automation, "_inflight_migration_error", lambda: None)
    app = Flask(__name__)
    app.register_blueprint(automation.automation_bp)
    migration_db.queue_for_approval({"vmid": 101, "name": "g101", "type": "CT", "source_node": "pve4",
                                     "target_node": "pve6", "reason": "Balance CPU", "confidence": 80}, 24)
    yield app.test_client(), cfg_file, spawned
    db.close_all()


def _set_cfg(cfg_file, **auto):
    cfg = json.loads(cfg_file.read_text())
    cfg["automated_migrations"].update(auto)
    cfg_file.write_text(json.dumps(cfg))


def test_api_lists_queue(api):
    client, _, _ = api
    body = client.get("/api/automigrate/queue").get_json()
    assert body["mode"] == "semi" and body["dry_run"] is False
    assert [(e["vmid"], e["status"]) for e in body["queue"]] == [(101, "pending")]


def test_api_approve_marks_approved_and_starts_a_run(api):
    client, _, spawned = api
    r = client.post("/api/automigrate/queue/101/approve")
    assert r.status_code == 200 and r.get_json()["started"] is True
    assert migration_db.get_queue_entry(101)["status"] == "approved"
    assert len(spawned) == 1


def test_api_approve_refused_in_dry_run(api):
    client, cfg_file, spawned = api
    _set_cfg(cfg_file, dry_run=True)
    r = client.post("/api/automigrate/queue/101/approve")
    assert r.status_code == 409 and "Dry run" in r.get_json()["error"]
    assert migration_db.get_queue_entry(101)["status"] == "pending"
    assert spawned == []


def test_api_approve_refused_in_automatic_mode(api):
    client, cfg_file, spawned = api
    _set_cfg(cfg_file, mode="automatic")
    assert client.post("/api/automigrate/queue/101/approve").status_code == 409
    assert spawned == []


def test_api_approve_unknown_guest_404(api):
    client, _, spawned = api
    assert client.post("/api/automigrate/queue/999/approve").status_code == 404
    assert spawned == []


def test_api_dismiss_hides_entry(api):
    client, _, _ = api
    assert client.post("/api/automigrate/queue/101/dismiss").status_code == 200
    assert client.get("/api/automigrate/queue").get_json()["queue"] == []
    assert client.post("/api/automigrate/queue/999/dismiss").status_code == 404


def test_api_config_validates_mode_and_ttl(api):
    client, cfg_file, _ = api
    assert client.post("/api/automigrate/config", json={"mode": "manual"}).status_code == 400
    assert client.post("/api/automigrate/config", json={"approval_ttl_hours": 0}).status_code == 400
    r = client.post("/api/automigrate/config", json={"mode": "automatic", "approval_ttl_hours": "12"})
    assert r.status_code == 200
    saved = json.loads(cfg_file.read_text())["automated_migrations"]
    assert saved["mode"] == "automatic" and saved["approval_ttl_hours"] == 12
