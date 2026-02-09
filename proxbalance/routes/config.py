"""Configuration management routes."""

from flask import Blueprint, jsonify, request, send_file, current_app
import json, os, sys, io, subprocess
from datetime import datetime
from proxbalance.error_handlers import api_route
from proxbalance.config_manager import (
    load_config, save_config, get_proxmox_client, validate_config_structure,
    CONFIG_FILE, BASE_PATH,
)

config_bp = Blueprint("config", __name__, url_prefix=None)


@config_bp.route("/api/permissions", methods=["GET"])
@api_route
def check_permissions():
    """Check API token permissions - test if migrations are available"""
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
        proxmox = get_proxmox_client(config)

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


@config_bp.route("/api/config", methods=["GET"])
@api_route
def get_config():
    """Get current configuration"""
    config = load_config()

    if config.get('error'):
        return jsonify({
            "success": False,
            "error": config.get('message')
        }), 500

    return jsonify({"success": True, "config": config})


@config_bp.route("/api/config", methods=["POST"])
@api_route
def update_config():
    """Update configuration"""
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


@config_bp.route("/api/config/export", methods=["GET"])
@api_route
def export_config():
    """Export complete configuration as downloadable JSON file"""
    from datetime import datetime
    import io

    config = load_config()
    if config.get('error'):
        return jsonify({
            "success": False,
            "error": config.get('message')
        }), 500

    # Add export metadata
    export_data = {
        "export_metadata": {
            "export_date": datetime.now().isoformat(),
            "proxbalance_version": "2.0",
            "config_version": 1
        },
        "configuration": config
    }

    # Create JSON string
    json_str = json.dumps(export_data, indent=2)

    # Create file-like object
    file_obj = io.BytesIO(json_str.encode('utf-8'))

    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"proxbalance_config_{timestamp}.json"

    return send_file(
        file_obj,
        mimetype='application/json',
        as_attachment=True,
        download_name=filename
    )


@config_bp.route("/api/config/backup", methods=["POST"])
@api_route
def backup_config():
    """Create a backup of current configuration (keeps last 5)"""
    from datetime import datetime
    import glob

    config = load_config()
    if config.get('error'):
        return jsonify({
            "success": False,
            "error": config.get('message')
        }), 500

    # Create backups directory if it doesn't exist
    backup_dir = os.path.join(BASE_PATH, 'backups')
    os.makedirs(backup_dir, exist_ok=True)

    # Generate backup filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(backup_dir, f"config_backup_{timestamp}.json")

    # Save backup
    with open(backup_file, 'w') as f:
        json.dump(config, f, indent=2)

    # Rotate backups - keep only last 5
    backup_files = sorted(glob.glob(os.path.join(backup_dir, 'config_backup_*.json')))
    if len(backup_files) > 5:
        # Remove oldest backups
        for old_backup in backup_files[:-5]:
            try:
                os.remove(old_backup)
            except Exception as e:
                print(f"Warning: Could not remove old backup {old_backup}: {e}")

    return jsonify({
        "success": True,
        "message": "Configuration backup created successfully",
        "backup_file": os.path.basename(backup_file)
    })


@config_bp.route("/api/config/import", methods=["POST"])
@api_route
def import_config():
    """Import configuration from uploaded JSON file"""
    from datetime import datetime
    import subprocess as sp

    # Check if file was uploaded
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "error": "No file uploaded"
        }), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            "success": False,
            "error": "No file selected"
        }), 400

    # Read and parse JSON
    try:
        import_data = json.load(file)
    except json.JSONDecodeError as e:
        return jsonify({
            "success": False,
            "error": f"Invalid JSON file: {str(e)}"
        }), 400

    # Extract configuration (handle both direct config and exported format with metadata)
    if 'configuration' in import_data and 'export_metadata' in import_data:
        # This is an exported config file
        config_data = import_data['configuration']
        metadata = import_data['export_metadata']
    else:
        # This is a direct config.json file
        config_data = import_data
        metadata = None

    # Validate configuration
    validation_result = validate_config_structure(config_data)
    if not validation_result['valid']:
        return jsonify({
            "success": False,
            "error": "Configuration validation failed",
            "validation_errors": validation_result['errors'],
            "validation_warnings": validation_result['warnings']
        }), 400

    # Test imported API token validity
    token_valid = False
    token_test_error = None
    imported_token_id = config_data.get('proxmox_api_token_id', '')
    imported_token_secret = config_data.get('proxmox_api_token_secret', '')

    if imported_token_id and imported_token_secret:
        try:
            import requests
            proxmox_host = config_data.get('proxmox_host', 'localhost')
            proxmox_port = config_data.get('proxmox_port', 8006)
            verify_ssl = config_data.get('proxmox_verify_ssl', False)

            # Test token with a simple API call
            test_url = f"https://{proxmox_host}:{proxmox_port}/api2/json/cluster/resources"
            test_headers = {'Authorization': f'PVEAPIToken={imported_token_id}={imported_token_secret}'}
            test_response = requests.get(test_url, headers=test_headers, verify=verify_ssl, timeout=5)

            if test_response.status_code == 200:
                token_valid = True
            else:
                token_test_error = f"HTTP {test_response.status_code}"
        except Exception as e:
            token_test_error = str(e)

    # If imported token is invalid, offer to keep current token
    current_config = load_config()
    if not token_valid and not current_config.get('error'):
        current_token_id = current_config.get('proxmox_api_token_id', '')
        current_token_secret = current_config.get('proxmox_api_token_secret', '')

        # Test current token
        current_token_valid = False
        if current_token_id and current_token_secret:
            try:
                import requests
                proxmox_host = current_config.get('proxmox_host', 'localhost')
                proxmox_port = current_config.get('proxmox_port', 8006)
                verify_ssl = current_config.get('proxmox_verify_ssl', False)

                test_url = f"https://{proxmox_host}:{proxmox_port}/api2/json/cluster/resources"
                test_headers = {'Authorization': f'PVEAPIToken={current_token_id}={current_token_secret}'}
                test_response = requests.get(test_url, headers=test_headers, verify=verify_ssl, timeout=5)

                if test_response.status_code == 200:
                    current_token_valid = True
            except Exception:
                pass

        # If current token is valid and imported is not, preserve current token
        if current_token_valid:
            validation_result['warnings'].append(
                f"Imported API token is invalid ({token_test_error}). Using existing valid token instead."
            )
            config_data['proxmox_api_token_id'] = current_token_id
            config_data['proxmox_api_token_secret'] = current_token_secret

    # Create automatic backup before importing
    if not current_config.get('error'):
        backup_dir = os.path.join(BASE_PATH, 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f"config_backup_pre_import_{timestamp}.json")

        with open(backup_file, 'w') as f:
            json.dump(current_config, f, indent=2)

    # Save imported configuration
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_data, f, indent=2)

    # Restart services if credentials changed
    systemctl_cmd = "/usr/bin/systemctl"
    if os.path.exists(systemctl_cmd) and os.path.exists("/etc/systemd/system/proxmox-collector.service"):
        try:
            sp.run([systemctl_cmd, "restart", "proxmox-collector.timer"],
                  capture_output=True, text=True, timeout=5)
            sp.run([systemctl_cmd, "restart", "proxmox-balance"],
                  capture_output=True, text=True, timeout=5)
        except Exception as e:
            print(f"Warning: Could not restart services: {e}")

    return jsonify({
        "success": True,
        "message": "Configuration imported successfully",
        "validation_warnings": validation_result['warnings'],
        "metadata": metadata
    })


