"""Proxmox HA rule checks (proxbalance.ha_rules) and their use in target picking."""

import pytest

from proxbalance import evacuation
from proxbalance.ha_rules import (
    annotate_ha_placement,
    check_ha_placement,
    check_move_live,
    fetch_ha_data,
    normalize_ha_data,
    parse_node_list,
)

NODES = ["pve3", "pve4", "pve5", "pve6"]


def _guests():
    return {
        "100": {"vmid": 100, "name": "app", "type": "VM", "node": "pve3", "status": "running"},
        "101": {"vmid": 101, "name": "replica", "type": "VM", "node": "pve5", "status": "running"},
        "102": {"vmid": 102, "name": "db", "type": "CT", "node": "pve3", "status": "running"},
        "103": {"vmid": 103, "name": "plain", "type": "CT", "node": "pve6", "status": "running"},
    }


def _status(*entries):
    """/cluster/ha/status/current service entries: (sid, node, state)."""
    return [{"id": f"service:{sid}", "sid": sid, "node": node, "state": state, "type": "service"}
            for sid, node, state in entries]


def _ha(rules, status=None, resources=None, groups=None, rules_supported=True):
    return normalize_ha_data(
        rules if rules_supported else None,
        resources if resources is not None else [{"sid": "vm:100", "state": "started"},
                                                 {"sid": "vm:101", "state": "started"},
                                                 {"sid": "ct:102", "state": "started"}],
        status if status is not None else _status(("vm:100", "pve3", "started"),
                                                  ("vm:101", "pve5", "started"),
                                                  ("ct:102", "pve3", "started")),
        groups,
    )


NEGATIVE = {"rule": "keep-apart", "type": "resource-affinity", "affinity": "negative",
            "resources": "vm:100,vm:101"}
POSITIVE = {"rule": "app-with-db", "type": "resource-affinity", "affinity": "positive",
            "resources": "vm:100,ct:102"}


# ---------------------------------------------------------------------------
# Resource affinity
# ---------------------------------------------------------------------------

def test_negative_peer_running_on_target_blocks():
    v = check_ha_placement(100, "pve5", _ha([NEGATIVE]), _guests())
    assert v["blocks"]
    assert "keep-apart" in v["blocks"][0]
    assert "101 (replica)" in v["blocks"][0]
    # Other nodes are fine.
    assert check_ha_placement(100, "pve4", _ha([NEGATIVE]), _guests())["blocks"] == []


def test_negative_peer_stopped_allows():
    ha = _ha([NEGATIVE], status=_status(("vm:100", "pve3", "started"), ("vm:101", "pve5", "stopped")))
    assert check_ha_placement(100, "pve5", ha, _guests())["blocks"] == []


def test_negative_peer_running_states():
    for state in ("starting", "migrate", "relocate", "recovery", "error", "fence"):
        ha = _ha([NEGATIVE], status=_status(("vm:101", "pve5", state)))
        assert check_ha_placement(100, "pve5", ha, _guests())["blocks"], state
    for state in ("stopped", "request_stop", "freeze", "disabled"):
        ha = _ha([NEGATIVE], status=_status(("vm:101", "pve5", state)))
        assert check_ha_placement(100, "pve5", ha, _guests())["blocks"] == [], state


def test_negative_peer_without_ha_state_uses_guest_status():
    ha = _ha([NEGATIVE], status=[], resources=[])
    guests = _guests()
    assert check_ha_placement(100, "pve5", ha, guests)["blocks"]
    guests["101"]["status"] = "stopped"
    assert check_ha_placement(100, "pve5", ha, guests)["blocks"] == []


def test_negative_peer_pending_move_counts():
    ha = _ha([NEGATIVE])
    # 101 is about to move to pve4: pve4 is now taken, pve5 is free.
    pending = {"101": "pve4"}
    assert check_ha_placement(100, "pve4", ha, _guests(), pending_moves=pending)["blocks"]
    assert check_ha_placement(100, "pve5", ha, _guests(), pending_moves=pending)["blocks"] == []


