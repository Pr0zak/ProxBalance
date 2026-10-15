"""Per-guest backup results read from Proxmox vzdump task logs.

``/cluster/backup-info/not-backed-up`` only says whether a backup job
covers a guest, not whether a backup ran or worked. Listing the backup
files on a storage needs ``Datastore.AllocateSpace`` and ``VM.Backup``,
which a read-only (PVEAuditor) token does not have, so the storage
content API returns an empty list. The vzdump task logs need only
``Sys.Audit`` and record every guest's start, finish and failure, so
ProxBalance reads those instead.

Log lines used (``PVE/VZDump.pm``)::

    INFO: starting new backup job: vzdump ... --storage PBS9000 ...
    INFO: Starting Backup of VM 100 (lxc)
    INFO: Backup started at 2026-10-15 01:00:07        (node local time)
    ERROR: Backup of VM 103 failed - <reason>
    INFO: Finished Backup of VM 100 (00:00:26)

The local times carry no zone, so each guest's time is placed relative to
the task's ``starttime`` (epoch): first "Backup started at" in the log is
taken as the task start, and later ones are offsets from it.
"""

import re
from datetime import datetime
from typing import Dict, Iterable, List, Optional

_JOB_RE = re.compile(r"starting new backup job: vzdump\b(.*)$")
_STORAGE_RE = re.compile(r"--storage\s+(\S+)")
_START_RE = re.compile(r"Starting Backup of VM (\d+) \((\w+)\)")
_STARTED_AT_RE = re.compile(r"Backup started at (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)")
_FAILED_RE = re.compile(r"ERROR: Backup of VM (\d+) failed - (.*)$")
_FINISHED_RE = re.compile(r"Finished Backup of VM (\d+) \((\d+):(\d\d):(\d\d)\)")

# How far back the collector reads vzdump tasks, and how many per node.
BACKUP_LOOKBACK_DAYS = 14
BACKUP_TASKS_PER_NODE = 30
# Task logs are paged (default 50 lines); one job log is ~20 lines per guest.
BACKUP_LOG_MAX_LINES = 50000

# Longest error text kept per guest; vzdump errors can carry whole command lines.
MAX_ERROR_LEN = 300


def _parse_local(text: str) -> Optional[datetime]:
    try:
        return datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def parse_vzdump_log(lines: Iterable[str], task_start: int, node: str = "") -> List[Dict]:
    """Return one result per guest found in a vzdump task log.

    Args:
        lines: log text lines, oldest first.
        task_start: the task's ``starttime`` (epoch seconds).
        node: the node the task ran on.

    Returns:
        ``[{vmid, ok, time, duration_s, error, storage, node}]``; ``time`` is
        the epoch the guest's backup started, ``ok`` is None when the log ends
        before the guest finished (the task is still running).
    """
    storage = None
    anchor = None
    results: List[Dict] = []
    current: Optional[Dict] = None

    for raw in lines:
        line = raw.rstrip("\n")
        m = _JOB_RE.search(line)
        if m:
            s = _STORAGE_RE.search(m.group(1))
            storage = s.group(1) if s else None
            continue
        m = _START_RE.search(line)
        if m:
            current = {"vmid": m.group(1), "ok": None, "time": int(task_start),
                       "duration_s": None, "error": None, "storage": storage, "node": node}
            results.append(current)
            continue
        if current is None:
            continue
        m = _STARTED_AT_RE.search(line)
        if m:
            local = _parse_local(m.group(1))
            if local is not None:
                if anchor is None:
                    anchor = local
                current["time"] = int(task_start + (local - anchor).total_seconds())
            continue
        m = _FAILED_RE.search(line)
        if m and m.group(1) == current["vmid"]:
            current["ok"] = False
            current["error"] = m.group(2).strip()[:MAX_ERROR_LEN]
            continue
        m = _FINISHED_RE.search(line)
        if m and m.group(1) == current["vmid"]:
            h, mi, s = int(m.group(2)), int(m.group(3)), int(m.group(4))
            if current["ok"] is None:
                current["ok"] = True
            current["duration_s"] = h * 3600 + mi * 60 + s
    return results


def summarize_backup_results(results: Iterable[Dict]) -> Dict[str, Dict]:
    """Fold per-run results into one summary per guest (keyed by vmid string).

    Each summary: ``last_ok`` / ``last_ok_storage`` / ``last_ok_duration_s``
    for the newest good backup, ``last_attempt`` / ``last_attempt_ok`` /
    ``last_error`` for the newest attempt that ended, and ``ok_count`` /
    ``fail_count`` over the logs read. Unfinished attempts are ignored.
    """
    out: Dict[str, Dict] = {}
    for r in sorted((r for r in results if r.get("ok") is not None), key=lambda r: r["time"]):
        s = out.setdefault(r["vmid"], {
            "last_ok": None, "last_ok_storage": None, "last_ok_duration_s": None,
            "last_attempt": None, "last_attempt_ok": None, "last_error": None,
            "last_node": None, "ok_count": 0, "fail_count": 0,
        })
        s["last_attempt"] = r["time"]
        s["last_attempt_ok"] = r["ok"]
        s["last_node"] = r.get("node") or None
        if r["ok"]:
            s["ok_count"] += 1
            s["last_ok"] = r["time"]
            s["last_ok_storage"] = r.get("storage")
            s["last_ok_duration_s"] = r.get("duration_s")
            s["last_error"] = None
        else:
            s["fail_count"] += 1
            s["last_error"] = r.get("error")
    return out
