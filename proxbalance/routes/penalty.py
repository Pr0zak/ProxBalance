"""Penalty scoring configuration and migration settings routes."""

from flask import Blueprint, jsonify, request
from proxbalance.config_manager import load_penalty_config, save_penalty_config, load_config, save_config
from proxbalance.scoring import DEFAULT_PENALTY_CONFIG
from proxbalance.error_handlers import api_route
from proxbalance.settings_mapper import (
    DEFAULT_MIGRATION_SETTINGS,
    SETTING_DESCRIPTIONS,
    get_effective_penalty_config,
    get_migration_settings,
    map_simplified_to_penalty_config,
    validate_migration_settings,
    detect_legacy_config,
    migrate_legacy_config,
)

penalty_bp = Blueprint("penalty", __name__, url_prefix=None)


# Scoring profile presets — map high-level intent to concrete penalty values
# Memory penalties are kept deliberately low across all presets because
# Proxmox VM/CT memory allocations are mostly static.  CPU is the primary
# fluctuating resource that drives meaningful migration decisions.
SCORING_PRESETS = {
    "conservative": {
        "label": "Conservative",
        "description": "High bar for migrations. Only recommends moves with clear, significant benefit. Best for production clusters where stability is paramount.",
        "config": {
            **DEFAULT_PENALTY_CONFIG,
            "cpu_high_penalty": 15,
            "cpu_very_high_penalty": 40,
            "cpu_extreme_penalty": 80,
            "mem_high_penalty": 6,
            "mem_very_high_penalty": 15,
            "mem_extreme_penalty": 40,
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
            "mem_high_penalty": 10,
            "mem_very_high_penalty": 25,
            "mem_extreme_penalty": 60,
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


# ---------------------------------------------------------------------------
# Simplified Migration Settings endpoints
# ---------------------------------------------------------------------------

@penalty_bp.route("/api/migration-settings", methods=["GET"])
@api_route
def get_migration_settings_endpoint():
    """Get simplified migration settings and the resulting effective penalty config."""
    try:
        config = load_config()
    except Exception:
        config = {}

    # Auto-migrate legacy config if needed
    if detect_legacy_config(config):
        settings = migrate_legacy_config(config)
    else:
        settings = get_migration_settings(config)

    effective_config = get_effective_penalty_config(config)

    return jsonify({
        "success": True,
        "settings": settings,
        "effective_penalty_config": effective_config,
        "defaults": DEFAULT_MIGRATION_SETTINGS,
        "descriptions": SETTING_DESCRIPTIONS,
        "has_expert_overrides": settings.get("expert_overrides") is not None,
    })


@penalty_bp.route("/api/migration-settings", methods=["PUT"])
@api_route
def update_migration_settings_endpoint():
    """Update simplified migration settings."""
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "Missing request body"}), 400

    settings = data.get("settings", data)

    # Validate
    valid, error_msg = validate_migration_settings(settings)
    if not valid:
        return jsonify({"success": False, "error": error_msg}), 400

    # Build clean settings dict
    new_settings = {
        "sensitivity": settings.get("sensitivity", DEFAULT_MIGRATION_SETTINGS["sensitivity"]),
        "trend_weight": settings.get("trend_weight", DEFAULT_MIGRATION_SETTINGS["trend_weight"]),
        "lookback_days": settings.get("lookback_days", DEFAULT_MIGRATION_SETTINGS["lookback_days"]),
        "min_confidence": settings.get("min_confidence", DEFAULT_MIGRATION_SETTINGS["min_confidence"]),
        "protect_workloads": settings.get("protect_workloads", DEFAULT_MIGRATION_SETTINGS["protect_workloads"]),
    }

    # Include min_score_improvement override if provided
    if "min_score_improvement" in settings:
        new_settings["min_score_improvement"] = settings["min_score_improvement"]

    # Preserve expert overrides if present
    if "expert_overrides" in settings:
        new_settings["expert_overrides"] = settings["expert_overrides"]

    # Save to config
    try:
        config = load_config()
    except Exception:
        config = {}

    config["migration_settings"] = new_settings

    # Also update the effective penalty_scoring for backward compatibility
    effective = map_simplified_to_penalty_config(new_settings)
    config["penalty_scoring"] = effective

    if save_config(config):
        return jsonify({
            "success": True,
            "message": "Migration settings updated",
            "settings": new_settings,
            "effective_penalty_config": effective,
        })
    else:
        return jsonify({"success": False, "error": "Failed to save settings"}), 500


@penalty_bp.route("/api/migration-settings/reset", methods=["POST"])
@api_route
def reset_migration_settings_endpoint():
    """Reset migration settings to defaults."""
    try:
        config = load_config()
    except Exception:
        config = {}

    config["migration_settings"] = dict(DEFAULT_MIGRATION_SETTINGS)
    effective = map_simplified_to_penalty_config(DEFAULT_MIGRATION_SETTINGS)
    config["penalty_scoring"] = effective

    if save_config(config):
        return jsonify({
            "success": True,
            "message": "Migration settings reset to defaults",
            "settings": DEFAULT_MIGRATION_SETTINGS,
            "effective_penalty_config": effective,
        })
    else:
        return jsonify({"success": False, "error": "Failed to reset settings"}), 500


# ---------------------------------------------------------------------------
# Trend analysis API endpoints
# ---------------------------------------------------------------------------

@penalty_bp.route("/api/trends/nodes", methods=["GET"])
@api_route
def get_trends_nodes():
    """Get trend analysis summary for all nodes."""
    from proxbalance.trend_analysis import get_cluster_trend_summary

    lookback = request.args.get("lookback_days", 7, type=int)
    cpu_threshold = request.args.get("cpu_threshold", 60.0, type=float)
    mem_threshold = request.args.get("mem_threshold", 70.0, type=float)

    summary = get_cluster_trend_summary(
        lookback_hours=lookback * 24,
        cpu_threshold=cpu_threshold,
        mem_threshold=mem_threshold,
    )

    return jsonify({"success": True, **summary})


@penalty_bp.route("/api/trends/node/<node_name>", methods=["GET"])
@api_route
def get_trends_node(node_name):
    """Get detailed trend analysis for a single node."""
    from proxbalance.trend_analysis import analyze_node_trends

    lookback = request.args.get("lookback_days", 7, type=int)
    cpu_threshold = request.args.get("cpu_threshold", 60.0, type=float)
    mem_threshold = request.args.get("mem_threshold", 70.0, type=float)

    trends = analyze_node_trends(
        node_name,
        lookback_hours=lookback * 24,
        cpu_threshold=cpu_threshold,
        mem_threshold=mem_threshold,
    )

    return jsonify({"success": True, **trends})


@penalty_bp.route("/api/trends/guest/<vmid>", methods=["GET"])
@api_route
def get_trends_guest(vmid):
    """Get detailed trend analysis for a single guest."""
    from proxbalance.trend_analysis import analyze_guest_trends

    lookback = request.args.get("lookback_days", 7, type=int)

    trends = analyze_guest_trends(str(vmid), lookback_hours=lookback * 24)

    return jsonify({"success": True, **trends})
