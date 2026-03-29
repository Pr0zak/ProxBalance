"""
ProxBalance SQLite Database Layer

Provides thread-safe connection management, schema initialization, and
one-time migration of legacy JSON files to SQLite.

Single database: proxbalance.db with WAL mode for concurrent read access.
"""

import atexit
import json
import os
import shutil
import sqlite3
import sys
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from proxbalance.constants import (
    BASE_PATH,
    GUEST_METRICS_FILE,
    GUEST_PROFILES_FILE,
    NODE_METRICS_FILE,
    OUTCOMES_FILE,
    SCORE_HISTORY_FILE,
    SCORE_HISTORY_MAX_ENTRIES,
    MAX_OUTCOME_ENTRIES,
)


# ---------------------------------------------------------------------------
# Database path
# ---------------------------------------------------------------------------

def get_db_path() -> str:
    """Return the path to the SQLite database file.

    Respects ``PROXBALANCE_DB_PATH`` environment variable for testing,
    otherwise uses ``BASE_PATH/proxbalance.db``.
    """
    return os.environ.get("PROXBALANCE_DB_PATH", os.path.join(BASE_PATH, "proxbalance.db"))


# ---------------------------------------------------------------------------
# Thread-local connection management
# ---------------------------------------------------------------------------

_local = threading.local()


def get_connection() -> sqlite3.Connection:
    """Return a thread-local SQLite connection with WAL mode and pragmas.

    Connections are reused within the same thread.  Call :func:`close_all`
    when shutting down (e.g. in Gunicorn post-fork or atexit).
    """
    conn = getattr(_local, "conn", None)
    if conn is not None:
        return conn

    db_path = get_db_path()
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    # Performance pragmas
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-8000")  # 8 MB

    _local.conn = conn
    return conn


def close_all() -> None:
    """Close the thread-local connection (if any).

    Safe to call from any thread; only closes that thread's connection.
    """
    conn = getattr(_local, "conn", None)
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass
        _local.conn = None


# Register atexit handler so that the main-thread connection is closed when
# gunicorn workers or standalone scripts exit.  This prevents orphaned WAL
# files (the -wal and -shm sidecars) that can accumulate when processes die
# without explicitly closing their SQLite connections.
atexit.register(close_all)


# ---------------------------------------------------------------------------
# Schema DDL
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
-- Node metrics (time-series, replaces node_metrics_history.json)
CREATE TABLE IF NOT EXISTS node_metrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    node_name   TEXT    NOT NULL,
    ts          REAL    NOT NULL,
    cpu         REAL,
    memory      REAL,
    iowait      REAL,
    load_avg    REAL,
    guest_count INTEGER,
    storage_usage_pct REAL,
    -- Aggregation fields (NULL for raw samples)
    aggregated  INTEGER DEFAULT 0,
    tier        TEXT,
    ts_start    REAL,
    ts_end      REAL,
    sample_count INTEGER DEFAULT 1,
    agg_stats   TEXT   -- JSON: per-field {min,max,avg,p95} for aggregated rows
);
CREATE INDEX IF NOT EXISTS idx_node_metrics_name_ts ON node_metrics(node_name, ts);

-- Guest metrics (time-series, replaces guest_metrics_history.json)
CREATE TABLE IF NOT EXISTS guest_metrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vmid        TEXT    NOT NULL,
    ts          REAL    NOT NULL,
    node        TEXT,
    cpu         REAL,
    memory      REAL,
    disk_read_bps  REAL,
    disk_write_bps REAL,
    net_in_bps  REAL,
    net_out_bps REAL,
    -- Aggregation fields
    aggregated  INTEGER DEFAULT 0,
    tier        TEXT,
    ts_start    REAL,
    ts_end      REAL,
    sample_count INTEGER DEFAULT 1,
    agg_stats   TEXT
);
CREATE INDEX IF NOT EXISTS idx_guest_metrics_vmid_ts ON guest_metrics(vmid, ts);

