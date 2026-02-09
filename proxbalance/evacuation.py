"""
Node evacuation, session management, and storage verification for ProxBalance.

Provides file-based session tracking for evacuation operations, storage
compatibility verification across nodes, and the background execution logic
that migrates (or powers off / ignores) every guest on a source node to
the remaining available nodes.
"""

import json
import os
import sys
import time
import threading
import traceback
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from proxbalance.config_manager import (
    SESSIONS_DIR,
    CACHE_FILE,
    DISK_PREFIXES,
    trigger_collection,
)


# ---------------------------------------------------------------------------
# Session file helpers
# ---------------------------------------------------------------------------

def _get_session_file(session_id: str) -> str:
    """Get the file path for a session"""
    return os.path.join(SESSIONS_DIR, f"{session_id}.json")

def _read_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Read session from file"""
    session_file = _get_session_file(session_id)
    if os.path.exists(session_file):
        try:
            with open(session_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading session {session_id}: {e}", file=sys.stderr)
    return None

def _write_session(session_id: str, session_data: Dict[str, Any]) -> None:
    """Write session to file"""
    session_file = _get_session_file(session_id)
    try:
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
    except Exception as e:
        print(f"Error writing session {session_id}: {e}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Evacuation progress helpers
# ---------------------------------------------------------------------------

def _update_evacuation_progress(session_id: str, processed: int, successful: int, failed: int, result: Dict[str, Any]) -> None:
    """Helper to update evacuation session progress"""
    session = _read_session(session_id)
    if session:
        session["progress"]["processed"] = processed
        session["progress"]["successful"] = successful
        session["progress"]["failed"] = failed
        session["results"].append(result)
        _write_session(session_id, session)


# ---------------------------------------------------------------------------
# Evacuation status query
# ---------------------------------------------------------------------------

def get_evacuation_status(session_id: str) -> Tuple[Dict[str, Any], int]:
    """Get the status of an ongoing evacuation.

    Args:
        session_id: UUID string identifying the evacuation session.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    session = _read_session(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}, 404

    # Return session data
    return {
        "success": True,
        "session_id": session_id,
        "status": session.get("status"),
        "progress": session.get("progress", {}),
        "results": session.get("results", []),
        "error": session.get("error"),
        "completed": session.get("completed", False)
    }, 200


# ---------------------------------------------------------------------------
# Storage verification helpers
# ---------------------------------------------------------------------------

