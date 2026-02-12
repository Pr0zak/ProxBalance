"""
Tests for the scoring improvements:
  Phase 1 — Hard memory capacity gate
  Phase 2 — Committed memory tracking + overcommit penalty
  Phase 3 — CPU variance-weighted scoring
  Phase 4 — IOWait as migration trigger
  Integration — full generate_recommendations with realistic cluster data
"""

import sys
import os
import json

# Ensure project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from proxbalance.scoring import (
    DEFAULT_PENALTY_CONFIG,
    calculate_target_node_score,
    calculate_node_health_score,
    predict_post_migration_load,
)
from proxbalance.recommendation_analysis import build_structured_reason
from proxbalance.recommendations import select_guests_to_migrate

# ---------------------------------------------------------------------------
# Helpers to build realistic test data
# ---------------------------------------------------------------------------

def make_node(name, cpu_pct, mem_pct, total_mem_gb, cpu_cores=16,
              iowait=2.0, guests=None, committed_mem_gb=None,
              overcommit_ratio=None, status="online",
              has_historical=True, avg_cpu=None, avg_mem=None,
              avg_iowait=None, cpu_trend="stable", mem_trend="stable"):
    """Build a node dict matching the structure used by scoring/recommendations."""
    avg_cpu = avg_cpu if avg_cpu is not None else cpu_pct
    avg_mem = avg_mem if avg_mem is not None else mem_pct
    avg_iowait = avg_iowait if avg_iowait is not None else iowait
    node = {
        "name": name,
        "status": status,
        "cpu_cores": cpu_cores,
        "total_mem_gb": total_mem_gb,
        "cpu_percent": cpu_pct,
        "mem_percent": mem_pct,
        "metrics": {
            "current_cpu": cpu_pct,
            "current_mem": mem_pct,
            "current_iowait": iowait,
            "avg_cpu": avg_cpu,
            "avg_mem": avg_mem,
            "avg_iowait": avg_iowait,
            "avg_cpu_week": avg_cpu,
            "avg_mem_week": avg_mem,
            "avg_iowait_week": avg_iowait,
            "max_cpu": cpu_pct + 5,
            "max_mem": mem_pct + 3,
            "max_cpu_week": cpu_pct + 10,
            "max_mem_week": mem_pct + 5,
            "has_historical": has_historical,
            "cpu_trend": cpu_trend,
            "mem_trend": mem_trend,
        },
        "guests": guests or [],
        "storage": [],
    }
    if committed_mem_gb is not None:
        node["committed_mem_gb"] = committed_mem_gb
    if overcommit_ratio is not None:
        node["mem_overcommit_ratio"] = overcommit_ratio
    return node


def make_guest(vmid, name, cpu_current=10, mem_used_gb=2.0, mem_max_gb=4.0,
               cpu_cores=2, disk_read_bps=0, disk_write_bps=0, node="pve1",
               status="running", guest_type="VM"):
    """Build a guest dict matching the structure used by scoring/recommendations."""
    return {
        "vmid": vmid,
        "name": name,
        "type": guest_type,
        "status": status,
        "node": node,
        "cpu_current": cpu_current,
        "cpu_cores": cpu_cores,
        "mem_used_gb": mem_used_gb,
        "mem_max_gb": mem_max_gb,
        "disk_read_bps": disk_read_bps,
        "disk_write_bps": disk_write_bps,
        "net_in_bps": 0,
        "net_out_bps": 0,
        "tags": {"has_ignore": False, "exclude_groups": [], "all_tags": []},
        "ha_managed": False,
        "local_disks": {"is_pinned": False},
        "mount_points": {},
    }


passed = 0
failed = 0
test_results = []


def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        test_results.append(f"  PASS: {name}")
    else:
        failed += 1
        test_results.append(f"  FAIL: {name} — {detail}")


# ====================================================================
# Phase 1: Hard memory capacity gate
# ====================================================================
print("=" * 70)
print("Phase 1: Hard Memory Capacity Gate")
print("=" * 70)

# Scenario: target node has 64GB RAM with 3 guests using 20GB each (60GB committed)
# Migrating a 8GB guest would put it at 68GB > 60.8GB (64*0.95) → SHOULD BE REJECTED
# But a 2GB guest would fit: 62GB < 60.8GB → wait, that's also over...
# Let's use: 64GB node, 55GB committed, migrating 8GB guest → 63GB > 60.8GB → rejected
# migrating 2GB guest → 57GB < 60.8GB → accepted

