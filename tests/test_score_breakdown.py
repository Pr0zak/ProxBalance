"""Itemised score breakdown and cluster spread (pure; no cluster, no database)."""

import pytest

from proxbalance import scoring
from proxbalance.scoring import (
    build_score_breakdown,
    calculate_target_node_score,
    cluster_spread,
)

DUMMY_GUEST = {"cpu_cores": 1, "cpu_current": 0, "mem_used_gb": 1.0, "mem_max_gb": 1.0}


class _StubTrends:
    """Stands in for trend_analysis so tests never touch the metrics database."""

    def __init__(self, stability=50, cpu_rate=0.0, confidence="high"):
        self.stability = stability
        self.cpu_rate = cpu_rate
        self.confidence = confidence

    def analyze_node_trends(self, *args, **kwargs):
        return {
            "cpu": {"rate_per_day": self.cpu_rate, "confidence": self.confidence},
            "memory": {"rate_per_day": 0.0, "confidence": self.confidence},
            "overall_stability": self.stability,
        }


@pytest.fixture
def trends(monkeypatch):
    stub = _StubTrends()
    monkeypatch.setattr(scoring, "_trend_analysis", stub)
    return stub


def make_node(cpu=20.0, mem=40.0, iowait=2.0, avg_cpu_week=None, avg_mem_week=None,
              max_cpu_week=None, max_mem_week=None, overcommit=0.0, status="online"):
    return {
        "name": "pve-test",
        "status": status,
        "cpu_cores": 4,
        "total_mem_gb": 32.0,
        "mem_overcommit_ratio": overcommit,
        "storage": [{"active": True, "type": "lvmthin", "usage_pct": 30.0}],
        "metrics": {
            "has_historical": True,
            "current_cpu": cpu, "recent_cpu": cpu,
            "avg_cpu": cpu, "avg_cpu_week": cpu if avg_cpu_week is None else avg_cpu_week,
            "current_mem": mem, "avg_mem": mem, "avg_mem_week": mem if avg_mem_week is None else avg_mem_week,
            "current_iowait": iowait, "recent_iowait": iowait,
            "avg_iowait": iowait, "avg_iowait_week": iowait,
            "max_cpu_week": cpu if max_cpu_week is None else max_cpu_week,
            "max_mem_week": mem if max_mem_week is None else max_mem_week,
            "avg_load": 1.0,
        },
    }


def score(node, cpu_threshold=60, mem_threshold=70):
    return calculate_target_node_score(
        target_node=node, guest=DUMMY_GUEST, pending_target_guests={},
        cpu_threshold=cpu_threshold, mem_threshold=mem_threshold, return_details=True,
    )


def assert_adds_up(total, details):
    items = details["penalty_items"]
    sb = details["score_breakdown"]
    assert sum(i["points"] for i in items) == pytest.approx(sum(details["penalties"].values()))
    assert sb["penalty_points"] == pytest.approx(sum(i["points"] for i in items))
    assert sb["base_points"] + sb["penalty_points"] == pytest.approx(sb["score"], abs=0.051)
    assert sb["score"] == pytest.approx(total, abs=0.051)
    assert sb["headroom"] == pytest.approx(max(0, 100 - min(total, 100)), abs=0.051)
    # Weighted components reproduce the base part (to rounding of each line).
    assert sum(b["points"] for b in sb["base"]) == pytest.approx(sb["base_points"], abs=0.1)
    assert all(i["points"] != 0 for i in items)


def test_quiet_node_has_no_items_and_adds_up(trends):
    total, details = score(make_node())
    assert details["penalty_items"] == []
    assert details["score_breakdown"]["penalty_points"] == 0
    assert_adds_up(total, details)


def test_busy_node_items_sum_to_score(trends):
    node = make_node(cpu=82, mem=75, iowait=12, avg_cpu_week=75, max_cpu_week=92,
                     max_mem_week=88, overcommit=1.5)
    total, details = score(node)
    keys = {i["key"] for i in details["penalty_items"]}
    assert {"current_cpu", "current_mem", "sustained_cpu", "iowait_current",
            "cpu_spikes", "mem_spikes", "mem_overcommit"} <= keys
    assert_adds_up(total, details)

    by_key = {i["key"]: i for i in details["penalty_items"]}
    cpu = by_key["current_cpu"]
    assert cpu["value"] == 82 and cpu["threshold"] == 80 and cpu["unit"] == "%"
    assert cpu["category"] == "cpu"
    oc = by_key["mem_overcommit"]
    assert oc["unit"] == "x" and oc["value"] == 1.5 and oc["threshold"] == 1.2
    # Largest first
    pts = [i["points"] for i in details["penalty_items"]]
    assert pts == sorted(pts, reverse=True)


