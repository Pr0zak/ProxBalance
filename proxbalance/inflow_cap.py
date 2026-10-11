"""
Per-run cap on migrations into one target node.

``automated_migrations.rules.max_target_inflow_per_cycle`` stops a single
automation run from moving many guests onto the same (usually the emptiest)
node before the cluster has settled and the scores have been re-read. The
value is the most migrations one node may receive in one run; ``0`` turns the
cap off.

Everything here is pure (no I/O) so automigrate.py, the config route and the
tests share one definition of the rule.
"""

from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple

CONFIG_KEY = "max_target_inflow_per_cycle"
MIN_TARGET_INFLOW_CAP = 0
MAX_TARGET_INFLOW_CAP = 5
DEFAULT_TARGET_INFLOW_CAP = 0

# Machine-readable code stored on decisions skipped by the cap.
SKIP_CODE = "target_inflow_cap"


def validate_target_inflow_cap(value: Any) -> int:
    """Validate a cap value coming from the API.

    Args:
        value: The submitted value. Integers and integral floats/strings are
            accepted; booleans are not.

    Returns:
        The value as an int in ``[MIN_TARGET_INFLOW_CAP, MAX_TARGET_INFLOW_CAP]``.

    Raises:
        ValueError: When the value is not an integer or is out of range.
    """
    if isinstance(value, bool) or value is None:
        raise ValueError(f"{CONFIG_KEY} must be an integer")
    try:
        as_float = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{CONFIG_KEY} must be an integer") from None
    if not as_float.is_integer():
        raise ValueError(f"{CONFIG_KEY} must be an integer")
    cap = int(as_float)
    if cap < MIN_TARGET_INFLOW_CAP or cap > MAX_TARGET_INFLOW_CAP:
        raise ValueError(
            f"{CONFIG_KEY} must be between {MIN_TARGET_INFLOW_CAP} and "
            f"{MAX_TARGET_INFLOW_CAP} (0 = no limit)"
        )
    return cap


def get_target_inflow_cap(rules: Optional[Mapping[str, Any]]) -> int:
    """Read the cap from an automation ``rules`` dict, tolerating bad values.

    A missing or unreadable value means "off"; an out-of-range value is
    clamped, so a hand-edited config.json can never make the engine crash.

    Args:
        rules: ``automated_migrations.rules`` (may be None).

    Returns:
        The effective cap; 0 means no limit.
    """
    raw = (rules or {}).get(CONFIG_KEY, DEFAULT_TARGET_INFLOW_CAP)
    if isinstance(raw, bool):
        return DEFAULT_TARGET_INFLOW_CAP
    try:
        cap = int(float(raw))
    except (TypeError, ValueError):
        return DEFAULT_TARGET_INFLOW_CAP
    return max(MIN_TARGET_INFLOW_CAP, min(MAX_TARGET_INFLOW_CAP, cap))


def inflow_cap_reason(target: str, received: int, cap: int) -> str:
    """Human-readable skip reason for a recommendation held back by the cap.

    Args:
        target: Target node name.
        received: Migrations the target already received in this run.
        cap: The configured cap.

    Returns:
        A one-line reason for decisions and the activity log.
    """
    return (
        f"Target inflow cap: {target} already received {received} migration"
        f"{'' if received == 1 else 's'} this run (max {cap} per node per run)"
    )


def is_target_capped(target: str, inflow: Mapping[str, int], cap: int) -> bool:
    """Whether ``target`` has reached the cap for this run.

    Args:
        target: Target node name.
        inflow: Migrations already sent to each node in this run.
        cap: The configured cap (0 = off).

    Returns:
        True when the cap is on and the node has reached it.
    """
    return cap > 0 and inflow.get(target, 0) >= cap


def apply_target_inflow_cap(
    recommendations: Iterable[Dict[str, Any]],
    inflow: Mapping[str, int],
    cap: int,
) -> Tuple[List[Dict[str, Any]], List[Tuple[Dict[str, Any], str]]]:
    """Split recommendations into allowed and capped for the current pick.

    Used once per migration slot: ``inflow`` holds what this run has already
    sent to each node, and any recommendation whose target is at the cap is
    held back with a reason. The order of ``recommendations`` is preserved.

    Args:
        recommendations: Candidate recommendations (each has ``target_node``).
        inflow: Migrations already sent to each node in this run.
        cap: The configured cap (0 = off).

    Returns:
        ``(allowed, capped)`` where ``capped`` is a list of
        ``(recommendation, reason)`` pairs.
    """
    allowed: List[Dict[str, Any]] = []
    capped: List[Tuple[Dict[str, Any], str]] = []
    for rec in recommendations:
        target = rec.get("target_node")
        if is_target_capped(target, inflow, cap):
            capped.append((rec, inflow_cap_reason(target, inflow.get(target, 0), cap)))
        else:
            allowed.append(rec)
    return allowed, capped


def select_with_target_inflow_cap(
    recommendations: Iterable[Dict[str, Any]],
    cap: int,
    max_selected: Optional[int] = None,
    inflow: Optional[Mapping[str, int]] = None,
) -> Tuple[List[Dict[str, Any]], List[Tuple[Dict[str, Any], str]]]:
    """Choose recommendations in priority order, honouring the cap.

    This is the whole-run view of the rule (what a run of ``max_selected``
    picks from a fixed list would do), used for batch plans and tests. The
    automation loop applies the same rule one slot at a time via
    :func:`apply_target_inflow_cap` because it regenerates recommendations
    between migrations.

    Args:
        recommendations: Candidates, highest priority first.
        cap: The configured cap (0 = off).
        max_selected: Stop after this many picks (None = no limit). Anything
            left over is not reported as capped.
        inflow: Migrations already sent to each node before this selection.

    Returns:
        ``(selected, capped)``; ``capped`` holds ``(recommendation, reason)``.
    """
    counts: Dict[str, int] = dict(inflow or {})
    selected: List[Dict[str, Any]] = []
    capped: List[Tuple[Dict[str, Any], str]] = []
    for rec in recommendations:
        if max_selected is not None and len(selected) >= max_selected:
            break
        target = rec.get("target_node")
        if is_target_capped(target, counts, cap):
            capped.append((rec, inflow_cap_reason(target, counts.get(target, 0), cap)))
            continue
        selected.append(rec)
        counts[target] = counts.get(target, 0) + 1
    return selected, capped
