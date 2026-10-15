"""Audit log (item 24): one row per event, right source, no secrets.

Every recorded event type is driven through the real route (or automigrate
/ the update runner) with Proxmox and systemd replaced; the database is a
temp file.
"""

import copy
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from unittest import mock

import pytest
from flask import Flask

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from proxbalance import audit_log, config_manager, db, migration_db  # noqa: E402

SECRET = "s3cret-token-value-0451"
AI_KEY = "sk-ai-key-should-never-appear"

BASE_CONFIG = {
    "proxmox_host": "h",
    "proxmox_api_token_id": "pb@pam!t",
    "proxmox_api_token_secret": "old-secret-xyz",
    "ai_config": {"openai": {"api_key": "old-ai-key", "model": "gpt"}},
    "automated_migrations": {
        "enabled": False,
        "dry_run": True,
        "mode": "automatic",
        "maintenance_nodes": [],
        "rules": {"cooldown_minutes": 30},
        "notifications": {"providers": {"pushover": {"api_token": "old-po-token"}}},
    },
}


@pytest.fixture()
def env(tmp_path, monkeypatch):
    db_file = tmp_path / "pb.db"
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(db_file))
    db.close_all()
    db.init_db()
    audit_log._schema_ready.clear()
    audit_log._backfilled.clear()
    audit_log._writes["count"] = 0
    cfg_file = tmp_path / "config.json"
    cfg_file.write_text(json.dumps(BASE_CONFIG))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg_file))
    yield {"db": db_file, "cfg": cfg_file, "tmp": tmp_path}
    db.close_all()


def rows(**where):
    sql = "SELECT * FROM audit_log"
    if where:
        sql += " WHERE " + " AND ".join(f"{k} = ?" for k in where)
    return [dict(r) for r in db.get_connection().execute(sql + " ORDER BY id", tuple(where.values()))]


def only(action):
    found = rows(action=action)
    assert len(found) == 1, f"expected one {action}, got {[r['action'] for r in rows()]}"
    return found[0]


def app_with(*blueprints, **config):
    app = Flask(__name__)
    for bp in blueprints:
        app.register_blueprint(bp)
    app.config.update(config)
    return app.test_client()


XFF = {"X-Forwarded-For": "10.0.0.50, 10.0.0.1"}


# ---------------------------------------------------------------- migrations

@pytest.fixture()
def migrate_api(env, monkeypatch):
    from proxbalance.routes import migrations as routes
    monkeypatch.setattr(routes, "get_proxmox_client", lambda *a, **k: object())
    monkeypatch.setattr(routes, "_check_ha_move", lambda *a: {"blocks": [], "warnings": []})
    monkeypatch.setattr(routes, "_capture_pre_snapshot", lambda *a: None)
    monkeypatch.setattr(routes, "_execute_migration", lambda p, vmid, t, s, g: (
        {"success": True, "task_id": "UPID:x", "vmid": vmid}, 200))
    monkeypatch.setattr(routes, "_execute_batch_migration", lambda p, migs: (
        {"success": True, "results": [{"vmid": m["vmid"], "success": m["vmid"] != 2} for m in migs]}, 200))
    return app_with(routes.migrations_bp), routes


def test_manual_migration_is_one_user_row_with_actor(migrate_api):
    client, _ = migrate_api
    body = {"vmid": 101, "source_node": "pve4", "target_node": "pve6", "type": "CT"}
    assert client.post("/api/migrate", json=body, headers=XFF).status_code == 200
    row = only("migration.start")
    assert row["source"] == "user" and row["subject"] == "101" and row["actor"] == "10.0.0.50"
    assert "pve4 → pve6" in row["summary"]
    assert json.loads(row["details_json"])["task_id"] == "UPID:x"


def test_automigrate_post_to_migrate_is_not_a_user_row(migrate_api):
    client, _ = migrate_api
    client.post("/api/migrate", json={"vmid": 101, "source_node": "a", "target_node": "b", "type": "CT",
                                      "record_outcome": False, "initiated_by": "automation"})
    assert rows() == []


def test_ha_blocked_manual_migration_is_a_failed_row(migrate_api, monkeypatch):
    client, routes = migrate_api
    monkeypatch.setattr(routes, "_check_ha_move", lambda *a: {"blocks": ["rule x"], "warnings": []})
    assert client.post("/api/migrate", json={"vmid": 5, "source_node": "a", "target_node": "b"}).status_code == 409
    assert "rule x" in only("migration.failed")["summary"]


