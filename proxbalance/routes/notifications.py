import json
import re
import subprocess
from datetime import datetime, timezone
from typing import Any, Dict

from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_config
from proxbalance.error_handlers import api_route

notifications_bp = Blueprint("notifications", __name__)


def _summary(results, skipped):
    """One-line outcome of a test run, e.g. '2 sent, 1 failed, 1 skipped'."""
    sent = sum(1 for r in results.values() if r.get("success"))
    failed = len(results) - sent
    parts = [f"{sent} sent"]
    if failed:
        parts.append(f"{failed} failed")
    if skipped:
        parts.append(f"{len(skipped)} skipped")
    return ", ".join(parts)


@notifications_bp.route("/api/notifications/test", methods=["POST"])
@api_route
def test_notifications():
    """Send a test notification to every enabled channel, or to one.

    Body (optional JSON): {"provider": "<channel name>"} tests only that
    channel. The response lists per-channel results and, under "skipped",
    enabled channels the server left out with the reason their config
    failed validation. Every error string is scrubbed of stored secrets.
    """
    from notifications import NotificationManager, PROVIDER_REGISTRY

    config = load_config()
    if config.get('error'):
        return jsonify({"success": False, "error": config.get('message')}), 500

    body = request.get_json(silent=True) or {}
    only = body.get("provider") or None
    if only is not None and only not in PROVIDER_REGISTRY:
        return jsonify({
            "success": False,
            "error": f"Unknown notification channel: {str(only)[:40]}"
        }), 400

    manager = NotificationManager(config)

    if not manager.enabled:
        return jsonify({
            "success": False,
            "error": "Notifications are not enabled. Enable notifications first."
        }), 400

    if only is not None:
        if only not in manager.named_providers and only not in manager.skipped:
            return jsonify({
                "success": False,
                "error": f"The {only} channel is not enabled in the saved settings."
            }), 400
        skipped = {only: manager.skipped[only]} if only in manager.skipped else {}
    else:
        skipped = dict(manager.skipped)
        if not manager.named_providers and not skipped:
            return jsonify({
                "success": False,
                "error": "No notification channels are enabled."
            }), 400

    results = manager.test(only=only)
    skipped = {name: manager._scrub(reason) for name, reason in skipped.items()}
    all_ok = bool(results) and not skipped and all(r.get("success") for r in results.values())

    return jsonify({
        "success": all_ok,
        "results": results,
        "skipped": skipped,
        "message": _summary(results, skipped),
    })


@notifications_bp.route("/api/notifications/providers", methods=["GET"])
def get_notification_providers():
    """Return the available providers, their defaults and, for the saved
    config, whether each enabled channel is ready or skipped (and why)."""
    from notifications import NotificationManager, get_default_notifications_config
    defaults = get_default_notifications_config()

    channels = {}
    config = load_config()
    if not config.get('error'):
        manager = NotificationManager(config)
        for name in manager.named_providers:
            channels[name] = {"ready": True}
        for name, reason in manager.skipped.items():
            channels[name] = {"ready": False, "reason": manager._scrub(reason)}

    return jsonify({
        "success": True,
        "providers": list(defaults["providers"].keys()),
        "defaults": defaults,
        "channels": channels,
    })


# Units whose journal may hold "Sent <event> notification via <Class>" lines
# from before delivery status was recorded. Fixed list; never user input.
_JOURNAL_UNITS = (
    "proxmox-balance-automigrate", "proxmox-collector",
    "proxmox-balance-recommendations", "proxmox-balance",
)
_SEND_LINE = re.compile(r"\b(Sent|Failed to send) (\w+) notification via (\w+)Provider\b")


