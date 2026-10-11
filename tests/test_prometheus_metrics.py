"""GET /api/metrics: valid exposition format, omitted unknowns, label escaping, stale cache."""

import json
import re
from datetime import datetime, timezone

import pytest
from flask import Flask

from proxbalance import config_manager, db, migration_db
from proxbalance.prometheus import (
    CONTENT_TYPE, escape_label_value, format_metrics, parse_timestamp, unavailable_body,
)

NOW = datetime(2026, 10, 11, 23, 30, tzinfo=timezone.utc).timestamp()

CACHE = {
    "collected_at": "2026-10-11T23:20:00Z",
    "nodes": {
        "pve3": {
            "name": "pve3", "status": "online", "cpu_percent": 30.0, "mem_percent": 50.0,
            "anchored_cpu": 5.5,
            "metrics": {"current_cpu": 30.0, "recent_cpu": 25.0, "current_mem": 50.0,
                        "current_iowait": 9.5},
        },
        "pve4": {
            # No recent_cpu, no iowait, no anchored_cpu: those samples must be omitted.
            "name": "pve4", "status": "online", "cpu_percent": 0, "mem_percent": 40.0,
            "metrics": {"current_cpu": 0, "current_mem": 40.0},
        },
        "pve5": {
            "name": "pve5", "status": "offline", "cpu_percent": 99.0,
            "metrics": {"current_cpu": 99.0},
        },
    },
    "guests": {
        "100": {"vmid": 100, "name": "proxbalance", "type": "CT", "node": "pve3",
                "status": "running", "cpu_current": 2.5, "mem_used_gb": 0.5},
        "101": {"vmid": 101, "name": 'we"ird\\name\nx', "type": "VM", "node": "pve4",
                "status": "running", "cpu_current": None},
        "102": {"vmid": 102, "name": "stopped-one", "type": "CT", "node": "pve3",
                "status": "stopped", "cpu_current": 0, "mem_used_gb": 1.0},
    },
}


# ---------------------------------------------------------------------------
# Minimal exposition-format parser (text format 0.0.4)
# ---------------------------------------------------------------------------

_NAME = r"[a-zA-Z_:][a-zA-Z0-9_:]*"
_LABEL = r'[a-zA-Z_][a-zA-Z0-9_]*="(?:[^"\\\n]|\\\\|\\"|\\n)*"'
_SAMPLE_RE = re.compile(
    rf"^(?P<name>{_NAME})(?:\{{(?P<labels>{_LABEL}(?:,{_LABEL})*)?\}})? (?P<value>\S+)$"
)
_LABEL_RE = re.compile(r'([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\\n]|\\\\|\\"|\\n)*)"')


def _unescape(v):
    out, i = [], 0
    while i < len(v):
        if v[i] == "\\":
            out.append({"\\": "\\", '"': '"', "n": "\n"}[v[i + 1]])
            i += 2
        else:
            out.append(v[i])
            i += 1
    return "".join(out)


def parse_exposition(text):
    """Parse and validate an exposition body; return {name: {"type", "samples": [(labels, value)]}}.

    Fails the test on any line that does not match the format, a sample that
    comes before its TYPE line, a family declared twice, or a bad value.
    """
    assert text.endswith("\n"), "body must end with a newline"
    families, seen_done, current = {}, set(), None
    for line in text.splitlines():
        if not line:
            continue
        if line.startswith("# HELP "):
            name = line.split(" ", 3)[2]
            assert re.fullmatch(_NAME, name)
            assert name not in seen_done, f"family {name} declared twice"
            if current and current != name:
                seen_done.add(current)
            current = name
            families.setdefault(name, {"type": None, "samples": []})
            continue
        if line.startswith("# TYPE "):
            _, _, name, mtype = line.split(" ")
            assert name == current, "TYPE must follow its HELP"
            assert mtype in {"gauge", "counter", "untyped", "summary", "histogram"}
            families[name]["type"] = mtype
            continue
        if line.startswith("#"):
            continue
        m = _SAMPLE_RE.match(line)
        assert m, f"invalid sample line: {line!r}"
        name = m.group("name")
        assert name == current and families[name]["type"], f"sample {name} outside its family"
        labels = {k: _unescape(v) for k, v in _LABEL_RE.findall(m.group("labels") or "")}
        value = float(m.group("value"))  # raises on garbage
        families[name]["samples"].append((labels, value))
    for name, fam in families.items():
        keys = [tuple(sorted(lbl.items())) for lbl, _ in fam["samples"]]
        assert len(keys) == len(set(keys)), f"duplicate series in {name}"
    return families


