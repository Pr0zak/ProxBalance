"""
ProxBalance Persistent Metrics Store

Provides append-only, tiered-compression time-series storage for node and guest
performance metrics. Data is retained for up to 90 days with automatic
compression of older samples:

  - Recent (0-48 h): full resolution (one sample per collector run)
  - Short-term (2-14 d): hourly aggregates (min / max / avg / p95)
  - Long-term (14-90 d): 6-hour aggregates

All writes are atomic (temp file + rename). The store never discards data
within the retention window — it only compresses granularity.
"""

import json
import os
import statistics
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from proxbalance.constants import (
    NODE_METRICS_FILE,
    GUEST_METRICS_FILE,
    METRICS_RETENTION_DAYS,
    METRICS_RECENT_HOURS,
    METRICS_SHORT_TERM_DAYS,
)

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


def _load_json(path: str) -> Dict:
    """Load JSON file, returning empty structure on any error."""
    try:
        if os.path.exists(path):
            with open(path, "r") as fh:
                return json.load(fh)
    except Exception:
        pass
    return {}


def _save_json(path: str, data: Dict) -> None:
    """Atomic write via temp file + rename."""
    tmp = path + ".tmp"
    try:
        with open(tmp, "w") as fh:
            json.dump(data, fh, separators=(",", ":"))
        os.rename(tmp, path)
    except Exception as exc:
        # Clean up temp file on failure
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise exc


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
    store = _load_json(NODE_METRICS_FILE)
    if "version" not in store:
        store = {"version": 1, "nodes": {}}

    if node_name not in store["nodes"]:
        store["nodes"][node_name] = {"samples": [], "aggregated": []}

    entry = store["nodes"][node_name]
    sample: Dict[str, Any] = {"ts": _now_ts()}
    for field in NODE_METRIC_FIELDS:
        sample[field] = metrics.get(field, 0) or 0
        if isinstance(sample[field], float):
            sample[field] = round(sample[field], 2)

    entry["samples"].append(sample)
    _save_json(NODE_METRICS_FILE, store)


def append_guest_sample(vmid: str, metrics: Dict) -> None:
    """Append a raw guest metrics sample to the persistent store.

    Args:
        vmid: Guest VMID as string.
        metrics: Dict with keys matching GUEST_METRIC_FIELDS plus ``node``.
    """
    store = _load_json(GUEST_METRICS_FILE)
    if "version" not in store:
        store = {"version": 1, "guests": {}}

    vmid_str = str(vmid)
    if vmid_str not in store["guests"]:
        store["guests"][vmid_str] = {"samples": [], "aggregated": []}

    entry = store["guests"][vmid_str]
    sample: Dict[str, Any] = {"ts": _now_ts(), "node": metrics.get("node", "")}
    for field in GUEST_METRIC_FIELDS:
        val = metrics.get(field, 0) or 0
        sample[field] = round(val, 2) if isinstance(val, float) else val

    entry["samples"].append(sample)
    _save_json(GUEST_METRICS_FILE, store)


# ---------------------------------------------------------------------------
# Compression
# ---------------------------------------------------------------------------

def compress_old_samples() -> Dict[str, int]:
    """Run tiered compression on both node and guest stores.

    Returns a summary dict with counts of compressed samples.
    """
    summary = {"nodes_compressed": 0, "guests_compressed": 0}

    # Compress nodes
    summary["nodes_compressed"] = _compress_store(
        NODE_METRICS_FILE, "nodes", NODE_METRIC_FIELDS
    )

    # Compress guests
    summary["guests_compressed"] = _compress_store(
        GUEST_METRICS_FILE, "guests", GUEST_METRIC_FIELDS
    )

    return summary


