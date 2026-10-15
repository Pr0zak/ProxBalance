"""Placement rules: hard anti-affinity, soft/required affinity, pool rules, enforce-now plan."""

import json

import pytest
from flask import Flask

from proxbalance import placement_rules as pr


def _tags(*tags):
    tags = list(tags)
    return {"has_ignore": "ignore" in tags, "all_tags": tags,
            "exclude_groups": [t for t in tags if t.startswith("exclude_")],
            "affinity_groups": [t for t in tags if t.startswith("affinity_")]}


def _guest(vmid, node, *tags, cpu=5, mem=1, pool=None, status="running"):
    return {"vmid": vmid, "name": f"g{vmid}", "type": "VM", "node": node, "status": status,
            "cpu_current": cpu, "cpu_cores": 4 if cpu > 50 else 1, "mem_used_gb": mem, "mem_max_gb": mem,
            "tags": _tags(*tags), "pool": pool}


def _node(name, cpu, guests, mem=40):
    return {"name": name, "status": "online", "cpu_percent": cpu, "mem_percent": mem,
            "total_mem_gb": 32, "cpu_cores": 4, "guests": guests,
            "metrics": {"current_cpu": cpu, "current_mem": mem, "current_iowait": 0}}


def _cluster(guests):
    nodes = {n: _node(n, c, []) for n, c in (("lyra", 95), ("rigel", 5), ("vega", 30))}
    for k, g in guests.items():
        nodes[g["node"]]["guests"].append(int(k))
    return nodes


# ---------------------------------------------------------------------------
# Rule building
# ---------------------------------------------------------------------------

def test_required_marker_joins_the_plain_group():
    assert pr.parse_affinity_tag("affinity_web") == ("affinity_web", False)
    assert pr.parse_affinity_tag("affinity_req_web") == ("affinity_web", True)
    assert pr.parse_affinity_tag("affinity_") is None
    assert pr.parse_affinity_tag("exclude_db") is None
    guests = {"1": _guest(1, "lyra", "affinity_web"), "2": _guest(2, "rigel", "affinity_req_web"),
              "3": _guest(3, "rigel", "affinity_db"), "4": _guest(4, "rigel", "exclude_dns")}
    rules = {r["name"]: r for r in pr.build_rules(guests)}
    assert rules["affinity_web"]["members"] == ["1", "2"] and rules["affinity_web"]["required"]
    assert not rules["affinity_db"]["required"]
    assert rules["exclude_dns"]["kind"] == pr.KIND_ANTI_AFFINITY and rules["exclude_dns"]["required"]
    assert pr.is_hard(rules["exclude_dns"]) and pr.is_hard(rules["affinity_web"])
    assert not pr.is_hard(rules["affinity_db"])


def test_pool_rules_resolve_members():
    guests = {"1": _guest(1, "lyra", pool="prod"), "2": _guest(2, "rigel", pool="prod"),
              "3": _guest(3, "rigel", pool="lab"), "4": _guest(4, "vega")}
    cfg = {"pool_rules": {"prod": "anti-affinity", "lab": {"type": "affinity", "required": True},
                          "bogus": "sideways"}}
    rules = {r["id"]: r for r in pr.build_rules(guests, cfg, pools_available=True)}
    assert set(rules) == {"pool:prod", "pool:lab"}
    assert rules["pool:prod"]["members"] == ["1", "2"]
    assert rules["pool:prod"]["kind"] == pr.KIND_ANTI_AFFINITY and rules["pool:prod"]["required"]
    assert rules["pool:lab"]["members"] == ["3"] and rules["pool:lab"]["required"]
    # Pool anti-affinity blocks like a tag does.
    assert "prod" in pr.anti_affinity_conflict(1, "rigel", rules.values(), guests)
    assert pr.anti_affinity_conflict(1, "vega", rules.values(), guests) is None


def test_missing_pool_permission_is_a_noop(capsys, monkeypatch):
    monkeypatch.setattr(pr, "_pool_warning_logged", False)
    guests = {"1": _guest(1, "lyra"), "2": _guest(2, "rigel")}
    cfg = {"pool_rules": {"prod": "anti-affinity"}}
    assert pr.build_rules(guests, cfg, pools_available=False) == []
    assert pr.build_rules(guests, cfg, pools_available=False) == []
    assert capsys.readouterr().err.count("pool rules ignored") == 1


