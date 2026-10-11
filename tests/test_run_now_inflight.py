"""POST /api/automigrate/run refuses to start while a migration is in flight."""

import subprocess

import pytest
from flask import Flask, jsonify

from proxbalance.routes import automation


@pytest.fixture()
def client():
    app = Flask(__name__)
    app.register_blueprint(automation.automation_bp)
    return app.test_client()


def test_run_now_blocked_by_inflight_migration(client, monkeypatch):
    def fake_status():
        return jsonify({"success": True, "in_progress_migrations": [
            {"name": "web01", "vmid": 101, "source_node": "pve4", "target_node": "pve5"}]})
    monkeypatch.setattr(automation, "get_automigrate_status", fake_status)
    started = []
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: started.append(a))

    resp = client.post("/api/automigrate/run")

    assert resp.status_code == 409
    assert "web01 (101) is currently migrating from pve4 to pve5" in resp.get_json()["error"]
    assert started == []
