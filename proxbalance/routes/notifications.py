from flask import Blueprint, jsonify, request
import sys
from proxbalance.config_manager import load_config
from proxbalance.error_handlers import api_route

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/api/notifications/test", methods=["POST"])
@api_route
def test_notifications():
    """Send a test notification to all enabled notification providers."""
    from notifications import NotificationManager

    config = load_config()
    if config.get('error'):
        return jsonify({"success": False, "error": config.get('message')}), 500

    manager = NotificationManager(config)

    if not manager.enabled:
        return jsonify({
            "success": False,
            "error": "Notifications are not enabled. Enable notifications first."
        }), 400

    if not manager.providers:
        return jsonify({
            "success": False,
            "error": "No notification providers are configured and enabled."
        }), 400

    results = manager.test()

    all_ok = all(r.get("success") for r in results.values())

    return jsonify({
        "success": all_ok,
        "results": results,
        "message": "Test notifications sent successfully" if all_ok else "Some providers failed"
    })


@notifications_bp.route("/api/notifications/providers", methods=["GET"])
def get_notification_providers():
    """Return the list of available notification providers and their config schema."""
    from notifications import get_default_notifications_config
    defaults = get_default_notifications_config()

    return jsonify({
        "success": True,
        "providers": list(defaults["providers"].keys()),
        "defaults": defaults
    })
