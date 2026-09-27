"""POST /api/notifications/test: single-channel tests, skipped reasons, scrubbing."""

import json

import pytest
from flask import Flask

from proxbalance import config_manager

CONFIG = {
    "proxmox_host": "10.0.0.3",
    "automated_migrations": {
        "notifications": {
            "enabled": True,
            "providers": {
                "pushover": {"enabled": True, "api_token": "po-token-secret", "user_key": "po-user-secret"},
                "telegram": {"enabled": True, "bot_token": "123456:SECRETTOKEN", "chat_id": "42"},
                # Enabled but incomplete: must be reported as skipped, never sent.
                "email": {"enabled": True, "smtp_host": "", "from_address": "", "to_addresses": []},
                "slack": {"enabled": False, "webhook_url": ""},
            },
        },
    },
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps(CONFIG))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    from proxbalance.routes.notifications import notifications_bp
    app = Flask(__name__)
    app.register_blueprint(notifications_bp)
    return app.test_client()


@pytest.fixture()
def sent(monkeypatch):
    """Replace every provider's send() and record which channels were called."""
    import notifications
    calls = []

    def fake(name, fail=None):
        def send(self, title, message, priority="normal"):
            calls.append(name)
            if fail:
                raise RuntimeError(fail)
            return True
        return send

    monkeypatch.setattr(notifications.PushoverProvider, "send", fake("pushover"))
    monkeypatch.setattr(
        notifications.TelegramProvider, "send",
        fake("telegram", "404 Client Error for url: https://api.telegram.org/bot123456:SECRETTOKEN/sendMessage"),
    )
    monkeypatch.setattr(notifications.EmailProvider, "send", fake("email"))
    return calls


def test_single_provider_only_sends_to_that_channel(client, sent):
    r = client.post("/api/notifications/test", json={"provider": "pushover"})
    body = r.get_json()
    assert r.status_code == 200
    assert sent == ["pushover"]
    assert body["results"] == {"pushover": {"success": True}}
    assert body["skipped"] == {}
    assert body["success"] is True


def test_all_channels_reports_skipped_reason_and_never_sends_it(client, sent):
    body = client.post("/api/notifications/test", json={}).get_json()
    assert sorted(sent) == ["pushover", "telegram"]
    assert "email" not in sent and "slack" not in body["results"]
    assert body["skipped"] == {"email": "SMTP host is required"}
    assert body["results"]["pushover"]["success"] is True
    assert body["results"]["telegram"]["success"] is False
    assert body["success"] is False
    assert body["message"] == "1 sent, 1 failed, 1 skipped"


def test_no_body_tests_all_channels(client, sent):
    r = client.post("/api/notifications/test")
    assert r.status_code == 200
    assert sorted(sent) == ["pushover", "telegram"]


def test_single_skipped_provider_returns_its_reason(client, sent):
    body = client.post("/api/notifications/test", json={"provider": "email"}).get_json()
    assert sent == []
    assert body["results"] == {}
    assert body["skipped"] == {"email": "SMTP host is required"}
    assert body["success"] is False


def test_errors_are_scrubbed(client, sent):
    body = client.post("/api/notifications/test", json={"provider": "telegram"}).get_json()
    err = body["results"]["telegram"]["error"]
    assert "SECRETTOKEN" not in err and "***" in err
    assert "SECRETTOKEN" not in json.dumps(body)


def test_disabled_and_unknown_channels_are_rejected(client, sent):
    r = client.post("/api/notifications/test", json={"provider": "slack"})
    assert r.status_code == 400 and "not enabled" in r.get_json()["error"]
    r = client.post("/api/notifications/test", json={"provider": "carrier-pigeon"})
    assert r.status_code == 400 and "Unknown" in r.get_json()["error"]
    assert sent == []


def test_providers_endpoint_reports_channel_readiness_without_secrets(client):
    body = client.get("/api/notifications/providers").get_json()
    assert body["channels"]["pushover"] == {"ready": True}
    assert body["channels"]["email"] == {"ready": False, "reason": "SMTP host is required"}
    assert "slack" not in body["channels"]
    out = json.dumps(body)
    for secret in ("po-token-secret", "po-user-secret", "SECRETTOKEN"):
        assert secret not in out