def test_positive_peer_warns_and_lists_peers():
    v = check_ha_placement(100, "pve4", _ha([POSITIVE]), _guests())
    assert v["blocks"] == []
    assert v["co_migrate"] == ["102"]
    assert len(v["warnings"]) == 1
    assert "app-with-db" in v["warnings"][0]
    assert "CT 102 (db)" in v["warnings"][0]
    assert "pve4" in v["warnings"][0]
    assert v["lower_preference"] is False


def test_positive_peer_strict_node_rule_blocks_target():
    pin_db = {"rule": "db-pin", "type": "node-affinity", "resources": "ct:102",
              "nodes": "pve3,pve5", "strict": 1}
    v = check_ha_placement(100, "pve4", _ha([POSITIVE, pin_db]), _guests())
    assert v["blocks"] and "CT 102 (db) must move with it" in v["blocks"][0]
    assert check_ha_placement(100, "pve5", _ha([POSITIVE, pin_db]), _guests())["blocks"] == []


# ---------------------------------------------------------------------------
# Node affinity
# ---------------------------------------------------------------------------

def test_strict_node_affinity_excludes_target():
    rule = {"rule": "pin", "type": "node-affinity", "resources": "vm:100",
            "nodes": "pve3:2,pve4:1", "strict": 1}
    v = check_ha_placement(100, "pve5", _ha([rule]), _guests())
    assert v["blocks"] and "strict node affinity" in v["blocks"][0]
    assert "pve3 (priority 2), pve4 (priority 1)" in v["blocks"][0]
    # A listed node is allowed (lower priority -> warning only).
    v4 = check_ha_placement(100, "pve4", _ha([rule]), _guests(), online_nodes=NODES)
    assert v4["blocks"] == [] and v4["warnings"] and v4["lower_preference"]


def test_non_strict_node_affinity_warns_only():
    rule = {"rule": "prefer", "type": "node-affinity", "resources": "vm:100",
            "nodes": "pve3,pve4", "strict": 0}
    v = check_ha_placement(100, "pve5", _ha([rule]), _guests(), online_nodes=NODES)
    assert v["blocks"] == []
    assert v["warnings"] and "prefers pve3, pve4" in v["warnings"][0]
    assert v["lower_preference"] is True
    assert check_ha_placement(100, "pve4", _ha([rule]), _guests(), online_nodes=NODES)["warnings"] == []


def test_non_strict_preference_for_offline_node_is_ignored():
    rule = {"rule": "prefer", "type": "node-affinity", "resources": "vm:100",
            "nodes": "pve4:2,pve5:1"}
    v = check_ha_placement(100, "pve5", _ha([rule]), _guests(), online_nodes=["pve3", "pve5", "pve6"])
    assert v["warnings"] == []


def test_disabled_rules_ignored():
    rules = [dict(NEGATIVE, disable=1),
             {"rule": "pin", "type": "node-affinity", "resources": "vm:100",
              "nodes": "pve3", "strict": 1, "disable": "1"},
             dict(POSITIVE, disable=True)]
    v = check_ha_placement(100, "pve5", _ha(rules), _guests())
    assert v == {"blocks": [], "warnings": [], "co_migrate": [], "lower_preference": False}


def test_rule_not_mentioning_guest_has_no_effect():
    v = check_ha_placement(103, "pve5", _ha([NEGATIVE, POSITIVE]), _guests())
    assert v["blocks"] == [] and v["warnings"] == []


# ---------------------------------------------------------------------------
# No rules / endpoint missing / legacy groups
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("ha", [None, {}, normalize_ha_data([], [], [], None)])
def test_no_rules_no_effect(ha):
    v = check_ha_placement(100, "pve5", ha, _guests())
    assert v["blocks"] == [] and v["warnings"] == []


class _Endpoint:
    def __init__(self, value=None, exc=None):
        self.value, self.exc = value, exc

    def get(self):
        if self.exc:
            raise self.exc
        return self.value


class _FakeProxmox:
    """proxmox.cluster.ha.{rules,groups,resources,status.current}.get()"""

    def __init__(self, rules=None, rules_exc=None, groups=None, resources=None, status=None):
        class _Status:
            current = _Endpoint(status or [])

        class _HA:
            pass
        ha = _HA()
        ha.rules = _Endpoint(rules, rules_exc)
        ha.groups = _Endpoint(groups or [])
        ha.resources = _Endpoint(resources or [])
        ha.status = _Status()

        class _Cluster:
            pass
        self.cluster = _Cluster()
        self.cluster.ha = ha


