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
