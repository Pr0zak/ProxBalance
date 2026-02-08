import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_config, get_proxmox_client, BASE_PATH
from proxbalance.migrations import (
    execute_migration as _execute_migration,
    execute_batch_migration as _execute_batch_migration,
    cancel_migration as _cancel_migration,
    validate_migration as _validate_migration,
    get_rollback_info as _get_rollback_info,
    capture_pre_migration_snapshot as _capture_pre_snapshot,
    record_migration_outcome as _record_outcome,
    update_post_migration_metrics as _update_post_metrics,
    _load_migration_history,
    _save_migration_history,
    _load_migration_outcomes,
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

    vmid = data.get("vmid")
    target_node = data.get("target_node")
    source_node = data.get("source_node")
    guest_type = data.get("type", "VM")

    # Capture pre-migration snapshot before executing
    pre_snapshot = _capture_pre_snapshot(vmid, source_node, target_node)

    result, status = _execute_migration(
        proxmox, vmid, target_node, source_node, guest_type,
    )

    # Record outcome tracking if migration succeeded
    if result.get("success") and pre_snapshot:
        predicted = data.get("predicted_improvement")
        _record_outcome(vmid, source_node, target_node, guest_type,
                        pre_snapshot, predicted_improvement=predicted)

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


@migrations_bp.route("/api/migrate/rollback-info/<int:vmid>", methods=["GET"])
def rollback_info(vmid):
    """Return rollback availability information for a guest."""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config.get("message", "Config error")}), 500

        info = _get_rollback_info(vmid, config=config)
        return jsonify({"success": True, "rollback_info": info})
    except Exception as e:
        print(f"Error getting rollback info for {vmid}: {e}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@migrations_bp.route("/api/migrate/rollback", methods=["POST"])
def execute_rollback():
    """Execute a rollback migration — migrate a guest back to its original node."""
    data = request.json or {}
    vmid = data.get("vmid")

    if not vmid:
        return jsonify({"success": False, "error": "Missing vmid"}), 400

    try:
        vmid = int(vmid)
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "vmid must be an integer"}), 400

    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config.get("message", "Config error")}), 500

        # Validate rollback is available and safe
        info = _get_rollback_info(vmid, config=config)

        if not info.get("available"):
            return jsonify({
                "success": False,
                "error": f"Rollback not available: {info.get('detail', 'unknown reason')}",
                "rollback_info": info,
            }), 400

        if not info.get("rollback_safe"):
            return jsonify({
                "success": False,
                "error": f"Rollback not safe: {info.get('detail', 'unknown reason')}",
                "rollback_info": info,
            }), 400

        original_node = info["original_node"]
        current_node = info["current_node"]

        # Determine guest type from cache data
        cache_file = Path(BASE_PATH) / "cluster_cache.json"
        guest_type = "VM"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    cache_data = json.load(f)
                guest_data = cache_data.get("guests", {}).get(str(vmid), {})
                guest_type = guest_data.get("type", "VM")
            except Exception:
                pass

        # Execute the migration via Proxmox
        proxmox = get_proxmox_client(config)
        result, status_code = _execute_migration(
            proxmox, vmid, original_node, current_node, guest_type
        )

        # Record rollback in migration history
        history = _load_migration_history()
        migration_record = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "vmid": vmid,
            "source_node": current_node,
            "target_node": original_node,
            "reason": f"Rollback: migrating back to original node '{original_node}'",
            "status": "success" if result.get("success") else "failed",
            "initiated_by": "rollback",
            "dry_run": False,
        }
        if result.get("task_id"):
            migration_record["task_id"] = result["task_id"]
        if result.get("error"):
            migration_record["error"] = result["error"]

        history.setdefault("migrations", []).append(migration_record)
        history["state"] = {
            "last_run": datetime.utcnow().isoformat() + "Z",
            "in_progress": False,
        }
        _save_migration_history(history)

        return jsonify({
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "rollback_info": info,
            "migration": migration_record,
        }), status_code

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500
    except Exception as e:
        print(f"Error executing rollback for {vmid}: {e}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Migration Outcome Tracking
# ---------------------------------------------------------------------------

@migrations_bp.route("/api/migrate/outcomes", methods=["GET"])
def get_migration_outcomes():
    """Return migration outcomes with optional vmid filter and limit."""
    try:
        vmid_filter = request.args.get("vmid", type=int)
        limit = request.args.get("limit", default=20, type=int)

        outcomes = _load_migration_outcomes()

        # Filter by vmid if provided
        if vmid_filter is not None:
            outcomes = [o for o in outcomes if o.get("vmid") == vmid_filter]

        # Return most recent first, limited
        outcomes = list(reversed(outcomes))[:limit]

        return jsonify({
            "success": True,
            "outcomes": outcomes,
            "total": len(outcomes),
        })
    except Exception as e:
        print(f"Error fetching migration outcomes: {e}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@migrations_bp.route("/api/migrate/outcomes/refresh", methods=["POST"])
def refresh_migration_outcomes():
    """Trigger post-migration metric capture for pending outcomes."""
    try:
        result = _update_post_metrics()
        return jsonify({
            "success": True,
            "updated": result.get("updated", 0),
            "skipped": result.get("skipped", 0),
            "error": result.get("error"),
        })
    except Exception as e:
        print(f"Error refreshing migration outcomes: {e}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500