def test_collector_tolerates_pool_permission_error():
    import collector_api

    class Denied:
        def get(self, **kw):
            raise RuntimeError("403 Forbidden: Permission check failed (/pool, Pool.Audit)")

    class P:
        pools = Denied()

    col = collector_api.ProxmoxAPICollector.__new__(collector_api.ProxmoxAPICollector)
    col.proxmox = P()
    col.collection_errors = []
    assert col.get_resource_pools() == []
    assert col.pools_available is False


def test_collector_fetches_members_when_index_lacks_them():
    import collector_api

    class Pools:
        def get(self, **kw):
            return [{"poolid": "prod"}]

        def __call__(self, pid):
            outer = self

            class One:
                def get(self):
                    assert pid == "prod" and outer
                    return {"poolid": "prod", "members": [{"vmid": 101, "type": "qemu"}]}
            return One()

    class P:
        pools = Pools()

    col = collector_api.ProxmoxAPICollector.__new__(collector_api.ProxmoxAPICollector)
    col.proxmox = P()
    col.collection_errors = []
    assert col.get_resource_pools() == [{"poolid": "prod", "members": [{"vmid": 101, "type": "qemu"}]}]
    assert col.pools_available is True


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def test_soft_penalty_only_when_moving_away_from_mates():
    guests = {"1": _guest(1, "lyra", "affinity_web"), "2": _guest(2, "lyra", "affinity_web"),
              "3": _guest(3, "rigel", "affinity_web")}
    rules = pr.build_rules(guests)
    # 1 has one mate on lyra and one on rigel: rigel is no worse, vega splits.
    assert pr.soft_affinity_penalty(1, "lyra", "rigel", rules, guests) == (0.0, [])
    assert pr.soft_affinity_penalty(1, "lyra", "vega", rules, guests, penalty=20) == (20.0, ["affinity_web"])
    # A planned move counts at its new node.
    assert pr.soft_affinity_penalty(1, "lyra", "vega", rules, guests, pending_moves={"2": "vega"}) == (0.0, [])
    # Required groups are not priced; they move together instead.
    req = pr.build_rules({**guests, "2": _guest(2, "lyra", "affinity_req_web")})
    assert pr.soft_affinity_penalty(1, "lyra", "vega", req, guests) == (0.0, [])


def test_soft_penalty_config_is_clamped():
    assert pr.soft_penalty_from_config({}) == pr.DEFAULT_SOFT_AFFINITY_PENALTY
    assert pr.soft_penalty_from_config({"affinity_soft_penalty": 500}) == 100
    assert pr.soft_penalty_from_config({"affinity_soft_penalty": "x"}) == pr.DEFAULT_SOFT_AFFINITY_PENALTY


# ---------------------------------------------------------------------------
# Recommendation engine
# ---------------------------------------------------------------------------

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


@pytest.fixture()
def rec_config(monkeypatch):
    """Set automated_migrations.rules for generate_recommendations."""
    from proxbalance import recommendations

    def set_rules(rules):
        monkeypatch.setattr(recommendations, "load_config",
                            lambda: {"automated_migrations": {"rules": rules}})
    set_rules({})
    return set_rules


def _recs(guests, **kw):
    from proxbalance.recommendations import generate_recommendations
    out = generate_recommendations(_cluster(guests), guests, maintenance_nodes={"lyra"}, **kw)
    return {str(r["vmid"]): r for r in out["recommendations"]}


def test_hard_anti_affinity_blocks_target(tmp_db, rec_config):
    plain = {"100": _guest(100, "lyra", cpu=80, mem=4), "101": _guest(101, "rigel", "ignore")}
    assert _recs(plain)["100"]["target_node"] == "rigel"
    tagged = {"100": _guest(100, "lyra", "exclude_db", cpu=80, mem=4),
              "101": _guest(101, "rigel", "exclude_db", "ignore")}
    assert _recs(tagged)["100"]["target_node"] == "vega"
    pooled = {"100": _guest(100, "lyra", cpu=80, mem=4, pool="db"),
              "101": _guest(101, "rigel", "ignore", pool="db")}
    rec_config({"pool_rules": {"db": "anti-affinity"}})
    assert _recs(pooled)["100"]["target_node"] == "vega"


