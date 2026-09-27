"""Batch impact simulation and structured conflict resolutions."""

import pytest

from proxbalance.recommendation_analysis import detect_migration_conflicts
from proxbalance.reporting import build_summary

# pve3 uses ~14 GB of 31 GB. Three guests leave it; their *allocations*
# (6 + 6 + 4 GB) exceed what it actually uses, which used to drive the
# simulated "after" to 0% CPU / 0% memory while guests remained.
NODES = {
    "pve3": {"status": "online", "cpu_cores": 4, "total_mem_gb": 31.0,
             "metrics": {"current_cpu": 14.6, "current_mem": 44.6}, "guests": list(range(15))},
    "pve4": {"status": "online", "cpu_cores": 4, "total_mem_gb": 31.0,
             "metrics": {"current_cpu": 18.6, "current_mem": 31.2}, "guests": list(range(31))},
    "pve5": {"status": "online", "cpu_cores": 4, "total_mem_gb": 31.0,
             "metrics": {"current_cpu": 8.6, "current_mem": 44.4}, "guests": list(range(12))},
}

GUESTS = {
    "230": {"cpu_current": 3.0, "cpu_cores": 2, "mem_used_gb": 1.5, "mem_max_gb": 6.0},
    "238": {"cpu_current": 1.0, "cpu_cores": 2, "mem_used_gb": 0.8, "mem_max_gb": 6.0},
    "239": {"cpu_current": 2.0, "cpu_cores": 1, "mem_used_gb": 0.6, "mem_max_gb": 4.0},
}


def _rec(vmid, src, tgt, mem_gb, improvement=20.0, rtype="CT"):
    # No score_details: exercises the fallback path that produced the 0/0 bug.
    return {"vmid": vmid, "name": f"g{vmid}", "type": rtype, "source_node": src,
            "target_node": tgt, "mem_gb": mem_gb, "score_improvement": improvement}


RECS = [_rec(230, "pve3", "pve4", 6.0), _rec(238, "pve3", "pve4", 6.0), _rec(239, "pve3", "pve4", 4.0)]


def test_source_with_remaining_guests_is_not_zeroed():
    impact = build_summary(RECS, [], NODES, {}, guests=GUESTS)["batch_impact"]
    after = impact["after"]["node_scores"]["pve3"]
    assert after["guest_count"] == 12
    assert after["cpu"] > 0 and after["mem"] > 0
    # Source only gets back what the guests actually use: 2.9 GB of 31 GB.
    assert after["mem"] == pytest.approx(44.6 - 2.9 / 31 * 100, abs=0.1)
    # Guest CPU is % of its own cores: 3*2 + 1*2 + 2*1 = 10 core-% over 4 cores.
    assert after["cpu"] == pytest.approx(14.6 - 10 / 4, abs=0.1)


def test_target_uses_allocation_like_conflict_detector():
    impact = build_summary(RECS, [], NODES, {}, guests=GUESTS)["batch_impact"]
    after = impact["after"]["node_scores"]["pve4"]
    assert after["guest_count"] == 34
    assert after["mem"] == pytest.approx(31.2 + 16.0 / 31 * 100, abs=0.1)


def test_moves_resimulate_the_after_state():
    summary = build_summary(RECS, [], NODES, {}, guests=GUESTS)
    impact = summary["batch_impact"]
    assert [m["vmid"] for m in impact["moves"]] == [230, 238, 239]
    before = impact["before"]["node_scores"]
    for node, after in impact["after"]["node_scores"].items():
        cpu = before[node]["cpu"]
        mem = before[node]["mem"]
        for m in impact["moves"]:
            if m["source_node"] == node:
                cpu -= m["source_cpu"]
                mem -= m["source_mem"]
            if m["target_node"] == node:
                cpu += m["target_cpu"]
                mem += m["target_mem"]
        assert after["cpu"] == pytest.approx(min(100, max(0, cpu)), abs=0.1)
        assert after["mem"] == pytest.approx(min(100, max(0, mem)), abs=0.1)
    total_health = sum(m["health_delta"] for m in impact["moves"])
    assert summary["cluster_health"] + total_health == pytest.approx(summary["predicted_health"], abs=0.1)


def test_without_guest_records_falls_back_without_crashing():
    impact = build_summary(RECS, [], NODES, {})["batch_impact"]
    assert set(impact["after"]["node_scores"]) == {"pve3", "pve4", "pve5"}
    assert len(impact["moves"]) == 3


def test_conflict_has_structured_resolution():
    # pve4: 31.2% + 16 GB allocated (~51.6%) = ~82.8% memory, over a 70% limit.
    conflicts = detect_migration_conflicts(RECS, NODES, GUESTS, cpu_threshold=85, mem_threshold=70, penalty_cfg={})
    assert len(conflicts) == 1
    c = conflicts[0]
    assert c["target_node"] == "pve4" and c["exceeds_mem"]
    assert c["resolution_vmid"] in (230, 238, 239)
    # The alternative is never the guest's own source (pve3) or the conflicted target.
    assert c["resolution_action"] == "retarget"
    assert c["resolution_target"] == "pve5"
    assert "pve5 instead" in c["resolution"] and "(CT " in c["resolution"]


def test_conflict_without_alternative_is_a_defer():
    busy = {k: dict(v, metrics={"current_cpu": 80.0, "current_mem": 80.0}) if k != "pve4" else v
            for k, v in NODES.items()}
    c = detect_migration_conflicts(RECS, busy, GUESTS, cpu_threshold=85, mem_threshold=70, penalty_cfg={})[0]
    assert c["resolution_action"] == "defer"
    assert c["resolution_target"] is None
    assert c["resolution_vmid"] is not None


def test_conflict_does_not_net_outgoing_moves():
    # pve4 receives three guests (~51.6% allocated) and is also recommended to
    # send away a guest using 9.3 GB. automigrate may never run that outgoing
    # move (filters, per-run cap, no planner ordering), so it must not hide the
    # conflict; it is only listed as a possible resolution.
    guests = dict(GUESTS, **{"150": {"cpu_current": 10.0, "cpu_cores": 2, "mem_used_gb": 9.3, "mem_max_gb": 12.0}})
    recs = RECS + [_rec(150, "pve4", "pve5", 12.0, improvement=5.0)]
    c = detect_migration_conflicts(recs, NODES, guests, cpu_threshold=85, mem_threshold=70, penalty_cfg={})
    assert len(c) == 1 and c[0]["target_node"] == "pve4"
    assert [g["vmid"] for g in c[0]["outgoing_guests"]] == [150]
    assert c[0]["combined_predicted_mem"] == pytest.approx(31.2 + 16.0 / 31 * 100, abs=0.2)


def test_conflict_and_batch_impact_agree_on_incoming_impact():
    c = detect_migration_conflicts(RECS, NODES, GUESTS, cpu_threshold=85, mem_threshold=70, penalty_cfg={})[0]
    moves = {m["vmid"]: m for m in build_summary(RECS, [], NODES, {}, guests=GUESTS)["batch_impact"]["moves"]}
    for g in c["incoming_guests"]:
        assert g["predicted_mem_impact"] == pytest.approx(moves[g["vmid"]]["target_mem"], abs=0.06)
        assert g["predicted_cpu_impact"] == pytest.approx(moves[g["vmid"]]["target_cpu"], abs=0.06)
