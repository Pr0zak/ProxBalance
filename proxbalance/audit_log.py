"""
ProxBalance audit log: who or what changed things, one row per event.

Events come from the API routes (source ``user``), automigrate (source
``automation``) and the update runner (source ``system``). Every row has a
UTC time, a source, an action such as ``migration.start`` or
``config.change``, an optional subject (guest, node or setting), a one-line
summary and a JSON details blob.

Writing an event never raises: a logging failure is printed to stderr and
the action it describes carries on.

Config changes record only the names of the settings that changed (dotted
paths), never their values, so a changed secret shows up as
``proxmox_api_token_secret`` and nothing more. The handful of on/off
settings that get their own event (automation enabled, dry run, mode,
maintenance) record their new value, and none of those is a secret.

Rows older than ``RETENTION_DAYS`` are pruned on write now and then. Rows
from ``migration_history`` are imported once per process (idempotent, keyed
by ``ref``) so the log starts with the existing migrations.

Table DDL lives in ``proxbalance/db.py`` as ``AUDIT_SCHEMA_SQL``. The
update runner (``release_updater.audit_update``) writes its rows with plain
sqlite3, since it may have just checked out a version without this module.
"""

import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from proxbalance import db as _db

RETENTION_DAYS = 180
PRUNE_EVERY = 200          # writes between prunes (the first write also prunes)
MAX_LIMIT = 500
DEFAULT_LIMIT = 100
MAX_SUMMARY = 300
CONFIG_PATH_DEPTH = 4      # deeper changes are reported at this depth

SOURCES = ("user", "automation", "system")

# Action groups, the first part of an action ("migration.start" -> "migration").
GROUPS = ("migration", "evacuation", "rules", "approval", "automation",
          "maintenance", "config", "tag", "silence", "update", "service")

# Settings under automated_migrations that get their own event instead of
# being listed in a config.change row.
_OWN_EVENT_KEYS = ("enabled", "dry_run", "mode", "maintenance_nodes")
# Bookkeeping keys the app writes itself; a change to them is not news.
_IGNORED_PATHS = ("automated_migrations.rules.cooldown_reset_at",)

_schema_ready: Dict[str, bool] = {}
_backfilled: Dict[str, bool] = {}
_writes = {"count": 0}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _fmt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_ts(value: Any) -> Optional[str]:
    """Return ``value`` (ISO string, naive = UTC) as ``YYYY-MM-DDTHH:MM:SSZ``, or None."""
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    if text.endswith("Z"):  # also "...+00:00Z", which older code wrote
        text = text[:-1]
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return _fmt(dt)


def _warn(msg: str) -> None:
    print(f"Warning: audit log: {msg}", file=sys.stderr)


def _conn() -> sqlite3.Connection:
    """Connection with the audit table present (created once per DB path)."""
    conn = _db.get_connection()
    path = _db.get_db_path()
    if not _schema_ready.get(path):
        conn.executescript(_db.AUDIT_SCHEMA_SQL)
        _schema_ready[path] = True
    return conn


def request_actor() -> Optional[str]:
    """The client address of the current Flask request, or None outside one.

    Behind nginx the client is the first ``X-Forwarded-For`` entry.
    """
    try:
        from flask import has_request_context, request
        if not has_request_context():
            return None
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()[:64] or None
        real_ip = request.headers.get("X-Real-IP", "")
        if real_ip:
            return real_ip.strip()[:64]
        return (request.remote_addr or "")[:64] or None
    except Exception:
        return None


def _insert(conn: sqlite3.Connection, row: Tuple) -> Optional[int]:
    cur = conn.execute(
        "INSERT OR IGNORE INTO audit_log "
        "(ts, source, action, subject, summary, details_json, actor, ref) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        row,
    )
    return cur.lastrowid if cur.rowcount else None


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------

