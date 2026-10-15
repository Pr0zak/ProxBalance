"""VM PCI/USB passthrough pins a guest to its host; container dev nodes do not."""

import collector_api
from proxbalance.failure_sim import restart_blocker
from proxbalance.placement_rules import _movable


def _collector():
    return object.__new__(collector_api.ProxmoxAPICollector)


def _local_disks(config, guest_type="VM"):
    col = _collector()
    return col.pin_for_passthrough_devices(
        col.detect_local_disks(config), col.detect_passthrough_devices(config), guest_type)


def test_hostpci_only_vm_is_pinned():
    ld = _local_disks({"scsi0": "nas:vm-101-disk-0,size=32G", "hostpci0": "0000:00:02.0,pcie=1"})
    assert ld["is_pinned"] is True
    assert ld["pinned_reason"] == "PCI passthrough (hostpci0)"
    assert ld["pinned_devices"] == ["hostpci0"]
    # has_passthrough and the disk counts still describe disks only.
    assert ld["has_passthrough"] is False
    assert ld["total_pinned_disks"] == 0


def test_spice_usb_is_not_pinned():
    ld = _local_disks({"scsi0": "nas:vm-102-disk-0,size=32G", "usb0": "spice"})
    assert ld["is_pinned"] is False
    assert ld["pinned_reason"] is None
    assert ld["pinned_devices"] == []


def test_host_usb_is_pinned():
    ld = _local_disks({"usb0": "spice", "usb1": "host=1234:5678,usb3=1"})
    assert ld["is_pinned"] is True
    assert ld["pinned_reason"] == "USB passthrough (usb1)"


def test_container_dev_is_not_pinned():
    config = {"rootfs": "local-lvm:vm-244-disk-0,size=32G", "dev0": "/dev/dri/renderD128,gid=992"}
    ld = _local_disks(config, guest_type="CT")
    assert ld["is_pinned"] is False
    assert ld["pinned_reason"] is None
    # Still listed as passthrough hardware for the failure simulation.
    assert _collector().detect_passthrough_devices(config) == [{"key": "dev0", "device": "/dev/dri/renderD128"}]


def test_passthrough_disk_still_pinned_with_old_reason():
    ld = _local_disks({"scsi1": "/dev/disk/by-id/ata-disk1,backup=0"})
    assert ld["is_pinned"] is True
    assert ld["has_passthrough"] is True
    assert ld["pinned_reason"] == "Hardware passthrough disks"
    assert ld["total_pinned_disks"] == 1


def test_disk_pci_and_usb_reasons_combine():
    ld = _local_disks({
        "scsi1": "/dev/disk/by-id/ata-disk1",
        "hostpci0": "0000:01:00.0", "hostpci1": "0000:02:00.0",
        "usb0": "host=1-2",
    })
    assert ld["pinned_reason"] == ("Hardware passthrough disks, PCI passthrough (hostpci0, hostpci1)"
                                   " and USB passthrough (usb0)")
    assert ld["pinned_reasons"] == ["Hardware passthrough disks", "PCI passthrough (hostpci0, hostpci1)",
                                    "USB passthrough (usb0)"]


def test_failure_sim_reports_pci_pin_once_as_hardware():
    config = {"scsi0": "nas:vm-101-disk-0", "hostpci0": "0000:00:02.0"}
    guest = {"type": "VM", "local_disks": _local_disks(config),
             "passthrough_devices": _collector().detect_passthrough_devices(config)}
    assert restart_blocker(guest, set()) == "passthrough hardware (hostpci0)"


def test_placement_rules_names_pci_reason():
    guest = {"type": "VM", "tags": {}, "local_disks": _local_disks({"hostpci0": "0000:00:02.0"})}
    assert _movable(guest) == "has PCI passthrough (hostpci0)"
