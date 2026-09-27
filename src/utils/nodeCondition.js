/**
 * Node condition helpers shared by the Nodes table, the KPI row and the
 * "Needs attention" strip. All values come from /api/node-scores
 * (`suitability_rating` = headroom, `penalty_breakdown` = points per cause),
 * so every screen that names a node's biggest problem names the same one.
 */

// penalty_breakdown key → short cause, for chips and one-line summaries.
const PENALTY_LABELS = {
  current_cpu: 'CPU',
  sustained_cpu: 'CPU 7d',
  cpu_spikes: 'CPU spikes',
  cpu_trend: 'CPU trend',
  predicted_cpu: 'CPU forecast',
  current_mem: 'Memory',
  sustained_mem: 'Memory 7d',
  mem_spikes: 'Mem spikes',
  mem_trend: 'Mem trend',
  predicted_mem: 'Mem forecast',
  mem_overcommit: 'RAM alloc',
  iowait_current: 'IOWait',
  iowait_sustained: 'IOWait 7d',
};

// Longer wording for tooltips.
const PENALTY_DESCRIPTIONS = {
  current_cpu: 'CPU load right now',
  sustained_cpu: 'CPU load, 7-day average',
  cpu_spikes: 'CPU spikes this week',
  cpu_trend: 'CPU load trending up',
  predicted_cpu: 'CPU forecast after pending moves',
  current_mem: 'Memory use right now',
  sustained_mem: 'Memory use, 7-day average',
  mem_spikes: 'Memory spikes this week',
  mem_trend: 'Memory use trending up',
  predicted_mem: 'Memory forecast after pending moves',
  mem_overcommit: 'RAM allocated to guests beyond physical RAM',
  iowait_current: 'IOWait right now',
  iowait_sustained: 'IOWait, 7-day average',
};

export function penaltyLabel(key) {
  return PENALTY_LABELS[key] || String(key).replace(/_/g, ' ');
}

/** Non-zero penalties for one node-scores entry, largest first. */
export function penaltyList(score) {
  if (!score?.penalty_breakdown) return [];
  return Object.entries(score.penalty_breakdown)
    .filter(([, pts]) => typeof pts === 'number' && pts > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, pts]) => ({
      key,
      pts,
      label: penaltyLabel(key),
      description: PENALTY_DESCRIPTIONS[key] || penaltyLabel(key),
    }));
}

/** The largest penalty for a node, or null when it has none. */
export function topPenalty(score) {
  return penaltyList(score)[0] || null;
}

/** Tooltip text listing every penalty behind a node's headroom. */
export function penaltyTooltip(score) {
  const list = penaltyList(score);
  if (list.length === 0) return 'No penalties';
  return list.map(p => `${p.description}: +${p.pts} pts`).join('\n');
}

function asSet(nodes) {
  if (!nodes) return new Set();
  if (nodes instanceof Set) return nodes;
  return new Set(Array.isArray(nodes) ? nodes : Object.keys(nodes));
}

/**
 * The node with the least headroom among online nodes that are not in
 * maintenance (a maintenance node's score is pushed down on purpose to drain
 * it, so it would always "win").
 *
 * @param {object} nodeScores       /api/node-scores `scores`
 * @param {object} [opts]
 * @param {object} [opts.nodes]     data.nodes, to skip offline nodes
 * @param {Set|string[]} [opts.maintenanceNodes]
 * @returns {null | { name, rating, top, mean, count }}
 *   `top` = largest penalty ({key,pts,label}) or null; `mean` = mean headroom
 *   over the same nodes.
 */
export function tightestNode(nodeScores, { nodes = null, maintenanceNodes = null } = {}) {
  const maint = asSet(maintenanceNodes);
  const entries = Object.entries(nodeScores || {})
    .filter(([name, s]) => typeof s?.suitability_rating === 'number'
      && !maint.has(name)
      && (!nodes || !nodes[name] || nodes[name].status === 'online'));
  if (entries.length === 0) return null;
  const [name, s] = entries.reduce((a, b) => (b[1].suitability_rating < a[1].suitability_rating ? b : a));
  const mean = entries.reduce((sum, [, v]) => sum + v.suitability_rating, 0) / entries.length;
  return { name, rating: s.suitability_rating, top: topPenalty(s), mean, count: entries.length };
}

export { asSet as toNodeSet };
