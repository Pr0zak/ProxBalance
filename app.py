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
from datetime import datetime
from typing import Dict, List
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

        return jsonify({
            "success": True,
            "recommendations": recommendations,
            "count": len(recommendations),
            "threshold_suggestions": threshold_suggestions,
            "ai_enhanced": ai_enhanced
        })
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}", file=sys.stderr)
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
    """
    # Get current/average metrics
    cpu = metrics.get("avg_cpu", 0) if metrics.get("has_historical") else metrics.get("current_cpu", 0)
    mem = metrics.get("avg_mem", 0) if metrics.get("has_historical") else metrics.get("current_mem", 0)
    iowait = metrics.get("avg_iowait", 0) if metrics.get("has_historical") else metrics.get("current_iowait", 0)
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
    """
    metrics = node.get("metrics", {})

    # Current state
    current_cpu = metrics.get("avg_cpu", 0) if metrics.get("has_historical") else metrics.get("current_cpu", 0)
    current_mem = metrics.get("avg_mem", 0) if metrics.get("has_historical") else metrics.get("current_mem", 0)
    current_iowait = metrics.get("avg_iowait", 0) if metrics.get("has_historical") else metrics.get("current_iowait", 0)

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

    # Use 7-day averages for more stable decisions - prefer nodes with consistent low load
    current_cpu = metrics.get("avg_cpu_week", 0) or metrics.get("avg_cpu", 0) if metrics.get("has_historical") else metrics.get("current_cpu", 0)
    current_mem = metrics.get("avg_mem_week", 0) or metrics.get("avg_mem", 0) if metrics.get("has_historical") else metrics.get("current_mem", 0)
    current_iowait = metrics.get("avg_iowait_week", 0) or metrics.get("avg_iowait", 0) if metrics.get("has_historical") else metrics.get("current_iowait", 0)

    # Get max values over the week to avoid migrating to nodes that spike
    max_cpu_week = metrics.get("max_cpu_week", metrics.get("max_cpu", 0))
    max_mem_week = metrics.get("max_mem_week", metrics.get("max_mem", 0))

    # Consider trends - penalize nodes with rising load
    cpu_trend = metrics.get("cpu_trend", "stable")
    mem_trend = metrics.get("mem_trend", "stable")

    # Trend penalty (add to score, making it less desirable)
    trend_penalty = 0
    if cpu_trend == "rising":
        trend_penalty += 15  # Significantly penalize rising CPU
    if mem_trend == "rising":
        trend_penalty += 15  # Significantly penalize rising memory

    # Max load penalty - avoid nodes that have spiked high even if average is low
    # More aggressive penalties to avoid nodes with prolonged high load
    max_load_penalty = 0
    if max_cpu_week > 80:
        max_load_penalty += 30  # Heavily penalize nodes that have hit very high CPU
    elif max_cpu_week > 70:
        max_load_penalty += 20  # Significant penalty for high CPU spikes
    elif max_cpu_week > 60:
        max_load_penalty += 15  # Penalize nodes with CPU above threshold
    elif max_cpu_week > 50:
        max_load_penalty += 5   # Light penalty for moderately high CPU

    if max_mem_week > 85:
        max_load_penalty += 30
    elif max_mem_week > 75:
        max_load_penalty += 20
    elif max_mem_week > 65:
        max_load_penalty += 10

    # Disqualify nodes with concerning historical patterns
    # Don't migrate to nodes that have shown problematic behavior
    if max_cpu_week > 70:  # Node has had severe CPU spikes (>70% for extended periods)
        return 999999  # Completely disqualify
    if max_mem_week > 80:  # Node has had severe memory pressure
        return 999999  # Completely disqualify

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

    # Disqualify if predicted load exceeds thresholds
    if predicted["cpu"] > cpu_threshold or predicted["mem"] > mem_threshold:
        return 999999  # Disqualify

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
    # Plus penalties for trends and historical spikes
    total_score = (
        health_score * 0.25 +
        predicted_health * 0.40 +
        headroom_score * 0.20 +
        storage_score * 0.15 +
        trend_penalty +      # Penalty for rising load trends
        max_load_penalty     # Penalty for historical high loads
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


def generate_recommendations(nodes: Dict, guests: Dict, cpu_threshold: float, mem_threshold: float, iowait_threshold: float = 30.0, maintenance_nodes: set = None) -> List[Dict]:
    """
    Generate intelligent migration recommendations using comprehensive cluster analysis

    Enhanced algorithm considers:
    - CPU, Memory, IOWait, Load Average, Storage pressure
    - Predictive load calculation (post-migration state)
    - Historical trend analysis
    - HA status (avoids migrating HA-managed guests)
    - Smart guest selection (knapsack algorithm)
    - Weighted target scoring with headroom analysis
    """
    if maintenance_nodes is None:
        maintenance_nodes = set()

    recommendations = []
    pending_target_guests = {}

    # Step 1: Identify overloaded nodes and maintenance nodes
    overloaded = []

    # First, add maintenance nodes (highest priority for evacuation)
    for node_name in maintenance_nodes:
        if node_name in nodes:
            node = nodes[node_name]
            metrics = node.get("metrics", {})
            overloaded.append({
                "node": node_name,
                "node_obj": node,
                "cpu": metrics.get("current_cpu", 0),
                "mem": metrics.get("current_mem", 0),
                "iowait": metrics.get("current_iowait", 0),
                "reason": "maintenance",
                "health_score": 200  # Highest priority for evacuation
            })

    # Then check for overloaded nodes (skip maintenance nodes as they're already added)
    for node_name, node in nodes.items():
        if node_name in maintenance_nodes:
            continue

        try:
            metrics = node.get("metrics", {})

            # Use 7-day averages for more stable, trend-aware decisions
            # Fall back to 24-hour if week data unavailable, then current
            cpu_check = metrics.get("avg_cpu_week", 0) or metrics.get("avg_cpu", 0) if metrics.get("has_historical") else metrics.get("current_cpu", 0)
            mem_check = metrics.get("avg_mem_week", 0) or metrics.get("avg_mem", 0) if metrics.get("has_historical") else metrics.get("current_mem", 0)
            iowait_check = metrics.get("avg_iowait_week", 0) or metrics.get("avg_iowait", 0) if metrics.get("has_historical") else metrics.get("current_iowait", 0)

            # Consider trends: if load is falling, be less aggressive about migrations
            cpu_trend = metrics.get("cpu_trend", "stable")
            mem_trend = metrics.get("mem_trend", "stable")

            # Adjust thresholds based on trends
            cpu_threshold_adjusted = cpu_threshold
            mem_threshold_adjusted = mem_threshold

            # If trending down, increase threshold (less likely to trigger migration)
            if cpu_trend == "falling":
                cpu_threshold_adjusted += 10  # More tolerant if load is decreasing
            elif cpu_trend == "rising":
                cpu_threshold_adjusted -= 5   # More aggressive if load is increasing

            if mem_trend == "falling":
                mem_threshold_adjusted += 10
            elif mem_trend == "rising":
                mem_threshold_adjusted -= 5

            # Check if overloaded (CPU, Memory, or high IOWait) using trend-adjusted thresholds
            is_overloaded = False
            reason = None

            if cpu_check > cpu_threshold_adjusted:
                is_overloaded = True
                reason = "cpu"
            elif mem_check > mem_threshold_adjusted:
                is_overloaded = True
                reason = "mem"
            elif iowait_check > iowait_threshold:
                is_overloaded = True
                reason = "iowait"

            if is_overloaded:
                overloaded.append({
                    "node": node_name,
                    "node_obj": node,
                    "cpu": cpu_check,
                    "mem": mem_check,
                    "iowait": iowait_check,
                    "reason": reason,
                    "health_score": calculate_node_health_score(node, metrics)
                })
        except Exception as e:
            print(f"Error analyzing node {node_name}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            continue

    # Sort overloaded nodes by health score (worst first)
    overloaded.sort(key=lambda x: x["health_score"], reverse=True)

    # Step 2: For each overloaded node, find best migrations
    for overload in overloaded:
        src_node_name = overload["node"]
        src_node = overload["node_obj"]

        # Select guests to migrate using intelligent selection
        selected_vmids = select_guests_to_migrate(src_node, guests, cpu_threshold, mem_threshold, overload["reason"])

        if not selected_vmids:
            continue

        # Step 3: For each selected guest, find best target
        for vmid_key in selected_vmids:
            guest = guests[vmid_key]

            # Find best target node
            best_target = None
            best_score = 999999

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

                    # Calculate target suitability score
                    score = calculate_target_node_score(tgt_node, guest, pending_target_guests, cpu_threshold, mem_threshold)

                    if score < best_score:
                        best_score = score
                        best_target = tgt_name

                except Exception as e:
                    print(f"Error evaluating target {tgt_name} for guest {vmid_key}: {str(e)}", file=sys.stderr)
                    import traceback
                    traceback.print_exc()
                    continue

            # Create recommendation if target found
            if best_target and best_score < 999999:
                try:
                    cmd_type = "qm" if guest.get("type") == "VM" else "pct"
                    cmd_flag = "--online" if guest.get("type") == "VM" else "--restart"
                    vmid_int = int(vmid_key) if isinstance(vmid_key, str) else vmid_key

                    # Enhanced reason with more context
                    if overload["reason"] == "maintenance":
                        reason = f"Node maintenance - evacuating {src_node_name}"
                    elif overload["reason"] == "cpu":
                        reason = f"Balance CPU load (src: {overload['cpu']:.1f}%, target: {nodes[best_target].get('metrics', {}).get('avg_cpu', 0):.1f}%)"
                    elif overload["reason"] == "mem":
                        reason = f"Balance Memory load (src: {overload['mem']:.1f}%, target: {nodes[best_target].get('metrics', {}).get('avg_mem', 0):.1f}%)"
                    elif overload["reason"] == "iowait":
                        reason = f"Reduce IOWait pressure (src: {overload['iowait']:.1f}%)"
                    else:
                        reason = "Balance cluster load"

                    recommendations.append({
                        "vmid": vmid_int,
                        "name": guest.get("name", "unknown"),
                        "type": guest.get("type", "unknown"),
                        "source_node": src_node_name,
                        "target_node": best_target,
                        "reason": reason,
                        "mem_gb": guest.get("mem_max_gb", 0),
                        "command": "{} migrate {} {} {}".format(cmd_type, vmid_int, best_target, cmd_flag),
                        "confidence_score": round(100 - best_score, 1)  # Higher score = more confident
                    })

                    # Track pending migration
                    if best_target not in pending_target_guests:
                        pending_target_guests[best_target] = []
                    pending_target_guests[best_target].append(guest)

                except Exception as e:
                    print(f"Error creating recommendation for {vmid_key}: {str(e)}", file=sys.stderr)
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
            "task_id": result,
            "source_node": source,
            "target_node": target,
            "vmid": vmid,
            "type": guest_type
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

                # Find best target node from compatible nodes only
                target_node = min(compatible_nodes, key=lambda n: n['cpu'] + n['mem'] + (pending_counts[n['node']] * 10))['node']
                pending_counts[target_node] += 1

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
                    "target": target_node,
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
            # Look for patterns like "123456789 bytes (123 MB, 117 MiB) copied"
            # or progress indicators in the log
            if task_log:
                latest_bytes = None
                total_bytes = total_disk_size  # Use disk size as total if we have it

                for entry in task_log:
                    line = entry.get('t', '')

                    # Look for byte copy progress: "123456789 bytes (123 MB, 117 MiB) copied"
                    if 'bytes' in line and 'copied' in line:
                        match = re.search(r'(\d+)\s+bytes.*copied', line)
                        if match:
                            latest_bytes = int(match.group(1))

                    # Look for total size in log (this appears at the end)
                    if 'bytes' in line and 'copied' in line and 's,' in line and 'MB/s' in line:
                        # This is likely the final summary line with total
                        match = re.search(r'(\d+)\s+bytes.*copied.*s,', line)
                        if match:
                            total_candidate = int(match.group(1))
                            # Only update total if this is larger than current (indicates final size)
                            if not total_bytes or total_candidate > (total_bytes or 0):
                                total_bytes = total_candidate

                if latest_bytes:
                    progress_info = {
                        "bytes_copied": latest_bytes,
                        "human_readable": f"{latest_bytes / (1024**3):.2f} GB"
                    }

                    if total_bytes and total_bytes > latest_bytes:
                        progress_info["total_bytes"] = total_bytes
                        progress_info["total_human_readable"] = f"{total_bytes / (1024**3):.2f} GB"
                        progress_info["percentage"] = int((latest_bytes / total_bytes) * 100)
        except:
            pass  # If we can't get log, just return status without progress

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
            verify_ssl=verify_ssl
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
                ['systemctl', 'is-active', 'proxmox-balance-automigrate.timer'],
                capture_output=True, text=True, timeout=5
            )
            timer_active = timer_result.stdout.strip() == 'active'
        except:
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

        # Get recent migrations (last 10)
        recent = history.get('migrations', [])[-10:]

        return jsonify({
            "success": True,
            "enabled": auto_config.get('enabled', False),
            "dry_run": auto_config.get('dry_run', True),
            "timer_active": timer_active,
            "check_interval_minutes": auto_config.get('check_interval_minutes', 5),
            "recent_migrations": recent,
            "state": history.get('state', {})
        })

    except Exception as e:
        print(f"Error getting automigrate status: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/automigrate/history", methods=["GET"])
def get_automigrate_history():
    """Get full migration history with optional filtering"""
    try:
        history_file = os.path.join(BASE_PATH, 'migration_history.json')

        if not os.path.exists(history_file):
            return jsonify({"success": True, "migrations": [], "total": 0})

        with open(history_file, 'r') as f:
            history = json.load(f)

        # Get query parameters
        limit = request.args.get('limit', 100, type=int)
        status_filter = request.args.get('status', None, type=str)

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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)