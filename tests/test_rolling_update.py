"""Rolling update planner: quorum math, ordering, per-step moves and the route."""

import pytest
from flask import Flask

from proxbalance.rolling_update import (
    fetch_quorum_inputs, find_self_guest, plan_rolling_update, quorum_from_cache,
    quorum_math, suggest_order,
)


NODE_NAMES = ("cygnus", "draco", "lyra", "orion", "rigel", "vega")


def _members(n, offline=(), votes=None):
    return [{"name": name, "votes": (votes or {}).get(name, 1), "online": name not in offline}
            for name in NODE_NAMES[:n]]


# ---------------------------------------------------------------------------
# Quorum
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("n,quorum", [(3, 2), (4, 3), (5, 3)])
def test_quorum_any_one_node_can_go(n, quorum):
    q = quorum_math(_members(n))
    assert q["expected_votes"] == n and q["quorum"] == quorum and q["present_votes"] == n
    assert q["all_ok"] and all(v["keeps_quorum"] for v in q["per_node"].values())
    assert q["verdict"] == f"{n} of {n} votes present, {quorum} needed: any one node can be down"
    assert q["flags"] == []


def test_two_node_without_qdevice_loses_quorum():
    q = quorum_math(_members(2))
    assert q["quorum"] == 2 and not q["all_ok"]
    assert q["per_node"]["cygnus"] == {"votes": 1, "remaining": 1, "keeps_quorum": False}
    assert "Two-node cluster without a QDevice" in q["flags"][0]
    assert "taking down cygnus or draco loses quorum" in q["verdict"]


def test_two_node_with_qdevice_keeps_quorum():
    q = quorum_math(_members(2), qdevice=True)
    assert q["expected_votes"] == 3 and q["quorum"] == 2 and q["all_ok"]
    assert any("depends on the QDevice" in f for f in q["flags"])
    assert any("keep it reachable" in f for f in q["flags"])


def test_node_already_offline_eats_the_margin():
    # 4 nodes, orion down: 3 present, quorum 3, so no other node can go now.
    q = quorum_math(_members(4, offline=("orion",)))
    assert q["present_votes"] == 3 and not q["per_node"]["cygnus"]["keeps_quorum"]
    # The offline node itself costs nothing more.
    assert q["per_node"]["orion"]["keeps_quorum"]
    assert "Already offline: orion" in q["flags"]


def test_weighted_votes_and_unknown_qdevice():
    q = quorum_math(_members(3, votes={"cygnus": 3}), qdevice=None)
    # 5 votes, quorum 3: losing cygnus leaves 2.
    assert q["expected_votes"] == 5 and q["quorum"] == 3
    assert not q["per_node"]["cygnus"]["keeps_quorum"] and q["per_node"]["draco"]["keeps_quorum"]
    assert "QDevice status unknown (counted as none)" in q["flags"]


def test_quorum_from_cache_fallback_and_recorded_votes():
    data = {"nodes": {"a": {"status": "online"}, "b": {"status": "online"}, "c": {"status": "offline"}}}
    q = quorum_from_cache(data)
    assert q["expected_votes"] == 3 and q["present_votes"] == 2
    assert "Votes not read from corosync: 1 per node assumed" in q["flags"]
    data["cluster_health"] = {"quorum": {"members": [{"name": "a", "votes": 1, "online": True},
                                                     {"name": "b", "votes": 1, "online": True}],
                                         "qdevice": True}}
    q = quorum_from_cache(data)
    assert q["expected_votes"] == 3 and q["all_ok"]


class _Ep:
    def __init__(self, value):
        self.value = value

    def get(self):
        if isinstance(self.value, Exception):
            raise self.value
        return self.value


class _FakePve:
    def __init__(self, nodes, status, qdevice):
        self.cluster = type("C", (), {})()
        self.cluster.status = _Ep(status)
        self.cluster.config = type("Cfg", (), {})()
        self.cluster.config.nodes = _Ep(nodes)
        self.cluster.config.qdevice = _Ep(qdevice)