def test_batch_migration_is_one_row(migrate_api):
    client, _ = migrate_api
    migs = [{"vmid": v, "source_node": "a", "target_node": "b", "type": "CT"} for v in (1, 2, 3)]
    client.post("/api/migrate/batch", json={"migrations": migs})
    row = only("migration.batch")
    assert row["source"] == "user" and "2 of 3 started" in row["summary"]
    assert [m["started"] for m in json.loads(row["details_json"])["moves"]] == [True, False, True]


def test_logging_failure_does_not_break_the_migration(migrate_api, monkeypatch):
    client, _ = migrate_api

    def broken():
        raise sqlite3.OperationalError("database is locked")
    monkeypatch.setattr(audit_log, "_conn", broken)
    r = client.post("/api/migrate", json={"vmid": 1, "source_node": "a", "target_node": "b"})
    assert r.status_code == 200 and r.get_json()["success"] is True
    assert audit_log.record("x.y", "z") is None


def test_enforce_rules_now_is_one_row(env, monkeypatch):
    from proxbalance.routes import rules
    import proxbalance.migrations as migrations
    moves = [{"vmid": 7, "source_node": "a", "target_node": "b", "type": "CT"}]
    monkeypatch.setattr(rules, "_cache", lambda: {"nodes": {}})
    monkeypatch.setattr(rules, "_auto_config", lambda: {})
    monkeypatch.setattr(rules, "build_enforce_plan", lambda c, a: {"moves": moves, "dry_run": False})
    monkeypatch.setattr(rules, "get_proxmox_client", lambda *a, **k: object())
    monkeypatch.setattr(migrations, "execute_batch_migration", lambda p, b: (
        {"success": True, "results": [{"vmid": 7, "success": True}]}, 200))
    client = app_with(rules.rules_bp)
    assert client.post("/api/placement-rules/enforce", json={"vmids": [7]}).status_code == 200
    row = only("rules.enforce")
    assert row["source"] == "user" and "1 of 1" in row["summary"]


def test_automigrate_migrations_are_automation_rows(env):
    import automigrate
    automigrate.record_migration({"id": "m1", "vmid": 101, "name": "web", "type": "CT",
                                  "source_node": "pve4", "target_node": "pve6", "status": "completed",
                                  "initiated_by": "automated", "dry_run": False})
    automigrate.record_migration({"id": "m2", "vmid": 102, "source_node": "pve4", "target_node": "pve5",
                                  "status": "failed", "error": "storage missing", "dry_run": False})
    automigrate.record_migration({"id": "m3", "vmid": 103, "source_node": "a", "target_node": "b",
                                  "status": "completed", "dry_run": True})
    done, failed = only("migration.done"), only("migration.failed")
    assert done["source"] == failed["source"] == "automation"
    assert "CT 101 (web) pve4 → pve6" in done["summary"]
    assert "storage missing" in failed["summary"]
    assert len(rows()) == 2  # the dry run moved nothing


def test_automigrate_crash_is_an_automation_row(env):
    audit_log.record("automation.error", "Automation run failed: boom", source="automation")
    assert only("automation.error")["source"] == "automation"


def test_evacuation_start_and_finish(env, monkeypatch):
    from proxbalance import evacuation
    from proxbalance.routes import evacuation as routes
    cache = env["tmp"] / "cache.json"
    cache.write_text(json.dumps({"nodes": {"pve4": {"status": "online", "guests": [101]},
                                           "pve5": {"status": "online", "guests": []}}}))
    monkeypatch.setattr(routes, "CACHE_FILE", str(cache))
    proxmox = mock.MagicMock()
    proxmox.nodes.return_value.storage.get.return_value = []
    proxmox.nodes.return_value.qemu.return_value.config.get.return_value = {"name": "vm"}
    proxmox.nodes.return_value.qemu.return_value.status.current.get.return_value = {"status": "running"}
    monkeypatch.setattr(routes, "get_proxmox_client", lambda *a, **k: proxmox)
    monkeypatch.setattr(routes, "_write_session", lambda *a: None)
    monkeypatch.setattr(routes, "_execute_evacuation", lambda *a, **k: None)
    client = app_with(routes.evacuation_bp)
    assert client.post("/api/nodes/evacuate", json={"node": "pve4", "confirm": True}).status_code == 200
    assert only("evacuation.start")["subject"] == "pve4"

    monkeypatch.setattr(evacuation, "fetch_ha_data", lambda p: None)
    monkeypatch.setattr(evacuation, "trigger_collection", lambda: None)
    monkeypatch.setattr(evacuation, "_read_session", lambda s: None)
    evacuation._execute_evacuation("s1", "pve4", [], [], {}, None)
    assert only("evacuation.done")["source"] == "user"

    def boom(p):
        raise RuntimeError("api down")
    monkeypatch.setattr(evacuation, "fetch_ha_data", boom)
    evacuation._execute_evacuation("s2", "pve4", [], [], {}, None)
    assert "api down" in only("evacuation.failed")["summary"]


