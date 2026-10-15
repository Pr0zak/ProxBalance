"""
ProxBalance alert state: hysteresis, fingerprint dedupe and silences.

Threshold-type notifications (node CPU/memory over the safety limit, cluster
health under 50, ...) used to be sent on every check while the condition
held, and again every time a value bounced across the limit. This module
keeps one row per alert, keyed by a fingerprint ``"<alert_type>:<subject>"``:

* The first observation over the limit makes the alert ``active`` and is the
  only one that notifies (``fire``). Later observations while it is active
  are suppressed (``active``).
* An active alert resolves only after ``resolve_collections`` consecutive
  observations at least ``resolve_margin`` points on the good side of the
  limit. A value between the limit and the margin resets that count.
* Condition alerts (node offline, collection failing, safety check failing,
  recommendations pending) use the same state with a yes/no condition.

Silences suppress the notification for a fingerprint or a whole alert type,
for a fixed time or until the alert resolves. The alert itself is still
tracked while silenced, so it shows in the Active alerts list.

Tables (DDL in ``proxbalance/db.py`` as ``ALERT_SCHEMA_SQL``):
``alert_state``, ``alert_silences``, ``notification_dedupe``.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from proxbalance.db import ALERT_SCHEMA_SQL, get_connection, get_db_path

DEFAULT_RESOLVE_COLLECTIONS = 3
DEFAULT_RESOLVE_MARGIN = 5.0
DEFAULT_EVENT_DEDUPE_SECONDS = 120

# Accepted silence durations. None = until the alert resolves.
SILENCE_DURATIONS: Dict[str, Optional[timedelta]] = {
    "1h": timedelta(hours=1),
    "8h": timedelta(hours=8),
    "24h": timedelta(hours=24),
    "resolved": None,
}

# Transition results returned by observe_*().
FIRE = "fire"          # newly active: send the one notification
ACTIVE = "active"      # still active: suppressed repeat
PENDING = "pending"    # active, counting clear observations
RESOLVE = "resolve"    # just resolved
CLEAR = None           # nothing active, nothing to do

_schema_ready: Dict[str, bool] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _conn():
    """Connection with the alert tables present (created once per DB path)."""
    conn = get_connection()
    path = get_db_path()
    if not _schema_ready.get(path):
        conn.executescript(ALERT_SCHEMA_SQL)
        _schema_ready[path] = True
    return conn


def settings_from_config(config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Read the hysteresis settings from ``automated_migrations.notifications``."""
    notif = ((config or {}).get("automated_migrations") or {}).get("notifications") or {}

    def num(key, default, cast, low):
        try:
            value = cast(notif.get(key, default))
        except (TypeError, ValueError):
            return default
        return value if value >= low else default

    return {
        "resolve_collections": num("alert_resolve_collections", DEFAULT_RESOLVE_COLLECTIONS, int, 1),
        "resolve_margin": num("alert_resolve_margin", DEFAULT_RESOLVE_MARGIN, float, 0),
        "event_dedupe_seconds": num("event_dedupe_seconds", DEFAULT_EVENT_DEDUPE_SECONDS, int, 0),
    }


def fingerprint(alert_type: str, subject: str) -> str:
    return f"{alert_type}:{subject}"


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------