def test_fetch_quorum_inputs_reads_votes_and_qdevice():
    pve = _FakePve(
        [{"node": "orion", "quorum_votes": "1"}, {"node": "lyra", "quorum_votes": "2"}],
        [{"type": "cluster", "quorate": 1}, {"type": "node", "name": "lyra", "online": 1},
         {"type": "node", "name": "orion", "online": 0}],
        {"Algorithm": "Fast Flags"},
    )
    assert fetch_quorum_inputs(pve) == {"members": [
        {"name": "lyra", "votes": 2, "online": True}, {"name": "orion", "votes": 1, "online": False}],
        "qdevice": True}
    pve.cluster.config.qdevice = _Ep(PermissionError("403"))
    assert fetch_quorum_inputs(pve)["qdevice"] is None
    pve.cluster.config.qdevice = _Ep({})
    assert fetch_quorum_inputs(pve)["qdevice"] is False
    pve.cluster.config.nodes = _Ep(PermissionError("403"))
    assert fetch_quorum_inputs(pve) is None


# ---------------------------------------------------------------------------
# Fixture cluster
# ---------------------------------------------------------------------------

def _node(name, mem_pct=20.0, total=32.0, status="online", storages=("local-lvm",)):
    storage = [{"storage": s, "shared": False, "active": True} for s in storages]
    storage.append({"storage": "nas", "shared": True, "active": True})
    return {"name": name, "status": status, "mem_percent": mem_pct, "cpu_percent": 10.0,
            "total_mem_gb": total, "cpu_cores": 4, "storage": storage}


def _guest(vmid, node, mem, kind="VM", status="running", tags=(), storages=("local-lvm",), size=10.0, **extra):
    g = {
        "vmid": vmid, "name": f"g{vmid}", "type": kind, "node": node, "status": status,
        "mem_max_gb": mem, "mem_used_gb": mem, "cpu_avg_hour": 10.0, "cpu_cores": 1,
        "tags": {"all_tags": list(tags), "exclude_groups": [t for t in tags if t.startswith("exclude_")],
                 "has_ignore": "ignore" in tags},
        "local_disks": {"is_pinned": False},
        "disks": [{"key": f"scsi{i}", "storage": st, "size_gb": size} for i, st in enumerate(storages)],
        "passthrough_devices": [], "mount_points": {},
    }
    g.update(extra)
    return g


def _cluster(*guests, **node_overrides):
    nodes = {n: _node(n, **node_overrides.get(n, {})) for n in ("lyra", "orion", "rigel")}
    return nodes, {str(g["vmid"]): g for g in guests}


def _fixture():
    pinned = _guest(507, "rigel", 8, local_disks={"is_pinned": True, "has_passthrough": True,
                                                 "passthrough_disks": [{"device": "/dev/disk/by-id/wwn-1"}]})
    gpu = _guest(244, "rigel", 2, kind="CT", passthrough_devices=[{"key": "dev0", "device": "/dev/dri/renderD128"}])
    bind = _guest(250, "rigel", 1, kind="CT", mount_points={
        "has_unshared_bind_mount": True,
        "mount_points": [{"is_bind_mount": True, "is_shared": False, "source": "/mnt/fast"}]})
    return _cluster(
        _guest(100, "orion", 1, kind="CT", size=8.0), _guest(101, "orion", 4, size=32.0),
        _guest(301, "lyra", 2), _guest(302, "lyra", 2, status="stopped"),
        _guest(501, "rigel", 6, size=50.0), _guest(502, "rigel", 3, storages=("nas",)),
        pinned, gpu, bind,
    )


def test_order_fewest_moves_first_proxbalance_last():
    nodes, guests = _fixture()
    # Movable running guests: lyra 1, orion 2, rigel 2 (3 pinned ones don't count).
    assert suggest_order(nodes, guests) == ["lyra", "orion", "rigel"]
    assert suggest_order(nodes, guests, self_node="lyra") == ["orion", "rigel", "lyra"]


def test_find_self_guest():
    _, guests = _fixture()
    guests["100"]["name"] = "ProxBalance"
    assert find_self_guest(guests, {}, hostname="something-else") == "100"
    assert find_self_guest(guests, {}, hostname="g301.example.com") == "301"
    assert find_self_guest(guests, {"rolling_update": {"self_vmid": 101}}, hostname="x") == "101"
    del guests["100"]
    assert find_self_guest(guests, {}, hostname="nope") is None


