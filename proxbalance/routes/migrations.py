from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_config, get_proxmox_client
from proxbalance.migrations import (
    execute_migration as _execute_migration,
    execute_batch_migration as _execute_batch_migration,
    cancel_migration as _cancel_migration,
)

migrations_bp = Blueprint("migrations", __name__)


@migrations_bp.route("/api/migrate", methods=["POST"])
def execute_migration():
    """Execute a migration using Proxmox API"""
    data = request.json
    config = load_config()
    try:
        proxmox = get_proxmox_client(config)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500

    result, status = _execute_migration(
        proxmox,
        data.get("vmid"),
        data.get("target_node"),
        data.get("source_node"),
        data.get("type", "VM"),
    )
    return jsonify(result), status


@migrations_bp.route("/api/migrate/batch", methods=["POST"])
def execute_batch_migration():
    """Execute multiple migrations via Proxmox API"""
    config = load_config()
    try:
        proxmox = get_proxmox_client(config)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500

    data = request.json
    result, status = _execute_batch_migration(proxmox, data.get("migrations", []))
    return jsonify(result), status


@migrations_bp.route("/api/migrations/<path:task_id>/cancel", methods=["POST"])
def cancel_migration(task_id):
    """Cancel a running migration by stopping the Proxmox task"""
    config = load_config()
    result, status = _cancel_migration(config, task_id)
    return jsonify(result), status