def _backfill_from_journal() -> None:
    """Seed the status file once from the last 30 days of service journals,
    so sends made before status tracking existed still show up."""
    from notifications import PROVIDER_REGISTRY, get_send_status, update_send_status

    if get_send_status().get("backfilled"):
        return
    by_class = {cls.__name__.replace("Provider", ""): name for name, cls in PROVIDER_REGISTRY.items()}
    found: Dict[str, Dict[str, Any]] = {}
    try:
        cmd = ["/bin/journalctl", "--no-pager", "--since", "-30d", "-g", "notification via",
               "-o", "json", "--output-fields=MESSAGE"]
        for unit in _JOURNAL_UNITS:
            cmd += ["-u", unit]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=20).stdout
    except Exception:
        out = ""
    for line in out.splitlines():
        try:
            entry = json.loads(line)
            m = _SEND_LINE.search(entry.get("MESSAGE") or "")
            if not m or m.group(3) not in by_class:
                continue
            at = datetime.fromtimestamp(int(entry["__REALTIME_TIMESTAMP"]) / 1e6, timezone.utc).isoformat()
        except (ValueError, KeyError, TypeError):
            continue
        ok = m.group(1) == "Sent"
        fields = found.setdefault(by_class[m.group(3)], {})
        key = "last_sent" if ok else "last_failed"
        if at > fields.get(f"{key}_at", ""):  # journal is oldest first; keep newest
            fields[f"{key}_at"] = at
            fields[f"{key}_event"] = m.group(2)
    # Never overwrite something recorded live since tracking began.
    current = get_send_status().get("channels") or {}
    updates = {}
    for name, fields in found.items():
        have = current.get(name) or {}
        keep = {}
        for key in ("last_sent", "last_failed"):
            at = fields.get(f"{key}_at")
            if at and at > (have.get(f"{key}_at") or ""):
                keep[f"{key}_at"] = at
                keep[f"{key}_event"] = fields[f"{key}_event"]
        if keep:
            updates[name] = keep
    update_send_status(updates, meta={"backfilled": True})


@notifications_bp.route("/api/notifications/status", methods=["GET"])
@api_route
def notification_status():
    """Last successful and last failed send per channel.

    Returns {"channels": {name: {last_sent_at, last_sent_event,
    last_failed_at, last_failed_event}}}. Timestamps are UTC ISO-8601;
    events are names such as "action", "complete" or "test". No message
    text, errors or credentials are stored or returned.
    """
    from notifications import get_send_status

    if not get_send_status().get("backfilled"):
        _backfill_from_journal()
    channels = get_send_status().get("channels") or {}
    allowed = ("last_sent_at", "last_sent_event", "last_failed_at", "last_failed_event")
    return jsonify({
        "success": True,
        "channels": {name: {k: v for k, v in entry.items() if k in allowed}
                     for name, entry in channels.items() if isinstance(entry, dict)},
    })


@notifications_bp.route("/api/notifications/alerts", methods=["GET"])
@api_route
def list_alerts():
    """Active alerts and active silences.

    Returns {"alerts": [...], "silences": [...], "settings": {...}}. Each
    alert has fingerprint, alert_type, subject, label, value, threshold,
    first_seen, last_seen, notified_at, clear_count, repeats and silence
    (the silence covering it, or null). Settings are the resolve rules in
    effect (resolve_collections, resolve_margin).
    """
    from proxbalance import alert_state

    config = load_config()
    settings = alert_state.settings_from_config({} if config.get('error') else config)
    return jsonify({
        "success": True,
        "alerts": alert_state.get_active_alerts(),
        "silences": alert_state.list_silences(),
        "settings": {k: settings[k] for k in ("resolve_collections", "resolve_margin")},
    })


@notifications_bp.route("/api/notifications/silences", methods=["POST"])
@api_route
def create_silence():
    """Silence one alert or a whole alert type.

    Body: {"fingerprint": "<type>:<subject>"} or {"alert_type": "<type>"},
    plus "duration": "1h" | "8h" | "24h" | "resolved".
    """
    from proxbalance import alert_state

    body = request.get_json(silent=True) or {}
    fingerprint = body.get("fingerprint")
    alert_type = body.get("alert_type")
    duration = body.get("duration", "1h")
    for value in (fingerprint, alert_type, duration):
        if value is not None and (not isinstance(value, str) or len(value) > 200):
            return jsonify({"success": False, "error": "Invalid silence request"}), 400
    try:
        silence = alert_state.create_silence(fingerprint=fingerprint, alert_type=alert_type, duration=duration)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    return jsonify({"success": True, "silence": silence})


@notifications_bp.route("/api/notifications/silences/<int:silence_id>", methods=["DELETE"])
@api_route
def delete_silence(silence_id):
    """Remove a silence."""
    from proxbalance import alert_state

    if not alert_state.delete_silence(silence_id):
        return jsonify({"success": False, "error": "Silence not found"}), 404
    return jsonify({"success": True})