def test_fixture_plan_moves_and_must_stop():
    nodes, guests = _fixture()
    guests["100"]["name"] = "ProxBalance"
    q = quorum_math([{"name": n, "votes": 1, "online": True} for n in nodes])
    plan = plan_rolling_update(nodes, guests, quorum=q, self_vmid="100")
    assert plan["order"] == ["lyra", "rigel", "orion"]
    assert plan["self"]["node"] == "orion"
    steps = {s["node"]: s for s in plan["steps"]}

    s3 = steps["lyra"]
    assert [(m["vmid"], m["to"]) for m in s3["moves"]] == [(301, "orion")]
    assert s3["stays_stopped"] == 1 and s3["must_stop"] == [] and s3["keeps_quorum"]

    s5 = steps["rigel"]
    stop = {g["vmid"]: g["reason"] for g in s5["must_stop"]}
    assert set(stop) == {507, 244, 250}
    assert "passthrough disk /dev/disk/by-id/wwn-1" in stop[507]
    assert "passthrough hardware (dev0)" in stop[244]
    assert "/mnt/fast" in stop[250]
    # Updated lyra is preferred while it stays under the tight line.
    assert [(m["vmid"], m["to"]) for m in s5["moves"]] == [(501, "lyra"), (502, "lyra")]
    # Only node-local disks are copied: 501's 50 GB, not 502's NAS disk.
    assert s5["copy_gb"] == 50.0
    assert {m["vmid"]: m["copy_gb"] for m in s5["moves"]} == {501: 50.0, 502: 0.0}

    s4 = steps["orion"]
    assert s4["hosts_proxbalance"]
    moved = {m["vmid"]: m for m in s4["moves"]}
    assert moved[100]["proxbalance"] and moved[100]["restarts"]
    assert not moved[101]["restarts"]
    # 301 moved onto orion in step 1, so it moves again: 8 + 32 + 10 GB.
    assert set(moved) == {100, 101, 301}
    assert s4["copy_gb"] == 50.0
    assert plan["status"] == "ok"
    assert plan["verdict"] == "3 steps, 6 moves, 3 guests must shut down"
    # Targets report memory after the step.
    t3 = {t["node"]: t for t in s5["targets"]}["lyra"]
    assert t3["mem_after"] > t3["mem_before"] and t3["updated"]


def test_evacuated_node_comes_back_as_target():
    nodes, guests = _cluster(_guest(301, "lyra", 2), _guest(401, "orion", 3))
    plan = plan_rolling_update(nodes, guests, order=["lyra", "orion"])
    s3, s4 = plan["steps"]
    # 301 lands on orion or rigel; in step 2 orion's guests (including 301 if it
    # went there) prefer the already-updated lyra.
    assert all(m["to"] == "lyra" for m in s4["moves"])
    assert {m["vmid"] for m in s4["moves"]} >= {401}
    assert {t["node"]: t for t in s4["targets"]}["lyra"]["updated"]


def test_capacity_overflow_reported():
    nodes, guests = _cluster(
        _guest(401, "orion", 20), _guest(402, "orion", 20), _guest(403, "orion", 12),
        lyra={"mem_pct": 50.0}, rigel={"mem_pct": 50.0},
    )
    plan = plan_rolling_update(nodes, guests, order=["orion"])
    step = plan["steps"][0]
    assert step["status"] == "short"
    assert [m["vmid"] for m in step["moves"]] == [403]
    assert sorted(g["vmid"] for g in step["doesnt_fit"]) == [401, 402]
    assert "no other node has 20.0 GB free under 95% memory" in step["doesnt_fit"][0]["reason"]
    assert plan["status"] == "short" and "2 don't fit" in plan["verdict"]