def record(action: str, summary: str, source: str = "user", subject: Any = None,
           details: Optional[Dict[str, Any]] = None, actor: Optional[str] = None,
           ref: Optional[str] = None, ts: Optional[str] = None) -> Optional[int]:
    """Write one audit event. Never raises.

    Args:
        action: ``<group>.<verb>``, e.g. ``migration.start``.
        summary: One plain line shown in the timeline.
        source: ``user``, ``automation`` or ``system``.
        subject: Guest id, node or setting the event is about.
        details: Extra JSON-serialisable data (no secrets).
        actor: Client address; for ``user`` events taken from the current
            request when not given.
        ref: Unique key; a second event with the same ref is ignored.
        ts: Event time (ISO); now when not given.

    Returns:
        The new row id, or None when nothing was written.
    """
    try:
        if source not in SOURCES:
            source = "system"
        if isinstance(details, dict):
            details = {k: v for k, v in details.items() if v is not None}
        if actor is None and source == "user":
            actor = request_actor()
        row = (
            normalize_ts(ts) or _fmt(_now()),
            source,
            str(action)[:64],
            None if subject is None else str(subject)[:128],
            " ".join(str(summary).split())[:MAX_SUMMARY],
            json.dumps(details, default=str, sort_keys=True) if details else None,
            actor,
            ref,
        )
        conn = _conn()
        _maybe_backfill(conn)
        row_id = _insert(conn, row)
        conn.commit()
        _writes["count"] += 1
        if _writes["count"] % PRUNE_EVERY == 1:
            prune(conn=conn)
        return row_id
    except Exception as e:
        _warn(f"could not record {action}: {e}")
        return None


def prune(retention_days: int = RETENTION_DAYS, conn: Optional[sqlite3.Connection] = None) -> int:
    """Delete events older than ``retention_days``. Returns the number removed."""
    try:
        conn = conn or _conn()
        cutoff = _fmt(_now() - timedelta(days=retention_days))
        cur = conn.execute("DELETE FROM audit_log WHERE ts < ?", (cutoff,))
        conn.commit()
        return cur.rowcount or 0
    except Exception as e:
        _warn(f"prune failed: {e}")
        return 0


# ---------------------------------------------------------------------------
# Migrations
# ---------------------------------------------------------------------------

def _guest_label(vmid: Any, name: Any = None, guest_type: Any = None) -> str:
    kind = str(guest_type).upper() if guest_type else ""
    kind = {"QEMU": "VM", "LXC": "CT"}.get(kind, kind)
    label = f"{kind} {vmid}".strip()
    return f"{label} ({name})" if name else label


def migration_event(record_: Dict[str, Any]) -> Optional[Tuple[str, str, Dict[str, Any]]]:
    """(action, summary, details) for a migration_history-style record, or None for a dry run."""
    if record_.get("dry_run"):
        return None
    status = str(record_.get("status") or "").lower()
    failed = status in ("failed", "error", "timeout")
    label = _guest_label(record_.get("vmid"), record_.get("guest_name") or record_.get("name"),
                         record_.get("guest_type") or record_.get("type"))
    src, dst = record_.get("source_node") or "?", record_.get("target_node") or "?"
    rollback = record_.get("initiated_by") == "rollback"
    verb = "Rollback of" if rollback else "Moved"
    if failed:
        summary = f"{'Rollback' if rollback else 'Move'} of {label} {src} → {dst} failed"
    else:
        summary = f"{verb} {label} {src} → {dst}"
    error = record_.get("error") or record_.get("error_message")
    if failed and error:
        summary += f": {error}"
    details = {k: record_.get(k) for k in (
        "vmid", "source_node", "target_node", "status", "reason", "task_id",
        "duration_seconds", "affinity_group", "initiated_by") if record_.get(k) not in (None, "")}
    if error:
        details["error"] = str(error)[:500]
    action = "migration.rollback" if rollback else ("migration.failed" if failed else "migration.done")
    return action, summary, details


def record_migration(record_: Dict[str, Any], source: str = "automation") -> Optional[int]:
    """Audit one finished migration from a migration_history record. Never raises."""
    try:
        event = migration_event(record_)
        if event is None:
            return None
        action, summary, details = event
        mid = record_.get("migration_id") or record_.get("id")
        return record(action, summary, source=source, subject=record_.get("vmid"),
                      details=details, ref=f"migration:{mid}" if mid else None,
                      ts=record_.get("timestamp"))
    except Exception as e:
        _warn(f"could not record migration: {e}")
        return None


def record_batch(migrations: List[Dict[str, Any]], result: Dict[str, Any], action: str,
                 label: str, source: str = "user") -> Optional[int]:
    """Audit a batch of moves as one event. Never raises."""
    try:
        results = result.get("results") or []
        by_vmid = {str(r.get("vmid")): r for r in results if isinstance(r, dict)}
        started = sum(1 for r in by_vmid.values() if r.get("success"))
        if result.get("success"):
            summary = f"{label}: {started} of {len(migrations)} started"
        else:
            summary = f"{label} failed: {result.get('error') or 'unknown error'}"
        moves = []
        for m in migrations:
            if not isinstance(m, dict):
                continue
            r = by_vmid.get(str(m.get("vmid")), {})
            moves.append({"vmid": m.get("vmid"), "source_node": m.get("source_node"),
                          "target_node": m.get("target_node"), "started": bool(r.get("success")),
                          **({"error": r["error"]} if r.get("error") else {})})
        return record(action, summary, source=source, subject=f"{len(moves)} guests",
                      details={"moves": moves})
    except Exception as e:
        _warn(f"could not record batch: {e}")
        return None


