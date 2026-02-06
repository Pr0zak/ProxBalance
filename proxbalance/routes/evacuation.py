from flask import Blueprint, jsonify, request, current_app
import json, os, sys, uuid, threading
from proxbalance.config_manager import load_config, get_proxmox_client, BASE_PATH, CACHE_FILE, SESSIONS_DIR, DISK_PREFIXES
from proxbalance.evacuation import _get_session_file, _read_session, _write_session, _update_evacuation_progress, _execute_evacuation
from proxbalance.scoring import calculate_target_node_score, DEFAULT_PENALTY_CONFIG
from proxbalance.recommendations import check_storage_compatibility, build_storage_cache

evacuation_bp = Blueprint("evacuation", __name__)


@evacuation_bp.route("/api/nodes/evacuate/status/<session_id>", methods=["GET"])
def get_evacuation_status(session_id):
    """Get the status of an ongoing evacuation"""
    session = _read_session(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404

    # Return session data
    return jsonify({
        "success": True,
        "session_id": session_id,
        "status": session.get("status"),
        "progress": session.get("progress", {}),
        "results": session.get("results", []),
        "error": session.get("error"),
        "completed": session.get("completed", False)
    })

@evacuation_bp.route("/api/nodes/<node>/storage", methods=["GET"])
def get_node_storage(node):
    """Get all available storage on a specific node"""
    try:
        proxmox = get_proxmox_client()

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

        return jsonify({
            "success": True,
            "node": node,
            "storage": available_storage
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@evacuation_bp.route("/api/storage/verify", methods=["POST"])
def verify_storage_availability():
    """Verify that storage volumes are available on target nodes

    Request body:
    {
        "source_node": "pve1",
        "target_nodes": ["pve2", "pve3"],
        "guests": [100, 101, 102]
    }
    """
    try:
        data = request.get_json()
        source_node = data.get('source_node')
        target_nodes = data.get('target_nodes', [])
        guest_vmids = data.get('guests', [])

        if not source_node or not target_nodes:
            return jsonify({"success": False, "error": "Missing required parameters"}), 400

        proxmox = get_proxmox_client()

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

        return jsonify({
            "success": True,
            "source_node": source_node,
            "target_storage": {node: list(storage) for node, storage in target_storage_map.items()},
            "guests": guest_storage_info
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@evacuation_bp.route("/api/nodes/evacuate", methods=["POST"])
def evacuate_node():
    """Evacuate all VMs/CTs from a node"""
    try:
        data = request.json
        source_node = data.get("node")
        maintenance_nodes = set(data.get("maintenance_nodes", []))
        confirm = data.get("confirm", False)
        guest_actions = data.get("guest_actions", {})  # Actions per guest (migrate/ignore/poweroff)
        target_node = data.get("target_node", None)  # Optional: Force all migrations to specific node
        guest_targets = data.get("guest_targets", {})  # Optional: Per-guest target overrides

        if not source_node:
            return jsonify({"success": False, "error": "Missing node parameter"}), 400

        # Load cluster data to find guests on the node
        if not os.path.exists(CACHE_FILE):
            return jsonify({"success": False, "error": "No cluster data available"}), 500

        with open(CACHE_FILE, 'r') as f:
            cluster_data = json.load(f)

        # Access nodes as dictionary
        nodes = cluster_data.get('nodes', {})

        if source_node not in nodes:
            return jsonify({"success": False, "error": f"Node {source_node} not found"}), 404

        source_node_data = nodes[source_node]
        guest_vmids = source_node_data.get('guests', [])

        if not guest_vmids:
            return jsonify({"success": False, "error": f"No guests found on node {source_node}"}), 400

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
            return jsonify({"success": False, "error": "No available target nodes for evacuation"}), 400

        # If target_node is specified, validate it's in available_nodes
        if target_node:
            if target_node not in [n['node'] for n in available_nodes]:
                return jsonify({
                    "success": False,
                    "error": f"Target node '{target_node}' is not available (offline, in maintenance, or is source node)"
                }), 400
            print(f"Using forced target node: {target_node}", file=sys.stderr)
        else:
            print(f"Available target nodes: {[n['node'] for n in available_nodes]}", file=sys.stderr)

        # Setup Proxmox API
        config = load_config()
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
            return jsonify({
                "success": True,
                "plan": migration_plan,
                "source_node": source_node,
                "available_targets": [n['node'] for n in available_nodes],
                "total_guests": len(migration_plan),
                "will_migrate": len([p for p in migration_plan if not p['skipped']]),
                "will_skip": len([p for p in migration_plan if p['skipped']])
            })

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
        return jsonify({
            "success": True,
            "session_id": session_id,
            "message": "Evacuation started in background",
            "total_guests": len(guest_vmids)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