# ---------------------------------------------------------------- automation

@pytest.fixture()
def auto_api(env, monkeypatch):
    from proxbalance.routes import automation
    cfg = copy.deepcopy(BASE_CONFIG)
    cfg["automated_migrations"].update(mode="semi", dry_run=False)
    env["cfg"].write_text(json.dumps(cfg))
    spawned = []
    monkeypatch.setattr(automation, "_spawn_automigrate", lambda **k: (spawned.append(k) or object(), "log"))
    monkeypatch.setattr(automation, "_inflight_migration_error", lambda: None)
    monkeypatch.setattr(automation.time, "sleep", lambda s: None)
    return app_with(automation.automation_bp), automation


def _queue(vmid):
    migration_db.queue_for_approval({"vmid": vmid, "name": f"g{vmid}", "type": "CT", "source_node": "pve4",
                                     "target_node": "pve6", "reason": "Balance CPU", "confidence": 80}, 24)


def test_approve_and_dismiss(auto_api):
    client, _ = auto_api
    _queue(101)
    _queue(102)
    assert client.post("/api/automigrate/queue/101/approve").status_code == 200
    assert client.post("/api/automigrate/queue/102/dismiss").status_code == 200
    approve, dismiss = only("approval.approve"), only("approval.dismiss")
    assert approve["source"] == dismiss["source"] == "user"
    assert "101 (g101) pve4 → pve6" in approve["summary"]
    assert dismiss["subject"] == "102"
    client.post("/api/automigrate/queue/999/dismiss")
    assert len(rows()) == 2


def test_run_now(auto_api):
    client, _ = auto_api
    assert client.post("/api/automigrate/run").status_code == 200
    assert only("automation.run_now")["source"] == "user"


def test_toggle_timer(auto_api, monkeypatch):
    client, automation = auto_api
    monkeypatch.setattr(automation.subprocess, "run",
                        lambda *a, **k: mock.Mock(returncode=0, stdout="inactive", stderr=""))
    client.post("/api/automigrate/toggle-timer", json={"active": False})
    assert only("automation.timer")["summary"] == "Automation timer stopped"


def test_automation_toggles_maintenance_and_settings(auto_api):
    client, _ = auto_api
    r = client.post("/api/automigrate/config", json={
        "enabled": True, "dry_run": True, "mode": "automatic", "maintenance_nodes": ["pve4"],
        "rules": {"cooldown_minutes": 45},
    })
    assert r.status_code == 200
    assert only("automation.enable")["summary"] == "Automation enabled"
    assert only("automation.dry_run")["summary"] == "Dry run on"
    assert "automatic" in only("automation.mode")["summary"]
    assert only("maintenance.on")["subject"] == "pve4"
    change = only("config.change")
    # cooldown_reset_at is bookkeeping, the own-event keys are not repeated
    assert json.loads(change["details_json"])["keys"] == ["automated_migrations.rules.cooldown_minutes"]
    assert {r["source"] for r in rows()} == {"user"}

    client.post("/api/automigrate/config", json={"maintenance_nodes": []})
    assert only("maintenance.off")["summary"] == "pve4 left maintenance"
    # saving the same values again records nothing
    before = len(rows())
    client.post("/api/automigrate/config", json={"enabled": True})
    assert len(rows()) == before


