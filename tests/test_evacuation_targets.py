"""Evacuation executor honours the operator's per-guest target picks."""

import pytest

from proxbalance import evacuation

AVAILABLE = [
    {"node": "pve4", "cpu": 80.0, "mem": 80.0},  # busiest: auto-pick never chooses it
    {"node": "pve5", "cpu": 10.0, "mem": 10.0},  # idlest: auto-pick's favourite
    {"node": "pve6", "cpu": 40.0, "mem": 40.0},
]
STORAGE = {
    "pve4": {"local-lvm", "shared"},
    "pve5": {"local-lvm", "shared"},
    "pve6": {"shared"},  # no local-lvm
}


class _Node:
    """Minimal stand-in for proxmoxer's node/guest resource chain."""

    def __init__(self, api, name):
        self.api, self.name = api, name

    # proxmox.nodes(n).storage.get()
    @property
    def storage(self):
        api, name = self.api, self.name

        class _S:
            def get(self_inner):
                return [{"storage": s, "enabled": 1, "active": 1} for s in STORAGE.get(name, set())]
        return _S()

    def _guest(self, kind, vmid):
        api = self.api

        class _G:
            class config:
                @staticmethod
                def get():
                    if api.guests.get(vmid, ("", {}))[0] != kind:
                        raise Exception("not this type")
                    return api.guests[vmid][1]

            class migrate:
                @staticmethod
                def post(target, **kw):
                    api.migrations.append((vmid, target))
                    return f"UPID:{vmid}"
        return _G()

    def qemu(self, vmid):
        return self._guest("qemu", vmid)

    def lxc(self, vmid):
        return self._guest("lxc", vmid)

    def tasks(self, task_id):
        class _T:
            class status:
                @staticmethod
                def get():
                    return {"status": "stopped", "exitstatus": "OK"}
        return _T()


class FakeProxmox:
    def __init__(self, guests):
        self.guests = guests
        self.migrations = []

    def nodes(self, name):
        return _Node(self, name)


@pytest.fixture()
def run(monkeypatch):
    sessions = {}
    monkeypatch.setattr(evacuation, "_read_session", lambda sid: sessions.get(sid))
    monkeypatch.setattr(evacuation, "_write_session", lambda sid, data: sessions.__setitem__(sid, data))
    monkeypatch.setattr(evacuation, "trigger_collection", lambda: None)
    monkeypatch.setattr(evacuation.time, "sleep", lambda s: None)

    def _run(guests, guest_targets=None, target_node=None, actions=None):
        sessions["s"] = {"status": "starting", "progress": {"processed": 0, "successful": 0, "failed": 0}, "results": []}
        px = FakeProxmox(guests)
        evacuation._execute_evacuation(
            "s", "pve3", list(guests), AVAILABLE, actions or {}, px,
            guest_targets=guest_targets, target_node=target_node,
        )
        return px.migrations, sessions["s"]
    return _run


def test_per_guest_targets_are_honoured(run):
    guests = {
        101: ("lxc", {"rootfs": "local-lvm:subvol-101"}),
        102: ("qemu", {"scsi0": "shared:vm-102-disk-0"}),
    }
    moves, session = run(guests, guest_targets={"101": "pve4", "102": "pve6"})
    assert moves == [(101, "pve4"), (102, "pve6")]
    assert session["progress"]["failed"] == 0


def test_unpicked_guests_still_auto_select(run):
    guests = {
        101: ("lxc", {"rootfs": "local-lvm:subvol-101"}),
        102: ("qemu", {"scsi0": "shared:vm-102-disk-0"}),
    }
    moves, _ = run(guests, guest_targets={"102": "pve4"})
    assert moves == [(101, "pve5"), (102, "pve4")]


def test_pick_without_storage_fails_that_guest_only(run):
    guests = {
        101: ("lxc", {"rootfs": "local-lvm:subvol-101"}),  # pve6 lacks local-lvm
        102: ("qemu", {"scsi0": "shared:vm-102-disk-0"}),
    }
    moves, session = run(guests, guest_targets={"101": "pve6", "102": "pve6"})
    assert moves == [(102, "pve6")]  # 101 is NOT quietly sent to pve4/pve5
    failures = [r for r in session["results"] if not r.get("success")]
    assert len(failures) == 1 and failures[0]["vmid"] == 101
    assert "pve6" in failures[0]["error"] and "local-lvm" in failures[0]["error"]


def test_pick_of_unavailable_node_fails(run):
    guests = {101: ("lxc", {"rootfs": "shared:subvol-101"})}
    moves, session = run(guests, guest_targets={"101": "pve9"})
    assert moves == []
    assert session["results"][0]["success"] is False
    assert "pve9" in session["results"][0]["error"]


def test_forced_target_node_applies_when_no_pick(run):
    guests = {
        101: ("lxc", {"rootfs": "shared:subvol-101"}),
        102: ("qemu", {"scsi0": "shared:vm-102-disk-0"}),
    }
    moves, _ = run(guests, guest_targets={"102": "pve5"}, target_node="pve6")
    assert moves == [(101, "pve6"), (102, "pve5")]


def test_ignored_guest_is_not_moved_even_with_a_pick(run):
    guests = {101: ("lxc", {"rootfs": "shared:subvol-101"})}
    moves, session = run(guests, guest_targets={"101": "pve4"}, actions={"101": "ignore"})
    assert moves == []
    assert session["results"][0]["action"] == "ignored"
