"""Automation settings that change what a run does on its own.

- ``rules.allow_container_restarts``: a running container can't live-migrate,
  so moving it restarts it. Missing means allowed (what runs did before the
  setting was honoured); an explicit false skips running containers.
- ``safety_checks.pause_on_failure``: after a real migration fails, the run
  stops and automation is switched off in config.json.
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import automigrate  # noqa: E402
from proxbalance import audit_log, db  # noqa: E402

from test_semi_auto_mode import harness, rec  # noqa: E402,F401


def ct(status="running", **extra):
    return {"vmid": 101, "name": "web-01", "type": "CT", "status": status, "tags": {}, **extra}


# ------------------------------------------------- allow_container_restarts

def test_running_container_allowed_when_setting_missing():
    assert automigrate.can_auto_migrate(ct(), {})[0] is True


def test_running_container_allowed_when_setting_true():
    assert automigrate.can_auto_migrate(ct(), {"allow_container_restarts": True})[0] is True


def test_running_container_skipped_when_restarts_off():
    ok, reason = automigrate.can_auto_migrate(ct(), {"allow_container_restarts": False})
    assert ok is False
    assert "restart" in reason


def test_stopped_container_and_vm_unaffected_by_restarts_off():
    rules = {"allow_container_restarts": False}
    assert automigrate.can_auto_migrate(ct(status="stopped"), rules)[0] is True
    vm = {**ct(), "type": "VM"}
    assert automigrate.can_auto_migrate(vm, rules)[0] is True


# ---------------------------------------------------------- pause_on_failure

def test_pause_writes_enabled_false_and_keeps_other_settings(tmp_path, monkeypatch):
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(tmp_path / "pb.db"))
    db.close_all()
    db.init_db()
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps({"proxmox_host": "192.168.1.10",
                               "automated_migrations": {"enabled": True, "dry_run": False, "mode": "semi"}}))
    assert automigrate.pause_automation_after_failure(122, "build-agent-1", "boom", config_file=cfg) is True
    saved = json.loads(cfg.read_text())
    assert saved["automated_migrations"] == {"enabled": False, "dry_run": False, "mode": "semi"}
    assert saved["proxmox_host"] == "192.168.1.10"
    events = audit_log.query(action="automation.disable")["events"]
    assert len(events) == 1
    assert "build-agent-1" in events[0]["summary"]
    assert events[0]["source"] == "automation"
    db.close_all()


def test_pause_reports_failure_when_config_unreadable(tmp_path):
    assert automigrate.pause_automation_after_failure(1, None, None, config_file=tmp_path / "missing.json") is False


def test_failed_move_pauses_and_stops_the_run(harness):
    c = harness([rec(101, "orion", "vega"), rec(103, "lyra", "vega")],
                config_overrides={"safety_checks": {"pause_on_failure": True, "abort_on_failure": False}},
                fail=(101,))
    assert [e[0] for e in c.executed] == [101]
    assert c.paused == [(101, "migration aborted")]
    assert c.last_run.get("paused_after_failure") is True


def test_failed_move_without_pause_keeps_going_when_abort_off(harness):
    c = harness([rec(101, "orion", "vega"), rec(103, "lyra", "vega")],
                config_overrides={"safety_checks": {"pause_on_failure": False, "abort_on_failure": False}},
                fail=(101,))
    assert [e[0] for e in c.executed] == [101, 103]
    assert c.paused == []


def test_dry_run_never_pauses(harness):
    c = harness([rec(101, "orion", "vega")],
                config_overrides={"dry_run": True, "safety_checks": {"pause_on_failure": True}},
                fail=(101,))
    assert c.paused == []
