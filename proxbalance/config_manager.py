"""
ProxBalance Configuration Manager

Handles configuration loading, saving, and validation.
Manages path constants and disk I/O for config, penalty, and cache files.
"""

import json
import os
import subprocess
import sys
from typing import Dict, Optional

from proxbalance.constants import (
    BASE_PATH, GIT_REPO_PATH, CACHE_FILE, CONFIG_FILE, SESSIONS_DIR, DISK_PREFIXES
)


def load_config(config_file=None):
    """Load configuration from config.json

    Args:
        config_file: Path to config file. Defaults to CONFIG_FILE.

    Returns:
        dict: Configuration dictionary, or dict with 'error' key on failure.
    """
    if config_file is None:
        config_file = CONFIG_FILE

    if not os.path.exists(config_file):
        return {
            "error": True,
            "message": f"Configuration file not found: {config_file}"
        }

    try:
        with open(config_file, 'r') as f:
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


def save_config(config, config_file=None):
    """Save configuration to config.json

    Writes the full configuration dictionary to disk as formatted JSON.
    Extracted from the /api/config POST route handler.

    Args:
        config: Configuration dictionary to save.
        config_file: Path to config file. Defaults to CONFIG_FILE.

    Returns:
        bool: True on success, False on failure.
    """
    if config_file is None:
        config_file = CONFIG_FILE

    try:
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving config: {e}", file=sys.stderr)
        return False


def load_penalty_config(default_penalty_config=None, config_file=None):
    """Load penalty configuration from config.json, merging with defaults

    Args:
        default_penalty_config: Dictionary of default penalty values.
            If None, uses DEFAULT_PENALTY_CONFIG from proxbalance.scoring.
        config_file: Path to config file. Defaults to CONFIG_FILE.

    Returns:
        dict: Merged penalty configuration (saved values override defaults).
    """
    if default_penalty_config is None:
        from proxbalance.scoring import DEFAULT_PENALTY_CONFIG
        default_penalty_config = DEFAULT_PENALTY_CONFIG

    config = load_config(config_file)
    if config.get('error'):
        # If config has error, return defaults
        return default_penalty_config.copy()

    # Get penalty config from main config, or use empty dict
    saved_penalties = config.get('penalty_scoring', {})

    # Merge with defaults (saved values override defaults)
    penalty_config = default_penalty_config.copy()
    penalty_config.update(saved_penalties)

    return penalty_config


def save_penalty_config(penalty_config, config_file=None):
    """Save penalty configuration to config.json

    Args:
        penalty_config: Dictionary of penalty configuration values.
        config_file: Path to config file. Defaults to CONFIG_FILE.

    Returns:
        bool: True on success, False on failure.
    """
    if config_file is None:
        config_file = CONFIG_FILE

    try:
        config = load_config(config_file)
        if config.get('error'):
            return False

        # Update the penalty_scoring section
        config['penalty_scoring'] = penalty_config

        # Write back to file
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        return True
    except Exception as e:
        print(f"Error saving penalty config: {e}", file=sys.stderr)
        return False


def read_cache(cache_file):
    """Read cluster data from cache file on disk

    This is the raw file reader. It reads JSON directly from disk
    without any in-memory caching or TTL logic (that is CacheManager's job).

    Args:
        cache_file: Path to the JSON cache file.

    Returns:
        dict or None: Parsed cache data, or None if the file does not
            exist or cannot be read.
    """
    try:
        if not os.path.exists(cache_file):
            return None

        with open(cache_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading cache: {str(e)}", file=sys.stderr)
        return None


def read_cache_file():
    """Read cluster data from the default CACHE_FILE on disk

    A simple JSON file reader that reads CACHE_FILE directly from disk
    without any in-memory caching or TTL logic.

    Returns:
        dict or None: Parsed cache data, or None if the file does not
            exist or cannot be read.
    """
    try:
        if not os.path.exists(CACHE_FILE):
            return None

        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading cache file: {str(e)}", file=sys.stderr)
        return None


def get_proxmox_client(config=None, **kwargs):
    """Create and return a ProxmoxAPI client from config.

    Args:
        config: Configuration dict. If None, loads from file.
        **kwargs: Additional keyword arguments passed to ProxmoxAPI.

    Returns:
        ProxmoxAPI instance

    Raises:
        ValueError: If API token is not configured
    """
    from proxmoxer import ProxmoxAPI

    if config is None:
        config = load_config()

    token_id = config.get('proxmox_api_token_id', '')
    token_secret = config.get('proxmox_api_token_secret', '')
    proxmox_host = config.get('proxmox_host', 'localhost')
    proxmox_port = config.get('proxmox_port', 8006)
    verify_ssl = config.get('proxmox_verify_ssl', False)

    if not token_id or not token_secret:
        raise ValueError("API token not configured. Please configure Proxmox API token in settings.")

    user, token_name = token_id.split('!', 1)
    return ProxmoxAPI(
        proxmox_host,
        user=user,
        token_name=token_name,
        token_value=token_secret,
        port=proxmox_port,
        verify_ssl=verify_ssl,
        **kwargs
    )


def validate_config_structure(config_data):
    """Validate imported configuration structure

    Args:
        config_data: Configuration dictionary to validate.

    Returns:
        dict: Validation result with 'valid', 'errors', and 'warnings' keys.
    """
    errors = []
    warnings = []

    # Required fields
    required_fields = ['proxmox_host']
    for field in required_fields:
        if field not in config_data:
            errors.append(f"Missing required field: {field}")

    # Check proxmox_host is not placeholder
    if config_data.get('proxmox_host') == 'CHANGE_ME':
        errors.append("proxmox_host is set to placeholder value 'CHANGE_ME'")

    # Validate data types
    if 'collection_interval_minutes' in config_data:
        if not isinstance(config_data['collection_interval_minutes'], (int, float)):
            errors.append("collection_interval_minutes must be a number")

    if 'ui_refresh_interval_minutes' in config_data:
        if not isinstance(config_data['ui_refresh_interval_minutes'], (int, float)):
            errors.append("ui_refresh_interval_minutes must be a number")

    # Check authentication method
    if 'proxmox_auth_method' in config_data:
        valid_auth_methods = ['api_token', 'password']
        if config_data['proxmox_auth_method'] not in valid_auth_methods:
            errors.append(f"Invalid proxmox_auth_method. Must be one of: {', '.join(valid_auth_methods)}")

    # Warn about missing optional but recommended fields
    recommended_fields = ['collection_interval_minutes', 'ui_refresh_interval_minutes', 'proxmox_port']
    for field in recommended_fields:
        if field not in config_data:
            warnings.append(f"Optional field missing: {field} (will use default)")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def trigger_collection():
    """Trigger background collection process

    Spawns the collector_api.py script as a detached subprocess.
    Automatically selects the correct Python interpreter and collector
    path based on the detected environment (production vs Docker dev).

    Returns:
        bool: True if the collection process was started, False on failure.
    """
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
