"""
ProxBalance Shared Constants

Single source of truth for path constants, disk prefixes, and file locations.
All data file paths are defined here to provide a complete manifest.
"""

import os


# ---------------------------------------------------------------------------
# Base paths (environment-aware)
# ---------------------------------------------------------------------------

if os.path.exists('/opt/proxmox-balance-manager'):
    # Production environment
    BASE_PATH = '/opt/proxmox-balance-manager'
    GIT_REPO_PATH = '/opt/proxmox-balance-manager'
else:
    # Docker dev environment
    BASE_PATH = '/app/cache'
    GIT_REPO_PATH = '/app'


# ---------------------------------------------------------------------------
# Data file paths
# ---------------------------------------------------------------------------

CACHE_FILE = os.path.join(BASE_PATH, 'cluster_cache.json')
CONFIG_FILE = os.path.join(BASE_PATH, 'config.json')
SESSIONS_DIR = os.path.join(BASE_PATH, 'evacuation_sessions')
OUTCOMES_FILE = os.path.join(BASE_PATH, 'migration_outcomes.json')
SCORE_HISTORY_FILE = os.path.join(BASE_PATH, 'score_history.json')
RECOMMENDATION_TRACKING_FILE = os.path.join(BASE_PATH, 'recommendation_tracking.json')
GUEST_PROFILES_FILE = os.path.join(BASE_PATH, 'guest_profiles.json')

# Persistent metrics history (trend-based migrations)
NODE_METRICS_FILE = os.path.join(BASE_PATH, 'node_metrics_history.json')
GUEST_METRICS_FILE = os.path.join(BASE_PATH, 'guest_metrics_history.json')


# ---------------------------------------------------------------------------
# Disk / storage constants
# ---------------------------------------------------------------------------

DISK_PREFIXES = ('scsi', 'ide', 'virtio', 'sata', 'mp', 'rootfs')


# ---------------------------------------------------------------------------
# Outcome tracking defaults
# ---------------------------------------------------------------------------

MAX_OUTCOME_ENTRIES = 500
POST_CAPTURE_DELAY_SECONDS = 300      # 5 minutes (initial snapshot)
POST_CAPTURE_1H_SECONDS = 3600        # 1 hour (short-term verification)
POST_CAPTURE_24H_SECONDS = 86400      # 24 hours (sustained verification)


# ---------------------------------------------------------------------------
# Score history defaults
# ---------------------------------------------------------------------------

SCORE_HISTORY_MAX_ENTRIES = 720  # ~30 days at hourly snapshots
MAX_GUEST_PROFILE_SAMPLES = 168  # 7 days of hourly samples


# ---------------------------------------------------------------------------
# Persistent metrics store defaults (trend-based migrations)
# ---------------------------------------------------------------------------

METRICS_RETENTION_DAYS = 90       # Maximum history retention
METRICS_RECENT_HOURS = 48         # Full-resolution window
METRICS_SHORT_TERM_DAYS = 14      # Hourly aggregate window
