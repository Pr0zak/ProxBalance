"""Per-run cap on migrations into one target node (max_target_inflow_per_cycle)."""

import json

import pytest
from flask import Flask

from proxbalance import config_manager
from proxbalance.inflow_cap import (
    SKIP_CODE,
    apply_target_inflow_cap,
    get_target_inflow_cap,
    inflow_cap_reason,
    select_with_target_inflow_cap,
    validate_target_inflow_cap,
)


def rec(vmid, target, source="pve4"):
    return {"vmid": vmid, "name": f"guest-{vmid}", "source_node": source, "target_node": target}


# ---------------------------------------------------------------- selection

def test_cap_one_three_recs_same_target_only_first_executes():
    recs = [rec(101, "pve5"), rec(102, "pve5"), rec(103, "pve5")]
    selected, capped = select_with_target_inflow_cap(recs, cap=1)
    assert [r["vmid"] for r in selected] == [101]
    assert [r["vmid"] for r, _ in capped] == [102, 103]
    for _, reason in capped:
        assert reason.startswith("Target inflow cap: pve5 already received 1 migration this run")
        assert "max 1" in reason


def test_cap_zero_is_unlimited():
    recs = [rec(101, "pve5"), rec(102, "pve5"), rec(103, "pve5")]
    selected, capped = select_with_target_inflow_cap(recs, cap=0)
    assert [r["vmid"] for r in selected] == [101, 102, 103]
    assert capped == []


def test_different_targets_unaffected():
    recs = [rec(101, "pve5"), rec(102, "pve6"), rec(103, "pve3"), rec(104, "pve5")]
    selected, capped = select_with_target_inflow_cap(recs, cap=1)
    assert [r["vmid"] for r in selected] == [101, 102, 103]
    assert [r["vmid"] for r, _ in capped] == [104]


def test_cap_two_and_max_selected():
    recs = [rec(i, "pve5") for i in range(1, 5)] + [rec(9, "pve6")]
    selected, capped = select_with_target_inflow_cap(recs, cap=2, max_selected=3)
    # Two into pve5, the next two pve5 moves are capped, then pve6 fills slot 3.
    assert [r["vmid"] for r in selected] == [1, 2, 9]
    assert [r["vmid"] for r, _ in capped] == [3, 4]


def test_apply_respects_inflow_already_sent_this_run():
    """The automation loop applies the cap one slot at a time with running counts."""
    recs = [rec(102, "pve5"), rec(103, "pve6")]
    allowed, capped = apply_target_inflow_cap(recs, {"pve5": 1}, cap=1)
    assert [r["vmid"] for r in allowed] == [103]
    assert capped[0][0]["vmid"] == 102
    assert capped[0][1] == inflow_cap_reason("pve5", 1, 1)

    allowed, capped = apply_target_inflow_cap(recs, {"pve5": 1}, cap=0)
    assert [r["vmid"] for r in allowed] == [102, 103]
    assert capped == []


def test_automation_loop_simulation():
    """Mimic automigrate: regenerate (same list), filter, take the first, count."""
    pool = [rec(101, "pve5"), rec(102, "pve5"), rec(103, "pve5"), rec(104, "pve6")]
    inflow = {}
    executed, skip_reasons = [], {}
    for _ in range(3):  # max_migrations_per_run = 3
        remaining = [r for r in pool if r["vmid"] not in executed]
        allowed, capped = apply_target_inflow_cap(remaining, inflow, cap=1)
        for r, reason in capped:
            skip_reasons[r["vmid"]] = reason
        if not allowed:
            break
        pick = allowed[0]
        executed.append(pick["vmid"])
        inflow[pick["target_node"]] = inflow.get(pick["target_node"], 0) + 1
    assert executed == [101, 104]
    assert set(skip_reasons) == {102, 103}
    assert SKIP_CODE == "target_inflow_cap"


# ---------------------------------------------------------------- config

@pytest.mark.parametrize("value,expected", [(0, 0), (1, 1), (5, 5), ("3", 3), (2.0, 2)])
def test_validate_accepts_range(value, expected):
    assert validate_target_inflow_cap(value) == expected


@pytest.mark.parametrize("value", [-1, 6, 100, 1.5, "abc", None, True, [], {}])
def test_validate_rejects_out_of_range_and_non_integers(value):
    with pytest.raises(ValueError):
        validate_target_inflow_cap(value)


@pytest.mark.parametrize("rules,expected", [
    (None, 0), ({}, 0), ({"max_target_inflow_per_cycle": 2}, 2),
    ({"max_target_inflow_per_cycle": 99}, 5), ({"max_target_inflow_per_cycle": -3}, 0),
    ({"max_target_inflow_per_cycle": "junk"}, 0), ({"max_target_inflow_per_cycle": True}, 0),
])
def test_runtime_read_is_lenient(rules, expected):
    assert get_target_inflow_cap(rules) == expected


def test_example_config_ships_cap_off():
    with open("config.example.json") as fh:
        example = json.load(fh)
    assert example["automated_migrations"]["rules"]["max_target_inflow_per_cycle"] == 0


@pytest.fixture()
def client(tmp_path, monkeypatch):
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps({"proxmox_host": "h", "automated_migrations": {"rules": {"max_migrations_per_run": 3}}}))
    monkeypatch.setattr(config_manager, "CONFIG_FILE", str(cfg))
    from proxbalance.routes.automation import automation_bp
    app = Flask(__name__)
    app.register_blueprint(automation_bp)
    return app.test_client(), cfg


@pytest.mark.parametrize("bad", [6, -1, "x", 2.5])
def test_api_rejects_invalid_cap(client, bad):
    c, cfg = client
    r = c.post("/api/automigrate/config", json={"rules": {"max_target_inflow_per_cycle": bad}})
    assert r.status_code == 400
    assert "max_target_inflow_per_cycle" in r.get_json()["error"]
    assert "max_target_inflow_per_cycle" not in json.loads(cfg.read_text())["automated_migrations"]["rules"]


def test_api_saves_valid_cap(client):
    c, cfg = client
    r = c.post("/api/automigrate/config", json={"rules": {"max_migrations_per_run": 3, "max_target_inflow_per_cycle": "2"}})
    assert r.status_code == 200, r.get_json()
    rules = json.loads(cfg.read_text())["automated_migrations"]["rules"]
    assert rules["max_target_inflow_per_cycle"] == 2
