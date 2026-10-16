"""Tests for proxbalance.backups (vzdump task log parsing)."""

from proxbalance.backups import parse_vzdump_log, summarize_backup_results

JOB = "INFO: starting new backup job: vzdump --quiet 1 --all 1 --storage vault-pbs --mode snapshot"


def _log(*guests):
    lines = [JOB, "INFO: skip external VMs: 101, 104"]
    for vmid, kind, started, outcome in guests:
        lines += [f"INFO: Starting Backup of VM {vmid} ({kind})",
                  f"INFO: Backup started at {started}",
                  f"INFO: creating Proxmox Backup Server archive 'ct/{vmid}/x'"]
        if outcome.startswith("ERR"):
            lines.append(f"ERROR: Backup of VM {vmid} failed - {outcome[4:]}")
        else:
            lines.append(f"INFO: Finished Backup of VM {vmid} ({outcome})")
        lines.append(f"INFO: Backup finished at {started}")
    return lines


def test_parse_ok_and_failed_guests():
    lines = _log((100, "lxc", "2026-10-15 01:00:07", "00:00:26"),
                 (103, "qemu", "2026-10-15 01:02:07", "ERR unable to find VM config"),
                 (120, "lxc", "2026-10-15 01:10:00", "01:02:03"))
    rows = parse_vzdump_log(lines, task_start=1_000_000, node="draco")
    assert [r["vmid"] for r in rows] == ["100", "103", "120"]
    assert rows[0] == {"vmid": "100", "ok": True, "time": 1_000_000, "duration_s": 26,
                       "error": None, "storage": "vault-pbs", "node": "draco"}
    assert rows[1]["ok"] is False and rows[1]["error"] == "unable to find VM config"
    assert rows[1]["time"] == 1_000_120  # 2 minutes after the first guest
    assert rows[2]["duration_s"] == 3723 and rows[2]["time"] == 1_000_593


def test_unfinished_guest_is_none_and_ignored_in_summary():
    lines = [JOB, "INFO: Starting Backup of VM 100 (lxc)", "INFO: Backup started at 2026-10-15 01:00:07"]
    rows = parse_vzdump_log(lines, task_start=50)
    assert rows[0]["ok"] is None
    assert summarize_backup_results(rows) == {}


def test_summary_keeps_newest_ok_and_last_attempt():
    runs = [
        {"vmid": "100", "ok": True, "time": 100, "duration_s": 20, "error": None, "storage": "a", "node": "n1"},
        {"vmid": "100", "ok": True, "time": 300, "duration_s": 25, "error": None, "storage": "b", "node": "n2"},
        {"vmid": "100", "ok": False, "time": 500, "duration_s": None, "error": "disk full", "storage": "b", "node": "n2"},
        {"vmid": "200", "ok": False, "time": 200, "duration_s": None, "error": "old", "storage": "a", "node": "n1"},
        {"vmid": "200", "ok": True, "time": 400, "duration_s": 5, "error": None, "storage": "a", "node": "n1"},
    ]
    s = summarize_backup_results(runs)
    assert s["100"]["last_ok"] == 300 and s["100"]["last_ok_storage"] == "b"
    assert s["100"]["last_attempt"] == 500 and s["100"]["last_attempt_ok"] is False
    assert s["100"]["last_error"] == "disk full"
    assert (s["100"]["ok_count"], s["100"]["fail_count"]) == (2, 1)
    assert s["200"]["last_attempt_ok"] is True and s["200"]["last_error"] is None


def test_log_without_job_line_has_no_storage():
    rows = parse_vzdump_log(["INFO: Starting Backup of VM 7 (lxc)",
                             "INFO: Finished Backup of VM 7 (00:00:01)"], task_start=9)
    assert rows[0]["storage"] is None and rows[0]["ok"] is True and rows[0]["time"] == 9


def _db(monkeypatch, tmp_path):
    from proxbalance import db
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(tmp_path / "b.db"))
    db.close_all()
    db.init_db()
    return db


def test_record_is_idempotent_and_prunes(monkeypatch, tmp_path):
    from proxbalance.backups import record_backup_runs, load_backup_runs
    db = _db(monkeypatch, tmp_path)
    now = 10_000_000
    runs = [
        {"vmid": "100", "ok": True, "time": now - 3600, "duration_s": 20, "error": None, "storage": "pbs", "node": "n1"},
        {"vmid": "100", "ok": False, "time": now - 86400, "duration_s": None, "error": "boom", "storage": "pbs", "node": "n1"},
        {"vmid": "100", "ok": True, "time": now - 100 * 86400, "duration_s": 5, "error": None, "storage": "pbs", "node": "n1"},
        {"vmid": "200", "ok": None, "time": now, "duration_s": None, "error": None, "storage": "pbs", "node": "n2"},
    ]
    assert record_backup_runs(runs, now=now) == 3
    record_backup_runs(runs, now=now)  # same logs read again
    got = load_backup_runs(0)
    assert [(r["vmid"], r["time"], r["ok"]) for r in got] == [("100", now - 86400, False), ("100", now - 3600, True)]
    assert got[0]["error"] == "boom"
    assert load_backup_runs(0, vmid="200") == []
    db.close_all()


def test_backups_endpoint(monkeypatch, tmp_path):
    import time as _t
    from flask import Flask
    from proxbalance.backups import record_backup_runs
    from proxbalance.routes.guests import guests_bp
    db = _db(monkeypatch, tmp_path)
    now = int(_t.time())
    record_backup_runs([{"vmid": "7", "ok": True, "time": now - 60, "duration_s": 9,
                         "error": None, "storage": "pbs", "node": "n1"}], now=now)
    app = Flask(__name__)
    app.register_blueprint(guests_bp)
    j = app.test_client().get("/api/guests/7/backups?days=500").get_json()
    assert j["success"] and j["days"] == 90 and j["recorded_from"] == now - 60
    assert j["runs"] == [{"time": now - 60, "ok": True, "duration_s": 9, "error": None, "storage": "pbs", "node": "n1"}]
    db.close_all()


def test_cluster_backup_runs_endpoint(monkeypatch, tmp_path):
    import time as _t
    from flask import Flask
    from proxbalance.backups import record_backup_runs
    from proxbalance.routes.guests import guests_bp
    db = _db(monkeypatch, tmp_path)
    now = int(_t.time())
    record_backup_runs([
        {"vmid": "7", "ok": True, "time": now - 60, "duration_s": 9, "error": None, "storage": "pbs", "node": "n1"},
        {"vmid": "8", "ok": False, "time": now - 30, "duration_s": None, "error": "x", "storage": "pbs", "node": "n1"},
        {"vmid": "9", "ok": True, "time": now - 20 * 86400, "duration_s": 5, "error": None, "storage": "pbs", "node": "n2"},
    ], now=now)
    app = Flask(__name__)
    app.register_blueprint(guests_bp)
    j = app.test_client().get("/api/backups/runs").get_json()
    assert j["success"] and j["days"] == 14 and j["recorded_from"] == now - 20 * 86400
    assert j["runs"] == [["7", now - 60, 1], ["8", now - 30, 0]]
    db.close_all()
