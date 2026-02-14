#!/usr/bin/env python3
"""
ProxBalance Automated Migration System

Automatically executes VM migrations based on recommendations, schedules, and safety rules.
"""

import sys
import os
import json
import fcntl
import logging
import time as time_module
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Any
import uuid
import re
import pytz
import requests

# Constants
MIGRATION_TASK_TYPES = ('qmigrate', 'vzmigrate')
MAX_RUN_HISTORY = 50

# Paths
BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "config.json"
CACHE_FILE = BASE_DIR / "cluster_cache.json"
HISTORY_FILE = BASE_DIR / "migration_history.json"
LOCK_FILE = BASE_DIR / "automigrate.lock"
TRACKING_FILE = BASE_DIR / "recommendation_tracking.json"

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(BASE_DIR / "automigrate.log")
    ]
)
logger = logging.getLogger(__name__)


def acquire_lock() -> int:
    """
    Prevent concurrent runs using file lock.

    Returns:
        File descriptor of the lock file

    Raises:
        SystemExit: If another instance is already running
    """
    try:
        lock_fd = open(LOCK_FILE, 'w')
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        lock_fd.write(str(os.getpid()))
        lock_fd.flush()
        return lock_fd
    except IOError:
        logger.error("Another automigrate instance is running")
        sys.exit(1)


def release_lock(lock_fd: int):
    """Release the file lock."""
    fcntl.flock(lock_fd, fcntl.LOCK_UN)
    lock_fd.close()
    if LOCK_FILE.exists():
        LOCK_FILE.unlink()


def load_config() -> Dict[str, Any]:
    """Load configuration from config.json."""
    if not CONFIG_FILE.exists():
        logger.error(f"Configuration file not found: {CONFIG_FILE}")
        sys.exit(1)

    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def read_cache() -> Dict[str, Any]:
    """Read data from cache.json."""
    if not CACHE_FILE.exists():
        logger.error(f"Cache file not found: {CACHE_FILE}")
        sys.exit(1)

    with open(CACHE_FILE, 'r') as f:
        return json.load(f)


def load_history() -> Dict[str, Any]:
    """Load migration history."""
    if not HISTORY_FILE.exists():
        return {"migrations": [], "state": {}}

    with open(HISTORY_FILE, 'r') as f:
        return json.load(f)


def save_history(history: Dict[str, Any]):
    """Save migration history atomically."""
    tmp_file = str(HISTORY_FILE) + '.tmp'
    with open(tmp_file, 'w') as f:
        json.dump(history, f, indent=2)
    os.rename(tmp_file, str(HISTORY_FILE))


def _check_time_window(config, window_key, window_label, default_when_empty):
    """
    Check if current time falls within any of the configured time windows.

    Args:
        config: Configuration dictionary
        window_key: Key in schedule dict ('migration_windows' or 'blackout_windows')
        window_label: Label for logging ('window' or 'blackout')
        default_when_empty: Tuple to return when no windows defined

    Returns:
        Tuple of (in_window, message)
    """
    schedule = config.get('automated_migrations', {}).get('schedule', {})
    windows = schedule.get(window_key, [])

    if not windows:
        return default_when_empty

    global_tz = schedule.get('timezone', 'UTC')

    for window in windows:
        if not window.get('enabled', True):
            continue
        try:
            tz = pytz.timezone(window.get('timezone', global_tz))
            now = datetime.now(tz)
            current_day = now.strftime('%A').lower()
            window_days = [d.lower() for d in window.get('days', [])]
            if current_day not in window_days:
                continue
            start = datetime.strptime(window['start_time'], '%H:%M').time()
            end = datetime.strptime(window['end_time'], '%H:%M').time()
            current = now.time()
            if start <= end:
                in_window = start <= current <= end
            else:
                in_window = current >= start or current <= end
            if in_window:
                logger.info(f"In {window_label}: {window['name']} ({tz} time: {now.strftime('%H:%M')})")
                return True, f"In {window_label}: {window['name']} ({tz} time: {now.strftime('%H:%M')})"
        except Exception as e:
            logger.error(f"Error checking {window_label} {window.get('name', 'unknown')}: {e}")
            continue

    try:
        tz = pytz.timezone(global_tz)
        now = datetime.now(tz)
        return False, f"Outside all {window_label}s (Current time: {now.strftime('%A')} {now.strftime('%H:%M')} {global_tz})"
    except:
        return False, f"Outside all {window_label}s"


