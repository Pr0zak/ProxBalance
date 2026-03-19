"""
ProxBalance Migration Database Layer (SQLite)

Shared data layer replacing migration_history.json and recommendation_tracking.json.
Provides CRUD operations for migration records, automation state, run history,
and recommendation tracking.
"""

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from proxbalance.db import get_connection


# ---------------------------------------------------------------------------
# Migration history
# ---------------------------------------------------------------------------

def record_migration(record: Dict[str, Any]) -> None:
    """Insert a migration record into the database.

    Args:
        record: Dict with migration details. Expected keys:
            migration_id, vmid, guest_name, guest_type, source_node,
            target_node, timestamp, status, task_id, reason, confidence,
            dry_run, trigger, run_id, duration_seconds, error_message.
            Any extra keys are stored in extra_json.
    """
    known_keys = {
        "migration_id", "id", "vmid", "guest_name", "guest_type", "type",
        "source_node", "target_node", "timestamp", "status", "task_id",
        "reason", "confidence", "dry_run", "trigger", "run_id",
        "duration_seconds", "error_message",
    }
    extra = {k: v for k, v in record.items() if k not in known_keys}

    conn = get_connection()
    conn.execute(
        "INSERT INTO migration_history "
        "(migration_id, vmid, guest_name, guest_type, source_node, target_node, "
        " timestamp, status, task_id, reason, confidence, dry_run, trigger, "
        " run_id, duration_seconds, error_message, extra_json) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (record.get("migration_id", record.get("id")),
         record.get("vmid"),
         record.get("guest_name"),
         record.get("guest_type", record.get("type")),
         record.get("source_node"),
         record.get("target_node"),
         record.get("timestamp", datetime.now(timezone.utc).isoformat()),
         record.get("status", "started"),
         record.get("task_id"),
         record.get("reason"),
         record.get("confidence"),
         1 if record.get("dry_run") else 0,
         record.get("trigger"),
         record.get("run_id"),
         record.get("duration_seconds"),
         record.get("error_message"),
         json.dumps(extra) if extra else None),
    )
    conn.commit()


def get_recent_migrations(days: int = 7, limit: int = 500) -> List[Dict[str, Any]]:
    """Get recent migration records.

    Args:
        days: Lookback window in days (default 7).
        limit: Maximum records to return.

    Returns:
        List of migration dicts, newest first.
    """
    conn = get_connection()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    rows = conn.execute(
        "SELECT * FROM migration_history WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?",
        (cutoff[:19], limit),  # Truncate to match both Z and +00:00 formats
    ).fetchall()

    return [_row_to_migration(dict(r)) for r in rows]


def get_all_migrations(limit: int = 1000) -> List[Dict[str, Any]]:
    """Get all migration records (no time filter).

    Args:
        limit: Maximum records to return.

    Returns:
        List of migration dicts, newest first.
    """
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM migration_history ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [_row_to_migration(dict(r)) for r in rows]