def _observe(alert_type: str, subject: str, bad: bool, clear_ok: bool,
             resolve_after: int, label: Optional[str], value: Optional[float],
             threshold: Optional[float], now: Optional[datetime]) -> Dict[str, Any]:
    fp = fingerprint(alert_type, subject)
    now_s = _iso(now or _now())
    # Before any write: get_connection() rolls back an open transaction.
    silenced = is_silenced(fp, alert_type, now=now)
    conn = _conn()
    row = conn.execute("SELECT * FROM alert_state WHERE fingerprint = ?", (fp,)).fetchone()
    is_active = row is not None and row["status"] == "active"
    result: Dict[str, Any] = {"fingerprint": fp, "alert_type": alert_type, "subject": subject,
                              "action": CLEAR, "silenced": False}

    if bad:
        if is_active:
            conn.execute(
                "UPDATE alert_state SET last_seen = ?, value = ?, threshold = ?, label = COALESCE(?, label), "
                "clear_count = 0, repeats = repeats + 1 WHERE fingerprint = ?",
                (now_s, value, threshold, label, fp))
            result["action"] = ACTIVE
        else:
            conn.execute(
                "INSERT OR REPLACE INTO alert_state (fingerprint, alert_type, subject, status, label, value, "
                "threshold, first_seen, last_seen, notified_at, resolved_at, clear_count, repeats) "
                "VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, NULL, NULL, 0, 0)",
                (fp, alert_type, subject, label, value, threshold, now_s, now_s))
            result["action"] = FIRE
            result["silenced"] = silenced
        conn.commit()
        return result

    if not is_active:
        return result

    result["previous_value"] = row["value"]
    if not clear_ok:
        # Under the limit but inside the margin: not a clear collection.
        conn.execute("UPDATE alert_state SET last_seen = ?, clear_count = 0 WHERE fingerprint = ?", (now_s, fp))
        conn.commit()
        result["action"] = ACTIVE
        return result

    count = (row["clear_count"] or 0) + 1
    if count >= resolve_after:
        result["silenced"] = silenced
        conn.execute(
            "UPDATE alert_state SET status = 'resolved', resolved_at = ?, last_seen = ?, clear_count = ? "
            "WHERE fingerprint = ?", (now_s, now_s, count, fp))
        _drop_until_resolved(conn, fp, alert_type)
        result["action"] = RESOLVE
    else:
        conn.execute("UPDATE alert_state SET last_seen = ?, clear_count = ? WHERE fingerprint = ?",
                     (now_s, count, fp))
        result["action"] = PENDING
    conn.commit()
    return result


def observe_threshold(alert_type: str, subject: str, value: float, warn: float, *,
                      higher_is_worse: bool = True, settings: Optional[Dict[str, Any]] = None,
                      label: Optional[str] = None, now: Optional[datetime] = None) -> Dict[str, Any]:
    """Record one observation of a value against its warning level.

    Over the level (``>`` when higher is worse, ``<`` otherwise) is bad. A
    collection counts towards resolving only when the value is at least
    ``resolve_margin`` points on the good side of ``warn``.

    Returns:
        Dict with ``action`` (``fire``, ``active``, ``pending``, ``resolve``
        or None), ``fingerprint`` and ``silenced`` (for fire/resolve).
    """
    s = settings or settings_from_config(None)
    margin = s["resolve_margin"]
    value = float(value)
    warn = float(warn)
    if higher_is_worse:
        bad, clear_ok = value > warn, value <= warn - margin
    else:
        bad, clear_ok = value < warn, value >= warn + margin
    return _observe(alert_type, subject, bad, clear_ok, s["resolve_collections"],
                    label, value, warn, now)


def observe_condition(alert_type: str, subject: str, active: bool, *,
                      settings: Optional[Dict[str, Any]] = None, resolve_after: Optional[int] = None,
                      label: Optional[str] = None, value: Optional[float] = None,
                      now: Optional[datetime] = None) -> Dict[str, Any]:
    """Record one yes/no observation (e.g. node offline, collection failed).

    Resolves after ``resolve_after`` (default ``resolve_collections``)
    consecutive observations with ``active`` False.
    """
    s = settings or settings_from_config(None)
    after = resolve_after if resolve_after is not None else s["resolve_collections"]
    return _observe(alert_type, subject, bool(active), not active, max(1, int(after)),
                    label, value, None, now)


def mark_notified(fp: str, now: Optional[datetime] = None) -> None:
    conn = _conn()
    conn.execute("UPDATE alert_state SET notified_at = ? WHERE fingerprint = ?", (_iso(now or _now()), fp))
    conn.commit()