def get_node_storage(proxmox: Any, node: str) -> Tuple[Dict[str, Any], int]:
    """Get all available storage on a specific node.

    Args:
        proxmox: ProxmoxAPI client instance.
        node: Node name to query.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    try:
        # Get all storage for the node
        storage_list = proxmox.nodes(node).storage.get()

        # Filter for storage that is enabled and available
        available_storage = []
        for storage in storage_list:
            storage_id = storage.get('storage')
            enabled = storage.get('enabled', 1)
            active = storage.get('active', 0)

            # Only include enabled and active storage
            if enabled and active:
                available_storage.append({
                    'storage': storage_id,
                    'type': storage.get('type'),
                    'content': storage.get('content', '').split(','),
                    'available': storage.get('avail', 0),
                    'used': storage.get('used', 0),
                    'total': storage.get('total', 0),
                    'shared': storage.get('shared', 0)
                })

        return {
            "success": True,
            "node": node,
            "storage": available_storage
        }, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500


def verify_storage_availability(proxmox: Any, source_node: str, target_nodes: List[str], guest_vmids: List[int]) -> Tuple[Dict[str, Any], int]:
    """Verify that storage volumes are available on target nodes.

    Args:
        proxmox: ProxmoxAPI client instance.
        source_node: Name of the source node.
        target_nodes: List of target node names.
        guest_vmids: List of VM/CT IDs to check.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    try:
        if not source_node or not target_nodes:
            return {"success": False, "error": "Missing required parameters"}, 400

        # Get storage info for all target nodes
        target_storage_map = {}
        for target_node in target_nodes:
            try:
                storage_list = proxmox.nodes(target_node).storage.get()
                # Create set of available storage IDs
                available = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available.add(storage.get('storage'))
                target_storage_map[target_node] = available
            except Exception as e:
                print(f"Error getting storage for {target_node}: {e}", file=sys.stderr)
                target_storage_map[target_node] = set()

        # Check each guest's storage requirements
        guest_storage_info = []
        for vmid in guest_vmids:
            try:
                # Try to get guest config (qemu or lxc)
                guest_config = None
                guest_type = None
                try:
                    guest_config = proxmox.nodes(source_node).qemu(vmid).config.get()
                    guest_type = "qemu"
                except:
                    try:
                        guest_config = proxmox.nodes(source_node).lxc(vmid).config.get()
                        guest_type = "lxc"
                    except:
                        guest_storage_info.append({
                            "vmid": vmid,
                            "type": "unknown",
                            "storage_volumes": [],
                            "compatible_targets": [],
                            "incompatible_targets": target_nodes,
                            "error": "Cannot determine guest type"
                        })
                        continue

                # Extract storage from config
                storage_volumes = set()

                # Check all config keys for storage references
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if key.startswith(DISK_PREFIXES):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Find which targets have all required storage
                compatible_targets = []
                incompatible_targets = []

                for target_node in target_nodes:
                    target_storage = target_storage_map.get(target_node, set())
                    missing_storage = storage_volumes - target_storage

                    if not missing_storage:
                        compatible_targets.append(target_node)
                    else:
                        incompatible_targets.append({
                            "node": target_node,
                            "missing_storage": list(missing_storage)
                        })

                guest_storage_info.append({
                    "vmid": vmid,
                    "type": guest_type,
                    "storage_volumes": list(storage_volumes),
                    "compatible_targets": compatible_targets,
                    "incompatible_targets": incompatible_targets
                })

            except Exception as e:
                guest_storage_info.append({
                    "vmid": vmid,
                    "type": "unknown",
                    "storage_volumes": [],
                    "compatible_targets": [],
                    "incompatible_targets": target_nodes,
                    "error": str(e)
                })

        return {
            "success": True,
            "source_node": source_node,
            "target_storage": {node: list(storage) for node, storage in target_storage_map.items()},
            "guests": guest_storage_info
        }, 200

    except Exception as e:
        return {"success": False, "error": str(e)}, 500


# ---------------------------------------------------------------------------
# Main evacuation orchestration
# ---------------------------------------------------------------------------

