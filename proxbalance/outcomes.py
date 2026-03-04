"""
ProxBalance Migration Outcome Tracking (SQLite backend)

Captures pre-migration and post-migration metrics to measure
the actual impact of migrations and compare against predictions.

Multi-window verification:
  - 5 min: initial post-migration snapshot
  - 1 hour: short-term impact verification
  - 24 hours: sustained impact verification
"""

import json
import sys
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
from proxbalance.db import get_connection


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _row_to_outcome(row) -> Dict[str, Any]:
    """Convert a database row to the legacy outcome dict format."""
    def _parse_json(val):
        if val is None:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return None

    return {
        "key": row["key"],
        "vmid": row["vmid"],
        "source_node": row["source_node"],
        "target_node": row["target_node"],
        "guest_type": row["guest_type"],
        "status": row["status"],
        "pre_migration": _parse_json(row["pre_migration_json"]),
        "post_5min": _parse_json(row["post_5min_json"]),
        "post_1h": _parse_json(row["post_1h_json"]),
        "post_24h": _parse_json(row["post_24h_json"]),
        "predicted_improvement": row["predicted_improvement"],
        "actual_improvement": _parse_json(row["actual_improvement_json"]),
        "sustained_improvement": _parse_json(row["sustained_improvement_json"]),
        "accuracy_pct": row["accuracy_pct"],
        "verdict": row["verdict"],
        "trend_evidence_snapshot": _parse_json(row["trend_evidence_json"]),
        "post_migration": _parse_json(row["post_migration_json"]),
    }


# ---------------------------------------------------------------------------
# Persistence helpers (kept for backward-compat re-exports in migrations.py)
# ---------------------------------------------------------------------------

def _load_migration_outcomes() -> List[Dict[str, Any]]:
    """Load migration outcomes from the database.

    Returns:
        list of outcome dicts (may be empty).
    """
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM migration_outcomes ORDER BY id"
    ).fetchall()
    return [_row_to_outcome(dict(r)) for r in rows]


def _save_migration_outcomes(outcomes: List[Dict[str, Any]]) -> bool:
    """No-op for backward compatibility — all writes go through record/update functions."""
    return True


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
    """Save a pre-migration snapshot to the outcomes table.

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

    try:
        conn = get_connection()

        ts = pre_snapshot.get("timestamp", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
        outcome_key = f"{vmid}_{ts}"

        trend_snapshot = None
        if trend_evidence:
            trend_snapshot = {
                "source_cpu_direction": trend_evidence.get("source_node_trend", {}).get("cpu_direction"),
                "target_cpu_direction": trend_evidence.get("target_node_trend", {}).get("cpu_direction"),
            }

        conn.execute(
            "INSERT OR IGNORE INTO migration_outcomes "
            "(key, vmid, source_node, target_node, guest_type, status, "
            " pre_migration_json, predicted_improvement, trend_evidence_json) "
            "VALUES (?, ?, ?, ?, ?, 'pending_5min', ?, ?, ?)",
            (outcome_key, vmid, source_node, target_node, guest_type,
             json.dumps(pre_snapshot),
             predicted_improvement,
             json.dumps(trend_snapshot) if trend_snapshot else None),
        )

        # Enforce max entries
        conn.execute(
            "DELETE FROM migration_outcomes WHERE id NOT IN "
            "(SELECT id FROM migration_outcomes ORDER BY id DESC LIMIT ?)",
            (MAX_OUTCOME_ENTRIES,),
        )
        conn.commit()
        return True

    except Exception as e:
        print(f"Error recording migration outcome: {e}", file=sys.stderr)
        return False


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
    conn = get_connection()
    cache_data = read_cache_file()

    if cache_data is None:
        return {"updated": 0, "skipped": 0, "error": "No cache data available"}

    nodes = cache_data.get("nodes", {})
    now = datetime.utcnow()
    updated = 0
    skipped = 0

    # Fetch pending outcomes
    query = "SELECT * FROM migration_outcomes WHERE status IN ('pending_5min', 'pending_1h', 'pending_24h', 'pending_post_capture')"
    params = []
    if vmid is not None:
        query += " AND vmid = ?"
        params.append(str(vmid))

    rows = conn.execute(query, params).fetchall()

    for row in rows:
        entry = dict(row)
        status = entry.get("status", "")

        # Get pre-migration data
        try:
            pre = json.loads(entry["pre_migration_json"]) if entry["pre_migration_json"] else {}
        except (json.JSONDecodeError, TypeError):
            pre = {}

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

        # 5 minute window
        if status == "pending_5min" and elapsed >= POST_CAPTURE_DELAY_SECONDS:
            snapshot = _capture_snapshot()
            actual_imp = _calculate_improvement_dict(pre, snapshot)
            accuracy = _calculate_accuracy(entry.get("predicted_improvement"), actual_imp)

            conn.execute(
                "UPDATE migration_outcomes SET status = 'pending_1h', "
                "post_5min_json = ?, post_migration_json = ?, "
                "actual_improvement_json = ?, accuracy_pct = ? WHERE id = ?",
                (json.dumps(snapshot), json.dumps(snapshot),
                 json.dumps(actual_imp), accuracy, entry["id"]),
            )
            updated += 1
            continue

        # 1 hour window
        if status == "pending_1h" and elapsed >= POST_CAPTURE_1H_SECONDS:
            snapshot = _capture_snapshot()
            conn.execute(
                "UPDATE migration_outcomes SET status = 'pending_24h', post_1h_json = ? WHERE id = ?",
                (json.dumps(snapshot), entry["id"]),
            )
            updated += 1
            continue

        # 24 hour window
        if status == "pending_24h" and elapsed >= POST_CAPTURE_24H_SECONDS:
            snapshot = _capture_snapshot()
            sustained_imp = _calculate_improvement_dict(pre, snapshot)
            verdict = _determine_verdict_from_deltas(
                json.loads(entry.get("actual_improvement_json", "{}") or "{}"),
                sustained_imp,
            )
            conn.execute(
                "UPDATE migration_outcomes SET status = 'completed', "
                "post_24h_json = ?, sustained_improvement_json = ?, verdict = ? WHERE id = ?",
                (json.dumps(snapshot), json.dumps(sustained_imp), verdict, entry["id"]),
            )
            updated += 1
            continue

        skipped += 1

    conn.commit()
    return {"updated": updated, "skipped": skipped}


def _calculate_improvement_dict(pre: Dict[str, Any], post_snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate improvement delta between pre and post snapshots."""
    pre_source_cpu = pre.get("source_node", {}).get("cpu", 0)
    post_source_cpu = post_snapshot.get("source_node", {}).get("cpu", 0)
    pre_source_mem = pre.get("source_node", {}).get("mem", 0)
    post_source_mem = post_snapshot.get("source_node", {}).get("mem", 0)

    return {
        "source_cpu_delta": round(pre_source_cpu - post_source_cpu, 2),
        "source_mem_delta": round(pre_source_mem - post_source_mem, 2),
    }