def get_migration_by_id(migration_id: str) -> Optional[Dict[str, Any]]:
    """Get a single migration by its migration_id."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM migration_history WHERE migration_id = ?",
        (migration_id,),
    ).fetchone()
    return _row_to_migration(dict(row)) if row else None


def update_migration_status(migration_id: str, status: str,
                            duration_seconds: Optional[float] = None,
                            error_message: Optional[str] = None,
                            extra_updates: Optional[Dict[str, Any]] = None) -> None:
    """Update the status of a migration record.

    Args:
        migration_id: The migration_id to update.
        status: New status (e.g. 'success', 'failed', 'completed').
        duration_seconds: Optional duration to record.
        error_message: Optional error message for failures.
        extra_updates: Optional dict of additional fields to merge into extra_json.
    """
    conn = get_connection()

    updates = ["status = ?"]
    params: list = [status]

    if duration_seconds is not None:
        updates.append("duration_seconds = ?")
        params.append(duration_seconds)

    if error_message is not None:
        updates.append("error_message = ?")
        params.append(error_message)

    if extra_updates:
        # Merge into existing extra_json
        row = conn.execute(
            "SELECT extra_json FROM migration_history WHERE migration_id = ?",
            (migration_id,),
        ).fetchone()
        existing = {}
        if row and row["extra_json"]:
            try:
                existing = json.loads(row["extra_json"])
            except (json.JSONDecodeError, TypeError):
                pass
        existing.update(extra_updates)
        updates.append("extra_json = ?")
        params.append(json.dumps(existing))

    params.append(migration_id)
    conn.execute(
        f"UPDATE migration_history SET {', '.join(updates)} WHERE migration_id = ?",
        params,
    )
    conn.commit()


def is_vm_in_cooldown(vmid: int, minutes: int = 60) -> bool:
    """Check if a VM was recently migrated (within cooldown period).

    Args:
        vmid: VM/CT ID.
        minutes: Cooldown window in minutes.

    Returns:
        True if a migration exists within the cooldown window.
    """
    conn = get_connection()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()

    row = conn.execute(
        "SELECT 1 FROM migration_history WHERE vmid = ? AND timestamp >= ? LIMIT 1",
        (vmid, cutoff[:19]),
    ).fetchone()
    return row is not None


def is_rollback_migration(vmid: int, source: str, target: str, hours: int = 4) -> bool:
    """Check if executing vmid from source->target would be a rollback of a recent migration.

    Returns True if there's a recent migration of vmid from target->source
    (i.e., the reverse direction).

    Args:
        vmid: VM/CT ID.
        source: Current source node.
        target: Proposed target node.
        hours: Lookback window in hours.
    """
    conn = get_connection()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    row = conn.execute(
        "SELECT 1 FROM migration_history "
        "WHERE vmid = ? AND source_node = ? AND target_node = ? "
        "AND timestamp >= ? AND status IN ('success', 'completed') LIMIT 1",
        (vmid, target, source, cutoff[:19]),
    ).fetchone()
    return row is not None


def _row_to_migration(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a DB row to the dict format callers expect."""
    result = {
        "migration_id": row.get("migration_id"),
        "vmid": row.get("vmid"),
        "guest_name": row.get("guest_name"),
        "guest_type": row.get("guest_type"),
        "source_node": row.get("source_node"),
        "target_node": row.get("target_node"),
        "timestamp": row.get("timestamp"),
        "status": row.get("status"),
        "task_id": row.get("task_id"),
        "reason": row.get("reason"),
        "confidence": row.get("confidence"),
        "dry_run": bool(row.get("dry_run")),
        "trigger": row.get("trigger"),
        "run_id": row.get("run_id"),
        "duration_seconds": row.get("duration_seconds"),
        "error_message": row.get("error_message"),
    }
    # Merge extra fields
    if row.get("extra_json"):
        try:
            extra = json.loads(row["extra_json"])
            result.update(extra)
        except (json.JSONDecodeError, TypeError):
            pass
    # Legacy compat: expose "type" as well as "guest_type"
    if result.get("guest_type"):
        result["type"] = result["guest_type"]
    # Legacy compat: expose "id" as alias for "migration_id"
    if result.get("migration_id"):
        result["id"] = result["migration_id"]
    return result


# ---------------------------------------------------------------------------
# Automation state (key-value store)
# ---------------------------------------------------------------------------

def get_automation_state(key: str, default: Any = None) -> Any:
    """Get a single automation state value.

    Args:
        key: State key (e.g. 'last_run', 'last_status').
        default: Value to return if key not found.

    Returns:
        The JSON-decoded value, or default.
    """
    conn = get_connection()
    row = conn.execute("SELECT value FROM automation_state WHERE key = ?", (key,)).fetchone()
    if row is None:
        return default
    try:
        return json.loads(row["value"])
    except (json.JSONDecodeError, TypeError):
        return default


def set_automation_state(key: str, value: Any) -> None:
    """Set a single automation state value.

    Args:
        key: State key.
        value: Value to store (will be JSON-encoded).
    """
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO automation_state (key, value) VALUES (?, ?)",
        (key, json.dumps(value)),
    )
    conn.commit()


def get_all_automation_state() -> Dict[str, Any]:
    """Get all automation state as a dict."""
    conn = get_connection()
    rows = conn.execute("SELECT key, value FROM automation_state").fetchall()
    result = {}
    for r in rows:
        try:
            result[r["key"]] = json.loads(r["value"])
        except (json.JSONDecodeError, TypeError):
            result[r["key"]] = r["value"]
    return result