def evacuate_node(proxmox: Any, source_node: str, maintenance_nodes: Optional[List[str]] = None, confirm: bool = False,
                  guest_actions: Optional[Dict[str, str]] = None, target_node: Optional[str] = None, guest_targets: Optional[Dict[str, str]] = None) -> Tuple[Dict[str, Any], int]:
    """Plan and optionally execute evacuation of all guests from a node.

    When *confirm* is ``False`` (the default), only the migration plan is
    returned for review.  When ``True``, the evacuation is started in a
    background thread and a session ID is returned for progress polling.

    Args:
        proxmox: ProxmoxAPI client instance.
        source_node: Name of the node to evacuate.
        maintenance_nodes: Set/list of node names to exclude as targets.
        confirm: If True, execute the evacuation; otherwise return the plan.
        guest_actions: Dict mapping vmid (str) to action ('migrate'/'ignore'/'poweroff').
        target_node: Optional forced target node for all migrations.
        guest_targets: Optional dict mapping vmid (str) to per-guest target node.

    Returns:
        Tuple of (result_dict, http_status_code).
    """
    try:
        if maintenance_nodes is None:
            maintenance_nodes = set()
        else:
            maintenance_nodes = set(maintenance_nodes)
        if guest_actions is None:
            guest_actions = {}
        if guest_targets is None:
            guest_targets = {}

        if not source_node:
            return {"success": False, "error": "Missing node parameter"}, 400

        # Load cluster data to find guests on the node
        if not os.path.exists(CACHE_FILE):
            return {"success": False, "error": "No cluster data available"}, 500

        with open(CACHE_FILE, 'r') as f:
            cluster_data = json.load(f)

        # Access nodes as dictionary
        nodes = cluster_data.get('nodes', {})

        if source_node not in nodes:
            return {"success": False, "error": f"Node {source_node} not found"}, 404

        source_node_data = nodes[source_node]
        guest_vmids = source_node_data.get('guests', [])

        if not guest_vmids:
            return {"success": False, "error": f"No guests found on node {source_node}"}, 400

        print(f"Found {len(guest_vmids)} guests on {source_node}: {guest_vmids}", file=sys.stderr)

        # Get available target nodes (excluding source and maintenance nodes)
        available_nodes = []
        for node_name, node_data in nodes.items():
            if (node_name != source_node and
                node_data.get('status') == 'online' and
                node_name not in maintenance_nodes):
                available_nodes.append({
                    'node': node_name,
                    'cpu': node_data.get('cpu_percent', 0),
                    'mem': node_data.get('mem_percent', 0)
                })

        if not available_nodes:
            return {"success": False, "error": "No available target nodes for evacuation"}, 400

        # If target_node is specified, validate it's in available_nodes
        if target_node:
            if target_node not in [n['node'] for n in available_nodes]:
                return {
                    "success": False,
                    "error": f"Target node '{target_node}' is not available (offline, in maintenance, or is source node)"
                }, 400
            print(f"Using forced target node: {target_node}", file=sys.stderr)
        else:
            print(f"Available target nodes: {[n['node'] for n in available_nodes]}", file=sys.stderr)

        # Generate migration plan first
        migration_plan = []

        # Track pending assignments to distribute load evenly
        pending_counts = {n['node']: 0 for n in available_nodes}

        # Get storage info for all available target nodes
        target_storage_map = {}
        for node_info in available_nodes:
            node = node_info['node']
            try:
                storage_list = proxmox.nodes(node).storage.get()
                # Create set of available storage IDs
                available_storage = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available_storage.add(storage.get('storage'))
                target_storage_map[node] = available_storage
            except Exception as e:
                print(f"Warning: Could not get storage for {node}: {e}", file=sys.stderr)
                target_storage_map[node] = set()

        for idx, vmid in enumerate(guest_vmids):
            try:
                # Determine guest type and get config
                guest_type = None
                guest_config = None
                guest_status = None

                try:
                    guest_config = proxmox.nodes(source_node).qemu(vmid).config.get()
                    guest_status = proxmox.nodes(source_node).qemu(vmid).status.current.get()
                    guest_type = "qemu"
                except:
                    try:
                        guest_config = proxmox.nodes(source_node).lxc(vmid).config.get()
                        guest_status = proxmox.nodes(source_node).lxc(vmid).status.current.get()
                        guest_type = "lxc"
                    except Exception as e:
                        migration_plan.append({
                            "vmid": vmid,
                            "name": f"Unknown-{vmid}",
                            "type": "unknown",
                            "status": "unknown",
                            "target": None,
                            "will_restart": False,
                            "skipped": True,
                            "skip_reason": f"Cannot determine type: {str(e)}"
                        })
                        continue

                # Get guest details - for LXC prefer hostname, for QEMU prefer name
                if guest_type == "lxc":
                    guest_name = (
                        guest_config.get('hostname') or
                        guest_config.get('name') or
                        guest_config.get('description') or
                        f'CT-{vmid}'
                    )
                else:  # qemu
                    guest_name = (
                        guest_config.get('name') or
                        guest_config.get('description') or
                        f'VM-{vmid}'
                    )

                # Clean up description if it has newlines (use first line only)
                if '\n' in str(guest_name):
                    guest_name = str(guest_name).split('\n')[0].strip()
                current_status = guest_status.get('status', 'unknown')

                # Check for 'ignore' tag
                tags = guest_config.get('tags', '').split(',') if guest_config.get('tags') else []
                if 'ignore' in [t.strip().lower() for t in tags]:
                    migration_plan.append({
                        "vmid": vmid,
                        "name": guest_name,
                        "type": guest_type,
                        "status": current_status,
                        "target": None,
                        "will_restart": False,
                        "skipped": True,
                        "skip_reason": "Has 'ignore' tag",
                        "storage_volumes": [],
                        "storage_compatible": True
                    })
                    continue

                # Extract storage requirements for this guest
                storage_volumes = set()
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if key.startswith(DISK_PREFIXES):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Filter available nodes to only those with compatible storage
                compatible_nodes = []
                for node_info in available_nodes:
                    node = node_info['node']
                    node_storage = target_storage_map.get(node, set())
                    missing_storage = storage_volumes - node_storage

                    if not missing_storage:
                        compatible_nodes.append(node_info)

                # Check if any compatible nodes exist
                if not compatible_nodes:
                    # No compatible targets - mark as skipped
                    missing_on_all = storage_volumes - set.intersection(*[target_storage_map.get(n['node'], set()) for n in available_nodes]) if available_nodes else storage_volumes
                    migration_plan.append({
                        "vmid": vmid,
                        "name": guest_name,
                        "type": guest_type,
                        "status": current_status,
                        "target": None,
                        "will_restart": False,
                        "skipped": True,
                        "skip_reason": f"Storage not available on any target: {', '.join(sorted(missing_on_all))}",
                        "storage_volumes": list(storage_volumes),
                        "storage_compatible": False
                    })
                    continue

                # Find best target node - priority: guest_targets > target_node > auto-select
                vmid_str = str(vmid)
                if vmid_str in guest_targets:
                    # Use per-guest target override
                    requested_target = guest_targets[vmid_str]
                    if requested_target not in [n['node'] for n in compatible_nodes]:
                        # Requested target not compatible - skip this guest
                        missing_storage = storage_volumes - target_storage_map.get(requested_target, set())
                        migration_plan.append({
                            "vmid": vmid,
                            "name": guest_name,
                            "type": guest_type,
                            "status": current_status,
                            "target": None,
                            "will_restart": False,
                            "skipped": True,
                            "skip_reason": f"Selected target '{requested_target}' missing required storage: {', '.join(sorted(missing_storage))}",
                            "storage_volumes": list(storage_volumes),
                            "storage_compatible": False
                        })
                        continue
                    selected_target = requested_target
                elif target_node:
                    # Check if forced target_node is compatible with this guest's storage
                    if target_node not in [n['node'] for n in compatible_nodes]:
                        # Forced target not compatible - skip this guest
                        migration_plan.append({
                            "vmid": vmid,
                            "name": guest_name,
                            "type": guest_type,
                            "status": current_status,
                            "target": None,
                            "will_restart": False,
                            "skipped": True,
                            "skip_reason": f"Target node '{target_node}' missing required storage: {', '.join(sorted(storage_volumes - target_storage_map.get(target_node, set())))}",
                            "storage_volumes": list(storage_volumes),
                            "storage_compatible": False
                        })
                        continue
                    selected_target = target_node
                else:
                    # Auto-select best target based on load
                    selected_target = min(compatible_nodes, key=lambda n: n['cpu'] + n['mem'] + (pending_counts[n['node']] * 10))['node']
                pending_counts[selected_target] += 1

                # Determine if will restart
                will_restart = False
                if guest_type == "qemu":
                    # QEMU VMs use online migration, no restart if running
                    will_restart = (current_status != "running")
                else:  # lxc
                    # LXC containers restart during migration
                    will_restart = (current_status == "running")

                migration_plan.append({
                    "vmid": vmid,
                    "name": guest_name,
                    "type": guest_type,
                    "status": current_status,
                    "target": selected_target,
                    "will_restart": will_restart,
                    "skipped": False,
                    "skip_reason": None,
                    "storage_volumes": list(storage_volumes),
                    "storage_compatible": True
                })

            except Exception as e:
                migration_plan.append({
                    "vmid": vmid,
                    "name": f"Unknown-{vmid}",
                    "type": "unknown",
                    "status": "unknown",
                    "target": None,
                    "will_restart": False,
                    "skipped": True,
                    "skip_reason": str(e),
                    "storage_volumes": [],
                    "storage_compatible": False
                })

        # If not confirmed, return the plan for review
        if not confirm:
            return {
                "success": True,
                "plan": migration_plan,
                "source_node": source_node,
                "available_targets": [n['node'] for n in available_nodes],
                "total_guests": len(migration_plan),
                "will_migrate": len([p for p in migration_plan if not p['skipped']]),
                "will_skip": len([p for p in migration_plan if p['skipped']])
            }, 200

        # Execute evacuation if confirmed - start in background thread
        session_id = str(uuid.uuid4())
        print(f"Starting confirmed evacuation of node {source_node} (session: {session_id})", file=sys.stderr)

        # Initialize session
        session_data = {
            "status": "starting",
            "node": source_node,
            "progress": {
                "total": len(guest_vmids),
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "current_guest": None,
                "remaining": len(guest_vmids)
            },
            "results": [],
            "completed": False,
            "error": None
        }
        _write_session(session_id, session_data)

        # Start evacuation in background thread
        def run_evacuation():
            _execute_evacuation(session_id, source_node, guest_vmids, available_nodes, guest_actions, proxmox)

        thread = threading.Thread(target=run_evacuation, daemon=True)
        thread.start()

        # Return session ID immediately
        return {
            "success": True,
            "session_id": session_id,
            "message": "Evacuation started in background",
            "total_guests": len(guest_vmids)
        }, 200

    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}, 500


