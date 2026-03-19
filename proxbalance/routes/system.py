from flask import Blueprint, jsonify, request, send_file, current_app
import json, os, sys, subprocess
from datetime import datetime
from proxbalance.config_manager import load_config, save_config, get_proxmox_client, CONFIG_FILE, BASE_PATH
from proxbalance.error_handlers import api_route

system_bp = Blueprint("system", __name__)


@system_bp.route("/api/ai-models", methods=["POST"])
@api_route
def get_ai_models():
    """Fetch available models from AI provider"""
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


@system_bp.route("/api/ai-recommendations", methods=["POST"])
@api_route
def get_ai_recommendations():
    """Get AI-enhanced migration recommendations"""
    from ai_provider import AIProviderFactory

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
    from proxbalance.config_manager import CACHE_FILE
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

    # Get analysis period and maintenance nodes from request
    request_data = request.json if request.json else {}
    analysis_period = request_data.get("analysis_period", "24h")
    maintenance_nodes = set(request_data.get("maintenance_nodes", []))

    # Prepare metrics for AI analysis - exclude maintenance nodes
    all_nodes = cache_data.get("nodes", {})
    active_nodes = {k: v for k, v in all_nodes.items() if k not in maintenance_nodes}

    metrics = {
        "timestamp": cache_data.get("collected_at"),
        "summary": cache_data.get("summary", {}),
        "nodes": active_nodes,
        "guests": cache_data.get("guests", {}),
        "thresholds": request_data,
        "analysis_period": analysis_period,
        "period_description": {
            "1h": "last hour",
            "6h": "last 6 hours",
            "24h": "last 24 hours",
            "7d": "last 7 days",
            "30d": "last 30 days"
        }.get(analysis_period, "last 24 hours"),
        "maintenance_nodes": list(maintenance_nodes)
    }

    # Get AI recommendations
    recommendations = ai_provider.get_recommendations(metrics)

    # Enrich AI recommendations with actual guest names and validate nodes
    if recommendations.get("success") and recommendations.get("recommendations"):
        guests_dict = cache_data.get("guests", {})
        nodes_dict = cache_data.get("nodes", {})

        # Exclude maintenance nodes from valid targets (already loaded above)
        valid_nodes = [n for n in nodes_dict.keys() if n not in maintenance_nodes]

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


@system_bp.route("/api/system/info", methods=["GET"])
@api_route
def system_info():
    """Get system information including version and update status"""
    update_manager = current_app.config['update_manager']
    version_info = update_manager.get_version_info()
    # Pass config for update-available notifications
    config = load_config()
    update_info = update_manager.check_for_updates(config=config if not config.get('error') else None)

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
        "changelog": update_info.get('changelog', []),
        "previous_branch": update_manager._load_previous_branch(),
        "update_in_progress": update_manager.is_locked
    }

    return jsonify(system_data)

@system_bp.route("/api/system/check-update", methods=["GET"])
def check_update():
    """Check if updates are available"""
    try:
        update_manager = current_app.config['update_manager']
        config = load_config()
        update_info = update_manager.check_for_updates(config=config if not config.get('error') else None)
        return jsonify(update_info)
    except Exception as e:
        return jsonify({
            "error": str(e),
            "update_available": False
        }), 500

@system_bp.route("/api/system/update", methods=["POST"])
def update_system():
    """Update ProxBalance to latest version (release or branch commit)"""
    update_manager = current_app.config['update_manager']
    result = update_manager.perform_update()
    status_code = 200 if result.get('success', False) else 500
    return jsonify(result), status_code

@system_bp.route("/api/system/branches", methods=["GET"])
@api_route
def list_branches():
    """List all available git branches"""
    update_manager = current_app.config['update_manager']
    result = update_manager.list_branches()
    return jsonify(result)

@system_bp.route("/api/system/switch-branch", methods=["POST"])
def switch_branch():
    """Switch to a different git branch"""
    update_manager = current_app.config['update_manager']
    data = request.get_json()
    target_branch = data.get('branch', '')
    result = update_manager.switch_branch(target_branch)
    status_code = 200 if result.get('success', False) else 400
    return jsonify(result), status_code


@system_bp.route("/api/system/branch-preview/<branch>", methods=["GET"])
def branch_preview(branch):
    """Preview commits in a branch compared to main"""
    update_manager = current_app.config['update_manager']
    result = update_manager.branch_preview(branch)
    status_code = 200 if result.get('success', False) else 400
    return jsonify(result), status_code

@system_bp.route("/api/system/rollback-branch", methods=["POST"])
def rollback_branch():
    """Switch back to the previously active branch"""
    update_manager = current_app.config['update_manager']
    result = update_manager.rollback_branch()
    status_code = 200 if result.get('success', False) else 400
    return jsonify(result), status_code

