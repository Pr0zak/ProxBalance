/**
 * Per-guest "can ProxBalance move this?" verdict for the Guests table.
 *
 * Mirrors the engine's skip rules (proxbalance/recommendations.py) using the
 * fields the /api/cluster-analysis guest objects already carry, and borrows
 * the engine's own wording from recommendationData.skipped_guests when it is
 * available. Hard blockers are checked hardest-first so the verdict answers
 * "what stops this guest from moving", not merely "which rule the engine hit
 * first".
 */

export const MOBILITY = {
  suggested: { label: 'Suggested',   color: 'orange', rank: 0 },
  movable:   { label: 'Movable',     color: 'green',  rank: 1 },
  manual:    { label: 'Manual only', color: 'yellow', rank: 2 },
  pinned:    { label: 'Pinned',      color: 'red',    rank: 3 },
  ha:        { label: 'Proxmox HA',  color: 'blue',   rank: 4 },
  ignored:   { label: 'Ignored',     color: 'gray',   rank: 5 },
  stopped:   { label: 'Stopped',     color: 'gray',   rank: 6 },
};

// Display order for the counting strip
export const MOBILITY_ORDER = ['movable', 'suggested', 'manual', 'pinned', 'ha', 'ignored', 'stopped'];

// Plain one-line "why" for each blocked verdict; it leads the tooltip.
const BLOCK_HINT = {
  pinned: "Can't move: it uses passthrough or local hardware on its host",
  manual: 'Moves by hand only: a folder from its host is mounted into it',
  ha: 'Proxmox HA decides where it runs, not ProxBalance',
  ignored: "Won't move: it has the 'ignore' tag",
  stopped: 'Powered off: only moved when its node is emptied for maintenance',
};

// Guest memory at or above this reads as "hot" in the table, so the verdict
// explains why that alone does not make ProxBalance move it.
const HOT_GUEST_MEM_PCT = 80;

function formatGb(gb) {
  if (gb == null) return '?';
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
}

/**
 * Plain reason an eligible guest is staying put right now. Uses the numbers
 * in the engine's own sentence where it has them, so the tooltip says which
 * gate held it back without the engine's jargon ("floor", "baseline").
 */
function softHint(skipped) {
  if (!skipped) return null;
  const d = skipped.detail || '';
  const node = skipped.node || /Source node (\S+)/.exec(d)?.[1] || 'its node';
  switch (skipped.reason) {
    case 'source_memory_healthy': {
      const mem = /memory \((\d+)%\) is below migration floor \((\d+)%\)/.exec(d);
      const cpu = /CPU \((\d+)%\) is below threshold \((\d+)%\)/.exec(d);
      const parts = [
        mem && `memory ${mem[1]}%, moves start at ${mem[2]}%`,
        cpu && `CPU ${cpu[1]}%, moves start at ${cpu[2]}%`,
      ].filter(Boolean);
      return `Won't move now: ${node} is under the trigger${parts.length ? ` (${parts.join('; ')})` : ''}`;
    }
    case 'source_load_anchored': {
      const m = /but (\d+)% of it is guests that can't move/.exec(d);
      return `Won't move now: ${m ? `${m[1]}% of ` : 'most of '}${node}'s load is guests that can't move, so moving this one wouldn't help`;
    }
    case 'seasonal_baseline':
      return `Won't move now: ${node}'s load is normal for this time of day`;
    case 'insufficient_improvement':
      return "Won't move now: moving it wouldn't help enough";
    case 'no_suitable_target':
      return 'Won\'t move now: no other node has room for it';
    default:
      return null;
  }
}

/**
 * @param {object} g        guest from data.guests
 * @param {object} rec      current recommendation for this guest, if any
 * @param {object} skipped  engine skip entry for this guest, if any
 * @returns {{key, label, color, rank, detail, hint, rec}}  `detail` is the
 *   full plain-language tooltip; `hint` its first line.
 */
export function guestMobility(g, rec, skipped) {
  const pinned = !!g.local_disks?.is_pinned;
  const bind = g.type === 'CT' && !!g.mount_points?.has_unshared_bind_mount;
  const ha = !!g.ha_managed;
  const ignored = !!g.tags?.has_ignore;
  const stopped = g.status !== 'running';
  const engine = (reason) => (skipped?.reason === reason ? skipped.detail : null);

  let key;
  let detail;
  if (rec) {
    key = 'suggested';
    detail = `Suggested now: move it from ${rec.source_node} to ${rec.target_node}. Click Move to review.`;
  } else if (pinned) {
    key = 'pinned';
    detail = engine('passthrough_disk') || engine('passthrough_device') || 'It cannot migrate, not even when its node is emptied for maintenance.';
  } else if (bind) {
    key = 'manual';
    detail = engine('unshared_bind_mount') || "Proxmox won't migrate it while the folder mount is local: mark it shared once the folder exists on every node, or remove the mount, move it and add it back.";
  } else if (ha) {
    key = 'ha';
    detail = engine('ha_managed') || 'Proxmox HA (CRS) places it; ProxBalance leaves it alone.';
  } else if (ignored) {
    key = 'ignored';
    detail = 'ProxBalance skips it unless its node is emptied for maintenance.';
  } else if (stopped) {
    key = 'stopped';
    detail = 'Nothing to balance while it is off.';
  } else {
    key = 'movable';
    detail = 'ProxBalance can move it when its node needs relief.';
  }
  const hint = key === 'movable' ? softHint(skipped) : (BLOCK_HINT[key] || null);
  if (hint) detail = `${hint}.\n${detail}`;

  // A guest using most of its own RAM on a relaxed node looks alarming next
  // to "Movable". Say plainly that this is pressure inside the guest, which a
  // migration would not relieve.
  const memPct = g.mem_max_gb > 0 ? ((g.mem_used_gb || 0) / g.mem_max_gb) * 100 : null;
  if (!stopped && memPct != null && memPct >= HOT_GUEST_MEM_PCT && key !== 'suggested') {
    detail += `\nIts ${memPct.toFixed(0)}% memory use is inside its own ${formatGb(g.mem_max_gb)} allocation.`
      + ' ProxBalance moves guests to relieve the node, and moving this one would not change that figure'
      + ' — give it more RAM if it is short.';
  }

  const also = [
    pinned && key !== 'pinned' && 'uses host hardware',
    bind && key !== 'manual' && 'has a host folder mounted',
    ha && key !== 'ha' && 'managed by Proxmox HA',
    ignored && key !== 'ignored' && "has the 'ignore' tag",
    stopped && key !== 'stopped' && 'powered off',
  ].filter(Boolean);
  if (also.length) detail += `\nAlso: ${also.join(', ')}.`;

  return { key, ...MOBILITY[key], detail, hint, rec: rec || null };
}
