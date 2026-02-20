"""
ProxBalance Simplified Settings Mapper

Maps 5 user-facing migration settings into the full 46-value penalty
configuration. Provides legacy config detection and automatic migration
from old-style penalty_scoring configs.

User-facing settings:
  1. sensitivity     – Conservative / Balanced / Aggressive  (1-3 int)
  2. trend_weight    – 0-100 (percentage, how much trends vs. snapshot matter)
  3. lookback_days   – 1 / 3 / 7 / 14 / 30
  4. min_confidence  – 50-95 (%)
  5. protect_workloads – True / False
"""

from typing import Any, Dict, Optional, Tuple

from proxbalance.scoring import DEFAULT_PENALTY_CONFIG


# ---------------------------------------------------------------------------
# Default simplified settings
# ---------------------------------------------------------------------------

DEFAULT_MIGRATION_SETTINGS: Dict[str, Any] = {
    "sensitivity": 2,           # 1=Conservative, 2=Balanced, 3=Aggressive
    "trend_weight": 60,         # 0-100%
    "lookback_days": 7,         # 1, 3, 7, 14, 30
    "min_confidence": 75,       # 50-95%
    "protect_workloads": True,  # Avoid migrating during peak hours
    "min_score_improvement": None,  # None = derived from sensitivity; int = explicit override
    "expert_overrides": None,   # None = auto-map; dict = use these penalty values directly
}

VALID_LOOKBACK_VALUES = [1, 3, 7, 14, 30]


# ---------------------------------------------------------------------------
# Sensitivity presets  (maps sensitivity 1/2/3 to scaling factors)
# ---------------------------------------------------------------------------

_SENSITIVITY_PROFILES = {
    # Conservative: higher thresholds, bigger min improvement, lower penalties
    1: {
        "penalty_scale": 0.75,
        "min_score_improvement": 25,
        "threshold_margin": 5,       # adds 5% to cpu/mem thresholds effectively
        "convergence_threshold": 12.0,
    },
    # Balanced: default values
    2: {
        "penalty_scale": 1.0,
        "min_score_improvement": 15,
        "threshold_margin": 0,
        "convergence_threshold": 8.0,
    },
    # Aggressive: lower thresholds, smaller min improvement, higher penalties
    3: {
        "penalty_scale": 1.3,
        "min_score_improvement": 8,
        "threshold_margin": -5,
        "convergence_threshold": 5.0,
    },
}


# ---------------------------------------------------------------------------
# Core mapping functions
# ---------------------------------------------------------------------------

