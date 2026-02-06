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
)
from proxbalance.recommendations import (
    select_guests_to_migrate,
    build_storage_cache,
    check_storage_compatibility,
    calculate_node_guest_counts,
    find_distribution_candidates,
    generate_recommendations,
)