@system_bp.route("/api/system/clear-testing-mode", methods=["POST"])
def clear_testing_mode():
    """Clear the previous branch tracking to exit testing mode"""
    update_manager = current_app.config['update_manager']
    result = update_manager.clear_testing_mode()
    return jsonify(result), 200

@system_bp.route("/api/system/restart-service", methods=["POST"])
def restart_service():
    """Restart a ProxBalance service"""
    update_manager = current_app.config['update_manager']
    data = request.get_json()
    service = data.get('service', 'proxmox-balance')
    result = update_manager.restart_service(service)
    status_code = 200 if result.get('success', False) else (400 if 'Invalid service' in result.get('error', '') else 500)
    return jsonify(result), status_code


@system_bp.route("/api/system/change-host", methods=["POST"])
@api_route
def change_host():
    """Change the Proxmox host in config.json"""
    data = request.get_json()
    new_host = data.get('host', '').strip()

    if not new_host:
        return jsonify({
            "success": False,
            "error": "Host is required"
        }), 400

    # Load current config
    config_path = CONFIG_FILE
    with open(config_path, 'r') as f:
        config_data = json.load(f)

    # Get API credentials for testing
    api_token_id = config_data.get('proxmox_api_token_id', '')
    api_token_secret = config_data.get('proxmox_api_token_secret', '')

    if not api_token_id or not api_token_secret:
        return jsonify({
            "success": False,
            "error": "API token not configured. Please configure API credentials first."
        }), 400

    # Test connection to new host
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    test_url = f"https://{new_host}:8006/api2/json/version"
    headers = {
        "Authorization": f"PVEAPIToken={api_token_id}={api_token_secret}"
    }

    try:
        response = requests.get(test_url, headers=headers, verify=False, timeout=5)

        if response.status_code == 401:
            return jsonify({
                "success": False,
                "error": f"Authentication failed on {new_host}. Please check your API token credentials."
            }), 400
        elif response.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"Failed to connect to {new_host}. HTTP {response.status_code}: {response.text[:100]}"
            }), 400

        # Verify it's actually a Proxmox server
        version_data = response.json().get('data', {})
        if not version_data.get('version'):
            return jsonify({
                "success": False,
                "error": f"{new_host} responded but doesn't appear to be a Proxmox VE server"
            }), 400

    except requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "error": f"Connection to {new_host}:8006 timed out. Please verify the host is reachable."
        }), 400
    except requests.exceptions.ConnectionError:
        return jsonify({
            "success": False,
            "error": f"Cannot connect to {new_host}:8006. Please verify the hostname/IP and that the Proxmox API is accessible."
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Connection test failed: {str(e)}"
        }), 400

    # Connection test passed, update config
    config_data['proxmox_host'] = new_host

    # Write updated config
    with open(config_path, 'w') as f:
        json.dump(config_data, f, indent=2)

    # Restart collector service to apply changes
    subprocess.run(
        ['/bin/systemctl', 'restart', 'proxmox-collector.service'],
        capture_output=True,
        timeout=10
    )

    return jsonify({
        "success": True,
        "message": f"Proxmox host updated to {new_host} and verified successfully"
    })


@system_bp.route("/api/settings/collection", methods=["POST"])
@api_route
def update_collection_settings():
    """Update collection optimization settings"""
    data = request.get_json()

    # Validate input
    interval = data.get('collection_interval_minutes')
    if interval and (not isinstance(interval, int) or interval < 1 or interval > 240):
        return jsonify({
            "success": False,
            "error": "Collection interval must be between 1 and 240 minutes"
        }), 400

    opt_config = data.get('collection_optimization', {})
    max_workers = opt_config.get('max_parallel_workers')
    if max_workers and (not isinstance(max_workers, int) or max_workers < 1 or max_workers > 10):
        return jsonify({
            "success": False,
            "error": "Max parallel workers must be between 1 and 10"
        }), 400

    # Load current config
    with open(CONFIG_FILE, 'r') as f:
        config_data = json.load(f)

    # Update collection settings
    if interval:
        config_data['collection_interval_minutes'] = interval

    if opt_config:
        if 'collection_optimization' not in config_data:
            config_data['collection_optimization'] = {}
        config_data['collection_optimization'].update(opt_config)

    # Write updated config
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_data, f, indent=2)

    # Update systemd timer
    timer_warning = None
    try:
        subprocess.run(
            ['/opt/proxmox-balance-manager/venv/bin/python3',
             '/opt/proxmox-balance-manager/update_timer.py'],
            capture_output=True,
            timeout=10,
            check=True
        )
    except Exception as e:
        timer_warning = f"Settings saved but timer update failed: {e}"
        print(f"Warning: Failed to update timer: {e}", file=sys.stderr)

    response = {
        "success": True,
        "message": "Collection settings updated successfully"
    }
    if timer_warning:
        response["warning"] = timer_warning

    return jsonify(response)


