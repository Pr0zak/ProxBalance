"""
ProxBalance Migration Outcome Tracking

Captures pre-migration and post-migration metrics to measure
the actual impact of migrations and compare against predictions.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

from proxbalance.config_manager import BASE_PATH, read_cache_file


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

OUTCOMES_FILE = os.path.join(BASE_PATH, "migration_outcomes.json")
MAX_OUTCOME_ENTRIES = 100
POST_CAPTURE_DELAY_SECONDS = 300  # 5 minutes


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _load_migration_outcomes() -> List[Dict]:
    """Load migration outcomes from disk.

    Returns:
        list of outcome dicts (may be empty).
    """
    try:
        if os.path.exists(OUTCOMES_FILE):
            with open(OUTCOMES_FILE, "r") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
    except Exception as e:
        print(f"Error reading migration outcomes: {e}", file=sys.stderr)
    return []


def _save_migration_outcomes(outcomes: List[Dict]) -> bool:
    """Persist migration outcomes to disk, enforcing max entries (FIFO).

    Returns:
        True on success, False on failure.
    """
    try:
        # Enforce max entries — keep the most recent
        if len(outcomes) > MAX_OUTCOME_ENTRIES:
            outcomes = outcomes[-MAX_OUTCOME_ENTRIES:]
        with open(OUTCOMES_FILE, "w") as f:
            json.dump(outcomes, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving migration outcomes: {e}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def capture_pre_migration_snapshot(vmid, source_node, target_node) -> Optional[Dict]:
    """Capture pre-migration node metrics from the cluster cache.

    Reads cluster_cache.json and extracts current CPU, memory, IOWait,
    and guest count for the source and target nodes.

    Args:
        vmid: The VM/CT ID being migrated.
        source_node: Name of the source node.
        target_node: Name of the target node.

    Returns:
        A snapshot dict, or None if cache data is unavailable.
    """
    cache_data = read_cache_file()
    if cache_data is None:
        print("Cannot capture pre-migration snapshot: no cache data", file=sys.stderr)
        return None

    nodes = cache_data.get("nodes", {})

    def _extract_node_metrics(node_name):
        node = nodes.get(node_name, {})
        metrics = node.get("metrics", {})
        guests = node.get("guests", [])
        return {
            "cpu": round(metrics.get("current_cpu", node.get("cpu_percent", 0)), 2),
            "mem": round(metrics.get("current_mem", node.get("mem_percent", 0)), 2),
            "iowait": round(metrics.get("current_iowait", 0), 2),
            "guest_count": len(guests) if isinstance(guests, list) else 0,
        }

    return {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_node": _extract_node_metrics(source_node),
        "target_node": _extract_node_metrics(target_node),
    }


def record_migration_outcome(vmid, source_node, target_node, guest_type,
                             pre_snapshot, predicted_improvement=None) -> bool:
    """Save a pre-migration snapshot to the outcomes file.

    Creates an entry keyed by ``{vmid}_{timestamp}`` with status
    ``pending_post_capture``.  Post-migration metrics are captured later
    by :func:`update_post_migration_metrics`.

    Args:
        vmid: The VM/CT ID.
        source_node: Name of the source node.
        target_node: Name of the target node.
        guest_type: 'VM' or 'CT'.
        pre_snapshot: Dict returned by :func:`capture_pre_migration_snapshot`.
        predicted_improvement: Optional predicted improvement value.

    Returns:
        True on success, False on failure.
    """
    if pre_snapshot is None:
        return False

    outcomes = _load_migration_outcomes()

    ts = pre_snapshot.get("timestamp", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
    outcome_key = f"{vmid}_{ts}"

    entry = {
        "key": outcome_key,
        "vmid": vmid,
        "source_node": source_node,
        "target_node": target_node,
        "guest_type": guest_type,
        "status": "pending_post_capture",
        "pre_migration": pre_snapshot,
        "post_migration": None,
        "predicted_improvement": predicted_improvement,
        "actual_improvement": None,
        "accuracy_pct": None,
    }

    outcomes.append(entry)
    return _save_migration_outcomes(outcomes)


def update_post_migration_metrics(vmid=None) -> Dict:
    """Capture post-migration metrics for pending outcomes.

    For each outcome entry with status ``pending_post_capture`` that is at
    least 5 minutes old, reads the current cluster cache, calculates actual
    improvement vs predicted, and marks the entry as ``completed``.

    Args:
        vmid: If provided, only update outcomes for this specific guest.

    Returns:
        A summary dict with counts of updated and skipped entries.
    """
    outcomes = _load_migration_outcomes()
    cache_data = read_cache_file()

    if cache_data is None:
        return {"updated": 0, "skipped": 0, "error": "No cache data available"}

    nodes = cache_data.get("nodes", {})
    now = datetime.utcnow()
    updated = 0
    skipped = 0

    for entry in outcomes:
        if entry.get("status") != "pending_post_capture":
            continue

        # Optional vmid filter
        if vmid is not None and entry.get("vmid") != vmid:
            continue

        # Check if enough time has passed (5 minutes)
        pre = entry.get("pre_migration", {})
        try:
            ts_str = pre.get("timestamp", "")
            entry_time = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%SZ")
        except (ValueError, TypeError):
            skipped += 1
            continue

        elapsed = (now - entry_time).total_seconds()
        if elapsed < POST_CAPTURE_DELAY_SECONDS:
            skipped += 1
            continue

        # Capture post-migration metrics
        source_name = entry.get("source_node", "")
        target_name = entry.get("target_node", "")

        def _extract_node_metrics(node_name):
            node = nodes.get(node_name, {})
            metrics = node.get("metrics", {})
            guests = node.get("guests", [])
            return {
                "cpu": round(metrics.get("current_cpu", node.get("cpu_percent", 0)), 2),
                "mem": round(metrics.get("current_mem", node.get("mem_percent", 0)), 2),
                "iowait": round(metrics.get("current_iowait", 0), 2),
                "guest_count": len(guests) if isinstance(guests, list) else 0,
            }

        post_snapshot = {
            "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source_node": _extract_node_metrics(source_name),
            "target_node": _extract_node_metrics(target_name),
        }

        entry["post_migration"] = post_snapshot

        # Calculate actual improvement (source CPU reduction)
        pre_source_cpu = pre.get("source_node", {}).get("cpu", 0)
        post_source_cpu = post_snapshot["source_node"]["cpu"]
        actual_cpu_delta = pre_source_cpu - post_source_cpu  # positive = improved

        pre_source_mem = pre.get("source_node", {}).get("mem", 0)
        post_source_mem = post_snapshot["source_node"]["mem"]
        actual_mem_delta = pre_source_mem - post_source_mem

        entry["actual_improvement"] = {
            "source_cpu_delta": round(actual_cpu_delta, 2),
            "source_mem_delta": round(actual_mem_delta, 2),
        }

        # Calculate accuracy if prediction was provided
        predicted = entry.get("predicted_improvement")
        if predicted is not None and predicted != 0:
            try:
                predicted_val = float(predicted)
                if predicted_val != 0:
                    accuracy = max(0, 100 - abs(actual_cpu_delta - predicted_val) / abs(predicted_val) * 100)
                    entry["accuracy_pct"] = round(accuracy, 1)
            except (ValueError, TypeError):
                pass

        entry["status"] = "completed"
        updated += 1

    _save_migration_outcomes(outcomes)
    return {"updated": updated, "skipped": skipped}


def get_migration_outcomes() -> List[Dict]:
    """Return all migration outcomes (public accessor).

    Returns:
        list of outcome dicts.
    """
    return _load_migration_outcomes()
