"""Audit log route: who or what changed things, newest first."""

from flask import Blueprint, jsonify, request

from proxbalance import audit_log
from proxbalance.error_handlers import api_route

audit_bp = Blueprint("audit", __name__, url_prefix=None)


@audit_bp.route("/api/audit-log", methods=["GET"])
@api_route
def get_audit_log():
    """Audit events, newest first, one page at a time.

    Query args: ``since`` (ISO time), ``source`` (user, automation, system;
    comma list), ``action`` (group such as ``migration`` or a full action
    such as ``migration.failed``; comma list), ``limit`` (1-500, default
    100), ``before`` (the ``next`` cursor of the previous page).
    """
    try:
        page = audit_log.query(
            since=request.args.get("since"),
            source=request.args.get("source"),
            action=request.args.get("action"),
            limit=request.args.get("limit", audit_log.DEFAULT_LIMIT),
            before=request.args.get("before"),
        )
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    return jsonify({"success": True, **page, "retention_days": audit_log.RETENTION_DAYS,
                    "sources": list(audit_log.SOURCES), "groups": list(audit_log.GROUPS)})
