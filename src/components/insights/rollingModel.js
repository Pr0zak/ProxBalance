// Pure helpers for the "Rolling update plan" card.
// Input is a /api/rolling-update/plan response (see proxbalance/rolling_update.py).

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Status chip for one step. */
export function stepChip(step) {
  if (!step) return { label: '—', tone: 'gray' };
  switch (step.status) {
    case 'ok': return { label: 'ready', tone: 'green' };
    case 'tight': return { label: 'tight', tone: 'yellow' };
    case 'short': return { label: `${(step.doesnt_fit || []).length} don't fit`, tone: 'red' };
    case 'no_quorum': return { label: 'loses quorum', tone: 'red' };
    case 'offline': return { label: 'offline', tone: 'gray' };
    default: return { label: '—', tone: 'gray' };
  }
}

/** Short summary for a step header, without the node name. */
export function stepSummary(step) {
  if (!step) return '';
  if (step.status === 'offline') return 'offline, skipped';
  const parts = [];
  const moves = (step.moves || []).length;
  parts.push(moves ? plural(moves, 'move') : 'nothing to move');
  if (step.copy_gb) parts.push(`~${Math.round(step.copy_gb)} GB to copy`);
  const stop = (step.must_stop || []).length;
  if (stop) parts.push(`${stop} must shut down`);
  const nofit = (step.doesnt_fit || []).length;
  if (nofit) parts.push(`${nofit} don't fit`);
  return parts.join(' · ');
}

/** Steps with a problem open by default. */
export function stepOpenByDefault(step) {
  return !!step && (step.status === 'short' || step.status === 'no_quorum');
}

/** Tone for the quorum line. */
export function quorumTone(quorum) {
  if (!quorum) return 'gray';
  return quorum.all_ok ? 'green' : 'red';
}

/** Link that opens the node's panel on the dashboard, where maintenance lives. */
export function maintenanceHref(node) {
  return `#/dashboard/nodes/node/${encodeURIComponent(node)}`;
}

/** Busiest target that receives guests in a step, or null. */
export function busiestTarget(step) {
  const t = (step?.targets || []).filter(x => x.added);
  if (!t.length) return null;
  return t.reduce((a, b) => (b.mem_after > a.mem_after ? b : a));
}