def set_automation_state_bulk(state: Dict[str, Any]) -> None:
    """Set multiple automation state values at once.

    Args:
        state: Dict of key-value pairs to store.
    """
    conn = get_connection()
    for key, value in state.items():
        conn.execute(
            "INSERT OR REPLACE INTO automation_state (key, value) VALUES (?, ?)",
            (key, json.dumps(value)),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Run history
# ---------------------------------------------------------------------------

def archive_run(summary: Dict[str, Any]) -> None:
    """Archive an automation run summary.

    Args:
        summary: Full run summary dict (will be stored as JSON).
    """
    conn = get_connection()
    conn.execute(
        "INSERT INTO automation_run_history (run_id, timestamp, status, summary_json) "
        "VALUES (?, ?, ?, ?)",
        (summary.get("run_id"), summary.get("timestamp", datetime.now(timezone.utc).isoformat()),
         summary.get("status"), json.dumps(summary)),
    )

    # Trim to keep only last 50 entries
    conn.execute(
        "DELETE FROM automation_run_history WHERE id NOT IN "
        "(SELECT id FROM automation_run_history ORDER BY id DESC LIMIT 50)"
    )
    conn.commit()


def get_run_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Get automation run history.

    Args:
        limit: Maximum entries to return.

    Returns:
        List of run summary dicts, newest first.
    """
    conn = get_connection()
    rows = conn.execute(
        "SELECT summary_json FROM automation_run_history ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()

    result = []
    for r in rows:
        try:
            result.append(json.loads(r["summary_json"]))
        except (json.JSONDecodeError, TypeError):
            pass
    return result


# ---------------------------------------------------------------------------
# Recommendation tracking
# ---------------------------------------------------------------------------

def get_tracking(key: str) -> Optional[Dict[str, Any]]:
    """Get a single recommendation tracking entry.

    Args:
        key: Tracking key (typically vmid-based).

    Returns:
        Tracking data dict, or None.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT data_json FROM recommendation_tracking WHERE key = ?",
        (key,),
    ).fetchone()
    if row is None:
        return None
    try:
        return json.loads(row["data_json"])
    except (json.JSONDecodeError, TypeError):
        return None


def upsert_tracking(key: str, data: Dict[str, Any]) -> None:
    """Insert or update a recommendation tracking entry.

    Args:
        key: Tracking key.
        data: Full tracking data dict.
    """
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO recommendation_tracking (key, data_json) VALUES (?, ?)",
        (key, json.dumps(data)),
    )
    conn.commit()


def get_all_tracking() -> Dict[str, Dict[str, Any]]:
    """Get all recommendation tracking entries.

    Returns:
        Dict mapping keys to tracking data dicts.
    """
    conn = get_connection()
    rows = conn.execute("SELECT key, data_json FROM recommendation_tracking").fetchall()
    result = {}
    for r in rows:
        try:
            result[r["key"]] = json.loads(r["data_json"])
        except (json.JSONDecodeError, TypeError):
            pass
    return result


def delete_tracking(key: str) -> None:
    """Delete a single recommendation tracking entry."""
    conn = get_connection()
    conn.execute("DELETE FROM recommendation_tracking WHERE key = ?", (key,))
    conn.commit()


def clear_stale_tracking(hours: int = 72) -> int:
    """Delete recommendation tracking entries older than the given hours.

    Uses the 'first_seen' field inside data_json for age comparison.

    Args:
        hours: Age threshold in hours.

    Returns:
        Number of entries deleted.
    """
    conn = get_connection()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    # We need to check inside the JSON, so fetch and filter
    rows = conn.execute("SELECT key, data_json FROM recommendation_tracking").fetchall()
    stale_keys = []
    for r in rows:
        try:
            data = json.loads(r["data_json"])
            first_seen = data.get("first_seen", "")
            if first_seen and first_seen < cutoff:
                stale_keys.append(r["key"])
        except (json.JSONDecodeError, TypeError):
            stale_keys.append(r["key"])  # Remove unparseable entries

    if stale_keys:
        placeholders = ",".join("?" * len(stale_keys))
        conn.execute(f"DELETE FROM recommendation_tracking WHERE key IN ({placeholders})", stale_keys)
        conn.commit()

    return len(stale_keys)
