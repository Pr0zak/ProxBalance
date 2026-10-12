"""Target storage projection (proxbalance/storage_projection.py)."""

import pytest

import automigrate
from proxbalance.storage_projection import (
    LEVEL_CRITICAL,
    LEVEL_OK,
    LEVEL_WARNING,
    LEVEL_WONT_FIT,
    SKIP_CODE,
    annotate_target_storage,
    format_storage_line,
    parse_guest_disks,
    parse_size_gb,
    project_target_storage,
    worst_level,
)


def node(*storages):
    return {"status": "online", "storage": list(storages)}


def store(sid, total, used, shared=False, stype="lvmthin", avail=None, **extra):
    s = {"storage": sid, "type": stype, "active": True, "shared": shared,
         "total_gb": total, "used_gb": used, "avail_gb": total - used if avail is None else avail}
    s.update(extra)
    return s


def guest(vmid, node_name, *disks):
    return {"vmid": vmid, "node": node_name,
            "disks": [{"key": f"scsi{i}", "storage": sid, "volume": f"vm-{vmid}-disk-{i}", "size_gb": size}
                      for i, (sid, size) in enumerate(disks)]}


# 100 GB local-lvm on pve6 at 85%; a 10 GB disk adds 10 points.
NODES = {
    "pve5": node(store("local-lvm", 100, 20)),
    "pve6": node(store("local-lvm", 100, 85), store("nfs-share", 1000, 990, shared=True, stype="nfs")),
}


def test_local_disk_onto_85pct_storage_plus_10pct_is_critical():
    entries = project_target_storage(guest(101, "pve5", ("local-lvm", 10)), "pve6", NODES)
    assert len(entries) == 1
    e = entries[0]
    assert e["storage"] == "local-lvm" and e["node"] == "pve6"
    assert e["used_before_pct"] == 85.0
    assert e["used_after_pct"] == 95.0
    assert e["level"] == LEVEL_CRITICAL
    assert format_storage_line(e) == "local-lvm on pve6: 85% → 95%"


def test_shared_storage_is_never_flagged():
    g = guest(102, "pve5", ("nfs-share", 500))
    assert project_target_storage(g, "pve6", NODES) == []


def test_shared_type_fallback_when_flag_missing():
    nodes = {"pve6": node({"storage": "PBS9000", "type": "pbs", "active": True,
                           "total_gb": 100, "used_gb": 99, "avail_gb": 1})}
    assert project_target_storage(guest(103, "pve5", ("PBS9000", 50)), "pve6", nodes) == []


def test_wont_fit():
    entries = project_target_storage(guest(104, "pve5", ("local-lvm", 20)), "pve6", NODES)
    assert entries[0]["level"] == LEVEL_WONT_FIT
    assert entries[0]["used_after_pct"] == 105.0
    assert "20 GB won't fit" in format_storage_line(entries[0])


def test_wont_fit_when_free_space_is_short_even_under_100pct():
    # Directory storage: reserved blocks leave less free space than total - used.
    nodes = {"pve6": node(store("local", 100, 50, stype="dir", avail=5))}
    entries = project_target_storage(guest(105, "pve5", ("local", 10)), "pve6", nodes)
    assert entries[0]["used_after_pct"] == 60.0
    assert entries[0]["level"] == LEVEL_WONT_FIT


def test_two_pending_moves_stack():
    nodes = {"pve6": node(store("local-lvm", 100, 60))}
    first = guest(201, "pve5", ("local-lvm", 15))
    second = guest(202, "pve4", ("local-lvm", 10))
    me = guest(203, "pve5", ("local-lvm", 10))
    alone = project_target_storage(me, "pve6", nodes)
    assert alone[0]["used_after_pct"] == 70.0 and alone[0]["level"] == LEVEL_OK
    stacked = project_target_storage(me, "pve6", nodes, pending=[first, second])
    assert stacked[0]["pending_gb"] == 25.0
    assert stacked[0]["used_before_pct"] == 60.0
    assert stacked[0]["used_after_pct"] == 95.0
    assert stacked[0]["level"] == LEVEL_CRITICAL
    assert "incl. 25 GB from other planned moves" in format_storage_line(stacked[0])


def test_annotate_counts_earlier_recommendations_into_same_target():
    nodes = {"pve6": node(store("local-lvm", 100, 70)), "pve5": node(store("local-lvm", 100, 10))}
    guests = {"301": guest(301, "pve5", ("local-lvm", 8)), "302": guest(302, "pve5", ("local-lvm", 8))}
    recs = [{"vmid": 301, "target_node": "pve6"}, {"vmid": 302, "target_node": "pve6"}]
    annotate_target_storage(recs, nodes, guests)
    assert recs[0]["target_storage"][0]["used_after_pct"] == 78.0
    assert recs[0]["target_storage_level"] == LEVEL_OK
    assert recs[1]["target_storage"][0]["used_after_pct"] == 86.0
    assert recs[1]["target_storage_level"] == LEVEL_WARNING