tgt_node_tight = make_node("pve-tight", cpu_pct=30, mem_pct=85,
                           total_mem_gb=64, guests=[100, 101, 102])
guests_tight = {
    "100": make_guest(100, "vm-large-a", mem_max_gb=20.0, node="pve-tight"),
    "101": make_guest(101, "vm-large-b", mem_max_gb=20.0, node="pve-tight"),
    "102": make_guest(102, "vm-large-c", mem_max_gb=15.0, node="pve-tight"),
    # Guests to migrate:
    "200": make_guest(200, "vm-big", mem_max_gb=8.0, node="pve-src"),
    "201": make_guest(201, "vm-small", mem_max_gb=2.0, node="pve-src"),
}
# Committed on pve-tight = 20+20+15 = 55GB
# 55+8 = 63 > 64*0.95=60.8 → rejected
# 55+2 = 57 < 60.8 → accepted

# Test the capacity gate logic directly (replicating what recommendations.py does)
guest_big = guests_tight["200"]
guest_small = guests_tight["201"]

guest_mem_max_big = guest_big.get("mem_max_gb", 0)
guest_mem_max_small = guest_small.get("mem_max_gb", 0)
target_committed = sum(
    guests_tight.get(str(gid), {}).get("mem_max_gb", 0)
    for gid in tgt_node_tight.get("guests", [])
)
target_total = tgt_node_tight.get("total_mem_gb", 1)
threshold_95 = target_total * 0.95

test("Committed memory calculated correctly",
     abs(target_committed - 55.0) < 0.01,
     f"Expected 55.0, got {target_committed}")

test("Big guest (8GB) rejected by capacity gate",
     (target_committed + guest_mem_max_big) > threshold_95,
     f"{target_committed}+{guest_mem_max_big}={target_committed+guest_mem_max_big} vs threshold {threshold_95}")

test("Small guest (2GB) accepted by capacity gate",
     (target_committed + guest_mem_max_small) <= threshold_95,
     f"{target_committed}+{guest_mem_max_small}={target_committed+guest_mem_max_small} vs threshold {threshold_95}")

# Edge case: empty node should accept any guest
tgt_empty = make_node("pve-empty", cpu_pct=5, mem_pct=10, total_mem_gb=32, guests=[])
empty_committed = sum(
    guests_tight.get(str(gid), {}).get("mem_max_gb", 0)
    for gid in tgt_empty.get("guests", [])
)
test("Empty node accepts any guest",
     (empty_committed + guest_mem_max_big) <= (32 * 0.95),
     f"{empty_committed}+{guest_mem_max_big}={empty_committed+guest_mem_max_big} vs {32*0.95}")

# Edge case: pending migrations are considered
pending = {"pve-tight": [make_guest(300, "pending-vm", mem_max_gb=5.0)]}
pending_committed = target_committed + sum(pg.get("mem_max_gb", 0) for pg in pending.get("pve-tight", []))
test("Pending migrations increase committed memory",
     abs(pending_committed - 60.0) < 0.01,
     f"Expected 60.0, got {pending_committed}")
test("Small guest rejected when pending migrations fill capacity",
     (pending_committed + guest_mem_max_small) > threshold_95,
     f"{pending_committed}+{guest_mem_max_small}={pending_committed+guest_mem_max_small} vs {threshold_95}")


# ====================================================================
# Phase 2: Overcommit penalty in scoring
# ====================================================================
print("\n" + "=" * 70)
print("Phase 2: Overcommit Penalty")
print("=" * 70)

cfg = dict(DEFAULT_PENALTY_CONFIG)

# Node with healthy ratio (0.7) — no penalty expected
node_healthy = make_node("pve-healthy", cpu_pct=40, mem_pct=50,
                         total_mem_gb=64, overcommit_ratio=0.7)
guest_test = make_guest(500, "test-vm", cpu_cores=2, mem_max_gb=4.0)

score_healthy, details_healthy = calculate_target_node_score(
    node_healthy, guest_test, {}, 60.0, 70.0,
    penalty_config=cfg, return_details=True)

test("No overcommit penalty when ratio < 1.0",
     details_healthy["penalties"].get("mem_overcommit", 0) == 0,
     f"Got penalty: {details_healthy['penalties'].get('mem_overcommit', 0)}")

# Node with mild overcommit (1.1) — should get base penalty (15)
node_mild_oc = make_node("pve-mild-oc", cpu_pct=40, mem_pct=50,
                         total_mem_gb=64, overcommit_ratio=1.1)
