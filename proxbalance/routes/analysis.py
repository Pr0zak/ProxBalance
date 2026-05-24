from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
import json, os
from proxbalance.config_manager import (
    load_config, CONFIG_FILE, trigger_collection, get_proxmox_client,
)
from proxbalance.error_handlers import api_route

analysis_bp = Blueprint("analysis", __name__)


def read_cache():
    """Read cluster data using the app's cache manager"""
    return current_app.config['cache_manager'].get()


def get_version_info():
    """Get version info using the app's update manager"""
    return current_app.config['update_manager'].get_version_info()


@analysis_bp.route('/')
def index():
    """Serve the main index.html page"""
    return current_app.send_static_file('index.html')


@analysis_bp.route("/api/health", methods=["GET"])
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


@analysis_bp.route("/api/analyze", methods=["GET"])
@api_route
def analyze_cluster():
    """Return cached cluster data"""
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


# Progressive Loading Endpoints - Return subsets of cached data for faster initial page load

@analysis_bp.route("/api/cluster-summary", methods=["GET"])
@api_route
def get_cluster_summary():
    """Return lightweight cluster summary for immediate header rendering"""
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
        "pve_crs": data.get("pve_crs", {}),
        "node_count": len(data.get("nodes", {})),
        "guest_count": len(data.get("guests", {}))
    }

    return jsonify({"success": True, "data": summary_data})


def _build_crs_property(data):
    """Validate CRS inputs and assemble the datacenter.cfg ``crs`` property string.

    Returns ``(crs_string, error_message)``; ``error_message`` is None on success.
    Mirrors the schema PVE 9.2 exposes for /cluster/options crs.
    """
    ha = data.get("ha", "basic")
    if ha not in ("basic", "static", "dynamic"):
        return None, f"Invalid ha mode '{ha}' (expected basic, static, or dynamic)"
    parts = [f"ha={ha}"]

    for bkey in ("ha-rebalance-on-start", "ha-auto-rebalance"):
        if data.get(bkey) is not None:
            parts.append(f"{bkey}={1 if data[bkey] else 0}")

    for nkey, lo, hi in (
        ("ha-auto-rebalance-threshold", 0, 100),
        ("ha-auto-rebalance-margin", 0, 100),
        ("ha-auto-rebalance-hold-duration", 0, 1000),
    ):
        raw = data.get(nkey)
        if raw is None or raw == "":
            continue
        try:
            val = int(raw)
        except (TypeError, ValueError):
            return None, f"{nkey} must be an integer"
        if not (lo <= val <= hi):
            return None, f"{nkey} must be between {lo} and {hi}"
        parts.append(f"{nkey}={val}")

    method = data.get("ha-auto-rebalance-method")
    if method:
        if method not in ("bruteforce", "topsis"):
            return None, f"Invalid method '{method}' (expected bruteforce or topsis)"
        parts.append(f"ha-auto-rebalance-method={method}")

    return ",".join(parts), None


@analysis_bp.route("/api/pve-crs", methods=["POST"])
@api_route
def update_pve_crs():
    """Write Cluster Resource Scheduler settings to Proxmox /cluster/options.

    Requires the API token to hold Sys.Modify on '/'. On a token without it,
    Proxmox returns 403 and we surface an actionable message.
    """
    data = request.json or {}
    config = load_config()
    if config.get("error"):
        return jsonify({"success": False, "error": f"Configuration Error: {config.get('message')}"}), 500

    crs_str, err = _build_crs_property(data)
    if err:
        return jsonify({"success": False, "error": err}), 400

    try:
        proxmox = get_proxmox_client(config)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 500

    try:
        proxmox.cluster.options.put(crs=crs_str)
    except Exception as e:
        msg = str(e)
        if "403" in msg or "permission" in msg.lower() or "privilege" in msg.lower():
            return jsonify({
                "success": False,
                "error": "Proxmox API token lacks Sys.Modify on '/'. Grant it (e.g. a role "
                         "with Sys.Modify on the token) to enable editing CRS settings.",
            }), 403
        return jsonify({"success": False, "error": f"Failed to update CRS: {msg}"}), 502

    # Re-collect so cluster_cache.json (and the dashboard banner) reflect the change.
    try:
        trigger_collection()
    except Exception:
        pass

    return jsonify({"success": True, "crs": crs_str}), 200


@analysis_bp.route("/api/nodes-only", methods=["GET"])
@api_route
def get_nodes_only():
    """Return only node data for cluster map rendering"""
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


@analysis_bp.route("/api/guests-only", methods=["GET"])
@api_route
def get_guests_only():
    """Return only guest data for populating cluster map details"""
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


@analysis_bp.route("/api/score-history", methods=["GET"])
@api_route
def get_score_history():
    """Return cluster health score history for timeline charting.

    Query params:
      limit  — max rows to return (default 168)
      bucket — bucket size in minutes for query-time downsampling. When set,
               raw samples are grouped by time bucket and cluster_health is
               averaged across each bucket. Use 60 for hourly, 360 for 6h,
               1440 for daily. When omitted/zero, raw rows are returned.
    """
    from proxbalance.forecasting import (
        get_score_history as fetch_score_history,
        get_score_history_bucketed,
    )
    limit = request.args.get('limit', 168, type=int)
    bucket = request.args.get('bucket', 0, type=int)

    if bucket and bucket > 0:
        entries = get_score_history_bucketed(bucket_minutes=bucket, limit=limit)
    else:
        entries = fetch_score_history(limit=limit)

    slim = [{
        "timestamp": e.get("timestamp"),
        "cluster_health": e.get("cluster_health"),
        "recommendation_count": e.get("recommendation_count", 0),
        "nodes": {k: {"suitability": v.get("suitability"), "cpu": v.get("cpu"), "mem": v.get("mem")}
                  for k, v in e.get("nodes", {}).items()}
    } for e in entries]
    return jsonify({"success": True, "history": slim, "bucket_minutes": bucket})


@analysis_bp.route("/api/refresh", methods=["POST"])
@api_route
def refresh_data():
    """Trigger immediate data collection"""
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