def backfill_migrations(conn: Optional[sqlite3.Connection] = None) -> int:
    """Import migration_history rows newer than the retention window. Idempotent.

    Reads migration_history only; each row is keyed ``migration:<id>`` so a
    second run (or a row already recorded live) adds nothing.
    """
    try:
        conn = conn or _conn()
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='migration_history'").fetchone()
        if not exists:
            return 0
        cutoff = (_now() - timedelta(days=RETENTION_DAYS)).isoformat()[:10]
        rows = conn.execute(
            "SELECT * FROM migration_history WHERE timestamp >= ? ORDER BY id", (cutoff,)).fetchall()
        added = 0
        for row in rows:
            rec = dict(row)
            if rec.get("extra_json"):
                try:
                    rec.update({k: v for k, v in json.loads(rec["extra_json"]).items() if k not in rec})
                except (TypeError, ValueError):
                    pass
            event = migration_event(rec)
            mid = rec.get("migration_id") or f"row{rec.get('id')}"
            if event is None:
                continue
            action, summary, details = event
            initiated = str(rec.get("initiated_by") or rec.get("trigger") or "").lower()
            source = "automation" if initiated in ("automated", "automation", "auto", "scheduled") else "user"
            ts = normalize_ts(rec.get("timestamp"))
            if not ts:
                continue
            details["backfilled"] = True
            if _insert(conn, (ts, source, action, None if rec.get("vmid") is None else str(rec["vmid"]),
                              summary[:MAX_SUMMARY], json.dumps(details, default=str, sort_keys=True),
                              None, f"migration:{mid}")):
                added += 1
        conn.commit()
        return added
    except Exception as e:
        _warn(f"backfill failed: {e}")
        return 0


def _maybe_backfill(conn: sqlite3.Connection) -> None:
    path = _db.get_db_path()
    if not _backfilled.get(path):
        _backfilled[path] = True
        backfill_migrations(conn)


# ---------------------------------------------------------------------------
# Config changes
# ---------------------------------------------------------------------------

def changed_paths(before: Any, after: Any, prefix: str = "", depth: int = CONFIG_PATH_DEPTH) -> List[str]:
    """Dotted paths whose values differ between two config dicts (names only)."""
    if before == after:
        return []
    if depth <= 0 or not isinstance(before, dict) or not isinstance(after, dict):
        return [prefix] if prefix else []
    out: List[str] = []
    for key in sorted(set(before) | set(after), key=str):
        path = f"{prefix}.{key}" if prefix else str(key)
        if key not in before or key not in after:
            out.append(path)
        else:
            out.extend(changed_paths(before[key], after[key], path, depth - 1))
    return out


def _auto(config: Any) -> Dict[str, Any]:
    if isinstance(config, dict) and isinstance(config.get("automated_migrations"), dict):
        return config["automated_migrations"]
    return {}


def record_config_change(before: Optional[Dict[str, Any]], after: Dict[str, Any],
                         source: Optional[str] = None) -> List[int]:
    """Audit the difference between two full configs. Never raises.

    Emits automation on/off, dry run, mode and maintenance events for those
    settings, and one ``config.change`` row naming every other changed
    setting (paths only, no values).

    Returns:
        Ids of the rows written.
    """
    ids: List[int] = []
    try:
        before = before if isinstance(before, dict) else {}
        if source is None:
            source = "user" if _in_request() else "system"
        endpoint = _request_path()
        old_auto, new_auto = _auto(before), _auto(after)

        def add(action, summary, subject=None, details=None):
            row_id = record(action, summary, source=source, subject=subject,
                            details={**(details or {}), **({"endpoint": endpoint} if endpoint else {})})
            if row_id:
                ids.append(row_id)

        if "enabled" in new_auto and bool(old_auto.get("enabled")) != bool(new_auto.get("enabled")):
            on = bool(new_auto.get("enabled"))
            add("automation.enable" if on else "automation.disable",
                f"Automation {'enabled' if on else 'disabled'}", "automation", {"enabled": on})
        if "dry_run" in new_auto and bool(old_auto.get("dry_run", True)) != bool(new_auto.get("dry_run")):
            on = bool(new_auto.get("dry_run"))
            add("automation.dry_run", f"Dry run {'on' if on else 'off'}", "automation", {"dry_run": on})
        if "mode" in new_auto and old_auto.get("mode") != new_auto.get("mode"):
            add("automation.mode", f"Automation mode: {new_auto.get('mode')}", "automation",
                {"from": old_auto.get("mode"), "to": new_auto.get("mode")})
        old_maint = set(old_auto.get("maintenance_nodes") or [])
        new_maint = set(new_auto.get("maintenance_nodes") or []) if "maintenance_nodes" in new_auto else old_maint
        for node in sorted(new_maint - old_maint, key=str):
            add("maintenance.on", f"{node} entered maintenance", node)
        for node in sorted(old_maint - new_maint, key=str):
            add("maintenance.off", f"{node} left maintenance", node)

        own = {f"automated_migrations.{k}" for k in _OWN_EVENT_KEYS}
        paths = [p for p in changed_paths(before, after)
                 if p not in own and p not in _IGNORED_PATHS]
        if paths:
            short = [p.split(".", 1)[1] if p.startswith("automated_migrations.") else p for p in paths]
            shown = ", ".join(short[:4]) + (f" +{len(short) - 4} more" if len(short) > 4 else "")
            sections = sorted({p.split(".")[0] for p in paths})
            add("config.change", f"Settings changed: {shown}",
                sections[0] if len(sections) == 1 else "settings", {"keys": paths})
    except Exception as e:
        _warn(f"could not record config change: {e}")
    return ids


