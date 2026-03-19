"""
ProxBalance Persistent Metrics Store (SQLite backend)

Provides append-only, tiered-compression time-series storage for node and guest
performance metrics. Data is retained for up to 90 days with automatic
compression of older samples:

  - Recent (0-48 h): full resolution (one sample per collector run)
  - Short-term (2-14 d): hourly aggregates (min / max / avg / p95)
  - Long-term (14-90 d): 6-hour aggregates

All writes are single-row INSERTs (~200 bytes each), eliminating the
multi-megabyte JSON rewrites that caused excessive I/O.
"""

import json
import statistics
from datetime import datetime, timezone
from typing import Any, Dict, List

from proxbalance.constants import (
    METRICS_RETENTION_DAYS,
    METRICS_RECENT_HOURS,
    METRICS_SHORT_TERM_DAYS,
)
from proxbalance.db import get_connection

# Metric fields tracked per node sample
NODE_METRIC_FIELDS = ("cpu", "memory", "iowait", "load_avg", "guest_count", "storage_usage_pct")

# Metric fields tracked per guest sample
GUEST_METRIC_FIELDS = ("cpu", "memory", "disk_read_bps", "disk_write_bps", "net_in_bps", "net_out_bps")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_ts() -> float:
    """Current UTC timestamp as float."""
    return datetime.now(timezone.utc).timestamp()


def _percentile(values: List[float], pct: int) -> float:
    """Simple percentile calculation (no numpy dependency)."""
    if not values:
        return 0.0
    sv = sorted(values)
    k = (len(sv) - 1) * pct / 100
    f = int(k)
    c = f + 1
    if c >= len(sv):
        return float(sv[-1])
    return sv[f] + (k - f) * (sv[c] - sv[f])


def _aggregate_samples(samples: List[Dict], fields: tuple) -> Dict:
    """Aggregate a group of raw samples into a single aggregate dict.

    Returns a dict with ``ts`` (midpoint timestamp) and per-field
    ``min`` / ``max`` / ``avg`` / ``p95``.
    """
    if not samples:
        return {}

    timestamps = [s["ts"] for s in samples]
    result: Dict[str, Any] = {
        "ts": statistics.mean(timestamps),
        "ts_start": min(timestamps),
        "ts_end": max(timestamps),
        "sample_count": len(samples),
        "aggregated": True,
    }

    for field in fields:
        values = [s[field] for s in samples if field in s and s[field] is not None]
        if values:
            result[field] = {
                "min": round(min(values), 2),
                "max": round(max(values), 2),
                "avg": round(statistics.mean(values), 2),
                "p95": round(_percentile(values, 95), 2),
            }
        else:
            result[field] = {"min": 0, "max": 0, "avg": 0, "p95": 0}

    return result


# ---------------------------------------------------------------------------
# Node Metrics
# ---------------------------------------------------------------------------

def append_node_sample(node_name: str, metrics: Dict) -> None:
    """Append a raw node metrics sample to the persistent store.

    Args:
        node_name: Proxmox node name.
        metrics: Dict with keys matching NODE_METRIC_FIELDS.
    """
    ts = _now_ts()
    conn = get_connection()

    cpu = metrics.get("cpu", 0) or 0
    memory = metrics.get("memory", 0) or 0
    iowait = metrics.get("iowait", 0) or 0
    load_avg = metrics.get("load_avg", 0) or 0
    guest_count = metrics.get("guest_count", 0) or 0
    storage_usage_pct = metrics.get("storage_usage_pct", 0) or 0

    conn.execute(
        "INSERT INTO node_metrics (node_name, ts, cpu, memory, iowait, load_avg, guest_count, storage_usage_pct) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (node_name, ts,
         round(cpu, 2) if isinstance(cpu, float) else cpu,
         round(memory, 2) if isinstance(memory, float) else memory,
         round(iowait, 2) if isinstance(iowait, float) else iowait,
         round(load_avg, 2) if isinstance(load_avg, float) else load_avg,
         guest_count,
         round(storage_usage_pct, 2) if isinstance(storage_usage_pct, float) else storage_usage_pct),
    )
    conn.commit()


