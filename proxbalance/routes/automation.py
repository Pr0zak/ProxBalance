from flask import Blueprint, jsonify, request, current_app
import json, os, sys, subprocess, re, time
from datetime import datetime, timedelta
from pathlib import Path
from proxbalance.config_manager import load_config, CONFIG_FILE, BASE_PATH
from proxbalance.error_handlers import api_route

automation_bp = Blueprint("automation", __name__)


def read_cache():
    return current_app.config['cache_manager'].get()


@automation_bp.route("/api/automigrate/status", methods=["GET"])
@api_route
def get_automigrate_status():
    """Get automation status and next run time"""
    try:
        config = load_config()
        if config.get('error'):
            return jsonify({"success": False, "error": config.get('message')}), 500

        auto_config = config.get('automated_migrations', {})

        # Check timer status
        try:
            timer_result = subprocess.run(
                ['/usr/bin/systemctl', 'is-active', 'proxmox-balance-automigrate.timer'],
                capture_output=True, text=True, timeout=5
            )
            timer_active = timer_result.stdout.strip() == 'active'
        except Exception:
            timer_active = False

        # Load history
        history_file = os.path.join(BASE_PATH, 'migration_history.json')
        history = {"migrations": [], "state": {}}
        if os.path.exists(history_file):
            try:
                with open(history_file, 'r') as f:
                    history = json.load(f)
            except:
                pass

        # Get recent migrations (last 7 days)
        all_migrations = history.get('migrations', [])
        seven_days_ago = datetime.now() - timedelta(days=7)

        recent = []
        for migration in all_migrations:
            try:
                # Parse timestamp (may or may not have 'Z' suffix)
                timestamp_str = migration.get('timestamp', '')
                if timestamp_str:
                    # Remove 'Z' if present and parse
                    timestamp_str = timestamp_str.rstrip('Z')
                    migration_date = datetime.fromisoformat(timestamp_str)

                    # Include if within last 7 days
                    if migration_date >= seven_days_ago:
                        recent.append(migration)
            except (ValueError, TypeError):
                # If timestamp parsing fails, include it anyway (better to show than hide)
                recent.append(migration)

        # Check for in-progress migrations using cluster tasks endpoint
        in_progress_migrations = []
        try:
            import requests
            cache_data = read_cache()
            token_id = config.get('proxmox_api_token_id', '')
            token_secret = config.get('proxmox_api_token_secret', '')
            proxmox_host = config.get('proxmox_host', 'localhost')
            proxmox_port = config.get('proxmox_port', 8006)
            verify_ssl = config.get('proxmox_verify_ssl', False)

            if token_id and token_secret and cache_data:
                try:
                    # Query cluster tasks endpoint
                    url = f"https://{proxmox_host}:{proxmox_port}/api2/json/cluster/tasks"
                    headers = {
                        'Authorization': f'PVEAPIToken={token_id}={token_secret}'
                    }

                    response = requests.get(url, headers=headers, verify=verify_ssl, timeout=10)

                    if response.status_code == 200:
                        tasks_data = response.json().get('data', [])

                        # Find running migration tasks (they have a 'pid' key when running)
                        for task in tasks_data:
                            if (task.get('type') in ['qmigrate', 'vzmigrate'] and
                                task.get('pid') is not None):  # Running tasks have pid

                                vmid = task.get('id')
                                guest = cache_data.get('guests', {}).get(str(vmid), {})

                                # Try to find target node from recent migration history
                                target_node = 'unknown'
                                task_upid = task.get('upid')
                                for migration in reversed(recent):  # Search most recent first
                                    if (migration.get('vmid') == vmid and
                                        migration.get('task_id') == task_upid):
                                        target_node = migration.get('target_node', 'unknown')
                                        break

                                # If not found in history, try to parse from task log (for manual migrations)
                                if target_node == 'unknown' and task_upid:
                                    try:
                                        source_node = task.get('node')
                                        log_url = f"https://{proxmox_host}:{proxmox_port}/api2/json/nodes/{source_node}/tasks/{task_upid}/log"
                                        log_response = requests.get(
                                            log_url,
                                            headers={'Authorization': f'PVEAPIToken={token_id}={token_secret}'},
                                            verify=verify_ssl,
                                            timeout=5
                                        )
                                        if log_response.status_code == 200:
                                            log_data = log_response.json().get('data', [])
                                            # Look for "starting migration of CT/VM XXX to node 'target'"
                                            import re
                                            for log_entry in log_data:
                                                log_text = log_entry.get('t', '')
                                                match = re.search(r"to node ['\"]([^'\"]+)", log_text)
                                                if match:
                                                    target_node = match.group(1)
                                                    break
                                    except Exception as log_err:
                                        pass  # Ignore log parsing errors, keep 'unknown'

                                # Determine who initiated the migration
                                task_user = task.get('user', '')
                                initiated_by = 'automated' if 'proxbalance' in task_user else 'manual'

                                # Parse progress from task log
                                progress_info = None
                                try:
                                    task_upid = task.get('upid')
                                    source_node = task.get('node')
                                    if task_upid and source_node:
                                        log_url = f"https://{proxmox_host}:{proxmox_port}/api2/json/nodes/{source_node}/tasks/{task_upid}/log?limit=0"
                                        log_response = requests.get(
                                            log_url,
                                            headers={'Authorization': f'PVEAPIToken={token_id}={token_secret}'},
                                            verify=verify_ssl,
                                            timeout=10
                                        )
                                        if log_response.status_code == 200:
                                            task_log = log_response.json().get('data', [])

                                            # Track progress per disk (disk_name -> {transferred, total, line_number})
                                            disk_progress = {}

                                            for idx, entry in enumerate(task_log):
                                                line = entry.get('t', '')
                                                # Look for disk/memory progress in multiple formats:
                                                # Format 1: "mirror-scsi0: transferred X GiB of Y GiB (Z%)"
                                                # Format 2: "i0: transferred X GiB of Y GiB (Z%)"
                                                # Format 3: "migration active, transferred X GiB of Y GiB VM-state"
                                                if 'transferred' in line:
                                                    import re

                                                    # Try VM-state format first (no colon prefix)
                                                    vm_state_match = re.search(r'transferred\s+([\d.]+)\s+GiB\s+of\s+([\d.]+)\s+GiB\s+VM-state', line)
                                                    if vm_state_match:
                                                        transferred = float(vm_state_match.group(1))
                                                        total = float(vm_state_match.group(2))
                                                        disk_progress['VM-state'] = {'transferred': transferred, 'total': total, 'line_number': idx, 'name': 'VM-state'}
                                                        continue

                                                    # Try to extract disk name - handle "mirror-XXX:" and "iX:" formats
                                                    disk_match = re.search(r'(mirror-\w+|i\d+):', line)
                                                    if disk_match:
                                                        disk_name = disk_match.group(1)

                                                        # Try to match GiB/GiB pattern first (with optional time)
                                                        match = re.search(r'transferred\s+([\d.]+)\s+GiB\s+of\s+([\d.]+)\s+GiB\s+\(([\d.]+)%\)(?:\s+in\s+([\dhms ]+))?', line)
                                                        if match:
                                                            transferred = float(match.group(1))
                                                            total = float(match.group(2))
                                                            time_str = match.group(4) if match.lastindex >= 4 else None

                                                            # Parse elapsed time if present (e.g., "30m 41s" or "5s" or "1h 5m 23s")
                                                            elapsed_seconds = None
                                                            if time_str:
                                                                elapsed_seconds = 0
                                                                time_parts = re.findall(r'(\d+)([hms])', time_str)
                                                                for value, unit in time_parts:
                                                                    if unit == 'h':
                                                                        elapsed_seconds += int(value) * 3600
                                                                    elif unit == 'm':
                                                                        elapsed_seconds += int(value) * 60
                                                                    elif unit == 's':
                                                                        elapsed_seconds += int(value)

                                                            disk_progress[disk_name] = {
                                                                'transferred': transferred,
                                                                'total': total,
                                                                'line_number': idx,
                                                                'name': disk_name,
                                                                'elapsed_seconds': elapsed_seconds
                                                            }
                                                        else:
                                                            # Try MiB/GiB pattern
                                                            match = re.search(r'transferred\s+([\d.]+)\s+MiB\s+of\s+([\d.]+)\s+GiB\s+\(([\d.]+)%\)(?:\s+in\s+([\dhms ]+))?', line)
                                                            if match:
                                                                transferred = float(match.group(1)) / 1024  # Convert MiB to GiB
                                                                total = float(match.group(2))
                                                                time_str = match.group(4) if match.lastindex >= 4 else None

                                                                # Parse elapsed time
                                                                elapsed_seconds = None
                                                                if time_str:
                                                                    elapsed_seconds = 0
                                                                    time_parts = re.findall(r'(\d+)([hms])', time_str)
                                                                    for value, unit in time_parts:
                                                                        if unit == 'h':
                                                                            elapsed_seconds += int(value) * 3600
                                                                        elif unit == 'm':
                                                                            elapsed_seconds += int(value) * 60
                                                                        elif unit == 's':
                                                                            elapsed_seconds += int(value)

                                                                disk_progress[disk_name] = {
                                                                    'transferred': transferred,
                                                                    'total': total,
                                                                    'line_number': idx,
                                                                    'name': disk_name,
                                                                    'elapsed_seconds': elapsed_seconds
                                                                }

                                            # If we have multiple disks, calculate aggregate; otherwise just show the single disk
                                            if disk_progress:
                                                if len(disk_progress) > 1:
                                                    # Multiple disks - show aggregate progress
                                                    total_transferred = sum(d['transferred'] for d in disk_progress.values())
                                                    total_size = sum(d['total'] for d in disk_progress.values())
                                                    overall_percentage = int((total_transferred / total_size * 100)) if total_size > 0 else 0
                                                    disk_names = ', '.join(sorted(disk_progress.keys()))

                                                    # Calculate average speed if we have elapsed time for any disk
                                                    elapsed_times = [d['elapsed_seconds'] for d in disk_progress.values() if d.get('elapsed_seconds')]
                                                    speed_mib_s = None
                                                    if elapsed_times:
                                                        # Use the maximum elapsed time (most recent disk still transferring)
                                                        max_elapsed = max(elapsed_times)
                                                        if max_elapsed > 0:
                                                            speed_mib_s = (total_transferred * 1024) / max_elapsed  # Convert GiB to MiB and divide by seconds

                                                    progress_info = {
                                                        "transferred_gib": total_transferred,
                                                        "total_gib": total_size,
                                                        "percentage": overall_percentage,
                                                        "human_readable": f"{total_transferred:.1f} GiB of {total_size:.1f} GiB ({disk_names})"
                                                    }
                                                    if speed_mib_s is not None:
                                                        progress_info["speed_mib_s"] = round(speed_mib_s, 2)
                                                else:
                                                    # Single disk - show its progress
                                                    disk = list(disk_progress.values())[0]
                                                    disk_percentage = int((disk['transferred'] / disk['total'] * 100)) if disk['total'] > 0 else 0

                                                    # Calculate speed if we have elapsed time
                                                    speed_mib_s = None
                                                    if disk.get('elapsed_seconds') and disk['elapsed_seconds'] > 0:
                                                        speed_mib_s = (disk['transferred'] * 1024) / disk['elapsed_seconds']

                                                    progress_info = {
                                                        "transferred_gib": disk['transferred'],
                                                        "total_gib": disk['total'],
                                                        "percentage": disk_percentage,
                                                        "human_readable": f"{disk['transferred']:.1f} GiB of {disk['total']:.1f} GiB ({disk['name']})"
                                                    }
                                                    if speed_mib_s is not None:
                                                        progress_info["speed_mib_s"] = round(speed_mib_s, 2)
                                except Exception as progress_err:
                                    pass  # Ignore progress parsing errors

                                # For CT migrations (vzmigrate), parse progress from different format
                                # Format: "32992526336 bytes (33 GB, 31 GiB) copied, 300 s, 110 MB/s"
                                if not progress_info and task.get('type') == 'vzmigrate' and task_log:
                                    try:
                                        for line in reversed(task_log):
                                            # Match CT migration progress line
                                            match = re.search(r'([\d]+)\s+bytes\s+\([\d.]+\s+GB,\s+([\d.]+)\s+GiB\)\s+copied,\s+([\d]+)\s+s,\s+([\d.]+)\s+MB/s', line.get('t', ''))
                                            if match:
                                                bytes_copied = int(match.group(1))
                                                gib_copied = float(match.group(2))
                                                elapsed_seconds = int(match.group(3))
                                                speed_mb_s = float(match.group(4))

                                                # Try to get CT disk size to estimate percentage
                                                total_gib = None
                                                percentage = None
                                                try:
                                                    # Get CT config to find rootfs size
                                                    source_node = task.get('node', 'unknown')
                                                    if source_node != 'unknown' and vmid:
                                                        config_url = f"https://{proxmox_host}:{proxmox_port}/api2/json/nodes/{source_node}/lxc/{vmid}/config"
                                                        config_response = requests.get(config_url, headers=headers, verify=verify_ssl, timeout=5)
                                                        if config_response.status_code == 200:
                                                            ct_config = config_response.json().get('data', {})
                                                            rootfs = ct_config.get('rootfs', '')
                                                            # Parse rootfs string like "local-lvm:vm-109-disk-0,size=128G"
                                                            size_match = re.search(r'size=(\d+)G', rootfs)
                                                            if size_match:
                                                                total_gib = float(size_match.group(1))
                                                                percentage = int((gib_copied / total_gib * 100)) if total_gib > 0 else None
                                                except Exception:
                                                    pass  # If we can't get size, just show transferred amount

                                                # Build progress info
                                                progress_info = {
                                                    "transferred_gib": gib_copied,
                                                    "speed_mib_s": speed_mb_s,  # MB/s is close enough to MiB/s for display
                                                }

                                                if total_gib and percentage is not None:
                                                    progress_info["total_gib"] = total_gib
                                                    progress_info["percentage"] = percentage
                                                    progress_info["human_readable"] = f"{gib_copied:.1f} GiB of {total_gib:.1f} GiB ({percentage}%) at {speed_mb_s:.0f} MB/s"
                                                else:
                                                    progress_info["human_readable"] = f"{gib_copied:.1f} GiB transferred at {speed_mb_s:.0f} MB/s"
                                                break
                                    except Exception as ct_progress_err:
                                        pass  # Ignore CT progress parsing errors

                                # Extract starttime from UPID (format: UPID:node:pid:pstart:starttime:type:vmid:user)
                                starttime = task.get('starttime')  # Try direct field first
                                if not starttime and task_upid:
                                    try:
                                        upid_parts = task_upid.split(':')
                                        if len(upid_parts) >= 5:
                                            starttime = int(upid_parts[4], 16)  # starttime is in hex format
                                    except (ValueError, IndexError):
                                        pass

                                migration_data = {
                                    'vmid': vmid,
                                    'name': guest.get('name', f'VM-{vmid}'),
                                    'source_node': task.get('node', 'unknown'),
                                    'target_node': target_node,
                                    'status': 'running',
                                    'task_id': task_upid,
                                    'starttime': starttime,
                                    'type': 'VM' if task.get('type') == 'qmigrate' else 'CT',
                                    'initiated_by': initiated_by,
                                    'user': task_user
                                }

                                if progress_info:
                                    migration_data['progress'] = progress_info

                                in_progress_migrations.append(migration_data)
                    else:
                        print(f"Failed to fetch cluster tasks: HTTP {response.status_code}", file=sys.stderr)

                except Exception as e:
                    print(f"Error querying Proxmox cluster tasks: {e}", file=sys.stderr)

        except Exception as e:
            print(f"Error checking in-progress migrations: {e}", file=sys.stderr)

        # Calculate next check time
        next_check = None
        last_run = history.get('state', {}).get('last_run')
        check_interval_minutes = auto_config.get('check_interval_minutes', 5)

        if last_run and auto_config.get('enabled', False) and timer_active:
            try:
                # last_run is a dict with 'timestamp' field
                timestamp = last_run.get('timestamp') if isinstance(last_run, dict) else last_run
                if timestamp:
                    last_run_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    next_check_dt = last_run_dt + timedelta(minutes=check_interval_minutes)
                    next_check = next_check_dt.isoformat().replace('+00:00', 'Z')
            except (ValueError, TypeError, AttributeError):
                pass

        # Get current window status
        import pytz
        current_window = None
        windows = config.get('automated_migrations', {}).get('schedule', {}).get('migration_windows', [])

        # Get schedule-level timezone (fallback to UTC if not set)
        schedule_tz = config.get('automated_migrations', {}).get('schedule', {}).get('timezone', 'UTC')

        if windows:
            for window in windows:
                # Windows are enabled by default unless explicitly disabled
                if not window.get('enabled', True):
                    continue

                try:
                    # Use window-level timezone if specified, otherwise use schedule-level timezone
                    tz = pytz.timezone(window.get('timezone', schedule_tz))
                    now = datetime.now(tz)

                    # Check day of week
                    current_day = now.strftime('%A').lower()
                    window_days = [d.lower() for d in window.get('days', [])]
                    if current_day not in window_days:
                        continue

                    # Parse time range
                    from datetime import time as dt_time
                    start = datetime.strptime(window['start_time'], '%H:%M').time()
                    end = datetime.strptime(window['end_time'], '%H:%M').time()
                    current = now.time()

                    # Check time range (handles overnight windows)
                    if start <= end:
                        in_window = start <= current <= end
                    else:  # Crosses midnight
                        in_window = current >= start or current <= end

                    if in_window:
                        current_window = window['name']
                        break
                except Exception as e:
                    print(f"Error checking window {window.get('name', 'unknown')}: {e}", file=sys.stderr)
                    continue

        # If no window is active and windows are defined, show "Outside migration windows"
        # If no windows are defined, show "No windows defined (always allowed)"
        if current_window is None:
            if windows:
                current_window = "Outside migration windows"
            else:
                current_window = "No windows defined (always allowed)"

        # Update state with current window
        state = history.get('state', {}).copy()
        state['current_window'] = current_window

        # Load intelligent migration tracking data
        intelligent_tracking = {"enabled": False}
        try:
            rules = auto_config.get('rules', {})
            im_config = rules.get('intelligent_migrations', {})
            im_enabled = im_config.get('enabled', False)
            tracking_file = os.path.join(BASE_PATH, 'recommendation_tracking.json')
            tracking_data = {}
            if os.path.exists(tracking_file):
                with open(tracking_file, 'r') as f:
                    tracking_data = json.load(f)
            tracked = tracking_data.get('tracked', {})
            observing_count = sum(1 for v in tracked.values() if v.get('status') == 'observing')
            ready_count = sum(1 for v in tracked.values() if v.get('status') == 'ready')
            items = [{
                "vmid": v.get('vmid'),
                "name": v.get('guest_name', ''),
                "source_node": v.get('source_node', ''),
                "last_target_node": v.get('last_target_node', ''),
                "consecutive_count": v.get('consecutive_count', 0),
                "status": v.get('status', 'observing'),
                "first_seen": v.get('first_seen', ''),
            } for v in tracked.values()]
            intelligent_tracking = {
                "enabled": im_enabled,
                "observation_periods": im_config.get('observation_periods', 3),
                "total_tracked": len(tracked),
                "observing_count": observing_count,
                "ready_count": ready_count,
                "items": items,
            }
        except Exception:
            pass

        return jsonify({
            "success": True,
            "enabled": auto_config.get('enabled', False),
            "dry_run": auto_config.get('dry_run', True),
            "timer_active": timer_active,
            "check_interval_minutes": check_interval_minutes,
            "next_check": next_check,
            "recent_migrations": recent,
            "in_progress_migrations": in_progress_migrations,
            "state": state,
            "filter_reasons": history.get('state', {}).get('last_filter_reasons', []),
            "intelligent_tracking": intelligent_tracking
        })

    except Exception as e:
        print(f"Error getting automigrate status: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@automation_bp.route("/api/automigrate/history", methods=["GET"])
@api_route
def get_automigrate_history():
    """Get automation run history with decisions, or individual migration history"""
    try:
        history_file = os.path.join(BASE_PATH, 'migration_history.json')

        if not os.path.exists(history_file):
            return jsonify({"success": True, "runs": [], "migrations": [], "total": 0})

        with open(history_file, 'r') as f:
            history = json.load(f)

        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        status_filter = request.args.get('status', None, type=str)
        view_type = request.args.get('type', 'runs', type=str)  # 'runs' or 'migrations'

        if view_type == 'runs':
            # Return automation run history (with decisions)
            runs = history.get('run_history', [])

            # Apply status filter if provided
            if status_filter:
                runs = [r for r in runs if r.get('status') == status_filter]

            # Get total before limiting
            total = len(runs)

            # Limit results (already in newest-first order)
            runs = runs[:limit]

            return jsonify({
                "success": True,
                "runs": runs,
                "total": total
            })
        else:
            # Return individual migration history (legacy behavior)
            migrations = history.get('migrations', [])

            # Apply status filter if provided
            if status_filter:
                migrations = [m for m in migrations if m.get('status') == status_filter]

            # Get total before limiting
            total = len(migrations)

            # Limit results (get most recent)
            migrations = migrations[-limit:]

            return jsonify({
                "success": True,
                "migrations": migrations,
                "total": total
            })

    except Exception as e:
        print(f"Error getting automigrate history: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@automation_bp.route("/api/automigrate/test", methods=["POST"])
@api_route
def test_automigrate():
    """Test automation logic without executing migrations"""
    try:
        # Run automigrate.py
        script_path = os.path.join(BASE_PATH, 'automigrate.py')
        venv_python = os.path.join(BASE_PATH, 'venv', 'bin', 'python3')

        if not os.path.exists(script_path):
            return jsonify({
                "success": False,
                "error": f"automigrate.py not found at {script_path}"
            }), 404

        result = subprocess.run(
            [venv_python, script_path],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=BASE_PATH
        )

        return jsonify({
            "success": result.returncode == 0,
            "return_code": result.returncode,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        })

    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Test timed out after 60 seconds"
        }), 500
    except Exception as e:
        print(f"Error testing automigrate: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@automation_bp.route("/api/automigrate/run", methods=["POST"])
@api_route
def run_automigrate():
    """Manually trigger automation check now"""
    try:
        print("Manual 'Run Now' triggered via API", file=sys.stderr)

        # Check if any migrations are currently running cluster-wide
        try:
            status_data = get_automation_status_data()
            if status_data.get('in_progress_migrations') and len(status_data['in_progress_migrations']) > 0:
                running_migrations = status_data['in_progress_migrations']
                migration_info = running_migrations[0]
                return jsonify({
                    "success": False,
                    "error": f"Cannot start new migration: {migration_info['name']} ({migration_info['vmid']}) is currently migrating from {migration_info['source_node']} to {migration_info.get('target_node', 'unknown')}"
                }), 409  # 409 Conflict
        except Exception as check_err:
            print(f"Warning: Could not check for running migrations: {check_err}", file=sys.stderr)
            # Continue anyway - don't block on check failure

        # Run automigrate.py
        script_path = os.path.join(BASE_PATH, 'automigrate.py')
        venv_python = os.path.join(BASE_PATH, 'venv', 'bin', 'python3')

        if not os.path.exists(script_path):
            return jsonify({
                "success": False,
                "error": f"automigrate.py not found at {script_path}"
            }), 404

        # Run automation and capture initial output to return migration details
        # Run in background for long-running migrations, but capture first few seconds of output
        import time
        import re

        log_file = os.path.join(BASE_PATH, 'automigrate_manual.log')

        # Clear/create log file
        with open(log_file, 'w') as f:
            f.write(f"{'='*80}\n")
            f.write(f"Manual run started at {datetime.now().isoformat()}\n")
            f.write(f"{'='*80}\n\n")

        # Start process in background
        process = subprocess.Popen(
            [venv_python, script_path],
            stdout=open(log_file, 'a'),
            stderr=subprocess.STDOUT,
            cwd=BASE_PATH
        )

        # Wait for script to start and log initial output (recommendations can take 10-15 seconds)
        time.sleep(12)

        # Read log file to extract migration info
        migration_info = None
        try:
            with open(log_file, 'r') as f:
                log_content = f.read()

                # Parse log for migration start message
                # Format: "2025-10-25 22:38:14,176 - __main__ - INFO - Migrating CT 109 (influxdb) from pve3 to pve6 (score: 58.91) - Balance CPU load (src: 53.4%, target: 38.6%)"
                # Pattern matches: Migrating (VM|CT) {vmid} ({name}) from {source} to {target}
                match = re.search(r'INFO - Migrating (VM|CT) (\d+) \(([^)]+)\) from (\S+) to (\S+)', log_content)
                if match:
                    guest_type, vmid, name, source_node, target_node = match.groups()

                    migration_info = {
                        "vmid": vmid,
                        "name": name,
                        "type": guest_type,
                        "source_node": source_node,
                        "target_node": target_node
                    }
        except Exception as parse_err:
            print(f"Warning: Could not parse migration info from log: {parse_err}", file=sys.stderr)

        return jsonify({
            "success": True,
            "message": "Automation check started in background. Check status for results.",
            "output": "Automation process started successfully. Monitor the automation status to see migration progress.",
            "migration_info": migration_info  # Include parsed migration details
        })

    except Exception as e:
        print(f"Error running automigrate: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@automation_bp.route("/api/automigrate/config", methods=["GET", "POST"])
@api_route
def automigrate_config():
    """Get or update automated migration configuration"""
    if request.method == "GET":
        try:
            config = load_config()
            if config.get('error'):
                return jsonify({"success": False, "error": config.get('message')}), 500

            auto_config = config.get('automated_migrations', {})
            return jsonify({
                "success": True,
                "config": auto_config
            })

        except Exception as e:
            print(f"Error getting automigrate config: {str(e)}", file=sys.stderr)
            return jsonify({"success": False, "error": str(e)}), 500

    elif request.method == "POST":
        try:
            config = load_config()
            if config.get('error'):
                return jsonify({"success": False, "error": config.get('message')}), 500

            # Get updates from request
            updates = request.json

            if 'automated_migrations' not in config:
                config['automated_migrations'] = {}

            # Keys that belong at the root config level, not under automated_migrations
            root_level_keys = {'distribution_balancing'}

            # Update configuration (deep merge)
            for key, value in updates.items():
                if key in root_level_keys:
                    # Save root-level keys at the top level of config
                    if isinstance(value, dict) and key in config:
                        config[key].update(value)
                    else:
                        config[key] = value
                elif isinstance(value, dict) and key in config['automated_migrations']:
                    config['automated_migrations'][key].update(value)
                else:
                    config['automated_migrations'][key] = value

            # Save configuration
            with open(CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)

            # Update systemd timer if check_interval_minutes changed
            if 'check_interval_minutes' in updates:
                try:
                    interval_minutes = updates['check_interval_minutes']

                    # Create systemd drop-in override
                    override_dir = Path("/etc/systemd/system/proxmox-balance-automigrate.timer.d")
                    override_dir.mkdir(parents=True, exist_ok=True)

                    override_file = override_dir / "interval.conf"
                    override_content = f"""[Timer]
OnUnitActiveSec=
OnUnitActiveSec={interval_minutes}min
"""

                    with open(override_file, 'w') as f:
                        f.write(override_content)

                    # Reload systemd configuration
                    subprocess.run(['/usr/bin/systemctl', 'daemon-reload'], check=True, capture_output=True)

                    # Stop and start timer instead of restart to avoid immediate trigger
                    # This preserves the existing schedule instead of resetting OnBootSec
                    subprocess.run(['/usr/bin/systemctl', 'stop', 'proxmox-balance-automigrate.timer'], check=True, capture_output=True)
                    subprocess.run(['/usr/bin/systemctl', 'start', 'proxmox-balance-automigrate.timer'], check=True, capture_output=True)

                    print(f"✓ Automigrate timer interval updated to {interval_minutes} minutes (will apply on next scheduled run)", file=sys.stderr)
                except Exception as timer_err:
                    print(f"Warning: Failed to update systemd timer interval: {timer_err}", file=sys.stderr)
                    # Don't fail the request if timer update fails - config was still saved

            return jsonify({
                "success": True,
                "message": "Configuration updated successfully",
                "config": config['automated_migrations']
            })

        except Exception as e:
            print(f"Error updating automigrate config: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "error": str(e)}), 500


@automation_bp.route("/api/automigrate/toggle-timer", methods=["POST"])
@api_route
def automigrate_toggle_timer():
    """Toggle the automated migration timer on/off"""
    try:
        import subprocess

        data = request.get_json()
        active = data.get('active', False)

        systemctl_cmd = "/usr/bin/systemctl"
        timer_name = "proxmox-balance-automigrate.timer"

        if active:
            # Start the timer
            result = subprocess.run(
                [systemctl_cmd, 'start', timer_name],
                capture_output=True, text=True, timeout=5
            )
        else:
            # Stop the timer
            result = subprocess.run(
                [systemctl_cmd, 'stop', timer_name],
                capture_output=True, text=True, timeout=5
            )

        if result.returncode == 0:
            # Verify the status
            verify_result = subprocess.run(
                [systemctl_cmd, 'is-active', timer_name],
                capture_output=True, text=True, timeout=5
            )
            timer_active = verify_result.stdout.strip() == 'active'

            return jsonify({
                "success": True,
                "timer_active": timer_active,
                "message": f"Timer {'started' if active else 'stopped'} successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to {'start' if active else 'stop'} timer: {result.stderr}"
            }), 500

    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "error": "Timeout toggling timer"}), 500
    except Exception as e:
        print(f"Error toggling automigrate timer: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@automation_bp.route("/api/automigrate/logs", methods=["GET"])
@api_route
def automigrate_logs():
    """Get logs from the automated migration service"""
    try:
        import subprocess

        # Get number of lines to fetch (default 100, max 1000)
        lines = request.args.get('lines', 100, type=int)
        lines = min(lines, 1000)  # Cap at 1000 lines

        # Fetch logs from journalctl for the automigrate service
        result = subprocess.run(
            ['/bin/journalctl', '-u', 'proxmox-balance-automigrate.service', '-n', str(lines), '--no-pager'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            logs = result.stdout
            return jsonify({
                "success": True,
                "logs": logs,
                "lines": len(logs.split('\n'))
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to fetch logs: {result.stderr}"
            }), 500

    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "error": "Timeout fetching logs"}), 500
    except Exception as e:
        print(f"Error fetching automigrate logs: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