def _in_request() -> bool:
    try:
        from flask import has_request_context
        return has_request_context()
    except Exception:
        return False


def _request_path() -> Optional[str]:
    try:
        from flask import has_request_context, request
        if has_request_context():
            return f"{request.method} {request.path}"
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------

def _row(row: sqlite3.Row) -> Dict[str, Any]:
    out = dict(row)
    raw = out.pop("details_json", None)
    try:
        out["details"] = json.loads(raw) if raw else {}
    except (TypeError, ValueError):
        out["details"] = {}
    out.pop("ref", None)
    return out


def _split(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, str):
        value = value.split(",")
    return [v.strip() for v in value if isinstance(v, str) and v.strip()]


def query(since: Optional[str] = None, source: Any = None, action: Any = None,
          limit: int = DEFAULT_LIMIT, before: Optional[str] = None) -> Dict[str, Any]:
    """Events newest first.

    Args:
        since: Only events at or after this time (ISO).
        source: One source or a comma list.
        action: Action groups (``migration``) or full actions
            (``migration.failed``), one or a comma list.
        limit: Page size (1..MAX_LIMIT).
        before: Cursor from a previous page's ``next``.

    Returns:
        ``{"events": [...], "next": cursor or None}``.
    """
    conn = _conn()
    _maybe_backfill(conn)
    where: List[str] = []
    args: List[Any] = []
    since_ts = normalize_ts(since) if since else None
    if since and not since_ts:
        raise ValueError("since must be an ISO date/time")
    if since_ts:
        where.append("ts >= ?")
        args.append(since_ts)
    sources = [s for s in _split(source) if s in SOURCES]
    if _split(source) and not sources:
        raise ValueError(f"source must be one of: {', '.join(SOURCES)}")
    if sources:
        where.append(f"source IN ({','.join('?' * len(sources))})")
        args.extend(sources)
    actions = _split(action)
    if actions:
        parts = []
        for a in actions:
            if "." in a:
                parts.append("action = ?")
                args.append(a)
            else:
                parts.append("action LIKE ?")
                args.append(f"{a}.%")
        where.append("(" + " OR ".join(parts) + ")")
    if before:
        try:
            b_ts, b_id = before.rsplit("|", 1)
            b_id = int(b_id)
        except (ValueError, AttributeError):
            raise ValueError("before must be a cursor from a previous page")
        where.append("(ts < ? OR (ts = ? AND id < ?))")
        args.extend([b_ts, b_ts, b_id])
    try:
        limit = max(1, min(int(limit), MAX_LIMIT))
    except (TypeError, ValueError):
        limit = DEFAULT_LIMIT
    sql = ("SELECT id, ts, source, action, subject, summary, details_json, actor FROM audit_log"
           + (" WHERE " + " AND ".join(where) if where else "")
           + " ORDER BY ts DESC, id DESC LIMIT ?")
    rows = conn.execute(sql, args + [limit + 1]).fetchall()
    events = [_row(r) for r in rows[:limit]]
    nxt = f"{events[-1]['ts']}|{events[-1]['id']}" if len(rows) > limit and events else None
    return {"events": events, "next": nxt}


def count(conn: Optional[sqlite3.Connection] = None) -> int:
    """Total rows (tests and diagnostics)."""
    conn = conn or _conn()
    return conn.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
