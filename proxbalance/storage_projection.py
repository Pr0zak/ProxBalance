"""
Target storage projection for a planned migration.

When Proxmox migrates a guest whose disks sit on node-local storage
(local-lvm, a ZFS pool, a directory), it copies every such disk onto the
storage with the same id on the target node. ProxBalance passes no
``targetstorage`` mapping, so the landing storage is always the same id.
Shared storage (NFS, CIFS, PBS, Ceph, shared LVM/iSCSI ...) is not copied
and so never changes.

This module answers "how full will the target's local storage be after this
move, counting the other moves planned into the same node?". Everything is
pure (no I/O): the collector supplies each guest's ``disks`` (storage id and
provisioned size, parsed by :func:`parse_guest_disks`) and each node's
``storage`` list (usage plus the ``shared`` flag), and the recommendation
engine, the migration-options route and automigrate.py all call
:func:`project_target_storage`.

Sizes are the provisioned disk sizes (``size=`` in the guest config), which
is the worst case for thin storage: a thin volume can land smaller than its
provisioned size, never larger.

Missing data stays missing: a storage without usage numbers, an inactive
storage, or a disk with no known size produces no entry, never a 0.
"""

import re
from typing import Any, Dict, Iterable, List, Mapping, Optional

# Levels, from the projected usage after the move.
LEVEL_OK = "ok"
LEVEL_WARNING = "warning"      # > WARNING_PCT
LEVEL_CRITICAL = "critical"    # > CRITICAL_PCT
LEVEL_WONT_FIT = "wont_fit"    # > 100%, or more data than the free space

WARNING_PCT = 80.0
CRITICAL_PCT = 90.0
FULL_PCT = 100.0

_LEVEL_RANK = {LEVEL_OK: 0, LEVEL_WARNING: 1, LEVEL_CRITICAL: 2, LEVEL_WONT_FIT: 3}

# Machine-readable code automigrate stores on decisions skipped because the
# target storage cannot hold the guest's disks.
SKIP_CODE = "target_storage_full"

# Storage types that are shared by nature. Used only when a cached storage
# entry predates the collector's `shared` flag; the flag wins when present.
# ("zfs" is ZFS over iSCSI; the local ZFS type is "zfspool".)
SHARED_STORAGE_TYPES = frozenset({
    "nfs", "cifs", "pbs", "rbd", "cephfs", "glusterfs",
    "iscsi", "iscsidirect", "zfs",
})

# Config keys that reference a guest volume that migrates with the guest.
_DISK_KEY_RE = re.compile(r"^(?:scsi|ide|sata|virtio|efidisk|tpmstate|unused|mp)\d+$|^rootfs$")
_SIZE_RE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*([KMGT]?)B?\s*$", re.IGNORECASE)
_UNIT_TO_GB = {"": 1.0 / 1024 ** 3, "K": 1.0 / 1024 ** 2, "M": 1.0 / 1024, "G": 1.0, "T": 1024.0}


def parse_size_gb(value: Any) -> Optional[float]:
    """Parse a Proxmox disk size (``32G``, ``512M``, ``528K``, ``2T``) into GiB.

    Args:
        value: The ``size=`` option value. A bare number is bytes.

    Returns:
        Size in GiB, or None when the value can't be parsed.
    """
    if value is None:
        return None
    m = _SIZE_RE.match(str(value))
    if not m:
        return None
    return float(m.group(1)) * _UNIT_TO_GB[m.group(2).upper()]


