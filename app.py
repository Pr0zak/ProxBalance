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
import time
import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, List
from pathlib import Path
from ai_provider import AIProviderFactory
from update_manager import UpdateManager

# Import from the proxbalance package
from proxbalance.config_manager import (
    BASE_PATH, CACHE_FILE, CONFIG_FILE, GIT_REPO_PATH, SESSIONS_DIR,
    DISK_PREFIXES, load_config, save_config, get_proxmox_client,
    load_penalty_config, save_penalty_config, validate_config_structure,
    read_cache_file, trigger_collection,
)
from proxbalance.cache import CacheManager
from proxbalance.scoring import (
    DEFAULT_PENALTY_CONFIG,
    calculate_intelligent_thresholds,
    calculate_node_health_score,
    predict_post_migration_load,
    calculate_target_node_score,
)
from proxbalance.recommendations import (
    select_guests_to_migrate, build_storage_cache,
    check_storage_compatibility, calculate_node_guest_counts,
    find_distribution_candidates, generate_recommendations,
)
from proxbalance.migrations import (
    execute_migration as _execute_migration,
    execute_batch_migration as _execute_batch_migration,
    cancel_migration as _cancel_migration,
)
from proxbalance.evacuation import (
    _get_session_file, _read_session, _write_session,
    _update_evacuation_progress, _execute_evacuation,
)

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
Compress(app)  # Enable gzip compression for all responses

GIT_CMD = '/usr/bin/git'

# Update manager instance
update_manager = UpdateManager(GIT_REPO_PATH, GIT_CMD)

# Ensure evacuation sessions directory exists
if not os.path.exists(SESSIONS_DIR):
    os.makedirs(SESSIONS_DIR, exist_ok=True)

# Global cache manager instance (60 second TTL)
cache_manager = CacheManager(cache_file=CACHE_FILE, ttl_seconds=60)

@app.route('/')
def index():
    """Serve the main index.html page"""
    return app.send_static_file('index.html')

def read_cache() -> Dict:
    """Read cluster data from cache (uses in-memory cache with TTL)"""
    return cache_manager.get()

def get_version_info():
    """Get current version and branch information."""
    return update_manager.get_version_info()

def check_for_updates():
    """Check if updates are available based on release/branch status."""
    return update_manager.check_for_updates()


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



# Scoring, recommendation, storage, and distribution functions imported from proxbalance package


@app.route("/api/migrate", methods=["POST"])
def execute_migration():
    """Execute a migration using Proxmox API"""
    data = request.json
    config = load_config()
    try:
        proxmox = get_proxmox_client(config)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500

    result, status = _execute_migration(
        proxmox,
        data.get("vmid"),
        data.get("target_node"),
        data.get("source_node"),
        data.get("type", "VM"),
    )
    return jsonify(result), status


@app.route("/api/migrate/batch", methods=["POST"])
def execute_batch_migration():
    """Execute multiple migrations via Proxmox API"""
    config = load_config()
    try:
        proxmox = get_proxmox_client(config)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500

    data = request.json
    result, status = _execute_batch_migration(proxmox, data.get("migrations", []))
    return jsonify(result), status


@app.route("/api/migrations/<path:task_id>/cancel", methods=["POST"])
def cancel_migration(task_id):
    """Cancel a running migration by stopping the Proxmox task"""
    config = load_config()
    result, status = _cancel_migration(config, task_id)
    return jsonify(result), status


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
                    if key.startswith(DISK_PREFIXES):
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
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
                    if key.startswith(DISK_PREFIXES):
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



# Evacuation execution functions imported from proxbalance.evacuation

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


@app.route("/api/validate-token", methods=["POST"])
def validate_token():
    """Validate Proxmox API token and check permissions"""
    try:
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

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Validation error: {str(e)}"
        }), 500


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
            "changelog": update_info.get('changelog', []),
            "previous_branch": update_manager._load_previous_branch(),
            "update_in_progress": update_manager.is_locked
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
    result = update_manager.perform_update()
    status_code = 200 if result.get('success', False) else 500
    return jsonify(result), status_code

@app.route("/api/system/branches", methods=["GET"])
def list_branches():
    """List all available git branches"""
    try:
        result = update_manager.list_branches()
        return jsonify(result)
    except Exception as e:
        print(f"Error listing branches: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/system/switch-branch", methods=["POST"])
def switch_branch():
    """Switch to a different git branch"""
    data = request.get_json()
    target_branch = data.get('branch', '')
    result = update_manager.switch_branch(target_branch)
    status_code = 200 if result.get('success', False) else 400
    return jsonify(result), status_code


@app.route("/api/system/branch-preview/<branch>", methods=["GET"])
def branch_preview(branch):
    """Preview commits in a branch compared to main"""
    result = update_manager.branch_preview(branch)
    status_code = 200 if result.get('success', False) else 400
    return jsonify(result), status_code

@app.route("/api/system/rollback-branch", methods=["POST"])
def rollback_branch():
    """Switch back to the previously active branch"""
    result = update_manager.rollback_branch()
    status_code = 200 if result.get('success', False) else 400
    return jsonify(result), status_code

@app.route("/api/system/restart-service", methods=["POST"])
def restart_service():
    """Restart a ProxBalance service"""
    data = request.get_json()
    service = data.get('service', 'proxmox-balance')
    result = update_manager.restart_service(service)
    status_code = 200 if result.get('success', False) else (400 if 'Invalid service' in result.get('error', '') else 500)
    return jsonify(result), status_code


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

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
                        if key.startswith(DISK_PREFIXES):
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

        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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

        try:
            proxmox = get_proxmox_client(config, timeout=30)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
        try:
            proxmox = get_proxmox_client(config)
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 500

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


@app.route("/api/notifications/test", methods=["POST"])
def test_notifications():
    """Send a test notification to all enabled notification providers."""
    try:
        from notifications import NotificationManager

        config = load_config()
        if config.get('error'):
            return jsonify({"success": False, "error": config.get('message')}), 500

        manager = NotificationManager(config)

        if not manager.enabled:
            return jsonify({
                "success": False,
                "error": "Notifications are not enabled. Enable notifications first."
            }), 400

        if not manager.providers:
            return jsonify({
                "success": False,
                "error": "No notification providers are configured and enabled."
            }), 400

        results = manager.test()

        all_ok = all(r.get("success") for r in results.values())

        return jsonify({
            "success": all_ok,
            "results": results,
            "message": "Test notifications sent successfully" if all_ok else "Some providers failed"
        })

    except Exception as e:
        print(f"Error testing notifications: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/notifications/providers", methods=["GET"])
def get_notification_providers():
    """Return the list of available notification providers and their config schema."""
    from notifications import get_default_notifications_config
    defaults = get_default_notifications_config()

    return jsonify({
        "success": True,
        "providers": list(defaults["providers"].keys()),
        "defaults": defaults
    })


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