# ---------------------------------------------------------------------------
# Background evacuation execution
# ---------------------------------------------------------------------------

def _execute_evacuation(session_id: str, source_node: str, guest_vmids: List[int], available_nodes: List[Dict[str, Any]], guest_actions: Dict[str, str], proxmox: Any) -> None:
    """Execute evacuation in background thread.

    Iterates over all guests on the source node, determines their type and
    storage requirements, and migrates (or powers off / ignores) each one
    according to *guest_actions*.  Progress is persisted to the session file
    after every guest so that callers can poll status.

    Args:
        session_id: UUID string for the evacuation session.
        source_node: Name of the node being evacuated.
        guest_vmids: List of VM/CT IDs on the source node.
        available_nodes: List of dicts with 'node', 'cpu', 'mem' keys.
        guest_actions: Dict mapping vmid (str) to action string.
        proxmox: ProxmoxAPI client instance.
    """
    try:
        print(f"[{session_id}] Executing evacuation of {len(guest_vmids)} guests from {source_node}", file=sys.stderr)
        results = []
        successful = 0
        failed = 0

        # Send evacuation started notification
        try:
            from proxbalance.config_manager import load_config as _load_cfg
            from notifications import send_notification
            _evac_config = _load_cfg()
            if not _evac_config.get("error"):
                send_notification(_evac_config, "evacuation", {
                    "node": source_node,
                    "status": "started",
                    "guest_count": len(guest_vmids),
                })
        except Exception as _ne:
            print(f"Warning: Could not send evacuation start notification: {_ne}", file=sys.stderr)

        # Update session status
        session = _read_session(session_id)
        if session:
            session["status"] = "running"
            _write_session(session_id, session)

        # Track pending assignments during execution to distribute load evenly
        execution_pending_counts = {n['node']: 0 for n in available_nodes}

        # Get storage info for all available target nodes
        target_storage_map = {}
        for node_info in available_nodes:
            node = node_info['node']
            try:
                storage_list = proxmox.nodes(node).storage.get()
                # Create set of available storage IDs
                available_storage = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available_storage.add(storage.get('storage'))
                target_storage_map[node] = available_storage
            except Exception as e:
                print(f"Warning: Could not get storage for {node}: {e}", file=sys.stderr)
                target_storage_map[node] = set()

        for idx, vmid in enumerate(guest_vmids):
            # Update current guest in progress
            session = _read_session(session_id)
            if session:
                session["progress"]["current_guest"] = {
                    "vmid": vmid,
                    "index": idx + 1,
                    "total": len(guest_vmids)
                }
                session["progress"]["remaining"] = len(guest_vmids) - idx
                _write_session(session_id, session)
            try:
                print(f"[{idx+1}/{len(guest_vmids)}] Processing VM/CT {vmid}", file=sys.stderr)

                # Determine guest type by trying to fetch from qemu first, then lxc
                guest_type = None
                guest_config = None

                try:
                    guest_config = proxmox.nodes(source_node).qemu(vmid).config.get()
                    guest_type = "qemu"
                except:
                    try:
                        guest_config = proxmox.nodes(source_node).lxc(vmid).config.get()
                        guest_type = "lxc"
                    except Exception as e:
                        print(f"  \u2717 Cannot determine type for {vmid}: {str(e)}", file=sys.stderr)
                        result = {
                            "vmid": vmid,
                            "success": False,
                            "error": f"Cannot determine guest type: {str(e)}"
                        }
                        results.append(result)
                        failed += 1
                        _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                        continue

                # Check for 'ignore' tag
                tags = guest_config.get('tags', '').split(',') if guest_config.get('tags') else []
                if 'ignore' in [t.strip().lower() for t in tags]:
                    print(f"  \u2298 Skipping {guest_type} {vmid} (has 'ignore' tag)", file=sys.stderr)
                    result = {
                        "vmid": vmid,
                        "success": False,
                        "error": "Skipped (ignore tag)"
                    }
                    results.append(result)
                    failed += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                # Check user-selected action for this guest
                action = guest_actions.get(str(vmid), 'migrate')

                if action == 'ignore':
                    print(f"  \u2298 Ignoring {guest_type} {vmid} (user selected)", file=sys.stderr)
                    result = {
                        "vmid": vmid,
                        "success": True,
                        "action": "ignored",
                        "message": "Ignored by user selection"
                    }
                    results.append(result)
                    successful += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                if action == 'poweroff':
                    print(f"  \u23fb Powering off {guest_type} {vmid}", file=sys.stderr)
                    try:
                        if guest_type == "qemu":
                            proxmox.nodes(source_node).qemu(vmid).status.stop.post()
                        else:  # lxc
                            proxmox.nodes(source_node).lxc(vmid).status.stop.post()

                        result = {
                            "vmid": vmid,
                            "success": True,
                            "action": "powered_off",
                            "message": "Powered off successfully"
                        }
                        results.append(result)
                        successful += 1
                        _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    except Exception as poweroff_error:
                        result = {
                            "vmid": vmid,
                            "success": False,
                            "error": f"Failed to power off: {str(poweroff_error)}"
                        }
                        results.append(result)
                        failed += 1
                        _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                # Extract storage requirements for this guest
                storage_volumes = set()
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if key.startswith(DISK_PREFIXES):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Filter available nodes to only those with compatible storage
                compatible_nodes = []
                for node_info in available_nodes:
                    node = node_info['node']
                    node_storage = target_storage_map.get(node, set())
                    missing_storage = storage_volumes - node_storage

                    if not missing_storage:
                        compatible_nodes.append(node_info)

                # Check if any compatible nodes exist
                if not compatible_nodes:
                    # No compatible targets - fail this migration
                    missing_on_all = storage_volumes - set.intersection(*[target_storage_map.get(n['node'], set()) for n in available_nodes]) if available_nodes else storage_volumes
                    error_msg = f"Storage not available on any target node: {', '.join(sorted(missing_on_all))}"
                    print(f"  \u2717 {error_msg}", file=sys.stderr)
                    result = {
                        "vmid": vmid,
                        "success": False,
                        "error": error_msg
                    }
                    results.append(result)
                    failed += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                # Find best target node from compatible nodes only
                target_node = min(compatible_nodes, key=lambda n: n['cpu'] + n['mem'] + (execution_pending_counts[n['node']] * 10))['node']
                execution_pending_counts[target_node] += 1

                print(f"  \u2192 Migrating {guest_type.upper()} {vmid} to {target_node} (storage: {', '.join(sorted(storage_volumes)) if storage_volumes else 'none'})", file=sys.stderr)

                # Execute migration
                if guest_type == "qemu":
                    task_id = proxmox.nodes(source_node).qemu(vmid).migrate.post(
                        target=target_node,
                        online=1
                    )
                else:  # lxc
                    task_id = proxmox.nodes(source_node).lxc(vmid).migrate.post(
                        target=target_node,
                        restart=1
                    )

                print(f"  \u2713 Migration started. Task ID: {task_id}", file=sys.stderr)

                # Wait for migration to complete (poll task status)
                max_wait = 600  # 10 minutes timeout
                poll_interval = 5  # Check every 5 seconds
                elapsed = 0
                task_status = None
                migration_success = False
                migration_error = None

                while elapsed < max_wait:
                    try:
                        task_status = proxmox.nodes(source_node).tasks(task_id).status.get()
                        status = task_status.get('status')

                        if status == 'stopped':
                            exitstatus = task_status.get('exitstatus')

                            # Check for successful completion
                            if exitstatus == 'OK':
                                print(f"  \u2713 Migration completed successfully", file=sys.stderr)
                                migration_success = True
                                break
                            else:
                                # Migration failed - get detailed error
                                # Read task log to get actual error message
                                try:
                                    task_log = proxmox.nodes(source_node).tasks(task_id).log.get(limit=50)
                                    # Get last few log lines that might contain error info
                                    error_lines = [line.get('t', '') for line in task_log[-10:] if line.get('t')]
                                    error_detail = '\n'.join(error_lines) if error_lines else f"exitstatus: {exitstatus}"

                                    # Check for common abort/cancel patterns
                                    if 'abort' in error_detail.lower():
                                        migration_error = f"Migration aborted: {exitstatus}"
                                    elif 'cancel' in error_detail.lower():
                                        migration_error = f"Migration cancelled: {exitstatus}"
                                    elif exitstatus == 'ABORT':
                                        migration_error = "Migration was aborted"
                                    else:
                                        migration_error = f"Migration failed (exitstatus: {exitstatus})"

                                    print(f"  \u2717 Migration failed. Exit status: {exitstatus}", file=sys.stderr)
                                    print(f"  \u2717 Error detail: {error_detail}", file=sys.stderr)
                                except Exception as log_error:
                                    migration_error = f"Migration failed with exitstatus: {exitstatus}"
                                    print(f"  \u2717 Could not read task log: {str(log_error)}", file=sys.stderr)

                                break

                        time.sleep(poll_interval)
                        elapsed += poll_interval

                    except Exception as poll_error:
                        # Only retry on connection errors, not on task failures
                        error_str = str(poll_error)
                        if 'task not found' in error_str.lower() or '595' in error_str:
                            migration_error = f"Task disappeared or node unreachable: {error_str}"
                            print(f"  \u2717 {migration_error}", file=sys.stderr)
                            break
                        else:
                            # Temporary connection issue, retry
                            print(f"  \u26a0 Task poll error (retrying): {error_str}", file=sys.stderr)
                            time.sleep(poll_interval)
                            elapsed += poll_interval

                # Check if migration timed out
                if elapsed >= max_wait and not migration_success and not migration_error:
                    migration_error = f"Migration timeout after {max_wait}s"
                    print(f"  \u2717 {migration_error}", file=sys.stderr)

                # Record result based on actual outcome
                if migration_success:
                    result = {
                        "vmid": vmid,
                        "target": target_node,
                        "success": True,
                        "task_id": task_id
                    }
                    results.append(result)
                    successful += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                else:
                    # Migration failed
                    result = {
                        "vmid": vmid,
                        "success": False,
                        "error": migration_error or "Unknown migration failure",
                        "task_id": task_id
                    }
                    results.append(result)
                    failed += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)

            except Exception as e:
                error_msg = str(e)
                result = {
                    "vmid": vmid,
                    "success": False,
                    "error": error_msg
                }
                results.append(result)
                failed += 1
                _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                print(f"  \u2717 Failed: {error_msg}", file=sys.stderr)

        # Trigger collection after evacuation
        trigger_collection()

        # Mark session as completed
        session = _read_session(session_id)
        if session:
            session["status"] = "completed"
            session["completed"] = True
            session["progress"]["current_guest"] = None
            _write_session(session_id, session)

        print(f"[{session_id}] Evacuation completed: {successful} successful, {failed} failed", file=sys.stderr)

        # Send evacuation completed notification
        try:
            from proxbalance.config_manager import load_config as _load_cfg
            from notifications import send_notification
            _evac_config = _load_cfg()
            if not _evac_config.get("error"):
                send_notification(_evac_config, "evacuation", {
                    "node": source_node,
                    "status": "completed",
                    "migrated": successful,
                    "failed": failed,
                })
        except Exception as _ne:
            print(f"Warning: Could not send evacuation complete notification: {_ne}", file=sys.stderr)

    except Exception as e:
        print(f"[{session_id}] Evacuation error: {str(e)}", file=sys.stderr)
        traceback.print_exc()

        # Mark session as failed
        session = _read_session(session_id)
        if session:
            session["status"] = "failed"
            session["completed"] = True
            session["error"] = str(e)
            _write_session(session_id, session)

        # Send evacuation failed notification
        try:
            from proxbalance.config_manager import load_config as _load_cfg
            from notifications import send_notification
            _evac_config = _load_cfg()
            if not _evac_config.get("error"):
                send_notification(_evac_config, "evacuation", {
                    "node": source_node,
                    "status": "failed",
                    "error": str(e),
                })
        except Exception as _ne:
            print(f"Warning: Could not send evacuation failure notification: {_ne}", file=sys.stderr)