def get_active_alerts(now: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """Active alerts, newest first, each with ``silence`` (or None)."""
    conn = _conn()
    rows = conn.execute(
        "SELECT * FROM alert_state WHERE status = 'active' ORDER BY first_seen DESC").fetchall()
    silences = list_silences(now=now)
    out = []
    for r in rows:
        item = dict(r)
        item["silence"] = _matching_silence(silences, r["fingerprint"], r["alert_type"])
        out.append(item)
    return out


# ---------------------------------------------------------------------------
# Silences
# ---------------------------------------------------------------------------

def _prune_silences(conn, now: datetime) -> None:
    conn.execute("DELETE FROM alert_silences WHERE until_resolved = 0 AND expires_at <= ?", (_iso(now),))


def _matching_silence(silences: List[Dict[str, Any]], fp: str, alert_type: str) -> Optional[Dict[str, Any]]:
    for s in silences:
        if s["fingerprint"] == fp or (s["fingerprint"] is None and s["alert_type"] == alert_type):
            return s
    return None


def list_silences(now: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """Silences that are still in effect."""
    conn = _conn()
    _prune_silences(conn, now or _now())
    conn.commit()
    rows = conn.execute("SELECT * FROM alert_silences ORDER BY created_at DESC, id DESC").fetchall()
    return [dict(r) for r in rows]


def is_silenced(fp: Optional[str], alert_type: Optional[str], now: Optional[datetime] = None) -> bool:
    """True when a silence covers this fingerprint or its alert type."""
    silences = list_silences(now=now)
    for s in silences:
        if fp and s["fingerprint"] == fp:
            return True
        if alert_type and s["fingerprint"] is None and s["alert_type"] == alert_type:
            return True
    return False


def create_silence(*, fingerprint: Optional[str] = None, alert_type: Optional[str] = None,
                   duration: str = "1h", now: Optional[datetime] = None) -> Dict[str, Any]:
    """Silence one alert (fingerprint) or a whole alert type.

    Args:
        fingerprint: ``"<alert_type>:<subject>"``; takes precedence.
        alert_type: used when no fingerprint is given.
        duration: one of ``SILENCE_DURATIONS`` ("1h", "8h", "24h", "resolved").

    Raises:
        ValueError: unknown duration or neither target given.
    """
    if duration not in SILENCE_DURATIONS:
        raise ValueError(f"duration must be one of {', '.join(SILENCE_DURATIONS)}")
    fingerprint = (fingerprint or "").strip() or None
    alert_type = (alert_type or "").strip() or None
    if fingerprint:
        alert_type = fingerprint.split(":", 1)[0]
    elif not alert_type:
        raise ValueError("fingerprint or alert_type is required")
    now = now or _now()
    delta = SILENCE_DURATIONS[duration]
    expires = _iso(now + delta) if delta is not None else None
    conn = _conn()
    cur = conn.execute(
        "INSERT INTO alert_silences (fingerprint, alert_type, created_at, expires_at, until_resolved) "
        "VALUES (?, ?, ?, ?, ?)",
        (fingerprint, alert_type, _iso(now), expires, 1 if delta is None else 0))
    conn.commit()
    row = conn.execute("SELECT * FROM alert_silences WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def delete_silence(silence_id: int) -> bool:
    conn = _conn()
    cur = conn.execute("DELETE FROM alert_silences WHERE id = ?", (int(silence_id),))
    conn.commit()
    return cur.rowcount > 0


def _drop_until_resolved(conn, fp: str, alert_type: str) -> None:
    """End "until resolved" silences once their alert (or every alert of
    their type) has resolved. Caller commits."""
    conn.execute("DELETE FROM alert_silences WHERE until_resolved = 1 AND fingerprint = ?", (fp,))
    still = conn.execute(
        "SELECT 1 FROM alert_state WHERE status = 'active' AND alert_type = ? AND fingerprint != ? LIMIT 1",
        (alert_type, fp)).fetchone()
    if still is None:
        conn.execute(
            "DELETE FROM alert_silences WHERE until_resolved = 1 AND fingerprint IS NULL AND alert_type = ?",
            (alert_type,))


# ---------------------------------------------------------------------------
# Exact-repeat guard for event notifications
# ---------------------------------------------------------------------------

def is_recent_duplicate(event_type: str, title: str, message: str, window_seconds: int,
                        now: Optional[datetime] = None) -> bool:
    """True if the same event text was sent within ``window_seconds``.

    Records the send otherwise. ``window_seconds`` of 0 disables the guard.
    """
    if window_seconds <= 0:
        return False
    now = now or _now()
    digest = hashlib.sha256(f"{event_type}\0{title}\0{message}".encode()).hexdigest()
    conn = _conn()
    cutoff = _iso(now - timedelta(seconds=window_seconds))
    conn.execute("DELETE FROM notification_dedupe WHERE sent_at < ?", (cutoff,))
    row = conn.execute("SELECT sent_at FROM notification_dedupe WHERE digest = ?", (digest,)).fetchone()
    if row is not None:
        conn.commit()
        return True
    conn.execute("INSERT OR REPLACE INTO notification_dedupe (digest, sent_at) VALUES (?, ?)",
                 (digest, _iso(now)))
    conn.commit()
    return False