@system_bp.route("/api/settings/recommendation-thresholds", methods=["GET"])
@api_route
def get_recommendation_thresholds():
    """Get recommendation threshold settings from config."""
    config = load_config()
    thresholds = config.get('recommendation_thresholds', {})
    return jsonify({
        "success": True,
        "thresholds": {
            "cpu_threshold": thresholds.get('cpu_threshold', 60),
            "mem_threshold": thresholds.get('mem_threshold', 70),
            "iowait_threshold": thresholds.get('iowait_threshold', 30),
        }
    })


@system_bp.route("/api/settings/recommendation-thresholds", methods=["POST"])
@api_route
def update_recommendation_thresholds():
    """Update recommendation threshold settings in config.json."""
    data = request.get_json()

    cpu = data.get('cpu_threshold')
    mem = data.get('mem_threshold')
    iowait = data.get('iowait_threshold')

    # Validate
    for name, val in [('cpu_threshold', cpu), ('mem_threshold', mem), ('iowait_threshold', iowait)]:
        if val is not None:
            try:
                val = float(val)
            except (TypeError, ValueError):
                return jsonify({"success": False, "error": f"{name} must be a number"}), 400
            if val < 1 or val > 100:
                return jsonify({"success": False, "error": f"{name} must be between 1 and 100"}), 400

    with open(CONFIG_FILE, 'r') as f:
        config_data = json.load(f)

    if 'recommendation_thresholds' not in config_data:
        config_data['recommendation_thresholds'] = {}

    if cpu is not None:
        config_data['recommendation_thresholds']['cpu_threshold'] = float(cpu)
    if mem is not None:
        config_data['recommendation_thresholds']['mem_threshold'] = float(mem)
    if iowait is not None:
        config_data['recommendation_thresholds']['iowait_threshold'] = float(iowait)

    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_data, f, indent=2)

    return jsonify({
        "success": True,
        "message": "Recommendation thresholds updated",
        "thresholds": config_data['recommendation_thresholds']
    })