def parse_guest_disks(config: Mapping[str, Any]) -> List[Dict[str, Any]]:
    """List the storage-backed volumes in a VM/CT config.

    Skips bind mounts and passthrough devices (absolute paths), CD-ROM
    drives, and ``none`` entries. A volume with no ``size=`` option (unused
    disks usually have none) is listed with ``size_gb: None``.

    Args:
        config: The guest config as returned by the Proxmox API.

    Returns:
        A list of ``{key, storage, volume, size_gb}`` dicts.
    """
    disks: List[Dict[str, Any]] = []
    for key, raw in (config or {}).items():
        if not isinstance(raw, str) or not _DISK_KEY_RE.match(str(key)):
            continue
        parts = raw.split(",")
        source = parts[0].strip()
        if not source or source == "none" or source.startswith("/") or ":" not in source:
            continue
        opts: Dict[str, str] = {}
        for p in parts[1:]:
            if "=" in p:
                k, v = p.split("=", 1)
                opts[k.strip()] = v.strip()
        if opts.get("media") == "cdrom":
            continue
        storage, volume = source.split(":", 1)
        size = parse_size_gb(opts.get("size"))
        disks.append({
            "key": key,
            "storage": storage,
            "volume": volume,
            "size_gb": round(size, 3) if size is not None else None,
        })
    return disks


def is_shared_storage(entry: Mapping[str, Any]) -> bool:
    """Whether a node storage entry is shared across nodes.

    Uses the collector's ``shared`` flag; falls back to the storage type for
    caches written before the flag existed.
    """
    if "shared" in entry and entry.get("shared") is not None:
        return bool(entry.get("shared"))
    return str(entry.get("type", "")).lower() in SHARED_STORAGE_TYPES


def _num(v: Any) -> Optional[float]:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    return float(v)


def _local_sizes_by_storage(guest: Mapping[str, Any]) -> Dict[str, float]:
    """Sum of known disk sizes per storage id for one guest."""
    sizes: Dict[str, float] = {}
    for d in guest.get("disks") or []:
        if not isinstance(d, Mapping):
            continue
        sid = d.get("storage")
        size = _num(d.get("size_gb"))
        if not sid or size is None or size <= 0:
            continue
        sizes[sid] = sizes.get(sid, 0.0) + size
    return sizes


def level_for(used_after_pct: float, needed_gb: float, avail_gb: Optional[float]) -> str:
    """Classify a projected usage.

    Args:
        used_after_pct: Projected usage after the move, in percent.
        needed_gb: Data this move (plus earlier planned moves) adds.
        avail_gb: Free space Proxmox reports now, if known.

    Returns:
        One of LEVEL_OK, LEVEL_WARNING, LEVEL_CRITICAL, LEVEL_WONT_FIT.
    """
    if used_after_pct > FULL_PCT or (avail_gb is not None and needed_gb > avail_gb):
        return LEVEL_WONT_FIT
    if used_after_pct > CRITICAL_PCT:
        return LEVEL_CRITICAL
    if used_after_pct > WARNING_PCT:
        return LEVEL_WARNING
    return LEVEL_OK


def project_target_storage(
    guest: Mapping[str, Any],
    target_node: str,
    nodes: Mapping[str, Any],
    pending: Iterable[Mapping[str, Any]] = (),
) -> List[Dict[str, Any]]:
    """Project the target node's local storage usage after moving ``guest``.

    Args:
        guest: The guest's collector record (needs ``disks``; ``node`` and
            ``vmid`` are used to ignore no-op and self entries).
        target_node: Node the guest would move to.
        nodes: Collector node records (each with a ``storage`` list).
        pending: Guests already planned to move onto ``target_node`` earlier
            in the same plan; their disks on the same storage count first.

    Returns:
        One entry per target storage that would receive data, ordered by
        level (worst first): ``{storage, node, size_gb, pending_gb, total_gb,
        used_before_pct, used_after_pct, level}``. ``used_before_pct`` is the
        storage's usage now; ``used_after_pct`` adds the pending moves and
        this guest. Empty when every disk is on shared storage, when the guest
        already lives on ``target_node``, or when data is missing.
    """
    if not guest or not target_node or guest.get("node") == target_node:
        return []
    sizes = _local_sizes_by_storage(guest)
    if not sizes:
        return []
    target = (nodes or {}).get(target_node) or {}
    storage_index = {
        s.get("storage"): s for s in (target.get("storage") or [])
        if isinstance(s, Mapping) and s.get("storage")
    }

    own_vmid = str(guest.get("vmid")) if guest.get("vmid") is not None else None
    pending_sizes: Dict[str, float] = {}
    for pg in pending or ():
        if not isinstance(pg, Mapping) or pg.get("node") == target_node:
            continue
        if own_vmid is not None and str(pg.get("vmid")) == own_vmid:
            continue
        for sid, size in _local_sizes_by_storage(pg).items():
            pending_sizes[sid] = pending_sizes.get(sid, 0.0) + size

    out: List[Dict[str, Any]] = []
    for sid, size in sizes.items():
        entry = storage_index.get(sid)
        if entry is None:
            continue  # Not on the target: the storage compatibility check rejects the move.
        if is_shared_storage(entry):
            continue
        if entry.get("active") is False:
            continue
        total = _num(entry.get("total_gb"))
        used = _num(entry.get("used_gb"))
        if total is None or used is None or total <= 0:
            continue
        avail = _num(entry.get("avail_gb"))
        pend = pending_sizes.get(sid, 0.0)
        before_pct = used / total * 100.0
        after_pct = (used + pend + size) / total * 100.0
        out.append({
            "storage": sid,
            "node": target_node,
            "size_gb": round(size, 1),
            "pending_gb": round(pend, 1),
            "total_gb": round(total, 1),
            "used_before_pct": round(before_pct, 1),
            "used_after_pct": round(after_pct, 1),
            "level": level_for(after_pct, pend + size, avail),
        })
    out.sort(key=lambda e: (-_LEVEL_RANK[e["level"]], -e["used_after_pct"]))
    return out


