"""
Print a ProxBalance config.json for the demo cluster.

Starts from ``config.example.json`` and points ProxBalance at the fake
Proxmox API on 127.0.0.1:8006. No real credentials: the token secret is a
placeholder the fake API accepts, and every notification provider stays
disabled.

Usage::

    venv/bin/python tools/demo/make_config.py > config.json
"""

import json
import os

APP = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
EVERY_DAY = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def build() -> dict:
    with open(os.path.join(APP, "config.example.json")) as f:
        cfg = json.load(f)
    cfg.update({
        "proxmox_host": "127.0.0.1",
        "proxmox_port": 8006,
        "proxmox_auth_method": "api_token",
        "proxmox_api_token_id": "proxbalance@pam!demo",
        "proxmox_api_token_secret": "demo-cluster-not-a-secret",
        "proxmox_verify_ssl": False,
        "collection_interval_minutes": 5,
        "ui_refresh_interval_minutes": 5,
        "updates": {"channel": "dev"},
    })
    am = cfg["automated_migrations"]
    am.update({
        "enabled": True,
        "dry_run": False,
        "mode": "semi",
        "approval_ttl_hours": 24,
        "check_interval_minutes": 15,
        "maintenance_nodes": [],
    })
    am["schedule"] = {
        "timezone": "America/Chicago",
        "migration_windows": [{"name": "Any time", "enabled": True, "days": EVERY_DAY,
                               "start_time": "00:00", "end_time": "23:59", "timezone": "America/Chicago"}],
        "blackout_windows": [{"name": "Nightly backups", "enabled": True, "days": EVERY_DAY,
                              "start_time": "01:00", "end_time": "03:00"}],
    }
    am["rules"]["pool_rules"] = {"k8s-control": "anti-affinity"}
    am["rules"]["intelligent_migrations"]["observation_periods"] = 3
    am["rules"]["intelligent_migrations"]["minimum_data_collection_hours"] = 0
    notif = am["notifications"]
    notif.update({"enabled": True, "on_resource_threshold": True, "on_recommendations": True, "on_queued": True})
    for provider in notif["providers"].values():
        provider["enabled"] = False
    return cfg


if __name__ == "__main__":
    print(json.dumps(build(), indent=2))
