from flask import Blueprint, jsonify, request, current_app
import json, os, sys, re
import requests
from proxbalance.config_manager import load_config, get_proxmox_client, trigger_collection, BASE_PATH, CACHE_FILE

guests_bp = Blueprint("guests", __name__)


def read_cache():
    return current_app.config['cache_manager'].get()


@guests_bp.route("/api/guests/<int:vmid>/location", methods=["GET"])
def get_guest_location(vmid):
    """Get current location and status of a guest from Proxmox (fast, no full collection)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Search all nodes for this guest
        for node in proxmox.nodes.get():
            node_name = node['node']

            # Check VMs
            try:
                vms = proxmox.nodes(node_name).qemu.get()
                for vm in vms:
                    if vm['vmid'] == vmid:
                        return jsonify({
                            "success": True,
                            "vmid": vmid,
                            "node": node_name,
                            "type": "VM",
                            "status": vm.get('status', 'unknown'),
                            "name": vm.get('name', f'vm-{vmid}')
                        })
            except:
                pass

            # Check CTs
            try:
                cts = proxmox.nodes(node_name).lxc.get()
                for ct in cts:
                    if ct['vmid'] == vmid:
                        return jsonify({
                            "success": True,
                            "vmid": vmid,
                            "node": node_name,
                            "type": "CT",
                            "status": ct.get('status', 'unknown'),
                            "name": ct.get('name', f'ct-{vmid}')
                        })
            except:
                pass

        return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

    except Exception as e:
        print(f"Error getting location for guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/guests/locations", methods=["GET"])
def get_all_guest_locations():
    """Get current locations of all guests from Proxmox (fast, lightweight)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        guests = {}
        nodes = {}

        # Get all nodes and their guests
        for node in proxmox.nodes.get():
            node_name = node['node']
            nodes[node_name] = {
                'name': node_name,
                'status': node.get('status', 'unknown'),
                'guests': []
            }

            # Get VMs
            try:
                vms = proxmox.nodes(node_name).qemu.get()
                for vm in vms:
                    vmid = vm['vmid']
                    guests[vmid] = {
                        'vmid': vmid,
                        'node': node_name,
                        'type': 'VM',
                        'status': vm.get('status', 'unknown'),
                        'name': vm.get('name', f'vm-{vmid}')
                    }
                    nodes[node_name]['guests'].append(vmid)
            except Exception as e:
                print(f"Error getting VMs from {node_name}: {str(e)}", file=sys.stderr)

            # Get CTs
            try:
                cts = proxmox.nodes(node_name).lxc.get()
                for ct in cts:
                    vmid = ct['vmid']
                    guests[vmid] = {
                        'vmid': vmid,
                        'node': node_name,
                        'type': 'CT',
                        'status': ct.get('status', 'unknown'),
                        'name': ct.get('name', f'ct-{vmid}')
                    }
                    nodes[node_name]['guests'].append(vmid)
            except Exception as e:
                print(f"Error getting CTs from {node_name}: {str(e)}", file=sys.stderr)

        return jsonify({
            "success": True,
            "guests": guests,
            "nodes": nodes
        })

    except Exception as e:
        print(f"Error getting guest locations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/tasks/<node>/<taskid>", methods=["GET"])