def is_in_migration_window(config: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Check if current time is in allowed migration window.

    Args:
        config: Configuration dictionary

    Returns:
        Tuple of (in_window, message)
    """
    return _check_time_window(config, 'migration_windows', 'migration window',
                               (True, "No windows defined (always allowed)"))


def is_in_blackout_window(config: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Check if current time is in a blackout window.

    Args:
        config: Configuration dictionary

    Returns:
        Tuple of (in_blackout, message)
    """
    return _check_time_window(config, 'blackout_windows', 'blackout',
                               (False, "No blackout windows defined"))


def _extract_tags(tags_raw):
    """Extract tag list from raw tags (handles both dict and string formats)."""
    if isinstance(tags_raw, dict):
        return [str(t).strip().lower() for t in tags_raw.get('all_tags', [])]
    elif isinstance(tags_raw, str):
        return [t.strip().lower() for t in tags_raw.split(';') if t.strip()]
    return []


def _extract_exclude_groups(tags_raw):
    """Extract exclude groups from raw tags (handles both dict and string formats)."""
    if isinstance(tags_raw, dict):
        return tags_raw.get('exclude_groups', [])
    elif isinstance(tags_raw, str):
        tags = [t.strip().lower() for t in tags_raw.split(';') if t.strip()]
        return [t for t in tags if t.startswith('exclude_')]
    return []


def _extract_affinity_groups(tags_raw):
    """Extract affinity groups from raw tags (handles both dict and string formats)."""
    if isinstance(tags_raw, dict):
        return tags_raw.get('affinity_groups', [])
    elif isinstance(tags_raw, str):
        tags = [t.strip().lower() for t in tags_raw.split(';') if t.strip()]
        return [t for t in tags if t.startswith('affinity_')]
    return []


def can_auto_migrate(guest: Dict[str, Any], rules: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Check if guest can be auto-migrated based on tags.

    Args:
        guest: Guest information dictionary
        rules: Automation rules

    Returns:
        Tuple of (can_migrate, reason)
    """
    # Handle tags - can be string or dict
    tags_raw = guest.get('tags', '')

    # Check ignore flag (dict format has dedicated flag, string format checks tag list)
    if rules.get('respect_ignore_tags', True):
        if isinstance(tags_raw, dict) and tags_raw.get('has_ignore', False):
            return False, "Has 'ignore' tag"
        elif isinstance(tags_raw, str):
            quick_tags = [t.strip().lower() for t in tags_raw.split(';') if t.strip()]
            if 'ignore' in quick_tags:
                return False, "Has 'ignore' tag"

    # NOTE: exclude tags are handled by check_exclude_group_affinity() per-target-node
    # They don't prevent migration entirely, only migration to nodes with same tag

    # Get all tags for other checks
    tags = _extract_tags(tags_raw)

    # Check no-auto-migrate tag (new)
    if 'no-auto-migrate' in tags:
        return False, "Has 'no-auto-migrate' tag"

    # Check whitelist requirement (new, optional)
    if rules.get('require_auto_migrate_ok_tag', False):
        if 'auto-migrate-ok' not in tags:
            return False, "Missing 'auto-migrate-ok' tag (whitelist mode)"

    # Check for bind mounts on containers (LXC only)
    # Only block if container has UNSHARED bind mounts
    # Shared bind mounts (shared=1) can be migrated automatically
    if guest.get('type') == 'CT':
        mount_info = guest.get('mount_points', {})
        if mount_info.get('has_unshared_bind_mount', False):
            mount_count = len([mp for mp in mount_info.get('mount_points', [])
                              if mp.get('is_bind_mount', False) and not mp.get('is_shared', False)])
            return False, f"Container has {mount_count} unshared bind mount(s) - migration requires manual intervention"

    return True, "OK"


def check_exclude_group_affinity(
    guest: Dict[str, Any],
    target_node: str,
    cache_data: Dict[str, Any],
    rules: Dict[str, Any]
) -> Tuple[bool, str]:
    """
    Prevent VMs with same exclude_* tag from clustering on same node.
    Leverages existing exclude_* tag system for anti-affinity behavior.

    Args:
        guest: Guest to migrate
        target_node: Target node name
        cache_data: Current cluster data
        rules: Automation rules

    Returns:
        Tuple of (ok, reason)
    """
    if not rules.get('respect_exclude_affinity', True):
        return True, "Exclude affinity checks disabled"

    # Extract exclude groups - handle both dict and string formats
    exclude_groups = _extract_exclude_groups(guest.get('tags', ''))

    if not exclude_groups:
        return True, "No exclude groups"

    # Count VMs per node per exclude group
    for exclude_group in exclude_groups:
        target_count = 0
        other_nodes_counts = {}

        for vmid, other_guest in cache_data.get('guests', {}).items():
            if other_guest.get('vmid') == guest.get('vmid'):
                continue

            # Extract other guest's exclude groups - handle both dict and string formats
            other_exclude_groups = _extract_exclude_groups(other_guest.get('tags', ''))
            if exclude_group not in other_exclude_groups:
                continue

            node = other_guest.get('node')
            if node == target_node:
                target_count += 1
            else:
                other_nodes_counts[node] = other_nodes_counts.get(node, 0) + 1

        # Don't migrate if it would create or worsen clustering
        min_other_count = min(other_nodes_counts.values()) if other_nodes_counts else 0
        if target_count + 1 > min_other_count + 1:
            return False, f"Would cluster {exclude_group} VMs on {target_node}"

    return True, "No exclude group clustering"


def get_affinity_companions(
    guest: Dict[str, Any],
    target_node: str,
    cache_data: Dict[str, Any],
    rules: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Find affinity group companions that should move with this guest.

    When a guest with affinity_* tags is migrated, all other guests sharing
    the same affinity_* tag should be migrated to the same target node.

    Args:
        guest: Guest being migrated
        target_node: Target node for migration
        cache_data: Current cluster data
        rules: Automation rules

    Returns:
        List of companion guests that need to move to maintain affinity
    """
    if not rules.get('respect_affinity_rules', True):
        return []

    affinity_groups = _extract_affinity_groups(guest.get('tags', ''))
    if not affinity_groups:
        return []

    companions = []
    seen_vmids = set()
    guest_vmid = str(guest.get('vmid', ''))

    for affinity_group in affinity_groups:
        for vmid, other_guest in cache_data.get('guests', {}).items():
            vmid_str = str(vmid)
            if vmid_str == guest_vmid or vmid_str in seen_vmids:
                continue

            other_affinity = _extract_affinity_groups(other_guest.get('tags', ''))
            if affinity_group not in other_affinity:
                continue

            other_node = other_guest.get('node')
            if other_node == target_node:
                continue  # Already on the target node

            # Skip guests that can't be migrated
            other_tags = _extract_tags(other_guest.get('tags', ''))
            if 'ignore' in other_tags:
                continue
            if other_guest.get('status') != 'running':
                continue
            if other_guest.get('local_disks', {}).get('is_pinned', False):
                continue

            seen_vmids.add(vmid_str)
            companions.append({
                'vmid': other_guest.get('vmid', vmid),
                'name': other_guest.get('name', f'VM-{vmid}'),
                'type': other_guest.get('type', 'Unknown'),
                'node': other_node,
                'affinity_group': affinity_group,
                'guest_data': other_guest
            })

    return companions


def perform_safety_checks(config: Dict[str, Any], cache_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Perform cluster health and safety checks (quorum only).

    Node-level safety checks are now performed per-migration to allow
    evacuating VMs from overloaded nodes.

    Args:
        config: Configuration dictionary
        cache_data: Current cluster data

    Returns:
        Tuple of (safe, message)
    """
    safety = config.get('automated_migrations', {}).get('safety_checks', {})

    if not safety.get('check_cluster_health', True):
        return True, "Health checks disabled"

    # Check quorum only (cluster-wide safety)
    if safety.get('require_quorum', True):
        quorate = cache_data.get('cluster_health', {}).get('quorate', False)
        if not quorate:
            logger.warning("Cluster not quorate")
            return False, "Cluster not quorate"

    return True, "Cluster safety checks passed"


def check_target_node_safety(target_node: str, config: Dict[str, Any], cache_data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Check if a target node is safe to receive migrations.

    This allows migrations FROM overloaded nodes (evacuation) while
    preventing migrations TO overloaded nodes.

    Args:
        target_node: Node to check
        config: Configuration dictionary
        cache_data: Current cluster data

    Returns:
        Tuple of (safe, message)
    """
    safety = config.get('automated_migrations', {}).get('safety_checks', {})

    if not safety.get('check_cluster_health', True):
        return True, "Health checks disabled"

    nodes = cache_data.get('nodes', {})
    if target_node not in nodes:
        return False, f"Target node {target_node} not found"

    node_data = nodes[target_node]
    cpu_pct = node_data.get('cpu_percent', 0)
    mem_pct = node_data.get('memory_percent', 0)

    max_cpu = safety.get('max_node_cpu_percent', 85)
    max_mem = safety.get('max_node_memory_percent', 90)

    if cpu_pct > max_cpu:
        return False, f"Target node {target_node} CPU too high: {cpu_pct:.1f}%"

    if mem_pct > max_mem:
        return False, f"Target node {target_node} memory too high: {mem_pct:.1f}%"

    return True, "Target node is safe"


def validates_resource_improvement(recommendation: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate that a migration will actually improve the stated resource imbalance.

    Parses the reason string (e.g., "Balance Memory load (src: 41.6%, target: 53.5%)")
    and ensures target has lower load than source.

    Args:
        recommendation: Recommendation dict with 'reason' field

    Returns:
        Tuple of (is_valid, message)
    """
    reason = recommendation.get('reason', '')
    is_dist_bal = recommendation.get('distribution_balancing', False)
    prefix = "⚖️ Distribution Balancing: " if is_dist_bal else ""

    # Look for pattern like "Balance X load (src: Y%, target: Z%)"
    pattern = r'Balance\s+(\w+)\s+load\s+\(src:\s+([\d.]+)%,\s+target:\s+([\d.]+)%\)'
    match = re.search(pattern, reason)

    if not match:
        # No parseable balance reason - allow it (might be maintenance evac, etc.)
        return True, "No resource balance pattern found"

    resource_type = match.group(1)  # CPU, Memory, etc.
    src_pct = float(match.group(2))
    target_pct = float(match.group(3))

    # Target should have LOWER load than source for balance migrations
    if target_pct >= src_pct:
        return False, f"{prefix}Would not improve load: {resource_type} target ({target_pct:.1f}%) >= source ({src_pct:.1f}%)"

    return True, f"{prefix}Would improve load: {resource_type} source ({src_pct:.1f}%) > target ({target_pct:.1f}%)"


def get_recommendations(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get migration recommendations from the API.

    Args:
        config: Configuration dictionary

    Returns:
        Recommendations data
    """
    try:
        thresholds = config.get('recommendation_thresholds', {})
        automigrate_config = config.get('automated_migrations', {})
        payload = {
            'cpu_threshold': thresholds.get('cpu_threshold', 60),
            'mem_threshold': thresholds.get('mem_threshold', 70),
            'iowait_threshold': thresholds.get('iowait_threshold', 30),
            'maintenance_nodes': automigrate_config.get('maintenance_nodes', [])
        }

        # Call local API (POST request)
        response = requests.post(
            'http://127.0.0.1:5000/api/recommendations',
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        return {"success": False, "recommendations": []}


def execute_migration(
    vmid: int,
    target_node: str,
    source_node: str,
    guest_type: str,
    config: Dict[str, Any],
    dry_run: bool = True
) -> Dict[str, Any]:
    """
    Execute a VM migration.

    Args:
        vmid: VM ID to migrate
        target_node: Target node name
        source_node: Source node name
        config: Configuration dictionary
        dry_run: If True, don't actually migrate

    Returns:
        Result dictionary with success status
    """
    if dry_run:
        logger.info(f"[DRY RUN] Would migrate VM {vmid} from {source_node} to {target_node}")
        return {"success": True, "dry_run": True}

    try:
        import time
        start_time = time.time()

        # Call migration API endpoint
        response = requests.post(
            'http://127.0.0.1:5000/api/migrate',
            json={
                'vmid': vmid,
                'target_node': target_node,
                'source_node': source_node,
                'type': guest_type
            },
            timeout=300
        )
        response.raise_for_status()
        result = response.json()

        if not result.get('success'):
            logger.error(f"Failed to start migration for VM {vmid}: {result.get('error', 'Unknown error')}")
            return result

        task_id = result.get('task_id')
        if not task_id:
            logger.warning(f"Migration started for VM {vmid} but no task_id returned")
            return result

        logger.info(f"Migration started for VM {vmid}, task_id: {task_id}. Polling for completion...")

        # Poll task status until completion (no timeout - systemd service has TimeoutStartSec=infinity)
        poll_interval = 5  # Check every 5 seconds

        while True:
            time.sleep(poll_interval)

            try:
                # Check task status
                task_response = requests.get(
                    f'http://127.0.0.1:5000/api/tasks/{source_node}/{task_id}',
                    timeout=10
                )

                if task_response.status_code == 200:
                    task_status = task_response.json()

                    if task_status.get('success') and task_status.get('status'):
                        status = task_status['status']

                        # Check if task is complete
                        if status == 'stopped':
                            exitstatus = task_status.get('exitstatus', 'unknown')
                            duration = int(time.time() - start_time)

                            if exitstatus == 'OK':
                                logger.info(f"Migration completed successfully for VM {vmid} (duration: {duration}s)")
                                return {
                                    "success": True,
                                    "task_id": task_id,
                                    "duration": duration,
                                    "status": "completed"
                                }
                            else:
                                logger.error(f"Migration failed for VM {vmid}: {exitstatus}")
                                return {
                                    "success": False,
                                    "task_id": task_id,
                                    "duration": duration,
                                    "status": "failed",
                                    "error": f"Task failed with status: {exitstatus}"
                                }
            except Exception as poll_err:
                logger.warning(f"Error polling task status for VM {vmid}: {poll_err}")
                continue

    except requests.exceptions.HTTPError as e:
        error_msg = str(e)
        # Try to extract more details from response
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json().get('error', str(e))
                error_msg = f"{error_msg}: {error_detail}"
            except:
                pass
        logger.error(f"Error migrating VM {vmid}: {error_msg}")
        return {"success": False, "error": error_msg}
    except Exception as e:
        logger.error(f"Error migrating VM {vmid}: {e}")
        return {"success": False, "error": str(e)}


def is_migration_in_progress(vmid: int, source_node: str, config: Dict[str, Any]) -> bool:
    """
    Check if a migration is currently in progress for this VM by querying Proxmox cluster tasks.

    Args:
        vmid: VM ID to check
        source_node: Source node name
        config: Configuration dictionary with Proxmox credentials

    Returns:
        True if migration is in progress, False otherwise
    """
    try:
        # Query Proxmox cluster tasks API
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            logger.warning("Missing Proxmox API credentials, cannot check migration status")
            return False

        url = f"https://{proxmox_host}:{proxmox_port}/api2/json/cluster/tasks"
        headers = {
            'Authorization': f'PVEAPIToken={token_id}={token_secret}'
        }

        response = requests.get(url, headers=headers, verify=verify_ssl, timeout=10)

        if response.status_code == 200:
            tasks_data = response.json().get('data', [])

            # Check for running migration tasks for this VM (running tasks have a 'pid')
            for task in tasks_data:
                if (task.get('type') in MIGRATION_TASK_TYPES and
                    str(task.get('id')) == str(vmid) and
                    task.get('pid') is not None):  # Running tasks have pid
                    logger.info(f"Found active migration task for VM {vmid}: {task.get('upid')}")
                    return True

        return False
    except Exception as e:
        logger.warning(f"Could not check migration status for VM {vmid}: {e}")
        # If we can't check, assume no migration in progress (fail open)
        return False


def verify_guest_on_node(vmid: int, expected_node: str, config: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Verify a guest is actually on the expected source node by querying Proxmox directly.

    Prevents stale-cache migration attempts where the cache shows a guest on a node
    it has already been migrated away from.

    Args:
        vmid: VM ID to verify
        expected_node: Node where the guest is expected to be
        config: Configuration dictionary with Proxmox credentials

    Returns:
        Tuple of (verified, message)
    """
    try:
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            logger.warning("Missing Proxmox API credentials, skipping guest location verification")
            return True, "Credentials unavailable, skipping verification"

        url = f"https://{proxmox_host}:{proxmox_port}/api2/json/cluster/resources"
        headers = {
            'Authorization': f'PVEAPIToken={token_id}={token_secret}'
        }
        params = {'type': 'vm'}

        response = requests.get(url, headers=headers, verify=verify_ssl, timeout=10, params=params)

        if response.status_code == 200:
            resources = response.json().get('data', [])
            for resource in resources:
                if resource.get('vmid') == vmid:
                    actual_node = resource.get('node')
                    if actual_node == expected_node:
                        return True, f"Guest {vmid} confirmed on {expected_node}"
                    else:
                        return False, f"Guest {vmid} is on {actual_node}, not {expected_node} (stale cache)"
            return False, f"Guest {vmid} not found in cluster resources"

        logger.warning(f"Proxmox API returned status {response.status_code}")
        return True, "Could not verify, proceeding with caution"
    except Exception as e:
        logger.warning(f"Could not verify guest {vmid} location: {e}")
        return True, "Verification failed, proceeding with caution"


def is_vm_in_cooldown(vmid: int, cooldown_minutes: int, cooldown_reset_at: str = None) -> bool:
    """
    Check if a VM was recently migrated and is still in cooldown period.

    Args:
        vmid: VM ID to check
        cooldown_minutes: Cooldown period in minutes
        cooldown_reset_at: ISO timestamp; migrations before this time are ignored
                          (used when user changes cooldown settings to reset cooldown)

    Returns:
        True if VM is in cooldown, False otherwise
    """
    if cooldown_minutes <= 0:
        return False

    history = load_history()
    migrations = history.get('migrations', [])

    # Parse cooldown reset timestamp if provided
    reset_time = None
    if cooldown_reset_at:
        try:
            reset_time = datetime.fromisoformat(cooldown_reset_at.replace('Z', '+00:00')).replace(tzinfo=None)
        except (ValueError, TypeError):
            pass

    # Check if this VM was migrated recently
    now = datetime.utcnow()
    cooldown_threshold = now - timedelta(minutes=cooldown_minutes)

    for migration in reversed(migrations):  # Check most recent first
        if migration.get('vmid') == vmid:
            # Skip dry-run migrations — they didn't actually move anything
            if migration.get('dry_run', False):
                continue

            # Skip failed migrations — they didn't complete
            if migration.get('status') == 'failed':
                continue

            try:
                migration_time = datetime.fromisoformat(migration.get('timestamp', '').replace('Z', '+00:00')).replace(tzinfo=None)

                # Skip migrations that occurred before the cooldown was reset
                if reset_time and migration_time < reset_time:
                    return False

                if migration_time > cooldown_threshold:
                    logger.info(f"VM {vmid} is in cooldown period (last migrated {migration_time.isoformat()})")
                    return True
                else:
                    # Found the VM but it's past cooldown, no need to check older entries
                    return False
            except (ValueError, TypeError):
                continue

    return False



def record_migration(migration_record: Dict[str, Any]):
    """
    Record a migration to the history file.

    Args:
        migration_record: Migration details dictionary
    """
    history = load_history()
    history.setdefault('migrations', []).append(migration_record)

    # Update state
    history['state'] = {
        'last_run': datetime.utcnow().isoformat() + 'Z',  # Add Z to indicate UTC
        'in_progress': False,
        'current_window': migration_record.get('window_name')
    }

    save_history(history)


# ---------------------------------------------------------------------------
# Intelligent Migration Functions
# ---------------------------------------------------------------------------

def load_tracking() -> Dict[str, Any]:
    """Load recommendation tracking data from disk."""
    try:
        if TRACKING_FILE.exists():
            with open(TRACKING_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.warning(f"Failed to load tracking file: {e}")
    return {"version": 1, "last_updated": None, "tracked": {}}


def save_tracking(tracking: Dict[str, Any]):
    """Save recommendation tracking data to disk."""
    tracking["last_updated"] = datetime.utcnow().isoformat() + 'Z'
    try:
        tmp_file = str(TRACKING_FILE) + '.tmp'
        with open(tmp_file, 'w') as f:
            json.dump(tracking, f, indent=2)
        os.replace(tmp_file, str(TRACKING_FILE))
    except IOError as e:
        logger.error(f"Failed to save tracking file: {e}")


def make_tracking_key(vmid: int, source_node: str) -> str:
    """Create a tracking key for a recommendation."""
    return f"{vmid}_{source_node}"


def update_recommendation_tracking(
    tracking: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    intelligent_config: Dict[str, Any]
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Update tracking data with current recommendations and classify as ready/observing.

    Returns:
        (updated_tracking, ready_recommendations, observing_recommendations)
    """
    observation_periods = intelligent_config.get('observation_periods') or 3
    observation_window_hours = intelligent_config.get('observation_window_hours') or 1
    min_data_hours = intelligent_config.get('minimum_data_collection_hours') or 0
    now = datetime.utcnow()
    window_cutoff = now - timedelta(hours=observation_window_hours)

    # Build set of current recommendation keys
    current_keys = {}
    for r in recommendations:
        key = make_tracking_key(r.get('vmid'), r.get('source_node'))
        current_keys[key] = r

    tracked = tracking.get("tracked", {})

    # Mark entries not in current set as stale; only delete after grace period
    stale_retention_hours = intelligent_config.get('stale_retention_hours') or 48
    stale_cutoff = now - timedelta(hours=stale_retention_hours)
    stale_keys = [k for k in tracked if k not in current_keys]
    keys_to_delete = []
    for k in stale_keys:
        entry = tracked[k]
        if 'stale_since' not in entry:
            # Just went stale — mark it, reset consecutive count
            entry['stale_since'] = now.isoformat() + 'Z'
            entry['consecutive_count'] = 0
            entry['status'] = 'stale'
        else:
            # Already stale — check retention period
            stale_since = datetime.fromisoformat(entry['stale_since'].rstrip('Z'))
            if stale_since < stale_cutoff:
                keys_to_delete.append(k)
    for k in keys_to_delete:
        del tracked[k]

    ready = []
    observing = []

    for key, rec in current_keys.items():
        vmid = rec.get('vmid')
        source_node = rec.get('source_node')
        target_node = rec.get('target_node')
        confidence = rec.get('confidence_score', 0)
        score_improvement = rec.get('score_improvement', 0)
        guest_name = rec.get('name', f'VM-{vmid}')

        observation = {
            "timestamp": now.isoformat() + 'Z',
            "confidence": confidence,
            "score_improvement": score_improvement,
            "target_node": target_node
        }

        if key in tracked:
            entry = tracked[key]
            if 'stale_since' in entry:
                # Recommendation reappeared — clear stale marker, restart consecutive chain
                del entry['stale_since']
                entry['consecutive_count'] = 0
            entry["consecutive_count"] += 1
            entry["last_seen"] = now.isoformat() + 'Z'
            entry["last_target_node"] = target_node
            entry["observations"].append(observation)
        else:
            entry = {
                "vmid": vmid,
                "guest_name": guest_name,
                "source_node": source_node,
                "last_target_node": target_node,
                "first_seen": now.isoformat() + 'Z',
                "last_seen": now.isoformat() + 'Z',
                "consecutive_count": 1,
                "observations": [observation]
            }
            tracked[key] = entry

        # Prune observations older than window
        entry["observations"] = [
            obs for obs in entry["observations"]
            if datetime.fromisoformat(obs["timestamp"].rstrip('Z')) > window_cutoff
        ]

        # Recalculate averages
        if entry["observations"]:
            entry["avg_confidence"] = round(
                sum(o["confidence"] for o in entry["observations"]) / len(entry["observations"]), 1
            )
            entry["avg_score_improvement"] = round(
                sum(o["score_improvement"] for o in entry["observations"]) / len(entry["observations"]), 1
            )

        # Classify as ready or observing
        count_met = entry["consecutive_count"] >= observation_periods
        time_met = True
        if min_data_hours > 0:
            first_seen = datetime.fromisoformat(entry["first_seen"].rstrip('Z'))
            hours_tracked = (now - first_seen).total_seconds() / 3600
            time_met = hours_tracked >= min_data_hours

        if count_met and time_met:
            entry["status"] = "ready"
            ready.append(rec)
        else:
            entry["status"] = "observing"
            observing.append(rec)

    tracking["tracked"] = tracked
    return tracking, ready, observing


def is_cycle_migration(vmid: int, target_node: str, cycle_window_hours: int = 48) -> Tuple[bool, str]:
    """
    Detect migration cycling by checking if the VM has recently been on the
    proposed target node. Catches both simple rollbacks (A->B->A) and multi-hop
    cycles (A->B->C->A) by tracking all nodes the VM has visited.
    """
    if cycle_window_hours <= 0:
        return False, ""

    history = load_history()
    migrations = history.get('migrations', [])

    now = datetime.utcnow()
    cycle_threshold = now - timedelta(hours=cycle_window_hours)

    visited_nodes = set()
    for migration in reversed(migrations):
        if migration.get('vmid') != vmid or migration.get('status') != 'success':
            continue
        # Skip dry-run migrations — they didn't actually move anything
        if migration.get('dry_run', False):
            continue
        try:
            migration_time = datetime.fromisoformat(migration.get('timestamp', ''))
            if migration_time < cycle_threshold:
                break
            visited_nodes.add(migration.get('source_node'))
            visited_nodes.add(migration.get('target_node'))
        except (ValueError, TypeError):
            continue

    if target_node in visited_nodes:
        return True, f"VM was recently on {target_node} (visited: {', '.join(sorted(visited_nodes))})"

    return False, ""


def get_node_pair_outcome_stats(source_node: str, target_node: str) -> Dict[str, Any]:
    """
    Analyze historical migration outcomes for a source->target node pair.
    Returns stats on accuracy and success rate.
    """
    try:
        from proxbalance.outcomes import get_migration_outcomes
        outcomes = get_migration_outcomes()
    except Exception:
        return {"has_data": False}

    pair_outcomes = [
        o for o in outcomes
        if o.get('source_node') == source_node
        and o.get('target_node') == target_node
        and o.get('status') == 'completed'
    ]

    if not pair_outcomes:
        return {"has_data": False}

    accuracies = [o['accuracy_pct'] for o in pair_outcomes if o.get('accuracy_pct') is not None]
    improvements = []
    for o in pair_outcomes:
        actual = o.get('actual_improvement', {})
        cpu_delta = actual.get('source_cpu_delta') if actual else None
        if cpu_delta is not None:
            improvements.append(cpu_delta)

    negative_outcomes = sum(1 for i in improvements if i < 0)

    return {
        "has_data": True,
        "count": len(pair_outcomes),
        "avg_accuracy": round(sum(accuracies) / len(accuracies), 1) if accuracies else None,
        "avg_improvement": round(sum(improvements) / len(improvements), 2) if improvements else None,
        "negative_outcome_rate": negative_outcomes / len(improvements) if improvements else 0,
    }


def is_in_known_peak_period(source_node: str) -> Tuple[bool, str]:
    """
    Check if the source node's current state matches a known recurring
    load peak that historically always recovers.
    """
    try:
        from proxbalance.patterns import analyze_workload_patterns
        from proxbalance.constants import SCORE_HISTORY_FILE

        if not os.path.exists(SCORE_HISTORY_FILE):
            return False, ""

        with open(SCORE_HISTORY_FILE, 'r') as f:
            score_history = json.load(f)

        if not isinstance(score_history, list) or len(score_history) < 12:
            return False, ""

        patterns = analyze_workload_patterns(score_history, source_node)
        daily = patterns.get('daily_pattern')

        if not daily or daily.get('pattern_confidence') not in ('high', 'medium'):
            return False, ""

        current_hour = datetime.utcnow().hour
        peak_hours = daily.get('peak_hours', [])
        spread = daily.get('spread', 0)

        if current_hour in peak_hours and spread > 15:
            return True, (
                f"Node {source_node} is in known daily peak hours "
                f"({peak_hours}) with {spread:.0f}% spread - load typically recovers"
            )

        return False, ""
    except Exception as e:
        logger.debug(f"Pattern check failed for {source_node}: {e}")
        return False, ""


def _resolve_intelligence_level(intelligent_config: Dict[str, Any]) -> Dict[str, bool]:
    """
    Resolve which intelligent migration features are active based on either:
    1. The new 'intelligence_level' field (basic/standard/full), OR
    2. Legacy individual boolean toggles (backward compatibility)
    """
    LEVELS = {
        'basic': {
            'cycle_detection': True,
            'cost_benefit': False,
            'outcome_learning': False,
            'guest_success_tracking': False,
            'trend_awareness': False,
            'pattern_suppression': False,
            'risk_gating': False,
        },
        'standard': {
            'cycle_detection': True,
            'cost_benefit': True,
            'outcome_learning': True,
            'guest_success_tracking': True,
            'trend_awareness': False,
            'pattern_suppression': False,
            'risk_gating': False,
        },
        'full': {
            'cycle_detection': True,
            'cost_benefit': True,
            'outcome_learning': True,
            'guest_success_tracking': True,
            'trend_awareness': True,
            'pattern_suppression': True,
            'risk_gating': True,
        },
    }
    level = intelligent_config.get('intelligence_level')
    if level and level in LEVELS:
        return LEVELS[level]
    # Legacy: read individual booleans for backward compatibility
    return {
        'cycle_detection': intelligent_config.get('cycle_detection_enabled', True),
        'cost_benefit': intelligent_config.get('cost_benefit_enabled', False),
        'outcome_learning': intelligent_config.get('outcome_learning_enabled', False),
        'guest_success_tracking': intelligent_config.get('guest_success_tracking_enabled', False),
        'trend_awareness': intelligent_config.get('trend_awareness_enabled', False),
        'pattern_suppression': intelligent_config.get('pattern_suppression_enabled', False),
        'risk_gating': intelligent_config.get('risk_gating_enabled', False),
    }


def send_notification(config: Dict[str, Any], event_type: str, data: Dict[str, Any]):
    """
    Send notification via configured providers.

    Delegates to the notifications module which supports Pushover, Email,
    Telegram, Discord, Slack, and generic webhooks. Also maintains backward
    compatibility with the legacy webhook_url-only config.

    Args:
        config: Full application configuration dictionary
        event_type: Type of event (start, complete, failure)
        data: Event data
    """
    try:
        from notifications import NotificationManager
        manager = NotificationManager(config)
        manager.notify(event_type, data)
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


def main():
    """Main automation logic."""
    lock_fd = None
    activity_log = []  # Initialize activity log at function level
    run_start_time = time_module.time()  # Track run duration

    # Initialize last_run summary object
    last_run_summary = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'status': 'running',  # Will be updated at the end
        'migrations_executed': 0,
        'migrations_successful': 0,
        'duration_seconds': 0,
        'mode': 'unknown',
        'decisions': [],
        'safety_checks': {
            'migration_window': 'Unknown',
            'cluster_health': 'Unknown',
            'running_migrations': 0
        }
    }

    try:
        lock_fd = acquire_lock()
        logger.info("Starting automated migration check")

        # Update last_run immediately at start of check (so UI knows we're running)
        try:
            history = load_history()
            history.setdefault('state', {})['last_run'] = last_run_summary
            save_history(history)
        except Exception as e:
            logger.error(f"Failed to update last_run at start: {e}")

        # 1. Load configuration
        config = load_config()
        auto_config = config.get('automated_migrations', {})

        # 2. Check if enabled
        if not auto_config.get('enabled', False):
            logger.info("Automated migrations disabled in config")
            last_run_summary['status'] = 'disabled'
            last_run_summary['mode'] = 'disabled'
            return 0

        # 3. Check migration window
        in_window, window_msg = is_in_migration_window(config)
        last_run_summary['safety_checks']['migration_window'] = window_msg
        if not in_window:
            logger.info(f"Not in migration window: {window_msg}")
            last_run_summary['status'] = 'skipped'
            return 0

        # 4. Check blackout window
        in_blackout, blackout_msg = is_in_blackout_window(config)
        if in_blackout:
            logger.info(f"In blackout window: {blackout_msg}")
            last_run_summary['status'] = 'skipped'
            last_run_summary['safety_checks']['migration_window'] = blackout_msg
            return 0

        # 5. Safety checks
        cache_data = read_cache()
        safe, safety_msg = perform_safety_checks(config, cache_data)
        last_run_summary['safety_checks']['cluster_health'] = safety_msg
        if not safe:
            logger.warning(f"Safety check failed: {safety_msg}")
            send_notification(config, 'failure', {'reason': safety_msg})
            last_run_summary['status'] = 'failed'
            return 1

        logger.info(f"Safety checks passed: {safety_msg}")

        # 6. Setup migration parameters
        rules = auto_config.get('rules', {})
        maintenance_nodes = auto_config.get('maintenance_nodes', [])
        cooldown_minutes = rules.get('cooldown_minutes', 30)
        cooldown_reset_at = rules.get('cooldown_reset_at')  # Timestamp when cooldown was last reset via settings change
        max_migrations_per_run = rules.get('max_migrations_per_run', 3)
        max_concurrent = rules.get('max_concurrent_migrations', 3)
        grace_period_seconds = rules.get('grace_period_seconds', 30)  # Default 30 seconds between migrations

        # Count currently running migrations across the entire cluster
        running_count = 0
        try:
            proxmox_host = config.get('proxmox_host', 'localhost')
            proxmox_port = config.get('proxmox_port', 8006)
            token_id = config.get('proxmox_api_token_id', '')
            token_secret = config.get('proxmox_api_token_secret', '')
            verify_ssl = config.get('proxmox_verify_ssl', False)

            if token_id and token_secret:
                url = f"https://{proxmox_host}:{proxmox_port}/api2/json/cluster/tasks"
                headers = {'Authorization': f'PVEAPIToken={token_id}={token_secret}'}
                response = requests.get(url, headers=headers, verify=verify_ssl, timeout=10)

                if response.status_code == 200:
                    tasks_data = response.json().get('data', [])
                    # Count running migration tasks
                    for task in tasks_data:
                        if (task.get('type') in MIGRATION_TASK_TYPES and
                            task.get('pid') is not None):
                            running_count += 1
        except Exception as e:
            logger.warning(f"Could not check running migrations: {e}")

        logger.info(f"Currently {running_count} migrations running cluster-wide")
        last_run_summary['safety_checks']['running_migrations'] = running_count

        # Calculate how many new migrations we can start
        available_slots = max(0, max_concurrent - running_count)
        max_new_migrations = min(max_migrations_per_run, available_slots)

        if available_slots == 0:
            logger.info(f"Maximum concurrent migrations ({max_concurrent}) already running, skipping this run")
            last_run_summary['status'] = 'skipped'
            return 0

        dry_run = auto_config.get('dry_run', True)
        last_run_summary['mode'] = 'dry_run' if dry_run else 'live'

        logger.info(f"Will attempt up to {max_new_migrations} migrations (dry_run={dry_run}, max_concurrent={max_concurrent}, available_slots={available_slots})")

        send_notification(config, 'start', {
            'migration_count': max_new_migrations,
            'dry_run': dry_run,
            'window': window_msg
        })

        success_count = 0
        migrations_attempted = 0
        batch_migrated_guests = {}  # Phase 2f: Track in-flight migrations for this batch

        # Migrate one at a time, regenerating recommendations after each
        for _ in range(max_new_migrations):
            # Regenerate recommendations to reflect current cluster state
            logger.info(f"Regenerating recommendations (migration {migrations_attempted + 1}/{max_new_migrations})")
            rec_data = get_recommendations(config)
            if not rec_data.get('success', False):
                logger.error("Failed to get recommendations")
                break

            recommendations = rec_data.get('recommendations', [])
            if not recommendations:
                logger.info("No more recommendations available")
                break

            # --- Intelligent Migration: Persistence Filter (Phase 1) ---
            intelligent_config = rules.get('intelligent_migrations', {})
            intelligent_enabled = intelligent_config.get('enabled', False)
            resolved_features = _resolve_intelligence_level(intelligent_config)

            if intelligent_enabled and migrations_attempted == 0:
                # First iteration: update tracking with current recommendations
                tracking = load_tracking()
                # Bypass for maintenance evacuations
                non_maint_recs = [r for r in recommendations if r.get('source_node') not in maintenance_nodes]
                maint_recs = [r for r in recommendations if r.get('source_node') in maintenance_nodes]

                if non_maint_recs:
                    tracking, ready_recs, observing_recs = update_recommendation_tracking(
                        tracking, non_maint_recs, intelligent_config
                    )
                    save_tracking(tracking)

                    # Log observing items
                    obs_periods = intelligent_config.get('observation_periods') or 3
                    for obs_rec in observing_recs:
                        obs_key = make_tracking_key(obs_rec.get('vmid'), obs_rec.get('source_node'))
                        entry = tracking.get('tracked', {}).get(obs_key, {})
                        count = entry.get('consecutive_count', 1)
                        min_hours = intelligent_config.get('minimum_data_collection_hours') or 0
                        if min_hours > 0 and count >= obs_periods:
                            first_seen = datetime.fromisoformat(entry.get('first_seen', '').rstrip('Z'))
                            hours_tracked = (datetime.utcnow() - first_seen).total_seconds() / 3600
                            obs_msg = f"observing {count}/{obs_periods}, waiting for {min_hours}h data (seen for {hours_tracked:.1f}h)"
                        else:
                            obs_msg = f"observing {count}/{obs_periods}"
                        logger.info(f"[Intelligent] VM {obs_rec.get('vmid')} ({obs_rec.get('name')}): {obs_msg}")

                    # Add observing decisions to last_run_summary
                    for obs_rec in observing_recs:
                        obs_key = make_tracking_key(obs_rec.get('vmid'), obs_rec.get('source_node'))
                        entry = tracking.get('tracked', {}).get(obs_key, {})
                        count = entry.get('consecutive_count', 1)
                        guest = cache_data.get('guests', {}).get(str(obs_rec.get('vmid')), {})
                        last_run_summary['decisions'].append({
                            'vmid': obs_rec.get('vmid'),
                            'name': obs_rec.get('name', guest.get('name', '')),
                            'type': guest.get('type', 'Unknown'),
                            'source_node': obs_rec.get('source_node'),
                            'target_node': obs_rec.get('target_node'),
                            'target_node_score': obs_rec.get('target_node_score'),
                            'action': 'observing',
                            'reason': f"Observing {count}/{obs_periods} consecutive runs",
                            'confidence_score': obs_rec.get('confidence_score'),
                            'tags': guest.get('tags', {}).get('all_tags', []),
                            'ha_managed': guest.get('ha_managed', False),
                        })

                    # Replace recommendations with only ready + maintenance recs
                    recommendations = ready_recs + maint_recs
                    if not recommendations:
                        logger.info("[Intelligent] No recommendations ready yet (all still observing)")
                        break

            elif intelligent_enabled and migrations_attempted > 0:
                # Subsequent iterations: filter against saved tracking (read-only)
                tracking = load_tracking()
                tracked = tracking.get('tracked', {})
                filtered_by_tracking = []
                for r in recommendations:
                    if r.get('source_node') in maintenance_nodes:
                        filtered_by_tracking.append(r)
                        continue
                    key = make_tracking_key(r.get('vmid'), r.get('source_node'))
                    entry = tracked.get(key, {})
                    if entry.get('status') == 'ready':
                        filtered_by_tracking.append(r)
                recommendations = filtered_by_tracking

                if not recommendations:
                    logger.info("[Intelligent] No tracked recommendations ready after re-filter")
                    break

            # Helper function to create decision entry with full metadata + reasoning
            def create_decision(vmid, guest, source_node, target_node, action, reason, recommendation):
                decision = {
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'type': guest.get('type', 'Unknown'),
                    'source_node': source_node,
                    'target_node': target_node,
                    'target_node_score': recommendation.get('target_node_score'),
                    'action': action,
                    'reason': reason,
                    'confidence_score': recommendation.get('confidence_score'),
                    'tags': guest.get('tags', {}).get('all_tags', []),
                    'ha_managed': guest.get('ha_managed', False),
                    'has_bind_mount': guest.get('mount_points', {}).get('has_bind_mount', False),
                    'has_unshared_bind_mount': guest.get('mount_points', {}).get('has_unshared_bind_mount', False),
                    'has_passthrough': guest.get('local_disks', {}).get('has_passthrough', False),
                    'reasoning': {
                        'score_improvement': recommendation.get('score_improvement'),
                        'confidence_score': recommendation.get('confidence_score'),
                        'cost_benefit': recommendation.get('cost_benefit', {}).get('ratio') if recommendation.get('cost_benefit') else None,
                        'risk_score': recommendation.get('risk_score'),
                        'has_conflict': recommendation.get('has_conflict', False),
                    },
                }
                return decision

            # Re-filter recommendations with current cooldown/confidence/tag rules
            filtered = []
            filtered_reasons = []  # Track why VMs were filtered out
            for r in recommendations:
                vmid = r.get('vmid')
                source_node = r.get('source_node')
                target_node = r.get('target_node')
                is_maintenance_evac = source_node in maintenance_nodes

                # Get guest info
                guest = cache_data.get('guests', {}).get(str(vmid))
                if not guest:
                    continue

                vm_name = guest.get('name', f'VM-{vmid}')

                # Check cooldown
                if not is_maintenance_evac and is_vm_in_cooldown(vmid, cooldown_minutes, cooldown_reset_at):
                    reason = "In cooldown period"
                    filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                    last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                    continue

                is_distribution_balancing = r.get('distribution_balancing', False)

                # Cycle detection (catches both A->B->A rollbacks and A->B->C->A cycles)
                cycle_detection_enabled = resolved_features['cycle_detection']
                cycle_window = intelligent_config.get('cycle_window_hours') or 48
                if not is_maintenance_evac and not is_distribution_balancing and cycle_detection_enabled:
                    is_cycle, cycle_msg = is_cycle_migration(vmid, target_node, cycle_window)
                    if is_cycle:
                        reason = f"Cycle prevention: {cycle_msg}"
                        filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                        last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                        continue

                # Check confidence threshold (bypass for distribution balancing and maintenance evacuations)
                confidence = r.get('confidence_score', 0)
                min_confidence = rules.get('min_confidence_score', 75)
                if not is_maintenance_evac and not is_distribution_balancing and confidence < min_confidence:
                    reason = f"Confidence {confidence}% below minimum {min_confidence}%"
                    filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                    last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                    continue

                # Phase 2a: Conflict detection (always active, no toggle needed)
                if not is_maintenance_evac and r.get('has_conflict', False):
                    conflict_target = r.get('conflict_target', 'unknown')
                    reason = f"Migration conflict on target {conflict_target} (combined load would exceed thresholds)"
                    filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                    last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                    continue

                # Risk-adjusted confidence
                risk_gating_enabled = resolved_features['risk_gating']
                if not is_maintenance_evac and not is_distribution_balancing and risk_gating_enabled:
                    risk_score = r.get('risk_score', 0)
                    risk_multiplier = intelligent_config.get('risk_confidence_multiplier') or 1.2
                    if risk_score > 50:
                        adjusted_min = min(100, min_confidence * risk_multiplier)
                        if confidence < adjusted_min:
                            reason = f"High risk ({risk_score}) requires confidence >= {adjusted_min:.0f}% (has {confidence}%)"
                            filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                            last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                            continue

                # Trend-aware filtering
                trend_awareness_enabled = resolved_features['trend_awareness']
                if not is_maintenance_evac and not is_distribution_balancing and trend_awareness_enabled:
                    score_details = r.get('score_details', {})
                    source_metrics = score_details.get('source', {}).get('metrics', {})
                    src_cpu_trend = source_metrics.get('cpu_trend', 'stable')
                    src_mem_trend = source_metrics.get('mem_trend', 'stable')
                    if src_cpu_trend == 'falling' and src_mem_trend != 'rising':
                        reason = "Source CPU trend falling - problem may be resolving naturally"
                        filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                        last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'deferred', reason, r))
                        continue

                # Outcome-based learning
                outcome_learning_enabled = resolved_features['outcome_learning']
                if not is_maintenance_evac and not is_distribution_balancing and outcome_learning_enabled:
                    pair_stats = get_node_pair_outcome_stats(source_node, target_node)
                    if pair_stats.get('has_data') and pair_stats.get('count', 0) >= 3:
                        neg_rate = pair_stats.get('negative_outcome_rate', 0)
                        if neg_rate > 0.5:
                            adjusted_min = min(100, min_confidence * 1.3)
                            if confidence < adjusted_min:
                                reason = f"Poor outcome history for {source_node}->{target_node} ({neg_rate:.0%} negative), requires confidence >= {adjusted_min:.0f}%"
                                filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                                last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                                continue

                # Workload pattern suppression
                pattern_suppression_enabled = resolved_features['pattern_suppression']
                if not is_maintenance_evac and not is_distribution_balancing and pattern_suppression_enabled:
                    in_peak, peak_msg = is_in_known_peak_period(source_node)
                    if in_peak:
                        filtered_reasons.append(f"{vm_name} ({vmid}): {peak_msg.lower()}")
                        last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'deferred', peak_msg, r))
                        continue

                # For maintenance evacuations, bypass tag checks
                if not is_maintenance_evac:
                    # Check tags
                    can_migrate, tag_reason = can_auto_migrate(guest, rules)
                    if not can_migrate:
                        filtered_reasons.append(f"{vm_name} ({vmid}): {tag_reason}")
                        last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', tag_reason, r))
                        continue

                    # Check exclude group affinity
                    ok, affinity_reason = check_exclude_group_affinity(
                        guest, r['target_node'], cache_data, rules
                    )
                    if not ok:
                        filtered_reasons.append(f"{vm_name} ({vmid}): {affinity_reason}")
                        last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', affinity_reason, r))
                        continue

                    # Cost-benefit ratio check
                    cost_benefit_enabled = resolved_features['cost_benefit']
                    min_cb_ratio = intelligent_config.get('min_cost_benefit_ratio') or 1.0
                    if cost_benefit_enabled:
                        cb = r.get('cost_benefit', {})
                        cb_ratio = cb.get('ratio', float('inf'))
                        if cb_ratio < min_cb_ratio:
                            reason = f"Poor cost-benefit ratio ({cb_ratio:.1f} < {min_cb_ratio:.1f})"
                            filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                            last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                            continue

                    # Per-guest migration success rate
                    guest_success_enabled = resolved_features['guest_success_tracking']
                    if guest_success_enabled:
                        try:
                            from proxbalance.outcomes import get_migration_outcomes
                            outcomes = get_migration_outcomes()
                            guest_outcomes = [o for o in outcomes if str(o.get('vmid')) == str(vmid) and o.get('status') == 'completed']
                            if len(guest_outcomes) >= 2:
                                positive = sum(1 for o in guest_outcomes
                                             if o.get('actual_improvement', {}).get('source_cpu_delta', 0) > 0)
                                success_rate = positive / len(guest_outcomes)
                                if success_rate < 0.3:
                                    reason = f"Guest has poor migration history ({positive}/{len(guest_outcomes)} positive outcomes)"
                                    filtered_reasons.append(f"{vm_name} ({vmid}): {reason.lower()}")
                                    last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', reason, r))
                                    continue
                        except Exception as e:
                            logger.debug(f"Guest success rate check failed: {e}")

                    # Validate resource improvement for balance migrations
                    is_valid, balance_msg = validates_resource_improvement(r)
                    if not is_valid:
                        logger.info(f"Skipping VM {vmid}: {balance_msg}")
                        filtered_reasons.append(f"{vm_name} ({vmid}): {balance_msg}")
                        last_run_summary['decisions'].append(create_decision(vmid, guest, source_node, target_node, 'filtered', balance_msg, r))
                        continue

                filtered.append(r)

            # Derive activity_log entries from decisions (all filtered/deferred/skipped/observing)
            for d in last_run_summary['decisions']:
                if d.get('action') in ('filtered', 'deferred', 'skipped', 'observing'):
                    # Avoid duplicates from previous iterations
                    if not any(a.get('vmid') == d.get('vmid') and a.get('reason') == d.get('reason') for a in activity_log):
                        activity_log.append({
                            'timestamp': datetime.utcnow().isoformat() + 'Z',
                            'vmid': d.get('vmid'),
                            'name': d.get('name', f"VM-{d.get('vmid')}"),
                            'action': d.get('action', 'filtered'),
                            'reason': d.get('reason', 'Filtered')
                        })

            # Always save filter state so the UI can see decisions and activity log
            try:
                history = load_history()
                run_state = history.setdefault('state', {})
                run_state['last_filter_reasons'] = filtered_reasons
                run_state['activity_log'] = activity_log[-50:]
                run_state['last_run'] = last_run_summary
                save_history(history)
            except Exception as e:
                logger.error(f"Failed to save filter state: {e}")

            if not filtered:
                logger.info("No recommendations passed filters")

                # Log all original recommendations as "skipped" or "filtered" for visibility
                for r in recommendations:
                    guest = cache_data.get('guests', {}).get(str(r.get('vmid')), {})
                    # Check if this was already logged as filtered
                    already_logged = any(d.get('vmid') == r.get('vmid') for d in last_run_summary['decisions'])
                    if not already_logged:
                        last_run_summary['decisions'].append(create_decision(
                            r['vmid'],
                            guest,
                            r.get('source_node', r.get('current_node')),
                            r['target_node'],
                            'skipped',
                            "Not selected (all recommendations filtered)",
                            r
                        ))

                # Re-save with the additional "not selected" decisions
                try:
                    history = load_history()
                    history.setdefault('state', {})['last_run'] = last_run_summary
                    save_history(history)
                except Exception as e:
                    logger.error(f"Failed to save decisions: {e}")

                break

            # Pick the best recommendation
            rec = filtered[0]
            vmid = rec['vmid']
            target = rec['target_node']
            source = rec.get('source_node', rec.get('current_node'))  # Support both field names
            guest_type = rec.get('type', 'VM')  # Default to VM if type not specified

            # Check if target node is safe (allows evacuation from overloaded source nodes)
            target_safe, target_msg = check_target_node_safety(target, config, cache_data)
            if not target_safe:
                logger.info(f"Skipping migration of VM {vmid} to {target}: {target_msg}")
                guest = cache_data.get('guests', {}).get(str(vmid), {})
                activity_log.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'action': 'skipped',
                    'reason': target_msg
                })
                # Add to decisions for last_run summary
                last_run_summary['decisions'].append({
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'source_node': source,
                    'target_node': target,
                    'target_node_score': rec.get('target_node_score'),
                    'action': 'skipped',
                    'reason': target_msg,
                    'confidence_score': rec.get('confidence_score')
                })
                continue

            # Check if this VM already has a migration in progress
            if is_migration_in_progress(vmid, source, config):
                logger.info(f"VM {vmid} already has a migration in progress, skipping")
                guest = cache_data.get('guests', {}).get(str(vmid), {})
                activity_log.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'action': 'skipped',
                    'reason': 'Migration already in progress'
                })
                # Add to decisions for last_run summary
                last_run_summary['decisions'].append({
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'source_node': source,
                    'target_node': target,
                    'target_node_score': rec.get('target_node_score'),
                    'action': 'skipped',
                    'reason': 'Migration already in progress',
                    'confidence_score': rec.get('confidence_score')
                })
                continue

            # Verify guest is actually on the expected source node (prevents stale-cache failures)
            safety = config.get('automated_migrations', {}).get('safety_checks', {})
            if not dry_run and safety.get('verify_before_migrate', True):
                verified, verify_msg = verify_guest_on_node(vmid, source, config)
                if not verified:
                    logger.warning(f"Skipping VM {vmid}: {verify_msg}")
                    guest = cache_data.get('guests', {}).get(str(vmid), {})
                    activity_log.append({
                        'timestamp': datetime.utcnow().isoformat() + 'Z',
                        'vmid': vmid,
                        'name': guest.get('name', f'VM-{vmid}'),
                        'action': 'skipped',
                        'reason': verify_msg
                    })
                    last_run_summary['decisions'].append({
                        'vmid': vmid,
                        'name': guest.get('name', f'VM-{vmid}'),
                        'source_node': source,
                        'target_node': target,
                        'target_node_score': rec.get('target_node_score'),
                        'action': 'skipped',
                        'reason': verify_msg,
                        'confidence_score': rec.get('confidence_score')
                    })
                    continue

            target_score = rec.get('target_node_score', 'N/A')
            logger.info(f"Migrating {guest_type} {vmid} ({rec['name']}) from {source} to {target} (score: {target_score}) - {rec['reason']}")

            # Populate ALL decisions BEFORE migration starts so UI can see them immediately
            # 1. Add the decision for the migration we're about to execute (with 'pending' status)
            guest_info = cache_data.get('guests', {}).get(str(vmid), {})
            pending_decision = {
                'vmid': vmid,
                'name': rec['name'],
                'type': guest_info.get('type', 'Unknown'),
                'source_node': rec.get('source_node') or rec.get('current_node'),
                'target_node': target,
                'target_node_score': rec.get('target_node_score'),
                'action': 'pending',  # Will be updated to executed/failed after migration
                'reason': rec['reason'],
                'confidence_score': rec['confidence_score'],
                'status': 'pending',
                'priority_rank': 1,  # This is the highest priority recommendation
                'total_candidates': len(filtered),
                'selected_reason': f'✅ SELECTED - Highest priority recommendation (ranked #1 of {len(filtered)})',
                'tags': guest_info.get('tags', {}).get('all_tags', []),
                'ha_managed': guest_info.get('ha_managed', False),
                'has_bind_mount': guest_info.get('mount_points', {}).get('has_bind_mount', False),
                'has_unshared_bind_mount': guest_info.get('mount_points', {}).get('has_unshared_bind_mount', False),
                'has_passthrough': guest_info.get('local_disks', {}).get('has_passthrough', False),
                'distribution_balancing': rec.get('distribution_balancing', False)
            }
            last_run_summary['decisions'].append(pending_decision)

            # 2. Add all remaining recommendations as "skipped" (lower priority)
            for idx, r in enumerate(filtered, start=1):
                if r['vmid'] != vmid:  # Skip the one we're executing
                    guest = cache_data.get('guests', {}).get(str(r['vmid']), {})
                    decision = create_decision(
                        r['vmid'],
                        guest,
                        r.get('source_node', r.get('current_node')),
                        r['target_node'],
                        'skipped',
                        f"Lower priority - Ranked #{idx} of {len(filtered)}",
                        r
                    )
                    decision['priority_rank'] = idx
                    decision['total_candidates'] = len(filtered)
                    decision['distribution_balancing'] = r.get('distribution_balancing', False)
                    last_run_summary['decisions'].append(decision)

            # 3. Save decisions BEFORE migration starts so UI can see them immediately
            try:
                history = load_history()
                history.setdefault('state', {})['last_run'] = last_run_summary
                save_history(history)
                logger.info(f"Saved {len(last_run_summary['decisions'])} decisions before migration starts")
            except Exception as e:
                logger.error(f"Failed to save decisions before migration: {e}")

            result = execute_migration(vmid, target, source, guest_type, config, dry_run=dry_run)

            # Track decision outcome
            migrations_attempted += 1
            last_run_summary['migrations_executed'] = migrations_attempted

            # Determine status based on result
            if result.get('success'):
                status = result.get('status', 'completed')  # Use task status if available
            else:
                status = 'failed'

            # Record migration with task_id if available
            migration_record = {
                'id': str(uuid.uuid4()),
                'timestamp': datetime.utcnow().isoformat(),
                'vmid': vmid,
                'name': rec['name'],
                'source_node': rec.get('source_node') or rec.get('current_node'),
                'target_node': target,
                'target_node_score': rec.get('target_node_score'),  # Include node score
                'reason': rec['reason'],
                'confidence_score': rec['confidence_score'],
                'status': status,
                'duration_seconds': result.get('duration', 0),
                'initiated_by': 'automated',
                'dry_run': dry_run,
                'window_name': window_msg,
                'reasoning': {
                    'score_improvement': rec.get('score_improvement'),
                    'confidence_score': rec.get('confidence_score'),
                    'cost_benefit': rec.get('cost_benefit', {}).get('ratio') if rec.get('cost_benefit') else None,
                    'risk_score': rec.get('risk_score'),
                    'has_conflict': rec.get('has_conflict', False),
                },
            }

            # Add task_id if present
            if result.get('task_id'):
                migration_record['task_id'] = result['task_id']

            # Add error message if present
            if result.get('error'):
                migration_record['error'] = result['error']

            record_migration(migration_record)

            # UPDATE the pending decision with execution results
            # Find the pending decision we added before migration started
            for decision in last_run_summary['decisions']:
                if decision['vmid'] == vmid and decision.get('action') == 'pending':
                    # Update the pending decision with results
                    decision['action'] = 'executed' if result.get('success') else 'failed'
                    decision['status'] = status
                    if result.get('error'):
                        decision['error'] = result['error']
                    logger.info(f"Updated decision for VM {vmid} from 'pending' to '{decision['action']}'")
                    break

            # Send per-migration action notification
            action_data = {
                'vmid': vmid,
                'name': rec['name'],
                'type': guest_type,
                'source_node': source,
                'target_node': target,
                'reason': rec['reason'],
                'dry_run': dry_run,
            }
            if result.get('success'):
                action_data['status'] = 'success'
                action_data['duration'] = result.get('duration', 0)
            else:
                action_data['status'] = 'failed'
                action_data['error'] = result.get('error', 'Unknown error')
            send_notification(config, 'action', action_data)

            if result.get('success'):
                success_count += 1
                last_run_summary['migrations_successful'] = success_count

                # Phase 2f: Track in-flight migration for batch awareness
                guest_for_tracking = cache_data.get('guests', {}).get(str(vmid), {})
                if target not in batch_migrated_guests:
                    batch_migrated_guests[target] = []
                batch_migrated_guests[target].append(guest_for_tracking)

                # Affinity companion migrations: if this VM has affinity groups,
                # migrate companions to the same target node
                try:
                    guest_info = cache_data.get('guests', {}).get(str(vmid), {})
                    companions = get_affinity_companions(guest_info, target, cache_data, rules)
                    if companions:
                        logger.info(f"Affinity rules: {len(companions)} companion(s) need to follow VM {vmid} to {target}")
                        for companion in companions:
                            comp_vmid = companion['vmid']
                            comp_source = companion['node']
                            comp_type = companion['type']
                            comp_name = companion['name']
                            ag = companion['affinity_group']

                            logger.info(f"Migrating affinity companion {comp_type} {comp_vmid} ({comp_name}) "
                                       f"from {comp_source} to {target} (group: {ag})")

                            # Add companion decision
                            comp_decision = {
                                'vmid': comp_vmid,
                                'name': comp_name,
                                'type': comp_type,
                                'source_node': comp_source,
                                'target_node': target,
                                'action': 'pending',
                                'reason': f"Affinity group '{ag}' - follows VM {vmid}",
                                'affinity_group': ag,
                                'affinity_leader_vmid': vmid
                            }
                            last_run_summary['decisions'].append(comp_decision)

                            comp_result = execute_migration(comp_vmid, target, comp_source, comp_type, config, dry_run=dry_run)
                            migrations_attempted += 1
                            last_run_summary['migrations_executed'] = migrations_attempted

                            # Send per-migration action notification for companion
                            comp_action_data = {
                                'vmid': comp_vmid,
                                'name': comp_name,
                                'type': comp_type,
                                'source_node': comp_source,
                                'target_node': target,
                                'reason': f"Affinity group '{ag}' - follows VM {vmid}",
                                'dry_run': dry_run,
                            }
                            if comp_result.get('success'):
                                comp_action_data['status'] = 'success'
                                comp_action_data['duration'] = comp_result.get('duration', 0)
                            else:
                                comp_action_data['status'] = 'failed'
                                comp_action_data['error'] = comp_result.get('error', 'Unknown error')
                            send_notification(config, 'action', comp_action_data)

                            if comp_result.get('success'):
                                comp_status = comp_result.get('status', 'completed')
                                comp_decision['action'] = 'executed'
                                comp_decision['status'] = comp_status
                                success_count += 1
                                last_run_summary['migrations_successful'] = success_count
                                logger.info(f"Affinity companion {comp_vmid} migrated successfully")

                                # Record companion migration
                                record_migration({
                                    'id': str(uuid.uuid4()),
                                    'timestamp': datetime.utcnow().isoformat(),
                                    'vmid': comp_vmid,
                                    'name': comp_name,
                                    'source_node': comp_source,
                                    'target_node': target,
                                    'reason': f"Affinity group '{ag}' - follows VM {vmid}",
                                    'status': comp_status,
                                    'duration_seconds': comp_result.get('duration', 0),
                                    'initiated_by': 'automated',
                                    'dry_run': dry_run,
                                    'affinity_group': ag,
                                    'affinity_leader_vmid': vmid
                                })
                            else:
                                comp_decision['action'] = 'failed'
                                comp_decision['status'] = 'failed'
                                if comp_result.get('error'):
                                    comp_decision['error'] = comp_result['error']
                                logger.error(f"Affinity companion {comp_vmid} migration failed: {comp_result.get('error')}")

                                record_migration({
                                    'id': str(uuid.uuid4()),
                                    'timestamp': datetime.utcnow().isoformat(),
                                    'vmid': comp_vmid,
                                    'name': comp_name,
                                    'source_node': comp_source,
                                    'target_node': target,
                                    'reason': f"Affinity group '{ag}' - follows VM {vmid}",
                                    'status': 'failed',
                                    'error': comp_result.get('error'),
                                    'initiated_by': 'automated',
                                    'dry_run': dry_run,
                                    'affinity_group': ag,
                                    'affinity_leader_vmid': vmid
                                })

                            # Save decisions after each companion
                            try:
                                history = load_history()
                                history.setdefault('state', {})['last_run'] = last_run_summary
                                save_history(history)
                            except Exception as e:
                                logger.error(f"Failed to save companion decisions: {e}")

                except Exception as e:
                    logger.error(f"Error processing affinity companions for VM {vmid}: {e}")

                # Grace period: wait for cluster to settle before next migration
                # Skip grace period if this is the last migration or if it's a dry run
                if migrations_attempted < max_new_migrations and not dry_run and grace_period_seconds > 0:
                    logger.info(f"Grace period: waiting {grace_period_seconds}s for cluster to settle")
                    time_module.sleep(grace_period_seconds)
            else:
                if auto_config.get('safety_checks', {}).get('abort_on_failure', True):
                    logger.error("Migration failed, aborting remaining migrations")
                    break

        logger.info(f"Completed: {success_count}/{migrations_attempted} successful")

        # Determine final status
        if migrations_attempted == 0:
            last_run_summary['status'] = 'no_action'
        elif success_count == migrations_attempted:
            last_run_summary['status'] = 'success'
        elif success_count > 0:
            last_run_summary['status'] = 'partial'
        else:
            last_run_summary['status'] = 'failed'

        send_notification(config, 'complete', {
            'total': migrations_attempted,
            'successful': success_count,
            'failed': migrations_attempted - success_count,
            'dry_run': dry_run
        })

        # Update state with activity log (keep only last 50 entries)
        try:
            history = load_history()
            history.setdefault('state', {})['activity_log'] = activity_log[-50:]
            save_history(history)
        except Exception as e:
            logger.error(f"Failed to save activity log: {e}")

        return 0

    except Exception as e:
        logger.exception(f"Unexpected error in automigrate: {e}")
        last_run_summary['status'] = 'error'
        return 1

    finally:
        # Calculate total run duration
        last_run_summary['duration_seconds'] = int(time_module.time() - run_start_time)

        # Always save last_run summary (even if exited early)
        try:
            history = load_history()
            run_state = history.setdefault('state', {})
            run_state['last_run'] = last_run_summary
            run_state['activity_log'] = activity_log[-50:]

            # Archive completed run to run_history (keep last 50 runs)
            if last_run_summary.get('status') in ['success', 'partial', 'failed', 'no_action']:
                history.setdefault('run_history', []).insert(0, last_run_summary.copy())
                # Keep only last N runs
                history['run_history'] = history['run_history'][:MAX_RUN_HISTORY]
                logger.info(f"Archived run to history (total: {len(history['run_history'])} runs)")

            save_history(history)
        except Exception as e:
            logger.error(f"Failed to update last_run summary: {e}")

        if lock_fd:
            release_lock(lock_fd)
        logger.info("Automated migration check complete")


if __name__ == '__main__':
    sys.exit(main())
