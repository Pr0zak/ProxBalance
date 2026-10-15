"""Disk health (SMART) per node, from the Proxmox API.

The collector calls ``GET /nodes/{node}/disks/list`` once per node per
collection cycle and stores the result of :func:`summarize_disks` in the
node's ``disks`` field of ``cluster_cache.json``. Proxmox reports the SMART
verdict (``health``) and, for SSDs, the share of rated life left
(``wearout``, 100 = new). No temperatures and no SSH.

``disks`` is ``None`` when the list could not be read (the token lacks
``Sys.Audit`` on ``/nodes/{node}``, the node is offline, the call failed):
the UI then shows nothing rather than an error.
"""

from typing import Any, Dict, List, Optional

HEALTH_PASSED = "PASSED"
HEALTH_FAILED = "FAILED"
HEALTH_UNKNOWN = "UNKNOWN"

# Wearout (percent of rated life left) at or below which a disk is called out.
WEAROUT_LOW_PCT = 20

# SAS/SCSI disks report "OK" where ATA/NVMe report "PASSED".
_PASSED_WORDS = {"PASSED", "OK"}
_FAILED_WORDS = {"FAILED", "FAILING"}


def parse_health(value: Any) -> str:
    """Normalize Proxmox's ``health`` field.

    Args:
        value: The raw field (``"PASSED"``, ``"OK"``, ``"FAILED"``,
            ``"UNKNOWN"``, missing ...).

    Returns:
        ``"PASSED"``, ``"FAILED"`` or ``"UNKNOWN"``.
    """
    if not isinstance(value, str):
        return HEALTH_UNKNOWN
    word = value.strip().upper()
    if word in _PASSED_WORDS:
        return HEALTH_PASSED
    if word in _FAILED_WORDS:
        return HEALTH_FAILED
    return HEALTH_UNKNOWN


def parse_wearout(value: Any) -> Optional[int]:
    """Parse Proxmox's ``wearout`` (percent of rated life left).

    Args:
        value: An int, a numeric string, or ``"N/A"`` (spinning disks and
            SSDs that do not report it).

    Returns:
        0–100, or ``None`` when not reported. Never 0 for "absent".
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
    elif isinstance(value, str):
        try:
            num = float(value.strip().rstrip("%"))
        except ValueError:
            return None
    else:
        return None
    if num != num:  # NaN
        return None
    return int(round(min(100.0, max(0.0, num))))


def _int_or_none(value: Any) -> Optional[int]:
    try:
        return int(value) if value is not None and not isinstance(value, bool) else None
    except (TypeError, ValueError):
        return None


def _str_or_none(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None


def is_notable(disk: Dict[str, Any]) -> bool:
    """True when a disk should get its own line: not PASSED, or worn out."""
    if disk.get("health") != HEALTH_PASSED:
        return True
    wearout = disk.get("wearout")
    return wearout is not None and wearout <= WEAROUT_LOW_PCT


def summarize_disks(raw: Any) -> Optional[Dict[str, Any]]:
    """Turn a ``disks/list`` response into the cached per-node summary.

    Args:
        raw: The list Proxmox returned, or ``None`` when it could not be read.

    Returns:
        ``None`` when ``raw`` is not a list, otherwise::

            {"count": int, "failed": int, "unknown": int, "notable": int,
             "disks": [{"devpath", "model", "type", "size_bytes",
                        "health", "wearout"}]}

        ``model``/``type``/``size_bytes``/``wearout`` are ``None`` when
        Proxmox did not report them.
    """
    if not isinstance(raw, list):
        return None
    disks: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        disks.append({
            "devpath": _str_or_none(item.get("devpath")),
            "model": _str_or_none(item.get("model")),
            "type": _str_or_none(item.get("type")),
            "size_bytes": _int_or_none(item.get("size")),
            "health": parse_health(item.get("health")),
            "wearout": parse_wearout(item.get("wearout")),
        })
    disks.sort(key=lambda d: d["devpath"] or "")
    return {
        "count": len(disks),
        "failed": sum(1 for d in disks if d["health"] == HEALTH_FAILED),
        "unknown": sum(1 for d in disks if d["health"] == HEALTH_UNKNOWN),
        "notable": sum(1 for d in disks if is_notable(d)),
        "disks": disks,
    }
