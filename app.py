#!/usr/bin/env python3
"""
Proxmox Balance Manager - Flask API (with caching)
Reads from cache file for fast responses
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_compress import Compress
import subprocess
import json
import os
import sys
import shutil
import time
import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, List
from pathlib import Path
from ai_provider import AIProviderFactory

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
Compress(app)  # Enable gzip compression for all responses

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

# Default penalty scoring configuration
# These values can be customized via the settings UI
DEFAULT_PENALTY_CONFIG = {
    # Current load penalties (immediate state)
    "cpu_high_penalty": 20,           # Penalty when CPU > threshold
    "cpu_very_high_penalty": 50,      # Penalty when CPU > threshold+10
    "cpu_extreme_penalty": 100,       # Penalty when CPU > threshold+20
    "mem_high_penalty": 20,           # Penalty when Memory > threshold
    "mem_very_high_penalty": 50,      # Penalty when Memory > threshold+10
    "mem_extreme_penalty": 100,       # Penalty when Memory > threshold+20

    # Sustained load penalties (7-day averages)
    "cpu_sustained_high": 40,         # Penalty when 7d avg CPU > 70%
    "cpu_sustained_very_high": 80,    # Penalty when 7d avg CPU > 80%
    "cpu_sustained_critical": 150,    # Penalty when 7d avg CPU > 90%
    "mem_sustained_high": 40,         # Penalty when 7d avg Memory > 70%
    "mem_sustained_very_high": 80,    # Penalty when 7d avg Memory > 80%
    "mem_sustained_critical": 150,    # Penalty when 7d avg Memory > 90%

    # IOWait penalties
    "iowait_high_penalty": 20,        # Penalty when immediate IOWait > 10%
    "iowait_very_high_penalty": 40,   # Penalty when immediate IOWait > 20%
    "iowait_extreme_penalty": 80,     # Penalty when immediate IOWait > 30%
    "iowait_sustained_elevated": 15,  # Penalty when 7d avg IOWait > 10%
    "iowait_sustained_high": 30,      # Penalty when 7d avg IOWait > 15%
    "iowait_sustained_critical": 60,  # Penalty when 7d avg IOWait > 20%

    # Trend penalties
    "cpu_trend_rising_penalty": 15,   # Penalty for rising CPU trend
    "mem_trend_rising_penalty": 15,   # Penalty for rising Memory trend

    # Spike penalties (max values in week)
    "cpu_spike_moderate": 5,          # Penalty when max CPU > 70%
    "cpu_spike_high": 10,             # Penalty when max CPU > 80%
    "cpu_spike_very_high": 20,        # Penalty when max CPU > 90%
    "cpu_spike_extreme": 30,          # Penalty when max CPU > 95%
    "mem_spike_moderate": 5,          # Penalty when max Memory > 75%
    "mem_spike_high": 10,             # Penalty when max Memory > 85%
    "mem_spike_very_high": 20,        # Penalty when max Memory > 90%
    "mem_spike_extreme": 30,          # Penalty when max Memory > 95%

    # Predicted post-migration penalties
    "predicted_cpu_over_penalty": 25,        # Penalty when predicted CPU > threshold
    "predicted_cpu_high_penalty": 50,        # Penalty when predicted CPU > threshold+10
    "predicted_cpu_extreme_penalty": 100,    # Penalty when predicted CPU > threshold+20
    "predicted_mem_over_penalty": 25,        # Penalty when predicted Memory > threshold
    "predicted_mem_high_penalty": 50,        # Penalty when predicted Memory > threshold+10
    "predicted_mem_extreme_penalty": 100,    # Penalty when predicted Memory > threshold+20

    # Threshold offsets
    "cpu_threshold_offset_1": 10,     # First threshold offset (used for +10 calculations)
    "cpu_threshold_offset_2": 20,     # Second threshold offset (used for +20 calculations)
    "mem_threshold_offset_1": 10,     # First threshold offset (used for +10 calculations)
    "mem_threshold_offset_2": 20,     # Second threshold offset (used for +20 calculations)

    # Score improvement requirements
    "min_score_improvement": 15,      # Minimum score improvement to recommend migration
    "maintenance_score_boost": 100,   # Extra score added to maintenance nodes for evacuation priority

    # Time period weighting (for historical data)
    "weight_current": 0.5,            # Weight for current/immediate metrics (50%)
    "weight_24h": 0.3,                # Weight for 24-hour average metrics (30%)
    "weight_7d": 0.2,                 # Weight for 7-day average metrics (20%)
}

# Global evacuation tracking using file-based storage for multi-worker compatibility
SESSIONS_DIR = os.path.join(BASE_PATH, 'evacuation_sessions')
if not os.path.exists(SESSIONS_DIR):
    os.makedirs(SESSIONS_DIR, exist_ok=True)

def _get_session_file(session_id):
    """Get the file path for a session"""
    return os.path.join(SESSIONS_DIR, f"{session_id}.json")

def _read_session(session_id):
    """Read session from file"""
    session_file = _get_session_file(session_id)
    if os.path.exists(session_file):
        try:
            with open(session_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading session {session_id}: {e}", file=sys.stderr)
    return None

def _write_session(session_id, session_data):
    """Write session to file"""
    session_file = _get_session_file(session_id)
    try:
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
    except Exception as e:
        print(f"Error writing session {session_id}: {e}", file=sys.stderr)

# In-Memory Cache Manager
class CacheManager:
    """In-memory cache with TTL for cluster data"""
    def __init__(self, ttl_seconds=60):
        self.ttl_seconds = ttl_seconds
        self._cache = None
        self._cached_at = None
        self._lock = threading.Lock()

    def get(self) -> Dict:
        """Get cached data or read from disk if expired"""
        with self._lock:
            now = time.time()

            # Return cached data if still valid
            if self._cache is not None and self._cached_at is not None:
                age = now - self._cached_at
                if age < self.ttl_seconds:
                    return self._cache

            # Cache expired or doesn't exist - read from disk
            try:
                if not os.path.exists(CACHE_FILE):
                    return None

                with open(CACHE_FILE, 'r') as f:
                    self._cache = json.load(f)
                    self._cached_at = now
                    return self._cache
            except Exception as e:
                print(f"Error reading cache: {str(e)}", file=sys.stderr)
                return None

    def invalidate(self):
        """Force cache refresh on next request"""
        with self._lock:
            self._cache = None
            self._cached_at = None

# Global cache manager instance (60 second TTL)
cache_manager = CacheManager(ttl_seconds=60)

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

def load_penalty_config():
    """Load penalty configuration from config.json, merging with defaults"""
    config = load_config()
    if config.get('error'):
        # If config has error, return defaults
        return DEFAULT_PENALTY_CONFIG.copy()

    # Get penalty config from main config, or use empty dict
    saved_penalties = config.get('penalty_scoring', {})

    # Merge with defaults (saved values override defaults)
    penalty_config = DEFAULT_PENALTY_CONFIG.copy()
    penalty_config.update(saved_penalties)

    return penalty_config

def save_penalty_config(penalty_config: dict) -> bool:
    """Save penalty configuration to config.json"""
    try:
        config = load_config()
        if config.get('error'):
            return False

        # Update the penalty_scoring section
        config['penalty_scoring'] = penalty_config

        # Write back to file
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)

        return True
    except Exception as e:
        print(f"Error saving penalty config: {e}", file=sys.stderr)
        return False

def read_cache() -> Dict:
    """Read cluster data from cache (uses in-memory cache with TTL)"""
    return cache_manager.get()

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


# Progressive Loading Endpoints - Return subsets of cached data for faster initial page load

@app.route("/api/cluster-summary", methods=["GET"])
def get_cluster_summary():
    """Return lightweight cluster summary for immediate header rendering"""
    try:
        config = load_config()
        if config.get('error'):
            return jsonify({
                "success": False,
                "error": f"Configuration Error: {config.get('message')}"
            }), 500

        data = read_cache()
        if data is None:
            trigger_collection()
            return jsonify({
                "success": False,
                "error": "No cached data available"
            }), 503

        # Return minimal data for instant header/title rendering
        summary_data = {
            "collected_at": data.get("collected_at"),
            "summary": data.get("summary", {}),
            "cluster_health": data.get("cluster_health", {}),
            "node_count": len(data.get("nodes", {})),
            "guest_count": len(data.get("guests", {}))
        }

        return jsonify({"success": True, "data": summary_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/nodes-only", methods=["GET"])
def get_nodes_only():
    """Return only node data for cluster map rendering"""
    try:
        data = read_cache()
        if data is None:
            return jsonify({
                "success": False,
                "error": "No cached data available"
            }), 503

        # Return nodes data with minimal guest info (just IDs for count)
        nodes_data = {}
        for node_name, node in data.get("nodes", {}).items():
            nodes_data[node_name] = {
                **node,
                "guests": node.get("guests", [])  # Just keep guest IDs list
            }

        return jsonify({
            "success": True,
            "data": {
                "nodes": nodes_data,
                "collected_at": data.get("collected_at")
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests-only", methods=["GET"])
def get_guests_only():
    """Return only guest data for populating cluster map details"""
    try:
        data = read_cache()
        if data is None:
            return jsonify({
                "success": False,
                "error": "No cached data available"
            }), 503

        return jsonify({
            "success": True,
            "data": {
                "guests": data.get("guests", {}),
                "collected_at": data.get("collected_at")
            }
        })
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
        iowait_threshold = float(data.get("iowait_threshold", 30.0))
        maintenance_nodes = set(data.get("maintenance_nodes", []))

        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        try:
            recommendations = generate_recommendations(
                cache_data.get('nodes', {}),
                cache_data.get('guests', {}),
                cpu_threshold,
                mem_threshold,
                iowait_threshold,
                maintenance_nodes
            )
        except Exception as e:
            print(f"Error in generate_recommendations: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "error": f"Recommendation error: {str(e)}"}), 500

        # Calculate intelligent threshold suggestions
        threshold_suggestions = calculate_intelligent_thresholds(cache_data.get('nodes', {}))

        # AI Enhancement: If enabled, enhance recommendations with AI insights
        ai_enhanced = False
        config = load_config()
        if config.get('ai_recommendations_enabled', False):
            try:
                from ai_provider import get_ai_provider
                ai_provider = get_ai_provider()
                if ai_provider:
                    print(f"Enhancing {len(recommendations)} recommendations with AI insights...", file=sys.stderr)

                    # Call AI enhancement
                    enhancement_result = ai_provider.enhance_recommendations(
                        recommendations,
                        cache_data
                    )

                    if enhancement_result.get('success') and enhancement_result.get('insights'):
                        # Merge AI insights into recommendations
                        insights_by_vmid = {
                            insight['vmid']: insight
                            for insight in enhancement_result['insights']
                        }

                        for rec in recommendations:
                            vmid = rec['vmid']
                            if vmid in insights_by_vmid:
                                insight = insights_by_vmid[vmid]
                                rec['ai_insight'] = insight.get('insight', '')
                                rec['ai_confidence_adjustment'] = insight.get('confidence_adjustment', 0)

                                # Adjust confidence score based on AI feedback
                                if 'confidence_score' in rec:
                                    rec['confidence_score'] = max(0, min(100,
                                        rec['confidence_score'] + insight.get('confidence_adjustment', 0)
                                    ))

                        ai_enhanced = True
                        print(f"✓ AI enhancement complete: {len(enhancement_result['insights'])} insights added", file=sys.stderr)
                    else:
                        print(f"AI enhancement returned no insights", file=sys.stderr)
            except Exception as e:
                print(f"Warning: AI enhancement failed (continuing with algorithm-only): {str(e)}", file=sys.stderr)
                # Continue without AI enhancement - graceful degradation

        # Cache the recommendations result
        recommendations_cache = {
            "success": True,
            "recommendations": recommendations,
            "count": len(recommendations),
            "threshold_suggestions": threshold_suggestions,
            "ai_enhanced": ai_enhanced,
            "generated_at": datetime.utcnow().isoformat() + 'Z',
            "parameters": {
                "cpu_threshold": cpu_threshold,
                "mem_threshold": mem_threshold,
                "iowait_threshold": iowait_threshold,
                "maintenance_nodes": list(maintenance_nodes)
            }
        }

        # Save to cache file
        recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')
        try:
            with open(recommendations_cache_file, 'w') as f:
                json.dump(recommendations_cache, f, indent=2)
        except Exception as cache_err:
            print(f"Warning: Failed to cache recommendations: {cache_err}", file=sys.stderr)

        return jsonify(recommendations_cache)
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/recommendations", methods=["GET"])
def get_cached_recommendations():
    """Get cached recommendations without regenerating"""
    try:
        recommendations_cache_file = os.path.join(BASE_PATH, 'recommendations_cache.json')

        # Check if cache file exists
        if not os.path.exists(recommendations_cache_file):
            return jsonify({
                "success": False,
                "error": "No cached recommendations available. Please generate recommendations first.",
                "cache_missing": True
            }), 404

        # Read cached recommendations
        try:
            with open(recommendations_cache_file, 'r') as f:
                cached_data = json.load(f)

            return jsonify(cached_data)
        except Exception as read_err:
            print(f"Error reading recommendations cache: {read_err}", file=sys.stderr)
            return jsonify({
                "success": False,
                "error": "Failed to read cached recommendations",
                "cache_error": True
            }), 500

    except Exception as e:
        print(f"Error in get_cached_recommendations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/recommendations/threshold-suggestions", methods=["GET"])
def get_threshold_suggestions():
    """Get intelligent threshold suggestions based on cluster analysis"""
    try:
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        suggestions = calculate_intelligent_thresholds(cache_data.get('nodes', {}))

        return jsonify({
            "success": True,
            **suggestions
        })
    except Exception as e:
        print(f"Error in get_threshold_suggestions: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/node-scores", methods=["POST"])
def node_scores():
    """Calculate migration suitability scores for all nodes"""
    try:
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "No data available"}), 503

        # Get thresholds from request body
        req_data = request.get_json() or {}
        cpu_threshold = float(req_data.get("cpu_threshold", 60))
        mem_threshold = float(req_data.get("mem_threshold", 70))
        iowait_threshold = float(req_data.get("iowait_threshold", 15))
        maintenance_nodes = set(req_data.get("maintenance_nodes", []))

        nodes = cache_data.get('nodes', {})
        node_scores = {}

        # Use a dummy small guest for scoring (1 core, 1GB RAM)
        dummy_guest = {
            'cores': 1,
            'maxmem': 1073741824  # 1GB in bytes
        }

        for node_name, node in nodes.items():
            if node.get('status') != 'online':
                node_scores[node_name] = {
                    'score': 999999,
                    'suitability_rating': 0,
                    'suitable': False,
                    'reason': 'Node offline'
                }
                continue

            if node_name in maintenance_nodes:
                node_scores[node_name] = {
                    'score': 999999,
                    'suitability_rating': 0,
                    'suitable': False,
                    'reason': 'In maintenance mode'
                }
                continue

            # Calculate the actual score using the same function as recommendations
            # pending_target_guests is empty since we're just calculating base scores
            score = calculate_target_node_score(
                target_node=node,
                guest=dummy_guest,
                pending_target_guests={},
                cpu_threshold=cpu_threshold,
                mem_threshold=mem_threshold
            )

            # Get weighted metrics for display using configured weights
            metrics = node.get('metrics', {})
            immediate_cpu = metrics.get("current_cpu", 0)
            immediate_mem = metrics.get("current_mem", 0)

            short_cpu = metrics.get("avg_cpu", 0)
            short_mem = metrics.get("avg_mem", 0)

            long_cpu = metrics.get("avg_cpu_week", 0)
            long_mem = metrics.get("avg_mem_week", 0)

            # Use configured weights from penalty config
            penalty_cfg = load_penalty_config()
            weight_current = penalty_cfg.get("weight_current", 0.5)
            weight_24h = penalty_cfg.get("weight_24h", 0.3)
            weight_7d = penalty_cfg.get("weight_7d", 0.2)

            if metrics.get("has_historical"):
                weighted_cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
                weighted_mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
            else:
                weighted_cpu = immediate_cpu
                weighted_mem = immediate_mem

            # Determine suitability based on score thresholds
            # Lower scores are better migration targets
            if score < 50:
                suitable = True
                if score < 20:
                    reason = 'Excellent target'
                else:
                    reason = 'Good target'
            elif score < 100:
                suitable = True
                reason = 'Acceptable target'
            elif score < 200:
                suitable = False
                reason = 'Poor target'
            else:
                suitable = False
                # Determine primary issue for high scores
                if immediate_cpu > (cpu_threshold + 20):
                    reason = f'Very high current CPU ({immediate_cpu:.1f}%)'
                elif immediate_mem > (mem_threshold + 20):
                    reason = f'Very high current memory ({immediate_mem:.1f}%)'
                elif immediate_cpu > (cpu_threshold + 10):
                    reason = f'High current CPU ({immediate_cpu:.1f}%)'
                elif immediate_mem > (mem_threshold + 10):
                    reason = f'High current memory ({immediate_mem:.1f}%)'
                elif long_cpu > 90:
                    reason = f'Sustained high CPU ({long_cpu:.1f}% 7-day avg)'
                elif long_mem > 90:
                    reason = f'Sustained high memory ({long_mem:.1f}% 7-day avg)'
                elif weighted_cpu > cpu_threshold:
                    reason = f'CPU above threshold ({weighted_cpu:.1f}%)'
                elif weighted_mem > mem_threshold:
                    reason = f'Memory above threshold ({weighted_mem:.1f}%)'
                else:
                    reason = f'High penalty score'

            # Get additional metrics for display
            max_cpu_week = metrics.get("max_cpu_week", 0)
            max_mem_week = metrics.get("max_mem_week", 0)

            # Convert to suitability rating (0-100, higher is better)
            suitability_rating = round(max(0, 100 - min(score, 100)), 1)

            node_scores[node_name] = {
                'score': round(score, 2),
                'suitability_rating': suitability_rating,
                'suitable': suitable,
                'reason': reason,
                'weighted_cpu': round(weighted_cpu, 1),
                'weighted_mem': round(weighted_mem, 1),
                'current_cpu': round(immediate_cpu, 1),
                'current_mem': round(immediate_mem, 1),
                'max_cpu_week': round(max_cpu_week, 1),
                'max_mem_week': round(max_mem_week, 1)
            }

        return jsonify({
            "success": True,
            "scores": node_scores
        })
    except Exception as e:
        print(f"Error in node_scores: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def calculate_intelligent_thresholds(nodes: Dict) -> Dict:
    """
    Analyze cluster health and suggest optimal thresholds
    Returns suggested CPU and Memory thresholds based on cluster characteristics
    """
    if not nodes:
        return {
            "suggested_cpu_threshold": 60.0,
            "suggested_mem_threshold": 70.0,
            "confidence": "low",
            "reasoning": "Insufficient data for analysis"
        }

    # Collect metrics from all online nodes using 7-day averages for more stable analysis
    cpu_values = []
    mem_values = []
    iowait_values = []

    for node_name, node in nodes.items():
        if node.get("status") != "online":
            continue

        metrics = node.get("metrics", {})
        if metrics.get("has_historical"):
            # Prefer 7-day averages for more stable threshold suggestions
            cpu_values.append(metrics.get("avg_cpu_week") or metrics.get("avg_cpu", 0))
            mem_values.append(metrics.get("avg_mem_week") or metrics.get("avg_mem", 0))
            iowait_values.append(metrics.get("avg_iowait_week") or metrics.get("avg_iowait", 0))

    if not cpu_values or not mem_values:
        return {
            "suggested_cpu_threshold": 60.0,
            "suggested_mem_threshold": 70.0,
            "confidence": "low",
            "reasoning": "Insufficient historical data"
        }

    # Calculate cluster statistics
    avg_cpu = sum(cpu_values) / len(cpu_values)
    max_cpu = max(cpu_values)
    avg_mem = sum(mem_values) / len(mem_values)
    max_mem = max(mem_values)
    avg_iowait = sum(iowait_values) / len(iowait_values) if iowait_values else 0

    # Calculate standard deviation for load variance
    cpu_variance = sum((x - avg_cpu) ** 2 for x in cpu_values) / len(cpu_values)
    mem_variance = sum((x - avg_mem) ** 2 for x in mem_values) / len(mem_values)

    # Determine cluster characteristics
    node_count = len(cpu_values)

    # Better cluster size categories
    if node_count <= 2:
        cluster_size = "minimal"
        size_adjustment = -10  # Very conservative
    elif node_count <= 4:
        cluster_size = "small"
        size_adjustment = -5  # Conservative
    elif node_count <= 8:
        cluster_size = "medium"
        size_adjustment = 0  # Neutral
    elif node_count <= 16:
        cluster_size = "large"
        size_adjustment = 5  # More tolerant
    else:
        cluster_size = "xlarge"
        size_adjustment = 8  # Most tolerant

    # Calculate variance percentage (coefficient of variation)
    cpu_cv = (cpu_variance ** 0.5) / avg_cpu * 100 if avg_cpu > 0 else 0
    mem_cv = (mem_variance ** 0.5) / avg_mem * 100 if avg_mem > 0 else 0

    # Better balance detection
    is_balanced = cpu_cv < 30 and mem_cv < 30  # Coefficient of variation < 30%
    balance_status = "balanced" if is_balanced else "imbalanced"

    # More granular load detection
    if avg_cpu > 70 or avg_mem > 80:
        load_level = "very high"
        load_adjustment = 15  # Much more tolerant to avoid migration storms
    elif avg_cpu > 50 or avg_mem > 60:
        load_level = "high"
        load_adjustment = 10  # More tolerant
    elif avg_cpu > 30 or avg_mem > 40:
        load_level = "moderate"
        load_adjustment = 0  # Neutral
    else:
        load_level = "low"
        load_adjustment = -5  # Can be more aggressive

    # IOWait level detection
    if avg_iowait > 30:
        iowait_level = "critical"
        iowait_adjustment = -15
    elif avg_iowait > 20:
        iowait_level = "high"
        iowait_adjustment = -10
    elif avg_iowait > 10:
        iowait_level = "elevated"
        iowait_adjustment = -5
    else:
        iowait_level = "normal"
        iowait_adjustment = 0

    # Calculate intelligent thresholds
    # Base thresholds
    cpu_threshold = 60.0
    mem_threshold = 70.0
    iowait_threshold = 30.0

    # Build adjustments with detailed tracking
    adjustments = []

    # 1. Adjust for cluster size
    cpu_threshold += size_adjustment
    mem_threshold += size_adjustment
    iowait_threshold += size_adjustment
    adjustments.append({
        "factor": "Cluster Size",
        "value": f"{node_count} nodes ({cluster_size})",
        "adjustment": f"{size_adjustment:+.0f}%",
        "direction": "more tolerant" if size_adjustment > 0 else "more conservative" if size_adjustment < 0 else "neutral"
    })

    # 2. Adjust for load distribution balance
    balance_adjustment = 10 if is_balanced else -5
    cpu_threshold += balance_adjustment
    mem_threshold += balance_adjustment
    iowait_threshold += balance_adjustment // 2
    adjustments.append({
        "factor": "Load Balance",
        "value": f"{balance_status} (CPU variance: {cpu_cv:.1f}%, Mem variance: {mem_cv:.1f}%)",
        "adjustment": f"{balance_adjustment:+.0f}%",
        "direction": "less aggressive" if is_balanced else "more aggressive"
    })

    # 3. Adjust for overall cluster load
    cpu_threshold += load_adjustment
    mem_threshold += load_adjustment
    iowait_threshold += load_adjustment // 2
    adjustments.append({
        "factor": "Overall Load",
        "value": f"{load_level} (avg CPU: {avg_cpu:.1f}%, avg Memory: {avg_mem:.1f}%)",
        "adjustment": f"{load_adjustment:+.0f}%",
        "direction": "reduce churn" if load_adjustment > 0 else "can rebalance" if load_adjustment < 0 else "neutral"
    })

    # 4. Adjust for IOWait pressure
    cpu_threshold += iowait_adjustment // 3
    iowait_threshold += iowait_adjustment
    adjustments.append({
        "factor": "I/O Pressure",
        "value": f"{iowait_level} (avg IOWait: {avg_iowait:.1f}%)",
        "adjustment": f"{iowait_adjustment:+.0f}%",
        "direction": "address I/O contention" if iowait_adjustment < 0 else "I/O healthy"
    })

    # Clamp thresholds to reasonable ranges
    cpu_threshold = max(40, min(85, cpu_threshold))
    mem_threshold = max(50, min(90, mem_threshold))
    iowait_threshold = max(15, min(40, iowait_threshold))

    # Determine confidence based on data quality
    confidence = "high" if len(cpu_values) >= 3 and all(m.get("has_historical") for m in [n.get("metrics", {}) for n in nodes.values()]) else "medium"

    # Build summary reasoning
    summary = f"{cluster_size.capitalize()} cluster ({node_count} nodes), {balance_status} load, {load_level} utilization, {iowait_level} I/O"

    # Determine analysis period based on available data
    has_week_data = any(n.get("metrics", {}).get("avg_cpu_week") for n in nodes.values())
    analysis_period = "7 days" if has_week_data else "24 hours"

    return {
        "suggested_cpu_threshold": round(cpu_threshold, 1),
        "suggested_mem_threshold": round(mem_threshold, 1),
        "suggested_iowait_threshold": round(iowait_threshold, 1),
        "confidence": confidence,
        "summary": summary,
        "analysis_period": analysis_period,
        "adjustments": adjustments,
        "cluster_stats": {
            "node_count": node_count,
            "cluster_size": cluster_size,
            "avg_cpu": round(avg_cpu, 1),
            "max_cpu": round(max_cpu, 1),
            "avg_mem": round(avg_mem, 1),
            "max_mem": round(max_mem, 1),
            "avg_iowait": round(avg_iowait, 1),
            "cpu_variance": round(cpu_cv, 1),
            "mem_variance": round(mem_cv, 1),
            "balance_status": balance_status,
            "load_level": load_level,
            "iowait_level": iowait_level
        }
    }


def calculate_node_health_score(node: Dict, metrics: Dict) -> float:
    """
    Calculate comprehensive health score for a node (0-100, lower is better/healthier)
    Considers CPU, Memory, IOWait, Load Average, and Storage pressure
    Uses configured time period weights
    """
    # Load penalty config to get time period weights
    penalty_cfg = load_penalty_config()
    weight_current = penalty_cfg.get("weight_current", 0.5)
    weight_24h = penalty_cfg.get("weight_24h", 0.3)
    weight_7d = penalty_cfg.get("weight_7d", 0.2)

    # Get metrics at different time scales
    immediate_cpu = metrics.get("current_cpu", 0)
    immediate_mem = metrics.get("current_mem", 0)
    immediate_iowait = metrics.get("current_iowait", 0)

    short_cpu = metrics.get("avg_cpu", 0)
    short_mem = metrics.get("avg_mem", 0)
    short_iowait = metrics.get("avg_iowait", 0)

    long_cpu = metrics.get("avg_cpu_week", 0)
    long_mem = metrics.get("avg_mem_week", 0)
    long_iowait = metrics.get("avg_iowait_week", 0)

    # Calculate weighted metrics using configured weights
    if metrics.get("has_historical"):
        cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
        mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
        iowait = (immediate_iowait * weight_current) + (short_iowait * weight_24h) + (long_iowait * weight_7d)
    else:
        cpu = immediate_cpu
        mem = immediate_mem
        iowait = immediate_iowait

    load = metrics.get("avg_load", 0)
    cores = node.get("cpu_cores", 1)

    # Normalize load average by core count (load per core)
    load_per_core = (load / cores) * 100 if cores > 0 else 0

    # Storage pressure score (average usage across all storage)
    storage_pressure = 0
    storage_list = node.get("storage", [])
    if storage_list:
        storage_usages = [s.get("usage_pct", 0) for s in storage_list if s.get("active", False)]
        storage_pressure = sum(storage_usages) / len(storage_usages) if storage_usages else 0

    # Weighted health score
    # CPU: 30%, Memory: 30%, IOWait: 20%, Load: 10%, Storage: 10%
    health_score = (
        cpu * 0.30 +
        mem * 0.30 +
        iowait * 0.20 +
        load_per_core * 0.10 +
        storage_pressure * 0.10
    )

    return health_score


def predict_post_migration_load(node: Dict, guest: Dict, adding: bool = True) -> Dict:
    """
    Predict node load after adding or removing a guest
    Returns predicted CPU%, Memory%, and IOWait%
    Uses configured time period weights
    """
    metrics = node.get("metrics", {})

    # Load penalty config to get time period weights
    penalty_cfg = load_penalty_config()
    weight_current = penalty_cfg.get("weight_current", 0.5)
    weight_24h = penalty_cfg.get("weight_24h", 0.3)
    weight_7d = penalty_cfg.get("weight_7d", 0.2)

    # Get metrics at different time scales
    immediate_cpu = metrics.get("current_cpu", 0)
    immediate_mem = metrics.get("current_mem", 0)
    immediate_iowait = metrics.get("current_iowait", 0)

    short_cpu = metrics.get("avg_cpu", 0)
    short_mem = metrics.get("avg_mem", 0)
    short_iowait = metrics.get("avg_iowait", 0)

    long_cpu = metrics.get("avg_cpu_week", 0)
    long_mem = metrics.get("avg_mem_week", 0)
    long_iowait = metrics.get("avg_iowait_week", 0)

    # Calculate weighted current state using configured weights
    if metrics.get("has_historical"):
        current_cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
        current_mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
        current_iowait = (immediate_iowait * weight_current) + (short_iowait * weight_24h) + (long_iowait * weight_7d)
    else:
        current_cpu = immediate_cpu
        current_mem = immediate_mem
        current_iowait = immediate_iowait

    # Guest resource usage
    guest_cpu = guest.get("cpu_current", 0)  # Percentage of guest's allocated CPUs
    guest_mem_gb = guest.get("mem_used_gb", 0)
    guest_disk_io = (guest.get("disk_read_bps", 0) + guest.get("disk_write_bps", 0)) / (1024**2)  # MB/s

    # Node capacity
    node_total_mem_gb = node.get("total_mem_gb", 1)
    node_cores = node.get("cpu_cores", 1)

    # Estimate guest's contribution to node CPU (guest uses X% of its cores)
    guest_cpu_cores = guest.get("cpu_cores", 1)
    guest_cpu_impact = (guest_cpu * guest_cpu_cores / node_cores) if node_cores > 0 else 0

    # Estimate guest's memory impact
    guest_mem_impact = (guest_mem_gb / node_total_mem_gb * 100) if node_total_mem_gb > 0 else 0

    # Estimate IOWait impact (rough heuristic: high disk I/O contributes to IOWait)
    # Assume 100 MB/s disk I/O = ~5% IOWait contribution
    guest_iowait_impact = min(guest_disk_io / 100 * 5, 20)  # Cap at 20%

    # Calculate predicted load
    if adding:
        predicted_cpu = current_cpu + guest_cpu_impact
        predicted_mem = current_mem + guest_mem_impact
        predicted_iowait = current_iowait + guest_iowait_impact
    else:
        predicted_cpu = max(0, current_cpu - guest_cpu_impact)
        predicted_mem = max(0, current_mem - guest_mem_impact)
        predicted_iowait = max(0, current_iowait - guest_iowait_impact)

    return {
        "cpu": min(predicted_cpu, 100),
        "mem": min(predicted_mem, 100),
        "iowait": min(predicted_iowait, 100)
    }


def calculate_target_node_score(target_node: Dict, guest: Dict, pending_target_guests: Dict, cpu_threshold: float, mem_threshold: float) -> float:
    """
    Calculate weighted score for target node suitability (lower is better)
    Considers current load, predicted post-migration load, storage availability, and headroom
    """
    target_name = target_node.get("name")
    metrics = target_node.get("metrics", {})

    # Load penalty configuration
    penalty_cfg = load_penalty_config()

    # Weighted time-based scoring: configurable weights from penalty config
    # This balances responsiveness with stability
    immediate_cpu = metrics.get("current_cpu", 0)
    immediate_mem = metrics.get("current_mem", 0)
    immediate_iowait = metrics.get("current_iowait", 0)

    short_cpu = metrics.get("avg_cpu", 0)  # 24-hour average
    short_mem = metrics.get("avg_mem", 0)
    short_iowait = metrics.get("avg_iowait", 0)

    long_cpu = metrics.get("avg_cpu_week", 0)  # 7-day average
    long_mem = metrics.get("avg_mem_week", 0)
    long_iowait = metrics.get("avg_iowait_week", 0)

    # Calculate weighted scores using configurable weights
    weight_current = penalty_cfg.get("weight_current", 0.5)
    weight_24h = penalty_cfg.get("weight_24h", 0.3)
    weight_7d = penalty_cfg.get("weight_7d", 0.2)

    if metrics.get("has_historical"):
        current_cpu = (immediate_cpu * weight_current) + (short_cpu * weight_24h) + (long_cpu * weight_7d)
        current_mem = (immediate_mem * weight_current) + (short_mem * weight_24h) + (long_mem * weight_7d)
        current_iowait = (immediate_iowait * weight_current) + (short_iowait * weight_24h) + (long_iowait * weight_7d)
    else:
        # No historical data, use current only
        current_cpu = immediate_cpu
        current_mem = immediate_mem
        current_iowait = immediate_iowait

    # Get max values over the week to avoid migrating to nodes that spike
    max_cpu_week = metrics.get("max_cpu_week", metrics.get("max_cpu", 0))
    max_mem_week = metrics.get("max_mem_week", metrics.get("max_mem", 0))

    # Consider trends - penalize nodes with rising load
    cpu_trend = metrics.get("cpu_trend", "stable")
    mem_trend = metrics.get("mem_trend", "stable")

    # Initialize penalty accumulator
    penalties = 0

    # Get configurable threshold offsets
    cpu_offset_1 = penalty_cfg.get("cpu_threshold_offset_1", 10)
    cpu_offset_2 = penalty_cfg.get("cpu_threshold_offset_2", 20)
    mem_offset_1 = penalty_cfg.get("mem_threshold_offset_1", 10)
    mem_offset_2 = penalty_cfg.get("mem_threshold_offset_2", 20)

    # Current load penalty - heavily penalize nodes with high current load
    if immediate_cpu > (cpu_threshold + cpu_offset_2):
        penalties += penalty_cfg.get("cpu_extreme_penalty", 100)  # Extreme current CPU load
    elif immediate_cpu > (cpu_threshold + cpu_offset_1):
        penalties += penalty_cfg.get("cpu_very_high_penalty", 50)   # Very high current CPU load
    elif immediate_cpu > cpu_threshold:
        penalties += penalty_cfg.get("cpu_high_penalty", 20)   # High current CPU load

    if immediate_mem > (mem_threshold + mem_offset_2):
        penalties += penalty_cfg.get("mem_extreme_penalty", 100)  # Extreme current memory load
    elif immediate_mem > (mem_threshold + mem_offset_1):
        penalties += penalty_cfg.get("mem_very_high_penalty", 50)   # Very high current memory load
    elif immediate_mem > mem_threshold:
        penalties += penalty_cfg.get("mem_high_penalty", 20)   # High current memory load

    # Sustained load penalty - penalize sustained high averages
    # Sustained load penalties - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if long_cpu > 90:
            penalties += penalty_cfg.get("cpu_sustained_critical", 150)  # Critically high sustained CPU
        elif long_cpu > 80:
            penalties += penalty_cfg.get("cpu_sustained_very_high", 80)   # Very high sustained CPU
        elif long_cpu > 70:
            penalties += penalty_cfg.get("cpu_sustained_high", 40)   # High sustained CPU

        if long_mem > 90:
            penalties += penalty_cfg.get("mem_sustained_critical", 150)  # Critically high sustained memory
        elif long_mem > 80:
            penalties += penalty_cfg.get("mem_sustained_very_high", 80)   # Very high sustained memory
        elif long_mem > 70:
            penalties += penalty_cfg.get("mem_sustained_high", 40)   # High sustained memory

    # IOWait penalty - penalize high disk wait times (current always applies)
    if immediate_iowait > 30:
        penalties += penalty_cfg.get("iowait_extreme_penalty", 80)   # Extreme current IOWait
    elif immediate_iowait > 20:
        penalties += penalty_cfg.get("iowait_very_high_penalty", 40)   # Very high current IOWait
    elif immediate_iowait > 10:
        penalties += penalty_cfg.get("iowait_high_penalty", 20)   # High current IOWait

    # Sustained IOWait penalties - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if long_iowait > 20:
            penalties += penalty_cfg.get("iowait_sustained_critical", 60)   # Critically high sustained IOWait
        elif long_iowait > 15:
            penalties += penalty_cfg.get("iowait_sustained_high", 30)   # High sustained IOWait
        elif long_iowait > 10:
            penalties += penalty_cfg.get("iowait_sustained_elevated", 15)   # Elevated sustained IOWait

    # Trend penalty - only apply if using historical data (24h or 7d weights > 0)
    if weight_24h > 0 or weight_7d > 0:
        if cpu_trend == "rising":
            penalties += penalty_cfg.get("cpu_trend_rising_penalty", 15)  # Rising CPU trend
        if mem_trend == "rising":
            penalties += penalty_cfg.get("mem_trend_rising_penalty", 15)  # Rising memory trend

    # Max spike penalty - only apply if using weekly historical data (7d weight > 0)
    if weight_7d > 0:
        if max_cpu_week > 95:
            penalties += penalty_cfg.get("cpu_spike_extreme", 30)  # Extreme CPU spike
        elif max_cpu_week > 90:
            penalties += penalty_cfg.get("cpu_spike_very_high", 20)  # Very high CPU spike
        elif max_cpu_week > 80:
            penalties += penalty_cfg.get("cpu_spike_high", 10)  # High CPU spike
        elif max_cpu_week > 70:
            penalties += penalty_cfg.get("cpu_spike_moderate", 5)   # Moderate CPU spike

        if max_mem_week > 95:
            penalties += penalty_cfg.get("mem_spike_extreme", 30)  # Extreme memory spike
        elif max_mem_week > 90:
            penalties += penalty_cfg.get("mem_spike_very_high", 20)  # Very high memory spike
        elif max_mem_week > 85:
            penalties += penalty_cfg.get("mem_spike_high", 10)  # High memory spike
        elif max_mem_week > 75:
            penalties += penalty_cfg.get("mem_spike_moderate", 5)   # Moderate memory spike

    # Predict post-migration load
    predicted = predict_post_migration_load(target_node, guest, adding=True)

    # Account for pending migrations to this target
    if target_name in pending_target_guests:
        for pending_guest in pending_target_guests[target_name]:
            predicted = predict_post_migration_load(
                {"metrics": {"current_cpu": predicted["cpu"], "current_mem": predicted["mem"], "current_iowait": predicted["iowait"]},
                 "total_mem_gb": target_node.get("total_mem_gb", 1),
                 "cpu_cores": target_node.get("cpu_cores", 1)},
                pending_guest,
                adding=True
            )

    # Penalize if predicted load exceeds thresholds (don't disqualify)
    if predicted["cpu"] > (cpu_threshold + cpu_offset_2):
        penalties += penalty_cfg.get("predicted_cpu_extreme_penalty", 100)  # Predicted CPU way over threshold
    elif predicted["cpu"] > (cpu_threshold + cpu_offset_1):
        penalties += penalty_cfg.get("predicted_cpu_high_penalty", 50)   # Predicted CPU significantly over threshold
    elif predicted["cpu"] > cpu_threshold:
        penalties += penalty_cfg.get("predicted_cpu_over_penalty", 25)   # Predicted CPU over threshold

    if predicted["mem"] > (mem_threshold + mem_offset_2):
        penalties += penalty_cfg.get("predicted_mem_extreme_penalty", 100)  # Predicted memory way over threshold
    elif predicted["mem"] > (mem_threshold + mem_offset_1):
        penalties += penalty_cfg.get("predicted_mem_high_penalty", 50)   # Predicted memory significantly over threshold
    elif predicted["mem"] > mem_threshold:
        penalties += penalty_cfg.get("predicted_mem_over_penalty", 25)   # Predicted memory over threshold

    # Health score (current state)
    health_score = calculate_node_health_score(target_node, metrics)

    # Predicted health after migration
    predicted_health = (
        predicted["cpu"] * 0.30 +
        predicted["mem"] * 0.30 +
        predicted["iowait"] * 0.20 +
        current_cpu * 0.10 +  # Factor in current state
        current_mem * 0.10
    )

    # Headroom score (how much capacity remains) - prefer nodes with more headroom
    cpu_headroom = 100 - predicted["cpu"]
    mem_headroom = 100 - predicted["mem"]
    headroom_score = 100 - (cpu_headroom * 0.5 + mem_headroom * 0.5)  # Lower = more headroom

    # Storage availability score
    storage_score = 0
    storage_list = target_node.get("storage", [])
    if storage_list:
        # Prefer nodes with more available storage
        avg_storage_usage = sum(s.get("usage_pct", 0) for s in storage_list if s.get("active", False)) / len(storage_list) if storage_list else 0
        storage_score = avg_storage_usage  # Lower = more available

    # Combined weighted score (lower is better)
    # Current health: 25%, Predicted health: 40%, Headroom: 20%, Storage: 15%
    # Plus all accumulated penalties (current load, sustained load, trends, spikes, predicted)
    total_score = (
        health_score * 0.25 +
        predicted_health * 0.40 +
        headroom_score * 0.20 +
        storage_score * 0.15 +
        penalties  # All accumulated penalties
    )

    return total_score


def select_guests_to_migrate(node: Dict, guests: Dict, cpu_threshold: float, mem_threshold: float, overload_reason: str) -> List[str]:
    """
    Intelligently select which guests to migrate from an overloaded node
    Uses knapsack-style algorithm to minimize migrations while resolving overload
    """
    node_name = node.get("name")
    metrics = node.get("metrics", {})

    # Calculate how much we need to reduce
    current_cpu = metrics.get("avg_cpu", 0) if metrics.get("has_historical") else metrics.get("current_cpu", 0)
    current_mem = metrics.get("avg_mem", 0) if metrics.get("has_historical") else metrics.get("current_mem", 0)
    current_iowait = metrics.get("avg_iowait", 0) if metrics.get("has_historical") else metrics.get("current_iowait", 0)

    # Special handling for maintenance: evacuate all guests
    if overload_reason == "maintenance":
        # For maintenance mode, set very high reduction targets to evacuate everything
        cpu_reduction_needed = 999999
        mem_reduction_needed = 999999
    else:
        # Target reduction (get back below threshold with 10% buffer)
        cpu_reduction_needed = max(0, current_cpu - (cpu_threshold - 10))
        mem_reduction_needed = max(0, current_mem - (mem_threshold - 10))

    # Build candidate list with impact scores
    candidates = []
    for vmid in node.get("guests", []):
        vmid_key = str(vmid) if str(vmid) in guests else vmid
        if vmid_key not in guests:
            continue

        guest = guests[vmid_key]

        # Skip stopped guests
        if guest.get("status") != "running":
            continue

        # For maintenance mode, ignore tags and HA status (evacuation is priority)
        if overload_reason != "maintenance":
            # Skip ignored guests and HA-managed guests (only when NOT in maintenance)
            if guest.get("tags", {}).get("has_ignore", False):
                continue
            if guest.get("ha_managed", False):
                continue  # Don't recommend migrating HA-managed guests

        # Calculate guest's impact on node resources
        guest_cpu_cores = guest.get("cpu_cores", 1)
        guest_cpu_usage = guest.get("cpu_current", 0)
        node_cores = node.get("cpu_cores", 1)
        cpu_impact = (guest_cpu_usage * guest_cpu_cores / node_cores) if node_cores > 0 else 0

        guest_mem_gb = guest.get("mem_used_gb", 0)
        node_mem_gb = node.get("total_mem_gb", 1)
        mem_impact = (guest_mem_gb / node_mem_gb * 100) if node_mem_gb > 0 else 0

        # Calculate migration cost (prefer smaller, less active guests)
        disk_io_mbps = (guest.get("disk_read_bps", 0) + guest.get("disk_write_bps", 0)) / (1024**2)
        migration_cost = guest.get("mem_max_gb", 0) + (disk_io_mbps / 10)  # Factor in I/O activity

        # Efficiency score: impact per migration cost (higher is better)
        if overload_reason == "cpu":
            efficiency = cpu_impact / migration_cost if migration_cost > 0 else 0
        elif overload_reason == "mem":
            efficiency = mem_impact / migration_cost if migration_cost > 0 else 0
        else:
            efficiency = (cpu_impact + mem_impact) / (2 * migration_cost) if migration_cost > 0 else 0

        candidates.append({
            "vmid_key": vmid_key,
            "guest": guest,
            "cpu_impact": cpu_impact,
            "mem_impact": mem_impact,
            "migration_cost": migration_cost,
            "efficiency": efficiency
        })

    # Sort by efficiency (highest efficiency first)
    candidates.sort(key=lambda x: x["efficiency"], reverse=True)

    # Greedy selection: pick guests until we've reduced load enough
    selected = []
    cpu_reduction = 0
    mem_reduction = 0

    for candidate in candidates:
        # For maintenance mode, don't stop early - evacuate ALL guests
        if overload_reason != "maintenance":
            if overload_reason == "cpu" and cpu_reduction >= cpu_reduction_needed:
                break
            if overload_reason == "mem" and mem_reduction >= mem_reduction_needed:
                break
            if overload_reason not in ["cpu", "mem"] and (cpu_reduction >= cpu_reduction_needed and mem_reduction >= mem_reduction_needed):
                break

        selected.append(candidate["vmid_key"])
        cpu_reduction += candidate["cpu_impact"]
        mem_reduction += candidate["mem_impact"]

        # Limit to 5 migrations per node (skip limit for maintenance mode)
        if overload_reason != "maintenance" and len(selected) >= 5:
            break

    return selected


def build_storage_cache(nodes: Dict, proxmox) -> Dict[str, set]:
    """
    Build a cache of available storage for all nodes.

    Args:
        nodes: Dictionary of nodes
        proxmox: ProxmoxAPI client

    Returns:
        Dictionary mapping node names to sets of available storage IDs
    """
    storage_cache = {}

    if not proxmox:
        return storage_cache

    for node_name in nodes:
        try:
            storage_list = proxmox.nodes(node_name).storage.get()
            available_storage = set()
            for storage in storage_list:
                if storage.get('enabled', 1) and storage.get('active', 0):
                    available_storage.add(storage.get('storage'))
            storage_cache[node_name] = available_storage
            print(f"Cached {len(available_storage)} storage volumes for node {node_name}", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not get storage for node {node_name}: {e}", file=sys.stderr)
            storage_cache[node_name] = set()

    return storage_cache


def check_storage_compatibility(guest: Dict, src_node_name: str, tgt_node_name: str, proxmox, storage_cache: Dict[str, set] = None) -> bool:
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
        storage_volumes = set()
        for key, value in guest_config.items():
            # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
            if any(key.startswith(prefix) for prefix in ['scsi', 'ide', 'virtio', 'sata', 'mp', 'rootfs']):
                # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                if isinstance(value, str) and ':' in value:
                    storage_id = value.split(':')[0]
                    storage_volumes.add(storage_id)

        if not storage_volumes:
            return True  # No storage requirements, allow migration

        # Get target node storage (use cache if available, otherwise query API)
        available_storage = set()
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
        import traceback
        traceback.print_exc()
        return True  # Allow migration on error to avoid blocking valid migrations


def calculate_node_guest_counts(nodes: Dict, guests: Dict) -> Dict[str, int]:
    """
    Calculate the number of running guests on each node.

    Args:
        nodes: Dictionary of node data
        guests: Dictionary of guest data

    Returns:
        Dictionary mapping node names to running guest counts
    """
    guest_counts = {}

    # Initialize all nodes with 0 counts
    for node_name in nodes.keys():
        guest_counts[node_name] = 0

    # Count running guests per node
    for guest_id, guest in guests.items():
        if guest.get('status') == 'running':
            node = guest.get('node')
            if node in guest_counts:
                guest_counts[node] += 1

    return guest_counts


def find_distribution_candidates(
    nodes: Dict,
    guests: Dict,
    guest_count_threshold: int = 2,
    max_cpu_cores: int = 2,
    max_memory_gb: int = 4
) -> List[Dict]:
    """
    Find small guests on overloaded nodes that could be migrated for distribution balancing.

    Args:
        nodes: Dictionary of node data
        guests: Dictionary of guest data
        guest_count_threshold: Minimum difference in guest counts to trigger balancing
        max_cpu_cores: Maximum CPU cores for a guest to be considered (0 = no limit)
        max_memory_gb: Maximum memory in GB for a guest to be considered (0 = no limit)

    Returns:
        List of candidate dictionaries with guest and migration details
    """
    guest_counts = calculate_node_guest_counts(nodes, guests)

    # Find nodes with max and min guest counts
    if not guest_counts:
        return []

    max_count = max(guest_counts.values())
    min_count = min(guest_counts.values())

    # Only proceed if difference exceeds threshold
    if (max_count - min_count) < guest_count_threshold:
        return []

    # Find overloaded and underloaded nodes
    overloaded_nodes = [node for node, count in guest_counts.items() if count == max_count]
    underloaded_nodes = [node for node, count in guest_counts.items() if count == min_count]

    if not overloaded_nodes or not underloaded_nodes:
        return []

    candidates = []

    # Find small guests on overloaded nodes
    for guest_id, guest in guests.items():
        if guest.get('status') != 'running':
            continue

        current_node = guest.get('node')
        if current_node not in overloaded_nodes:
            continue

        # Skip guests with ignore tag
        tags = guest.get('tags', {})
        if isinstance(tags, dict) and tags.get('has_ignore', False):
            print(f"Skipping {guest_id} ({guest.get('name')}) - has ignore tag", file=sys.stderr)
            continue

        # Check guest size constraints
        # Try both field names for compatibility with different cache formats
        cpu_cores = guest.get('cpu_cores', guest.get('maxcpu', 0))

        # Try mem_max_gb first, then fall back to maxmem in bytes
        memory_gb = guest.get('mem_max_gb', 0)
        if memory_gb == 0:
            memory_bytes = guest.get('maxmem', 0)
            memory_gb = memory_bytes / (1024**3) if memory_bytes > 0 else 0

        # Apply size filters (0 means no limit)
        if max_cpu_cores > 0 and cpu_cores > max_cpu_cores:
            print(f"Skipping {guest_id} ({guest.get('name')}) - CPU cores {cpu_cores} > {max_cpu_cores}", file=sys.stderr)
            continue
        if max_memory_gb > 0 and memory_gb > max_memory_gb:
            print(f"Skipping {guest_id} ({guest.get('name')}) - Memory {memory_gb:.2f} GB > {max_memory_gb} GB", file=sys.stderr)
            continue

        # This guest is a candidate for distribution balancing
        for target_node in underloaded_nodes:
            if target_node == current_node:
                continue

            candidates.append({
                'guest_id': guest_id,
                'guest_name': guest.get('name', f'VM {guest_id}'),
                'guest_type': guest.get('type', 'unknown'),
                'source_node': current_node,
                'target_node': target_node,
                'source_count': guest_counts[current_node],
                'target_count': guest_counts[target_node],
                'cpu_cores': cpu_cores,
                'memory_gb': round(memory_gb, 2),
                'reason': f"⚖️ DISTRIBUTION BALANCING: {current_node} ({guest_counts[current_node]} guests) → {target_node} ({guest_counts[target_node]} guests)"
            })

    return candidates


def generate_recommendations(nodes: Dict, guests: Dict, cpu_threshold: float = 60.0, mem_threshold: float = 70.0, iowait_threshold: float = 30.0, maintenance_nodes: set = None) -> List[Dict]:
    """
    Generate intelligent migration recommendations using pure score-based analysis

    Pure score-based approach:
    - Calculates suitability score for each guest on its current node
    - Calculates suitability score for each guest on all potential target nodes
    - Recommends migration if score improvement is significant (>min_score_improvement points, default 15)
    - No arbitrary thresholds - uses penalty-based scoring system

    Scoring factors (lower score = better):
    - Current load (CPU, Memory, IOWait) - weighted 50% current, 30% 24h, 20% 7d
    - Predicted load after migration
    - Historical trends (rising/falling)
    - Load spikes and sustained high load
    - Storage compatibility
    - Anti-affinity rules
    - Maintenance mode (priority evacuation)

    Thresholds are only used internally by calculate_target_node_score for reference
    """
    if maintenance_nodes is None:
        maintenance_nodes = set()

    recommendations = []
    pending_target_guests = {}

    # Get Proxmox client for storage compatibility checks
    proxmox = None
    storage_cache = {}
    try:
        from proxmoxer import ProxmoxAPI
        config = load_config()

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if token_id and token_secret:
            user, token_name = token_id.split('!', 1)
            proxmox = ProxmoxAPI(
                proxmox_host,
                user=user,
                token_name=token_name,
                token_value=token_secret,
                port=proxmox_port,
                verify_ssl=verify_ssl
            )

            # Build storage cache once for all compatibility checks (major performance boost!)
            print(f"Building storage cache for {len(nodes)} nodes...", file=sys.stderr)
            storage_cache = build_storage_cache(nodes, proxmox)
            print(f"✓ Storage cache built for {len(storage_cache)} nodes", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Could not initialize Proxmox client for storage checks: {e}", file=sys.stderr)

    # Load penalty configuration
    penalty_cfg = load_penalty_config()

    # Minimum score improvement required to recommend migration (in points)
    MIN_SCORE_IMPROVEMENT = penalty_cfg.get("min_score_improvement", 15)

    # Maintenance nodes get priority evacuation regardless of score
    MAINTENANCE_SCORE_BOOST = penalty_cfg.get("maintenance_score_boost", 100)  # Extra improvement to prioritize evacuation

    # Step 1: Calculate current score for each guest on its current node
    # Step 2: Calculate potential scores on all other nodes
    # Step 3: Recommend migration if score improvement is significant

    # Create list of all migration candidates sorted by potential benefit
    migration_candidates = []

    for vmid_key, guest in guests.items():
        try:
            src_node_name = guest.get("node")
            if not src_node_name or src_node_name not in nodes:
                continue

            src_node = nodes[src_node_name]
            if src_node.get("status") != "online":
                continue

            # Skip guests with ignore tag (unless on maintenance node)
            if guest.get("tags", {}).get("has_ignore", False) and src_node_name not in maintenance_nodes:
                continue

            # Skip HA-managed guests (unless on maintenance node)
            if guest.get("ha_managed", False) and src_node_name not in maintenance_nodes:
                continue

            # Skip stopped guests (unless on maintenance node)
            if guest.get("status") != "running" and src_node_name not in maintenance_nodes:
                continue

            # Skip guests with passthrough disks (hardware-bound, cannot migrate)
            local_disk_info = guest.get("local_disks", {})
            if local_disk_info.get("is_pinned", False):
                # Passthrough disks cannot be migrated even for maintenance
                continue

            # Check for bind mounts on containers
            has_bind_mount = False
            bind_mount_warning = None
            if guest.get("type") == "CT":
                mount_info = guest.get("mount_points", {})

                # Only skip if container has UNSHARED bind mounts
                # Shared bind mounts (shared=1) can be migrated if path exists on target
                if mount_info.get("has_unshared_bind_mount", False):
                    has_bind_mount = True
                    mount_points = mount_info.get("mount_points", [])
                    unshared_bind_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and not mp.get("is_shared", False)]
                    bind_paths = [mp.get("source", "") for mp in unshared_bind_mounts]
                    bind_mount_warning = f"Container has {len(unshared_bind_mounts)} unshared bind mount(s): {', '.join(bind_paths[:2])}{'...' if len(bind_paths) > 2 else ''}. Migration requires --restart --force and manual path verification on target node."

                    # Skip CTs with unshared bind mounts (unless on maintenance node where evacuation is priority)
                    if src_node_name not in maintenance_nodes:
                        continue

                # For shared bind mounts, add informational note but allow migration
                elif mount_info.get("has_shared_mount", False):
                    mount_points = mount_info.get("mount_points", [])
                    shared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and mp.get("is_shared", False)]
                    if shared_mounts:
                        shared_paths = [mp.get("source", "") for mp in shared_mounts]
                        bind_mount_warning = f"Container has {len(shared_mounts)} shared bind mount(s): {', '.join(shared_paths[:2])}{'...' if len(shared_paths) > 2 else ''}. Ensure paths exist on target node."

            # Calculate current score (how well current node suits this guest)
            current_score = calculate_target_node_score(src_node, guest, {}, cpu_threshold, mem_threshold)

            # For maintenance nodes, artificially inflate current score to prioritize evacuation
            if src_node_name in maintenance_nodes:
                current_score += MAINTENANCE_SCORE_BOOST

            # Find best alternative target
            best_target = None
            best_target_score = 999999

            for tgt_name, tgt_node in nodes.items():
                try:
                    # Skip same node, offline nodes, and maintenance nodes
                    if tgt_name == src_node_name or tgt_node.get("status") != "online" or tgt_name in maintenance_nodes:
                        continue

                    # Check for anti-affinity conflicts
                    conflict = False
                    if guest.get("tags", {}).get("exclude_groups", []):
                        for other_vmid in tgt_node.get("guests", []):
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

                        # Check conflicts with pending migrations
                        if not conflict and tgt_name in pending_target_guests:
                            for pending_guest in pending_target_guests[tgt_name]:
                                for excl_group in guest["tags"]["exclude_groups"]:
                                    if excl_group in pending_guest.get("tags", {}).get("all_tags", []):
                                        conflict = True
                                        break
                                if conflict:
                                    break

                    if conflict:
                        continue

                    # Check storage compatibility (skip target if storage is incompatible)
                    if proxmox and not check_storage_compatibility(guest, src_node_name, tgt_name, proxmox, storage_cache):
                        continue

                    # Calculate target suitability score
                    score = calculate_target_node_score(tgt_node, guest, pending_target_guests, cpu_threshold, mem_threshold)

                    if score < best_target_score:
                        best_target_score = score
                        best_target = tgt_name

                except Exception as e:
                    print(f"Error evaluating target {tgt_name} for guest {vmid_key}: {str(e)}", file=sys.stderr)
                    import traceback
                    traceback.print_exc()
                    continue

            # Calculate score improvement
            score_improvement = current_score - best_target_score

            # Only recommend if improvement is significant
            if best_target and score_improvement >= MIN_SCORE_IMPROVEMENT:
                migration_candidates.append({
                    "vmid": vmid_key,
                    "guest": guest,
                    "source_node": src_node_name,
                    "target_node": best_target,
                    "current_score": current_score,
                    "target_score": best_target_score,
                    "improvement": score_improvement,
                    "is_maintenance": src_node_name in maintenance_nodes
                })

                # Track pending migration IMMEDIATELY so next guest evaluation considers it
                if best_target not in pending_target_guests:
                    pending_target_guests[best_target] = []
                pending_target_guests[best_target].append(guest)

        except Exception as e:
            print(f"Error analyzing guest {vmid_key}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            continue

    # Sort candidates by improvement (best first), prioritizing maintenance evacuations
    migration_candidates.sort(key=lambda x: (not x["is_maintenance"], -x["improvement"]))

    # Build final recommendations from candidates
    for candidate in migration_candidates:
        try:
            vmid_key = candidate["vmid"]
            guest = candidate["guest"]
            src_node_name = candidate["source_node"]
            best_target = candidate["target_node"]
            best_score = candidate["target_score"]
            score_improvement = candidate["improvement"]

            cmd_type = "qm" if guest.get("type") == "VM" else "pct"
            cmd_flag = "--online" if guest.get("type") == "VM" else "--restart"
            vmid_int = int(vmid_key) if isinstance(vmid_key, str) else vmid_key

            # Generate reason based on primary benefit
            if candidate["is_maintenance"]:
                reason = f"Node maintenance - evacuating {src_node_name}"
            else:
                src_metrics = nodes[src_node_name].get("metrics", {})
                tgt_metrics = nodes[best_target].get("metrics", {})

                # Use configured weights for metrics
                config = load_config()
                weight_current = config.get('automated_migrations', {}).get('weight_config', {}).get('weight_current', 1)
                weight_24h = config.get('automated_migrations', {}).get('weight_config', {}).get('weight_24h', 0)
                weight_7d = config.get('automated_migrations', {}).get('weight_config', {}).get('weight_7d', 0)

                # Normalize weights to sum to 1
                total_weight = weight_current + weight_24h + weight_7d
                if total_weight > 0:
                    w_current = weight_current / total_weight
                    w_24h = weight_24h / total_weight
                    w_7d = weight_7d / total_weight
                else:
                    w_current, w_24h, w_7d = 1, 0, 0

                # Weighted metrics for reason
                src_cpu = (src_metrics.get("current_cpu", 0) * w_current + src_metrics.get("avg_cpu", 0) * w_24h + src_metrics.get("avg_cpu_week", 0) * w_7d)
                src_mem = (src_metrics.get("current_mem", 0) * w_current + src_metrics.get("avg_mem", 0) * w_24h + src_metrics.get("avg_mem_week", 0) * w_7d)
                tgt_cpu = (tgt_metrics.get("current_cpu", 0) * w_current + tgt_metrics.get("avg_cpu", 0) * w_24h + tgt_metrics.get("avg_cpu_week", 0) * w_7d)
                tgt_mem = (tgt_metrics.get("current_mem", 0) * w_current + tgt_metrics.get("avg_mem", 0) * w_24h + tgt_metrics.get("avg_mem_week", 0) * w_7d)

                if src_cpu > src_mem:
                    reason = f"Balance CPU load (src: {src_cpu:.1f}%, target: {tgt_cpu:.1f}%)"
                else:
                    reason = f"Balance Memory load (src: {src_mem:.1f}%, target: {tgt_mem:.1f}%)"

            # Convert raw score to suitability rating (0-100, higher is better)
            # Raw scores are penalties (lower = better), so invert them
            # Cap at 100 for the conversion formula
            suitability_rating = round(max(0, 100 - min(best_score, 100)), 1)

            # Check for mount points and prepare warnings/metadata
            bind_mount_warning = None
            mount_point_info = {}
            if guest.get("type") == "CT":
                mount_info = guest.get("mount_points", {})
                if mount_info.get("has_mount_points", False):
                    mount_points = mount_info.get("mount_points", [])

                    # Add mount point metadata for UI
                    mount_point_info = {
                        "has_mount_points": True,
                        "mount_count": mount_info.get("mount_count", 0),
                        "has_shared_mount": mount_info.get("has_shared_mount", False),
                        "has_unshared_bind_mount": mount_info.get("has_unshared_bind_mount", False),
                        "mount_paths": [mp.get("source", "") for mp in mount_points]
                    }

                    # Generate appropriate warnings
                    if mount_info.get("has_unshared_bind_mount", False):
                        # Unshared bind mounts (only appears for maintenance evacuations)
                        unshared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and not mp.get("is_shared", False)]
                        bind_paths = [mp.get("source", "") for mp in unshared_mounts]
                        bind_mount_warning = f"⚠️ Container has {len(unshared_mounts)} unshared bind mount(s): {', '.join(bind_paths[:2])}{'...' if len(bind_paths) > 2 else ''}. Migration requires --restart --force and manual path verification on target node."
                    elif mount_info.get("has_shared_mount", False):
                        # Shared bind mounts (informational)
                        shared_mounts = [mp for mp in mount_points if mp.get("is_bind_mount", False) and mp.get("is_shared", False)]
                        if shared_mounts:
                            shared_paths = [mp.get("source", "") for mp in shared_mounts]
                            bind_mount_warning = f"ℹ️ Container has {len(shared_mounts)} shared bind mount(s): {', '.join(shared_paths[:2])}{'...' if len(shared_paths) > 2 else ''}. Ensure these paths exist on {best_target}."

            recommendation = {
                "vmid": vmid_int,
                "name": guest.get("name", "unknown"),
                "type": guest.get("type", "unknown"),
                "source_node": src_node_name,
                "target_node": best_target,
                "target_node_score": round(best_score, 2),  # Raw penalty score (internal use)
                "suitability_rating": suitability_rating,  # 0-100, higher is better (user-facing)
                "score_improvement": round(score_improvement, 2),  # How much better
                "reason": reason,
                "mem_gb": guest.get("mem_max_gb", 0),
                "command": "{} migrate {} {} {}".format(cmd_type, vmid_int, best_target, cmd_flag),
                "confidence_score": round(min(100, score_improvement * 2), 1)  # Convert improvement to confidence
            }

            # Add mount point metadata and warnings if present
            if mount_point_info:
                recommendation["mount_point_info"] = mount_point_info
            if bind_mount_warning:
                recommendation["bind_mount_warning"] = bind_mount_warning

            recommendations.append(recommendation)

            # Note: pending_target_guests was already updated when the candidate was added (line 1563)

        except Exception as e:
            print(f"Error creating recommendation for {vmid_key}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            continue

    # Distribution Balancing: Add recommendations for small guests to balance node guest counts
    try:
        config = load_config()
        dist_config = config.get('distribution_balancing', {})

        if dist_config.get('enabled', False):
            print("Distribution balancing is enabled, finding candidates...", file=sys.stderr)

            guest_count_threshold = dist_config.get('guest_count_threshold', 2)
            max_cpu_cores = dist_config.get('max_cpu_cores', 2)
            max_memory_gb = dist_config.get('max_memory_gb', 4)

            distribution_candidates = find_distribution_candidates(
                nodes=nodes,
                guests=guests,
                guest_count_threshold=guest_count_threshold,
                max_cpu_cores=max_cpu_cores,
                max_memory_gb=max_memory_gb
            )

            print(f"Found {len(distribution_candidates)} distribution balancing candidates", file=sys.stderr)

            # Convert distribution candidates to recommendation format
            for candidate in distribution_candidates:
                guest_id = candidate['guest_id']
                guest = guests.get(guest_id)

                if not guest:
                    continue

                # Check if this guest already has a performance-based recommendation
                already_recommended = any(
                    rec.get('vmid') == guest_id for rec in recommendations
                )

                if already_recommended:
                    print(f"Skipping distribution recommendation for {guest_id} - already has performance recommendation", file=sys.stderr)
                    continue

                # Check storage compatibility
                if proxmox and storage_cache:
                    if not check_storage_compatibility(guest, candidate['source_node'], candidate['target_node'], proxmox, storage_cache):
                        print(f"Skipping {guest_id}: storage incompatible with {candidate['target_node']}", file=sys.stderr)
                        continue

                # Create recommendation
                vmid_int = int(guest_id) if isinstance(guest_id, str) and guest_id.isdigit() else guest_id
                guest_type = guest.get('type', 'qemu')
                cmd_type = 'pct' if guest_type == 'lxc' else 'qm'
                cmd_flag = '--restart' if guest_type == 'lxc' else '--online'

                recommendation = {
                    "vmid": guest_id,
                    "name": candidate['guest_name'],
                    "type": candidate['guest_type'],
                    "current_node": candidate['source_node'],
                    "target_node": candidate['target_node'],
                    "target_node_score": 50,  # Neutral score for distribution balancing
                    "suitability_rating": 50,  # Neutral suitability
                    "score_improvement": 10,  # Modest improvement score
                    "reason": candidate['reason'],
                    "mem_gb": candidate['memory_gb'],
                    "command": f"{cmd_type} migrate {vmid_int} {candidate['target_node']} {cmd_flag}",
                    "confidence_score": 60,  # Moderate confidence for distribution moves
                    "distribution_balancing": True  # Flag to identify these recommendations
                }

                recommendations.append(recommendation)
                print(f"Added distribution recommendation: {candidate['guest_name']} ({guest_id}) from {candidate['source_node']} to {candidate['target_node']}", file=sys.stderr)

    except Exception as e:
        print(f"Error in distribution balancing: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()

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
            # Use kwargs with hyphenated parameter name for Proxmox API
            result = proxmox.nodes(source).qemu(vmid).migrate.post(
                target=target,
                online=1,
                **{'with-local-disks': 1}  # Allow migration of VMs with local disks
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
            "task_id": result,
            "source_node": source,
            "target_node": target,
            "vmid": vmid,
            "type": guest_type
        })

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        app.logger.error(f"Migration error for VM {vmid}: {str(e)}\n{error_trace}")
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


@app.route("/api/migrations/<path:task_id>/cancel", methods=["POST"])
def cancel_migration(task_id):
    """Cancel a running migration by stopping the Proxmox task"""
    try:
        config = load_config()
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        verify_ssl = config.get('proxmox_verify_ssl', False)

        # Parse UPID to extract node: UPID:node:pid:pstart:starttime:type:vmid:user
        parts = task_id.split(':')
        if len(parts) < 2:
            return jsonify({"success": False, "error": "Invalid task ID format"}), 400

        node = parts[1]

        # Stop the task via Proxmox API
        import requests
        url = f"https://{proxmox_host}:{proxmox_port}/api2/json/nodes/{node}/tasks/{task_id}"
        headers = {
            'Authorization': f'PVEAPIToken={token_id}={token_secret}'
        }

        response = requests.delete(url, headers=headers, verify=verify_ssl, timeout=10)

        if response.status_code == 200:
            return jsonify({"success": True, "message": "Migration cancelled"}), 200
        else:
            return jsonify({"success": False, "error": f"Failed to cancel: HTTP {response.status_code}"}), response.status_code

    except Exception as e:
        print(f"Cancel migration error: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/nodes/evacuate/status/<session_id>", methods=["GET"])
def get_evacuation_status(session_id):
    """Get the status of an ongoing evacuation"""
    session = _read_session(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404

    # Return session data
    return jsonify({
        "success": True,
        "session_id": session_id,
        "status": session.get("status"),
        "progress": session.get("progress", {}),
        "results": session.get("results", []),
        "error": session.get("error"),
        "completed": session.get("completed", False)
    })

@app.route("/api/nodes/<node>/storage", methods=["GET"])
def get_node_storage(node):
    """Get all available storage on a specific node"""
    try:
        proxmox = get_proxmox_client()

        # Get all storage for the node
        storage_list = proxmox.nodes(node).storage.get()

        # Filter for storage that is enabled and available
        available_storage = []
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

        return jsonify({
            "success": True,
            "node": node,
            "storage": available_storage
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/storage/verify", methods=["POST"])
def verify_storage_availability():
    """Verify that storage volumes are available on target nodes

    Request body:
    {
        "source_node": "pve1",
        "target_nodes": ["pve2", "pve3"],
        "guests": [100, 101, 102]
    }
    """
    try:
        data = request.get_json()
        source_node = data.get('source_node')
        target_nodes = data.get('target_nodes', [])
        guest_vmids = data.get('guests', [])

        if not source_node or not target_nodes:
            return jsonify({"success": False, "error": "Missing required parameters"}), 400

        proxmox = get_proxmox_client()

        # Get storage info for all target nodes
        target_storage_map = {}
        for target_node in target_nodes:
            try:
                storage_list = proxmox.nodes(target_node).storage.get()
                # Create set of available storage IDs
                available = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available.add(storage.get('storage'))
                target_storage_map[target_node] = available
            except Exception as e:
                print(f"Error getting storage for {target_node}: {e}", file=sys.stderr)
                target_storage_map[target_node] = set()

        # Check each guest's storage requirements
        guest_storage_info = []
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
                storage_volumes = set()

                # Check all config keys for storage references
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if any(key.startswith(prefix) for prefix in ['scsi', 'ide', 'virtio', 'sata', 'mp', 'rootfs']):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Find which targets have all required storage
                compatible_targets = []
                incompatible_targets = []

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

        return jsonify({
            "success": True,
            "source_node": source_node,
            "target_storage": {node: list(storage) for node, storage in target_storage_map.items()},
            "guests": guest_storage_info
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/nodes/evacuate", methods=["POST"])
def evacuate_node():
    """Evacuate all VMs/CTs from a node"""
    try:
        data = request.json
        source_node = data.get("node")
        maintenance_nodes = set(data.get("maintenance_nodes", []))
        confirm = data.get("confirm", False)
        guest_actions = data.get("guest_actions", {})  # Actions per guest (migrate/ignore/poweroff)
        target_node = data.get("target_node", None)  # Optional: Force all migrations to specific node
        guest_targets = data.get("guest_targets", {})  # Optional: Per-guest target overrides

        if not source_node:
            return jsonify({"success": False, "error": "Missing node parameter"}), 400

        # Load cluster data to find guests on the node
        if not os.path.exists(CACHE_FILE):
            return jsonify({"success": False, "error": "No cluster data available"}), 500

        with open(CACHE_FILE, 'r') as f:
            cluster_data = json.load(f)

        # Access nodes as dictionary
        nodes = cluster_data.get('nodes', {})

        if source_node not in nodes:
            return jsonify({"success": False, "error": f"Node {source_node} not found"}), 404

        source_node_data = nodes[source_node]
        guest_vmids = source_node_data.get('guests', [])

        if not guest_vmids:
            return jsonify({"success": False, "error": f"No guests found on node {source_node}"}), 400

        print(f"Found {len(guest_vmids)} guests on {source_node}: {guest_vmids}", file=sys.stderr)

        # Get available target nodes (excluding source and maintenance nodes)
        available_nodes = []
        for node_name, node_data in nodes.items():
            if (node_name != source_node and
                node_data.get('status') == 'online' and
                node_name not in maintenance_nodes):
                available_nodes.append({
                    'node': node_name,
                    'cpu': node_data.get('cpu_percent', 0),
                    'mem': node_data.get('mem_percent', 0)
                })

        if not available_nodes:
            return jsonify({"success": False, "error": "No available target nodes for evacuation"}), 400

        # If target_node is specified, validate it's in available_nodes
        if target_node:
            if target_node not in [n['node'] for n in available_nodes]:
                return jsonify({
                    "success": False,
                    "error": f"Target node '{target_node}' is not available (offline, in maintenance, or is source node)"
                }), 400
            print(f"Using forced target node: {target_node}", file=sys.stderr)
        else:
            print(f"Available target nodes: {[n['node'] for n in available_nodes]}", file=sys.stderr)

        # Setup Proxmox API
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
                "error": "API token not configured"
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

        # Generate migration plan first
        migration_plan = []

        # Track pending assignments to distribute load evenly
        pending_counts = {n['node']: 0 for n in available_nodes}

        # Get storage info for all available target nodes
        target_storage_map = {}
        for node_info in available_nodes:
            node = node_info['node']
            try:
                storage_list = proxmox.nodes(node).storage.get()
                # Create set of available storage IDs
                available_storage = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available_storage.add(storage.get('storage'))
                target_storage_map[node] = available_storage
            except Exception as e:
                print(f"Warning: Could not get storage for {node}: {e}", file=sys.stderr)
                target_storage_map[node] = set()

        for idx, vmid in enumerate(guest_vmids):
            try:
                # Determine guest type and get config
                guest_type = None
                guest_config = None
                guest_status = None

                try:
                    guest_config = proxmox.nodes(source_node).qemu(vmid).config.get()
                    guest_status = proxmox.nodes(source_node).qemu(vmid).status.current.get()
                    guest_type = "qemu"
                except:
                    try:
                        guest_config = proxmox.nodes(source_node).lxc(vmid).config.get()
                        guest_status = proxmox.nodes(source_node).lxc(vmid).status.current.get()
                        guest_type = "lxc"
                    except Exception as e:
                        migration_plan.append({
                            "vmid": vmid,
                            "name": f"Unknown-{vmid}",
                            "type": "unknown",
                            "status": "unknown",
                            "target": None,
                            "will_restart": False,
                            "skipped": True,
                            "skip_reason": f"Cannot determine type: {str(e)}"
                        })
                        continue

                # Get guest details - for LXC prefer hostname, for QEMU prefer name
                if guest_type == "lxc":
                    guest_name = (
                        guest_config.get('hostname') or
                        guest_config.get('name') or
                        guest_config.get('description') or
                        f'CT-{vmid}'
                    )
                else:  # qemu
                    guest_name = (
                        guest_config.get('name') or
                        guest_config.get('description') or
                        f'VM-{vmid}'
                    )

                # Clean up description if it has newlines (use first line only)
                if '\n' in str(guest_name):
                    guest_name = str(guest_name).split('\n')[0].strip()
                current_status = guest_status.get('status', 'unknown')

                # Check for 'ignore' tag
                tags = guest_config.get('tags', '').split(',') if guest_config.get('tags') else []
                if 'ignore' in [t.strip().lower() for t in tags]:
                    migration_plan.append({
                        "vmid": vmid,
                        "name": guest_name,
                        "type": guest_type,
                        "status": current_status,
                        "target": None,
                        "will_restart": False,
                        "skipped": True,
                        "skip_reason": "Has 'ignore' tag",
                        "storage_volumes": [],
                        "storage_compatible": True
                    })
                    continue

                # Extract storage requirements for this guest
                storage_volumes = set()
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if any(key.startswith(prefix) for prefix in ['scsi', 'ide', 'virtio', 'sata', 'mp', 'rootfs']):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Filter available nodes to only those with compatible storage
                compatible_nodes = []
                for node_info in available_nodes:
                    node = node_info['node']
                    node_storage = target_storage_map.get(node, set())
                    missing_storage = storage_volumes - node_storage

                    if not missing_storage:
                        compatible_nodes.append(node_info)

                # Check if any compatible nodes exist
                if not compatible_nodes:
                    # No compatible targets - mark as skipped
                    missing_on_all = storage_volumes - set.intersection(*[target_storage_map.get(n['node'], set()) for n in available_nodes]) if available_nodes else storage_volumes
                    migration_plan.append({
                        "vmid": vmid,
                        "name": guest_name,
                        "type": guest_type,
                        "status": current_status,
                        "target": None,
                        "will_restart": False,
                        "skipped": True,
                        "skip_reason": f"Storage not available on any target: {', '.join(sorted(missing_on_all))}",
                        "storage_volumes": list(storage_volumes),
                        "storage_compatible": False
                    })
                    continue

                # Find best target node - priority: guest_targets > target_node > auto-select
                vmid_str = str(vmid)
                if vmid_str in guest_targets:
                    # Use per-guest target override
                    requested_target = guest_targets[vmid_str]
                    if requested_target not in [n['node'] for n in compatible_nodes]:
                        # Requested target not compatible - skip this guest
                        missing_storage = storage_volumes - target_storage_map.get(requested_target, set())
                        migration_plan.append({
                            "vmid": vmid,
                            "name": guest_name,
                            "type": guest_type,
                            "status": current_status,
                            "target": None,
                            "will_restart": False,
                            "skipped": True,
                            "skip_reason": f"Selected target '{requested_target}' missing required storage: {', '.join(sorted(missing_storage))}",
                            "storage_volumes": list(storage_volumes),
                            "storage_compatible": False
                        })
                        continue
                    selected_target = requested_target
                elif target_node:
                    # Check if forced target_node is compatible with this guest's storage
                    if target_node not in [n['node'] for n in compatible_nodes]:
                        # Forced target not compatible - skip this guest
                        migration_plan.append({
                            "vmid": vmid,
                            "name": guest_name,
                            "type": guest_type,
                            "status": current_status,
                            "target": None,
                            "will_restart": False,
                            "skipped": True,
                            "skip_reason": f"Target node '{target_node}' missing required storage: {', '.join(sorted(storage_volumes - target_storage_map.get(target_node, set())))}",
                            "storage_volumes": list(storage_volumes),
                            "storage_compatible": False
                        })
                        continue
                    selected_target = target_node
                else:
                    # Auto-select best target based on load
                    selected_target = min(compatible_nodes, key=lambda n: n['cpu'] + n['mem'] + (pending_counts[n['node']] * 10))['node']
                pending_counts[selected_target] += 1

                # Determine if will restart
                will_restart = False
                if guest_type == "qemu":
                    # QEMU VMs use online migration, no restart if running
                    will_restart = (current_status != "running")
                else:  # lxc
                    # LXC containers restart during migration
                    will_restart = (current_status == "running")

                migration_plan.append({
                    "vmid": vmid,
                    "name": guest_name,
                    "type": guest_type,
                    "status": current_status,
                    "target": selected_target,
                    "will_restart": will_restart,
                    "skipped": False,
                    "skip_reason": None,
                    "storage_volumes": list(storage_volumes),
                    "storage_compatible": True
                })

            except Exception as e:
                migration_plan.append({
                    "vmid": vmid,
                    "name": f"Unknown-{vmid}",
                    "type": "unknown",
                    "status": "unknown",
                    "target": None,
                    "will_restart": False,
                    "skipped": True,
                    "skip_reason": str(e),
                    "storage_volumes": [],
                    "storage_compatible": False
                })

        # If not confirmed, return the plan for review
        if not confirm:
            return jsonify({
                "success": True,
                "plan": migration_plan,
                "source_node": source_node,
                "available_targets": [n['node'] for n in available_nodes],
                "total_guests": len(migration_plan),
                "will_migrate": len([p for p in migration_plan if not p['skipped']]),
                "will_skip": len([p for p in migration_plan if p['skipped']])
            })

        # Execute evacuation if confirmed - start in background thread
        session_id = str(uuid.uuid4())
        print(f"Starting confirmed evacuation of node {source_node} (session: {session_id})", file=sys.stderr)

        # Initialize session
        session_data = {
            "status": "starting",
            "node": source_node,
            "progress": {
                "total": len(guest_vmids),
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "current_guest": None,
                "remaining": len(guest_vmids)
            },
            "results": [],
            "completed": False,
            "error": None
        }
        _write_session(session_id, session_data)

        # Start evacuation in background thread
        def run_evacuation():
            _execute_evacuation(session_id, source_node, guest_vmids, available_nodes, guest_actions, proxmox)

        thread = threading.Thread(target=run_evacuation, daemon=True)
        thread.start()

        # Return session ID immediately
        return jsonify({
            "success": True,
            "session_id": session_id,
            "message": "Evacuation started in background",
            "total_guests": len(guest_vmids)
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def _update_evacuation_progress(session_id, processed, successful, failed, result):
    """Helper to update evacuation session progress"""
    session = _read_session(session_id)
    if session:
        session["progress"]["processed"] = processed
        session["progress"]["successful"] = successful
        session["progress"]["failed"] = failed
        session["results"].append(result)
        _write_session(session_id, session)

def _execute_evacuation(session_id, source_node, guest_vmids, available_nodes, guest_actions, proxmox):
    """Execute evacuation in background thread"""
    try:
        print(f"[{session_id}] Executing evacuation of {len(guest_vmids)} guests from {source_node}", file=sys.stderr)
        results = []
        successful = 0
        failed = 0

        # Update session status
        session = _read_session(session_id)
        if session:
            session["status"] = "running"
            _write_session(session_id, session)

        # Track pending assignments during execution to distribute load evenly
        execution_pending_counts = {n['node']: 0 for n in available_nodes}

        # Get storage info for all available target nodes
        target_storage_map = {}
        for node_info in available_nodes:
            node = node_info['node']
            try:
                storage_list = proxmox.nodes(node).storage.get()
                # Create set of available storage IDs
                available_storage = set()
                for storage in storage_list:
                    if storage.get('enabled', 1) and storage.get('active', 0):
                        available_storage.add(storage.get('storage'))
                target_storage_map[node] = available_storage
            except Exception as e:
                print(f"Warning: Could not get storage for {node}: {e}", file=sys.stderr)
                target_storage_map[node] = set()

        for idx, vmid in enumerate(guest_vmids):
            # Update current guest in progress
            session = _read_session(session_id)
            if session:
                session["progress"]["current_guest"] = {
                    "vmid": vmid,
                    "index": idx + 1,
                    "total": len(guest_vmids)
                }
                session["progress"]["remaining"] = len(guest_vmids) - idx
                _write_session(session_id, session)
            try:
                print(f"[{idx+1}/{len(guest_vmids)}] Processing VM/CT {vmid}", file=sys.stderr)

                # Determine guest type by trying to fetch from qemu first, then lxc
                guest_type = None
                guest_config = None

                try:
                    guest_config = proxmox.nodes(source_node).qemu(vmid).config.get()
                    guest_type = "qemu"
                except:
                    try:
                        guest_config = proxmox.nodes(source_node).lxc(vmid).config.get()
                        guest_type = "lxc"
                    except Exception as e:
                        print(f"  ✗ Cannot determine type for {vmid}: {str(e)}", file=sys.stderr)
                        result = {
                            "vmid": vmid,
                            "success": False,
                            "error": f"Cannot determine guest type: {str(e)}"
                        }
                        results.append(result)
                        failed += 1
                        _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                        continue

                # Check for 'ignore' tag
                tags = guest_config.get('tags', '').split(',') if guest_config.get('tags') else []
                if 'ignore' in [t.strip().lower() for t in tags]:
                    print(f"  ⊘ Skipping {guest_type} {vmid} (has 'ignore' tag)", file=sys.stderr)
                    result = {
                        "vmid": vmid,
                        "success": False,
                        "error": "Skipped (ignore tag)"
                    }
                    results.append(result)
                    failed += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                # Check user-selected action for this guest
                action = guest_actions.get(str(vmid), 'migrate')

                if action == 'ignore':
                    print(f"  ⊘ Ignoring {guest_type} {vmid} (user selected)", file=sys.stderr)
                    result = {
                        "vmid": vmid,
                        "success": True,
                        "action": "ignored",
                        "message": "Ignored by user selection"
                    }
                    results.append(result)
                    successful += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                if action == 'poweroff':
                    print(f"  ⏻ Powering off {guest_type} {vmid}", file=sys.stderr)
                    try:
                        if guest_type == "qemu":
                            proxmox.nodes(source_node).qemu(vmid).status.stop.post()
                        else:  # lxc
                            proxmox.nodes(source_node).lxc(vmid).status.stop.post()

                        result = {
                            "vmid": vmid,
                            "success": True,
                            "action": "powered_off",
                            "message": "Powered off successfully"
                        }
                        results.append(result)
                        successful += 1
                        _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    except Exception as poweroff_error:
                        result = {
                            "vmid": vmid,
                            "success": False,
                            "error": f"Failed to power off: {str(poweroff_error)}"
                        }
                        results.append(result)
                        failed += 1
                        _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                # Extract storage requirements for this guest
                storage_volumes = set()
                for key, value in guest_config.items():
                    # Disk keys like scsi0, ide0, virtio0, mp0, rootfs
                    if any(key.startswith(prefix) for prefix in ['scsi', 'ide', 'virtio', 'sata', 'mp', 'rootfs']):
                        # Value format is typically "storage:vm-disk-id" or "storage:subvol-id"
                        if isinstance(value, str) and ':' in value:
                            storage_id = value.split(':')[0]
                            storage_volumes.add(storage_id)

                # Filter available nodes to only those with compatible storage
                compatible_nodes = []
                for node_info in available_nodes:
                    node = node_info['node']
                    node_storage = target_storage_map.get(node, set())
                    missing_storage = storage_volumes - node_storage

                    if not missing_storage:
                        compatible_nodes.append(node_info)

                # Check if any compatible nodes exist
                if not compatible_nodes:
                    # No compatible targets - fail this migration
                    missing_on_all = storage_volumes - set.intersection(*[target_storage_map.get(n['node'], set()) for n in available_nodes]) if available_nodes else storage_volumes
                    error_msg = f"Storage not available on any target node: {', '.join(sorted(missing_on_all))}"
                    print(f"  ✗ {error_msg}", file=sys.stderr)
                    result = {
                        "vmid": vmid,
                        "success": False,
                        "error": error_msg
                    }
                    results.append(result)
                    failed += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                    continue

                # Find best target node from compatible nodes only
                target_node = min(compatible_nodes, key=lambda n: n['cpu'] + n['mem'] + (execution_pending_counts[n['node']] * 10))['node']
                execution_pending_counts[target_node] += 1

                print(f"  → Migrating {guest_type.upper()} {vmid} to {target_node} (storage: {', '.join(sorted(storage_volumes)) if storage_volumes else 'none'})", file=sys.stderr)

                # Execute migration
                if guest_type == "qemu":
                    task_id = proxmox.nodes(source_node).qemu(vmid).migrate.post(
                        target=target_node,
                        online=1
                    )
                else:  # lxc
                    task_id = proxmox.nodes(source_node).lxc(vmid).migrate.post(
                        target=target_node,
                        restart=1
                    )

                print(f"  ✓ Migration started. Task ID: {task_id}", file=sys.stderr)

                # Wait for migration to complete (poll task status)
                max_wait = 600  # 10 minutes timeout
                poll_interval = 5  # Check every 5 seconds
                elapsed = 0
                task_status = None
                migration_success = False
                migration_error = None

                while elapsed < max_wait:
                    try:
                        task_status = proxmox.nodes(source_node).tasks(task_id).status.get()
                        status = task_status.get('status')

                        if status == 'stopped':
                            exitstatus = task_status.get('exitstatus')

                            # Check for successful completion
                            if exitstatus == 'OK':
                                print(f"  ✓ Migration completed successfully", file=sys.stderr)
                                migration_success = True
                                break
                            else:
                                # Migration failed - get detailed error
                                # Read task log to get actual error message
                                try:
                                    task_log = proxmox.nodes(source_node).tasks(task_id).log.get(limit=50)
                                    # Get last few log lines that might contain error info
                                    error_lines = [line.get('t', '') for line in task_log[-10:] if line.get('t')]
                                    error_detail = '\n'.join(error_lines) if error_lines else f"exitstatus: {exitstatus}"

                                    # Check for common abort/cancel patterns
                                    if 'abort' in error_detail.lower():
                                        migration_error = f"Migration aborted: {exitstatus}"
                                    elif 'cancel' in error_detail.lower():
                                        migration_error = f"Migration cancelled: {exitstatus}"
                                    elif exitstatus == 'ABORT':
                                        migration_error = "Migration was aborted"
                                    else:
                                        migration_error = f"Migration failed (exitstatus: {exitstatus})"

                                    print(f"  ✗ Migration failed. Exit status: {exitstatus}", file=sys.stderr)
                                    print(f"  ✗ Error detail: {error_detail}", file=sys.stderr)
                                except Exception as log_error:
                                    migration_error = f"Migration failed with exitstatus: {exitstatus}"
                                    print(f"  ✗ Could not read task log: {str(log_error)}", file=sys.stderr)

                                break

                        time.sleep(poll_interval)
                        elapsed += poll_interval

                    except Exception as poll_error:
                        # Only retry on connection errors, not on task failures
                        error_str = str(poll_error)
                        if 'task not found' in error_str.lower() or '595' in error_str:
                            migration_error = f"Task disappeared or node unreachable: {error_str}"
                            print(f"  ✗ {migration_error}", file=sys.stderr)
                            break
                        else:
                            # Temporary connection issue, retry
                            print(f"  ⚠ Task poll error (retrying): {error_str}", file=sys.stderr)
                            time.sleep(poll_interval)
                            elapsed += poll_interval

                # Check if migration timed out
                if elapsed >= max_wait and not migration_success and not migration_error:
                    migration_error = f"Migration timeout after {max_wait}s"
                    print(f"  ✗ {migration_error}", file=sys.stderr)

                # Record result based on actual outcome
                if migration_success:
                    result = {
                        "vmid": vmid,
                        "target": target_node,
                        "success": True,
                        "task_id": task_id
                    }
                    results.append(result)
                    successful += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                else:
                    # Migration failed
                    result = {
                        "vmid": vmid,
                        "success": False,
                        "error": migration_error or "Unknown migration failure",
                        "task_id": task_id
                    }
                    results.append(result)
                    failed += 1
                    _update_evacuation_progress(session_id, idx + 1, successful, failed, result)

            except Exception as e:
                error_msg = str(e)
                result = {
                    "vmid": vmid,
                    "success": False,
                    "error": error_msg
                }
                results.append(result)
                failed += 1
                _update_evacuation_progress(session_id, idx + 1, successful, failed, result)
                print(f"  ✗ Failed: {error_msg}", file=sys.stderr)

        # Trigger collection after evacuation
        trigger_collection()

        # Mark session as completed
        session = _read_session(session_id)
        if session:
            session["status"] = "completed"
            session["completed"] = True
            session["progress"]["current_guest"] = None
            _write_session(session_id, session)

        print(f"[{session_id}] Evacuation completed: {successful} successful, {failed} failed", file=sys.stderr)

    except Exception as e:
        print(f"[{session_id}] Evacuation error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()

        # Mark session as failed
        session = _read_session(session_id)
        if session:
            session["status"] = "failed"
            session["completed"] = True
            session["error"] = str(e)
            _write_session(session_id, session)


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


@app.route("/api/config/export", methods=["GET"])
def export_config():
    """Export complete configuration as downloadable JSON file"""
    try:
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

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/config/backup", methods=["POST"])
def backup_config():
    """Create a backup of current configuration (keeps last 5)"""
    try:
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

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def validate_config_structure(config_data):
    """Validate imported configuration structure"""
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


@app.route("/api/config/import", methods=["POST"])
def import_config():
    """Import configuration from uploaded JSON file"""
    try:
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

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/penalty-config", methods=["GET"])
def get_penalty_config():
    """Get penalty scoring configuration with defaults"""
    try:
        penalty_config = load_penalty_config()
        return jsonify({
            "success": True,
            "config": penalty_config,
            "defaults": DEFAULT_PENALTY_CONFIG
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/penalty-config", methods=["POST"])
def update_penalty_config():
    """Update penalty scoring configuration"""
    try:
        data = request.json

        if not data or 'config' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'config' in request body"
            }), 400

        penalty_config = data['config']

        # Validate all values are numeric
        for key, value in penalty_config.items():
            if not isinstance(value, (int, float)):
                return jsonify({
                    "success": False,
                    "error": f"Invalid value for {key}: must be a number"
                }), 400

        # Validate time period weights sum to 1.0 (with small tolerance for floating point)
        weight_sum = penalty_config.get('weight_current', 0) + \
                     penalty_config.get('weight_24h', 0) + \
                     penalty_config.get('weight_7d', 0)

        if abs(weight_sum - 1.0) > 0.01:  # Allow 1% tolerance
            return jsonify({
                "success": False,
                "error": f"Time period weights must sum to 1.0 (currently: {weight_sum:.2f})"
            }), 400

        # Validate individual weight values are between 0 and 1
        for weight_key in ['weight_current', 'weight_24h', 'weight_7d']:
            if weight_key in penalty_config:
                weight_val = penalty_config[weight_key]
                if weight_val < 0 or weight_val > 1:
                    return jsonify({
                        "success": False,
                        "error": f"{weight_key} must be between 0 and 1 (got: {weight_val})"
                    }), 400

        # Validate penalty values are non-negative (allow 0 to disable, but no negatives)
        for key, value in penalty_config.items():
            if key.endswith('_penalty') or key.endswith('_penalty_per_min'):
                if value < 0:
                    return jsonify({
                        "success": False,
                        "error": f"{key} cannot be negative (got: {value})"
                    }), 400

        # Validate threshold values are reasonable
        for key, value in penalty_config.items():
            if key.endswith('_threshold'):
                if value < 0 or value > 100:
                    return jsonify({
                        "success": False,
                        "error": f"{key} must be between 0 and 100 (got: {value})"
                    }), 400

        # Save to config file
        if save_penalty_config(penalty_config):
            return jsonify({
                "success": True,
                "message": "Penalty configuration updated successfully",
                "config": penalty_config
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to save penalty configuration"
            }), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/penalty-config/reset", methods=["POST"])
def reset_penalty_config():
    """Reset penalty scoring configuration to defaults"""
    try:
        # Save defaults to config
        if save_penalty_config(DEFAULT_PENALTY_CONFIG):
            return jsonify({
                "success": True,
                "message": "Penalty configuration reset to defaults",
                "config": DEFAULT_PENALTY_CONFIG
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to reset penalty configuration"
            }), 500

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
                # Don't return early - still need to run build steps below
                # in case frontend hasn't been built yet
                already_up_to_date = True
            else:
                already_up_to_date = False

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

        # Run post-update script to build and deploy web interface
        update_log.append("Building and updating web interface...")
        update_log.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        update_log.append("⚠️  THIS UPDATE WILL TAKE 1-2 MINUTES ⚠️")
        update_log.append("Installing Node.js, compiling frontend for 93% faster page loads...")
        update_log.append("Please wait - future updates will be much faster (10-15 seconds)")
        update_log.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        try:
            # Run post_update.sh which handles Node.js install, Babel compilation, and deployment
            post_update_script = os.path.join(GIT_REPO_PATH, "post_update.sh")
            if os.path.exists(post_update_script):
                result = subprocess.run(
                    ["/bin/bash", post_update_script],
                    cwd=GIT_REPO_PATH,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout for build
                )

                # Add build output to log (both stdout and stderr)
                if result.stdout:
                    for line in result.stdout.strip().split('\n'):
                        if line.strip():
                            update_log.append(line)

                # Add any stderr output
                if result.stderr:
                    for line in result.stderr.strip().split('\n'):
                        if line.strip():
                            update_log.append(f"[stderr] {line}")

                if result.returncode == 0:
                    update_log.append("✓ Web interface built and updated")
                else:
                    update_log.append(f"⚠ Build failed with exit code {result.returncode}")
                    update_log.append("See stderr output above for details")
            else:
                # Fallback to simple copy if post_update.sh doesn't exist
                update_log.append(f"⚠ post_update.sh not found at {post_update_script}")
                shutil.copy2("/opt/proxmox-balance-manager/index.html", "/var/www/html/index.html")
                update_log.append("✓ Web interface updated (legacy mode)")
        except subprocess.TimeoutExpired:
            update_log.append(f"⚠ Frontend build timed out after 5 minutes")
        except Exception as e:
            import traceback
            update_log.append(f"⚠ Failed to update web interface: {str(e)}")
            update_log.append(f"Exception type: {type(e).__name__}")
            # Add traceback for debugging
            tb_lines = traceback.format_exc().split('\n')
            for line in tb_lines:
                if line.strip():
                    update_log.append(f"  {line}")

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


@app.route("/api/system/restart-service", methods=["POST"])
def restart_service():
    """Restart a ProxBalance service"""
    try:
        data = request.get_json()
        service = data.get('service', 'proxmox-balance')

        # Validate service name
        valid_services = ['proxmox-balance', 'proxmox-collector']
        if service not in valid_services:
            return jsonify({
                "success": False,
                "error": f"Invalid service. Must be one of: {', '.join(valid_services)}"
            }), 400

        # For the proxmox-balance service (this app), we need to delay the restart
        # to allow the response to be sent first
        if service == 'proxmox-balance':
            # Schedule restart in background after response is sent
            import threading
            def delayed_restart():
                import time
                time.sleep(2)  # Wait for response to be sent
                subprocess.run(
                    ['/bin/systemctl', 'restart', 'proxmox-balance.service'],
                    capture_output=True,
                    text=True
                )

            restart_thread = threading.Thread(target=delayed_restart, daemon=True)
            restart_thread.start()

            return jsonify({
                "success": True,
                "message": "Service restart initiated. The service will restart in 2 seconds.",
                "status": "restarting"
            })
        else:
            # For other services, restart immediately
            result = subprocess.run(
                ['/bin/systemctl', 'restart', f'{service}.service'],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
                if not error_msg:
                    error_msg = f"systemctl returned exit code {result.returncode}"
                return jsonify({
                    "success": False,
                    "error": f"Failed to restart service: {error_msg}"
                }), 500

            # Check if service is running
            status_result = subprocess.run(
                ['/bin/systemctl', 'is-active', f'{service}.service'],
                capture_output=True,
                text=True,
                timeout=5
            )

            is_active = status_result.stdout.strip() == 'active'

            return jsonify({
                "success": True,
                "message": f"Service {service} restarted successfully",
                "status": "active" if is_active else "inactive"
            })

    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Service restart timed out"
        }), 500
    except Exception as e:
        print(f"Service restart error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/system/change-host", methods=["POST"])
def change_host():
    """Change the Proxmox host in config.json"""
    try:
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

    except Exception as e:
        print(f"Change host error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/settings/collection", methods=["POST"])
def update_collection_settings():
    """Update collection optimization settings"""
    try:
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
        try:
            subprocess.run(
                ['/opt/proxmox-balance-manager/venv/bin/python3',
                 '/opt/proxmox-balance-manager/update_timer.py'],
                capture_output=True,
                timeout=10,
                check=True
            )
        except Exception as e:
            print(f"Warning: Failed to update timer: {e}", file=sys.stderr)

        return jsonify({
            "success": True,
            "message": "Collection settings updated successfully"
        })

    except Exception as e:
        print(f"Update collection settings error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/system/token-permissions", methods=["POST"])
def change_token_permissions():
    """Change API token permissions"""
    try:
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

        return jsonify({
            "success": True,
            "message": f"Token permissions updated to {permission_level}"
        })

    except subprocess.CalledProcessError as e:
        return jsonify({
            "success": False,
            "error": f"Failed to update permissions: {e.stderr if e.stderr else str(e)}"
        }), 500
    except Exception as e:
        print(f"Token permission change error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/system/recreate-token", methods=["POST"])
def recreate_token():
    """Recreate API token (delete old, create new)"""
    try:
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

    except subprocess.CalledProcessError as e:
        return jsonify({
            "success": False,
            "error": f"Failed to recreate token: {e.stderr if e.stderr else str(e)}"
        }), 500
    except Exception as e:
        print(f"Token recreation error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/system/delete-token", methods=["POST"])
def delete_token():
    """Delete API token"""
    try:
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

    except Exception as e:
        print(f"Token deletion error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/logs/download", methods=["GET"])
def download_logs():
    """Download service logs"""
    try:
        service = request.args.get('service', 'proxmox-balance')

        # Validate service name
        valid_services = ['proxmox-balance', 'proxmox-collector']
        if service not in valid_services:
            return jsonify({
                "success": False,
                "error": f"Invalid service. Must be one of: {', '.join(valid_services)}"
            }), 400

        # Get logs using journalctl
        result = subprocess.run(
            ['/bin/journalctl', '-u', f'{service}.service', '-n', '1000', '--no-pager'],
            capture_output=True,
            text=True,
            timeout=10
        )

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

    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Log retrieval timed out"
        }), 500
    except Exception as e:
        print(f"Log download error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/guests/<int:vmid>/location", methods=["GET"])
def get_guest_location(vmid):
    """Get current location and status of a guest from Proxmox (fast, no full collection)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured"
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

        # Search all nodes for this guest
        for node in proxmox.nodes.get():
            node_name = node['node']

            # Check VMs
            try:
                vms = proxmox.nodes(node_name).qemu.get()
                for vm in vms:
                    if vm['vmid'] == vmid:
                        return jsonify({
                            "success": True,
                            "vmid": vmid,
                            "node": node_name,
                            "type": "VM",
                            "status": vm.get('status', 'unknown'),
                            "name": vm.get('name', f'vm-{vmid}')
                        })
            except:
                pass

            # Check CTs
            try:
                cts = proxmox.nodes(node_name).lxc.get()
                for ct in cts:
                    if ct['vmid'] == vmid:
                        return jsonify({
                            "success": True,
                            "vmid": vmid,
                            "node": node_name,
                            "type": "CT",
                            "status": ct.get('status', 'unknown'),
                            "name": ct.get('name', f'ct-{vmid}')
                        })
            except:
                pass

        return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

    except Exception as e:
        print(f"Error getting location for guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests/locations", methods=["GET"])
