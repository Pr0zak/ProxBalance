#!/usr/bin/env python3
"""
Proxmox Balance Manager - Flask API (with caching)
Reads from cache file for fast responses
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os
import sys
import shutil
from datetime import datetime
from typing import Dict, List
from ai_provider import AIProviderFactory

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Determine paths based on environment
if os.path.exists('/opt/proxmox-balance-manager'):
    # Production environment
    BASE_PATH = '/opt/proxmox-balance-manager'
    GIT_REPO_PATH = '/opt/proxmox-balance-manager'
else:
    # Docker dev environment
    BASE_PATH = '/app/cache'
    GIT_REPO_PATH = '/app'

CACHE_FILE = os.path.join(BASE_PATH, 'cluster_cache.json')
CONFIG_FILE = os.path.join(BASE_PATH, 'config.json')
GIT_CMD = '/usr/bin/git'

@app.route('/')
def index():
    """Serve the main index.html page"""
    return app.send_static_file('index.html')

def load_config():
    """Load configuration from config.json"""
    if not os.path.exists(CONFIG_FILE):
        return {
            "error": True,
            "message": f"Configuration file not found: {CONFIG_FILE}"
        }
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        return {
            "error": True,
            "message": f"Invalid JSON in configuration file: {e}"
        }
    except Exception as e:
        return {
            "error": True,
            "message": f"Error reading configuration file: {e}"
        }
    
    if not config.get('proxmox_host'):
        return {
            "error": True,
            "message": "Missing 'proxmox_host' in configuration file"
        }
    
    if config.get('proxmox_host') == "CHANGE_ME":
        return {
            "error": True,
            "message": "Configuration not completed: proxmox_host is set to 'CHANGE_ME'"
        }
    
    return config

def read_cache() -> Dict:
    """Read cluster data from cache file"""
    try:
        if not os.path.exists(CACHE_FILE):
            return None
        
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading cache: {str(e)}")
        return None

def get_version_info():
    """Get current version and branch information"""
    try:
        # Get current commit hash
        result = subprocess.run(
            [GIT_CMD, '-C', GIT_REPO_PATH, 'rev-parse', 'HEAD'],
            capture_output=True, text=True, timeout=5
        )
        current_commit = result.stdout.strip() if result.returncode == 0 else "unknown"

        # Get current branch
        result = subprocess.run(
            [GIT_CMD, '-C', GIT_REPO_PATH, 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True, text=True, timeout=5
        )
        current_branch = result.stdout.strip() if result.returncode == 0 else "unknown"

        # Get latest tag
        result = subprocess.run(
            [GIT_CMD, '-C', GIT_REPO_PATH, 'describe', '--tags', '--abbrev=0'],
            capture_output=True, text=True, timeout=5
        )
        latest_tag = result.stdout.strip() if result.returncode == 0 else None

        # Get git describe (tag-commits-hash format)
        result = subprocess.run(
            [GIT_CMD, '-C', GIT_REPO_PATH, 'describe', '--tags', '--always'],
            capture_output=True, text=True, timeout=5
        )
        git_describe = result.stdout.strip() if result.returncode == 0 else "unknown"

        # Get last commit date
        result = subprocess.run(
            [GIT_CMD, '-C', GIT_REPO_PATH, 'log', '-1', '--format=%cd', '--date=short'],
            capture_output=True, text=True, timeout=5
        )
        last_commit_date = result.stdout.strip() if result.returncode == 0 else "unknown"

        # Determine if on a release version (tag matches HEAD)
        on_release = False
        if latest_tag:
            result = subprocess.run(
                [GIT_CMD, '-C', GIT_REPO_PATH, 'rev-parse', latest_tag],
                capture_output=True, text=True, timeout=5
            )
            tag_commit = result.stdout.strip() if result.returncode == 0 else None
            on_release = (tag_commit == current_commit)

        return {
            "version": git_describe,
            "commit": current_commit[:8],
            "branch": current_branch,
            "latest_tag": latest_tag,
            "on_release": on_release,
            "last_commit_date": last_commit_date
        }
    except Exception as e:
        print(f"Error getting version info: {str(e)}")
        return {
            "version": "unknown",
            "commit": "unknown",
            "branch": "unknown",
            "latest_tag": None,
            "on_release": False
        }

def check_for_updates():
    """Check if updates are available based on release/branch status"""
    try:
        version_info = get_version_info()

        # Fetch latest from remote
        subprocess.run(
            [GIT_CMD, '-C', GIT_REPO_PATH, 'fetch', '--tags', 'origin'],
            capture_output=True, timeout=10
        )

        if version_info['on_release']:
            # On a release version - check for newer releases only
            result = subprocess.run(
                [GIT_CMD, '-C', GIT_REPO_PATH, 'tag', '-l', '--sort=-v:refname'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                tags = [t.strip() for t in result.stdout.strip().split('\n') if t.strip()]
                if tags and version_info['latest_tag']:
                    newest_tag = tags[0]
                    update_available = (newest_tag != version_info['latest_tag'])
                    return {
                        "update_available": update_available,
                        "current_version": version_info['latest_tag'],
                        "latest_version": newest_tag,
                        "update_type": "release",
                        "branch": None
                    }
        else:
            # On a feature branch - check for newer commits on same branch
            current_branch = version_info['branch']
            if current_branch and current_branch != 'HEAD':
                # Get local HEAD commit
                local_commit = version_info['commit']

                # Get remote HEAD commit for this branch
                result = subprocess.run(
                    [GIT_CMD, '-C', GIT_REPO_PATH, 'rev-parse', f'origin/{current_branch}'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    remote_commit = result.stdout.strip()[:8]
                    update_available = (remote_commit != local_commit)

                    # Get number of commits behind
                    result = subprocess.run(
                        [GIT_CMD, '-C', GIT_REPO_PATH, 'rev-list', '--count', f'HEAD..origin/{current_branch}'],
                        capture_output=True, text=True, timeout=5
                    )
                    commits_behind = int(result.stdout.strip()) if result.returncode == 0 else 0

                    # Get changelog (commit messages)
                    changelog = []
                    if update_available:
                        result = subprocess.run(
                            [GIT_CMD, '-C', GIT_REPO_PATH, 'log', '--oneline', '--no-decorate',
                             f'HEAD..origin/{current_branch}'],
                            capture_output=True, text=True, timeout=5
                        )
                        if result.returncode == 0:
                            for line in result.stdout.strip().split('\n'):
                                if line:
                                    parts = line.split(' ', 1)
                                    if len(parts) == 2:
                                        changelog.append({
                                            "commit": parts[0],
                                            "message": parts[1]
                                        })

                    return {
                        "update_available": update_available,
                        "current_version": f"{current_branch}@{local_commit}",
                        "latest_version": f"{current_branch}@{remote_commit}",
                        "update_type": "branch",
                        "branch": current_branch,
                        "commits_behind": commits_behind,
                        "changelog": changelog
                    }

        return {
            "update_available": False,
            "current_version": version_info['version'],
            "latest_version": version_info['version'],
            "update_type": "unknown",
            "branch": version_info['branch']
        }
    except Exception as e:
        print(f"Error checking for updates: {str(e)}")
        return {
            "error": str(e),
            "update_available": False
        }

def trigger_collection():
    """Trigger background collection process"""
    try:
        # Determine paths based on environment
        if os.path.exists('/opt/proxmox-balance-manager/collector_api.py'):
            # Production environment
            python_cmd = '/opt/proxmox-balance-manager/venv/bin/python3'
            collector_path = '/opt/proxmox-balance-manager/collector_api.py'
        else:
            # Docker dev environment
            python_cmd = 'python3'
            collector_path = '/app/collector_api.py'

        subprocess.Popen([
            python_cmd,
            collector_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f"Error triggering collection: {str(e)}")
        return False


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    cache_data = read_cache()
    config = load_config()
    version_info = get_version_info()

    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_available": cache_data is not None,
        "cache_age": cache_data.get('collected_at') if cache_data else None,
        "version": version_info
    }

    if config.get('error'):
        health_status["status"] = "configuration_error"
        health_status["config_error"] = config.get('message')
        return jsonify(health_status), 500

    return jsonify(health_status)


@app.route("/api/analyze", methods=["GET"])
def analyze_cluster():
    """Return cached cluster data"""
    try:
        # Check configuration first
        config = load_config()
        if config.get('error'):
            return jsonify({
                "success": False,
                "error": f"Configuration Error: {config.get('message')}\n\n"
                        f"Please edit {CONFIG_FILE} and set the proxmox_host value."
            }), 500
        
        data = read_cache()
        
        if data is None:
            trigger_collection()
            return jsonify({
                "success": False, 
                "error": "No cached data available. Collection in progress, please wait 30-60 seconds and refresh."
            }), 503
        
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/refresh", methods=["POST"])
def refresh_data():
    """Trigger immediate data collection"""
    try:
        # Check configuration first
        config = load_config()
        if config.get('error'):
            return jsonify({
                "success": False,
                "error": f"Configuration Error: {config.get('message')}"
            }), 500
        
        trigger_collection()
        return jsonify({
            "success": True,
            "message": "Data collection triggered. Results will be available in 30-60 seconds."
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/recommendations", methods=["POST"])
def get_recommendations():
    """Generate recommendations from cached data"""
    try:
        data = request.json or {}
        cpu_threshold = float(data.get("cpu_threshold", 60.0))
        mem_threshold = float(data.get("mem_threshold", 70.0))
        
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503
        
        try:
            recommendations = generate_recommendations(
                cache_data.get('nodes', {}),
                cache_data.get('guests', {}),
                cpu_threshold,
                mem_threshold
            )
        except Exception as e:
            print(f"Error in generate_recommendations: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "error": f"Recommendation error: {str(e)}"}), 500
        
        return jsonify({
            "success": True,
            "recommendations": recommendations,
            "count": len(recommendations)
        })
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def generate_recommendations(nodes: Dict, guests: Dict, cpu_threshold: float, mem_threshold: float) -> List[Dict]:
    """Generate migration recommendations"""
    recommendations = []
    # Track guests that will be on each node after pending migrations
    pending_target_guests = {}

    overloaded = []
    for node_name, node in nodes.items():
        try:
            # Support both old format (with metrics object) and new format (direct fields)
            metrics = node.get("metrics", {})

            # Get CPU - try multiple formats
            if metrics and metrics.get("has_historical"):
                cpu_check = metrics.get("avg_cpu", 0)
            elif metrics and "current_cpu" in metrics:
                cpu_check = metrics.get("current_cpu", 0)
            else:
                # New format: direct cpu_percent field
                cpu_check = node.get("cpu_percent", 0)

            # Get Memory - try multiple formats
            if metrics and metrics.get("has_historical"):
                mem_check = metrics.get("avg_mem", 0)
            elif metrics and "current_mem" in metrics:
                mem_check = metrics.get("current_mem", 0)
            else:
                # New format: direct mem_percent field
                mem_check = node.get("mem_percent", 0)

            if cpu_check > cpu_threshold or mem_check > mem_threshold:
                overloaded.append({
                    "node": node_name,
                    "cpu": cpu_check,
                    "mem": mem_check,
                    "reason": "cpu" if cpu_check > cpu_threshold else "mem"
                })
        except Exception as e:
            print(f"Error processing node {node_name}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            continue
    
    for overload in overloaded:
        src_node = overload["node"]
        
        best_target = None
        best_score = 999999
        
        for tgt_name, tgt_node in nodes.items():
            try:
                if tgt_name == src_node or tgt_node.get("status") != "online":
                    continue

                # Support both old format (with metrics object) and new format (direct fields)
                tgt_metrics = tgt_node.get("metrics", {})

                # Get CPU - try multiple formats
                if tgt_metrics and tgt_metrics.get("has_historical"):
                    tgt_cpu = tgt_metrics.get("avg_cpu", 0)
                elif tgt_metrics and "current_cpu" in tgt_metrics:
                    tgt_cpu = tgt_metrics.get("current_cpu", 0)
                else:
                    # New format: direct cpu_percent field
                    tgt_cpu = tgt_node.get("cpu_percent", 0)

                # Get Memory - try multiple formats
                if tgt_metrics and tgt_metrics.get("has_historical"):
                    tgt_mem = tgt_metrics.get("avg_mem", 0)
                elif tgt_metrics and "current_mem" in tgt_metrics:
                    tgt_mem = tgt_metrics.get("current_mem", 0)
                else:
                    # New format: direct mem_percent field
                    tgt_mem = tgt_node.get("mem_percent", 0)

                score = tgt_cpu + tgt_mem

                if score < best_score and tgt_cpu < 50 and tgt_mem < 60:
                    best_score = score
                    best_target = tgt_name
            except Exception as e:
                print(f"Error evaluating target node {tgt_name}: {str(e)}", file=sys.stderr)
                import traceback
                traceback.print_exc()
                continue
        
        if best_target:
            candidates = []
            for vmid in nodes[src_node].get("guests", []):
                try:
                    vmid_key = str(vmid) if str(vmid) in guests else vmid
                    
                    if vmid_key not in guests:
                        print(f"Warning: Guest {vmid} not found in guests dict", file=sys.stderr)
                        continue
                    
                    guest = guests[vmid_key]
                    # Skip ignored guests only
                    if guest.get("status") == "running" and not guest.get("tags", {}).get("has_ignore", False):
                        candidates.append((vmid_key, guest.get("mem_max_gb", 0)))
                except Exception as e:
                    print(f"Error processing guest {vmid}: {str(e)}", file=sys.stderr)
                    import traceback
                    traceback.print_exc()
                    continue
            
            candidates.sort(key=lambda x: x[1])
            
            for vmid_key, _ in candidates[:3]:
                try:
                    guest = guests[vmid_key]

                    conflict = False
                    if guest.get("tags", {}).get("exclude_groups", []):
                        # Check for conflicts with existing guests on target node
                        for other_vmid in nodes[best_target].get("guests", []):
                            other_key = str(other_vmid) if str(other_vmid) in guests else other_vmid
                            if other_key not in guests:
                                continue
                            other = guests[other_key]
                            for excl_group in guest["tags"]["exclude_groups"]:
                                if excl_group in other.get("tags", {}).get("all_tags", []):
                                    conflict = True
                                    break
                            if conflict:
                                break

                        # Check for conflicts with pending migrations to the same target
                        if not conflict and best_target in pending_target_guests:
                            for pending_guest in pending_target_guests[best_target]:
                                for excl_group in guest["tags"]["exclude_groups"]:
                                    if excl_group in pending_guest.get("tags", {}).get("all_tags", []):
                                        conflict = True
                                        break
                                if conflict:
                                    break

                    if not conflict:
                        cmd_type = "qm" if guest.get("type") == "VM" else "pct"
                        cmd_flag = "--online" if guest.get("type") == "VM" else "--restart"
                        vmid_int = int(vmid_key) if isinstance(vmid_key, str) else vmid_key
                        recommendations.append({
                            "vmid": vmid_int,
                            "name": guest.get("name", "unknown"),
                            "type": guest.get("type", "unknown"),
                            "source_node": src_node,
                            "target_node": best_target,
                            "reason": "Balance {} load".format(overload["reason"].upper()),
                            "mem_gb": guest.get("mem_max_gb", 0),
                            "command": "{} migrate {} {} {}".format(cmd_type, vmid_int, best_target, cmd_flag)
                        })

                        # Track this guest as pending migration to target node
                        if best_target not in pending_target_guests:
                            pending_target_guests[best_target] = []
                        pending_target_guests[best_target].append(guest)
                except Exception as e:
                    print(f"Error creating recommendation for guest {vmid_key}: {str(e)}", file=sys.stderr)
                    import traceback
                    traceback.print_exc()
                    continue
    
    return recommendations


@app.route("/api/migrate", methods=["POST"])
def execute_migration():
    """Execute a migration using Proxmox API"""
    try:
        data = request.json
        vmid = data.get("vmid")
        target = data.get("target_node")
        source = data.get("source_node")
        guest_type = data.get("type", "VM")

        if not vmid or not target:
            return jsonify({"success": False, "error": "Missing vmid or target_node"}), 400

        if not source:
            return jsonify({"success": False, "error": "Missing source_node"}), 400

        config = load_config()

        # Require API token authentication
        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured. Please configure Proxmox API token in settings."
            }), 500

        user, token_name = token_id.split('!', 1)
        proxmox = ProxmoxAPI(
            proxmox_host,
            user=user,
            token_name=token_name,
            token_value=token_secret,
            port=proxmox_port,
            verify_ssl=verify_ssl
        )

        # Execute migration via API
        if guest_type == "VM":
            result = proxmox.nodes(source).qemu(vmid).migrate.post(
                target=target,
                online=1
            )
        else:  # CT
            result = proxmox.nodes(source).lxc(vmid).migrate.post(
                target=target,
                restart=1
            )

        trigger_collection()

        return jsonify({
            "success": True,
            "message": f"Migration of {guest_type} {vmid} from {source} to {target} started. Task ID: {result}",
            "task_id": result
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/migrate/batch", methods=["POST"])
def execute_batch_migration():
    """Execute multiple migrations via Proxmox API"""
    try:
        data = request.json
        migrations = data.get("migrations", [])

        if not migrations:
            return jsonify({"success": False, "error": "No migrations provided"}), 400

        print(f"Starting batch migration of {len(migrations)} guests via API", file=sys.stderr)

        config = load_config()
        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured. Please configure Proxmox API token in settings."
            }), 500

        user, token_name = token_id.split('!', 1)
        proxmox = ProxmoxAPI(
            proxmox_host,
            user=user,
            token_name=token_name,
            token_value=token_secret,
            port=proxmox_port,
            verify_ssl=verify_ssl
        )

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
                print(f"  ✓ Migration of {vmid} started. Task ID: {task_id}", file=sys.stderr)

            except Exception as e:
                results.append({
                    "vmid": vmid,
                    "success": False,
                    "error": str(e)
                })
                print(f"  ✗ Failed to start migration of {vmid}: {str(e)}", file=sys.stderr)

        # Trigger collection after batch completes
        trigger_collection()

        succeeded = sum(1 for r in results if r["success"])
        print(f"Batch migration initiated: {succeeded}/{len(migrations)} started", file=sys.stderr)

        return jsonify({
            "success": True,
            "results": results,
            "total": len(migrations),
            "succeeded": succeeded,
            "message": f"{succeeded} migration(s) started. Check Proxmox task logs for progress. Data will refresh automatically."
        })

    except Exception as e:
        print(f"Batch migration error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/permissions", methods=["GET"])
def check_permissions():
    """Check API token permissions - test if migrations are available"""
    try:
        config = load_config()

        if config.get('error'):
            return jsonify({
                "success": False,
                "can_migrate": False,
                "error": config.get('message')
            }), 200  # Return 200 so UI can handle gracefully

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')

        if not token_id or not token_secret:
            return jsonify({
                "success": True,
                "can_migrate": False,
                "reason": "API token not configured"
            })

        # Try to check permissions by querying Proxmox API
        # We'll check if the token has VM.Migrate capability
        try:
            from proxmoxer import ProxmoxAPI

            proxmox_host = config.get('proxmox_host', 'localhost')
            proxmox_port = config.get('proxmox_port', 8006)
            verify_ssl = config.get('proxmox_verify_ssl', False)

            user, token_name = token_id.split('!', 1)
            proxmox = ProxmoxAPI(
                proxmox_host,
                user=user,
                token_name=token_name,
                token_value=token_secret,
                port=proxmox_port,
                verify_ssl=verify_ssl
            )

            # Check cluster status to verify connection
            proxmox.cluster.status.get()

            # Check ACL permissions to determine if we have migration capability
            # We need to check if the token has PVEVMAdmin or any role with VM.Migrate
            try:
                # Get all cluster resources to find a VM we can test permissions on
                resources = proxmox.cluster.resources.get(type='vm')

                # Try to get permissions endpoint - this will show what we can do
                # If we can access this and find VMs, we likely have at least audit
                if resources:
                    # Try to access the first VM's config - if we get permissions error, we know we're read-only
                    first_vm = resources[0]
                    node = first_vm['node']
                    vmid = first_vm['vmid']

                    # Try to get the VM status with migrate check
                    # This won't actually migrate, just check if we have the permission
                    try:
                        # Attempt to get migration preconditions - this requires VM.Migrate permission
                        proxmox.nodes(node).qemu(vmid).migrate.get()
                        # If we got here, we have migration permissions
                        return jsonify({
                            "success": True,
                            "can_migrate": True,
                            "reason": "Full permissions (PVEVMAdmin) - can perform migrations"
                        })
                    except Exception as migrate_error:
                        # Check if it's a permission error
                        if '403' in str(migrate_error) or 'permission' in str(migrate_error).lower():
                            return jsonify({
                                "success": True,
                                "can_migrate": False,
                                "reason": "Read-only permissions (PVEAuditor) - cannot perform migrations"
                            })
                        else:
                            # Some other error, but assume we might have permissions
                            return jsonify({
                                "success": True,
                                "can_migrate": True,
                                "reason": "Unable to verify migration permissions (assuming full access)"
                            })
                else:
                    # No VMs to test with, assume read-only is safe
                    return jsonify({
                        "success": True,
                        "can_migrate": False,
                        "reason": "No VMs found to test permissions"
                    })
            except Exception as perm_check_error:
                # Couldn't check permissions, default to read-only for safety
                return jsonify({
                    "success": True,
                    "can_migrate": False,
                    "reason": f"Permission check failed, assuming read-only: {str(perm_check_error)}"
                })

        except Exception as e:
            error_str = str(e).lower()
            if 'permission' in error_str or 'denied' in error_str:
                return jsonify({
                    "success": True,
                    "can_migrate": False,
                    "reason": "Read-only permissions (PVEAuditor)"
                })
            else:
                return jsonify({
                    "success": True,
                    "can_migrate": False,
                    "reason": f"API connection error: {str(e)}"
                })

    except Exception as e:
        return jsonify({
            "success": False,
            "can_migrate": False,
            "error": str(e)
        }), 500


@app.route("/api/config", methods=["GET"])
def get_config():
    """Get current configuration"""
    try:
        config = load_config()

        if config.get('error'):
            return jsonify({
                "success": False,
                "error": config.get('message')
            }), 500

        return jsonify({"success": True, "config": config})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/config", methods=["POST"])
def update_config():
    """Update configuration"""
    try:
        import subprocess as sp

        data = request.json

        config = load_config()
        if config.get('error'):
            return jsonify({
                "success": False,
                "error": config.get('message')
            }), 500

        # Update basic settings
        if "collection_interval_minutes" in data:
            config["collection_interval_minutes"] = int(data["collection_interval_minutes"])
        if "ui_refresh_interval_minutes" in data:
            config["ui_refresh_interval_minutes"] = int(data["ui_refresh_interval_minutes"])
        if "proxmox_host" in data:
            config["proxmox_host"] = str(data["proxmox_host"])

        # Update Proxmox API credentials
        if "proxmox_auth_method" in data:
            config["proxmox_auth_method"] = str(data["proxmox_auth_method"])
        if "proxmox_api_token_id" in data:
            config["proxmox_api_token_id"] = str(data["proxmox_api_token_id"])
        if "proxmox_api_token_secret" in data:
            config["proxmox_api_token_secret"] = str(data["proxmox_api_token_secret"])

        # Update AI settings
        if "ai_provider" in data:
            config["ai_provider"] = str(data["ai_provider"])
        if "ai_recommendations_enabled" in data:
            config["ai_recommendations_enabled"] = bool(data["ai_recommendations_enabled"])

        # Update AI config for specific provider
        if "ai_config" in data:
            if "ai_config" not in config:
                config["ai_config"] = {}

            ai_data = data["ai_config"]

            # Update OpenAI config
            if "openai" in ai_data:
                if "openai" not in config["ai_config"]:
                    config["ai_config"]["openai"] = {}
                config["ai_config"]["openai"].update(ai_data["openai"])

            # Update Anthropic config
            if "anthropic" in ai_data:
                if "anthropic" not in config["ai_config"]:
                    config["ai_config"]["anthropic"] = {}
                config["ai_config"]["anthropic"].update(ai_data["anthropic"])

            # Update Local LLM config
            if "local" in ai_data:
                if "local" not in config["ai_config"]:
                    config["ai_config"]["local"] = {}
                config["ai_config"]["local"].update(ai_data["local"])

        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)

        # Restart collector if API credentials changed
        if any(key in data for key in ["proxmox_auth_method", "proxmox_api_token_id", "proxmox_api_token_secret"]):
            systemctl_cmd = "/usr/bin/systemctl"
            if os.path.exists(systemctl_cmd) and os.path.exists("/etc/systemd/system/proxmox-collector.service"):
                try:
                    sp.run([systemctl_cmd, "restart", "proxmox-collector.timer"],
                          capture_output=True, text=True, timeout=5)
                except Exception as e:
                    print(f"Warning: Could not restart collector timer: {e}")

        if "collection_interval_minutes" in data:
            update_script = "/opt/proxmox-balance-manager/update_timer.py"
            # Use venv python if available, otherwise use system python
            python_cmd = "/opt/proxmox-balance-manager/venv/bin/python3" if os.path.exists("/opt/proxmox-balance-manager/venv/bin/python3") else "python3"

            # Only run update_timer.py if it exists (not needed in Docker dev environment)
            if os.path.exists(update_script):
                result = sp.run([python_cmd, update_script],
                              capture_output=True, text=True)
                if result.returncode != 0:
                    return jsonify({
                        "success": False,
                        "error": f"Failed to update timer: {result.stderr}"
                    }), 500

        return jsonify({
            "success": True,
            "message": "Configuration updated successfully",
            "config": config
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/ai-models", methods=["POST"])
def get_ai_models():
    """Fetch available models from AI provider"""
    try:
        data = request.json
        provider = data.get('provider')

        if not provider:
            return jsonify({
                "success": False,
                "error": "Provider not specified"
            }), 400

        config = load_config()
        if config.get('error'):
            return jsonify({
                "success": False,
                "error": config.get('message')
            }), 500

        models = []

        if provider == 'openai':
            # Fetch OpenAI models
            api_key = data.get('api_key') or config.get('ai_config', {}).get('openai', {}).get('api_key', '')
            base_url = data.get('base_url') or config.get('ai_config', {}).get('openai', {}).get('base_url', 'https://api.openai.com/v1')

            if not api_key:
                return jsonify({
                    "success": False,
                    "error": "API key required"
                }), 400

            try:
                import requests
                response = requests.get(
                    f"{base_url}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10
                )

                if response.status_code == 200:
                    data = response.json()
                    # Filter for GPT models
                    models = [m['id'] for m in data.get('data', []) if 'gpt' in m['id'].lower()]
                    models.sort(reverse=True)  # Newest first
                else:
                    return jsonify({
                        "success": False,
                        "error": f"Failed to fetch models: {response.status_code}"
                    }), 500
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to connect to OpenAI: {str(e)}"
                }), 500

        elif provider == 'anthropic':
            # Anthropic doesn't provide a public models endpoint
            # Return static list of current models
            models = [
                "claude-sonnet-4-5-20250929",
                "claude-haiku-4-5-20251001",
                "claude-3-7-sonnet-20250219",
                "claude-3-5-haiku-20241022"
            ]

        elif provider == 'local':
            # Fetch Ollama models
            base_url = data.get('base_url') or config.get('ai_config', {}).get('local', {}).get('base_url', 'http://localhost:11434')

            try:
                import requests
                response = requests.get(
                    f"{base_url}/api/tags",
                    timeout=10
                )

                if response.status_code == 200:
                    data = response.json()
                    models = [m['name'] for m in data.get('models', [])]
                else:
                    return jsonify({
                        "success": False,
                        "error": f"Failed to fetch models: {response.status_code}"
                    }), 500
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to connect to Ollama: {str(e)}"
                }), 500
        else:
            return jsonify({
                "success": False,
                "error": "Invalid provider"
            }), 400

        return jsonify({
            "success": True,
            "models": models
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/ai-recommendations", methods=["POST"])
def get_ai_recommendations():
    """Get AI-enhanced migration recommendations"""
    try:
        config = load_config()
        if config.get('error'):
            return jsonify({
                "success": False,
                "error": config.get('message')
            }), 500

        # Check if AI recommendations are enabled
        if not config.get('ai_recommendations_enabled', False):
            return jsonify({
                "success": False,
                "error": "AI recommendations are not enabled"
            }), 400

        # Load cluster cache
        if not os.path.exists(CACHE_FILE):
            return jsonify({
                "success": False,
                "error": "No cached data available"
            }), 503

        with open(CACHE_FILE, 'r') as f:
            cache_data = json.load(f)

        # Create AI provider
        try:
            ai_provider = AIProviderFactory.create_provider(config)
            if ai_provider is None:
                return jsonify({
                    "success": False,
                    "error": "AI provider not configured"
                }), 400
        except ValueError as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 400

        # Get analysis period from request
        request_data = request.json if request.json else {}
        analysis_period = request_data.get("analysis_period", "24h")

        # Prepare metrics for AI analysis
        metrics = {
            "timestamp": cache_data.get("collected_at"),
            "summary": cache_data.get("summary", {}),
            "nodes": cache_data.get("nodes", {}),
            "guests": cache_data.get("guests", {}),
            "thresholds": request_data,
            "analysis_period": analysis_period,
            "period_description": {
                "1h": "last hour",
                "6h": "last 6 hours",
                "24h": "last 24 hours",
                "7d": "last 7 days",
                "30d": "last 30 days"
            }.get(analysis_period, "last 24 hours")
        }

        # Get AI recommendations
        recommendations = ai_provider.get_recommendations(metrics)

        # Enrich AI recommendations with actual guest names and validate nodes
        if recommendations.get("success") and recommendations.get("recommendations"):
            guests_dict = cache_data.get("guests", {})
            nodes_dict = cache_data.get("nodes", {})
            valid_nodes = list(nodes_dict.keys())

            # Filter out invalid recommendations
            valid_recommendations = []

            for rec in recommendations["recommendations"]:
                vmid = str(rec.get("vmid", ""))

                # Enrich with actual guest data
                if vmid in guests_dict:
                    guest = guests_dict[vmid]
                    rec["name"] = guest.get("name", f"VM-{vmid}")
                    rec["type"] = guest.get("type", "VM")
                    rec["source_node"] = guest.get("node", rec.get("source_node", "unknown"))
                else:
                    # Skip recommendations for non-existent guests
                    continue

                # Validate and fix target_node
                target_node = rec.get("target_node")
                source_node = rec.get("source_node")

                # Skip if source and target are the same (no migration needed)
                if source_node == target_node:
                    continue

                if target_node not in valid_nodes:
                    # Find best alternative target node (not the source node)
                    available_targets = [n for n in valid_nodes if n != source_node]
                    if available_targets:
                        # Choose node with lowest load
                        best_node = min(available_targets,
                                      key=lambda n: nodes_dict[n]["metrics"]["current_cpu"] +
                                                   nodes_dict[n]["metrics"]["current_mem"])
                        old_target = target_node
                        rec["target_node"] = best_node
                        # Replace all mentions of the invalid node in reasoning
                        reasoning = rec.get("reasoning", "")
                        reasoning = reasoning.replace(old_target, best_node)
                        rec["reasoning"] = reasoning
                    else:
                        # No valid target, skip this recommendation
                        continue

                valid_recommendations.append(rec)

            recommendations["recommendations"] = valid_recommendations

            # Validate and fix predicted issues
            if "predicted_issues" in recommendations:
                valid_issues = []
                for issue in recommendations["predicted_issues"]:
                    node = issue.get("node")
                    confidence = issue.get("confidence", 0)

                    # Skip invalid nodes or NaN confidence
                    if node not in valid_nodes:
                        continue
                    if not isinstance(confidence, (int, float)) or confidence != confidence:  # Check for NaN
                        continue

                    valid_issues.append(issue)

                recommendations["predicted_issues"] = valid_issues

        return jsonify(recommendations)

    except Exception as e:
        print(f"AI recommendation error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/system/info", methods=["GET"])
def system_info():
    """Get system information including version and update status"""
    try:
        version_info = get_version_info()
        update_info = check_for_updates()

        # Combine version and update information
        system_data = {
            "success": True,
            "version": version_info['version'],
            "commit": version_info['commit'],
            "branch": version_info['branch'],
            "latest_tag": version_info['latest_tag'],
            "on_release": version_info['on_release'],
            "last_commit_date": version_info['last_commit_date'],
            "updates_available": update_info.get('update_available', False),
            "update_type": update_info.get('update_type'),
            "current_version": update_info.get('current_version'),
            "latest_version": update_info.get('latest_version'),
            "commits_behind": update_info.get('commits_behind', 0),
            "changelog": update_info.get('changelog', [])
        }

        return jsonify(system_data)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/system/check-update", methods=["GET"])
def check_update():
    """Check if updates are available"""
    try:
        update_info = check_for_updates()
        return jsonify(update_info)
    except Exception as e:
        return jsonify({
            "error": str(e),
            "update_available": False
        }), 500

@app.route("/api/system/update", methods=["POST"])
def update_system():
    """Update ProxBalance to latest version (release or branch commit)"""
    try:
        version_info = get_version_info()
        update_log = []

        # Fetch latest changes
        update_log.append("Fetching latest changes from GitHub...")
        result = subprocess.run(
            [GIT_CMD, "fetch", "--tags", "origin"],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            raise Exception(f"Git fetch failed: {result.stderr}")

        # Determine update strategy based on release/branch
        if version_info['on_release']:
            # ON A RELEASE - update to newest release tag
            update_log.append("On release version - checking for newer releases...")

            result = subprocess.run(
                [GIT_CMD, "tag", "-l", "--sort=-v:refname"],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise Exception("Failed to list tags")

            tags = [t.strip() for t in result.stdout.strip().split('\n') if t.strip()]
            if not tags:
                return jsonify({
                    "success": True,
                    "message": "No release tags found",
                    "log": update_log,
                    "updated": False
                })

            newest_tag = tags[0]
            current_tag = version_info['latest_tag']

            if newest_tag == current_tag:
                update_log.append(f"Already on latest release: {current_tag}")
                return jsonify({
                    "success": True,
                    "message": f"Already up to date ({current_tag})",
                    "log": update_log,
                    "updated": False
                })

            update_log.append(f"Updating from {current_tag} to {newest_tag}...")

            # Checkout the new release tag
            result = subprocess.run(
                [GIT_CMD, "checkout", newest_tag],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise Exception(f"Failed to checkout {newest_tag}: {result.stderr}")

            update_log.append(f"✓ Checked out release {newest_tag}")

        else:
            # ON A FEATURE BRANCH - update to latest commit on same branch
            current_branch = version_info['branch']
            if not current_branch or current_branch == 'HEAD':
                raise Exception("Not on a named branch, cannot update")

            update_log.append(f"On branch '{current_branch}' - checking for new commits...")

            # Check if there are changes to pull
            result = subprocess.run(
                [GIT_CMD, "rev-list", "--count", f"HEAD..origin/{current_branch}"],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )
            commits_to_pull = int(result.stdout.strip()) if result.returncode == 0 else 0

            if commits_to_pull == 0:
                update_log.append(f"Already up to date on branch {current_branch}")
                return jsonify({
                    "success": True,
                    "message": "Already up to date",
                    "log": update_log,
                    "updated": False
                })

            update_log.append(f"Pulling {commits_to_pull} new commit(s) from branch: {current_branch}")

            # Stash any local changes before pulling
            result = subprocess.run(
                [GIT_CMD, "stash"],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )
            if result.returncode == 0 and "No local changes to save" not in result.stdout:
                update_log.append("Stashed local changes")

            # Pull changes with fast-forward only first
            result = subprocess.run(
                [GIT_CMD, "pull", "--ff-only", "origin", current_branch],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )

            # If fast-forward fails (divergent branches), reset to remote
            if result.returncode != 0:
                if "divergent branches" in result.stderr or "Need to specify how to reconcile" in result.stderr or "Not possible to fast-forward" in result.stderr:
                    update_log.append("Detected divergent branches - resetting to remote...")

                    # Hard reset to match remote branch
                    result = subprocess.run(
                        [GIT_CMD, "reset", "--hard", f"origin/{current_branch}"],
                        cwd=GIT_REPO_PATH,
                        capture_output=True,
                        text=True
                    )
                    if result.returncode != 0:
                        raise Exception(f"Git reset failed: {result.stderr}")

                    update_log.append("✓ Reset to match remote branch")
                else:
                    raise Exception(f"Git pull failed: {result.stderr}")

            update_log.append(f"✓ Updated to latest commit on {current_branch}")

        # Common update steps for both releases and branches
        update_log.append("Code updated successfully")

        # Copy index.html to web root
        update_log.append("Updating web interface...")
        try:
            shutil.copy2("/opt/proxmox-balance-manager/index.html", "/var/www/html/index.html")
            update_log.append("✓ Web interface updated")
        except Exception as e:
            update_log.append(f"⚠ Failed to update web interface: {str(e)}")

        # Update Python dependencies
        update_log.append("Updating Python dependencies...")
        requirements_file = os.path.join(GIT_REPO_PATH, "requirements.txt")
        if os.path.exists(requirements_file):
            result = subprocess.run(
                ["/opt/proxmox-balance-manager/venv/bin/pip", "install", "-q", "--upgrade", "-r", requirements_file],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )
        else:
            result = subprocess.run(
                ["/opt/proxmox-balance-manager/venv/bin/pip", "install", "-q", "--upgrade",
                 "flask", "flask-cors", "gunicorn", "requests", "proxmoxer"],
                cwd=GIT_REPO_PATH,
                capture_output=True,
                text=True
            )
        if result.returncode == 0:
            update_log.append("✓ Dependencies updated")
        else:
            update_log.append(f"⚠ Dependency update had issues: {result.stderr}")

        # Restart services
        update_log.append("Restarting ProxBalance services...")

        systemctl_cmd = "/usr/bin/systemctl"
        restart_commands = [
            ([systemctl_cmd, "restart", "proxmox-balance"], "API service"),
            ([systemctl_cmd, "restart", "proxmox-collector.timer"], "Collector timer")
        ]

        for cmd, name in restart_commands:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                update_log.append(f"✓ Restarted {name}")
            else:
                error_msg = result.stderr.strip() if result.stderr else "unknown error"
                if "API service" in name:
                    # API service can't restart itself while handling the request
                    update_log.append(f"ℹ API service will restart automatically (reload page to see changes)")
                else:
                    update_log.append(f"⚠ Failed to restart {name}: {error_msg}")

        # Get new version info
        result = subprocess.run(
            [GIT_CMD, "rev-parse", "--short", "HEAD"],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True
        )
        new_commit = result.stdout.strip() if result.returncode == 0 else "unknown"

        update_log.append(f"Update complete! Now at commit: {new_commit}")

        return jsonify({
            "success": True,
            "message": "Update completed successfully",
            "log": update_log,
            "updated": True,
            "new_commit": new_commit
        })

    except Exception as e:
        print(f"Update error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "log": update_log if 'update_log' in locals() else []
        }), 500

@app.route("/api/system/branches", methods=["GET"])
def list_branches():
    """List all available git branches"""
    try:
        # Fetch latest branch info from remote and prune deleted branches
        subprocess.run(
            [GIT_CMD, "fetch", "--prune", "origin"],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            timeout=10
        )

        # Get current branch
        result = subprocess.run(
            [GIT_CMD, "-C", GIT_REPO_PATH, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5
        )
        current_branch = result.stdout.strip() if result.returncode == 0 else "unknown"

        # Get all remote branches
        result = subprocess.run(
            [GIT_CMD, "-C", GIT_REPO_PATH, "branch", "-r", "--format=%(refname:short)"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            raise Exception(f"Failed to list branches: {result.stderr}")

        branches = []
        for line in result.stdout.strip().split('\n'):
            if line and not line.endswith('/HEAD'):
                # Remove 'origin/' prefix
                branch_name = line.replace('origin/', '', 1)

                # Get last commit message for this branch
                commit_result = subprocess.run(
                    [GIT_CMD, "-C", GIT_REPO_PATH, "log", "-1", "--format=%s", f"origin/{branch_name}"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                last_commit = commit_result.stdout.strip() if commit_result.returncode == 0 else ""

                branches.append({
                    "name": branch_name,
                    "current": branch_name == current_branch,
                    "last_commit": last_commit
                })

        return jsonify({
            "success": True,
            "branches": branches
        })

    except Exception as e:
        print(f"Error listing branches: {str(e)}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/system/switch-branch", methods=["POST"])
def switch_branch():
    """Switch to a different git branch"""
    try:
        data = request.get_json()
        target_branch = data.get('branch')

        if not target_branch:
            return jsonify({
                "success": False,
                "error": "Branch name is required"
            }), 400

        update_log = []

        # Get current branch
        result = subprocess.run(
            [GIT_CMD, "-C", GIT_REPO_PATH, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5
        )
        current_branch = result.stdout.strip() if result.returncode == 0 else "unknown"

        if current_branch == target_branch:
            return jsonify({
                "success": False,
                "error": f"Already on branch {target_branch}"
            }), 400

        update_log.append(f"Switching from {current_branch} to {target_branch}...")

        # Fetch latest changes
        update_log.append("Fetching latest changes from GitHub...")
        result = subprocess.run(
            [GIT_CMD, "fetch", "origin"],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            raise Exception(f"Failed to fetch: {result.stderr}")

        # Stash any local changes
        result = subprocess.run(
            [GIT_CMD, "stash"],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and "No local changes to save" not in result.stdout:
            update_log.append("Stashed local changes")

        # Checkout the target branch
        update_log.append(f"Checking out branch {target_branch}...")
        result = subprocess.run(
            [GIT_CMD, "checkout", target_branch],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            raise Exception(f"Failed to checkout branch: {result.stderr}")

        # Pull latest changes for the new branch
        update_log.append(f"Pulling latest changes for {target_branch}...")
        result = subprocess.run(
            [GIT_CMD, "pull", "origin", target_branch],
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            raise Exception(f"Failed to pull: {result.stderr}")

        update_log.append(f"✓ Switched to branch {target_branch}")

        # Copy index.html to web root
        update_log.append("Updating web interface...")
        html_src = os.path.join(GIT_REPO_PATH, "index.html")
        html_dst = "/var/www/html/index.html"
        if os.path.exists(html_src):
            import shutil
            shutil.copy(html_src, html_dst)
            update_log.append("✓ Updated web interface")

        # Update Python dependencies if requirements changed
        update_log.append("Checking Python dependencies...")
        requirements_file = os.path.join(GIT_REPO_PATH, "requirements.txt")
        if os.path.exists(requirements_file):
            result = subprocess.run(
                ["/usr/bin/pip3", "install", "-q", "-r", requirements_file],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                update_log.append("✓ Dependencies updated")
            else:
                update_log.append(f"⚠ Warning: pip install had issues: {result.stderr}")

        # Restart services
        update_log.append("Restarting ProxBalance services...")
        systemctl_cmd = "/usr/bin/systemctl"
        restart_commands = [
            ([systemctl_cmd, "restart", "proxmox-balance"], "API service"),
            ([systemctl_cmd, "restart", "proxmox-collector.timer"], "Collector timer")
        ]

        for cmd, name in restart_commands:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                update_log.append(f"✓ Restarted {name}")
            else:
                if "API service" in name:
                    update_log.append(f"ℹ API service will restart automatically (reload page to see changes)")
                else:
                    update_log.append(f"⚠ Failed to restart {name}")

        update_log.append(f"✓ Branch switch complete! Now on {target_branch}")

        return jsonify({
            "success": True,
            "message": f"Successfully switched to branch {target_branch}",
            "log": update_log,
            "new_branch": target_branch
        })

    except Exception as e:
        print(f"Branch switch error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "log": update_log if 'update_log' in locals() else []
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)