#!/usr/bin/env python3
"""
ProxBalance Recommendations Generator

Periodically generates migration recommendations and caches them.
This ensures fresh recommendations are always available for both the UI and automated migrations.

The timer interval dynamically adjusts based on cluster size to balance freshness with API load.
"""

import sys
import json
import logging
import requests
import subprocess
import time
import traceback
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "config.json"
CLUSTER_CACHE = BASE_DIR / "cluster_cache.json"

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def load_config():
    """Load configuration from config.json."""
    if not CONFIG_FILE.exists():
        logger.error(f"Configuration file not found: {CONFIG_FILE}")
        sys.exit(1)

    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def get_cluster_size():
    """Get current cluster size from cache."""
    try:
        if not CLUSTER_CACHE.exists():
            return 0, 0

        with open(CLUSTER_CACHE, 'r') as f:
            data = json.load(f)
            num_nodes = len(data.get('nodes', {}))
            num_guests = len(data.get('guests', {}))
            return num_nodes, num_guests
    except Exception as e:
        logger.warning(f"Could not read cluster size: {e}")
        return 0, 0


def calculate_optimal_interval(num_guests, num_nodes, generation_time_seconds):
    """
    Calculate optimal timer interval based on cluster size and generation time.

    Strategy:
    - Small clusters: More frequent updates (less API load)
    - Large clusters: Less frequent updates (avoid overwhelming API)
    - Safety margin: Ensure interval > generation time to prevent overlaps

    Args:
        num_guests: Number of guests in cluster
        num_nodes: Number of nodes in cluster
        generation_time_seconds: How long generation took

    Returns:
        Interval in minutes
    """
    # Base intervals by guest count (threshold, interval_minutes)
    INTERVAL_TIERS = [(50, 10), (150, 15), (300, 20), (500, 30)]
    base_interval = 60  # Default for huge clusters
    for threshold, interval in INTERVAL_TIERS:
        if num_guests < threshold:
            base_interval = interval
            break

    # Adjust for generation time (ensure interval is at least 2x generation time)
    min_safe_interval = int((generation_time_seconds / 60) * 2) + 1
    interval = max(base_interval, min_safe_interval)

    # Cap at reasonable bounds
    interval = max(5, min(interval, 120))  # Between 5 min and 2 hours

    return interval


def update_timer_interval(interval_minutes):
    """
    Update the systemd timer interval dynamically.

    Args:
        interval_minutes: New interval in minutes
    """
    try:
        # Create systemd drop-in override
        override_dir = Path("/etc/systemd/system/proxmox-balance-recommendations.timer.d")
        override_dir.mkdir(parents=True, exist_ok=True)

        override_file = override_dir / "interval.conf"
        override_content = f"""[Timer]
OnUnitActiveSec=
OnUnitActiveSec={interval_minutes}min
"""

        with open(override_file, 'w') as f:
            f.write(override_content)

        # Reload systemd to apply changes
        subprocess.run(['systemctl', 'daemon-reload'], check=True, capture_output=True)

        logger.info(f"✓ Timer interval updated to {interval_minutes} minutes")
        return True

    except Exception as e:
        logger.warning(f"Could not update timer interval: {e}")
        return False


def generate_recommendations():
    """Generate recommendations by calling the local API and adjust timer interval."""
    start_time = time.time()

    try:
        # Get cluster size for interval calculation
        num_nodes, num_guests = get_cluster_size()
        logger.info(f"Cluster size: {num_nodes} nodes, {num_guests} guests")

        # Load configuration
        config = load_config()

        # Get thresholds from config
        thresholds = config.get('recommendation_thresholds', {})
        automigrate_config = config.get('automated_migrations', {})

        payload = {
            'cpu_threshold': thresholds.get('cpu_threshold', 60),
            'mem_threshold': thresholds.get('mem_threshold', 70),
            'iowait_threshold': thresholds.get('iowait_threshold', 30),
            'maintenance_nodes': automigrate_config.get('maintenance_nodes', [])
        }

        logger.info(f"Generating recommendations with thresholds: CPU={payload['cpu_threshold']}%, MEM={payload['mem_threshold']}%, IOWait={payload['iowait_threshold']}%")

        # Call local API to generate recommendations
        response = requests.post(
            'http://127.0.0.1:5000/api/recommendations',
            json=payload,
            timeout=120  # 2 minutes for large clusters
        )
        response.raise_for_status()
        result = response.json()

        generation_time = time.time() - start_time

        if result.get('success'):
            count = len(result.get('recommendations', []))
            ai_enhanced = result.get('ai_enhanced', False)
            logger.info(f"✓ Successfully generated {count} recommendations in {generation_time:.1f}s" + (" (AI Enhanced)" if ai_enhanced else ""))

            # Send notification if there are actionable recommendations
            if count > 0:
                try:
                    from notifications import send_notification
                    recs = result.get('recommendations', [])
                    top = recs[0] if recs else {}
                    send_notification(config, "recommendations", {
                        "count": count,
                        "ai_enhanced": ai_enhanced,
                        "top_recommendation": {
                            "vmid": top.get("vmid"),
                            "name": top.get("name"),
                            "type": top.get("type", "VM"),
                            "target_node": top.get("target_node"),
                        } if top else None,
                    })
                except Exception as e:
                    logger.warning(f"Could not send recommendations notification: {e}")

            # Dynamically adjust timer interval based on cluster size
            optimal_interval = calculate_optimal_interval(num_guests, num_nodes, generation_time)
            logger.info(f"Optimal interval for {num_guests} guests: {optimal_interval} minutes")
            update_timer_interval(optimal_interval)

            return 0
        else:
            logger.error(f"Failed to generate recommendations: {result.get('error', 'Unknown error')}")
            return 1

    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        return 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(generate_recommendations())