def _calculate_accuracy(predicted: Optional[float], actual_imp: Dict[str, Any]) -> Optional[float]:
    """Calculate prediction accuracy as a percentage."""
    if predicted is None or predicted == 0:
        return None
    try:
        predicted_val = float(predicted)
        actual_cpu_delta = actual_imp.get("source_cpu_delta", 0)
        if predicted_val != 0:
            accuracy = max(0, 100 - abs(actual_cpu_delta - predicted_val) / abs(predicted_val) * 100)
            return round(accuracy, 1)
    except (ValueError, TypeError):
        pass
    return None


def _determine_verdict_from_deltas(initial: Dict[str, Any], sustained: Dict[str, Any]) -> str:
    """Determine the overall migration verdict based on multi-window data.

    Returns one of: 'beneficial', 'neutral', 'harmful', 'inconclusive'.
    """
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
    conn = get_connection()

    query = "SELECT * FROM migration_outcomes WHERE status = 'completed' AND verdict IS NOT NULL"
    params = []
    if source_node:
        query += " AND source_node = ?"
        params.append(source_node)
    if target_node:
        query += " AND target_node = ?"
        params.append(target_node)
    query += " ORDER BY id DESC LIMIT ?"
    params.append(lookback_count)

    rows = conn.execute(query, params).fetchall()

    if not rows:
        return {
            "total_completed": 0,
            "success_rate": None,
            "avg_accuracy_pct": None,
            "avg_cpu_improvement": None,
            "avg_sustained_cpu_improvement": None,
            "verdict_counts": {},
        }

    completed = [dict(r) for r in rows]

    beneficial = sum(1 for o in completed if o.get("verdict") == "beneficial")
    neutral = sum(1 for o in completed if o.get("verdict") == "neutral")
    harmful = sum(1 for o in completed if o.get("verdict") == "harmful")

    accuracies = [o["accuracy_pct"] for o in completed if o.get("accuracy_pct") is not None]

    cpu_improvements = []
    sustained_cpu = []
    for o in completed:
        try:
            ai = json.loads(o.get("actual_improvement_json", "{}") or "{}")
            if ai:
                cpu_improvements.append(ai.get("source_cpu_delta", 0))
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            si = json.loads(o.get("sustained_improvement_json", "{}") or "{}")
            if si:
                sustained_cpu.append(si.get("source_cpu_delta", 0))
        except (json.JSONDecodeError, TypeError):
            pass

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