def test_missing_storage_data_gives_no_entry_never_zero():
    g = guest(401, "pve5", ("local-lvm", 10))
    # Storage with no usage numbers, inactive storage, zero total, target unknown.
    for st in (
        {"storage": "local-lvm", "type": "lvmthin", "shared": False},
        store("local-lvm", 100, 50, active=False),
        store("local-lvm", 0, 0),
    ):
        assert project_target_storage(g, "pve6", {"pve6": node(st)}) == []
    assert project_target_storage(g, "pve9", NODES) == []
    # Guest without disk data (cache from an older collector) or unknown sizes.
    assert project_target_storage({"vmid": 402, "node": "pve5"}, "pve6", NODES) == []
    assert project_target_storage(guest(403, "pve5", ("local-lvm", None)), "pve6", NODES) == []
    # Storage id the target doesn't have: compatibility check's job, not ours.
    assert project_target_storage(guest(404, "pve5", ("zfs-local", 10)), "pve6", NODES) == []
    assert worst_level([]) is None


def test_guest_already_on_target_is_empty():
    assert project_target_storage(guest(501, "pve6", ("local-lvm", 10)), "pve6", NODES) == []


def test_multiple_disks_on_one_storage_are_summed():
    g = guest(601, "pve5", ("local-lvm", 3), ("local-lvm", 2), ("nfs-share", 100))
    entries = project_target_storage(g, "pve6", NODES)
    assert [e["storage"] for e in entries] == ["local-lvm"]
    assert entries[0]["size_gb"] == 5.0
    assert entries[0]["level"] == LEVEL_WARNING


def test_parse_guest_disks():
    cfg = {
        "rootfs": "local-lvm-2t:vm-100-disk-1,size=8G",
        "mp0": "/nfs/VIDEO/,mp=/mnt/VIDEO,shared=1",
        "mp1": "local-lvm:vm-100-disk-2,mp=/data,size=512M",
        "scsi9": "/dev/disk/by-id/wwn-0x5000c50074444b35,size=13039G",
        "ide2": "Images:iso/debian.iso,media=cdrom",
        "ide0": "none,media=cdrom",
        "efidisk0": "local-lvm:vm-106-disk-0,efitype=4m,size=4M",
        "unused0": "local-lvm:vm-106-disk-9",
        "scsihw": "virtio-scsi-pci",
        "net0": "virtio=AA:BB,bridge=vmbr0",
    }
    disks = {d["key"]: d for d in parse_guest_disks(cfg)}
    assert set(disks) == {"rootfs", "mp1", "efidisk0", "unused0"}
    assert disks["rootfs"]["storage"] == "local-lvm-2t" and disks["rootfs"]["size_gb"] == 8.0
    assert disks["mp1"]["size_gb"] == 0.5
    assert disks["unused0"]["size_gb"] is None
    assert parse_size_gb("2T") == 2048.0
    assert parse_size_gb("bogus") is None


def test_automigrate_skips_wont_fit_and_warns_at_90():
    cache = {"nodes": NODES}
    ok, msg, warn = automigrate.check_target_storage_for_move(guest(701, "pve5", ("local-lvm", 20)), "pve6", cache)
    assert not ok and msg.startswith("Target storage full: local-lvm on pve6") and warn is None
    ok, msg, warn = automigrate.check_target_storage_for_move(guest(702, "pve5", ("local-lvm", 10)), "pve6", cache)
    assert ok and warn == "Target storage nearly full: local-lvm on pve6: 85% → 95%"
    ok, _, warn = automigrate.check_target_storage_for_move(guest(703, "pve5", ("nfs-share", 10)), "pve6", cache)
    assert ok and warn is None
    # Moves already made this run count.
    moved = [guest(704, "pve4", ("local-lvm", 10))]
    ok, msg, _ = automigrate.check_target_storage_for_move(guest(705, "pve5", ("local-lvm", 10)), "pve6", cache, moved)
    assert not ok
    assert SKIP_CODE == automigrate.TARGET_STORAGE_SKIP_CODE == "target_storage_full"


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


def test_recommendations_skip_full_target_and_attach_projection(tmp_db):
    from proxbalance.recommendations import generate_recommendations

    def rnode(name, cpu, guests, used):
        return {"name": name, "status": "online", "cpu_percent": cpu, "mem_percent": 40,
                "total_mem_gb": 32, "cpu_cores": 4, "guests": guests,
                "metrics": {"current_cpu": cpu, "current_mem": 40, "current_iowait": 0},
                "storage": [store("local-lvm", 100, used)]}
    guests = {"100": {"vmid": 100, "name": "app", "type": "VM", "node": "pve3", "status": "running",
                      "cpu_current": 80, "cpu_cores": 4, "mem_used_gb": 4, "mem_max_gb": 4,
                      "tags": {"has_ignore": False, "exclude_groups": [], "all_tags": []},
                      "disks": [{"key": "scsi0", "storage": "local-lvm", "volume": "vm-100-disk-0", "size_gb": 10}]}}
    roomy = {"pve3": rnode("pve3", 95, [100], 10), "pve5": rnode("pve5", 5, [], 50), "pve6": rnode("pve6", 30, [], 75)}
    rec = generate_recommendations(roomy, guests, maintenance_nodes={"pve3"})["recommendations"][0]
    assert rec["target_node"] == "pve5"
    assert rec["target_storage"] == [{"storage": "local-lvm", "node": "pve5", "size_gb": 10.0, "pending_gb": 0.0,
                                      "total_gb": 100.0, "used_before_pct": 50.0, "used_after_pct": 60.0,
                                      "level": LEVEL_OK}]
    full = dict(roomy, pve5=rnode("pve5", 5, [], 95))
    rec = generate_recommendations(full, guests, maintenance_nodes={"pve3"})["recommendations"][0]
    assert rec["target_node"] == "pve6"
    assert rec["target_storage_level"] == LEVEL_WARNING