def test_storage_and_anti_affinity_and_required_affinity():
    nodes, guests = _cluster(
        _guest(401, "orion", 2, storages=("fast",)),
        _guest(402, "orion", 2, tags=("exclude_dns",)), _guest(301, "lyra", 1, tags=("exclude_dns",)),
        _guest(403, "orion", 1, tags=("affinity_req_web",)), _guest(501, "rigel", 1, tags=("affinity_req_web",)),
        lyra={"storages": ("local-lvm", "fast")},
        rigel={"mem_pct": 5.0},
    )
    plan = plan_rolling_update(nodes, guests, order=["orion"])
    moves = {m["vmid"]: m["to"] for m in plan["steps"][0]["moves"]}
    assert moves[401] == "lyra"          # only lyra has storage "fast"
    assert moves[402] == "rigel"          # lyra runs the other exclude_dns member
    assert moves[403] == "rigel"          # stays with its required group


def test_storage_missing_everywhere_doesnt_fit_with_reason():
    nodes, guests = _cluster(_guest(401, "orion", 2, storages=("fast",)))
    step = plan_rolling_update(nodes, guests, order=["orion"])["steps"][0]
    assert step["doesnt_fit"][0]["reason"] == "lyra: no storage fast; rigel: no storage fast"


def test_quorum_loss_marks_step_and_order_validation():
    nodes, guests = _cluster(_guest(301, "lyra", 1))
    q = quorum_math([{"name": "lyra", "votes": 1, "online": True}, {"name": "orion", "votes": 1, "online": True}])
    plan = plan_rolling_update(nodes, guests, order=["lyra"], quorum=q)
    assert plan["steps"][0]["status"] == "no_quorum"
    assert "loses quorum" in plan["steps"][0]["verdict"]
    with pytest.raises(ValueError):
        plan_rolling_update(nodes, guests, order=["pve9"])
    with pytest.raises(ValueError):
        plan_rolling_update(nodes, guests, order=["lyra", "lyra"])


def test_offline_node_skipped():
    nodes, guests = _cluster(_guest(301, "lyra", 1), rigel={"status": "offline"})
    assert "rigel" not in suggest_order(nodes, guests)
    plan = plan_rolling_update(nodes, guests, order=["rigel", "lyra"])
    assert plan["steps"][0]["status"] == "offline"
    assert {t["node"] for t in plan["steps"][1]["targets"]} == {"orion"}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class _Cache:
    def __init__(self, data):
        self.data = data

    def get(self):
        return self.data


def _client(data, monkeypatch):
    from proxbalance.routes.simulate import simulate_bp
    import proxbalance.config_manager as cm
    monkeypatch.setattr(cm, "load_config", lambda *a, **k: {})
    app = Flask(__name__)
    app.config["cache_manager"] = _Cache(data)
    app.register_blueprint(simulate_bp)
    return app.test_client()


def test_route_plan_and_order(monkeypatch):
    nodes, guests = _fixture()
    data = {"nodes": nodes, "guests": guests, "collected_at": "t",
            "cluster_health": {"quorum": {"members": [{"name": n, "votes": 1, "online": True} for n in nodes],
                                          "qdevice": False}}}
    c = _client(data, monkeypatch)
    r = c.get("/api/rolling-update/plan").get_json()
    assert r["success"] and r["data"]["quorum"]["all_ok"]
    assert [s["node"] for s in r["data"]["steps"]] == r["data"]["suggested_order"]
    r = c.get("/api/rolling-update/plan?order=rigel,lyra").get_json()
    assert r["data"]["order"] == ["rigel", "lyra"]
    r = c.get("/api/rolling-update/plan?order=pve9")
    assert r.status_code == 400


def test_route_without_votes_reads_live_and_falls_back(monkeypatch):
    nodes, guests = _fixture()
    import proxbalance.config_manager as cm

    def boom(*a, **k):
        raise ValueError("no token")
    monkeypatch.setattr(cm, "get_proxmox_client", boom)
    c = _client({"nodes": nodes, "guests": guests}, monkeypatch)
    q = c.get("/api/rolling-update/plan").get_json()["data"]["quorum"]
    assert q["expected_votes"] == 3
    assert "Votes not read from corosync: 1 per node assumed" in q["flags"]


def test_route_no_data(monkeypatch):
    assert _client({}, monkeypatch).get("/api/rolling-update/plan").status_code == 503