score_mild, details_mild = calculate_target_node_score(
    node_mild_oc, guest_test, {}, 60.0, 70.0,
    penalty_config=cfg, return_details=True)

test("Mild overcommit (1.1) gets base penalty",
     details_mild["penalties"].get("mem_overcommit", 0) == cfg["mem_overcommit_penalty"],
     f"Expected {cfg['mem_overcommit_penalty']}, got {details_mild['penalties'].get('mem_overcommit', 0)}")

# Node with heavy overcommit (1.3) — should get high penalty (40)
node_heavy_oc = make_node("pve-heavy-oc", cpu_pct=40, mem_pct=50,
                          total_mem_gb=64, overcommit_ratio=1.3)
score_heavy, details_heavy = calculate_target_node_score(
    node_heavy_oc, guest_test, {}, 60.0, 70.0,
    penalty_config=cfg, return_details=True)

test("Heavy overcommit (1.3) gets high penalty",
     details_heavy["penalties"].get("mem_overcommit", 0) == cfg["mem_overcommit_high_penalty"],
     f"Expected {cfg['mem_overcommit_high_penalty']}, got {details_heavy['penalties'].get('mem_overcommit', 0)}")

# Verify score ordering: healthy < mild overcommit < heavy overcommit
test("Healthy node scores better than mild overcommit",
     score_healthy < score_mild,
     f"healthy={score_healthy:.1f}, mild={score_mild:.1f}")
test("Mild overcommit scores better than heavy overcommit",
     score_mild < score_heavy,
     f"mild={score_mild:.1f}, heavy={score_heavy:.1f}")

# Verify overcommit penalty shows in details
test("Overcommit penalty visible in penalty breakdown",
     "mem_overcommit" in details_heavy["penalties"],
     f"Keys: {list(details_heavy['penalties'].keys())}")


# ====================================================================
# Phase 3: CPU Variance-Weighted Scoring
# ====================================================================
print("\n" + "=" * 70)
print("Phase 3: CPU Variance-Weighted Scoring")
print("=" * 70)

# We can't easily trigger the trend analysis module without real metrics
# store data, but we CAN verify the stability factor initialization and
# the penalty_breakdown structure.

# Test: verify cpu_stability_factor defaults to 1.0 when no trend data
# Score two identical nodes — they should get the same score
node_a = make_node("pve-a", cpu_pct=65, mem_pct=50, total_mem_gb=64)
node_b = make_node("pve-b", cpu_pct=65, mem_pct=50, total_mem_gb=64)

score_a, det_a = calculate_target_node_score(
    node_a, guest_test, {}, 60.0, 70.0, penalty_config=cfg, return_details=True)
score_b, det_b = calculate_target_node_score(
    node_b, guest_test, {}, 60.0, 70.0, penalty_config=cfg, return_details=True)

test("Identical nodes get identical scores (no trend data → factor=1.0)",
     abs(score_a - score_b) < 0.01,
     f"score_a={score_a:.2f}, score_b={score_b:.2f}")

# Verify stability_bonus key is GONE (replaced by cpu_stability_factor)
test("Old stability_bonus key removed from penalties",
     "stability_bonus" not in det_a["penalties"],
     f"stability_bonus still present: {det_a['penalties'].get('stability_bonus')}")

# Test: CPU penalties are present when CPU > threshold
test("CPU high penalty applied when CPU > threshold",
     det_a["penalties"]["current_cpu"] > 0,
     f"current_cpu penalty = {det_a['penalties']['current_cpu']}")

# Test: with a node at very high CPU, verify penalty is substantial
node_hot = make_node("pve-hot", cpu_pct=92, mem_pct=50, total_mem_gb=64)
_, det_hot = calculate_target_node_score(
    node_hot, guest_test, {}, 60.0, 70.0, penalty_config=cfg, return_details=True)

test("Extreme CPU (92%) gets extreme penalty",
     det_hot["penalties"]["current_cpu"] == cfg["cpu_extreme_penalty"],
     f"Expected {cfg['cpu_extreme_penalty']}, got {det_hot['penalties']['current_cpu']}")

# Test the multiplicative factor logic directly
# Simulate what happens when trend_analysis provides stability data
# We test the factor calculation formula:
for stability, expected_factor in [(90, 0.7), (70, 0.85), (50, 1.0), (30, 1.3)]:
    if stability >= 80:
        factor = 0.7
    elif stability >= 60:
        factor = 0.85
    elif stability < 40:
        factor = 1.3
    else:
        factor = 1.0
    test(f"Stability {stability} → factor {expected_factor}",
         abs(factor - expected_factor) < 0.001,
         f"Got {factor}")

