"""Penalty scoring configuration routes."""

from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_penalty_config, save_penalty_config
from proxbalance.scoring import DEFAULT_PENALTY_CONFIG

penalty_bp = Blueprint("penalty", __name__, url_prefix=None)


@penalty_bp.route("/api/penalty-config", methods=["GET"])
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


@penalty_bp.route("/api/penalty-config", methods=["POST"])
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


@penalty_bp.route("/api/penalty-config/reset", methods=["POST"])
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