def test_stability_factor_is_listed_as_adjustment(trends):
    trends.stability = 85  # -> CPU penalties x0.7
    total, details = score(make_node(cpu=65))
    item = next(i for i in details["penalty_items"] if i["key"] == "current_cpu")
    assert item["base_points"] == scoring.DEFAULT_PENALTY_CONFIG["cpu_high_penalty"]
    assert item["points"] == round(item["base_points"] * 0.7)
    assert any("x0.7" in a for a in item["adjustments"])
    assert_adds_up(total, details)


def test_quantified_cpu_trend_reports_rate(trends):
    trends.cpu_rate = 1.5
    total, details = score(make_node())
    item = next(i for i in details["penalty_items"] if i["key"] == "cpu_trend")
    assert item["value"] == 1.5 and item["threshold"] == 1.0 and item["unit"] == "%/day"
    assert_adds_up(total, details)


def test_memory_cap_is_listed_and_still_adds_up(trends):
    node = make_node(mem=97, avg_mem_week=97, max_mem_week=99, overcommit=2.5)
    total, details = score(node)
    mem_items = [i for i in details["penalty_items"] if i["category"] == "memory"
                 or i["key"] == "mem_spikes"]
    assert sum(i["points"] for i in mem_items) <= 62  # cap 60, plus per-item rounding
    assert any("capped" in a for i in mem_items for a in i["adjustments"])
    assert_adds_up(total, details)


@pytest.mark.parametrize("cpu,expect", [(60.0, False), (60.1, True), (70.0, True), (70.1, True)])
def test_cpu_threshold_boundary_is_strict(trends, cpu, expect):
    total, details = score(make_node(cpu=cpu), cpu_threshold=60)
    item = next((i for i in details["penalty_items"] if i["key"] == "current_cpu"), None)
    assert (item is not None) is expect
    if item:
        assert item["threshold"] == (70 if cpu > 70 else 60)
    assert_adds_up(total, details)


def test_capped_score_floors_headroom_at_zero():
    sb = build_score_breakdown(total_score=180.4, penalties=150,
                               components={"health": 50, "predicted": 50, "headroom": 50, "storage": 10})
    assert sb["headroom"] == 0
    assert sb["capped"] is True
    assert sb["base_points"] + sb["penalty_points"] == pytest.approx(sb["score"])


def test_missing_component_stays_none():
    sb = build_score_breakdown(total_score=10, penalties=0, components={"health": 10})
    storage = next(b for b in sb["base"] if b["key"] == "storage")
    assert storage["value"] is None and storage["points"] is None


# ---------------------------------------------------------------------------
# Cluster spread
# ---------------------------------------------------------------------------

def _n(cpu, mem, status="online", recent=None):
    m = {"current_cpu": cpu, "current_mem": mem}
    if recent is not None:
        m["recent_cpu"] = recent
    return {"status": status, "metrics": m}


def test_spread_excludes_offline_nodes():
    nodes = {"a": _n(10, 30), "b": _n(30, 60), "c": _n(99, 99, status="offline")}
    sp = cluster_spread(nodes)
    assert sp["online_nodes"] == 2
    assert sp["memory"]["spread"] == 30 and sp["memory"]["max_node"] == "b"
    assert sp["cpu"]["spread"] == 20
    assert sp["memory"]["nodes"] == 2


def test_spread_uses_smoothed_cpu():
    nodes = {"a": _n(90, 40, recent=20), "b": _n(10, 40, recent=25)}
    sp = cluster_spread(nodes)
    assert sp["cpu"]["min"] == 20 and sp["cpu"]["max"] == 25
    assert sp["cpu"]["spread"] == 5
    assert sp["memory"]["spread"] == 0
    assert sp["memory"]["cv"] == 0


def test_spread_coefficient_of_variation():
    sp = cluster_spread({"a": _n(10, 20), "b": _n(30, 60)})
    # mean 40, population std-dev 20 -> 0.5
    assert sp["memory"]["mean"] == 40
    assert sp["memory"]["cv"] == pytest.approx(0.5)


def test_spread_needs_two_readings_and_skips_missing():
    assert cluster_spread({})["memory"] is None
    single = cluster_spread({"a": _n(10, 20), "b": _n(30, 60, status="offline")})
    assert single["memory"] is None and single["cpu"] is None
    missing = cluster_spread({"a": {"status": "online", "metrics": {}}, "b": _n(30, 60)})
    assert missing["online_nodes"] == 2
    assert missing["memory"] is None  # one reading is not a spread, and never 0


def test_spread_zero_mean_has_no_cv():
    sp = cluster_spread({"a": _n(0, 10), "b": _n(0, 20)})
    assert sp["cpu"]["spread"] == 0
    assert sp["cpu"]["cv"] is None