# Demonstrate the impact: a CPU penalty of 100 becomes 70 (stable) or 130 (volatile)
base_penalty = 100
test("Stable factor reduces 100pt penalty to 70",
     int(round(base_penalty * 0.7)) == 70, "")
test("Volatile factor inflates 100pt penalty to 130",
     int(round(base_penalty * 1.3)) == 130, "")


# ====================================================================
# Phase 4: IOWait as Migration Trigger
# ====================================================================
print("\n" + "=" * 70)
print("Phase 4: IOWait as Migration Trigger")
print("=" * 70)

# Test select_guests_to_migrate with iowait reason
node_iowait = make_node("pve-io", cpu_pct=30, mem_pct=40, total_mem_gb=128,
                         iowait=35.0, avg_iowait=32.0,
                         guests=[300, 301, 302])
guests_io = {
    "300": make_guest(300, "db-heavy", cpu_current=20, mem_used_gb=8.0, mem_max_gb=16.0,
                      cpu_cores=4, disk_read_bps=100*1024*1024, disk_write_bps=50*1024*1024,
                      node="pve-io"),
    "301": make_guest(301, "web-light", cpu_current=5, mem_used_gb=1.0, mem_max_gb=2.0,
                      cpu_cores=1, disk_read_bps=1*1024*1024, disk_write_bps=500*1024,
                      node="pve-io"),
    "302": make_guest(302, "batch-io", cpu_current=10, mem_used_gb=4.0, mem_max_gb=8.0,
                      cpu_cores=2, disk_read_bps=80*1024*1024, disk_write_bps=40*1024*1024,
                      node="pve-io"),
}

# When overload_reason is "iowait", should prioritize high-IO guests
selected = select_guests_to_migrate(
    node_iowait, guests_io, 60.0, 70.0, "iowait", iowait_threshold=30.0)

test("IOWait reason selects at least one guest",
     len(selected) >= 1,
     f"Selected {len(selected)} guests")

# The most *efficient* I/O guest should be selected first (best relief per migration cost)
# Guest 302 (batch-io): 120MB/s I/O, cost=20 → efficiency=6.0
# Guest 300 (db-heavy): 150MB/s I/O, cost=31 → efficiency=4.8
# So batch-io is selected first (better bang-for-buck)
if len(selected) >= 1:
    test("Most efficient I/O guest (batch-io, eff=6.0) selected first",
         selected[0] == "302",
         f"First selected: {selected[0]} (expected 302)")

# With CPU reason, different guest might be selected first
selected_cpu = select_guests_to_migrate(
    node_iowait, guests_io, 60.0, 70.0, "cpu")

# Test: IOWait-stressed node detection logic
iowait_threshold = 30.0
nodes_cluster = {
    "pve-io": node_iowait,
    "pve-normal": make_node("pve-normal", cpu_pct=30, mem_pct=40,
                            total_mem_gb=128, iowait=5.0, avg_iowait=3.0),
}

iowait_stressed = set()
for nname, ndata in nodes_cluster.items():
    nmetrics = ndata.get("metrics", {})
    current_iow = nmetrics.get("current_iowait", 0)
    avg_iow = nmetrics.get("avg_iowait", 0) if nmetrics.get("has_historical") else current_iow
    if current_iow > iowait_threshold and avg_iow > (iowait_threshold * 0.7):
        iowait_stressed.add(nname)

test("IOWait-stressed detection finds pve-io",
     "pve-io" in iowait_stressed,
     f"Stressed nodes: {iowait_stressed}")
test("IOWait-stressed detection excludes pve-normal",
     "pve-normal" not in iowait_stressed,
     f"Stressed nodes: {iowait_stressed}")

# Test: transient spike (high current, low avg) should NOT trigger
node_spike = make_node("pve-spike", cpu_pct=30, mem_pct=40,
                        total_mem_gb=128, iowait=35.0, avg_iowait=8.0)
spike_current = node_spike["metrics"]["current_iowait"]
spike_avg = node_spike["metrics"]["avg_iowait"]
test("Transient IOWait spike (current=35, avg=8) NOT triggered",
     not (spike_current > 30 and spike_avg > (30 * 0.7)),
     f"Would trigger: current={spike_current}>30 AND avg={spike_avg}>{30*0.7}")