def test_config_change_names_keys_never_secret_values(env):
    from proxbalance.routes import config as routes
    client = app_with(routes.config_bp)
    r = client.post("/api/config", json={
        "proxmox_api_token_secret": SECRET,
        "collection_interval_minutes": 30,
        "ai_config": {"openai": {"api_key": AI_KEY}},
    })
    assert r.status_code == 200
    keys = json.loads(only("config.change")["details_json"])["keys"]
    assert "proxmox_api_token_secret" in keys and "ai_config.openai.api_key" in keys
    assert "collection_interval_minutes" in keys

    from proxbalance.routes import automation
    app_with(automation.automation_bp).post("/api/automigrate/config", json={
        "notifications": {"providers": {"pushover": {"api_token": SECRET + "-po"}}}})
    dump = "\n".join(db.get_connection().iterdump())
    for secret in (SECRET, AI_KEY, "old-secret-xyz", "old-ai-key", "old-po-token"):
        assert secret not in dump


def test_penalty_config_save_is_a_config_change(env):
    config_manager.save_penalty_config({"cpu_high_penalty": 5})
    assert json.loads(only("config.change")["details_json"])["keys"] == ["penalty_scoring"]
    assert only("config.change")["source"] == "system"  # no request: not a user


def test_config_logging_failure_does_not_break_save(env, monkeypatch):
    monkeypatch.setattr(audit_log, "record_config_change", mock.Mock(side_effect=RuntimeError("x")))
    cfg = json.loads(env["cfg"].read_text())
    cfg["proxmox_host"] = "new"
    assert config_manager.save_config(cfg) is True
    assert json.loads(env["cfg"].read_text())["proxmox_host"] == "new"


# ---------------------------------------------------------------- tags, silences

def test_tag_add_and_remove(env, monkeypatch):
    from proxbalance.routes import guests
    proxmox = mock.MagicMock()
    proxmox.nodes.return_value.lxc.return_value.config.get.return_value = {"tags": "keep;old"}
    monkeypatch.setattr(guests, "get_proxmox_client", lambda *a, **k: proxmox)
    monkeypatch.setattr(guests, "trigger_collection", lambda: None)
    monkeypatch.setattr(guests, "read_cache", lambda: {"guests": {"101": {"node": "pve4", "type": "CT"}}})
    client = app_with(guests.guests_bp)
    assert client.post("/api/guests/101/tags", json={"tag": "ignore"}).status_code == 200
    assert client.delete("/api/guests/101/tags/old").status_code == 200
    add, rem = only("tag.add"), only("tag.remove")
    assert add["source"] == rem["source"] == "user"
    assert json.loads(add["details_json"])["tag"] == "ignore" and "'old'" in rem["summary"]


def test_silence_create_and_remove(env):
    from proxbalance.routes import notifications
    client = app_with(notifications.notifications_bp)
    r = client.post("/api/notifications/silences", json={"alert_type": "node_cpu", "duration": "8h"})
    sid = r.get_json()["silence"]["id"]
    assert client.delete(f"/api/notifications/silences/{sid}").status_code == 200
    assert "node_cpu (8h)" in only("silence.add")["summary"]
    assert only("silence.remove")["subject"] == "node_cpu"
    assert client.delete("/api/notifications/silences/999").status_code == 404
    assert len(rows()) == 2


# ---------------------------------------------------------------- updates, services

def test_update_started_and_finished(env, monkeypatch):
    from proxbalance.routes import system
    um = mock.Mock()
    um.perform_update.return_value = {"success": True, "started": True, "target": "v2.20.0"}
    um.restart_service.return_value = {"success": True}
    client = app_with(system.system_bp, update_manager=um)
    assert client.post("/api/system/update").status_code == 200
    assert only("update.start")["subject"] == "v2.20.0"

    import release_updater
    for state in ("succeeded", "rolled_back"):
        assert release_updater.audit_update(str(env["tmp"]), {
            "state": state, "target": "v2.20.0", "from": "v2.19.0", "error": "health check failed"})
    assert only("update.done")["source"] == "system"
    assert "rolled back to v2.19.0" in only("update.rolled_back")["summary"]
    # no database there: skipped, no error
    monkeypatch.delenv("PROXBALANCE_DB_PATH")
    assert release_updater.audit_update("/nonexistent", {"state": "failed"}) is False