-- Guest profiles (replaces guest_profiles.json)
CREATE TABLE IF NOT EXISTS guest_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vmid        TEXT    NOT NULL,
    node        TEXT,
    timestamp   TEXT    NOT NULL,
    cpu_json    TEXT,   -- JSON: {min, max, avg, p95, samples}
    mem_json    TEXT    -- JSON: {min, max, avg, p95, samples}
);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_vmid ON guest_profiles(vmid);

-- Score history (replaces score_history.json)
CREATE TABLE IF NOT EXISTS score_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL,
    nodes_json  TEXT    NOT NULL,  -- JSON: {node_name: {score, suitability, cpu, mem}}
    cluster_health       REAL,
    recommendation_count INTEGER
);

-- Migration outcomes (replaces migration_outcomes.json)
CREATE TABLE IF NOT EXISTS migration_outcomes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT    UNIQUE,
    vmid        TEXT,
    source_node TEXT,
    target_node TEXT,
    guest_type  TEXT,
    status      TEXT    DEFAULT 'pending_5min',
    pre_migration_json   TEXT,  -- JSON snapshot
    post_5min_json       TEXT,
    post_1h_json         TEXT,
    post_24h_json        TEXT,
    predicted_improvement REAL,
    actual_improvement_json   TEXT,  -- JSON
    sustained_improvement_json TEXT, -- JSON
    accuracy_pct         REAL,
    verdict              TEXT,
    trend_evidence_json  TEXT,  -- JSON
    post_migration_json  TEXT   -- Legacy compat
);

-- Migration history (replaces migration_history.json -> migrations[])
CREATE TABLE IF NOT EXISTS migration_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id TEXT   UNIQUE,
    vmid        INTEGER,
    guest_name  TEXT,
    guest_type  TEXT,
    source_node TEXT,
    target_node TEXT,
    timestamp   TEXT    NOT NULL,
    status      TEXT    DEFAULT 'started',
    task_id     TEXT,
    reason      TEXT,
    confidence  REAL,
    dry_run     INTEGER DEFAULT 0,
    trigger     TEXT,
    run_id      TEXT,
    duration_seconds REAL,
    error_message TEXT,
    extra_json  TEXT    -- JSON: any additional fields
);
CREATE INDEX IF NOT EXISTS idx_migration_history_vmid ON migration_history(vmid);
CREATE INDEX IF NOT EXISTS idx_migration_history_ts ON migration_history(timestamp);

-- Automation state (replaces migration_history.json -> state{})
CREATE TABLE IF NOT EXISTS automation_state (
    key   TEXT PRIMARY KEY,
    value TEXT  -- JSON-encoded value
);

-- Automation run history (replaces migration_history.json -> run_history[])
CREATE TABLE IF NOT EXISTS automation_run_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT,
    timestamp   TEXT    NOT NULL,
    status      TEXT,
    summary_json TEXT   -- JSON: full run summary
);
CREATE INDEX IF NOT EXISTS idx_run_history_ts ON automation_run_history(timestamp);

-- Recommendation tracking (replaces recommendation_tracking.json)
CREATE TABLE IF NOT EXISTS recommendation_tracking (
    key         TEXT PRIMARY KEY,
    data_json   TEXT    NOT NULL  -- JSON: full tracking entry
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT    NOT NULL,
    description TEXT
);
"""


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create schema and run one-time JSON migration if needed.

    Safe to call multiple times — uses ``CREATE TABLE IF NOT EXISTS`` and
    checks ``schema_version`` before importing JSON data.
    """
    conn = get_connection()
    conn.executescript(SCHEMA_SQL)

    # Check if JSON migration has already run
    cur = conn.execute("SELECT version FROM schema_version WHERE version = 1")
    if cur.fetchone() is None:
        _migrate_json_to_sqlite(conn)
        conn.execute(
            "INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)",
            (1, datetime.now(timezone.utc).isoformat(), "Initial JSON to SQLite migration"),
        )
        conn.commit()
        print("ProxBalance: SQLite database initialized with JSON migration", file=sys.stderr)
    else:
        print("ProxBalance: SQLite database already initialized", file=sys.stderr)