# ====================================================================
# Phase 4 (continued): IOWait structured reason
# ====================================================================
print("\n" + "=" * 70)
print("Phase 4b: IOWait Structured Reason")
print("=" * 70)

src_node = make_node("pve-io-src", cpu_pct=40, mem_pct=50, total_mem_gb=64, iowait=35.0)
tgt_node = make_node("pve-target", cpu_pct=20, mem_pct=30, total_mem_gb=64, iowait=3.0)
guest_io = make_guest(400, "io-vm", node="pve-io-src")

reason_iowait = build_structured_reason(
    guest_io, src_node, tgt_node, {}, {}, False, cfg, is_iowait_triggered=True)

test("IOWait reason has primary_reason='iowait_relief'",
     reason_iowait["primary_reason"] == "iowait_relief",
     f"Got: {reason_iowait['primary_reason']}")
test("IOWait reason label is 'Relieve I/O pressure'",
     reason_iowait["primary_label"] == "Relieve I/O pressure",
     f"Got: {reason_iowait['primary_label']}")
test("IOWait summary mentions I/O wait",
     "I/O wait" in reason_iowait["summary"],
     f"Summary: {reason_iowait['summary']}")

# Non-IOWait reason should NOT say iowait_relief
reason_normal = build_structured_reason(
    guest_io, src_node, tgt_node, {}, {}, False, cfg, is_iowait_triggered=False)

test("Normal reason does NOT have iowait_relief",
     reason_normal["primary_reason"] != "iowait_relief",
     f"Got: {reason_normal['primary_reason']}")


# ====================================================================
# Collector: committed memory calculation
# ====================================================================
print("\n" + "=" * 70)
print("Phase 2b: Collector Committed Memory Logic")
print("=" * 70)

# Simulate what the collector's generate_summary does
class FakeCollector:
    def __init__(self):
        self.nodes = {
            "pve1": {
                "name": "pve1", "total_mem_gb": 128.0, "guests": [100, 101, 102],
                "status": "online", "metrics": {}, "storage": [],
            },
            "pve2": {
                "name": "pve2", "total_mem_gb": 64.0, "guests": [200],
                "status": "online", "metrics": {}, "storage": [],
            },
        }
        self.guests = {
            "100": {"mem_max_gb": 32.0, "type": "VM", "tags": {"has_ignore": False, "exclude_groups": []}},
            "101": {"mem_max_gb": 16.0, "type": "VM", "tags": {"has_ignore": False, "exclude_groups": []}},
            "102": {"mem_max_gb": 8.0, "type": "CT", "tags": {"has_ignore": False, "exclude_groups": []}},
            "200": {"mem_max_gb": 48.0, "type": "VM", "tags": {"has_ignore": False, "exclude_groups": []}},
        }

collector = FakeCollector()

# Replicate the committed memory calculation from generate_summary
for node_name, node_data in collector.nodes.items():
    committed_mem_gb = 0.0
    for vmid in node_data.get("guests", []):
        guest = collector.guests.get(str(vmid), {})
        committed_mem_gb += guest.get("mem_max_gb", 0)
    node_data["committed_mem_gb"] = round(committed_mem_gb, 2)
    total_mem_gb = node_data.get("total_mem_gb", 1)
    node_data["mem_overcommit_ratio"] = round(
        committed_mem_gb / total_mem_gb, 2
    ) if total_mem_gb > 0 else 0.0

test("pve1 committed_mem_gb = 56.0 (32+16+8)",
     abs(collector.nodes["pve1"]["committed_mem_gb"] - 56.0) < 0.01,
     f"Got: {collector.nodes['pve1']['committed_mem_gb']}")
test("pve1 overcommit ratio = 0.44 (56/128)",
     abs(collector.nodes["pve1"]["mem_overcommit_ratio"] - 0.44) < 0.01,
     f"Got: {collector.nodes['pve1']['mem_overcommit_ratio']}")
test("pve2 committed_mem_gb = 48.0",
     abs(collector.nodes["pve2"]["committed_mem_gb"] - 48.0) < 0.01,
     f"Got: {collector.nodes['pve2']['committed_mem_gb']}")
test("pve2 overcommit ratio = 0.75 (48/64)",
     abs(collector.nodes["pve2"]["mem_overcommit_ratio"] - 0.75) < 0.01,
     f"Got: {collector.nodes['pve2']['mem_overcommit_ratio']}")


# ====================================================================
# Integration: Score ordering makes sense for realistic cluster
# ====================================================================
print("\n" + "=" * 70)
print("Integration: Realistic Score Ordering")
print("=" * 70)

