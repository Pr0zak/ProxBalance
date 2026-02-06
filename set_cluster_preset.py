#!/usr/bin/env python3
"""
Helper script to set cluster size presets for ProxBalance
Automatically configures optimal collection settings based on cluster size
"""

import json
import subprocess
import sys
import traceback

CONFIG_FILE = "/opt/proxmox-balance-manager/config.json"

# Base optimization template - all presets share these defaults
_BASE_OPTIMIZATION = {
    "parallel_collection_enabled": True,
    "skip_stopped_guest_rrd": True,
    "node_rrd_timeframe": "day",
    "guest_rrd_timeframe": "hour"
}

def _make_preset(description, interval, size, workers, **overrides):
    """Create a preset by merging overrides into the base optimization template."""
    optimization = {**_BASE_OPTIMIZATION, "cluster_size": size, "max_parallel_workers": workers, **overrides}
    return {"description": description, "collection_interval_minutes": interval, "collection_optimization": optimization}

# Cluster size presets
PRESETS = {
    "small":  _make_preset("Small cluster (< 30 VMs/CTs)",      5, "small",  3),
    "medium": _make_preset("Medium cluster (30-100 VMs/CTs)",   15, "medium", 5),
    "large":  _make_preset("Large cluster (100+ VMs/CTs)",      30, "large",  8, node_rrd_timeframe="hour"),
    "custom": _make_preset("Custom settings (manual configuration)", 60, "custom", 5),
}

def apply_preset(preset_name: str) -> bool:
    """Apply a cluster size preset to config.json"""
    if preset_name not in PRESETS:
        print(f"Error: Unknown preset '{preset_name}'", file=sys.stderr)
        print(f"Available presets: {', '.join(PRESETS.keys())}", file=sys.stderr)
        return False

    try:
        # Load current config
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)

        # Apply preset
        preset = PRESETS[preset_name]
        config['collection_interval_minutes'] = preset['collection_interval_minutes']
        config['collection_optimization'] = preset['collection_optimization']

        # Write updated config
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)

        print(f"✓ Applied '{preset_name}' preset")
        print(f"  {preset['description']}")
        print(f"  Collection interval: {preset['collection_interval_minutes']} minutes")
        print(f"  Parallel workers: {preset['collection_optimization']['max_parallel_workers']}")
        print(f"  Node RRD timeframe: {preset['collection_optimization']['node_rrd_timeframe']}")
        print()
        print("Updating collection timer...")

        # Update systemd timer
        try:
            subprocess.run(['/opt/proxmox-balance-manager/venv/bin/python3',
                          '/opt/proxmox-balance-manager/update_timer.py'],
                          check=True)
            print("✓ Timer updated successfully")
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to update timer: {e}", file=sys.stderr)

        return True

    except Exception as e:
        print(f"Error applying preset: {e}", file=sys.stderr)
        traceback.print_exc()
        return False

def show_presets():
    """Show available presets"""
    print("Available Cluster Size Presets:")
    print("=" * 70)
    for name, preset in PRESETS.items():
        print(f"\n{name.upper()}")
        print(f"  Description: {preset['description']}")
        print(f"  Collection interval: {preset['collection_interval_minutes']} minutes")
        opt = preset['collection_optimization']
        print(f"  Parallel workers: {opt['max_parallel_workers']}")
        print(f"  Skip stopped RRD: {opt['skip_stopped_guest_rrd']}")
        print(f"  Node timeframe: {opt['node_rrd_timeframe']}")
        print(f"  Guest timeframe: {opt['guest_rrd_timeframe']}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 set_cluster_preset.py <preset>")
        print("       python3 set_cluster_preset.py --list")
        print()
        show_presets()
        sys.exit(1)

    if sys.argv[1] in ['--list', '-l']:
        show_presets()
        sys.exit(0)

    preset_name = sys.argv[1].lower()
    success = apply_preset(preset_name)
    sys.exit(0 if success else 1)