def append_guest_sample(vmid: str, metrics: Dict) -> None:
    """Append a raw guest metrics sample to the persistent store.

    Args:
        vmid: Guest VMID as string.
        metrics: Dict with keys matching GUEST_METRIC_FIELDS plus ``node``.
    """
    ts = _now_ts()
    conn = get_connection()
    vmid_str = str(vmid)

    node = metrics.get("node", "")
    cpu = metrics.get("cpu", 0) or 0
    memory = metrics.get("memory", 0) or 0
    disk_read = metrics.get("disk_read_bps", 0) or 0
    disk_write = metrics.get("disk_write_bps", 0) or 0
    net_in = metrics.get("net_in_bps", 0) or 0
    net_out = metrics.get("net_out_bps", 0) or 0

    conn.execute(
        "INSERT INTO guest_metrics (vmid, ts, node, cpu, memory, disk_read_bps, disk_write_bps, net_in_bps, net_out_bps) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (vmid_str, ts, node,
         round(cpu, 2) if isinstance(cpu, float) else cpu,
         round(memory, 2) if isinstance(memory, float) else memory,
         round(disk_read, 2) if isinstance(disk_read, float) else disk_read,
         round(disk_write, 2) if isinstance(disk_write, float) else disk_write,
         round(net_in, 2) if isinstance(net_in, float) else net_in,
         round(net_out, 2) if isinstance(net_out, float) else net_out),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Compression
# ---------------------------------------------------------------------------

def compress_old_samples() -> Dict[str, int]:
    """Run tiered compression on both node and guest stores.

    Returns a summary dict with counts of compressed samples.
    """
    summary = {
        "nodes_compressed": _compress_table("node_metrics", "node_name", NODE_METRIC_FIELDS),
        "guests_compressed": _compress_table("guest_metrics", "vmid", GUEST_METRIC_FIELDS),
    }
    return summary


