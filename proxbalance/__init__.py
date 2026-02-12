"""
ProxBalance - Intelligent Proxmox VE cluster monitoring and migration management.

This package provides the core logic for the ProxBalance application,
organized into focused modules by domain.
"""

from proxbalance.config_manager import (
    BASE_PATH,
    CACHE_FILE,
    CONFIG_FILE,
    GIT_REPO_PATH,
    SESSIONS_DIR,
    DISK_PREFIXES,
    load_config,
    save_config,
    get_proxmox_client,
    load_penalty_config,
    save_penalty_config,
    validate_config_structure,
    read_cache,
    trigger_collection,
)
from proxbalance.cache import CacheManager
from proxbalance.scoring import (
    DEFAULT_PENALTY_CONFIG,
    calculate_intelligent_thresholds,
    calculate_node_health_score,
    predict_post_migration_load,
    calculate_target_node_score,
    calculate_migration_risk,
)
from proxbalance.forecasting import (
    project_trend,
    generate_forecast_recommendations,
    save_score_snapshot,
    SCORE_HISTORY_FILE,
)
from proxbalance.patterns import analyze_workload_patterns, get_node_seasonal_baseline
from proxbalance.guest_profiles import (
    load_guest_profiles,
    save_guest_profiles,
    update_guest_profile,
    classify_guest_behavior,
    get_guest_profile,
)
from proxbalance.recommendations import (
    select_guests_to_migrate,
    build_storage_cache,
    check_storage_compatibility,
    calculate_node_guest_counts,
    find_distribution_candidates,
    generate_recommendations,
)
from proxbalance.outcomes import (
    capture_pre_migration_snapshot,
    record_migration_outcome,
    update_post_migration_metrics,
    get_migration_outcomes,
)
from proxbalance.migrations import get_rollback_info
from proxbalance.execution_planner import compute_execution_order
from proxbalance.reporting import build_summary, generate_capacity_advisories