def test_soft_affinity_lowers_score_but_allows(tmp_db, rec_config):
    # 101 stays on lyra (ignored); moving 100 away splits the soft group.
    base = {"100": _guest(100, "lyra", cpu=80, mem=4), "101": _guest(101, "lyra", "ignore")}
    soft = {"100": _guest(100, "lyra", "affinity_web", cpu=80, mem=4),
            "101": _guest(101, "lyra", "affinity_web", "ignore")}
    rec_config({"affinity_soft_penalty": 25})
    before, after = _recs(base)["100"], _recs(soft)["100"]
    assert after["target_node"] == before["target_node"] == "rigel"
    assert after["target_node_score"] == pytest.approx(before["target_node_score"] + 25, abs=0.02)
    assert after["affinity_split"] == ["affinity_web"]
    rec_config({"affinity_soft_penalty": 25, "respect_affinity_rules": False})
    assert "affinity_split" not in _recs(soft)["100"]


def test_required_group_gets_companions_soft_group_does_not(tmp_db, rec_config):
    def cluster(tag):
        return {"100": _guest(100, "lyra", tag, cpu=80, mem=4),
                "102": _guest(102, "vega", tag)}
    required = _recs(cluster("affinity_req_web"))
    assert required["102"]["target_node"] == required["100"]["target_node"] == "rigel"
    assert required["102"]["affinity_group"] == "affinity_web"
    assert required["102"]["affinity_leader_vmid"] == 100
    assert required["100"]["affinity_companions"] == [102]
    soft = _recs(cluster("affinity_web"))
    assert "102" not in soft and "affinity_companions" not in soft["100"]


def test_required_pool_group_gets_companions(tmp_db, rec_config):
    rec_config({"pool_rules": {"web": {"type": "affinity", "required": True}}})
    guests = {"100": _guest(100, "lyra", cpu=80, mem=4, pool="web"), "102": _guest(102, "vega", pool="web")}
    recs = _recs(guests)
    assert recs["102"]["target_node"] == recs["100"]["target_node"]


# ---------------------------------------------------------------------------
# Automated migrations
# ---------------------------------------------------------------------------

def test_automigrate_companions_only_for_required_groups():
    import automigrate
    soft = {"guests": {"1": _guest(1, "lyra", "affinity_web"), "2": _guest(2, "lyra", "affinity_web")}}
    assert automigrate.get_affinity_companions(soft["guests"]["1"], "rigel", soft, {}) == []
    req = {"guests": {"1": _guest(1, "lyra", "affinity_web"), "2": _guest(2, "lyra", "affinity_req_web")}}
    comps = automigrate.get_affinity_companions(req["guests"]["1"], "rigel", req, {})
    assert [c["vmid"] for c in comps] == [2] and comps[0]["affinity_group"] == "affinity_web"
    assert automigrate.get_affinity_companions(req["guests"]["1"], "rigel", req,
                                               {"respect_affinity_rules": False}) == []


def test_automigrate_anti_affinity_covers_pools():
    import automigrate
    cache = {"guests": {"1": _guest(1, "lyra", pool="db"), "2": _guest(2, "rigel", pool="db")},
             "pools_available": True}
    rules = {"pool_rules": {"db": "anti-affinity"}}
    ok, reason = automigrate.check_exclude_group_affinity(cache["guests"]["1"], "rigel", cache, rules)
    assert not ok and "db" in reason
    assert automigrate.check_exclude_group_affinity(cache["guests"]["1"], "vega", cache, rules)[0]
    tagged = {"guests": {"1": _guest(1, "lyra", "exclude_db"), "2": _guest(2, "rigel", "exclude_db")}}
    assert not automigrate.check_exclude_group_affinity(tagged["guests"]["1"], "rigel", tagged, {})[0]


# ---------------------------------------------------------------------------
# Enforce rules now
# ---------------------------------------------------------------------------

def _violating():
    guests = {
        # Hard: two exclude_dns guests share lyra.
        "201": _guest(201, "lyra", "exclude_dns", mem=2),
        "202": _guest(202, "lyra", "exclude_dns", mem=1),
        "203": _guest(203, "rigel", "exclude_dns", mem=1),
        # Hard: required group split across rigel / vega (two on vega).
        "301": _guest(301, "rigel", "affinity_req_app"),
        "302": _guest(302, "vega", "affinity_req_app"),
        "303": _guest(303, "vega", "affinity_req_app"),
        # Soft: split, but never enforced.
        "401": _guest(401, "lyra", "affinity_web"),
        "402": _guest(402, "rigel", "affinity_web"),
    }
    nodes = {n: _node(n, 20, []) for n in ("lyra", "rigel", "vega")}
    for k, g in guests.items():
        nodes[g["node"]]["guests"].append(int(k))
    return nodes, guests


