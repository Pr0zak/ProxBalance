#!/usr/bin/env python3
"""
Proxmox Balance Manager - Flask API (with caching)
Reads from cache file for fast responses.

This is the application entry point. All route handlers live in
proxbalance/routes/ as Flask Blueprints; core logic lives in
proxbalance/ domain modules (scoring, recommendations, migrations, etc.).
"""

import os
import subprocess
from flask import Flask
from flask_cors import CORS
from flask_compress import Compress
from update_manager import UpdateManager

from proxbalance.config_manager import (
    BASE_PATH, CACHE_FILE, GIT_REPO_PATH, SESSIONS_DIR,
)
from proxbalance.cache import CacheManager
from proxbalance.routes import register_blueprints
from proxbalance.error_handlers import register_error_handlers

# ---------------------------------------------------------------------------
# Flask application
# ---------------------------------------------------------------------------

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
Compress(app)

# ---------------------------------------------------------------------------
# Shared state accessible via current_app.config in blueprints
# ---------------------------------------------------------------------------

GIT_CMD = '/usr/bin/git'

# Update manager (used by system blueprint)
update_manager = UpdateManager(GIT_REPO_PATH, GIT_CMD)
app.config['update_manager'] = update_manager

# In-memory cache with 60-second TTL (used by all data-reading blueprints)
cache_manager = CacheManager(cache_file=CACHE_FILE, ttl_seconds=60)
app.config['cache_manager'] = cache_manager

# Ensure evacuation sessions directory exists
if not os.path.exists(SESSIONS_DIR):
    os.makedirs(SESSIONS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Sync systemd collector timer with configured interval on startup
# ---------------------------------------------------------------------------

_update_timer_script = os.path.join(BASE_PATH, 'update_timer.py')
_venv_python = os.path.join(BASE_PATH, 'venv', 'bin', 'python3')
if os.path.exists(_update_timer_script) and os.path.exists(_venv_python):
    try:
        subprocess.run(
            [_venv_python, _update_timer_script],
            capture_output=True, timeout=10, check=False,
        )
    except Exception:
        pass  # Non-fatal — timer will use whatever is on disk

# ---------------------------------------------------------------------------
# Register all route blueprints
# ---------------------------------------------------------------------------

register_blueprints(app)
register_error_handlers(app)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