def test_update_runner_without_db_table_is_skipped(tmp_path, monkeypatch):
    import release_updater
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(tmp_path / "x.db"))
    sqlite3.connect(str(tmp_path / "x.db")).close()
    assert release_updater.audit_update(str(tmp_path), {"state": "succeeded"}) is False


def test_run_service_now(env, monkeypatch):
    from proxbalance.routes import system
    monkeypatch.setattr(system.subprocess, "run", lambda *a, **k: mock.Mock(returncode=0, stderr=""))
    client = app_with(system.system_bp)
    client.post("/api/system/run-service", json={"service": "proxmox-balance-automigrate"})
    client.post("/api/system/run-service", json={"service": "proxmox-collector"})
    assert only("automation.run_now")["source"] == "user"
    assert only("service.run")["subject"] == "proxmox-collector"


# ---------------------------------------------------------------- backfill, retention, API

def _history(mid, days_ago, **extra):
    ts = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
    migration_db.record_migration({"migration_id": mid, "vmid": 200, "source_node": "a", "target_node": "b",
                                   "timestamp": ts, "status": "completed", **extra})


def test_backfill_is_idempotent_and_skips_dry_runs_and_old_rows(env):
    _history("h1", 2, initiated_by="automated", name="web")
    _history("h2", 3, initiated_by="rollback")
    _history("h3", 1, dry_run=True)
    _history("h4", 400, initiated_by="automated")
    assert audit_log.backfill_migrations() == 2
    assert audit_log.backfill_migrations() == 0
    assert {(r["action"], r["source"]) for r in rows()} == {
        ("migration.done", "automation"), ("migration.rollback", "user")}
    # a live record of an already imported migration is not added twice
    audit_log.record_migration({"id": "h1", "vmid": 200, "source_node": "a", "target_node": "b",
                                "status": "completed"})
    assert len(rows()) == 2


def test_backfill_runs_on_first_use(env):
    _history("h1", 1, initiated_by="automated")
    audit_log.query()
    assert len(rows(action="migration.done")) == 1


def test_pruning_drops_rows_past_retention(env):
    old = (datetime.now(timezone.utc) - timedelta(days=200)).isoformat()
    audit_log.record("config.change", "recent", source="system")  # first write prunes: nothing yet
    audit_log.record("config.change", "old", source="system", ts=old)
    assert audit_log.prune() == 1
    assert [r["summary"] for r in rows()] == ["recent"]


def test_first_write_prunes(env):
    old = (datetime.now(timezone.utc) - timedelta(days=200)).isoformat()
    conn = db.get_connection()
    conn.execute("INSERT INTO audit_log (ts, source, action, summary) VALUES (?, 'system', 'x.y', 'old')",
                 (audit_log.normalize_ts(old),))
    conn.commit()
    audit_log.record("x.y", "new", source="system")
    assert [r["summary"] for r in rows()] == ["new"]


def test_api_filters_and_pages_newest_first(env):
    from proxbalance.routes import audit
    client = app_with(audit.audit_bp)
    base = datetime(2026, 10, 1, tzinfo=timezone.utc)
    for i in range(5):
        audit_log.record("migration.done" if i % 2 else "config.change", f"e{i}",
                         source="automation" if i % 2 else "user",
                         ts=(base + timedelta(hours=i)).isoformat())
    body = client.get("/api/audit-log?limit=2").get_json()
    assert [e["summary"] for e in body["events"]] == ["e4", "e3"]
    body2 = client.get(f"/api/audit-log?limit=2&before={body['next']}").get_json()
    assert [e["summary"] for e in body2["events"]] == ["e2", "e1"]
    body3 = client.get(f"/api/audit-log?limit=2&before={body2['next']}").get_json()
    assert [e["summary"] for e in body3["events"]] == ["e0"] and body3["next"] is None

    assert [e["summary"] for e in client.get("/api/audit-log?source=automation").get_json()["events"]] == ["e3", "e1"]
    assert [e["summary"] for e in client.get("/api/audit-log?action=config").get_json()["events"]] == ["e4", "e2", "e0"]
    since = (base + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert len(client.get(f"/api/audit-log?since={since}").get_json()["events"]) == 2
    assert client.get("/api/audit-log?since=yesterday").status_code == 400
    assert client.get("/api/audit-log?source=robot").status_code == 400
    assert client.get("/api/audit-log?before=garbage").status_code == 400
