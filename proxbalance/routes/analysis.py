from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from proxbalance.config_manager import (
    load_config, CONFIG_FILE, trigger_collection,
)

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

@analysis_bp.route("/api/cluster-summary", methods=["GET"])
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


@analysis_bp.route("/api/nodes-only", methods=["GET"])
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


@analysis_bp.route("/api/guests-only", methods=["GET"])
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


@analysis_bp.route("/api/refresh", methods=["POST"])
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
