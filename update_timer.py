#!/usr/bin/env python3
"""Update systemd timer based on config"""
import json
import subprocess
import sys
import traceback

CONFIG_FILE = "/opt/proxmox-balance-manager/config.json"
TIMER_FILE = "/etc/systemd/system/proxmox-collector.timer"
SYSTEMCTL = "/usr/bin/systemctl"
DEFAULT_INTERVAL = 60

TIMER_TEMPLATE = """\
[Unit]
Description=Proxmox Balance Manager Data Collector Timer
Requires=proxmox-collector.service

[Timer]
OnBootSec=1min
OnUnitActiveSec={interval}min

[Install]
WantedBy=timers.target
"""


def load_interval():
    """Load collection interval from config file."""
    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)
    return config.get("collection_interval_minutes", DEFAULT_INTERVAL)


def write_timer(interval_minutes):
    """Write the systemd timer unit file."""
    with open(TIMER_FILE, "w") as f:
        f.write(TIMER_TEMPLATE.format(interval=interval_minutes))


def reload_timer():
    """Reload systemd and restart the collector timer."""
    subprocess.run([SYSTEMCTL, "daemon-reload"], check=True)
    subprocess.run([SYSTEMCTL, "restart", "proxmox-collector.timer"], check=True)


def main():
    try:
        interval_minutes = load_interval()
        write_timer(interval_minutes)
        reload_timer()
        print(f"Timer updated: collection every {interval_minutes} minutes")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
