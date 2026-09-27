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
  ha:        { label: 'HA / CRS',    color: 'blue',   rank: 4 },
  ignored:   { label: 'Ignored',     color: 'gray',   rank: 5 },
  stopped:   { label: 'Stopped',     color: 'gray',   rank: 6 },
};

// Display order for the counting strip
export const MOBILITY_ORDER = ['movable', 'suggested', 'manual', 'pinned', 'ha', 'ignored', 'stopped'];

// Short "why" shown next to each blocked verdict (the full sentence is the tooltip)
const BLOCK_HINT = {
  pinned: 'passthrough disk',
  manual: 'unshared bind mount',
  ha: 'Proxmox CRS places it',
  ignored: "'ignore' tag",
  stopped: 'moves on evacuation only',
};

// Guest memory at or above this reads as "hot" in the table, so the verdict
// explains why that alone does not make ProxBalance move it.
const HOT_GUEST_MEM_PCT = 80;

function formatGb(gb) {
  if (gb == null) return '?';
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
}

/**
 * Short, precise hint for an eligible guest the engine chose not to move.
 * Uses the numbers in the engine's own sentence where it has them, so the
 * row says exactly which gate held it back.
 */
function softHint(skipped) {
  if (!skipped) return null;
  const node = skipped.node || 'node';
  switch (skipped.reason) {
    case 'source_memory_healthy': {
      const m = /memory \((\d+)%\) is below migration floor \((\d+)%\)/.exec(skipped.detail || '');
      return m ? `${node} mem ${m[1]}% < ${m[2]}% floor` : `${node} below trigger`;
    }
    case 'seasonal_baseline':
      return `${node} load normal for this hour`;
    case 'insufficient_improvement':
      return 'gain too small';
    case 'no_suitable_target':
      return 'no node can take it';
    default:
      return null;
  }
}

/**
 * @param {object} g        guest from data.guests
 * @param {object} rec      current recommendation for this guest, if any
 * @param {object} skipped  engine skip entry for this guest, if any
 * @returns {{key, label, color, rank, detail, hint, rec}}
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
  let hint = null;
  if (rec) {
    key = 'suggested';
    detail = `Suggested now: ${rec.source_node} → ${rec.target_node}. Click Move to review it.`;
  } else if (pinned) {
    key = 'pinned';
    detail = engine('passthrough_disk') || 'Passthrough or local disk hardware — cannot migrate, not even for maintenance.';
  } else if (bind) {
    key = 'manual';
    detail = engine('unshared_bind_mount') || 'Unshared bind mount — only moves with --restart after checking the path exists on the target node.';
  } else if (ha) {
    key = 'ha';
    detail = engine('ha_managed') || 'HA-managed — Proxmox CRS controls where it runs.';
  } else if (ignored) {
    key = 'ignored';
    detail = "Has the 'ignore' tag — skipped unless its node is being evacuated.";
  } else if (stopped) {
    key = 'stopped';
    detail = 'Not running — only moved when its node is evacuated.';
  } else {
    key = 'movable';
    hint = softHint(skipped);
    detail = skipped?.detail || 'Eligible — ProxBalance will move it when its node needs relief.';
  }

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
    pinned && key !== 'pinned' && 'pinned hardware',
    bind && key !== 'manual' && 'unshared bind mount',
    ha && key !== 'ha' && 'HA-managed',
    ignored && key !== 'ignored' && "'ignore' tag",
    stopped && key !== 'stopped' && 'stopped',
  ].filter(Boolean);
  if (also.length) detail += `\nAlso: ${also.join(', ')}.`;
  if (!hint) hint = BLOCK_HINT[key] || null;

  return { key, ...MOBILITY[key], detail, hint, rec: rec || null };
}
