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


# ---------------------------------------------------------------------------
# Disk / storage constants
# ---------------------------------------------------------------------------

DISK_PREFIXES = ('scsi', 'ide', 'virtio', 'sata', 'mp', 'rootfs')


# ---------------------------------------------------------------------------
# Outcome tracking defaults
# ---------------------------------------------------------------------------

MAX_OUTCOME_ENTRIES = 100
POST_CAPTURE_DELAY_SECONDS = 300  # 5 minutes


# ---------------------------------------------------------------------------
# Score history defaults
# ---------------------------------------------------------------------------

SCORE_HISTORY_MAX_ENTRIES = 720  # ~30 days at hourly snapshots
MAX_GUEST_PROFILE_SAMPLES = 168  # 7 days of hourly samples
