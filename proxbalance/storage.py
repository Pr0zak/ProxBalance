"""
ProxBalance Storage Compatibility

Provides storage cache building, compatibility checks for migration targets,
and storage verification utilities used by both the recommendation engine
and evacuation planning.
"""

import sys
import traceback
from typing import Any, Dict, List, Optional, Set, Tuple

from proxbalance.config_manager import DISK_PREFIXES


# ---------------------------------------------------------------------------
# Storage cache for recommendation engine
# ---------------------------------------------------------------------------

def build_storage_cache(nodes: Dict[str, Any], proxmox: Optional[Any]) -> Dict[str, Set[str]]:
    """
    Build a cache of available storage for all nodes.

    Args:
        nodes: Dictionary of nodes
        proxmox: ProxmoxAPI client

    Returns:
        Dictionary mapping node names to sets of available storage IDs
    """
    storage_cache: Dict[str, Set[str]] = {}

    if not proxmox:
        return storage_cache

    for node_name in nodes:
        try:
            storage_list = proxmox.nodes(node_name).storage.get()
            available_storage: Set[str] = set()
            for storage in storage_list:
                if storage.get('enabled', 1) and storage.get('active', 0):
                    available_storage.add(storage.get('storage'))
            storage_cache[node_name] = available_storage
            print(f"Cached {len(available_storage)} storage volumes for node {node_name}", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not get storage for node {node_name}: {e}", file=sys.stderr)
            storage_cache[node_name] = set()

    return storage_cache


def check_storage_compatibility(guest: Dict[str, Any], src_node_name: str, tgt_node_name: str, proxmox: Optional[Any], storage_cache: Optional[Dict[str, Set[str]]] = None) -> bool:
    """
    Check if target node has all storage volumes required by the guest.

    Args:
        guest: Guest dictionary with vmid and type
        src_node_name: Source node name
        tgt_node_name: Target node name
        proxmox: ProxmoxAPI client
        storage_cache: Optional pre-built cache of node storage (for performance)

    Returns:
        True if target has all required storage, False otherwise
    """
    try:
        vmid = guest.get('vmid')
        guest_type = guest.get('type', 'VM')

        # Get guest configuration to extract storage volumes
        guest_config = None
        try:
            if guest_type == 'VM':
                guest_config = proxmox.nodes(src_node_name).qemu(vmid).config.get()
            else:  # CT
                guest_config = proxmox.nodes(src_node_name).lxc(vmid).config.get()
        except Exception as e:
            print(f"Warning: Could not get config for guest {vmid}: {e}", file=sys.stderr)
            return True  # Allow migration if we can't determine storage (avoid blocking valid migrations)

        if not guest_config:
            return True

        # Extract storage volumes from config
        storage_volumes: Set[str] = set()
        for key, value in guest_config.items():
            # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
            if key.startswith(DISK_PREFIXES):
                # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                if isinstance(value, str) and ':' in value:
                    storage_id = value.split(':')[0]
                    storage_volumes.add(storage_id)

        if not storage_volumes:
            return True  # No storage requirements, allow migration

        # Get target node storage (use cache if available, otherwise query API)
        available_storage: Set[str] = set()
        if storage_cache and tgt_node_name in storage_cache:
            # Use cached storage data (much faster!)
            available_storage = storage_cache[tgt_node_name]
        else:
            # Fallback to API query if cache not available
            try:
                target_storage_list = proxmox.nodes(tgt_node_name).storage.get()
                for storage in target_storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available_storage.add(storage.get('storage'))
            except Exception as e:
                print(f"Warning: Could not get storage for node {tgt_node_name}: {e}", file=sys.stderr)
                return True  # Allow migration if we can't determine target storage

        # Check if all required storage is available on target
        missing_storage = storage_volumes - available_storage

        if missing_storage:
            print(f"Storage incompatibility: Guest {vmid} requires storage {missing_storage} not available on {tgt_node_name}", file=sys.stderr)
            return False

        return True

    except Exception as e:
        print(f"Error checking storage compatibility for guest {guest.get('vmid')}: {e}", file=sys.stderr)
        traceback.print_exc()
        return True  # Allow migration on error to avoid blocking valid migrations


# ---------------------------------------------------------------------------
# Storage verification for evacuation planning
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
        available_storage: List[Dict[str, Any]] = []
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
        target_storage_map: Dict[str, Set[str]] = {}
        for target_node in target_nodes:
            try:
                storage_list = proxmox.nodes(target_node).storage.get()
                # Create set of available storage IDs
                available: Set[str] = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available.add(storage.get('storage'))
                target_storage_map[target_node] = available
            except Exception as e:
                print(f"Error getting storage for {target_node}: {e}", file=sys.stderr)
                target_storage_map[target_node] = set()

        # Check each guest's storage requirements
        guest_storage_info: List[Dict[str, Any]] = []
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
                storage_volumes: Set[str] = set()

                # Check all config keys for storage references
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if key.startswith(DISK_PREFIXES):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Find which targets have all required storage
                compatible_targets: List[str] = []
                incompatible_targets: List[Dict[str, Any]] = []

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