def test_rules_endpoint_missing_falls_back_to_groups_noop():
    # PVE 8 without groups: rules endpoint 501s, nothing to check.
    px = _FakeProxmox(rules_exc=Exception("501 Not Implemented"), resources=[{"sid": "vm:100", "state": "started"}])
    ha = fetch_ha_data(px)
    assert ha["source"] == "groups"
    assert ha["rules"] == [] and ha["groups"] == {}
    v = check_ha_placement(100, "pve5", ha, _guests())
    assert v["blocks"] == [] and v["warnings"] == []


def test_fetch_failure_returns_none_and_live_check_is_noop():
    class _Broken:
        @property
        def cluster(self):
            raise RuntimeError("connection refused")
    assert fetch_ha_data(_Broken()) is None
    # A permission error on the rules endpoint is not "PVE 8": nothing is known.
    assert fetch_ha_data(_FakeProxmox(rules_exc=Exception("403 Forbidden: Permission check failed"))) is None
    v = check_move_live(_Broken(), 100, "pve5", {"guests": _guests()})
    assert v["source"] == "none" and v["blocks"] == []


def test_live_check_prefers_live_over_cache():
    px = _FakeProxmox(rules=[NEGATIVE], resources=[{"sid": "vm:101", "state": "started"}],
                      status=_status(("vm:101", "pve5", "started")))
    v = check_move_live(px, 100, "pve5", {"guests": _guests()})
    assert v["source"] == "live" and v["blocks"]
    # Live read fails -> cached snapshot used.
    cache = {"guests": _guests(), "ha_rules": _ha([NEGATIVE])}
    v2 = check_move_live(None, 100, "pve5", cache)
    assert v2["source"] == "cache" and v2["blocks"]


def test_restricted_legacy_group_blocks_outside_targets():
    px = _FakeProxmox(
        rules_exc=Exception("404 Not Found"),
        groups=[{"group": "core", "nodes": "pve3,pve4", "restricted": 1},
                {"group": "loose", "nodes": "pve3", "restricted": 0}],
        resources=[{"sid": "vm:100", "state": "started", "group": "core"},
                   {"sid": "ct:102", "state": "started", "group": "loose"}],
    )
    ha = fetch_ha_data(px)
    v = check_ha_placement(100, "pve5", ha, _guests())
    assert v["blocks"] and "HA group 'core' (restricted)" in v["blocks"][0]
    assert check_ha_placement(100, "pve4", ha, _guests())["blocks"] == []
    # Unrestricted group: preference only.
    v2 = check_ha_placement(102, "pve5", ha, _guests(), online_nodes=NODES)
    assert v2["blocks"] == [] and v2["warnings"] and v2["lower_preference"]


# ---------------------------------------------------------------------------
# Parsing, annotation, consumers
# ---------------------------------------------------------------------------

def test_parse_node_list():
    assert parse_node_list("pve3:2,pve4") == {"pve3": 2, "pve4": 0}
    assert parse_node_list(["pve5:1"]) == {"pve5": 1}
    assert parse_node_list("") == {}


def test_annotate_ha_placement_only_constrained_guests():
    guests = _guests()
    nodes = {n: {"status": "online"} for n in NODES}
    count = annotate_ha_placement(guests, nodes, _ha([NEGATIVE]))
    assert count == 2
    assert guests["100"]["ha_placement"]["pve5"]["blocks"]
    assert "pve4" not in guests["100"]["ha_placement"]
    assert guests["101"]["ha_placement"]["pve3"]["blocks"]
    assert "ha_placement" not in guests["103"]