def _samples(fams, name):
    return fams.get("proxbalance_" + name, {"samples": []})["samples"]


def _by(fams, name, label):
    return {lbl[label]: v for lbl, v in _samples(fams, name)}


# ---------------------------------------------------------------------------
# Pure formatter
# ---------------------------------------------------------------------------

FULL_SNAPSHOT = {
    "cache": CACHE,
    "version": "v2.15.0",
    "node_scores": {"pve3": 22.694, "pve4": 130.0},
    "maintenance_nodes": ["pve4"],
    "automation": {"enabled": True, "dry_run": False},
    "last_run": {"status": "no_action", "timestamp": "2026-10-11T23:00:00+00:00"},
    "migration_counts": [
        {"status": "completed", "dry_run": False, "count": 7},
        {"status": "failed", "dry_run": False, "count": 1},
        {"status": "completed", "dry_run": True, "count": 3},
    ],
    "recommendations_pending": 0,
}


def test_full_snapshot_is_valid_exposition():
    fams = parse_exposition(format_metrics(FULL_SNAPSHOT, now=NOW))
    assert _samples(fams, "up") == [({}, 1.0)]
    assert _samples(fams, "build_info") == [({"version": "v2.15.0"}, 1.0)]
    assert fams["proxbalance_migrations_total"]["type"] == "counter"
    assert _samples(fams, "collection_age_seconds") == [({}, 600.0)]
    assert _samples(fams, "collection_last_success_timestamp_seconds")[0][1] == parse_timestamp(
        CACHE["collected_at"])
    assert _by(fams, "node_cpu_recent_percent", "node") == {"pve3": 25.0}
    assert _by(fams, "node_score", "node") == {"pve3": 22.69, "pve4": 130.0}
    assert _by(fams, "node_suitability_percent", "node") == {"pve3": 77.3, "pve4": 0.0}
    assert _by(fams, "node_maintenance", "node") == {"pve3": 0, "pve4": 1, "pve5": 0}
    assert _by(fams, "node_online", "node") == {"pve3": 1, "pve4": 1, "pve5": 0}
    assert _by(fams, "node_guests_running", "node") == {"pve3": 1, "pve4": 1}
    assert _samples(fams, "automation_last_run_status") == [({"status": "no_action"}, 1.0)]
    assert _samples(fams, "recommendations_pending") == [({}, 0.0)]
    mig = {(lbl["result"], lbl["dry_run"]): v for lbl, v in _samples(fams, "migrations_total")}
    assert mig == {("completed", "false"): 7, ("failed", "false"): 1, ("completed", "true"): 3}


def test_missing_values_are_omitted_not_zero():
    fams = parse_exposition(format_metrics({"cache": CACHE}, now=NOW))
    # pve4 has no recent_cpu / iowait / anchored_cpu: no sample at all.
    assert "pve4" not in _by(fams, "node_cpu_recent_percent", "node")
    assert "pve4" not in _by(fams, "node_iowait_percent", "node")
    assert "pve4" not in _by(fams, "node_anchored_cpu_percent", "node")
    # A real zero is still reported.
    assert _by(fams, "node_cpu_percent", "node")["pve4"] == 0
    # Offline node: only node_online, nothing stale.
    assert "pve5" not in _by(fams, "node_cpu_percent", "node")
    # Guest 101 has no CPU and no memory reading.
    assert "101" not in _by(fams, "guest_cpu_percent", "vmid")
    assert "101" not in _by(fams, "guest_memory_bytes", "vmid")
    assert _by(fams, "guest_memory_bytes", "vmid")["100"] == 0.5 * 1024 ** 3
    # Stopped guests are not exported.
    assert "102" not in _by(fams, "guest_node_info", "vmid")
    # Unknown config / DB state: those families are absent entirely.
    for name in ("node_score", "node_maintenance", "automation_enabled", "automation_dry_run",
                 "automation_last_run_status", "migrations_total", "recommendations_pending",
                 "build_info"):
        assert "proxbalance_" + name not in fams, name


