"""
ProxBalance Migration Outcome Tracking

Captures pre-migration and post-migration metrics to measure
the actual impact of migrations and compare against predictions.

Multi-window verification:
  - 5 min: initial post-migration snapshot
  - 1 hour: short-term impact verification
  - 24 hours: sustained impact verification
"""

import os
import sys
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from proxbalance.config_manager import read_cache_file
from proxbalance.constants import (
    BASE_PATH,
    OUTCOMES_FILE,
    MAX_OUTCOME_ENTRIES,
    POST_CAPTURE_DELAY_SECONDS,
    POST_CAPTURE_1H_SECONDS,
    POST_CAPTURE_24H_SECONDS,
)


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _load_migration_outcomes() -> List[Dict[str, Any]]:
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


def _save_migration_outcomes(outcomes: List[Dict[str, Any]]) -> bool:
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


def _extract_node_metrics_from_cache(nodes: Dict[str, Any], node_name: str) -> Dict[str, Any]:
    """Extract node metrics from cache data."""
    node = nodes.get(node_name, {})
    metrics = node.get("metrics", {})
    guests = node.get("guests", [])
    return {
        "cpu": round(metrics.get("current_cpu", node.get("cpu_percent", 0)), 2),
        "mem": round(metrics.get("current_mem", node.get("mem_percent", 0)), 2),
        "iowait": round(metrics.get("current_iowait", 0), 2),
        "guest_count": len(guests) if isinstance(guests, list) else 0,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def capture_pre_migration_snapshot(vmid: Union[int, str], source_node: str, target_node: str) -> Optional[Dict[str, Any]]:
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

    return {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_node": _extract_node_metrics_from_cache(nodes, source_node),
        "target_node": _extract_node_metrics_from_cache(nodes, target_node),
    }


def record_migration_outcome(vmid: Union[int, str], source_node: str, target_node: str, guest_type: str,
                             pre_snapshot: Optional[Dict[str, Any]], predicted_improvement: Optional[float] = None,
                             trend_evidence: Optional[Dict[str, Any]] = None) -> bool:
    """Save a pre-migration snapshot to the outcomes file.

    Creates an entry with multi-window status tracking.

    Args:
        vmid: The VM/CT ID.
        source_node: Name of the source node.
        target_node: Name of the target node.
        guest_type: 'VM' or 'CT'.
        pre_snapshot: Dict returned by :func:`capture_pre_migration_snapshot`.
        predicted_improvement: Optional predicted improvement value.
        trend_evidence: Optional trend evidence from the recommendation.

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
        "status": "pending_5min",
        "pre_migration": pre_snapshot,
        "post_5min": None,
        "post_1h": None,
        "post_24h": None,
        "predicted_improvement": predicted_improvement,
        "actual_improvement": None,
        "sustained_improvement": None,
        "accuracy_pct": None,
        "verdict": None,
        "trend_evidence_snapshot": {
            "source_cpu_direction": trend_evidence.get("source_node_trend", {}).get("cpu_direction") if trend_evidence else None,
            "target_cpu_direction": trend_evidence.get("target_node_trend", {}).get("cpu_direction") if trend_evidence else None,
        } if trend_evidence else None,
        # Legacy compat
        "post_migration": None,
    }

    outcomes.append(entry)
    return _save_migration_outcomes(outcomes)


def update_post_migration_metrics(vmid: Optional[Union[int, str]] = None) -> Dict[str, Any]:
    """Capture post-migration metrics for pending outcomes using multi-window tracking.

    Checks three windows:
      - 5 min: initial verification (status: pending_5min -> pending_1h)
      - 1 hour: short-term verification (status: pending_1h -> pending_24h)
      - 24 hours: sustained verification (status: pending_24h -> completed)

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
        status = entry.get("status", "")
        if status not in ("pending_5min", "pending_1h", "pending_24h", "pending_post_capture"):
            continue

        # Optional vmid filter
        if vmid is not None and entry.get("vmid") != vmid:
            continue

        # Get pre-migration timestamp
        pre = entry.get("pre_migration", {})
        try:
            ts_str = pre.get("timestamp", "")
            entry_time = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%SZ")
        except (ValueError, TypeError):
            skipped += 1
            continue

        elapsed = (now - entry_time).total_seconds()

        source_name = entry.get("source_node", "")
        target_name = entry.get("target_node", "")

        def _capture_snapshot() -> Dict[str, Any]:
            return {
                "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "source_node": _extract_node_metrics_from_cache(nodes, source_name),
                "target_node": _extract_node_metrics_from_cache(nodes, target_name),
            }

        # Handle legacy status
        if status == "pending_post_capture":
            status = "pending_5min"
            entry["status"] = status

        # 5 minute window
        if status == "pending_5min" and elapsed >= POST_CAPTURE_DELAY_SECONDS:
            snapshot = _capture_snapshot()
            entry["post_5min"] = snapshot
            entry["post_migration"] = snapshot  # Legacy compat
            entry["status"] = "pending_1h"

            # Calculate initial improvement
            _calculate_improvement(entry, pre, snapshot, "actual_improvement")
            updated += 1
            continue

        # 1 hour window
        if status == "pending_1h" and elapsed >= POST_CAPTURE_1H_SECONDS:
            snapshot = _capture_snapshot()
            entry["post_1h"] = snapshot
            entry["status"] = "pending_24h"
            updated += 1
            continue

        # 24 hour window
        if status == "pending_24h" and elapsed >= POST_CAPTURE_24H_SECONDS:
            snapshot = _capture_snapshot()
            entry["post_24h"] = snapshot
            entry["status"] = "completed"

            # Calculate sustained improvement
            _calculate_improvement(entry, pre, snapshot, "sustained_improvement")

            # Determine verdict
            entry["verdict"] = _determine_verdict(entry)
            updated += 1
            continue

        skipped += 1

    _save_migration_outcomes(outcomes)
    return {"updated": updated, "skipped": skipped}


def _calculate_improvement(entry: Dict[str, Any], pre: Dict[str, Any],
                           post_snapshot: Dict[str, Any], key: str) -> None:
    """Calculate improvement delta and store in entry[key]."""
    pre_source_cpu = pre.get("source_node", {}).get("cpu", 0)
    post_source_cpu = post_snapshot["source_node"]["cpu"]
    actual_cpu_delta = pre_source_cpu - post_source_cpu

    pre_source_mem = pre.get("source_node", {}).get("mem", 0)
    post_source_mem = post_snapshot["source_node"]["mem"]
    actual_mem_delta = pre_source_mem - post_source_mem

    entry[key] = {
        "source_cpu_delta": round(actual_cpu_delta, 2),
        "source_mem_delta": round(actual_mem_delta, 2),
    }

    # Calculate accuracy if prediction was provided
    predicted = entry.get("predicted_improvement")
    if predicted is not None and predicted != 0 and key == "actual_improvement":
        try:
            predicted_val = float(predicted)
            if predicted_val != 0:
                accuracy = max(0, 100 - abs(actual_cpu_delta - predicted_val) / abs(predicted_val) * 100)
                entry["accuracy_pct"] = round(accuracy, 1)
        except (ValueError, TypeError):
            pass


def _determine_verdict(entry: Dict[str, Any]) -> str:
    """Determine the overall migration verdict based on multi-window data.

    Returns one of: 'beneficial', 'neutral', 'harmful', 'inconclusive'.
    """
    initial = entry.get("actual_improvement", {})
    sustained = entry.get("sustained_improvement", {})

    if not initial or not sustained:
        return "inconclusive"

    initial_cpu = initial.get("source_cpu_delta", 0)
    sustained_cpu = sustained.get("source_cpu_delta", 0)

    # A migration is beneficial if it provided sustained CPU relief
    if sustained_cpu > 3:
        return "beneficial"
    elif sustained_cpu < -3:
        return "harmful"
    elif initial_cpu > 3 and sustained_cpu >= 0:
        return "beneficial"
    elif initial_cpu > 0 and sustained_cpu > -2:
        return "neutral"
    else:
        return "neutral"


# ---------------------------------------------------------------------------
# Outcome statistics (for confidence adjustment)
# ---------------------------------------------------------------------------

def get_outcome_statistics(source_node: Optional[str] = None,
                           target_node: Optional[str] = None,
                           lookback_count: int = 50) -> Dict[str, Any]:
    """Calculate aggregate outcome statistics for confidence adjustment.

    Args:
        source_node: If provided, filter to migrations from this node.
        target_node: If provided, filter to migrations to this node.
        lookback_count: Max number of recent completed outcomes to analyze.

    Returns:
        Dict with success_rate, avg_accuracy, avg_cpu_improvement, etc.
    """
    outcomes = _load_migration_outcomes()

    # Filter to completed outcomes
    completed = [o for o in outcomes if o.get("status") == "completed" and o.get("verdict")]

    if source_node:
        completed = [o for o in completed if o.get("source_node") == source_node]
    if target_node:
        completed = [o for o in completed if o.get("target_node") == target_node]

    # Take most recent
    completed = completed[-lookback_count:]

    if not completed:
        return {
            "total_completed": 0,
            "success_rate": None,
            "avg_accuracy_pct": None,
            "avg_cpu_improvement": None,
            "avg_sustained_cpu_improvement": None,
            "verdict_counts": {},
        }

    beneficial = sum(1 for o in completed if o.get("verdict") == "beneficial")
    neutral = sum(1 for o in completed if o.get("verdict") == "neutral")
    harmful = sum(1 for o in completed if o.get("verdict") == "harmful")

    accuracies = [o["accuracy_pct"] for o in completed if o.get("accuracy_pct") is not None]
    cpu_improvements = [
        o.get("actual_improvement", {}).get("source_cpu_delta", 0)
        for o in completed if o.get("actual_improvement")
    ]
    sustained_cpu = [
        o.get("sustained_improvement", {}).get("source_cpu_delta", 0)
        for o in completed if o.get("sustained_improvement")
    ]

    total = len(completed)

    return {
        "total_completed": total,
        "success_rate": round((beneficial + neutral) / total * 100, 1) if total > 0 else None,
        "beneficial_rate": round(beneficial / total * 100, 1) if total > 0 else None,
        "avg_accuracy_pct": round(sum(accuracies) / len(accuracies), 1) if accuracies else None,
        "avg_cpu_improvement": round(sum(cpu_improvements) / len(cpu_improvements), 2) if cpu_improvements else None,
        "avg_sustained_cpu_improvement": round(sum(sustained_cpu) / len(sustained_cpu), 2) if sustained_cpu else None,
        "verdict_counts": {
            "beneficial": beneficial,
            "neutral": neutral,
            "harmful": harmful,
            "inconclusive": sum(1 for o in completed if o.get("verdict") == "inconclusive"),
        },
    }


def get_migration_outcomes() -> List[Dict[str, Any]]:
    """Return all migration outcomes (public accessor).

    Returns:
        list of outcome dicts.
    """
    return _load_migration_outcomes()