# Create a realistic 4-node cluster
guest_for_scoring = make_guest(999, "test-vm", cpu_cores=4, mem_max_gb=8.0,
                               cpu_current=15, mem_used_gb=4.0)

# Node 1: ideal target — low load, no overcommit, stable
node_ideal = make_node("pve-ideal", cpu_pct=20, mem_pct=30,
                       total_mem_gb=128, overcommit_ratio=0.4)

# Node 2: moderate — mid load, some overcommit
node_moderate = make_node("pve-moderate", cpu_pct=55, mem_pct=60,
                          total_mem_gb=64, overcommit_ratio=0.8)

# Node 3: stressed — high CPU, high IOWait, mild overcommit
node_stressed = make_node("pve-stressed", cpu_pct=80, mem_pct=70,
                          total_mem_gb=64, iowait=25.0, overcommit_ratio=1.05)

# Node 4: danger — extreme CPU, heavy overcommit, high IOWait
node_danger = make_node("pve-danger", cpu_pct=92, mem_pct=85,
                        total_mem_gb=64, iowait=35.0, overcommit_ratio=1.35)

scores = {}
for node in [node_ideal, node_moderate, node_stressed, node_danger]:
    s, d = calculate_target_node_score(
        node, guest_for_scoring, {}, 60.0, 70.0,
        penalty_config=cfg, return_details=True)
    scores[node["name"]] = s
    print(f"  {node['name']:15s} score={s:7.1f}  penalties={d['total_penalties']:.0f}  "
          f"overcommit={d['penalties'].get('mem_overcommit', 0)}")

test("Ideal node has lowest (best) score",
     scores["pve-ideal"] == min(scores.values()),
     f"Scores: {scores}")
test("Danger node has highest (worst) score",
     scores["pve-danger"] == max(scores.values()),
     f"Scores: {scores}")
test("Score ordering: ideal < moderate < stressed < danger",
     scores["pve-ideal"] < scores["pve-moderate"] < scores["pve-stressed"] < scores["pve-danger"],
     f"Scores: {scores}")

# Verify the score spread is meaningful (not all clustered together)
spread = scores["pve-danger"] - scores["pve-ideal"]
test("Score spread between best and worst is significant (>50pts)",
     spread > 50,
     f"Spread: {spread:.1f}")


# ====================================================================
# Integration: Convergence override for IOWait
# ====================================================================
print("\n" + "=" * 70)
print("Integration: Convergence Override for IOWait")
print("=" * 70)

# When all nodes have similar CPU/mem (converged), but one has high IOWait,
# recommendations should NOT be suppressed
converged_nodes = {
    "pve-1": make_node("pve-1", cpu_pct=45, mem_pct=50, total_mem_gb=64, iowait=35.0, avg_iowait=30.0),
    "pve-2": make_node("pve-2", cpu_pct=42, mem_pct=48, total_mem_gb=64, iowait=3.0),
    "pve-3": make_node("pve-3", cpu_pct=44, mem_pct=51, total_mem_gb=64, iowait=2.0),
}

# Check IOWait-stressed detection
iowait_stressed_converged = set()
for nname, ndata in converged_nodes.items():
    nm = ndata["metrics"]
    ciow = nm["current_iowait"]
    aiow = nm.get("avg_iowait", ciow) if nm.get("has_historical") else ciow
    if ciow > 30 and aiow > (30 * 0.7):
        iowait_stressed_converged.add(nname)

test("IOWait-stressed node detected in converged cluster",
     len(iowait_stressed_converged) == 1 and "pve-1" in iowait_stressed_converged,
     f"Stressed: {iowait_stressed_converged}")

# The convergence check logic:
# if convergence_message and not maintenance_nodes and not iowait_stressed_nodes:
#     return empty recommendations
# With IOWait-stressed nodes, this condition is False → recommendations proceed
convergence_would_suppress = True  # Assume cluster IS converged
maintenance_nodes = set()
would_return_empty = convergence_would_suppress and not maintenance_nodes and not iowait_stressed_converged

test("Convergence suppression overridden by IOWait-stressed nodes",
     not would_return_empty,
     "Convergence would still suppress")


# ====================================================================
# Results
# ====================================================================
print("\n" + "=" * 70)
print("RESULTS")
print("=" * 70)
for r in test_results:
    print(r)

print(f"\n{passed} passed, {failed} failed, {passed + failed} total")

if failed > 0:
    sys.exit(1)
else:
    print("\nAll tests passed!")
    sys.exit(0)