# ---------------------------------------------------------------------------
# One-time JSON migration
# ---------------------------------------------------------------------------

def _migrate_json_to_sqlite(conn: sqlite3.Connection) -> None:
    """Import data from all legacy JSON files into SQLite tables.

    After successful import each JSON file is renamed to ``.json.migrated``.
    The entire import runs in a single transaction.
    """
    print("ProxBalance: Starting one-time JSON to SQLite migration...", file=sys.stderr)

    _migrate_node_metrics(conn)
    _migrate_guest_metrics(conn)
    _migrate_guest_profiles(conn)
    _migrate_score_history(conn)
    _migrate_outcomes(conn)
    _migrate_migration_history(conn)
    _migrate_recommendation_tracking(conn)

    conn.commit()
    print("ProxBalance: JSON migration complete", file=sys.stderr)


def _safe_load_json(path: str) -> Any:
    """Load JSON file, return None on any error."""
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
    except Exception as e:
        print(f"ProxBalance: Warning — could not read {path}: {e}", file=sys.stderr)
    return None


def _rename_migrated(path: str) -> None:
    """Rename a JSON file to .json.migrated after successful import."""
    try:
        if os.path.exists(path):
            dest = path + ".migrated"
            # If .migrated already exists, remove it first
            if os.path.exists(dest):
                os.remove(dest)
            os.rename(path, dest)
            print(f"  Renamed {os.path.basename(path)} -> {os.path.basename(dest)}", file=sys.stderr)
    except Exception as e:
        print(f"  Warning: could not rename {path}: {e}", file=sys.stderr)


def _migrate_node_metrics(conn: sqlite3.Connection) -> None:
    """Import node_metrics_history.json."""
    data = _safe_load_json(NODE_METRICS_FILE)
    if not data or "nodes" not in data:
        return

    count = 0
    for node_name, entity in data.get("nodes", {}).items():
        # Raw samples
        for s in entity.get("samples", []):
            conn.execute(
                "INSERT INTO node_metrics (node_name, ts, cpu, memory, iowait, load_avg, guest_count, storage_usage_pct) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (node_name, s.get("ts", 0), s.get("cpu", 0), s.get("memory", 0),
                 s.get("iowait", 0), s.get("load_avg", 0), s.get("guest_count", 0),
                 s.get("storage_usage_pct", 0)),
            )
            count += 1

        # Aggregated samples
        for a in entity.get("aggregated", []):
            agg_stats = {}
            for field in ("cpu", "memory", "iowait", "load_avg", "guest_count", "storage_usage_pct"):
                val = a.get(field)
                if isinstance(val, dict):
                    agg_stats[field] = val
            conn.execute(
                "INSERT INTO node_metrics (node_name, ts, aggregated, tier, ts_start, ts_end, sample_count, agg_stats) "
                "VALUES (?, ?, 1, ?, ?, ?, ?, ?)",
                (node_name, a.get("ts", 0), a.get("tier", "hourly"),
                 a.get("ts_start"), a.get("ts_end"), a.get("sample_count", 1),
                 json.dumps(agg_stats)),
            )
            count += 1

    print(f"  Migrated {count} node metric samples", file=sys.stderr)
    _rename_migrated(NODE_METRICS_FILE)


