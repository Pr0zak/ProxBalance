"""
ProxBalance Guest Behavioral Profiling

Tracks per-guest CPU/memory patterns over time to classify workload
behavior (steady, bursty, growing, cyclical) and provide better
migration load predictions.

Profiles are stored in guest_profiles.json and updated by the collector
after each data collection run.
"""

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from proxbalance.constants import GUEST_PROFILES_FILE, MAX_GUEST_PROFILE_SAMPLES


def load_guest_profiles() -> Dict[str, Any]:
    """Load guest profiles from disk."""
    try:
        if os.path.exists(GUEST_PROFILES_FILE):
            with open(GUEST_PROFILES_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {"version": 1, "profiles": {}}


def save_guest_profiles(profiles: Dict[str, Any]) -> bool:
    """Save guest profiles to disk with atomic write."""
    try:
        tmp_file = GUEST_PROFILES_FILE + '.tmp'
        with open(tmp_file, 'w') as f:
            json.dump(profiles, f, indent=2)
        os.replace(tmp_file, GUEST_PROFILES_FILE)
        return True
    except IOError:
        return False


def update_guest_profile(vmid: str, rrd_summary: Dict[str, Any], node: str) -> None:
    """
    Append an RRD summary observation to the guest's profile history.
    Called by collector_api.py after each data collection run.

    Args:
        vmid: Guest VM ID as string.
        rrd_summary: Dict with 'cpu' and 'mem' keys, each containing
                     min/max/avg/p95/samples stats.
        node: Current node hosting the guest.
    """
    if not rrd_summary or not rrd_summary.get('cpu'):
        return

    profiles = load_guest_profiles()
    guest_profiles = profiles.setdefault("profiles", {})

    if vmid not in guest_profiles:
        guest_profiles[vmid] = {
            "vmid": vmid,
            "node": node,
            "observations": [],
        }

    profile = guest_profiles[vmid]
    profile["node"] = node

    observation = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu": rrd_summary.get("cpu", {}),
        "mem": rrd_summary.get("mem", {}),
    }
    profile["observations"].append(observation)

    # Enforce max samples
    if len(profile["observations"]) > MAX_GUEST_PROFILE_SAMPLES:
        profile["observations"] = profile["observations"][-MAX_GUEST_PROFILE_SAMPLES:]

    save_guest_profiles(profiles)


def classify_guest_behavior(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classify a guest's workload behavior based on stored history.

    Returns:
        Dict with behavior classification and metrics:
        - behavior: "steady"|"bursty"|"growing"|"cyclical"|"unknown"
        - confidence: "high"|"medium"|"low"
        - cpu_volatility: coefficient of variation
        - peak_multiplier: p95/avg ratio
        - growth_rate_per_day: CPU growth rate per day
        - data_points: number of observations
    """
    observations = profile.get("observations", [])

    if len(observations) < 6:
        return {
            "behavior": "unknown",
            "confidence": "low",
            "cpu_volatility": 0,
            "peak_multiplier": 1.0,
            "growth_rate_per_day": 0,
            "data_points": len(observations),
        }

    # Extract CPU averages and p95 values from each observation
    cpu_avgs = [obs.get("cpu", {}).get("avg", 0) for obs in observations if obs.get("cpu", {}).get("avg") is not None]
    cpu_p95s = [obs.get("cpu", {}).get("p95", 0) for obs in observations if obs.get("cpu", {}).get("p95") is not None]

    if not cpu_avgs or len(cpu_avgs) < 6:
        return {
            "behavior": "unknown",
            "confidence": "low",
            "cpu_volatility": 0,
            "peak_multiplier": 1.0,
            "growth_rate_per_day": 0,
            "data_points": len(observations),
        }

    # Calculate statistics
    mean_avg = sum(cpu_avgs) / len(cpu_avgs)
    mean_p95 = sum(cpu_p95s) / len(cpu_p95s) if cpu_p95s else mean_avg

    # Coefficient of variation (std/mean)
    if mean_avg > 0:
        variance = sum((x - mean_avg) ** 2 for x in cpu_avgs) / len(cpu_avgs)
        std_dev = variance ** 0.5
        cv = std_dev / mean_avg
    else:
        cv = 0
        std_dev = 0

    # Peak multiplier (p95/avg)
    peak_mult = mean_p95 / mean_avg if mean_avg > 0 else 1.0

    # Growth rate: simple linear regression on cpu_avgs
    n = len(cpu_avgs)
    x_vals = list(range(n))
    x_mean = (n - 1) / 2
    y_mean = mean_avg

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, cpu_avgs))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)
    slope = numerator / denominator if denominator > 0 else 0

    # Convert slope per observation to slope per day
    # Assume observations are roughly hourly (collector runs every 1-2 hours)
    growth_per_day = slope * 24

    # Classify behavior
    data_points = len(cpu_avgs)
    confidence = "high" if data_points >= 48 else ("medium" if data_points >= 12 else "low")

    if peak_mult > 2.0 and mean_avg > 5:
        behavior = "bursty"
    elif abs(growth_per_day) > 2.0 and mean_avg > 5:
        behavior = "growing"
    elif cv > 0.3 and std_dev > 10:
        behavior = "cyclical"
    elif cv < 0.2:
        behavior = "steady"
    else:
        behavior = "steady"  # Default to steady for moderate variance

    return {
        "behavior": behavior,
        "confidence": confidence,
        "cpu_volatility": round(cv, 3),
        "peak_multiplier": round(peak_mult, 2),
        "growth_rate_per_day": round(growth_per_day, 2),
        "data_points": data_points,
    }


def get_guest_profile(vmid: str) -> Optional[Dict[str, Any]]:
    """
    Get a guest's full profile including behavior classification.

    Returns profile dict with classification or None if no profile exists.
    """
    profiles = load_guest_profiles()
    profile = profiles.get("profiles", {}).get(str(vmid))

    if not profile:
        return None

    classification = classify_guest_behavior(profile)
    return {
        **profile,
        **classification,
    }
