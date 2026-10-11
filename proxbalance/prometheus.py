"""
Prometheus text exposition for ProxBalance.

``format_metrics()`` is a pure function: it takes a snapshot dict (built by
``build_snapshot()`` from the cluster cache, config and SQLite state) and
returns the body for ``GET /api/metrics`` in the Prometheus text exposition
format, version 0.0.4.

Rules followed throughout:

* Nothing here calls the Proxmox API. Every value comes from data ProxBalance
  already has on disk, so a scrape costs a few dictionary lookups.
* A value that is unknown is left out. A missing sample is never written as 0,
  because 0 is a real reading (an idle CPU, no pending recommendations).
* Label values are escaped as the format requires (backslash, double quote,
  newline).
"""

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

PREFIX = "proxbalance_"
CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"

# Bytes per GiB. The collector reports guest memory in GiB (1024-based).
_GIB = 1024 ** 3


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def escape_label_value(value: Any) -> str:
    """Escape a label value for the text exposition format.

    Args:
        value: Any value; it is converted to ``str`` first.

    Returns:
        The value with ``\\``, ``"`` and newlines escaped.
    """
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
    )


def _escape_help(text: str) -> str:
    """Escape HELP text (backslash and newline only, per the format)."""
    return text.replace("\\", "\\\\").replace("\n", "\\n")


def _number(value: Any) -> Optional[float]:
    """Return ``value`` as a finite float, or None when it is not a usable number.

    Booleans are accepted (True -> 1.0). Strings, None, NaN and infinities are
    rejected so that unknown values are omitted instead of reported.
    """
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        f = float(value)
        return f if math.isfinite(f) else None
    return None


def _format_value(value: float) -> str:
    """Render a sample value; whole numbers are written without a decimal point."""
    if value == int(value) and abs(value) < 1e15:
        return str(int(value))
    return repr(value)


def parse_timestamp(value: Any) -> Optional[float]:
    """Parse an ISO-8601 timestamp (``Z`` or offset, naive treated as UTC).

    Args:
        value: The timestamp string.

    Returns:
        Unix seconds, or None when the value is missing or unparseable.
    """
    if not isinstance(value, str) or not value:
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


class _Family:
    """One metric family: a name, HELP, TYPE and its samples."""

    def __init__(self, name: str, help_text: str, metric_type: str = "gauge"):
        self.name = PREFIX + name
        self.help_text = help_text
        self.metric_type = metric_type
        self.samples: List[Tuple[Dict[str, Any], float]] = []

    def add(self, value: Any, **labels: Any) -> None:
        """Add a sample; silently skipped when ``value`` is not a usable number."""
        num = _number(value)
        if num is None:
            return
        self.samples.append((labels, num))

    def render(self) -> List[str]:
        """Render the family; a family with no samples renders nothing."""
        if not self.samples:
            return []
        lines = [
            f"# HELP {self.name} {_escape_help(self.help_text)}",
            f"# TYPE {self.name} {self.metric_type}",
        ]
        for labels, value in self.samples:
            if labels:
                body = ",".join(
                    f'{key}="{escape_label_value(val)}"'
                    for key, val in labels.items()
                    if val is not None
                )
                lines.append(f"{self.name}{{{body}}} {_format_value(value)}")
            else:
                lines.append(f"{self.name} {_format_value(value)}")
        return lines


# ---------------------------------------------------------------------------
# Formatter (pure)
# ---------------------------------------------------------------------------

def format_metrics(snapshot: Dict[str, Any], now: Optional[float] = None) -> str:
    """Render a snapshot as Prometheus text exposition format.

    Args:
        snapshot: Dict with any of these keys (all optional):
            ``cache`` (the cluster_cache.json dict, or None),
            ``maintenance_nodes`` (list of node names, or None when unknown),
            ``node_scores`` ({node: penalty score}, lower is healthier),
            ``automation`` ({enabled, dry_run}),
            ``last_run`` (latest automation run summary dict),
            ``migration_counts`` (list of {status, dry_run, count}),
            ``recommendations_pending`` (int),
            ``version`` (str).
        now: Current Unix time; defaults to ``time.time()``. Passed in by tests.

    Returns:
        The exposition body, ending with a newline.
    """
    if now is None:
        now = datetime.now(timezone.utc).timestamp()

    cache = snapshot.get("cache")
    if not isinstance(cache, dict):
        cache = None

    up = _Family("up", "1 when the cluster cache was read, 0 when it is missing or unreadable.")
    up.add(1 if cache is not None else 0)

    families: List[_Family] = [up]

    version = snapshot.get("version")
    build = _Family("build_info", "ProxBalance build information; the value is always 1.")
    if version:
        build.add(1, version=version)
    families.append(build)

    families.extend(_collection_families(cache, now))
    families.extend(_node_families(cache, snapshot))
    families.extend(_guest_families(cache))
    families.extend(_automation_families(snapshot))

    lines: List[str] = []
    for fam in families:
        lines.extend(fam.render())
    return "\n".join(lines) + "\n"