def get_task_status(node, taskid):
    """Get status of a Proxmox task (for migration tracking)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Get task status
        task_status = proxmox.nodes(node).tasks(taskid).status.get()

        # Try to extract VMID from task to get disk size
        import re
        # Task ID format: UPID:node:pid:pstart:starttime:type:vmid:user:
        # Extract VMID which comes after the task type (qmigrate/vzmigrate)
        vmid_match = re.search(r':(qmigrate|vzmigrate):(\d+):', taskid)
        total_disk_size = None

        if vmid_match:
            vmid = int(vmid_match.group(2))
            try:
                # Try to get VM/CT config from the node where task is running
                vm_config = None
                guest_type = None

                # Try to get VM config first
                try:
                    vm_config = proxmox.nodes(node).qemu(vmid).config.get()
                    guest_type = 'qemu'
                except:
                    # If not a VM, try CT
                    try:
                        vm_config = proxmox.nodes(node).lxc(vmid).config.get()
                        guest_type = 'lxc'
                    except:
                        # Guest might have moved during migration, try to find it
                        try:
                            cluster_resources = proxmox.cluster.resources.get(type='vm')
                            for resource in cluster_resources:
                                if resource.get('vmid') == vmid:
                                    actual_node = resource.get('node')
                                    resource_type = resource.get('type')
                                    if resource_type == 'qemu':
                                        vm_config = proxmox.nodes(actual_node).qemu(vmid).config.get()
                                        guest_type = 'qemu'
                                    else:
                                        vm_config = proxmox.nodes(actual_node).lxc(vmid).config.get()
                                        guest_type = 'lxc'
                                    break
                        except:
                            pass

                if vm_config:
                    from proxbalance.config_manager import DISK_PREFIXES
                    # Sum up all disk sizes
                    total_size = 0
                    for key, value in vm_config.items():
                        # For VMs: virtio0, scsi0, sata0, ide0, etc.
                        # For CTs: rootfs, mp0, mp1, etc.
                        if key.startswith(DISK_PREFIXES):
                            if isinstance(value, str):
                                # Parse size from string like "local-lvm:vm-100-disk-0,size=2G"
                                size_match = re.search(r'size=(\d+)([KMGT]?)', value)
                                if size_match:
                                    size_value = int(size_match.group(1))
                                    size_unit = size_match.group(2) or 'G'  # Default to GB

                                    # Convert to bytes
                                    multipliers = {'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4}
                                    size_bytes = size_value * multipliers.get(size_unit, 1024**3)
                                    total_size += size_bytes

                    if total_size > 0:
                        total_disk_size = total_size
                        current_app.logger.info(f"Found disk size for VMID {vmid}: {total_size} bytes ({total_size / (1024**3):.2f} GB)")
                    else:
                        current_app.logger.warning(f"No disk size found for VMID {vmid} in config")
                else:
                    current_app.logger.warning(f"Could not get VM config for VMID {vmid}")
            except Exception as e:
                current_app.logger.error(f"Error getting disk size for VMID {vmid}: {str(e)}")

        # Get task log to parse progress information
        progress_info = None
        try:
            task_log = proxmox.nodes(node).tasks(taskid).log.get()

            # Parse log for progress information
            # Look for patterns like:
            # - "mirror-scsi0: transferred 11.3 GiB of 16.0 GiB (70.88%) in 16s"
            # - "123456789 bytes (123 MB, 117 MiB) copied"
            if task_log:
                latest_percentage = None
                latest_transferred = None
                total_size = None

                for entry in task_log:
                    line = entry.get('t', '')

                    # Look for mirror progress: "mirror-scsi0: transferred X GiB of Y GiB (Z%)"
                    if 'mirror' in line and 'transferred' in line and 'GiB' in line:
                        match = re.search(r'transferred\s+([\d.]+)\s+GiB\s+of\s+([\d.]+)\s+GiB\s+\(([\d.]+)%\)', line)
                        if match:
                            transferred_gib = float(match.group(1))
                            total_gib = float(match.group(2))
                            percentage = float(match.group(3))

                            latest_transferred = transferred_gib
                            total_size = total_gib
                            latest_percentage = int(percentage)

                if latest_percentage is not None and latest_transferred is not None:
                    progress_info = {
                        "transferred_gib": latest_transferred,
                        "total_gib": total_size,
                        "percentage": latest_percentage,
                        "human_readable": f"{latest_transferred:.1f} GiB of {total_size:.1f} GiB"
                    }
        except Exception as e:
            current_app.logger.debug(f"Could not parse progress from task log: {str(e)}")

        response = {
            "success": True,
            "status": task_status.get('status', 'unknown'),
            "exitstatus": task_status.get('exitstatus', 'unknown'),
            "node": node,
            "taskid": taskid
        }

        if progress_info:
            response['progress'] = progress_info

        return jsonify(response)

    except Exception as e:
        print(f"Error getting task status {node}/{taskid}: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/guests/<int:vmid>/migration-status", methods=["GET"])
def get_guest_migration_status(vmid):
    """Check if a guest has an active migration task"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Get all cluster tasks
        tasks = proxmox.cluster.tasks.get()

        # Find active migration tasks for this guest
        # Active tasks have pid != None
        # Migration types: qmigrate (VM) or vzmigrate (CT)
        for task in tasks:
            if task.get('pid') is not None:  # Active task
                task_type = task.get('type', '')
                if task_type in ['qmigrate', 'vzmigrate']:
                    # Extract vmid from task ID field (format: "VMID - migrate to node")
                    task_id = task.get('id', '')
                    if str(vmid) in task_id or task.get('vmid') == vmid:
                        return jsonify({
                            "success": True,
                            "is_migrating": True,
                            "task_id": task.get('upid'),
                            "source_node": task.get('node'),
                            "type": task_type
                        })

        # No active migration found
        return jsonify({
            "success": True,
            "is_migrating": False
        })

    except Exception as e:
        print(f"Error checking migration status for guest {vmid}: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/tasks/<node>/<taskid>/stop", methods=["POST"])
