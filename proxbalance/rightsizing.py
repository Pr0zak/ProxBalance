"""
Right-sizing hints: guests whose allocation doesn't match their use.

Reads only the history ProxBalance already stores (``guest_metrics`` with its
tiered aggregates, ``node_metrics`` for the collector's cadence) and never
calls Proxmox. The rules, evaluated over a 7-day window:

* **Mostly stopped** — running < 30% of the window. A note with no size
  suggestion; it wins for both CPU and memory, because a week of mostly
  missing samples says little about either.
* **Idle CPU** — running > 50% of the window, average CPU < 10% of its
  vCPUs and p95 CPU <= 60% → suggest ``ceil(vcpus * 0.4)`` vCPUs (never
  below 1, never below what its p95 load needs, only when lower than now).
* **Oversized memory** — average memory use < 30% of the allocation →
  suggest p95 use plus 30% headroom, rounded up to 512 MB. VMs are skipped
  unless the guest agent is running: without it Proxmox reports the host's
  view of the VM's memory, which is not what the guest uses.

CPU and memory are evaluated independently, so a guest can get both. A guest
needs at least 3 days of samples; with less, or with none, it gets no hint.

How "running" is measured: the collector only stores a sample for a running
guest, so the share of the window a guest ran is its sample count divided by
the number of collector runs since its first sample. The run count comes from
the node with the most samples in the window (nodes are sampled every run).
"""

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

WINDOW_DAYS = 7
MIN_HISTORY_DAYS = 3

CPU_IDLE_AVG_PCT = 10.0      # average CPU below this share of its vCPUs
CPU_P95_VETO_PCT = 60.0      # ...but not when p95 is above this
CPU_KEEP_RATIO = 0.4         # suggest this share of current vCPUs
CPU_MIN_RUNNING = 0.5        # needs to have run more than half the window

MEM_OVERSIZED_AVG_PCT = 30.0  # average use below this share of the allocation
MEM_HEADROOM = 1.3            # suggestion = p95 use x this
MEM_STEP_MB = 512             # rounded up to this
VM_MEM_FULL_PCT = 95.0        # a VM reading at least this full has no real used figure

STOPPED_MAX_RUNNING = 0.3     # running less than this share is "mostly stopped"

DAY = 86400.0


# ---------------------------------------------------------------------------
# Sample helpers
# ---------------------------------------------------------------------------

def _row_weight(sample: Dict[str, Any]) -> int:
    """Raw samples count once; an aggregate counts as the samples it merged."""
    if sample.get("aggregated"):
        try:
            return max(int(sample.get("sample_count") or 1), 1)
        except (TypeError, ValueError):
            return 1
    return 1


def _row_start(sample: Dict[str, Any]) -> Optional[float]:
    ts = sample.get("ts_start") if sample.get("aggregated") else None
    ts = ts if ts is not None else sample.get("ts")
    return float(ts) if isinstance(ts, (int, float)) else None


def _row_end(sample: Dict[str, Any]) -> Optional[float]:
    ts = sample.get("ts_end") if sample.get("aggregated") else None
    ts = ts if ts is not None else sample.get("ts")
    return float(ts) if isinstance(ts, (int, float)) else None


def _field_points(samples: List[Dict[str, Any]], field: str) -> Tuple[List[Tuple[float, int]], List[Tuple[float, int]]]:
    """Return ``(mean_points, peak_points)`` as (value, weight) pairs.

    A raw sample contributes its value to both. An aggregate contributes its
    average to the mean and its own p95 to the percentile — conservative: the
    window's p95 comes out at or above the true one, so a hint never rests on
    an under-stated peak.
    """
    mean_pts: List[Tuple[float, int]] = []
    peak_pts: List[Tuple[float, int]] = []
    for s in samples:
        v = s.get(field)
        w = _row_weight(s)
        if isinstance(v, dict):
            avg, p95 = v.get("avg"), v.get("p95")
            if isinstance(avg, (int, float)):
                mean_pts.append((float(avg), w))
                peak_pts.append((float(p95) if isinstance(p95, (int, float)) else float(avg), w))
        elif isinstance(v, (int, float)):
            mean_pts.append((float(v), w))
            peak_pts.append((float(v), w))
    return mean_pts, peak_pts


def _weighted_mean(points: List[Tuple[float, int]]) -> Optional[float]:
    total = sum(w for _, w in points)
    if total <= 0:
        return None
    return sum(v * w for v, w in points) / total