def _migrate_guest_metrics(conn: sqlite3.Connection) -> None:
    """Import guest_metrics_history.json."""
    data = _safe_load_json(GUEST_METRICS_FILE)
    if not data or "guests" not in data:
        return

    count = 0
    for vmid, entity in data.get("guests", {}).items():
        # Raw samples
        for s in entity.get("samples", []):
            conn.execute(
                "INSERT INTO guest_metrics (vmid, ts, node, cpu, memory, disk_read_bps, disk_write_bps, net_in_bps, net_out_bps) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (str(vmid), s.get("ts", 0), s.get("node", ""),
                 s.get("cpu", 0), s.get("memory", 0),
                 s.get("disk_read_bps", 0), s.get("disk_write_bps", 0),
                 s.get("net_in_bps", 0), s.get("net_out_bps", 0)),
            )
            count += 1

        # Aggregated samples
        for a in entity.get("aggregated", []):
            agg_stats = {}
            for field in ("cpu", "memory", "disk_read_bps", "disk_write_bps", "net_in_bps", "net_out_bps"):
                val = a.get(field)
                if isinstance(val, dict):
                    agg_stats[field] = val
            conn.execute(
                "INSERT INTO guest_metrics (vmid, ts, aggregated, tier, ts_start, ts_end, sample_count, agg_stats) "
                "VALUES (?, ?, 1, ?, ?, ?, ?, ?)",
                (str(vmid), a.get("ts", 0), a.get("tier", "hourly"),
                 a.get("ts_start"), a.get("ts_end"), a.get("sample_count", 1),
                 json.dumps(agg_stats)),
            )
            count += 1

    print(f"  Migrated {count} guest metric samples", file=sys.stderr)
    _rename_migrated(GUEST_METRICS_FILE)


def _migrate_guest_profiles(conn: sqlite3.Connection) -> None:
    """Import guest_profiles.json."""
    data = _safe_load_json(GUEST_PROFILES_FILE)
    if not data or "profiles" not in data:
        return

    count = 0
    for vmid, profile in data.get("profiles", {}).items():
        node = profile.get("node", "")
        for obs in profile.get("observations", []):
            conn.execute(
                "INSERT INTO guest_profiles (vmid, node, timestamp, cpu_json, mem_json) "
                "VALUES (?, ?, ?, ?, ?)",
                (str(vmid), node, obs.get("timestamp", ""),
                 json.dumps(obs.get("cpu", {})),
                 json.dumps(obs.get("mem", {}))),
            )
            count += 1

    print(f"  Migrated {count} guest profile observations", file=sys.stderr)
    _rename_migrated(GUEST_PROFILES_FILE)


def _migrate_score_history(conn: sqlite3.Connection) -> None:
    """Import score_history.json."""
    data = _safe_load_json(SCORE_HISTORY_FILE)
    if not data or not isinstance(data, list):
        return

    count = 0
    for entry in data:
        conn.execute(
            "INSERT INTO score_history (timestamp, nodes_json, cluster_health, recommendation_count) "
            "VALUES (?, ?, ?, ?)",
            (entry.get("timestamp", ""), json.dumps(entry.get("nodes", {})),
             entry.get("cluster_health", 0), entry.get("recommendation_count", 0)),
        )
        count += 1

    print(f"  Migrated {count} score history entries", file=sys.stderr)
    _rename_migrated(SCORE_HISTORY_FILE)


def _migrate_outcomes(conn: sqlite3.Connection) -> None:
    """Import migration_outcomes.json."""
    data = _safe_load_json(OUTCOMES_FILE)
    if not data or not isinstance(data, list):
        return

    count = 0
    for entry in data:
        conn.execute(
            "INSERT OR IGNORE INTO migration_outcomes "
            "(key, vmid, source_node, target_node, guest_type, status, "
            " pre_migration_json, post_5min_json, post_1h_json, post_24h_json, "
            " predicted_improvement, actual_improvement_json, sustained_improvement_json, "
            " accuracy_pct, verdict, trend_evidence_json, post_migration_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (entry.get("key"), entry.get("vmid"), entry.get("source_node"),
             entry.get("target_node"), entry.get("guest_type"), entry.get("status"),
             json.dumps(entry.get("pre_migration")) if entry.get("pre_migration") else None,
             json.dumps(entry.get("post_5min")) if entry.get("post_5min") else None,
             json.dumps(entry.get("post_1h")) if entry.get("post_1h") else None,
             json.dumps(entry.get("post_24h")) if entry.get("post_24h") else None,
             entry.get("predicted_improvement"),
             json.dumps(entry.get("actual_improvement")) if entry.get("actual_improvement") else None,
             json.dumps(entry.get("sustained_improvement")) if entry.get("sustained_improvement") else None,
             entry.get("accuracy_pct"), entry.get("verdict"),
             json.dumps(entry.get("trend_evidence_snapshot")) if entry.get("trend_evidence_snapshot") else None,
             json.dumps(entry.get("post_migration")) if entry.get("post_migration") else None),
        )
        count += 1

    print(f"  Migrated {count} migration outcomes", file=sys.stderr)
    _rename_migrated(OUTCOMES_FILE)