def get_all_guest_locations():
    """Get current locations of all guests from Proxmox (fast, lightweight)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured"
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

        guests = {}
        nodes = {}

        # Get all nodes and their guests
        for node in proxmox.nodes.get():
            node_name = node['node']
            nodes[node_name] = {
                'name': node_name,
                'status': node.get('status', 'unknown'),
                'guests': []
            }

            # Get VMs
            try:
                vms = proxmox.nodes(node_name).qemu.get()
                for vm in vms:
                    vmid = vm['vmid']
                    guests[vmid] = {
                        'vmid': vmid,
                        'node': node_name,
                        'type': 'VM',
                        'status': vm.get('status', 'unknown'),
                        'name': vm.get('name', f'vm-{vmid}')
                    }
                    nodes[node_name]['guests'].append(vmid)
            except Exception as e:
                print(f"Error getting VMs from {node_name}: {str(e)}", file=sys.stderr)

            # Get CTs
            try:
                cts = proxmox.nodes(node_name).lxc.get()
                for ct in cts:
                    vmid = ct['vmid']
                    guests[vmid] = {
                        'vmid': vmid,
                        'node': node_name,
                        'type': 'CT',
                        'status': ct.get('status', 'unknown'),
                        'name': ct.get('name', f'ct-{vmid}')
                    }
                    nodes[node_name]['guests'].append(vmid)
            except Exception as e:
                print(f"Error getting CTs from {node_name}: {str(e)}", file=sys.stderr)

        return jsonify({
            "success": True,
            "guests": guests,
            "nodes": nodes
        })

    except Exception as e:
        print(f"Error getting guest locations: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/tasks/<node>/<taskid>", methods=["GET"])
def get_task_status(node, taskid):
    """Get status of a Proxmox task (for migration tracking)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured"
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

        # Get task status
        task_status = proxmox.nodes(node).tasks(taskid).status.get()

        # Try to extract VMID from task to get disk size
        import re
        # Task ID format: UPID:node:pid:pstart:starttime:type:vmid:user:
        # Extract VMID which comes after the task type (qmigrate/vzmigrate)
        vmid_match = re.search(r':(qmigrate|vzmigrate):(\d+):', taskid)
        total_disk_size = None

        if vmid_match:
            vmid = int(vmid_match.group(2))
            try:
                # Try to get VM/CT config from the node where task is running
                vm_config = None
                guest_type = None

                # Try to get VM config first
                try:
                    vm_config = proxmox.nodes(node).qemu(vmid).config.get()
                    guest_type = 'qemu'
                except:
                    # If not a VM, try CT
                    try:
                        vm_config = proxmox.nodes(node).lxc(vmid).config.get()
                        guest_type = 'lxc'
                    except:
                        # Guest might have moved during migration, try to find it
                        try:
                            cluster_resources = proxmox.cluster.resources.get(type='vm')
                            for resource in cluster_resources:
                                if resource.get('vmid') == vmid:
                                    actual_node = resource.get('node')
                                    resource_type = resource.get('type')
                                    if resource_type == 'qemu':
                                        vm_config = proxmox.nodes(actual_node).qemu(vmid).config.get()
                                        guest_type = 'qemu'
                                    else:
                                        vm_config = proxmox.nodes(actual_node).lxc(vmid).config.get()
                                        guest_type = 'lxc'
                                    break
                        except:
                            pass

                if vm_config:
                    # Sum up all disk sizes
                    total_size = 0
                    for key, value in vm_config.items():
                        # For VMs: virtio0, scsi0, sata0, ide0, etc.
                        # For CTs: rootfs, mp0, mp1, etc.
                        if any(key.startswith(prefix) for prefix in ['virtio', 'scsi', 'sata', 'ide', 'rootfs', 'mp']):
                            if isinstance(value, str):
                                # Parse size from string like "local-lvm:vm-100-disk-0,size=2G"
                                size_match = re.search(r'size=(\d+)([KMGT]?)', value)
                                if size_match:
                                    size_value = int(size_match.group(1))
                                    size_unit = size_match.group(2) or 'G'  # Default to GB

                                    # Convert to bytes
                                    multipliers = {'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4}
                                    size_bytes = size_value * multipliers.get(size_unit, 1024**3)
                                    total_size += size_bytes

                    if total_size > 0:
                        total_disk_size = total_size
                        app.logger.info(f"Found disk size for VMID {vmid}: {total_size} bytes ({total_size / (1024**3):.2f} GB)")
                    else:
                        app.logger.warning(f"No disk size found for VMID {vmid} in config")
                else:
                    app.logger.warning(f"Could not get VM config for VMID {vmid}")
            except Exception as e:
                app.logger.error(f"Error getting disk size for VMID {vmid}: {str(e)}")

        # Get task log to parse progress information
        progress_info = None
        try:
            task_log = proxmox.nodes(node).tasks(taskid).log.get()

            # Parse log for progress information
            # Look for patterns like:
            # - "mirror-scsi0: transferred 11.3 GiB of 16.0 GiB (70.88%) in 16s"
            # - "123456789 bytes (123 MB, 117 MiB) copied"
            if task_log:
                latest_percentage = None
                latest_transferred = None
                total_size = None

                for entry in task_log:
                    line = entry.get('t', '')

                    # Look for mirror progress: "mirror-scsi0: transferred X GiB of Y GiB (Z%)"
                    if 'mirror' in line and 'transferred' in line and 'GiB' in line:
                        match = re.search(r'transferred\s+([\d.]+)\s+GiB\s+of\s+([\d.]+)\s+GiB\s+\(([\d.]+)%\)', line)
                        if match:
                            transferred_gib = float(match.group(1))
                            total_gib = float(match.group(2))
                            percentage = float(match.group(3))

                            latest_transferred = transferred_gib
                            total_size = total_gib
                            latest_percentage = int(percentage)

                if latest_percentage is not None and latest_transferred is not None:
                    progress_info = {
                        "transferred_gib": latest_transferred,
                        "total_gib": total_size,
                        "percentage": latest_percentage,
                        "human_readable": f"{latest_transferred:.1f} GiB of {total_size:.1f} GiB"
                    }
        except Exception as e:
            app.logger.debug(f"Could not parse progress from task log: {str(e)}")

        response = {
            "success": True,
            "status": task_status.get('status', 'unknown'),
            "exitstatus": task_status.get('exitstatus', 'unknown'),
            "node": node,
            "taskid": taskid
        }

        if progress_info:
            response['progress'] = progress_info

        return jsonify(response)

    except Exception as e:
        print(f"Error getting task status {node}/{taskid}: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests/<int:vmid>/migration-status", methods=["GET"])
def get_guest_migration_status(vmid):
    """Check if a guest has an active migration task"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured"
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

        # Get all cluster tasks
        tasks = proxmox.cluster.tasks.get()

        # Find active migration tasks for this guest
        # Active tasks have pid != None
        # Migration types: qmigrate (VM) or vzmigrate (CT)
        for task in tasks:
            if task.get('pid') is not None:  # Active task
                task_type = task.get('type', '')
                if task_type in ['qmigrate', 'vzmigrate']:
                    # Extract vmid from task ID field (format: "VMID - migrate to node")
                    task_id = task.get('id', '')
                    if str(vmid) in task_id or task.get('vmid') == vmid:
                        return jsonify({
                            "success": True,
                            "is_migrating": True,
                            "task_id": task.get('upid'),
                            "source_node": task.get('node'),
                            "type": task_type
                        })

        # No active migration found
        return jsonify({
            "success": True,
            "is_migrating": False
        })

    except Exception as e:
        print(f"Error checking migration status for guest {vmid}: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/tasks/<node>/<taskid>/stop", methods=["POST"])
def stop_task(node, taskid):
    """Stop a running Proxmox task (cancel migration)"""
    try:
        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured"
            }), 500

        user, token_name = token_id.split('!', 1)
        proxmox = ProxmoxAPI(
            proxmox_host,
            user=user,
            token_name=token_name,
            token_value=token_secret,
            port=proxmox_port,
            verify_ssl=verify_ssl,
            timeout=30  # Increase timeout for task cancellation (can take a while)
        )

        # Stop the task
        proxmox.nodes(node).tasks(taskid).delete()

        return jsonify({
            "success": True,
            "message": f"Task {taskid} on {node} has been stopped"
        })

    except Exception as e:
        print(f"Error stopping task {node}/{taskid}: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests/<int:vmid>/tags/refresh", methods=["POST"])
def refresh_guest_tags(vmid):
    """Refresh tags for a specific guest from Proxmox (fast, no full collection)"""
    try:
        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

        # Get fresh tags from Proxmox
        from proxmoxer import ProxmoxAPI

        token_id = config.get('proxmox_api_token_id', '')
        token_secret = config.get('proxmox_api_token_secret', '')
        proxmox_host = config.get('proxmox_host', 'localhost')
        proxmox_port = config.get('proxmox_port', 8006)
        verify_ssl = config.get('proxmox_verify_ssl', False)

        if not token_id or not token_secret:
            return jsonify({
                "success": False,
                "error": "API token not configured"
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

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        # Parse tags like collector does
        has_ignore = "ignore" in tags
        exclude_groups = [t for t in tags if t.startswith("exclude_")]

        return jsonify({
            "success": True,
            "vmid": vmid,
            "tags": {
                "has_ignore": has_ignore,
                "exclude_groups": exclude_groups,
                "all_tags": tags
            }
        })

    except Exception as e:
        print(f"Error refreshing tags for guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests/<int:vmid>/tags", methods=["GET"])
def get_guest_tags(vmid):
    """Get tags for a specific guest"""
    try:
        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

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
                "error": "API token not configured"
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

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        return jsonify({
            "success": True,
            "vmid": vmid,
            "tags": tags
        })

    except Exception as e:
        print(f"Error getting tags for guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests/<int:vmid>/tags", methods=["POST"])
def add_guest_tag(vmid):
    """Add a tag to a guest"""
    try:
        data = request.json
        new_tag = data.get("tag", "").strip()

        if not new_tag:
            return jsonify({"success": False, "error": "Tag name is required"}), 400

        # Validate tag format (no semicolons or spaces)
        if ";" in new_tag or " " in new_tag:
            return jsonify({
                "success": False,
                "error": "Tag cannot contain spaces or semicolons"
            }), 400

        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

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
                "error": "API token not configured"
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

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        # Check if tag already exists
        if new_tag in tags:
            return jsonify({
                "success": False,
                "error": f"Tag '{new_tag}' already exists on this guest"
            }), 400

        # Add the new tag
        tags.append(new_tag)
        new_tags_str = ";".join(tags)

        # Update tags via Proxmox API
        if guest_type == "vm":
            proxmox.nodes(node).qemu(vmid).config.put(tags=new_tags_str)
        else:  # CT
            proxmox.nodes(node).lxc(vmid).config.put(tags=new_tags_str)

        # Trigger collection to update cache
        trigger_collection()

        return jsonify({
            "success": True,
            "message": f"Tag '{new_tag}' added to {guest_type.upper()} {vmid}",
            "tags": tags
        })

    except Exception as e:
        print(f"Error adding tag to guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/guests/<int:vmid>/tags/<tag>", methods=["DELETE"])
def remove_guest_tag(vmid, tag):
    """Remove a tag from a guest"""
    try:
        # Load cache to find the guest
        cache_data = read_cache()
        if not cache_data:
            return jsonify({"success": False, "error": "Cache not available"}), 500

        guests = cache_data.get("guests", {})
        guest = guests.get(str(vmid))

        if not guest:
            return jsonify({"success": False, "error": f"Guest {vmid} not found"}), 404

        config = load_config()
        if config.get("error"):
            return jsonify({"success": False, "error": config["message"]}), 500

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
                "error": "API token not configured"
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

        # Get current tags from Proxmox
        node = guest["node"]
        guest_type = guest["type"].lower()

        if guest_type == "vm":
            config_data = proxmox.nodes(node).qemu(vmid).config.get()
        else:  # CT
            config_data = proxmox.nodes(node).lxc(vmid).config.get()

        tags_str = config_data.get("tags", "")
        tags = [t.strip() for t in tags_str.replace(";", " ").split() if t.strip()]

        # Check if tag exists
        if tag not in tags:
            return jsonify({
                "success": False,
                "error": f"Tag '{tag}' not found on this guest"
            }), 404

        # Remove the tag
        tags.remove(tag)
        new_tags_str = ";".join(tags)

        # Update tags via Proxmox API
        if guest_type == "vm":
            proxmox.nodes(node).qemu(vmid).config.put(tags=new_tags_str)
        else:  # CT
            proxmox.nodes(node).lxc(vmid).config.put(tags=new_tags_str)

        # Trigger collection to update cache
        trigger_collection()

        return jsonify({
            "success": True,
            "message": f"Tag '{tag}' removed from {guest_type.upper()} {vmid}",
            "tags": tags
        })

    except Exception as e:
        print(f"Error removing tag from guest {vmid}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/automigrate/status", methods=["GET"])
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
            "filter_reasons": history.get('state', {}).get('last_filter_reasons', [])
        })

    except Exception as e:
        print(f"Error getting automigrate status: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/automigrate/history", methods=["GET"])
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


@app.route("/api/automigrate/test", methods=["POST"])
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


@app.route("/api/automigrate/run", methods=["POST"])
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


@app.route("/api/automigrate/config", methods=["GET", "POST"])
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

            # Update configuration (deep merge)
            for key, value in updates.items():
                if isinstance(value, dict) and key in config['automated_migrations']:
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


@app.route("/api/automigrate/toggle-timer", methods=["POST"])
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


@app.route("/api/automigrate/logs", methods=["GET"])
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)