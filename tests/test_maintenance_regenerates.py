"""Changing maintenance nodes regenerates recommendations right away.

The cached recommendations evacuate every guest on a maintenance node,
stopped ones included. Without a regeneration, leaving maintenance kept that
evacuation list on screen until the next timer run.
"""

import json
import os
import sys

import pytest
from flask import Flask

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from proxbalance import config_manager, db  # noqa: E402

CONFIG = {"proxmox_host": "h", "automated_migrations": {"enabled": False, "dry_run": True,
                                   "maintenance_nodes": ["pve4"], "rules": {}}}


@pytest.fixture()
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("PROXBALANCE_DB_PATH", str(tmp_path / "pb.db"))
    db.close_all()
    db.init_db()
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps(CONFIG))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    from proxbalance.routes import automation
    calls = []
    monkeypatch.setattr(automation.subprocess, "run", lambda cmd, **k: calls.append(cmd))
    app = Flask(__name__)
    app.register_blueprint(automation.automation_bp)
    yield app.test_client(), calls
    db.close_all()


def _regenerations(calls):
    return [c for c in calls if "proxmox-balance-recommendations.service" in c]


def test_leaving_maintenance_regenerates(api):
    client, calls = api
    resp = client.post("/api/automigrate/config", json={"maintenance_nodes": []})
    assert resp.status_code == 200, resp.get_json()
    assert len(_regenerations(calls)) == 1
    assert "--no-block" in _regenerations(calls)[0]


def test_entering_maintenance_regenerates(api):
    client, calls = api
    client.post("/api/automigrate/config", json={"maintenance_nodes": ["pve4", "pve5"]})
    assert len(_regenerations(calls)) == 1


def test_other_settings_do_not_regenerate(api):
    client, calls = api
    client.post("/api/automigrate/config", json={"dry_run": False})
    client.post("/api/automigrate/config", json={"maintenance_nodes": ["pve4"]})
    assert _regenerations(calls) == []
