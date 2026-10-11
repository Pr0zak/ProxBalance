"""
"Seen in N runs" annotation for migration recommendations.

When intelligent migrations are enabled, automigrate only acts on a
recommendation once it has appeared in ``observation_periods`` consecutive
automation runs (see ``update_recommendation_tracking`` in automigrate.py).
That count is persisted per guest in the ``recommendation_tracking`` table.
This module joins it onto the recommendations served by the API so the UI can
show how settled a suggestion is.

What the numbers mean:

- ``seen_count`` is exactly the number automation gates on: consecutive runs
  in which this guest was recommended to move. Automation tracks it per guest,
  not per target, so a change of target does NOT restart it.
- ``seen_same_target`` is how many of those runs (counting back from the most
  recent) recommended the target shown now. It is ``0`` when automation last
  saw a different target, and ``None`` when it cannot be known.

Every field is left off (never zero-filled) when the count is unknown:
automation or intelligent migrations disabled, the guest never observed, the
entry stale, or automation has not refreshed it recently.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

SEEN_FIELDS = (
    "seen_count",
    "seen_required",
    "seen_same_target",
    "seen_status",
    "seen_last_at",
)

# Minimum age before an entry counts as not refreshed, whatever the interval.
MIN_FRESHNESS_MINUTES = 30
# An entry stays current for this many automation intervals after last_seen.
FRESHNESS_INTERVALS = 3


def _parse_ts(value: Any) -> Optional[datetime]:
    """Parse an ISO timestamp into an aware UTC datetime, or None."""
    if not value or not isinstance(value, str):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def same_target_streak(entry: Dict[str, Any], target_node: Optional[str]) -> Optional[int]:
    """Count the latest consecutive runs that recommended ``target_node``.

    Args:
        entry: A recommendation_tracking entry.
        target_node: The target shown on the recommendation now.

    Returns:
        The streak (capped at ``consecutive_count``), 0 when automation's last
        observation named another target, or None when it cannot be known.
    """
    count = int(entry.get("consecutive_count") or 0)
    if count <= 0 or not target_node:
        return None
    last_target = entry.get("last_target_node")
    if last_target and last_target != target_node:
        return 0

    streak = entry.get("target_streak")
    if isinstance(streak, int) and streak >= 0 and last_target == target_node:
        return min(streak, count)

    # Older entries lack target_streak: derive it from the observation list,
    # which is pruned to the observation window. A break inside the window
    # gives an exact answer; no break means the streak may run further back.
    observations = entry.get("observations") or []
    if not observations:
        return None
    run = 0
    for obs in reversed(observations):
        if obs.get("target_node") != target_node:
            return min(run, count)
        run += 1
    return count if run >= count else None


def seen_info(
    rec: Dict[str, Any],
    entry: Optional[Dict[str, Any]],
    required: int,
    now: datetime,
    max_age: timedelta,
) -> Optional[Dict[str, Any]]:
    """Build the seen_* fields for one recommendation, or None when unknown.

    Args:
        rec: The recommendation as served by the API.
        entry: Its tracking entry (keyed by vmid), if any.
        required: The configured observation_periods.
        now: Current time (aware, UTC).
        max_age: How long after last_seen the entry still counts as current.

    Returns:
        Dict with the SEEN_FIELDS keys, or None.
    """
    if not entry or "stale_since" in entry:
        return None
    count = entry.get("consecutive_count")
    if not isinstance(count, int) or count <= 0:
        return None
    last_seen = _parse_ts(entry.get("last_seen"))
    if last_seen is None or now - last_seen > max_age:
        return None
    return {
        "seen_count": count,
        "seen_required": required,
        "seen_same_target": same_target_streak(entry, rec.get("target_node")),
        "seen_status": entry.get("status") or "observing",
        "seen_last_at": entry.get("last_seen"),
    }


def annotate_seen_counts(
    recommendations: Iterable[Dict[str, Any]],
    tracked: Dict[str, Dict[str, Any]],
    auto_config: Dict[str, Any],
    now: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Add seen_* fields in place to recommendations whose count is known.

    Recommendations that automation does not gate on the count (distribution
    balancing, maintenance evacuations) are left alone, as are all of them when
    automation or intelligent migrations are off. Existing seen_* keys are
    removed first so a stale cache never carries old numbers.

    Args:
        recommendations: Recommendation dicts (mutated).
        tracked: recommendation_tracking entries keyed by str(vmid).
        auto_config: The ``automated_migrations`` config section.
        now: Override for the current time (tests).

    Returns:
        The same recommendations, as a list.
    """
    recs = list(recommendations)
    for rec in recs:
        for field in SEEN_FIELDS:
            rec.pop(field, None)

    auto_config = auto_config or {}
    im_config = (auto_config.get("rules") or {}).get("intelligent_migrations") or {}
    if not auto_config.get("enabled") or not im_config.get("enabled"):
        return recs

    required = im_config.get("observation_periods") or 3
    try:
        interval = float(auto_config.get("check_interval_minutes") or 5)
    except (TypeError, ValueError):
        interval = 5.0
    max_age = timedelta(minutes=max(MIN_FRESHNESS_MINUTES, interval * FRESHNESS_INTERVALS))
    maintenance = set(auto_config.get("maintenance_nodes") or [])
    now = now or datetime.now(timezone.utc)

    for rec in recs:
        if rec.get("distribution_balancing") or rec.get("source_node") in maintenance:
            continue
        info = seen_info(rec, (tracked or {}).get(str(rec.get("vmid"))), required, now, max_age)
        if info:
            rec.update(info)
    return recs
