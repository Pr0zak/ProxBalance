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
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Any
import uuid
import pytz
import requests

# Paths
BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "config.json"
CACHE_FILE = BASE_DIR / "cluster_cache.json"
HISTORY_FILE = BASE_DIR / "migration_history.json"
LOCK_FILE = BASE_DIR / "automigrate.lock"

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
    """Save migration history."""
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)


def is_in_migration_window(config: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Check if current time is in allowed migration window.

    Args:
        config: Configuration dictionary

    Returns:
        Tuple of (in_window, message)
    """
    windows = config.get('automated_migrations', {}).get('schedule', {}).get('migration_windows', [])

    if not windows:
        return True, "No windows defined (always allowed)"

    for window in windows:
        if not window.get('enabled', False):
            continue

        try:
            tz = pytz.timezone(window.get('timezone', 'UTC'))
            now = datetime.now(tz)

            # Check day of week
            current_day = now.strftime('%A').lower()
            window_days = [d.lower() for d in window.get('days', [])]
            if current_day not in window_days:
                continue

            # Parse time range
            start = datetime.strptime(window['start_time'], '%H:%M').time()
            end = datetime.strptime(window['end_time'], '%H:%M').time()
            current = now.time()

            # Check time range (handles overnight windows)
            if start <= end:
                in_window = start <= current <= end
            else:  # Crosses midnight
                in_window = current >= start or current <= end

            if in_window:
                logger.info(f"In migration window: {window['name']}")
                return True, f"In window: {window['name']}"

        except Exception as e:
            logger.error(f"Error checking window {window.get('name', 'unknown')}: {e}")
            continue

    return False, "Outside all migration windows"


def is_in_blackout_window(config: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Check if current time is in a blackout window.

    Args:
        config: Configuration dictionary

    Returns:
        Tuple of (in_blackout, message)
    """
    blackouts = config.get('automated_migrations', {}).get('schedule', {}).get('blackout_windows', [])

    if not blackouts:
        return False, "No blackout windows defined"

    for blackout in blackouts:
        if not blackout.get('enabled', False):
            continue

        try:
            # Use timezone from config or UTC
            tz_str = config.get('automated_migrations', {}).get('schedule', {}).get('migration_windows', [{}])[0].get('timezone', 'UTC')
            tz = pytz.timezone(tz_str)
            now = datetime.now(tz)

            # Check day of week
            current_day = now.strftime('%A').lower()
            blackout_days = [d.lower() for d in blackout.get('days', [])]
            if current_day not in blackout_days:
                continue

            # Parse time range
            start = datetime.strptime(blackout['start_time'], '%H:%M').time()
            end = datetime.strptime(blackout['end_time'], '%H:%M').time()
            current = now.time()

            # Check time range
            if start <= end:
                in_blackout = start <= current <= end
            else:  # Crosses midnight
                in_blackout = current >= start or current <= end

            if in_blackout:
                logger.info(f"In blackout window: {blackout['name']}")
                return True, f"In blackout: {blackout['name']}"

        except Exception as e:
            logger.error(f"Error checking blackout {blackout.get('name', 'unknown')}: {e}")
            continue

    return False, "Not in any blackout window"


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
    if isinstance(tags_raw, dict):
        # Tags is a dict with structure: {has_ignore: bool, exclude_groups: [], all_tags: []}
        # Check ignore flag
        if rules.get('respect_ignore_tags', True) and tags_raw.get('has_ignore', False):
            return False, "Has 'ignore' tag"

        # NOTE: exclude tags are handled by check_exclude_group_affinity() per-target-node
        # They don't prevent migration entirely, only migration to nodes with same tag

        # Get all tags for other checks
        tags = [str(t).strip().lower() for t in tags_raw.get('all_tags', [])]
    elif isinstance(tags_raw, str):
        # Tags is a semicolon-separated string
        tags = [t.strip().lower() for t in tags_raw.split(';') if t.strip()]

        # Check ignore tag (existing functionality)
        if rules.get('respect_ignore_tags', True) and 'ignore' in tags:
            return False, "Has 'ignore' tag"

        # NOTE: exclude tags are handled by check_exclude_group_affinity() per-target-node
        # They don't prevent migration entirely, only migration to nodes with same tag
    else:
        tags = []

    # Check no-auto-migrate tag (new)
    if 'no-auto-migrate' in tags:
        return False, "Has 'no-auto-migrate' tag"

    # Check whitelist requirement (new, optional)
    if rules.get('require_auto_migrate_ok_tag', False):
        if 'auto-migrate-ok' not in tags:
            return False, "Missing 'auto-migrate-ok' tag (whitelist mode)"

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

    # Extract tags - handle both dict and string formats
    tags_raw = guest.get('tags', '')
    if isinstance(tags_raw, dict):
        exclude_groups = tags_raw.get('exclude_groups', [])
    elif isinstance(tags_raw, str):
        guest_tags = [t.strip().lower() for t in tags_raw.split(';') if t.strip()]
        exclude_groups = [t for t in guest_tags if t.startswith('exclude_')]
    else:
        exclude_groups = []

    if not exclude_groups:
        return True, "No exclude groups"

    # Count VMs per node per exclude group
    for exclude_group in exclude_groups:
        target_count = 0
        other_nodes_counts = {}

        for vmid, other_guest in cache_data.get('guests', {}).items():
            if other_guest.get('vmid') == guest.get('vmid'):
                continue

            # Extract other guest's tags - handle both dict and string formats
            other_tags_raw = other_guest.get('tags', '')
            if isinstance(other_tags_raw, dict):
                other_exclude_groups = other_tags_raw.get('exclude_groups', [])
                if exclude_group not in other_exclude_groups:
                    continue
            elif isinstance(other_tags_raw, str):
                other_tags = [t.strip().lower() for t in other_tags_raw.split(';') if t.strip()]
                if exclude_group not in other_tags:
                    continue
            else:
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

        # Poll task status until completion
        max_wait = 1800  # 30 minutes max (large VMs can take 10-20 minutes)
        poll_interval = 5  # Check every 5 seconds
        elapsed = 0

        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval

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

        # Timeout reached
        duration = int(time.time() - start_time)
        logger.warning(f"Migration polling timeout for VM {vmid} after {duration}s")
        return {
            "success": True,  # Migration started, but we stopped polling
            "task_id": task_id,
            "duration": duration,
            "status": "timeout",
            "warning": "Migration status polling timed out"
        }

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
                if (task.get('type') in ['qmigrate', 'vzmigrate'] and
                    str(task.get('id')) == str(vmid) and
                    task.get('pid') is not None):  # Running tasks have pid
                    logger.info(f"Found active migration task for VM {vmid}: {task.get('upid')}")
                    return True

        return False
    except Exception as e:
        logger.warning(f"Could not check migration status for VM {vmid}: {e}")
        # If we can't check, assume no migration in progress (fail open)
        return False


def is_vm_in_cooldown(vmid: int, cooldown_minutes: int) -> bool:
    """
    Check if a VM was recently migrated and is still in cooldown period.

    Args:
        vmid: VM ID to check
        cooldown_minutes: Cooldown period in minutes

    Returns:
        True if VM is in cooldown, False otherwise
    """
    if cooldown_minutes <= 0:
        return False

    history = load_history()
    migrations = history.get('migrations', [])

    # Check if this VM was migrated recently
    now = datetime.utcnow()
    cooldown_threshold = now - timedelta(minutes=cooldown_minutes)

    for migration in reversed(migrations):  # Check most recent first
        if migration.get('vmid') == vmid:
            try:
                migration_time = datetime.fromisoformat(migration.get('timestamp', ''))
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


def send_notification(config: Dict[str, Any], event_type: str, data: Dict[str, Any]):
    """
    Send notification webhook.

    Args:
        config: Configuration dictionary
        event_type: Type of event (start, complete, failure)
        data: Event data
    """
    notifications = config.get('automated_migrations', {}).get('notifications', {})

    if not notifications.get('enabled', False):
        return

    if not notifications.get(f'on_{event_type}', False):
        return

    webhook_url = notifications.get('webhook_url')
    if not webhook_url:
        return

    try:
        payload = {
            'event': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }

        requests.post(webhook_url, json=payload, timeout=10)
        logger.info(f"Sent {event_type} notification")

    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


def main():
    """Main automation logic."""
    lock_fd = None
    activity_log = []  # Initialize activity log at function level

    try:
        lock_fd = acquire_lock()
        logger.info("Starting automated migration check")

        # 1. Load configuration
        config = load_config()
        auto_config = config.get('automated_migrations', {})

        # 2. Check if enabled
        if not auto_config.get('enabled', False):
            logger.info("Automated migrations disabled in config")
            return 0

        # 3. Check migration window
        in_window, window_msg = is_in_migration_window(config)
        if not in_window:
            logger.info(f"Not in migration window: {window_msg}")
            return 0

        # 4. Check blackout window
        in_blackout, blackout_msg = is_in_blackout_window(config)
        if in_blackout:
            logger.info(f"In blackout window: {blackout_msg}")
            return 0

        # 5. Safety checks
        cache_data = read_cache()
        safe, safety_msg = perform_safety_checks(config, cache_data)
        if not safe:
            logger.warning(f"Safety check failed: {safety_msg}")
            send_notification(config, 'failure', {'reason': safety_msg})
            return 1

        logger.info(f"Safety checks passed: {safety_msg}")

        # 6. Get recommendations
        rec_data = get_recommendations(config)
        if not rec_data.get('success', False):
            logger.error("Failed to get recommendations")
            return 1

        recommendations = rec_data.get('recommendations', [])
        logger.info(f"Got {len(recommendations)} recommendations")

        if not recommendations:
            logger.info("No recommendations available")
            return 0

        # 7. Filter recommendations
        rules = auto_config.get('rules', {})
        maintenance_nodes = auto_config.get('maintenance_nodes', [])
        cooldown_minutes = rules.get('cooldown_minutes', 60)  # Default 60 minutes
        filtered = []

        for rec in recommendations:
            vmid = rec.get('vmid')
            source_node = rec.get('source_node')

            # Check if this is a maintenance evacuation (bypass most filters)
            is_maintenance_evac = source_node in maintenance_nodes

            # Check cooldown (skip for maintenance evacuations)
            if not is_maintenance_evac and is_vm_in_cooldown(vmid, cooldown_minutes):
                logger.info(f"VM {vmid} is in cooldown period, skipping")
                guest = cache_data.get('guests', {}).get(str(vmid), {})
                activity_log.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'action': 'skipped',
                    'reason': f'In cooldown period ({cooldown_minutes}min after recent migration)'
                })
                continue

            # Check confidence score (always check, even for maintenance)
            score = rec.get('confidence_score', 0)
            min_score = rules.get('min_confidence_score', 75)
            if score < min_score:
                logger.info(f"VM {vmid} confidence score {score} < {min_score}, skipping")
                guest = cache_data.get('guests', {}).get(str(vmid), {})
                activity_log.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'action': 'skipped',
                    'reason': f'Confidence score too low ({score}% < {min_score}%)'
                })
                continue

            # Get guest info
            guest = cache_data.get('guests', {}).get(str(vmid))
            if not guest:
                logger.warning(f"Guest {vmid} not found in cache")
                continue

            # For maintenance evacuations, skip tag and affinity checks
            if is_maintenance_evac:
                # Check if VM would have been filtered by tags (for logging purposes)
                tags_dict = guest.get('tags', {})
                if isinstance(tags_dict, dict):
                    has_exclude = bool(tags_dict.get('exclude_groups', []))
                    has_ignore = tags_dict.get('has_ignore', False)
                else:
                    has_exclude = False
                    has_ignore = False

                if has_exclude or has_ignore:
                    logger.info(f"VM {vmid} from maintenance node {source_node} - bypassing tag filters")
                else:
                    logger.info(f"VM {vmid} from maintenance node {source_node} - eligible for evacuation")
                filtered.append(rec)
                continue

            # Check tags (only for non-maintenance migrations)
            can_migrate, tag_reason = can_auto_migrate(guest, rules)
            if not can_migrate:
                logger.info(f"VM {vmid} cannot auto-migrate: {tag_reason}")
                activity_log.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'action': 'skipped',
                    'reason': tag_reason
                })
                continue

            # Check exclude group affinity (only for non-maintenance migrations)
            ok, affinity_reason = check_exclude_group_affinity(
                guest, rec['target_node'], cache_data, rules
            )
            if not ok:
                logger.info(f"VM {vmid} affinity check failed: {affinity_reason}")
                activity_log.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'vmid': vmid,
                    'name': guest.get('name', f'VM-{vmid}'),
                    'action': 'skipped',
                    'reason': affinity_reason
                })
                continue

            filtered.append(rec)

        logger.info(f"Filtered to {len(filtered)} eligible migrations")

        if not filtered:
            logger.info("No eligible migrations after filtering")
            # Save activity log even when no migrations happen
            try:
                history = load_history()
                history.setdefault('state', {})['activity_log'] = activity_log[-50:]
                save_history(history)
            except Exception as e:
                logger.error(f"Failed to save activity log: {e}")
            return 0

        # 8. Limit and execute migrations
        max_migrations_per_run = rules.get('max_migrations_per_run', 3)
        max_concurrent = rules.get('max_concurrent_migrations', 3)

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
                        if (task.get('type') in ['qmigrate', 'vzmigrate'] and
                            task.get('pid') is not None):
                            running_count += 1
        except Exception as e:
            logger.warning(f"Could not check running migrations: {e}")

        logger.info(f"Currently {running_count} migrations running cluster-wide")

        # Calculate how many new migrations we can start
        available_slots = max(0, max_concurrent - running_count)
        max_new_migrations = min(max_migrations_per_run, available_slots)

        if available_slots == 0:
            logger.info(f"Maximum concurrent migrations ({max_concurrent}) already running, skipping this run")
            return 0

        to_migrate = filtered[:max_new_migrations]

        dry_run = auto_config.get('dry_run', True)

        logger.info(f"Planning to migrate {len(to_migrate)} VMs (dry_run={dry_run}, max_concurrent={max_concurrent}, available_slots={available_slots})")

        send_notification(config, 'start', {
            'migration_count': len(to_migrate),
            'dry_run': dry_run,
            'window': window_msg
        })

        success_count = 0
        for rec in to_migrate:
            vmid = rec['vmid']
            target = rec['target_node']
            source = rec['source_node']
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
                continue

            target_score = rec.get('target_node_score', 'N/A')
            logger.info(f"Migrating {guest_type} {vmid} ({rec['name']}) to {target} (score: {target_score}) - {rec['reason']}")

            result = execute_migration(vmid, target, source, guest_type, config, dry_run=dry_run)

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
                'source_node': rec['source_node'],
                'target_node': target,
                'target_node_score': rec.get('target_node_score'),  # Include node score
                'reason': rec['reason'],
                'confidence_score': rec['confidence_score'],
                'status': status,
                'duration_seconds': result.get('duration', 0),
                'initiated_by': 'automated',
                'dry_run': dry_run,
                'window_name': window_msg
            }

            # Add task_id if present
            if result.get('task_id'):
                migration_record['task_id'] = result['task_id']

            # Add error message if present
            if result.get('error'):
                migration_record['error'] = result['error']

            record_migration(migration_record)

            if result.get('success'):
                success_count += 1
            else:
                if auto_config.get('safety_checks', {}).get('abort_on_failure', True):
                    logger.error("Migration failed, aborting remaining migrations")
                    break

        logger.info(f"Completed: {success_count}/{len(to_migrate)} successful")

        send_notification(config, 'complete', {
            'total': len(to_migrate),
            'successful': success_count,
            'failed': len(to_migrate) - success_count,
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
        return 1

    finally:
        # Always update state to record this automation run (even if exited early)
        try:
            history = load_history()
            history.setdefault('state', {})['last_run'] = datetime.utcnow().isoformat() + 'Z'
            save_history(history)
        except Exception as e:
            logger.error(f"Failed to update state: {e}")

        if lock_fd:
            release_lock(lock_fd)
        logger.info("Automated migration check complete")


if __name__ == '__main__':
    sys.exit(main())