def test_label_values_are_escaped():
    text = format_metrics({"cache": CACHE}, now=NOW)
    assert 'name="we\\"ird\\\\name\\nx"' in text
    fams = parse_exposition(text)
    names = {lbl["vmid"]: lbl["name"] for lbl, _ in _samples(fams, "guest_node_info")}
    assert names["101"] == 'we"ird\\name\nx'
    assert escape_label_value('a"b\\c\nd') == 'a\\"b\\\\c\\nd'


def test_stale_cache_reports_age_and_keeps_serving():
    stale = dict(CACHE, collected_at="2026-10-10T23:30:00Z")
    fams = parse_exposition(format_metrics({"cache": stale}, now=NOW))
    assert _samples(fams, "up") == [({}, 1.0)]
    assert _samples(fams, "collection_age_seconds") == [({}, 86400.0)]
    assert _by(fams, "node_cpu_percent", "node")["pve3"] == 30.0


def test_unparseable_collected_at_omits_collection_metrics():
    fams = parse_exposition(format_metrics({"cache": dict(CACHE, collected_at="yesterday")}, now=NOW))
    assert "proxbalance_collection_age_seconds" not in fams
    assert "proxbalance_collection_last_success_timestamp_seconds" not in fams


def test_no_cache_reports_down():
    fams = parse_exposition(format_metrics({"cache": None, "automation": {"enabled": False,
                                                                          "dry_run": True}}, now=NOW))
    assert _samples(fams, "up") == [({}, 0.0)]
    assert _samples(fams, "automation_dry_run") == [({}, 1.0)]
    assert not any(n.startswith("proxbalance_node_") for n in fams)


def test_unavailable_body_is_valid():
    fams = parse_exposition(unavailable_body("boom\nsecond line"))
    assert _samples(fams, "up") == [({}, 0.0)]


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class _FakeCache:
    def __init__(self, data):
        self.data = data

    def get(self):
        return self.data


@pytest.fixture()
def tmp_env(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps({"proxmox_host": "192.168.1.10", "automated_migrations": {
        "enabled": True, "dry_run": True, "maintenance_nodes": ["pve3"]}}))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    import proxbalance.routes.metrics as metrics_route
    monkeypatch.setattr(metrics_route, "BASE_PATH", str(tmp_path))
    (tmp_path / "recommendations_cache.json").write_text(json.dumps({"count": 2}))
    yield tmp_path
    db.close_all()
    db._local.conn = None


def _client(cache):
    from proxbalance.routes.metrics import metrics_bp
    app = Flask(__name__)
    app.config["cache_manager"] = _FakeCache(cache)
    app.register_blueprint(metrics_bp)
    return app.test_client()


def test_route_serves_text_exposition(tmp_env):
    migration_db.record_migration({"migration_id": "m1", "vmid": 100, "source_node": "pve3",
                                   "target_node": "pve4", "status": "completed"})
    migration_db.archive_run({"run_id": "r1", "timestamp": "2026-10-11T23:00:00+00:00",
                              "status": "success"})
    resp = _client(CACHE).get("/api/metrics")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == CONTENT_TYPE
    fams = parse_exposition(resp.get_data(as_text=True))
    assert _samples(fams, "up") == [({}, 1.0)]
    assert _samples(fams, "automation_dry_run") == [({}, 1.0)]
    assert _by(fams, "node_maintenance", "node")["pve3"] == 1
    assert _samples(fams, "recommendations_pending") == [({}, 2.0)]
    assert _samples(fams, "automation_last_run_status") == [({"status": "success"}, 1.0)]
    assert _samples(fams, "migrations_total") == [({"result": "completed", "dry_run": "false"}, 1.0)]
    assert set(_by(fams, "node_score", "node")) == {"pve3", "pve4"}


def test_route_without_cache_still_answers(tmp_env):
    resp = _client(None).get("/api/metrics")
    assert resp.status_code == 200
    fams = parse_exposition(resp.get_data(as_text=True))
    assert _samples(fams, "up") == [({}, 0.0)]


def test_route_failure_returns_503_text(tmp_env, monkeypatch):
    import proxbalance.routes.metrics as metrics_route

    def boom(*a, **k):
        raise RuntimeError("kaput")

    monkeypatch.setattr(metrics_route, "format_metrics", boom)
    resp = _client(CACHE).get("/api/metrics")
    assert resp.status_code == 503
    assert resp.headers["Content-Type"] == CONTENT_TYPE
    assert _samples(parse_exposition(resp.get_data(as_text=True)), "up") == [({}, 0.0)]