def _migrate_migration_history(conn: sqlite3.Connection) -> None:
    """Import migration_history.json (migrations[], state{}, run_history[])."""
    history_file = os.path.join(BASE_PATH, "migration_history.json")
    data = _safe_load_json(history_file)
    if not data:
        return

    # Migrations
    mig_count = 0
    for m in data.get("migrations", []):
        # Collect known columns; put everything else in extra_json
        known_keys = {
            "migration_id", "vmid", "guest_name", "guest_type", "source_node",
            "target_node", "timestamp", "status", "task_id", "reason",
            "confidence", "dry_run", "trigger", "run_id", "duration_seconds",
            "error_message",
        }
        extra = {k: v for k, v in m.items() if k not in known_keys}

        conn.execute(
            "INSERT OR IGNORE INTO migration_history "
            "(migration_id, vmid, guest_name, guest_type, source_node, target_node, "
            " timestamp, status, task_id, reason, confidence, dry_run, trigger, "
            " run_id, duration_seconds, error_message, extra_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (m.get("migration_id", m.get("id")), m.get("vmid"), m.get("guest_name"),
             m.get("guest_type", m.get("type")), m.get("source_node"),
             m.get("target_node"), m.get("timestamp", ""),
             m.get("status", "completed"), m.get("task_id"),
             m.get("reason"), m.get("confidence"),
             1 if m.get("dry_run") else 0, m.get("trigger"),
             m.get("run_id"), m.get("duration_seconds"),
             m.get("error_message"),
             json.dumps(extra) if extra else None),
        )
        mig_count += 1

    # State
    state = data.get("state", {})
    for key, value in state.items():
        conn.execute(
            "INSERT OR REPLACE INTO automation_state (key, value) VALUES (?, ?)",
            (key, json.dumps(value)),
        )

    # Run history
    run_count = 0
    for run in data.get("run_history", []):
        conn.execute(
            "INSERT INTO automation_run_history (run_id, timestamp, status, summary_json) "
            "VALUES (?, ?, ?, ?)",
            (run.get("run_id"), run.get("timestamp", ""),
             run.get("status"), json.dumps(run)),
        )
        run_count += 1

    print(f"  Migrated {mig_count} migration records, {len(state)} state keys, {run_count} run history entries", file=sys.stderr)
    _rename_migrated(history_file)


def _migrate_recommendation_tracking(conn: sqlite3.Connection) -> None:
    """Import recommendation_tracking.json."""
    from proxbalance.constants import RECOMMENDATION_TRACKING_FILE
    data = _safe_load_json(RECOMMENDATION_TRACKING_FILE)
    if not data:
        return

    count = 0
    # The tracking file may have a top-level "tracked" dict or be flat
    tracked = data.get("tracked", data)
    if isinstance(tracked, dict):
        for key, entry in tracked.items():
            conn.execute(
                "INSERT OR REPLACE INTO recommendation_tracking (key, data_json) VALUES (?, ?)",
                (key, json.dumps(entry)),
            )
            count += 1

    print(f"  Migrated {count} recommendation tracking entries", file=sys.stderr)
    _rename_migrated(RECOMMENDATION_TRACKING_FILE)