def test_evacuation_picker_avoids_blocked_node():
    available = [{"node": "pve5", "cpu": 1.0, "mem": 1.0}, {"node": "pve6", "cpu": 50.0, "mem": 50.0}]
    storage = {"pve5": {"shared"}, "pve6": {"shared"}}
    ha = _ha([NEGATIVE])
    # Least loaded is pve5, but 101 runs there.
    target, err = evacuation._pick_evacuation_target(
        100, {"shared"}, available, storage, {}, ha_data=ha, guests=_guests())
    assert (target, err) == ("pve6", None)
    # An explicit pick of the blocked node is an error, not a silent swap.
    target, err = evacuation._pick_evacuation_target(
        100, {"shared"}, available, storage, {}, guest_targets={"100": "pve5"},
        ha_data=ha, guests=_guests())
    assert target is None and "blocked by Proxmox HA rules" in err
    # Without HA data the old behaviour stands.
    assert evacuation._pick_evacuation_target(100, {"shared"}, available, storage, {})[0] == "pve5"


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    from proxbalance import db
    monkeypatch.setattr(db, "get_db_path", lambda: str(tmp_path / "pb.db"))
    db.close_all()
    db._local.conn = None
    db.init_db()
    yield
    db.close_all()
    db._local.conn = None


def test_recommendations_skip_ha_blocked_target(tmp_db):
    from proxbalance.recommendations import generate_recommendations

    def node(name, cpu, guests):
        return {"name": name, "status": "online", "cpu_percent": cpu, "mem_percent": 40,
                "total_mem_gb": 32, "cpu_cores": 4, "guests": guests,
                "metrics": {"current_cpu": cpu, "current_mem": 40, "current_iowait": 0}}
    nodes = {
        "pve3": node("pve3", 95, [100]),
        "pve5": node("pve5", 5, [101]),
        "pve6": node("pve6", 30, []),
    }
    guests = {
        "100": {"vmid": 100, "name": "app", "type": "VM", "node": "pve3", "status": "running",
                "cpu_current": 80, "cpu_cores": 4, "mem_used_gb": 4, "mem_max_gb": 4,
                "tags": {"has_ignore": False, "exclude_groups": [], "all_tags": []}},
        "101": {"vmid": 101, "name": "replica", "type": "VM", "node": "pve5", "status": "running",
                "cpu_current": 5, "cpu_cores": 1, "mem_used_gb": 1, "mem_max_gb": 1,
                "tags": {"has_ignore": True, "exclude_groups": [], "all_tags": ["ignore"]}},
    }
    ha = _ha([NEGATIVE], resources=[], status=[])
    result = generate_recommendations(nodes, guests, maintenance_nodes={"pve3"}, ha_rules=ha)
    targets = {str(r["vmid"]): r["target_node"] for r in result["recommendations"]}
    assert targets.get("100") == "pve6"
    without = generate_recommendations(nodes, guests, maintenance_nodes={"pve3"})
    assert {str(r["vmid"]): r["target_node"] for r in without["recommendations"]}.get("100") == "pve5"


def _bare_collector(proxmox):
    import collector_api
    col = collector_api.ProxmoxAPICollector.__new__(collector_api.ProxmoxAPICollector)
    col.proxmox = proxmox
    # Attributes __init__ would set that generate_summary() reads on other
    # branches (e.g. collection_errors from the client-hardening change).
    col.collection_errors = []
    col.nodes = {n: {"status": "online", "guests": [], "total_mem_gb": 32} for n in ("pve3", "pve5")}
    col.guests = {k: dict(v, tags={"has_ignore": False, "exclude_groups": []})
                  for k, v in _guests().items() if k in ("100", "101")}
    return col


def test_collector_stores_ha_rules_and_placement():
    col = _bare_collector(_FakeProxmox(rules=[NEGATIVE], status=_status(("vm:101", "pve5", "started"))))
    col.ha_rules = col.get_ha_rules_snapshot([{"sid": "vm:100", "state": "started"},
                                              {"sid": "vm:101", "state": "started"}])
    summary = col.generate_summary()
    assert summary["ha_rules"]["rules"][0]["id"] == "keep-apart"
    assert summary["guests"]["100"]["ha_placement"]["pve5"]["blocks"]


def test_collector_ha_failure_stores_nothing():
    class _Broken:
        @property
        def cluster(self):
            raise RuntimeError("boom")
    col = _bare_collector(_Broken())
    col.ha_rules = col.get_ha_rules_snapshot([])
    assert col.ha_rules is None
    summary = col.generate_summary()
    assert "ha_rules" not in summary
    assert "ha_placement" not in summary["guests"]["100"]
