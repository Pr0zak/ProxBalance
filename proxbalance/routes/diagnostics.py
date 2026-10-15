"""Diagnostics route: on-demand, read-only health checks (Settings → Diagnostics)."""

from flask import Blueprint, jsonify, current_app

from proxbalance.config_manager import load_config
from proxbalance.diagnostics import DiagContext, run_diagnostics

diagnostics_bp = Blueprint("diagnostics", __name__, url_prefix=None)


@diagnostics_bp.route("/api/diagnostics", methods=["GET"])
def get_diagnostics():
    """Run every diagnostic check and return one result per line.

    Never fails as a whole: each check reports its own pass/warn/fail, and
    the response is always 200 with ``success: true``. Secrets are scrubbed.
    """
    try:
        config = load_config()
    except Exception as e:  # noqa: BLE001
        config = {'error': True, 'message': str(e)[:200]}
    if not isinstance(config, dict):
        config = {'error': True, 'message': 'config is not an object'}
    try:
        ctx = DiagContext(config if not config.get('error') else {},
                          update_manager=current_app.config.get('update_manager'))
    except Exception:  # noqa: BLE001 — run_diagnostics builds its own
        ctx = None
    return jsonify(run_diagnostics(config, ctx=ctx))