def worst_level(entries: Iterable[Mapping[str, Any]]) -> Optional[str]:
    """The worst level among projection entries, or None when there are none."""
    worst: Optional[str] = None
    for e in entries or ():
        lvl = e.get("level")
        if lvl in _LEVEL_RANK and (worst is None or _LEVEL_RANK[lvl] > _LEVEL_RANK[worst]):
            worst = lvl
    return worst


def entries_at_least(entries: Iterable[Mapping[str, Any]], level: str) -> List[Mapping[str, Any]]:
    """Entries whose level is ``level`` or worse."""
    floor = _LEVEL_RANK[level]
    return [e for e in entries or () if _LEVEL_RANK.get(e.get("level"), -1) >= floor]


def format_storage_line(entry: Mapping[str, Any]) -> str:
    """Human-readable line: ``local-lvm on vega: 72% → 88%``.

    Mentions data from other planned moves and the won't-fit case.
    """
    line = (f"{entry.get('storage')} on {entry.get('node')}: "
            f"{entry.get('used_before_pct', 0):.0f}% → {entry.get('used_after_pct', 0):.0f}%")
    extras = []
    if (entry.get("pending_gb") or 0) > 0:
        extras.append(f"incl. {entry['pending_gb']:.0f} GB from other planned moves")
    if entry.get("level") == LEVEL_WONT_FIT:
        extras.append(f"{entry.get('size_gb', 0):.0f} GB won't fit")
    return f"{line} ({'; '.join(extras)})" if extras else line


def annotate_target_storage(
    recommendations: List[Dict[str, Any]],
    nodes: Mapping[str, Any],
    guests: Mapping[str, Any],
    initial_pending: Optional[Mapping[str, List[Mapping[str, Any]]]] = None,
) -> None:
    """Attach ``target_storage`` (and ``target_storage_level``) to each recommendation.

    Walks the list in order so each move counts the moves before it into the
    same target (and any in-flight moves in ``initial_pending``).

    Args:
        recommendations: Recommendation dicts, modified in place.
        nodes: Collector node records.
        guests: Collector guest records keyed by vmid string.
        initial_pending: Target node -> guests already moving there.
    """
    pending: Dict[str, List[Mapping[str, Any]]] = {
        k: list(v) for k, v in (initial_pending or {}).items()
    }
    for rec in recommendations:
        guest = guests.get(str(rec.get("vmid"))) or {}
        target = rec.get("target_node")
        entries = project_target_storage(guest, target, nodes, pending.get(target, []))
        rec["target_storage"] = entries
        rec["target_storage_level"] = worst_level(entries)
        if guest and target:
            pending.setdefault(target, []).append(guest)