@system_bp.route("/api/system/token-permissions", methods=["POST"])
@api_route
def change_token_permissions():
    """Change API token permissions"""
    data = request.get_json()
    token_id = data.get('token_id', '')
    permission_level = data.get('permission_level', 'readonly')

    if not token_id:
        return jsonify({
            "success": False,
            "error": "Token ID is required"
        }), 400

    # Parse token_id (format: user@realm!tokenname)
    if '!' not in token_id:
        return jsonify({
            "success": False,
            "error": "Invalid token ID format. Expected: user@realm!tokenname"
        }), 400

    user_part, token_name = token_id.split('!', 1)

    # Remove existing permissions
    subprocess.run(
        ['/usr/bin/pveum', 'acl', 'delete', '/', '--tokens', token_id],
        capture_output=True,
        timeout=10
    )
    subprocess.run(
        ['/usr/bin/pveum', 'acl', 'delete', '/', '--users', user_part],
        capture_output=True,
        timeout=10
    )

    # Apply new permissions
    try:
        if permission_level == 'readonly':
            # Read-only: PVEAuditor
            subprocess.run(
                ['/usr/bin/pveum', 'acl', 'modify', '/', '--users', user_part, '--roles', 'PVEAuditor'],
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
            subprocess.run(
                ['/usr/bin/pveum', 'acl', 'modify', '/', '--tokens', token_id, '--roles', 'PVEAuditor'],
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
        else:
            # Full: PVEAuditor + PVEVMAdmin
            subprocess.run(
                ['/usr/bin/pveum', 'acl', 'modify', '/', '--users', user_part, '--roles', 'PVEAuditor'],
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
            subprocess.run(
                ['/usr/bin/pveum', 'acl', 'modify', '/', '--users', user_part, '--roles', 'PVEVMAdmin'],
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
            subprocess.run(
                ['/usr/bin/pveum', 'acl', 'modify', '/', '--tokens', token_id, '--roles', 'PVEAuditor'],
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
            subprocess.run(
                ['/usr/bin/pveum', 'acl', 'modify', '/', '--tokens', token_id, '--roles', 'PVEVMAdmin'],
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
    except subprocess.CalledProcessError as e:
        return jsonify({
            "success": False,
            "error": f"Failed to update permissions: {e.stderr if e.stderr else str(e)}"
        }), 500

    return jsonify({
        "success": True,
        "message": f"Token permissions updated to {permission_level}"
    })


@system_bp.route("/api/system/recreate-token", methods=["POST"])
@api_route
def recreate_token():
    """Recreate API token (delete old, create new)"""
    data = request.get_json()
    token_id = data.get('token_id', '')
    permission_level = data.get('permission_level', 'readonly')

    if not token_id:
        return jsonify({
            "success": False,
            "error": "Token ID is required"
        }), 400

    # Parse token_id
    if '!' not in token_id:
        return jsonify({
            "success": False,
            "error": "Invalid token ID format"
        }), 400

    user_part, token_name = token_id.split('!', 1)

    # Delete old token
    subprocess.run(
        ['/usr/bin/pveum', 'user', 'token', 'remove', user_part, token_name],
        capture_output=True,
        timeout=10
    )

    try:
        # Create new token
        result = subprocess.run(
            ['/usr/bin/pveum', 'user', 'token', 'add', user_part, token_name, '--privsep', '0'],
            capture_output=True,
            text=True,
            timeout=10,
            check=True
        )

        # Extract token secret from output
        import re
        secret_match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', result.stdout)
        if not secret_match:
            return jsonify({
                "success": False,
                "error": "Failed to extract token secret from output"
            }), 500

        token_secret = secret_match.group(0)

        # Apply permissions
        if permission_level == 'readonly':
            subprocess.run(['/usr/bin/pveum', 'acl', 'modify', '/', '--users', user_part, '--roles', 'PVEAuditor'], check=True, timeout=10)
            subprocess.run(['/usr/bin/pveum', 'acl', 'modify', '/', '--tokens', token_id, '--roles', 'PVEAuditor'], check=True, timeout=10)
        else:
            subprocess.run(['/usr/bin/pveum', 'acl', 'modify', '/', '--users', user_part, '--roles', 'PVEAuditor'], check=True, timeout=10)
            subprocess.run(['/usr/bin/pveum', 'acl', 'modify', '/', '--users', user_part, '--roles', 'PVEVMAdmin'], check=True, timeout=10)
            subprocess.run(['/usr/bin/pveum', 'acl', 'modify', '/', '--tokens', token_id, '--roles', 'PVEAuditor'], check=True, timeout=10)
            subprocess.run(['/usr/bin/pveum', 'acl', 'modify', '/', '--tokens', token_id, '--roles', 'PVEVMAdmin'], check=True, timeout=10)
    except subprocess.CalledProcessError as e:
        return jsonify({
            "success": False,
            "error": f"Failed to recreate token: {e.stderr if e.stderr else str(e)}"
        }), 500

    # Update config.json with new token secret
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    with open(config_path, 'r') as f:
        config_data = json.load(f)

    config_data['proxmox_api_token_secret'] = token_secret

    with open(config_path, 'w') as f:
        json.dump(config_data, f, indent=2)

    return jsonify({
        "success": True,
        "message": "Token recreated successfully",
        "token_secret": token_secret
    })


@system_bp.route("/api/system/delete-token", methods=["POST"])
@api_route
def delete_token():
    """Delete API token"""
    data = request.get_json()
    token_id = data.get('token_id', '')

    if not token_id:
        return jsonify({
            "success": False,
            "error": "Token ID is required"
        }), 400

    # Parse token_id
    if '!' not in token_id:
        return jsonify({
            "success": False,
            "error": "Invalid token ID format"
        }), 400

    user_part, token_name = token_id.split('!', 1)

    # Delete token
    result = subprocess.run(
        ['/usr/bin/pveum', 'user', 'token', 'remove', user_part, token_name],
        capture_output=True,
        text=True,
        timeout=10
    )

    if result.returncode != 0:
        return jsonify({
            "success": False,
            "error": f"Failed to delete token: {result.stderr}"
        }), 500

    # Clear from config.json
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    with open(config_path, 'r') as f:
        config_data = json.load(f)

    config_data['proxmox_api_token_id'] = ''
    config_data['proxmox_api_token_secret'] = ''

    with open(config_path, 'w') as f:
        json.dump(config_data, f, indent=2)

    return jsonify({
        "success": True,
        "message": "Token deleted successfully"
    })


@system_bp.route("/api/logs/download", methods=["GET"])
@api_route
def download_logs():
    """Download service logs"""
    service = request.args.get('service', 'proxmox-balance')

    # Validate service name
    valid_services = ['proxmox-balance', 'proxmox-collector']
    if service not in valid_services:
        return jsonify({
            "success": False,
            "error": f"Invalid service. Must be one of: {', '.join(valid_services)}"
        }), 400

    # Get logs using journalctl
    try:
        result = subprocess.run(
            ['/bin/journalctl', '-u', f'{service}.service', '-n', '1000', '--no-pager'],
            capture_output=True,
            text=True,
            timeout=10
        )
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Log retrieval timed out"
        }), 500

    if result.returncode != 0:
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve logs: {result.stderr}"
        }), 500

    # Create a temporary file with the logs
    import tempfile
    import io

    log_content = result.stdout
    log_bytes = io.BytesIO(log_content.encode('utf-8'))

    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{service}_{timestamp}.log"

    return send_file(
        log_bytes,
        mimetype='text/plain',
        as_attachment=True,
        download_name=filename
    )
