"""cluster_balance(): the dashboard's Balance figure must judge the cluster
the same way the recommendation engine's convergence check does."""
from proxbalance.recommendations import _check_cluster_convergence
from proxbalance.scoring import cluster_balance


def _node(cpu, mem, anchored=0.0, status="online"):
    return {"status": status, "anchored_cpu": anchored,
            "metrics": {"current_cpu": cpu, "current_mem": mem, "has_historical": False}}


def test_even_cluster_is_balanced_and_agrees_with_engine():
    nodes = {"a": _node(30, 50), "b": _node(33, 54), "c": _node(28, 47)}
    b = cluster_balance(nodes, None, 80, 80)
    assert b["balanced"] is True
    assert b["score"] == 93  # 100 - memory gap 7
    assert _check_cluster_convergence(nodes, {}, 80, 80, 8.0) is not None


def test_uneven_cluster_names_both_ends_and_agrees_with_engine():
    nodes = {"a": _node(20, 68), "b": _node(10, 37), "off": _node(99, 99, status="offline")}
    b = cluster_balance(nodes, None, 80, 80)
    assert b["balanced"] is False
    assert b["score"] == 69
    assert (b["memory"]["max_node"], b["memory"]["min_node"]) == ("a", "b")
    assert "off" not in b["cpu"]["values"]
    assert b["limits"] == {"cpu": 80, "memory": 80}
    assert _check_cluster_convergence(nodes, {}, 80, 80, 8.0) is None


def test_node_over_limit_is_listed_and_never_balanced():
    nodes = {"a": _node(85, 50), "b": _node(83, 52)}
    b = cluster_balance(nodes, None, 80, 80)
    assert b["balanced"] is False
    assert [o["node"] for o in b["over"]] == ["a", "b"]


def test_anchored_cpu_is_left_out():
    # 60% CPU with 50 points held by an anchored guest is 20% movable load.
    nodes = {"nas": _node(60, 40, anchored=50), "b": _node(20, 40)}
    b = cluster_balance(nodes, None, 80, 80)
    assert b["cpu"]["values"]["nas"] == 20.0
    assert b["cpu"]["spread"] == 0.0


def test_single_node_has_no_score():
    b = cluster_balance({"a": _node(30, 50)}, None, 80, 80)
    assert b["score"] is None and b["cpu"] is None