def _weighted_percentile(points: List[Tuple[float, int]], pct: float) -> Optional[float]:
    total = sum(w for _, w in points)
    if total <= 0:
        return None
    target = total * pct / 100.0
    acc = 0
    for v, w in sorted(points):
        acc += w
        if acc >= target:
            return v
    return sorted(points)[-1][0]


def _round_up_mb(mb: float) -> int:
    """Round up to the next 512 MB step, never below one step."""
    return max(MEM_STEP_MB, int(math.ceil(mb / MEM_STEP_MB - 1e-9)) * MEM_STEP_MB)


def _is_ignored(guest: Dict[str, Any]) -> bool:
    tags = guest.get("tags") or {}
    if isinstance(tags, dict):
        return bool(tags.get("has_ignore"))
    return False


def _is_vm(guest: Dict[str, Any]) -> bool:
    t = str(guest.get("type") or "").lower()
    return t in ("vm", "qemu")


# ---------------------------------------------------------------------------
# Assessment (pure)
# ---------------------------------------------------------------------------

def assess_guest(
    guest: Dict[str, Any],
    samples: List[Dict[str, Any]],
    now: float,
    runs: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Assess one guest's allocation against its last week of use.

    Args:
        guest: The guest from the cluster cache (``cpu_cores``,
            ``mem_max_gb``, ``type``, ``agent_running``, ``tags`` ...).
        samples: Its ``guest_metrics`` rows in the window (raw and
            aggregated, as :func:`metrics_store.get_guest_history` returns).
        now: Current Unix time.
        runs: The reference node's ``node_metrics`` rows in the window, one
            per collector run (aggregates count as their ``sample_count``).
            When missing, the guest's own sample spacing estimates it.

    Returns:
        ``{status, hints, running_pct, days, stats}`` where ``status`` is
        ``ok`` (assessed; ``hints`` may be empty), ``no_data``,
        ``not_enough_history`` or ``template``.
    """
    result: Dict[str, Any] = {"status": "no_data", "hints": [], "running_pct": None, "days": 0.0, "stats": {}}
    if guest.get("template"):
        result["status"] = "template"
        return result

    window_start = now - WINDOW_DAYS * DAY
    rows = [s for s in samples or [] if (_row_end(s) or 0) >= window_start]
    if not rows:
        return result

    first = min(_row_start(s) or now for s in rows)
    first = max(first, window_start)
    days = (now - first) / DAY
    result["days"] = round(days, 1)
    if days < MIN_HISTORY_DAYS:
        result["status"] = "not_enough_history"
        return result

    have = sum(_row_weight(s) for s in rows)
    expected = _expected_runs(rows, runs, first, now)
    running = min(have / expected, 1.0) if expected > 0 else 1.0
    result["running_pct"] = round(running * 100, 1)
    result["status"] = "ok"

    if running < STOPPED_MAX_RUNNING:
        result["hints"] = [{"kind": "stopped", "running_pct": result["running_pct"], "vcpus_freed": 0, "gb_freed": 0.0}]
        return result

    hints: List[Dict[str, Any]] = []
    cpu_hint, cpu_stats = _cpu_hint(guest, rows, running)
    mem_hint, mem_stats = _memory_hint(guest, rows)
    result["stats"] = {**cpu_stats, **mem_stats}
    if cpu_hint:
        hints.append(cpu_hint)
    if mem_hint:
        hints.append(mem_hint)
    result["hints"] = hints
    return result


def rightsizing_hints(
    guest: Dict[str, Any],
    samples: List[Dict[str, Any]],
    now: float,
    runs: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Return just the hints from :func:`assess_guest` (empty when none apply)."""
    return assess_guest(guest, samples, now, runs)["hints"]


def _expected_runs(rows: List[Dict[str, Any]], runs: Optional[List[Dict[str, Any]]], first: float, now: float) -> float:
    """Collector runs between the guest's first sample and now."""
    if runs:
        n = sum(_row_weight(r) for r in runs if (_row_end(r) or 0) >= first - 1)
        if n > 0:
            return float(n)
    # No reference node: estimate the cadence from the guest's raw samples.
    raw = sorted(float(s["ts"]) for s in rows if not s.get("aggregated") and isinstance(s.get("ts"), (int, float)))
    gaps = sorted(b - a for a, b in zip(raw, raw[1:]) if b > a)
    if not gaps:
        return 0.0
    cadence = gaps[len(gaps) // 2]
    return (now - first) / cadence if cadence > 0 else 0.0


def _cpu_hint(guest: Dict[str, Any], rows: List[Dict[str, Any]], running: float) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
    mean_pts, peak_pts = _field_points(rows, "cpu")
    avg = _weighted_mean(mean_pts)
    p95 = _weighted_percentile(peak_pts, 95)
    stats = {"cpu_avg_pct": _r(avg), "cpu_p95_pct": _r(p95)}
    try:
        vcpus = int(guest.get("cpu_cores") or 0)
    except (TypeError, ValueError):
        vcpus = 0
    if avg is None or p95 is None or vcpus < 1:
        return None, stats
    if running <= CPU_MIN_RUNNING or avg >= CPU_IDLE_AVG_PCT or p95 > CPU_P95_VETO_PCT:
        return None, stats
    # p95 load in cores must still fit the smaller size.
    p95_cores = p95 / 100.0 * vcpus
    suggested = max(1, math.ceil(vcpus * CPU_KEEP_RATIO - 1e-9), math.ceil(p95_cores - 1e-9))
    if suggested >= vcpus:
        return None, stats
    return {
        "kind": "cpu",
        "current": vcpus,
        "suggested": suggested,
        "avg_pct": _r(avg),
        "p95_pct": _r(p95),
        "vcpus_freed": vcpus - suggested,
        "gb_freed": 0.0,
    }, stats


def _memory_hint(guest: Dict[str, Any], rows: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
    mean_pts, peak_pts = _field_points(rows, "memory")
    avg_pct = _weighted_mean(mean_pts)
    p95_pct = _weighted_percentile(peak_pts, 95)
    try:
        max_gb = float(guest.get("mem_max_gb") or 0)
    except (TypeError, ValueError):
        max_gb = 0.0
    stats: Dict[str, Any] = {"mem_avg_pct": _r(avg_pct), "mem_p95_pct": _r(p95_pct)}
    if avg_pct is None or p95_pct is None or max_gb <= 0:
        return None, stats
    if _is_vm(guest):
        # Without the agent Proxmox reports the host's view, not the guest's use.
        if not guest.get("agent_running") or avg_pct >= VM_MEM_FULL_PCT:
            stats["mem_skipped"] = "no_guest_memory_data"
            return None, stats
    if avg_pct >= MEM_OVERSIZED_AVG_PCT:
        return None, stats
    max_mb = round(max_gb * 1024)
    avg_gb = avg_pct / 100.0 * max_gb
    p95_gb = p95_pct / 100.0 * max_gb
    suggested_mb = _round_up_mb(p95_gb * 1024 * MEM_HEADROOM)
    if suggested_mb >= max_mb:
        return None, stats
    return {
        "kind": "memory",
        "current_gb": round(max_mb / 1024, 2),
        "suggested_gb": round(suggested_mb / 1024, 2),
        "suggested_mb": suggested_mb,
        "avg_gb": round(avg_gb, 2),
        "p95_gb": round(p95_gb, 2),
        "avg_pct": _r(avg_pct),
        "vcpus_freed": 0,
        "gb_freed": round((max_mb - suggested_mb) / 1024, 2),
    }, stats


def _r(v: Optional[float]) -> Optional[float]:
    return round(v, 1) if v is not None else None


# ---------------------------------------------------------------------------
# Cluster report
# ---------------------------------------------------------------------------

def _gb_per_vcpu(nodes: Dict[str, Any]) -> float:
    """Host memory per host CPU, so a freed vCPU and freed GB can be ranked together."""
    cpus = sum((n or {}).get("cpu_cores") or 0 for n in (nodes or {}).values())
    mem = sum((n or {}).get("total_mem_gb") or 0 for n in (nodes or {}).values())
    return mem / cpus if cpus > 0 and mem > 0 else 8.0


def build_report(
    guests: Dict[str, Any],
    nodes: Dict[str, Any],
    samples_by_vmid: Dict[str, List[Dict[str, Any]]],
    runs: Optional[List[Dict[str, Any]]],
    now: float,
) -> Dict[str, Any]:
    """Assess every guest and rank those with hints by what they could free.

    Ranking: vCPUs freed plus GB freed expressed in vCPUs at the cluster's
    host memory-per-CPU ratio, so 8 GB on a 31 GB / 4 CPU node ranks about
    like one vCPU. Mostly-stopped guests (nothing to resize) come last.

    Each row carries ``kind`` (``vm`` or ``ct``) and totals are split the
    same way: a container's cores and memory are limits, not reservations,
    so lowering them frees little on the host. Only ``totals.vm`` is real
    capacity.
    """
    ratio = _gb_per_vcpu(nodes)
    rows: List[Dict[str, Any]] = []
    counts = {"assessed": 0, "not_enough_history": 0, "no_data": 0}
    for vmid, g in (guests or {}).items():
        a = assess_guest(g, samples_by_vmid.get(str(vmid), []), now, runs)
        key = "assessed" if a["status"] == "ok" else a["status"]
        if key in counts:
            counts[key] += 1
        if not a["hints"]:
            continue
        vcpus = sum(h.get("vcpus_freed", 0) for h in a["hints"])
        gb = round(sum(h.get("gb_freed", 0.0) for h in a["hints"]), 2)
        rows.append({
            "vmid": int(vmid) if str(vmid).isdigit() else vmid,
            "name": g.get("name") or f"guest-{vmid}",
            "node": g.get("node"),
            "type": g.get("type"),
            "kind": guest_kind(g),
            "ignored": _is_ignored(g),
            "running_pct": a["running_pct"],
            "days": a["days"],
            "hints": a["hints"],
            "vcpus_freed": vcpus,
            "gb_freed": gb,
            "_score": vcpus + gb / ratio,
        })
    rows.sort(key=lambda r: (-r["_score"], r["running_pct"] if r["running_pct"] is not None else 100, str(r["vmid"])))
    for r in rows:
        r.pop("_score", None)
    return {
        "window_days": WINDOW_DAYS,
        "min_history_days": MIN_HISTORY_DAYS,
        "guests": rows,
        "totals": {
            "vm": _kind_totals([r for r in rows if r["kind"] == "vm"]),
            "ct": _kind_totals([r for r in rows if r["kind"] == "ct"]),
            **counts,
        },
    }


def guest_kind(guest: Dict[str, Any]) -> str:
    """``vm`` for QEMU guests, ``ct`` for containers."""
    return "vm" if _is_vm(guest) else "ct"


def _kind_totals(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "vcpus_freed": sum(r["vcpus_freed"] for r in rows),
        "gb_freed": round(sum(r["gb_freed"] for r in rows), 1),
        "guests_with_hints": len(rows),
        "mostly_stopped": sum(1 for r in rows if any(h["kind"] == "stopped" for h in r["hints"])),
    }


# ---------------------------------------------------------------------------
# Database reads
# ---------------------------------------------------------------------------

def load_window(now: Optional[float] = None, vmid: Optional[str] = None) -> Tuple[Dict[str, List[Dict[str, Any]]], List[Dict[str, Any]]]:
    """Read the window's guest samples (all guests, or one) and the reference node's runs.

    Returns:
        ``(samples_by_vmid, runs)``.
    """
    from proxbalance.db import get_connection
    from proxbalance.metrics_store import GUEST_METRIC_FIELDS, NODE_METRIC_FIELDS, _row_to_sample

    now = now if now is not None else datetime.now(timezone.utc).timestamp()
    cutoff = now - WINDOW_DAYS * DAY - 6 * 3600  # aggregates are stamped at their midpoint
    conn = get_connection()

    sql = ("SELECT vmid, ts, cpu, memory, disk_read_bps, disk_write_bps, net_in_bps, net_out_bps, "
           "aggregated, tier, ts_start, ts_end, sample_count, agg_stats FROM guest_metrics WHERE ts >= ?")
    args: List[Any] = [cutoff]
    if vmid is not None:
        sql += " AND vmid = ?"
        args.append(str(vmid))
    by_vmid: Dict[str, List[Dict[str, Any]]] = {}
    for r in conn.execute(sql + " ORDER BY ts", args).fetchall():
        rd = dict(r)
        by_vmid.setdefault(str(rd["vmid"]), []).append(_row_to_sample(rd, GUEST_METRIC_FIELDS))

    best = conn.execute(
        "SELECT node_name, SUM(COALESCE(sample_count, 1)) AS n FROM node_metrics WHERE ts >= ? "
        "GROUP BY node_name ORDER BY n DESC LIMIT 1",
        (cutoff,),
    ).fetchone()
    runs: List[Dict[str, Any]] = []
    if best:
        for r in conn.execute(
            "SELECT ts, cpu, memory, iowait, load_avg, guest_count, storage_usage_pct, aggregated, tier, "
            "ts_start, ts_end, sample_count, agg_stats FROM node_metrics WHERE node_name = ? AND ts >= ? ORDER BY ts",
            (best["node_name"], cutoff),
        ).fetchall():
            runs.append(_row_to_sample(dict(r), NODE_METRIC_FIELDS))
    return by_vmid, runs