def stop_task(node, taskid):
    """Stop a running Proxmox task (cancel migration)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        try:
            proxmox = get_proxmox_client(config, timeout=30)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Stop the task
        proxmox.nodes(node).tasks(taskid).delete()

        return jsonify({
            "success": True,
            "message": f"Task {taskid} on {node} has been stopped"
        })

    except Exception as e:
        print(f"Error stopping task {node}/{taskid}: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/guests/<int:vmid>/tags/refresh", methods=["POST"])
def refresh_guest_tags(vmid):
    """Refresh tags for a specific guest from Proxmox (fast, no full collection)"""
    try:
        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        # Get fresh tags from Proxmox
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        # Parse tags like collector does
        has_ignore = "ignore" in tags
        exclude_groups = [t for t in tags if t.startswith("exclude_")]

        return jsonify({
            "success": True,
            "vmid": vmid,
            "tags": {
                "has_ignore": has_ignore,
                "exclude_groups": exclude_groups,
                "all_tags": tags
            }
        })

    except Exception as e:
        print(f"Error refreshing tags for guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/guests/<int:vmid>/tags", methods=["GET"])
def get_guest_tags(vmid):
    """Get tags for a specific guest"""
    try:
        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        # Require API token authentication
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        return jsonify({
            "success": True,
            "vmid": vmid,
            "tags": tags
        })

    except Exception as e:
        print(f"Error getting tags for guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/guests/<int:vmid>/tags", methods=["POST"])
def add_guest_tag(vmid):
    """Add a tag to a guest"""
    try:
        data = request.json
        new_tag = data.get("tag", "").strip()

        if not new_tag:
            return jsonify({"success": False, "error": "Tag name is required"}), 400

        # Validate tag format (no semicolons or spaces)
        if ";" in new_tag or " " in new_tag:
            return jsonify({
                "success": False,
                "error": "Tag cannot contain spaces or semicolons"
            }), 400

        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        # Require API token authentication
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        # Check if tag already exists
        if new_tag in tags:
            return jsonify({
                "success": False,
                "error": f"Tag '{new_tag}' already exists on this guest"
            }), 400

        # Add the new tag
        tags.append(new_tag)
        new_tags_str = ";".join(tags)

        # Update tags via Proxmox API
        if guest_type == "vm":
            proxmox.nodes(node).qemu(vmid).config.put(tags=new_tags_str)
        else:  # CT
            proxmox.nodes(node).lxc(vmid).config.put(tags=new_tags_str)

        # Trigger collection to update cache
        trigger_collection()

        return jsonify({
            "success": True,
            "message": f"Tag '{new_tag}' added to {guest_type.upper()} {vmid}",
            "tags": tags
        })

    except Exception as e:
        print(f"Error adding tag to guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@guests_bp.route("/api/guests/<int:vmid>/tags/<tag>", methods=["DELETE"])
def remove_guest_tag(vmid, tag):
    """Remove a tag from a guest"""
    try:
        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        # Require API token authentication
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        # Check if tag exists
        if tag not in tags:
            return jsonify({
                "success": False,
                "error": f"Tag '{tag}' not found on this guest"
            }), 404

        # Remove the tag
        tags.remove(tag)
        new_tags_str = ";".join(tags)

        # Update tags via Proxmox API
        if guest_type == "vm":
            proxmox.nodes(node).qemu(vmid).config.put(tags=new_tags_str)
        else:  # CT
            proxmox.nodes(node).lxc(vmid).config.put(tags=new_tags_str)

        # Trigger collection to update cache
        trigger_collection()

        return jsonify({
            "success": True,
            "message": f"Tag '{tag}' removed from {guest_type.upper()} {vmid}",
            "tags": tags
        })

    except Exception as e:
        print(f"Error removing tag from guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