def _compress_store(file_path: str, collection_key: str, fields: tuple) -> int:
    """Compress a single metrics store file.

    Tiers:
      - Samples older than METRICS_RECENT_HOURS → compress to hourly aggregates
      - Aggregates older than METRICS_SHORT_TERM_DAYS → compress to 6-hour aggregates
      - Anything older than METRICS_RETENTION_DAYS → drop

    Returns count of compressed samples.
    """
    store = _load_json(file_path)
    if not store or collection_key not in store:
        return 0

    now = _now_ts()
    recent_cutoff = now - (METRICS_RECENT_HOURS * 3600)
    short_term_cutoff = now - (METRICS_SHORT_TERM_DAYS * 86400)
    retention_cutoff = now - (METRICS_RETENTION_DAYS * 86400)
    total_compressed = 0

    for entity_name, entity_data in store[collection_key].items():
        raw_samples = entity_data.get("samples", [])
        aggregated = entity_data.get("aggregated", [])

        # --- Step 1: Move old raw samples into hourly aggregates ---
        keep_raw = []
        to_aggregate: Dict[int, List[Dict]] = {}

        for sample in raw_samples:
            ts = sample.get("ts", 0)
            if ts < retention_cutoff:
                continue  # Drop beyond retention
            if ts < recent_cutoff:
                # Group by hour
                hour_key = int(ts // 3600)
                to_aggregate.setdefault(hour_key, []).append(sample)
            else:
                keep_raw.append(sample)

        for hour_key, group in to_aggregate.items():
            agg = _aggregate_samples(group, fields)
            if agg:
                agg["tier"] = "hourly"
                aggregated.append(agg)
                total_compressed += len(group)

        # --- Step 2: Compress old hourly aggregates into 6-hour blocks ---
        keep_agg = []
        to_six_hour: Dict[int, List[Dict]] = {}

        for agg_sample in aggregated:
            ts = agg_sample.get("ts", agg_sample.get("ts_start", 0))
            if ts < retention_cutoff:
                continue  # Drop beyond retention
            if ts < short_term_cutoff and agg_sample.get("tier") == "hourly":
                six_hour_key = int(ts // (6 * 3600))
                to_six_hour.setdefault(six_hour_key, []).append(agg_sample)
            else:
                keep_agg.append(agg_sample)

        for six_key, group in to_six_hour.items():
            merged = _merge_aggregates(group, fields)
            if merged:
                merged["tier"] = "6hour"
                keep_agg.append(merged)
                total_compressed += len(group)

        # Update entity data
        entity_data["samples"] = keep_raw
        entity_data["aggregated"] = keep_agg

    _save_json(file_path, store)
    return total_compressed


def _merge_aggregates(agg_list: List[Dict], fields: tuple) -> Dict:
    """Merge multiple aggregated samples into one coarser aggregate."""
    if not agg_list:
        return {}

    all_ts = []
    total_count = 0
    for a in agg_list:
        all_ts.append(a.get("ts", 0))
        total_count += a.get("sample_count", 1)

    result: Dict[str, Any] = {
        "ts": statistics.mean(all_ts),
        "ts_start": min(a.get("ts_start", a.get("ts", 0)) for a in agg_list),
        "ts_end": max(a.get("ts_end", a.get("ts", 0)) for a in agg_list),
        "sample_count": total_count,
        "aggregated": True,
    }

    for field in fields:
        mins, maxes, avgs, p95s = [], [], [], []
        for a in agg_list:
            fdata = a.get(field, {})
            if isinstance(fdata, dict):
                mins.append(fdata.get("min", 0))
                maxes.append(fdata.get("max", 0))
                avgs.append(fdata.get("avg", 0))
                p95s.append(fdata.get("p95", 0))

        result[field] = {
            "min": round(min(mins), 2) if mins else 0,
            "max": round(max(maxes), 2) if maxes else 0,
            "avg": round(statistics.mean(avgs), 2) if avgs else 0,
            "p95": round(max(p95s), 2) if p95s else 0,
        }

    return result


# ---------------------------------------------------------------------------
# Query functions
# ---------------------------------------------------------------------------

def get_node_history(node_name: str, hours: int = 168) -> List[Dict]:
    """Retrieve node metrics history within the given lookback window.

    Returns a list of samples (raw + aggregated) sorted by timestamp,
    newest last. Each sample has ``ts`` and metric fields (either raw
    scalar values or aggregated dicts with min/max/avg/p95).

    Args:
        node_name: Proxmox node name.
        hours: Lookback window in hours (default 168 = 7 days).
    """
    store = _load_json(NODE_METRICS_FILE)
    if not store or "nodes" not in store:
        return []

    entity = store.get("nodes", {}).get(node_name, {})
    cutoff = _now_ts() - (hours * 3600)

    results = []
    for sample in entity.get("samples", []):
        if sample.get("ts", 0) >= cutoff:
            results.append(sample)

    for agg in entity.get("aggregated", []):
        ts = agg.get("ts", agg.get("ts_start", 0))
        if ts >= cutoff:
            results.append(agg)

    results.sort(key=lambda s: s.get("ts", 0))
    return results


def get_guest_history(vmid: str, hours: int = 168) -> List[Dict]:
    """Retrieve guest metrics history within the given lookback window.

    Returns sorted list of samples (raw + aggregated), newest last.

    Args:
        vmid: Guest VMID as string.
        hours: Lookback window in hours (default 168 = 7 days).
    """
    store = _load_json(GUEST_METRICS_FILE)
    if not store or "guests" not in store:
        return []

    entity = store.get("guests", {}).get(str(vmid), {})
    cutoff = _now_ts() - (hours * 3600)

    results = []
    for sample in entity.get("samples", []):
        if sample.get("ts", 0) >= cutoff:
            results.append(sample)

    for agg in entity.get("aggregated", []):
        ts = agg.get("ts", agg.get("ts_start", 0))
        if ts >= cutoff:
            results.append(agg)

    results.sort(key=lambda s: s.get("ts", 0))
    return results


def get_data_quality(node_name: str) -> Dict[str, Any]:
    """Return data quality summary for a node.

    Returns dict with:
      - total_samples: count of raw + aggregated entries
      - oldest_sample_age_hours: age of oldest retained sample
      - coverage_days: approximate days of data available
      - recent_sample_count: raw (uncompressed) samples in the last 48h
    """
    store = _load_json(NODE_METRICS_FILE)
    if not store or "nodes" not in store:
        return {"total_samples": 0, "oldest_sample_age_hours": 0, "coverage_days": 0, "recent_sample_count": 0}

    entity = store.get("nodes", {}).get(node_name, {})
    raw = entity.get("samples", [])
    agg = entity.get("aggregated", [])

    all_ts = [s.get("ts", 0) for s in raw] + [a.get("ts", 0) for a in agg]
    if not all_ts:
        return {"total_samples": 0, "oldest_sample_age_hours": 0, "coverage_days": 0, "recent_sample_count": 0}

    now = _now_ts()
    oldest = min(all_ts)
    age_hours = (now - oldest) / 3600

    return {
        "total_samples": len(raw) + len(agg),
        "oldest_sample_age_hours": round(age_hours, 1),
        "coverage_days": round(age_hours / 24, 1),
        "recent_sample_count": len(raw),
    }


def get_all_node_names() -> List[str]:
    """Return list of all node names that have stored metrics."""
    store = _load_json(NODE_METRICS_FILE)
    if not store or "nodes" not in store:
        return []
    return list(store.get("nodes", {}).keys())


def get_metric_value(sample: Dict, field: str) -> float:
    """Extract a usable scalar value from a sample field.

    For raw samples the field is a scalar. For aggregated samples the
    field is a dict with min/max/avg/p95 — this returns ``avg``.
    """
    val = sample.get(field, 0)
    if isinstance(val, dict):
        return val.get("avg", 0)
    return float(val) if val is not None else 0.0