def _collection_families(cache: Optional[Dict[str, Any]], now: float) -> List[_Family]:
    """Collection freshness metrics."""
    last = _Family("collection_last_success_timestamp_seconds",
                   "Unix time of the last successful data collection (collected_at in the cache).")
    age = _Family("collection_age_seconds",
                  "Seconds since the last successful data collection.")
    if cache is not None:
        ts = parse_timestamp(cache.get("collected_at"))
        if ts is not None:
            last.add(ts)
            age.add(max(0.0, now - ts))
    return [last, age]


def _node_families(cache: Optional[Dict[str, Any]], snapshot: Dict[str, Any]) -> List[_Family]:
    """Per-node metrics, labelled ``node``."""
    cpu = _Family("node_cpu_percent", "Node CPU usage at collection time, percent.")
    cpu_recent = _Family("node_cpu_recent_percent",
                         "Node CPU usage averaged over the last 15 minutes, percent (what scoring uses).")
    mem = _Family("node_memory_percent", "Node memory usage, percent.")
    iowait = _Family("node_iowait_percent", "Node IO wait at collection time, percent.")
    score = _Family("node_score",
                    "Node health penalty score as on the dashboard (0 is healthiest; higher is worse).")
    suit = _Family("node_suitability_percent",
                   "Node suitability as shown on the dashboard: 100 minus the score, clamped to 0-100.")
    running = _Family("node_guests_running", "Running guests on the node.")
    anchored = _Family("node_anchored_cpu_percent",
                       "Node CPU taken by guests that cannot move (passthrough, pinned, ignored), percent.")
    online = _Family("node_online", "1 when the node is online, 0 otherwise.")
    maint = _Family("node_maintenance", "1 when the node is in ProxBalance maintenance mode.")
    families = [cpu, cpu_recent, mem, iowait, score, suit, running, anchored, online, maint]

    if cache is None:
        return families
    nodes = cache.get("nodes")
    if not isinstance(nodes, dict):
        return families

    guests = cache.get("guests") if isinstance(cache.get("guests"), dict) else {}
    running_counts: Dict[str, int] = {}
    for guest in guests.values():
        if isinstance(guest, dict) and guest.get("status") == "running" and guest.get("node"):
            running_counts[guest["node"]] = running_counts.get(guest["node"], 0) + 1

    maintenance = snapshot.get("maintenance_nodes")
    maintenance_set = set(maintenance) if isinstance(maintenance, (list, tuple, set)) else None
    scores = snapshot.get("node_scores") or {}

    for name in sorted(nodes):
        node = nodes[name]
        if not isinstance(node, dict):
            continue
        status = node.get("status")
        if status is not None:
            online.add(1 if status == "online" else 0, node=name)
        if maintenance_set is not None:
            maint.add(1 if name in maintenance_set else 0, node=name)
        if status != "online":
            # Values kept for an offline node are from before it went away.
            continue

        metrics = node.get("metrics") if isinstance(node.get("metrics"), dict) else {}
        cpu.add(metrics.get("current_cpu", node.get("cpu_percent")), node=name)
        cpu_recent.add(metrics.get("recent_cpu"), node=name)
        mem.add(metrics.get("current_mem", node.get("mem_percent")), node=name)
        iowait.add(metrics.get("current_iowait"), node=name)
        anchored.add(node.get("anchored_cpu"), node=name)
        running.add(running_counts.get(name, 0), node=name)

        node_score = _number(scores.get(name))
        if node_score is not None:
            score.add(round(node_score, 2), node=name)
            suit.add(round(max(0.0, 100.0 - min(node_score, 100.0)), 1), node=name)

    return families


def _guest_families(cache: Optional[Dict[str, Any]]) -> List[_Family]:
    """Per-guest metrics for running guests only (keeps cardinality bounded)."""
    cpu = _Family("guest_cpu_percent", "Guest CPU usage at collection time, percent of its cores.")
    mem = _Family("guest_memory_bytes", "Guest memory in use, bytes.")
    info = _Family("guest_node_info", "Where each running guest lives; the value is always 1.")
    families = [cpu, mem, info]

    if cache is None or not isinstance(cache.get("guests"), dict):
        return families

    def _key(item: Tuple[str, Any]) -> Tuple[int, str]:
        vmid = str(item[0])
        return (int(vmid), vmid) if vmid.isdigit() else (1 << 62, vmid)

    for key, guest in sorted(cache["guests"].items(), key=_key):
        if not isinstance(guest, dict) or guest.get("status") != "running":
            continue
        vmid = str(guest.get("vmid", key))
        cpu.add(guest.get("cpu_current"), vmid=vmid)
        used_gb = _number(guest.get("mem_used_gb"))
        if used_gb is not None:
            mem.add(round(used_gb * _GIB), vmid=vmid)
        info.add(1, vmid=vmid, name=guest.get("name", ""), node=guest.get("node", ""),
                 type=guest.get("type", ""))
    return families


