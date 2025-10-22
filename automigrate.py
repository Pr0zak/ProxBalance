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
from datetime import datetime, time
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

        # Check exclude groups
        if rules.get('respect_exclude_tags', True):
            exclude_groups = tags_raw.get('exclude_groups', [])
            if exclude_groups:
                return False, f"Has exclude tag: {exclude_groups[0]}"

        # Get all tags for other checks
        tags = [str(t).strip().lower() for t in tags_raw.get('all_tags', [])]
    elif isinstance(tags_raw, str):
        # Tags is a semicolon-separated string
        tags = [t.strip().lower() for t in tags_raw.split(';') if t.strip()]

        # Check ignore tag (existing functionality)
        if rules.get('respect_ignore_tags', True) and 'ignore' in tags:
            return False, "Has 'ignore' tag"

        # Check exclude tags (existing functionality)
        if rules.get('respect_exclude_tags', True):
            exclude_tags = [t for t in tags if t.startswith('exclude_')]
            if exclude_tags:
                return False, f"Has exclude tag: {exclude_tags[0]}"
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

    guest_tags = [t.strip().lower() for t in guest.get('tags', '').split(';') if t.strip()]
    exclude_groups = [t for t in guest_tags if t.startswith('exclude_')]

    if not exclude_groups:
        return True, "No exclude groups"

    # Count VMs per node per exclude group
    for exclude_group in exclude_groups:
        target_count = 0
        other_nodes_counts = {}

        for vmid, other_guest in cache_data.get('guests', {}).items():
            if other_guest.get('vmid') == guest.get('vmid'):
                continue

            other_tags = [t.strip().lower() for t in other_guest.get('tags', '').split(';') if t.strip()]
            if exclude_group not in other_tags:
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
    Perform cluster health and safety checks.

    Args:
        config: Configuration dictionary
        cache_data: Current cluster data

    Returns:
        Tuple of (safe, message)
    """
    safety = config.get('automated_migrations', {}).get('safety_checks', {})

    if not safety.get('check_cluster_health', True):
        return True, "Health checks disabled"

    # Check quorum
    if safety.get('require_quorum', True):
        quorate = cache_data.get('cluster_health', {}).get('quorate', False)
        if not quorate:
            logger.warning("Cluster not quorate")
            return False, "Cluster not quorate"

    # Check node health
    nodes = cache_data.get('nodes', {})
    for node_name, node_data in nodes.items():
        cpu_pct = node_data.get('cpu_percent', 0)
        mem_pct = node_data.get('memory_percent', 0)

        max_cpu = safety.get('max_node_cpu_percent', 85)
        max_mem = safety.get('max_node_memory_percent', 90)

        if cpu_pct > max_cpu:
            logger.warning(f"Node {node_name} CPU too high: {cpu_pct:.1f}%")
            return False, f"Node {node_name} CPU too high: {cpu_pct:.1f}%"

        if mem_pct > max_mem:
            logger.warning(f"Node {node_name} memory too high: {mem_pct:.1f}%")
            return False, f"Node {node_name} memory too high: {mem_pct:.1f}%"

    return True, "All safety checks passed"


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
    config: Dict[str, Any],
    dry_run: bool = True
) -> Dict[str, Any]:
    """
    Execute a VM migration.

    Args:
        vmid: VM ID to migrate
        target_node: Target node name
        config: Configuration dictionary
        dry_run: If True, don't actually migrate

    Returns:
        Result dictionary with success status
    """
    if dry_run:
        logger.info(f"[DRY RUN] Would migrate VM {vmid} to {target_node}")
        return {"success": True, "dry_run": True}

    try:
        # Call migration API endpoint
        response = requests.post(
            'http://127.0.0.1:5000/api/migrate',
            json={
                'vmid': vmid,
                'target_node': target_node
            },
            timeout=300
        )
        response.raise_for_status()
        result = response.json()

        if result.get('success'):
            logger.info(f"Successfully migrated VM {vmid} to {target_node}")
        else:
            logger.error(f"Failed to migrate VM {vmid}: {result.get('message', 'Unknown error')}")

        return result

    except Exception as e:
        logger.error(f"Error migrating VM {vmid}: {e}")
        return {"success": False, "error": str(e)}


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
        filtered = []

        for rec in recommendations:
            vmid = rec.get('vmid')
            source_node = rec.get('source_node')

            # Check if this is a maintenance evacuation (bypass most filters)
            is_maintenance_evac = source_node in maintenance_nodes

            # Check confidence score (always check, even for maintenance)
            score = rec.get('confidence_score', 0)
            min_score = rules.get('min_confidence_score', 75)
            if score < min_score:
                logger.info(f"VM {vmid} confidence score {score} < {min_score}, skipping")
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
                continue

            # Check exclude group affinity (only for non-maintenance migrations)
            ok, affinity_reason = check_exclude_group_affinity(
                guest, rec['target_node'], cache_data, rules
            )
            if not ok:
                logger.info(f"VM {vmid} affinity check failed: {affinity_reason}")
                continue

            filtered.append(rec)

        logger.info(f"Filtered to {len(filtered)} eligible migrations")

        if not filtered:
            logger.info("No eligible migrations after filtering")
            return 0

        # 8. Limit and execute migrations
        max_migrations = rules.get('max_migrations_per_run', 3)
        to_migrate = filtered[:max_migrations]

        dry_run = auto_config.get('dry_run', True)

        logger.info(f"Planning to migrate {len(to_migrate)} VMs (dry_run={dry_run})")

        send_notification(config, 'start', {
            'migration_count': len(to_migrate),
            'dry_run': dry_run,
            'window': window_msg
        })

        success_count = 0
        for rec in to_migrate:
            vmid = rec['vmid']
            target = rec['target_node']

            logger.info(f"Migrating VM {vmid} ({rec['name']}) to {target} - {rec['reason']}")

            result = execute_migration(vmid, target, config, dry_run=dry_run)

            # Record migration
            record_migration({
                'id': str(uuid.uuid4()),
                'timestamp': datetime.utcnow().isoformat(),
                'vmid': vmid,
                'name': rec['name'],
                'source_node': rec['source_node'],
                'target_node': target,
                'reason': rec['reason'],
                'confidence_score': rec['confidence_score'],
                'status': 'completed' if result.get('success') else 'failed',
                'duration_seconds': result.get('duration', 0),
                'initiated_by': 'automated',
                'dry_run': dry_run,
                'window_name': window_msg
            })

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

        return 0

    except Exception as e:
        logger.exception(f"Unexpected error in automigrate: {e}")
        return 1

    finally:
        if lock_fd:
            release_lock(lock_fd)
        logger.info("Automated migration check complete")


if __name__ == '__main__':
    sys.exit(main())
