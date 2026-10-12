// Pure helpers for the "What if a node fails?" card and the node panel line.
// Inputs are /api/simulate/node-failure responses (see proxbalance/failure_sim.py).

export const STORAGE_KEY = 'failureSimStorage';
export const ROUTE_PREFIX = 'failure-';

/** Remembered storage mode ('strict' | 'capacity'); per-viewer nicety only. */
export function readStorageMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'capacity' ? 'capacity' : 'strict';
  } catch { return 'strict'; }
}

export function writeStorageMode(mode) {
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* per-viewer nicety only */ }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const fmtGb = (gb) => (typeof gb !== 'number' ? '—' : gb >= 10 ? `${Math.round(gb)} GB` : gb > 0 && gb < 0.05 ? '<0.1 GB' : `${gb.toFixed(1)} GB`);

/**
 * N-1 chip for a node from the all-nodes summary row:
 * green "can fail", amber "tight" / "N can't restart", red "N left out".
 */
export function n1Chip(row) {
  if (!row) return { label: '—', tone: 'gray' };
  switch (row.status) {
    case 'ok': return { label: 'can fail', tone: 'green' };
    case 'tight': return { label: 'tight', tone: 'yellow' };
    case 'stranded': return { label: `${row.cant_restart} can't restart`, tone: 'yellow' };
    case 'short': return { label: `${row.doesnt_fit} left out`, tone: 'red' };
    case 'offline': return { label: 'offline', tone: 'gray' };
    default: return { label: '—', tone: 'gray' };
  }
}

/** The node the card opens on: a routed pick, else the worst result, else the first. */
export function defaultNode(summaryRows, routed) {
  const rows = summaryRows || [];
  if (routed && rows.some(r => r.node === routed)) return routed;
  const rank = { short: 0, stranded: 1, tight: 2, ok: 3, offline: 4 };
  const online = rows.filter(r => r.status !== 'offline');
  if (!online.length) return rows[0]?.node || null;
  return online.slice().sort((a, b) => (rank[a.status] ?? 5) - (rank[b.status] ?? 5))[0].node;
}

/**
 * Short verdict without the node name, for "If pve4 fails: …".
 * Returns null when there is nothing to say (no result or node offline).
 */
export function shortVerdict(res) {
  if (!res || res.status === 'offline') return null;
  const placed = (res.placements || []).length;
  const stuck = (res.cant_restart || []).length;
  const nofit = res.doesnt_fit || [];
  if (!placed && !stuck && !nofit.length) return 'nothing running here needs a new home';
  if (nofit.length) {
    const gb = nofit.reduce((t, g) => t + (g.mem_gb || 0), 0);
    return `${plural(nofit.length, 'guest')} (${fmtGb(gb)}) ${nofit.length === 1 ? "doesn't" : "don't"} fit elsewhere`
      + (stuck ? `, ${stuck} can't restart elsewhere` : '');
  }
  const busiest = res.busiest && placed ? `busiest node ${res.busiest.node} at ${Math.round(res.busiest.mem_after)}% memory` : '';
  if (stuck) {
    return placed
      ? `${plural(placed, 'guest')} restart${placed === 1 ? 's' : ''} elsewhere, ${stuck} can't`
      : `${stuck === 1 ? 'its guest' : `all ${stuck} guests`} can't restart elsewhere`;
  }
  return `${placed === 1 ? 'its guest restarts' : `all ${placed} guests restart`} elsewhere${busiest ? `, ${busiest}` : ''}`;
}

/** Tone for the short verdict line. */
export function verdictTone(res) {
  if (!res) return 'gray';
  return { short: 'red', stranded: 'yellow', tight: 'yellow', ok: 'green' }[res.status] || 'gray';
}

/**
 * Bar segments for one survivor: memory before, the share added by the
 * failure (both as % of RAM, clamped to 100), and the ceiling marker.
 */
export function memBar(n, ceiling = 95) {
  const before = Math.max(0, Math.min(100, n?.mem_before ?? 0));
  const after = Math.max(before, Math.min(100, n?.mem_after ?? before));
  return { before, added: after - before, after, ceiling };
}

export { fmtGb };
