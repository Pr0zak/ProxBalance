"""
Migration execution logic for ProxBalance.

Provides functions to execute single and batch VM/CT migrations
via the Proxmox API, as well as migration task cancellation.
"""

import sys
import traceback

import requests

from proxbalance.config_manager import trigger_collection


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
