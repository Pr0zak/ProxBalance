"""Secrets must never leave the API, and '***' placeholders must never be saved."""

import json

import pytest
from flask import Flask

from proxbalance import config_manager
from proxbalance.secret_fields import (
    SECRET_PLACEHOLDER, redact_config, redact_automation_config, restore_placeholders,
)

STORED = {
    "proxmox_host": "10.0.0.3",
    "proxmox_api_token_id": "proxbalance@pve!tok",
    "proxmox_api_token_secret": "real-token-secret",
    "ai_provider": "openai",
    "ai_config": {"openai": {"api_key": "sk-real", "model": "gpt-4o"}},
    "automated_migrations": {
        "enabled": True,
        "notifications": {
            "enabled": True,
            "providers": {
                "pushover": {"enabled": True, "api_token": "po-token", "user_key": "po-user", "priority": 0},
                "webhook": {"enabled": True, "url": "https://hook.example/t0ken", "headers": {"Authorization": "Bearer wh-secret"}},
            },
        },
    },
}


def test_redact_config_hides_every_secret():
    out = json.dumps(redact_config(STORED))
    for secret in ("real-token-secret", "sk-real", "po-token", "po-user", "t0ken", "wh-secret"):
        assert secret not in out
    assert STORED["automated_migrations"]["notifications"]["providers"]["pushover"]["api_token"] == "po-token"


def test_redact_automation_config_hides_notification_secrets():
    out = redact_automation_config(STORED["automated_migrations"])
    assert out["notifications"]["providers"]["pushover"]["api_token"] == SECRET_PLACEHOLDER
    assert out["notifications"]["providers"]["pushover"]["priority"] == 0


def test_restore_placeholders_keeps_stored_values():
    incoming = {"proxmox_api_token_secret": "***", "ai_config": {"openai": {"api_key": "***", "model": "gpt-5"}}}
    out = restore_placeholders(incoming, STORED)
    assert out["proxmox_api_token_secret"] == "real-token-secret"
    assert out["ai_config"]["openai"] == {"api_key": "sk-real", "model": "gpt-5"}


def test_restore_placeholders_never_persists_placeholder():
    assert restore_placeholders({"api_key": "***"}, {}) == {"api_key": ""}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps(STORED))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    from proxbalance.routes.config import config_bp
    from proxbalance.routes.automation import automation_bp
    app = Flask(__name__)
    app.register_blueprint(config_bp)
    app.register_blueprint(automation_bp)
    return app.test_client(), cfg


def test_get_endpoints_do_not_leak(client):
    c, _ = client
    for url in ("/api/config", "/api/automigrate/config"):
        body = c.get(url).get_data(as_text=True)
        for secret in ("real-token-secret", "sk-real", "po-token", "po-user", "t0ken", "wh-secret"):
            assert secret not in body, f"{secret} leaked from {url}"


def test_config_post_with_placeholders_keeps_secrets(client):
    c, cfg = client
    redacted = c.get("/api/config").get_json()["config"]
    payload = {
        "proxmox_api_token_id": redacted["proxmox_api_token_id"],
        "proxmox_api_token_secret": redacted["proxmox_api_token_secret"],
        "ai_config": {**redacted["ai_config"], "openai": {**redacted["ai_config"]["openai"], "model": "gpt-5"}},
    }
    assert c.post("/api/config", json=payload).get_json()["success"]
    saved = json.loads(cfg.read_text())
    assert saved["ai_config"]["openai"]["model"] == "gpt-5"  # the write really happened
    assert saved["proxmox_api_token_secret"] == "real-token-secret"
    assert saved["ai_config"]["openai"]["api_key"] == "sk-real"


def test_automigrate_post_with_placeholders_keeps_secrets(client):
    c, cfg = client
    notif = c.get("/api/automigrate/config").get_json()["config"]["notifications"]
    notif["providers"]["pushover"]["priority"] = 1
    assert c.post("/api/automigrate/config", json={"notifications": notif}).get_json()["success"]
    saved = json.loads(cfg.read_text())["automated_migrations"]["notifications"]["providers"]["pushover"]
    assert saved["api_token"] == "po-token"
    assert saved["user_key"] == "po-user"
    assert saved["priority"] == 1


def test_webhook_headers_round_trip(client):
    c, cfg = client
    notif = c.get("/api/automigrate/config").get_json()["config"]["notifications"]
    assert notif["providers"]["webhook"]["headers"]["Authorization"] == SECRET_PLACEHOLDER
    assert c.post("/api/automigrate/config", json={"notifications": notif}).get_json()["success"]
    saved = json.loads(cfg.read_text())["automated_migrations"]["notifications"]["providers"]["webhook"]
    assert saved["headers"]["Authorization"] == "Bearer wh-secret"
    assert saved["url"] == "https://hook.example/t0ken"


def test_root_api_key_and_legacy_webhook_redacted():
    cfg = {**STORED, "api_key": "pb-api-key",
           "automated_migrations": {**STORED["automated_migrations"],
                                    "notifications": {**STORED["automated_migrations"]["notifications"],
                                                      "webhook_url": "https://legacy.example/abc123"}}}
    out = json.dumps(redact_config(cfg))
    assert "pb-api-key" not in out
    assert "abc123" not in out


def test_ai_models_never_sends_stored_key_to_caller_url(tmp_path, monkeypatch):
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps(STORED))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    sent = {}

    class Resp:
        status_code = 200
        def json(self):
            return {"data": []}

    def fake_get(url, headers=None, timeout=None):
        sent["url"], sent["headers"] = url, headers
        return Resp()

    import requests
    monkeypatch.setattr(requests, "get", fake_get)
    from proxbalance.routes.system import system_bp
    app = Flask(__name__)
    app.register_blueprint(system_bp)
    c = app.test_client()
    r = c.post("/api/ai-models", json={"provider": "openai", "api_key": "***", "base_url": "https://evil.example/v1"})
    assert r.status_code == 400  # no key available for a foreign URL
    assert "headers" not in sent
    c.post("/api/ai-models", json={"provider": "openai", "api_key": "***"})
    assert sent["headers"]["Authorization"] == "Bearer sk-real"  # stored key only to the stored URL


def test_notification_test_errors_are_scrubbed():
    from notifications import NotificationManager
    nm = NotificationManager.__new__(NotificationManager)
    nm.notifications_config = {"providers": {"telegram": {"bot_token": "123456:SECRETTOKEN", "chat_id": "42"}}}
    msg = "404 Client Error for url: https://api.telegram.org/bot123456:SECRETTOKEN/sendMessage"
    assert "SECRETTOKEN" not in nm._scrub(msg)
