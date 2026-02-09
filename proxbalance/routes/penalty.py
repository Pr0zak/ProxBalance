"""Penalty scoring configuration routes."""

from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_penalty_config, save_penalty_config
from proxbalance.scoring import DEFAULT_PENALTY_CONFIG
from proxbalance.error_handlers import api_route

penalty_bp = Blueprint("penalty", __name__, url_prefix=None)


# Scoring profile presets — map high-level intent to concrete penalty values
SCORING_PRESETS = {
    "conservative": {
        "label": "Conservative",
        "description": "High bar for migrations. Only recommends moves with clear, significant benefit. Best for production clusters where stability is paramount.",
        "config": {
            **DEFAULT_PENALTY_CONFIG,
            "cpu_high_penalty": 15,
            "cpu_very_high_penalty": 40,
            "cpu_extreme_penalty": 80,
            "mem_high_penalty": 15,
            "mem_very_high_penalty": 40,
            "mem_extreme_penalty": 80,
            "min_score_improvement": 25,
            "weight_current": 0.4,
            "weight_24h": 0.35,
            "weight_7d": 0.25,
        },
    },
    "balanced": {
        "label": "Balanced",
        "description": "Moderate sensitivity. Recommends migrations when there is a clear benefit without being overly aggressive. Suitable for most clusters.",
        "config": {**DEFAULT_PENALTY_CONFIG},  # Defaults are the balanced preset
    },
    "aggressive": {
        "label": "Aggressive",
        "description": "Low bar for migrations. Recommends moves for even modest improvements. Best for clusters that benefit from frequent rebalancing.",
        "config": {
            **DEFAULT_PENALTY_CONFIG,
            "cpu_high_penalty": 30,
            "cpu_very_high_penalty": 65,
            "cpu_extreme_penalty": 130,
            "mem_high_penalty": 30,
            "mem_very_high_penalty": 65,
            "mem_extreme_penalty": 130,
            "min_score_improvement": 8,
            "weight_current": 0.6,
            "weight_24h": 0.3,
            "weight_7d": 0.1,
        },
    },
}


@penalty_bp.route("/api/penalty-config", methods=["GET"])
@api_route
def get_penalty_config():
    """Get penalty scoring configuration with defaults and presets"""
    penalty_config = load_penalty_config()

    # Detect which preset the current config matches (if any)
    active_preset = "custom"
    for preset_key, preset in SCORING_PRESETS.items():
        if all(penalty_config.get(k) == v for k, v in preset["config"].items()):
            active_preset = preset_key
            break

    return jsonify({
        "success": True,
        "config": penalty_config,
        "defaults": DEFAULT_PENALTY_CONFIG,
        "presets": {k: {"label": v["label"], "description": v["description"]} for k, v in SCORING_PRESETS.items()},
        "active_preset": active_preset,
    })


@penalty_bp.route("/api/penalty-config/presets", methods=["GET"])
@api_route
def get_penalty_presets():
    """Get available scoring profile presets"""
    penalty_config = load_penalty_config()

    # Detect active preset
    active_preset = "custom"
    for preset_key, preset in SCORING_PRESETS.items():
        if all(penalty_config.get(k) == v for k, v in preset["config"].items()):
            active_preset = preset_key
            break

    return jsonify({
        "success": True,
        "presets": {k: {"label": v["label"], "description": v["description"], "config": v["config"]} for k, v in SCORING_PRESETS.items()},
        "active_preset": active_preset,
    })


@penalty_bp.route("/api/penalty-config/presets/<preset_name>", methods=["POST"])
@api_route
def apply_penalty_preset(preset_name):
    """Apply a scoring profile preset"""
    if preset_name not in SCORING_PRESETS:
        return jsonify({
            "success": False,
            "error": f"Unknown preset '{preset_name}'. Available: {', '.join(SCORING_PRESETS.keys())}"
        }), 400

    preset_config = SCORING_PRESETS[preset_name]["config"]

    if save_penalty_config(preset_config):
        return jsonify({
            "success": True,
            "message": f"Applied '{SCORING_PRESETS[preset_name]['label']}' scoring profile",
            "config": preset_config,
            "active_preset": preset_name,
        })
    else:
        return jsonify({"success": False, "error": "Failed to save preset configuration"}), 500


@penalty_bp.route("/api/penalty-config", methods=["POST"])
@api_route
def update_penalty_config():
    """Update penalty scoring configuration"""
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


@penalty_bp.route("/api/penalty-config/reset", methods=["POST"])
@api_route
def reset_penalty_config():
    """Reset penalty scoring configuration to defaults"""
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
