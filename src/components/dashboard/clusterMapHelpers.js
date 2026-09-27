// Pure helpers for the Cluster Map: find-on-map matching, bubble sizing and
// the drag/tap "move preview" projections. No React in here.

// Quick filters for the find bar — each one is a guest predicate.
export const QUICK_FILTERS = [
  { id: 'blocked',  label: "Can't migrate",  test: g => !!(g.local_disks?.is_pinned || g.mount_points?.has_unshared_bind_mount) },
  { id: 'ignored',  label: 'Ignored',        test: g => !!g.tags?.has_ignore },
  { id: 'affinity', label: 'Affinity rules', test: g => (g.tags?.exclude_groups || []).length > 0 || (g.tags?.affinity_groups || []).length > 0 },
  { id: 'ha',       label: 'HA-managed',     test: g => !!g.ha_managed },
  { id: 'mounts',   label: 'Mount points',   test: g => !!g.mount_points?.has_mount_points },
];

// Free-text match on VMID, name, or any Proxmox tag. IPs are matched through
// tags because that is where this cluster (and most helper-script installs)
// records a guest's address — the collector has no other IP source.
export const matchesQuery = (g, q) => {
  if (!q) return true;
  if (String(g.vmid).includes(q)) return true;
  if ((g.name || '').toLowerCase().includes(q)) return true;
  return (g.tags?.all_tags || []).some(t => String(t).toLowerCase().includes(q));
};

// Value a guest bubble is sized by, for the active "View by" mode.
export const guestMetric = (g, mode) => {
  if (mode === 'memory') return g.mem_max_gb > 0 ? ((g.mem_used_gb || 0) / g.mem_max_gb) * 100 : 0;
  if (mode === 'allocated') return (g.cpu_cores || 0) + (g.mem_max_gb || 0);
  if (mode === 'disk_io') return ((g.disk_read_bps || 0) + (g.disk_write_bps || 0)) / (1024 * 1024);
  if (mode === 'network') return ((g.net_in_bps || 0) + (g.net_out_bps || 0)) / (1024 * 1024);
  return g.cpu_current || 0;
};

export const isVmType = (g) => {
  const t = (g.type || '').toUpperCase();
  return t === 'VM' || t === 'QEMU';
};

// ---------------------------------------------------------------------------
// Move preview
// ---------------------------------------------------------------------------

// Rough effect of one guest on a node's live load, from current usage only.
// Proxmox reports guest CPU relative to its own vCPUs, so convert to host cores.
export const guestLoad = (g) => {
  const running = g.status === 'running';
  return {
    cores: running ? (g.cpu_current || 0) / 100 * (g.cpu_cores || 0) : 0,
    memGb: running ? (g.mem_used_gb || 0) : 0,
    committedGb: running ? (g.mem_max_gb || 0) : 0,
  };
};

// Node load after adding (sign=+1) or removing (sign=-1) that guest load.
export const projectNode = (node, load, sign) => {
  const total = node.total_mem_gb || 0;
  const committed = node.committed_mem_gb != null
    ? Math.max(0, node.committed_mem_gb + sign * load.committedGb)
    : null;
  return {
    cpu: Math.max(0, (node.cpu_percent || 0) + sign * load.cores / (node.cpu_cores || 1) * 100),
    mem: total > 0 ? Math.max(0, (node.mem_percent || 0) + sign * load.memGb / total * 100) : (node.mem_percent || 0),
    committedPct: committed != null && total > 0 ? committed / total * 100 : null,
  };
};

export const CPU_WARN = 80;
export const MEM_WARN = 85;

// Things the operator should know before moving `guest` onto `target`.
// level: 'block' (drop refused) | 'warn' | 'info'
export const moveChecks = (guest, target, proj, allGuests, maintenanceNodes) => {
  const out = [];
  if (!guest || !target) return out;
  if (target.status !== 'online') out.push({ level: 'block', text: `${target.name} is offline` });
  if (maintenanceNodes && maintenanceNodes.has(target.name)) out.push({ level: 'block', text: `${target.name} is in maintenance mode` });
  if (guest.local_disks?.is_pinned) out.push({ level: 'block', text: `Pinned to its host: ${guest.local_disks.pinned_reason || 'local/passthrough disk'}` });

  const excl = guest.tags?.exclude_groups || [];
  const aff = guest.tags?.affinity_groups || [];
  allGuests.forEach(o => {
    if (o.vmid === guest.vmid) return;
    if (o.node === target.name) {
      const shared = (o.tags?.exclude_groups || []).filter(x => excl.includes(x));
      if (shared.length) out.push({ level: 'warn', text: `Anti-affinity: ${o.vmid} ${o.name || ''} (${shared.join(', ')}) already runs on ${target.name}` });
    } else if (o.node === guest.node) {
      const shared = (o.tags?.affinity_groups || []).filter(x => aff.includes(x));
      if (shared.length) out.push({ level: 'warn', text: `Affinity: splits it from ${o.vmid} ${o.name || ''} (${shared.join(', ')}), which stays on ${guest.node}` });
    }
  });

  if (proj) {
    if (proj.cpu > CPU_WARN) out.push({ level: 'warn', text: `CPU would reach about ${Math.round(proj.cpu)}% (over ${CPU_WARN}%)` });
    if (proj.mem > MEM_WARN) out.push({ level: 'warn', text: `Memory would reach about ${Math.round(proj.mem)}% (over ${MEM_WARN}%)` });
    if (proj.committedPct != null && proj.committedPct > 100) {
      out.push({ level: 'warn', text: `Overcommit: ${Math.round(proj.committedPct)}% of RAM would be allocated to running guests` });
    }
  }
  if (guest.mount_points?.has_unshared_bind_mount) {
    out.push({ level: 'warn', text: 'Unshared bind mount: the path must exist on the target, and the move needs a restart' });
  }
  if (guest.tags?.has_ignore) out.push({ level: 'info', text: 'Tagged "ignore": automation will leave it wherever you put it' });
  if (guest.ha_managed) out.push({ level: 'info', text: 'HA-managed: Proxmox CRS may rebalance it again later' });
  if (guest.status !== 'running') out.push({ level: 'info', text: 'Powered off: moves config and disks only, no live load' });
  return out;
};

// Everything the UI needs to render one node during a preview.
export const nodePreview = (node, guest, maintenanceNodes, allGuests) => {
  if (!guest) return null;
  const load = guestLoad(guest);
  if (node.name === guest.node) {
    return { role: 'source', ...projectNode(node, load, -1), checks: [], blocked: false, warn: false };
  }
  const proj = projectNode(node, load, +1);
  const checks = moveChecks(guest, node, proj, allGuests, maintenanceNodes);
  return {
    role: 'target',
    ...proj,
    checks,
    blocked: checks.some(c => c.level === 'block'),
    warn: checks.some(c => c.level === 'warn'),
  };
};

// Payload for the existing Confirm Migration dialog (same shape as a recommendation).
export const toConfirmMigration = (guest, targetNode) => ({
  vmid: guest.vmid,
  name: guest.name || `Guest ${guest.vmid}`,
  type: isVmType(guest) ? 'VM' : 'CT',
  source_node: guest.node,
  target_node: targetNode,
  mem_gb: guest.mem_max_gb || 0,
  reason: 'Manual move planned on the Cluster Map',
});