@config_bp.route("/api/validate-token", methods=["POST"])
@api_route
def validate_token():
    """Validate Proxmox API token and check permissions"""
    data = request.get_json()
    token_id = data.get('proxmox_api_token_id', '')
    token_secret = data.get('proxmox_api_token_secret', '')

    if not token_id or not token_secret:
        return jsonify({
            "success": False,
            "error": "Token ID and secret are required"
        }), 400

    # Load config to get host information
    config = load_config()
    if config.get('error'):
        return jsonify({
            "success": False,
            "error": "Failed to load configuration"
        }), 500

    # Parse token ID to extract user and token name
    # Format: user@realm!tokenname
    try:
        user_part, token_name = token_id.split('!')
    except ValueError:
        return jsonify({
            "success": False,
            "error": "Invalid token ID format. Expected: user@realm!tokenname"
        }), 400

    # Test API connectivity with the provided token
    try:
        test_config = dict(config)
        test_config['proxmox_api_token_id'] = token_id
        test_config['proxmox_api_token_secret'] = token_secret
        proxmox = get_proxmox_client(test_config)

        # Test basic connectivity by getting version
        version_info = proxmox.version.get()
        version = version_info.get('version', 'Unknown')

        # Try to get permissions for the token
        permissions = []
        try:
            # Get cluster resources - basic permission test
            resources = proxmox.cluster.resources.get()
            permissions.append("✓ Can read cluster resources")

            # Test node access
            try:
                nodes = proxmox.nodes.get()
                permissions.append(f"✓ Can access {len(nodes)} node(s)")
            except:
                permissions.append("✗ Cannot access nodes")

            # Test VM/CT access
            try:
                vms = [r for r in resources if r.get('type') in ['qemu', 'lxc']]
                permissions.append(f"✓ Can see {len(vms)} guest(s)")
            except:
                permissions.append("✗ Cannot list guests")

            # Try to get ACL to determine actual permissions
            try:
                # This will fail if user doesn't have permission to read ACLs
                acl_result = proxmox.access.acl.get()
                # Find permissions for this token
                token_acls = [acl for acl in acl_result if token_id in str(acl)]
                if token_acls:
                    for acl in token_acls[:3]:  # Show first 3
                        path = acl.get('path', '/')
                        roleid = acl.get('roleid', 'Unknown')
                        permissions.append(f"✓ Role '{roleid}' on path '{path}'")
            except:
                # Can't read ACLs, but that's okay - we already tested basic access
                permissions.append("ℹ Cannot read ACL details (limited permissions)")

        except Exception as perm_error:
            permissions.append(f"✗ Permission check failed: {str(perm_error)}")

        return jsonify({
            "success": True,
            "message": "Token is valid and working!",
            "version": version,
            "permissions": permissions
        })

    except Exception as api_error:
        error_msg = str(api_error)
        if '401' in error_msg or 'Unauthorized' in error_msg:
            return jsonify({
                "success": False,
                "error": "Authentication failed: Invalid token credentials"
            }), 401
        elif '403' in error_msg or 'Permission denied' in error_msg:
            return jsonify({
                "success": False,
                "error": "Permission denied: Token lacks required permissions"
            }), 403
        else:
            return jsonify({
                "success": False,
                "error": f"Connection failed: {error_msg}"
            }), 500