def test_enforce_plan_lists_only_hard_violations():
    nodes, guests = _violating()
    rules = pr.build_rules(guests)
    plan = pr.plan_enforcement(nodes, guests, rules)
    assert sorted(v["name"] for v in plan["violations"]) == ["affinity_app", "exclude_dns"]
    moves = {m["vmid"]: m for m in plan["moves"]}
    assert set(moves) == {202, 301}
    # The bigger dns guest stays; the other leaves for the node without a member.
    assert moves[202]["source_node"] == "lyra" and moves[202]["target_node"] == "vega"
    assert moves[301]["target_node"] == "vega"
    assert plan["unresolved"] == []
    assert not any(m["rule"] == "affinity_web" for m in plan["moves"])


def test_enforce_plan_reports_unfixable():
    nodes, guests = _violating()
    guests["202"] = _guest(202, "lyra", "exclude_dns", "ignore", mem=1)
    guests["201"] = _guest(201, "lyra", "exclude_dns", "ignore", mem=2)
    plan = pr.plan_enforcement(nodes, guests, pr.build_rules(guests))
    assert [u["vmid"] for u in plan["unresolved"]] == [202]
    assert "ignore" in plan["unresolved"][0]["reason"]


class _FakeCache:
    def __init__(self, data):
        self.data = data

    def get(self):
        return self.data


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from proxbalance import config_manager
    from proxbalance.routes import rules as rules_routes
    nodes, guests = _violating()
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps({"automated_migrations": {"dry_run": True, "rules": {}}}))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    monkeypatch.setattr(rules_routes, "load_config", lambda: json.loads(cfg.read_text()))
    monkeypatch.setattr(rules_routes, "load_penalty_config", lambda: None)
    app = Flask(__name__)
    app.config["cache_manager"] = _FakeCache({"nodes": nodes, "guests": guests})
    app.register_blueprint(rules_routes.rules_bp)
    c = app.test_client()
    c.cfg = cfg
    return c


def test_rules_endpoint_marks_hard_and_soft(client):
    body = client.get("/api/placement-rules").get_json()
    by_name = {r["name"]: r for r in body["rules"]}
    assert by_name["exclude_dns"]["hard"] and not by_name["exclude_dns"]["ok"]
    assert by_name["affinity_app"]["hard"] and by_name["affinity_app"]["required"]
    assert not by_name["affinity_web"]["hard"] and not by_name["affinity_web"]["ok"]
    assert body["violations"] == 2


def test_enforce_endpoint_respects_dry_run(client, monkeypatch):
    plan = client.get("/api/placement-rules/enforce-plan").get_json()
    assert {m["vmid"] for m in plan["moves"]} == {202, 301} and plan["dry_run"] is True
    assert plan["execution_plan"]["total_steps"] == 2

    import proxbalance.migrations as migrations
    monkeypatch.setattr(migrations, "execute_batch_migration",
                        lambda *a, **k: pytest.fail("dry run must not migrate"))
    r = client.post("/api/placement-rules/enforce", json={"vmids": [202, 999]})
    body = r.get_json()
    assert r.status_code == 200 and body["dry_run"] is True
    assert [m["vmid"] for m in body["moves"]] == [202] and body["dropped"] == ["999"]
    assert client.post("/api/placement-rules/enforce", json={}).status_code == 400


def test_enforce_endpoint_runs_confirmed_moves(client, monkeypatch):
    from proxbalance.routes import rules as rules_routes
    client.cfg.write_text(json.dumps({"automated_migrations": {"dry_run": False, "rules": {}}}))
    monkeypatch.setattr(rules_routes, "get_proxmox_client", lambda *a, **k: object())
    sent = []
    import proxbalance.migrations as migrations

    def fake_batch(proxmox, batch):
        sent.extend(batch)
        return {"success": True, "results": [], "succeeded": len(batch)}, 200
    monkeypatch.setattr(migrations, "execute_batch_migration", fake_batch)
    body = client.post("/api/placement-rules/enforce", json={"vmids": [202, 301]}).get_json()
    assert body["dry_run"] is False
    assert sorted((m["vmid"], m["target_node"]) for m in sent) == [(202, "vega"), (301, "vega")]
