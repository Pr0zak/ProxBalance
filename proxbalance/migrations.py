"""
Migration execution logic for ProxBalance.

Provides functions to execute single and batch VM/CT migrations
via the Proxmox API, as well as migration task cancellation and
pre-migration validation checks.
"""

import os
import sys
import json
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import requests

from proxbalance.config_manager import (
    trigger_collection, BASE_PATH, CACHE_FILE, DISK_PREFIXES,
    load_config, read_cache_file,
)

# Re-exports for backwards compatibility (moved to proxbalance.outcomes)
from proxbalance.outcomes import (  # noqa: E402, F401
    _load_migration_outcomes,
    capture_pre_migration_snapshot,
    record_migration_outcome,
    update_post_migration_metrics,
    get_migration_outcomes,
    OUTCOMES_FILE,
    MAX_OUTCOME_ENTRIES,
    POST_CAPTURE_DELAY_SECONDS,
)


def execute_migration(proxmox, vmid, target, source, guest_type):
    """Execute a single migration using Proxmox API.

    Args:
        proxmox: ProxmoxAPI client instance.
        vmid: VM/CT ID to migrate.
        target: Target node name.
        source: Source node name.
        guest_type: 'VM' or 'CT'.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    try:
        if not vmid or not target:
            return {"success": False, "error": "Missing vmid or target_node"}, 400

        if not source:
            return {"success": False, "error": "Missing source_node"}, 400

        # Execute migration via API
        if guest_type == "VM":
            # Use kwargs with hyphenated parameter name for Proxmox API
            result = proxmox.nodes(source).qemu(vmid).migrate.post(
                target=target,
                online=1,
                **{'with-local-disks': 1}  # Allow migration of VMs with local disks
            )
        else:  # CT
            result = proxmox.nodes(source).lxc(vmid).migrate.post(
                target=target,
                restart=1
            )

        trigger_collection()

        return {
            "success": True,
            "message": f"Migration of {guest_type} {vmid} from {source} to {target} started. Task ID: {result}",
            "task_id": result,
            "source_node": source,
            "target_node": target,
            "vmid": vmid,
            "type": guest_type
        }, 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Migration error for VM {vmid}: {str(e)}\n{error_trace}", file=sys.stderr)
        return {"success": False, "error": str(e)}, 500


def execute_batch_migration(proxmox, migrations):
    """Execute multiple migrations via Proxmox API.

    Args:
        proxmox: ProxmoxAPI client instance.
        migrations: List of dicts, each with keys 'vmid', 'target_node',
                    'source_node', and 'type'.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    try:
        if not migrations:
            return {"success": False, "error": "No migrations provided"}, 400

        print(f"Starting batch migration of {len(migrations)} guests via API", file=sys.stderr)

        results = []
        for idx, mig in enumerate(migrations):
            try:
                vmid = mig.get("vmid")
                target = mig.get("target_node")
                source = mig.get("source_node")
                guest_type = mig.get("type")

                if not all([vmid, target, source, guest_type]):
                    results.append({
                        "vmid": vmid,
                        "success": False,
                        "error": "Missing required fields"
                    })
                    continue

                print(f"[{idx+1}/{len(migrations)}] Starting migration of {guest_type} {vmid} from {source} to {target}", file=sys.stderr)

                # Execute migration via API
                if guest_type == "VM":
                    task_id = proxmox.nodes(source).qemu(vmid).migrate.post(
                        target=target,
                        online=1
                    )
                else:  # CT
                    task_id = proxmox.nodes(source).lxc(vmid).migrate.post(
                        target=target,
                        restart=1
                    )

                results.append({
                    "vmid": vmid,
                    "success": True,
                    "task_id": task_id,
                    "message": "Migration started"
                })
                print(f"  \u2713 Migration of {vmid} started. Task ID: {task_id}", file=sys.stderr)

            except Exception as e:
                results.append({
                    "vmid": vmid,
                    "success": False,
                    "error": str(e)
                })
                print(f"  \u2717 Failed to start migration of {vmid}: {str(e)}", file=sys.stderr)

        # Trigger collection after batch completes
        trigger_collection()

        succeeded = sum(1 for r in results if r["success"])
        print(f"Batch migration initiated: {succeeded}/{len(migrations)} started", file=sys.stderr)

        return {
            "success": True,
            "results": results,
            "total": len(migrations),
            "succeeded": succeeded,
            "message": f"{succeeded} migration(s) started. Check Proxmox task logs for progress. Data will refresh automatically."
        }, 200

    except Exception as e:
        print(f"Batch migration error: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return {"success": False, "error": str(e)}, 500


def cancel_migration(config, task_id):
    """Cancel a running migration by stopping the Proxmox task.

    Args:
        config: Configuration dict with Proxmox connection details.
        task_id: Proxmox UPID string identifying the task.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    try:
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        verify_ssl = config.get('proxmox_verify_ssl', False)

        # Parse UPID to extract node: UPID:node:pid:pstart:starttime:type:vmid:user
        parts = task_id.split(':')
        if len(parts) < 2:
            return {"success": False, "error": "Invalid task ID format"}, 400

        node = parts[1]

        # Stop the task via Proxmox API
        url = f"https://{proxmox_host}:{proxmox_port}/api2/json/nodes/{node}/tasks/{task_id}"
        headers = {
            'Authorization': f'PVEAPIToken={token_id}={token_secret}'
        }

        response = requests.delete(url, headers=headers, verify=verify_ssl, timeout=10)

        if response.status_code == 200:
            return {"success": True, "message": "Migration cancelled"}, 200
        else:
            return {"success": False, "error": f"Failed to cancel: HTTP {response.status_code}"}, response.status_code

    except Exception as e:
        print(f"Cancel migration error: {str(e)}", file=sys.stderr)
        return {"success": False, "error": str(e)}, 500


# ---------------------------------------------------------------------------
# Pre-migration validation
# ---------------------------------------------------------------------------

def validate_migration(proxmox, vmid: int, source_node: str, target_node: str,
                       guest_type: str = "VM", cache_data: Dict = None) -> Dict:
    """
    Run pre-migration validation checks before executing a migration.

    Checks:
    1. Staleness — is cached data still fresh?
    2. Guest state — is the guest still running on the expected node?
    3. Resource availability — does the target have headroom?
    4. Storage re-verification — does target have required storage?
    5. Lock/snapshot check — any active locks blocking migration?
    6. Affinity validation — would migration violate anti-affinity rules?

    Returns a dict with 'passed' (bool), 'checks' (list), 'warnings' (list).
    """
    checks = []
    warnings = []

    # 1. Staleness check — is cache data recent?
    try:
        cache_file = Path(BASE_PATH) / "cluster_cache.json"
        if cache_file.exists():
            import os
            cache_age_seconds = (datetime.utcnow() - datetime.utcfromtimestamp(os.path.getmtime(cache_file))).total_seconds()
            cache_age_minutes = cache_age_seconds / 60

            if cache_age_minutes > 30:
                checks.append({
                    "check": "staleness",
                    "passed": False,
                    "detail": f"Cache data is {cache_age_minutes:.0f} minutes old (>30 min). Re-collect data first."
                })
            elif cache_age_minutes > 15:
                checks.append({
                    "check": "staleness",
                    "passed": True,
                    "detail": f"Cache data is {cache_age_minutes:.0f} minutes old"
                })
                warnings.append({
                    "check": "staleness",
                    "detail": f"Cache data is {cache_age_minutes:.0f} minutes old — consider refreshing"
                })
            else:
                checks.append({
                    "check": "staleness",
                    "passed": True,
                    "detail": f"Cache data is {cache_age_minutes:.0f} minutes old"
                })
        else:
            checks.append({
                "check": "staleness",
                "passed": False,
                "detail": "No cache file found"
            })
    except Exception as e:
        checks.append({"check": "staleness", "passed": True, "detail": f"Could not check cache age: {e}"})

    # 2. Guest state check — verify guest is running on expected node
    try:
        if proxmox:
            if guest_type == "VM":
                status_resp = proxmox.nodes(source_node).qemu(vmid).status.current.get()
            else:
                status_resp = proxmox.nodes(source_node).lxc(vmid).status.current.get()

            guest_status = status_resp.get("status", "unknown")
            if guest_status == "running":
                checks.append({
                    "check": "guest_state",
                    "passed": True,
                    "detail": f"Guest is running on {source_node}"
                })
            elif guest_status == "stopped":
                checks.append({
                    "check": "guest_state",
                    "passed": False,
                    "detail": f"Guest is stopped on {source_node} — cannot live-migrate"
                })
            else:
                checks.append({
                    "check": "guest_state",
                    "passed": False,
                    "detail": f"Guest status is '{guest_status}' on {source_node}"
                })
        else:
            checks.append({"check": "guest_state", "passed": True, "detail": "Proxmox client unavailable — skipped"})
    except Exception as e:
        # If we get an error, the guest may have already moved
        checks.append({
            "check": "guest_state",
            "passed": False,
            "detail": f"Could not verify guest on {source_node}: {e}"
        })

    # 3. Resource availability on target
    try:
        if proxmox:
            target_status = proxmox.nodes(target_node).status.get()
            if target_status:
                cpu_pct = target_status.get("cpu", 0) * 100
                mem_total = target_status.get("memory", {}).get("total", 1)
                mem_used = target_status.get("memory", {}).get("used", 0)
                mem_pct = (mem_used / mem_total * 100) if mem_total > 0 else 0

                if cpu_pct > 90 or mem_pct > 95:
                    checks.append({
                        "check": "resources",
                        "passed": False,
                        "detail": f"Target {target_node} critically loaded: CPU {cpu_pct:.0f}%, Memory {mem_pct:.0f}%"
                    })
                elif cpu_pct > 80 or mem_pct > 85:
                    checks.append({
                        "check": "resources",
                        "passed": True,
                        "detail": f"Target has limited headroom: CPU {cpu_pct:.0f}%, Memory {mem_pct:.0f}%"
                    })
                    warnings.append({
                        "check": "resources",
                        "detail": f"Target {target_node} is moderately loaded — CPU {cpu_pct:.0f}%, Memory {mem_pct:.0f}%"
                    })
                else:
                    cpu_headroom = 100 - cpu_pct
                    mem_headroom = 100 - mem_pct
                    checks.append({
                        "check": "resources",
                        "passed": True,
                        "detail": f"Target has {cpu_headroom:.0f}% CPU and {mem_headroom:.0f}% memory headroom"
                    })
            else:
                checks.append({"check": "resources", "passed": True, "detail": "Could not query target status"})
        else:
            checks.append({"check": "resources", "passed": True, "detail": "Proxmox client unavailable — skipped"})
    except Exception as e:
        checks.append({"check": "resources", "passed": True, "detail": f"Could not check resources: {e}"})

    # 4. Storage re-verification
    try:
        if proxmox:
            # Get guest config to find required storage
            if guest_type == "VM":
                guest_config = proxmox.nodes(source_node).qemu(vmid).config.get()
            else:
                guest_config = proxmox.nodes(source_node).lxc(vmid).config.get()

            required_storage = set()
            for key, value in guest_config.items():
                if key.startswith(DISK_PREFIXES):
                    if isinstance(value, str) and ':' in value:
                        required_storage.add(value.split(':')[0])

            if required_storage:
                target_storage_list = proxmox.nodes(target_node).storage.get()
                available = {s.get('storage') for s in target_storage_list
                            if s.get('enabled', 1) and s.get('active', 0)}
                missing = required_storage - available

                if missing:
                    checks.append({
                        "check": "storage",
                        "passed": False,
                        "detail": f"Target missing required storage: {', '.join(missing)}"
                    })
                else:
                    checks.append({
                        "check": "storage",
                        "passed": True,
                        "detail": f"Target has all required storage ({', '.join(required_storage)})"
                    })
            else:
                checks.append({"check": "storage", "passed": True, "detail": "No specific storage requirements"})
        else:
            checks.append({"check": "storage", "passed": True, "detail": "Proxmox client unavailable — skipped"})
    except Exception as e:
        checks.append({"check": "storage", "passed": True, "detail": f"Could not verify storage: {e}"})

    # 5. Lock check
    try:
        if proxmox:
            if guest_type == "VM":
                config = proxmox.nodes(source_node).qemu(vmid).config.get()
            else:
                config = proxmox.nodes(source_node).lxc(vmid).config.get()

            lock_value = config.get("lock", "")
            if lock_value:
                checks.append({
                    "check": "locks",
                    "passed": False,
                    "detail": f"Guest has active lock: '{lock_value}'"
                })
            else:
                checks.append({
                    "check": "locks",
                    "passed": True,
                    "detail": "No active locks"
                })
        else:
            checks.append({"check": "locks", "passed": True, "detail": "Proxmox client unavailable — skipped"})
    except Exception as e:
        checks.append({"check": "locks", "passed": True, "detail": f"Could not check locks: {e}"})

    # 6. Affinity validation (using cache_data if provided)
    try:
        if cache_data:
            guests = cache_data.get("guests", {})
            nodes = cache_data.get("nodes", {})
            guest_data = guests.get(str(vmid), {})
            exclude_groups = guest_data.get("tags", {}).get("exclude_groups", [])

            if exclude_groups:
                target_guests = nodes.get(target_node, {}).get("guests", [])
                conflict_found = False
                conflict_detail = ""
                for other_vmid in target_guests:
                    other = guests.get(str(other_vmid), {})
                    other_tags = other.get("tags", {}).get("all_tags", [])
                    for grp in exclude_groups:
                        if grp in other_tags:
                            conflict_found = True
                            conflict_detail = f"Anti-affinity conflict: {grp} with VM {other_vmid} on {target_node}"
                            break
                    if conflict_found:
                        break

                if conflict_found:
                    checks.append({"check": "affinity", "passed": False, "detail": conflict_detail})
                else:
                    checks.append({"check": "affinity", "passed": True, "detail": "No affinity conflicts"})
            else:
                checks.append({"check": "affinity", "passed": True, "detail": "No affinity rules"})
        else:
            checks.append({"check": "affinity", "passed": True, "detail": "No cache data — skipped"})
    except Exception as e:
        checks.append({"check": "affinity", "passed": True, "detail": f"Could not check affinity: {e}"})

    all_passed = all(c["passed"] for c in checks)

    return {
        "passed": all_passed,
        "checks": checks,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# Rollback awareness
# ---------------------------------------------------------------------------

def _load_migration_history() -> Dict:
    """Load migration history from disk.

    Returns:
        dict with 'migrations' list (may be empty).
    """
    history_file = os.path.join(BASE_PATH, "migration_history.json")
    try:
        if os.path.exists(history_file):
            with open(history_file, "r") as f:
                return json.load(f)
    except Exception as e:
        print(f"Error reading migration history: {e}", file=sys.stderr)
    return {"migrations": [], "state": {}}


def _save_migration_history(history: Dict) -> bool:
    """Persist migration history to disk.

    Returns:
        True on success, False on failure.
    """
    history_file = os.path.join(BASE_PATH, "migration_history.json")
    try:
        with open(history_file, "w") as f:
            json.dump(history, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving migration history: {e}", file=sys.stderr)
        return False


def get_rollback_info(vmid: int, config: Optional[Dict] = None) -> Dict:
    """Return rollback availability information for a guest.

    Checks migration history for the most recent successful migration of
    *vmid* and determines whether a rollback (reverse migration) is safe
    to perform.

    Args:
        vmid: The VM/CT ID to look up.
        config: Application config dict.  If *None* it will be loaded from
            disk via :func:`load_config`.

    Returns:
        A dict describing rollback availability::

            {
                "available": bool,
                "original_node": str or None,
                "current_node": str or None,
                "migration_timestamp": str or None,
                "time_since_migration_minutes": float or None,
                "original_node_online": bool,
                "rollback_safe": bool,
                "detail": str,
            }
    """
    if config is None:
        config = load_config()

    rollback_window_hours = config.get("rollback_window_hours", 2)

    # Default response — rollback not available
    info: Dict = {
        "available": False,
        "original_node": None,
        "current_node": None,
        "migration_timestamp": None,
        "time_since_migration_minutes": None,
        "original_node_online": False,
        "rollback_safe": False,
        "detail": "",
    }

    # --- find the most recent successful migration for this vmid ----------
    history = _load_migration_history()
    migrations = history.get("migrations", [])

    last_migration = None
    for migration in reversed(migrations):
        if migration.get("vmid") == vmid and migration.get("status") == "success":
            last_migration = migration
            break

    if last_migration is None:
        info["detail"] = f"No successful migration found for guest {vmid}"
        return info

    # --- check whether migration is within the rollback window ------------
    try:
        ts_str = last_migration.get("timestamp", "")
        # Handle both ISO formats with and without trailing 'Z'
        migration_time = datetime.fromisoformat(ts_str.rstrip("Z"))
    except (ValueError, TypeError):
        info["detail"] = "Could not parse migration timestamp"
        return info

    now = datetime.utcnow()
    elapsed = now - migration_time
    elapsed_minutes = elapsed.total_seconds() / 60.0

    if elapsed_minutes > rollback_window_hours * 60:
        info["detail"] = (
            f"Migration occurred {elapsed_minutes:.0f} minutes ago, "
            f"outside the {rollback_window_hours}h rollback window"
        )
        return info

    original_node = last_migration.get("source_node")
    current_node = last_migration.get("target_node")

    if not original_node or not current_node:
        info["detail"] = "Migration record missing source or target node"
        return info

    info["original_node"] = original_node
    info["current_node"] = current_node
    info["migration_timestamp"] = ts_str
    info["time_since_migration_minutes"] = round(elapsed_minutes, 1)

    # --- check that the original node is online ---------------------------
    cache_data = read_cache_file()
    if cache_data is None:
        info["detail"] = "Cluster cache unavailable — cannot verify original node"
        return info

    nodes = cache_data.get("nodes", {})
    original_node_data = nodes.get(original_node)

    if original_node_data is None:
        info["detail"] = f"Original node '{original_node}' not found in cluster"
        return info

    node_status = original_node_data.get("status", "unknown")
    is_online = node_status == "online"
    info["original_node_online"] = is_online

    if not is_online:
        info["detail"] = f"Original node '{original_node}' is {node_status}"
        return info

    # --- basic capacity check on the original node ------------------------
    try:
        cpu_pct = original_node_data.get("cpu_percent", 0)
        mem_pct = original_node_data.get("memory_percent", 0)

        if cpu_pct > 90 or mem_pct > 95:
            info["available"] = True
            info["rollback_safe"] = False
            info["detail"] = (
                f"Original node '{original_node}' is critically loaded: "
                f"CPU {cpu_pct:.0f}%, Memory {mem_pct:.0f}%"
            )
            return info

        if cpu_pct > 80 or mem_pct > 85:
            info["available"] = True
            info["rollback_safe"] = True
            info["detail"] = (
                f"Original node '{original_node}' is moderately loaded: "
                f"CPU {cpu_pct:.0f}%, Memory {mem_pct:.0f}% — rollback possible but monitor closely"
            )
            return info

        info["available"] = True
        info["rollback_safe"] = True
        info["detail"] = (
            f"Original node '{original_node}' has sufficient capacity: "
            f"CPU {cpu_pct:.0f}%, Memory {mem_pct:.0f}%"
        )
    except Exception as e:
        # If we can't check capacity, still allow rollback but note it
        info["available"] = True
        info["rollback_safe"] = True
        info["detail"] = f"Could not verify capacity on '{original_node}': {e}"

    return info