def map_simplified_to_penalty_config(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Convert simplified settings into a full penalty config dict.

    Args:
        settings: Dict with keys matching DEFAULT_MIGRATION_SETTINGS.

    Returns:
        Complete penalty config dict compatible with scoring.py.
    """
    # If expert overrides are set, use them directly
    expert = settings.get("expert_overrides")
    if expert and isinstance(expert, dict):
        merged = dict(DEFAULT_PENALTY_CONFIG)
        merged.update(expert)
        return merged

    sensitivity = settings.get("sensitivity", 2)
    trend_weight_pct = settings.get("trend_weight", 60)

    profile = _SENSITIVITY_PROFILES.get(sensitivity, _SENSITIVITY_PROFILES[2])
    scale = profile["penalty_scale"]

    # Start from defaults and scale
    cfg = dict(DEFAULT_PENALTY_CONFIG)

    # --- Scale penalty values by sensitivity ---
    # CPU and IOWait penalties scale with the sensitivity profile.
    # Memory penalties are already low by default (memory is static in Proxmox)
    # and scale with sensitivity but are NOT amplified further.
    _cpu_penalty_keys = [
        "cpu_high_penalty", "cpu_very_high_penalty", "cpu_extreme_penalty",
        "cpu_sustained_high", "cpu_sustained_very_high", "cpu_sustained_critical",
        "cpu_trend_rising_penalty",
        "cpu_spike_moderate", "cpu_spike_high", "cpu_spike_very_high", "cpu_spike_extreme",
        "predicted_cpu_over_penalty", "predicted_cpu_high_penalty", "predicted_cpu_extreme_penalty",
    ]
    _iowait_penalty_keys = [
        "iowait_high_penalty", "iowait_very_high_penalty", "iowait_extreme_penalty",
        "iowait_sustained_elevated", "iowait_sustained_high", "iowait_sustained_critical",
    ]
    _mem_penalty_keys = [
        "mem_high_penalty", "mem_very_high_penalty", "mem_extreme_penalty",
        "mem_sustained_high", "mem_sustained_very_high", "mem_sustained_critical",
        "mem_trend_rising_penalty",
        "mem_spike_moderate", "mem_spike_high", "mem_spike_very_high", "mem_spike_extreme",
        "predicted_mem_over_penalty", "predicted_mem_high_penalty", "predicted_mem_extreme_penalty",
    ]

    for key in _cpu_penalty_keys + _iowait_penalty_keys:
        default_val = DEFAULT_PENALTY_CONFIG.get(key, 0)
        cfg[key] = int(round(default_val * scale))

    # Memory scales more gently — already reduced defaults, only mild
    # sensitivity scaling (sqrt dampening so aggressive doesn't over-penalize)
    import math
    mem_scale = 1.0 + (scale - 1.0) * 0.5  # e.g. 0.75→0.875, 1.0→1.0, 1.3→1.15
    for key in _mem_penalty_keys:
        default_val = DEFAULT_PENALTY_CONFIG.get(key, 0)
        cfg[key] = int(round(default_val * mem_scale))

    # --- Score improvement threshold ---
    # Allow explicit override; otherwise use sensitivity profile value
    msi_override = settings.get("min_score_improvement")
    if msi_override is not None and isinstance(msi_override, (int, float)):
        cfg["min_score_improvement"] = int(msi_override)
    else:
        cfg["min_score_improvement"] = profile["min_score_improvement"]
    cfg["cluster_convergence_threshold"] = profile["convergence_threshold"]

    # --- Source memory migration floor ---
    # Explicit override takes priority; otherwise keep the default (65%)
    mem_floor = settings.get("source_mem_migration_floor")
    if mem_floor is not None and isinstance(mem_floor, (int, float)):
        cfg["source_mem_migration_floor"] = int(mem_floor)

    # --- Time period weights from trend_weight ---
    # trend_weight 0% → pure snapshot: current=0.9, 24h=0.1, 7d=0.0
    # trend_weight 50% → balanced:      current=0.5, 24h=0.3, 7d=0.2
    # trend_weight 100% → pure trend:   current=0.15, 24h=0.35, 7d=0.5
    tw = max(0, min(100, trend_weight_pct)) / 100.0

    cfg["weight_current"] = round(0.9 - (0.75 * tw), 2)
    cfg["weight_24h"] = round(0.1 + (0.25 * tw), 2)
    cfg["weight_7d"] = round(0.0 + (0.5 * tw), 2)

    # Ensure weights sum to ~1.0
    total = cfg["weight_current"] + cfg["weight_24h"] + cfg["weight_7d"]
    if abs(total - 1.0) > 0.01:
        cfg["weight_current"] = round(1.0 - cfg["weight_24h"] - cfg["weight_7d"], 2)

    return cfg


def get_effective_penalty_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve the effective penalty config from application config.

    If migration_settings exists, maps simplified → penalty config.
    Otherwise falls back to legacy penalty_scoring, or defaults.
    """
    migration_settings = config.get("migration_settings")
    if migration_settings:
        return map_simplified_to_penalty_config(migration_settings)

    legacy = config.get("penalty_scoring")
    if legacy and isinstance(legacy, dict):
        merged = dict(DEFAULT_PENALTY_CONFIG)
        merged.update(legacy)
        return merged

    return dict(DEFAULT_PENALTY_CONFIG)


def get_migration_settings(config: Dict[str, Any]) -> Dict[str, Any]:
    """Get the current simplified migration settings from config.

    Returns DEFAULT_MIGRATION_SETTINGS if none are configured.
    """
    settings = config.get("migration_settings")
    if settings and isinstance(settings, dict):
        result = dict(DEFAULT_MIGRATION_SETTINGS)
        result.update(settings)
        return result
    return dict(DEFAULT_MIGRATION_SETTINGS)


# ---------------------------------------------------------------------------
# Legacy config detection and migration
# ---------------------------------------------------------------------------

def detect_legacy_config(config: Dict[str, Any]) -> bool:
    """Return True if config has old-style penalty_scoring but no migration_settings."""
    has_legacy = "penalty_scoring" in config and isinstance(config.get("penalty_scoring"), dict)
    has_new = "migration_settings" in config and isinstance(config.get("migration_settings"), dict)
    return has_legacy and not has_new


def migrate_legacy_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Create simplified migration_settings from legacy penalty_scoring.

    Performs best-fit mapping by analyzing the legacy values to determine
    which sensitivity preset they're closest to, and derives trend_weight
    from the time period weights.

    Returns a new migration_settings dict.
    """
    legacy = config.get("penalty_scoring", {})
    if not legacy:
        return dict(DEFAULT_MIGRATION_SETTINGS)

    # Determine sensitivity from min_score_improvement
    msi = legacy.get("min_score_improvement", 15)
    if msi >= 22:
        sensitivity = 1  # Conservative
    elif msi <= 10:
        sensitivity = 3  # Aggressive
    else:
        sensitivity = 2  # Balanced

    # Derive trend_weight from time period weights
    w_current = legacy.get("weight_current", 0.5)
    w_7d = legacy.get("weight_7d", 0.2)
    # Map: w_7d=0.0 → trend_weight=0, w_7d=0.5 → trend_weight=100
    trend_weight = int(min(100, max(0, w_7d / 0.5 * 100)))

    settings = {
        "sensitivity": sensitivity,
        "trend_weight": trend_weight,
        "lookback_days": 7,
        "min_confidence": 75,
        "protect_workloads": True,
        "expert_overrides": dict(legacy),  # Preserve exact legacy values as expert overrides
    }

    return settings


def validate_migration_settings(settings: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate migration settings values. Returns (valid, error_message)."""
    sensitivity = settings.get("sensitivity", 2)
    if sensitivity not in (1, 2, 3):
        return False, "sensitivity must be 1 (Conservative), 2 (Balanced), or 3 (Aggressive)"

    trend_weight = settings.get("trend_weight", 60)
    if not (0 <= trend_weight <= 100):
        return False, "trend_weight must be between 0 and 100"

    lookback = settings.get("lookback_days", 7)
    if lookback not in VALID_LOOKBACK_VALUES:
        return False, f"lookback_days must be one of {VALID_LOOKBACK_VALUES}"

    confidence = settings.get("min_confidence", 75)
    if not (50 <= confidence <= 95):
        return False, "min_confidence must be between 50 and 95"

    msi = settings.get("min_score_improvement")
    if msi is not None and not (1 <= msi <= 100):
        return False, "min_score_improvement must be between 1 and 100"

    return True, ""


# ---------------------------------------------------------------------------
# Setting descriptions for UI
# ---------------------------------------------------------------------------

SETTING_DESCRIPTIONS: Dict[str, Dict[str, str]] = {
    "sensitivity": {
        "label": "Migration Sensitivity",
        "description": "How aggressively to recommend migrations",
        "options": {
            "1": "Conservative — Only migrate for sustained, clear problems. Prefers stability.",
            "2": "Balanced — Migrate when trends show growing problems.",
            "3": "Aggressive — Migrate proactively to maintain optimal balance.",
        },
    },
    "trend_weight": {
        "label": "Trend Weight",
        "description": "How much historical trends matter vs. current snapshot. 0% = pure snapshot, 100% = pure trend-based.",
    },
    "lookback_days": {
        "label": "Analysis Lookback",
        "description": "How many days of history to analyze when detecting trends.",
    },
    "min_confidence": {
        "label": "Minimum Confidence",
        "description": "Minimum confidence score required before recommending a migration.",
    },
    "protect_workloads": {
        "label": "Protect Running Workloads",
        "description": "Avoid migrating guests during their detected peak usage hours.",
    },
}