def _automation_families(snapshot: Dict[str, Any]) -> List[_Family]:
    """Automation, migration history and recommendation metrics."""
    enabled = _Family("automation_enabled", "1 when automated migrations are enabled.")
    dry_run = _Family("automation_dry_run", "1 when automated migrations run in dry-run mode.")
    last_ts = _Family("automation_last_run_timestamp_seconds", "Unix time of the last automation run.")
    last_status = _Family("automation_last_run_status",
                          "Status of the last automation run, as a label; the value is always 1.")
    migrations = _Family("migrations_total",
                         "Migrations recorded in ProxBalance's migration history, by result.",
                         "counter")
    pending = _Family("recommendations_pending", "Migration recommendations currently pending.")

    automation = snapshot.get("automation")
    if isinstance(automation, dict):
        enabled.add(automation.get("enabled"))
        dry_run.add(automation.get("dry_run"))

    last_run = snapshot.get("last_run")
    if isinstance(last_run, dict):
        last_ts.add(parse_timestamp(last_run.get("timestamp")))
        if last_run.get("status"):
            last_status.add(1, status=last_run["status"])

    counts = snapshot.get("migration_counts")
    if isinstance(counts, list):
        for row in counts:
            if not isinstance(row, dict):
                continue
            migrations.add(row.get("count"), result=row.get("status") or "unknown",
                           dry_run="true" if row.get("dry_run") else "false")

    pending.add(snapshot.get("recommendations_pending"))

    return [enabled, dry_run, last_ts, last_status, migrations, pending]


def unavailable_body(reason: str = "") -> str:
    """Minimal body returned when the snapshot itself could not be built.

    Args:
        reason: Optional short reason, written as a comment line.

    Returns:
        A valid exposition body with ``proxbalance_up 0``.
    """
    lines = []
    if reason:
        lines.append("# " + reason.replace("\n", " ")[:200])
    lines.append(f"# HELP {PREFIX}up 1 when the cluster cache was read, 0 when it is missing or unreadable.")
    lines.append(f"# TYPE {PREFIX}up gauge")
    lines.append(f"{PREFIX}up 0")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Snapshot builder (does the I/O; each source fails on its own)
# ---------------------------------------------------------------------------

def build_snapshot(cache: Optional[Dict[str, Any]], config: Optional[Dict[str, Any]],
                   version: Optional[str] = None,
                   recommendations_file: Optional[str] = None) -> Dict[str, Any]:
    """Gather everything ``format_metrics()`` needs, without calling Proxmox.

    Each source is read independently; a failure leaves that part of the
    snapshot out (and so its samples are omitted) instead of failing the scrape.

    Args:
        cache: The cluster cache dict, or None.
        config: The loaded config.json dict, or None / an error dict.
        version: Version string for build_info.
        recommendations_file: Path to recommendations_cache.json.

    Returns:
        The snapshot dict.
    """
    import json
    import os
    import sys

    snapshot: Dict[str, Any] = {"cache": cache, "version": version}

    if isinstance(config, dict) and not config.get("error"):
        auto = config.get("automated_migrations") or {}
        snapshot["automation"] = {
            "enabled": bool(auto.get("enabled", False)),
            "dry_run": bool(auto.get("dry_run", True)),
        }
        maint = auto.get("maintenance_nodes", [])
        snapshot["maintenance_nodes"] = list(maint) if isinstance(maint, list) else []

        if cache and isinstance(cache.get("nodes"), dict):
            try:
                from proxbalance.config_manager import load_penalty_config
                from proxbalance.scoring import calculate_node_health_score
                penalty_cfg = load_penalty_config()
                scores = {}
                for name, node in cache["nodes"].items():
                    if isinstance(node, dict) and node.get("status") == "online":
                        scores[name] = calculate_node_health_score(
                            node, node.get("metrics", {}) or {}, penalty_config=penalty_cfg)
                snapshot["node_scores"] = scores
            except Exception as e:  # scoring must never break the scrape
                print(f"metrics: node scores unavailable: {e}", file=sys.stderr)

    try:
        from proxbalance import migration_db
        runs = migration_db.get_run_history(limit=1)
        if runs:
            snapshot["last_run"] = runs[0]
    except Exception as e:
        print(f"metrics: run history unavailable: {e}", file=sys.stderr)

    try:
        from proxbalance.db import get_connection
        rows = get_connection().execute(
            "SELECT status, dry_run, COUNT(*) AS n FROM migration_history "
            "GROUP BY status, dry_run"
        ).fetchall()
        snapshot["migration_counts"] = [
            {"status": r["status"], "dry_run": bool(r["dry_run"]), "count": r["n"]} for r in rows
        ]
    except Exception as e:
        print(f"metrics: migration history unavailable: {e}", file=sys.stderr)

    if recommendations_file:
        try:
            if os.path.exists(recommendations_file):
                with open(recommendations_file, "r") as f:
                    recs = json.load(f)
                count = recs.get("count")
                if count is None and isinstance(recs.get("recommendations"), list):
                    count = len(recs["recommendations"])
                snapshot["recommendations_pending"] = count
        except Exception as e:
            print(f"metrics: recommendations cache unavailable: {e}", file=sys.stderr)

    return snapshot