def _compress_table(table: str, entity_col: str, fields: tuple) -> int:
    """Compress raw samples older than METRICS_RECENT_HOURS into hourly aggregates,
    and hourly aggregates older than METRICS_SHORT_TERM_DAYS into 6-hour aggregates.
    Drop anything older than METRICS_RETENTION_DAYS.
    """
    conn = get_connection()
    now = _now_ts()
    recent_cutoff = now - (METRICS_RECENT_HOURS * 3600)
    short_term_cutoff = now - (METRICS_SHORT_TERM_DAYS * 86400)
    retention_cutoff = now - (METRICS_RETENTION_DAYS * 86400)
    total_compressed = 0

    # --- Step 0: Drop everything beyond retention ---
    conn.execute(f"DELETE FROM {table} WHERE ts < ?", (retention_cutoff,))

    # --- Step 1: Compress old raw samples into hourly aggregates ---
    # Get distinct entities that have old raw samples
    rows = conn.execute(
        f"SELECT DISTINCT {entity_col} FROM {table} WHERE aggregated = 0 AND ts < ?",
        (recent_cutoff,),
    ).fetchall()

    for (entity_name,) in rows:
        # Fetch old raw samples for this entity
        samples_rows = conn.execute(
            f"SELECT id, ts, {', '.join(fields)} FROM {table} "
            f"WHERE {entity_col} = ? AND aggregated = 0 AND ts < ? ORDER BY ts",
            (entity_name, recent_cutoff),
        ).fetchall()

        if not samples_rows:
            continue

        # Group by hour
        hour_groups: Dict[int, list] = {}
        ids_to_delete = []
        for row in samples_rows:
            sample = dict(row)
            ids_to_delete.append(sample["id"])
            hour_key = int(sample["ts"] // 3600)
            hour_groups.setdefault(hour_key, []).append(sample)

        # Create aggregate for each hour group
        for hour_key, group in hour_groups.items():
            agg = _aggregate_samples(group, fields)
            if not agg:
                continue
            agg_stats = {}
            for field in fields:
                if isinstance(agg.get(field), dict):
                    agg_stats[field] = agg[field]

            if table == "node_metrics":
                conn.execute(
                    f"INSERT INTO {table} ({entity_col}, ts, aggregated, tier, ts_start, ts_end, sample_count, agg_stats) "
                    "VALUES (?, ?, 1, 'hourly', ?, ?, ?, ?)",
                    (entity_name, agg["ts"], agg["ts_start"], agg["ts_end"],
                     agg["sample_count"], json.dumps(agg_stats)),
                )
            else:
                conn.execute(
                    f"INSERT INTO {table} ({entity_col}, ts, aggregated, tier, ts_start, ts_end, sample_count, agg_stats) "
                    "VALUES (?, ?, 1, 'hourly', ?, ?, ?, ?)",
                    (entity_name, agg["ts"], agg["ts_start"], agg["ts_end"],
                     agg["sample_count"], json.dumps(agg_stats)),
                )
            total_compressed += len(group)

        # Delete old raw samples
        if ids_to_delete:
            # Delete in batches to avoid hitting SQLite variable limit
            batch_size = 500
            for i in range(0, len(ids_to_delete), batch_size):
                batch = ids_to_delete[i:i + batch_size]
                placeholders = ",".join("?" * len(batch))
                conn.execute(f"DELETE FROM {table} WHERE id IN ({placeholders})", batch)

    # --- Step 2: Compress old hourly aggregates into 6-hour blocks ---
    rows = conn.execute(
        f"SELECT DISTINCT {entity_col} FROM {table} WHERE aggregated = 1 AND tier = 'hourly' AND ts < ?",
        (short_term_cutoff,),
    ).fetchall()

    for (entity_name,) in rows:
        agg_rows = conn.execute(
            f"SELECT id, ts, ts_start, ts_end, sample_count, agg_stats FROM {table} "
            f"WHERE {entity_col} = ? AND aggregated = 1 AND tier = 'hourly' AND ts < ? ORDER BY ts",
            (entity_name, short_term_cutoff),
        ).fetchall()

        if not agg_rows:
            continue

        # Group by 6-hour block
        six_hour_groups: Dict[int, list] = {}
        ids_to_delete = []
        for row in agg_rows:
            r = dict(row)
            ids_to_delete.append(r["id"])
            six_key = int(r["ts"] // (6 * 3600))
            six_hour_groups.setdefault(six_key, []).append(r)

        for six_key, group in six_hour_groups.items():
            merged = _merge_aggregates_from_rows(group, fields)
            if not merged:
                continue
            conn.execute(
                f"INSERT INTO {table} ({entity_col}, ts, aggregated, tier, ts_start, ts_end, sample_count, agg_stats) "
                "VALUES (?, ?, 1, '6hour', ?, ?, ?, ?)",
                (entity_name, merged["ts"], merged["ts_start"], merged["ts_end"],
                 merged["sample_count"], json.dumps(merged["agg_stats"])),
            )
            total_compressed += len(group)

        # Delete old hourly aggregates
        if ids_to_delete:
            batch_size = 500
            for i in range(0, len(ids_to_delete), batch_size):
                batch = ids_to_delete[i:i + batch_size]
                placeholders = ",".join("?" * len(batch))
                conn.execute(f"DELETE FROM {table} WHERE id IN ({placeholders})", batch)

    conn.commit()
    return total_compressed


def _merge_aggregates_from_rows(agg_rows: List[Dict], fields: tuple) -> Dict:
    """Merge multiple aggregate row dicts into a single coarser aggregate."""
    if not agg_rows:
        return {}

    all_ts = []
    total_count = 0
    parsed_stats = []

    for r in agg_rows:
        all_ts.append(r.get("ts", 0))
        total_count += r.get("sample_count", 1)
        stats_str = r.get("agg_stats", "{}")
        try:
            parsed_stats.append(json.loads(stats_str) if isinstance(stats_str, str) else stats_str or {})
        except (json.JSONDecodeError, TypeError):
            parsed_stats.append({})

    merged_agg_stats = {}
    for field in fields:
        mins, maxes, avgs, p95s = [], [], [], []
        for ps in parsed_stats:
            fdata = ps.get(field, {})
            if isinstance(fdata, dict):
                mins.append(fdata.get("min", 0))
                maxes.append(fdata.get("max", 0))
                avgs.append(fdata.get("avg", 0))
                p95s.append(fdata.get("p95", 0))
        merged_agg_stats[field] = {
            "min": round(min(mins), 2) if mins else 0,
            "max": round(max(maxes), 2) if maxes else 0,
            "avg": round(statistics.mean(avgs), 2) if avgs else 0,
            "p95": round(max(p95s), 2) if p95s else 0,
        }

    return {
        "ts": statistics.mean(all_ts),
        "ts_start": min(r.get("ts_start", r.get("ts", 0)) or r.get("ts", 0) for r in agg_rows),
        "ts_end": max(r.get("ts_end", r.get("ts", 0)) or r.get("ts", 0) for r in agg_rows),
        "sample_count": total_count,
        "agg_stats": merged_agg_stats,
    }


# ---------------------------------------------------------------------------
# Query functions
# ---------------------------------------------------------------------------

def _row_to_sample(row: dict, fields: tuple) -> Dict:
    """Convert a database row to the dict format callers expect.

    Raw samples: {ts, cpu, memory, ...} with scalar values.
    Aggregated samples: {ts, aggregated: True, cpu: {min,max,avg,p95}, ...}
    """
    if row.get("aggregated"):
        result: Dict[str, Any] = {
            "ts": row["ts"],
            "ts_start": row.get("ts_start"),
            "ts_end": row.get("ts_end"),
            "sample_count": row.get("sample_count", 1),
            "aggregated": True,
        }
        if row.get("tier"):
            result["tier"] = row["tier"]
        # Parse agg_stats JSON to reconstruct per-field dicts
        agg_stats_str = row.get("agg_stats", "{}")
        try:
            agg_stats = json.loads(agg_stats_str) if isinstance(agg_stats_str, str) else agg_stats_str or {}
        except (json.JSONDecodeError, TypeError):
            agg_stats = {}
        for field in fields:
            result[field] = agg_stats.get(field, {"min": 0, "max": 0, "avg": 0, "p95": 0})
        return result
    else:
        result = {"ts": row["ts"]}
        for field in fields:
            result[field] = row.get(field, 0)
        return result


def get_node_history(node_name: str, hours: int = 168) -> List[Dict]:
    """Retrieve node metrics history within the given lookback window.

    Returns a list of samples (raw + aggregated) sorted by timestamp,
    newest last. Each sample has ``ts`` and metric fields (either raw
    scalar values or aggregated dicts with min/max/avg/p95).

    Args:
        node_name: Proxmox node name.
        hours: Lookback window in hours (default 168 = 7 days).
    """
    conn = get_connection()
    cutoff = _now_ts() - (hours * 3600)

    rows = conn.execute(
        "SELECT ts, cpu, memory, iowait, load_avg, guest_count, storage_usage_pct, "
        "       aggregated, tier, ts_start, ts_end, sample_count, agg_stats "
        "FROM node_metrics WHERE node_name = ? AND ts >= ? ORDER BY ts",
        (node_name, cutoff),
    ).fetchall()

    return [_row_to_sample(dict(r), NODE_METRIC_FIELDS) for r in rows]


def get_guest_history(vmid: str, hours: int = 168) -> List[Dict]:
    """Retrieve guest metrics history within the given lookback window.

    Returns sorted list of samples (raw + aggregated), newest last.

    Args:
        vmid: Guest VMID as string.
        hours: Lookback window in hours (default 168 = 7 days).
    """
    conn = get_connection()
    cutoff = _now_ts() - (hours * 3600)

    rows = conn.execute(
        "SELECT ts, node, cpu, memory, disk_read_bps, disk_write_bps, net_in_bps, net_out_bps, "
        "       aggregated, tier, ts_start, ts_end, sample_count, agg_stats "
        "FROM guest_metrics WHERE vmid = ? AND ts >= ? ORDER BY ts",
        (str(vmid), cutoff),
    ).fetchall()

    results = []
    for r in rows:
        rd = dict(r)
        sample = _row_to_sample(rd, GUEST_METRIC_FIELDS)
        if not rd.get("aggregated") and rd.get("node"):
            sample["node"] = rd["node"]
        results.append(sample)

    return results


def get_data_quality(node_name: str) -> Dict[str, Any]:
    """Return data quality summary for a node.

    Returns dict with:
      - total_samples: count of raw + aggregated entries
      - oldest_sample_age_hours: age of oldest retained sample
      - coverage_days: approximate days of data available
      - recent_sample_count: raw (uncompressed) samples in the last 48h
    """
    conn = get_connection()

    row = conn.execute(
        "SELECT COUNT(*) as total, MIN(ts) as oldest, "
        "       SUM(CASE WHEN aggregated = 0 THEN 1 ELSE 0 END) as recent_raw "
        "FROM node_metrics WHERE node_name = ?",
        (node_name,),
    ).fetchone()

    if not row or row["total"] == 0:
        return {"total_samples": 0, "oldest_sample_age_hours": 0, "coverage_days": 0, "recent_sample_count": 0}

    now = _now_ts()
    oldest = row["oldest"] or now
    age_hours = (now - oldest) / 3600

    return {
        "total_samples": row["total"],
        "oldest_sample_age_hours": round(age_hours, 1),
        "coverage_days": round(age_hours / 24, 1),
        "recent_sample_count": row["recent_raw"] or 0,
    }


def get_all_node_names() -> List[str]:
    """Return list of all node names that have stored metrics."""
    conn = get_connection()
    rows = conn.execute("SELECT DISTINCT node_name FROM node_metrics").fetchall()
    return [r["node_name"] for r in rows]


def get_metric_value(sample: Dict, field: str) -> float:
    """Extract a usable scalar value from a sample field.

    For raw samples the field is a scalar. For aggregated samples the
    field is a dict with min/max/avg/p95 — this returns ``avg``.
    """
    val = sample.get(field, 0)
    if isinstance(val, dict):
        return val.get("avg", 0)
    return float(val) if val is not None else 0.0
