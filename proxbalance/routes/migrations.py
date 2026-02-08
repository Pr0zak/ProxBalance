import json
from pathlib import Path

from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_config, get_proxmox_client, BASE_PATH
from proxbalance.migrations import (
    execute_migration as _execute_migration,
    execute_batch_migration as _execute_batch_migration,
    cancel_migration as _cancel_migration,
    validate_migration as _validate_migration,
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


@migrations_bp.route("/api/migrate/validate", methods=["POST"])
def validate_migration():
    """Run pre-migration validation checks before executing a migration"""
    data = request.json
    vmid = data.get("vmid")
    source_node = data.get("source_node")
    target_node = data.get("target_node")
    guest_type = data.get("type", "VM")

    if not all([vmid, source_node, target_node]):
        return jsonify({"success": False, "error": "Missing vmid, source_node, or target_node"}), 400

    config = load_config()
    proxmox = None
    try:
        proxmox = get_proxmox_client(config)
    except ValueError:
        pass

    # Load cache data for affinity checks
    cache_data = None
    try:
        cache_file = Path(BASE_PATH) / "cluster_cache.json"
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
    except Exception:
        pass

    result = _validate_migration(
        proxmox, vmid, source_node, target_node,
        guest_type=guest_type, cache_data=cache_data
    )

    return jsonify({
        "success": True,
        "validation": result,
    })
