/**
 * Pure helpers that bucket the recommendations array for cross-reference
 * badges in the Cluster section. Used by NodeSummaryTable, GuestsTable,
 * and the optional Recommendations tab.
 */

/**
 * Returns { [nodeName]: { outbound: number, inbound: number } }
 * outbound = recs that move a guest OFF this node
 * inbound  = recs that move a guest TO this node
 */
export function recsByNode(recommendations) {
  const map = {};
  if (!Array.isArray(recommendations)) return map;
  for (const r of recommendations) {
    const src = r.source_node;
    const tgt = r.target_node;
    if (src) {
      if (!map[src]) map[src] = { outbound: 0, inbound: 0 };
      map[src].outbound += 1;
    }
    if (tgt) {
      if (!map[tgt]) map[tgt] = { outbound: 0, inbound: 0 };
      map[tgt].inbound += 1;
    }
  }
  return map;
}

/**
 * Returns { [vmid]: <full rec object> }
 * One rec per guest (latest if duplicates somehow exist). Full rec is
 * returned so badges can both display details on hover AND hand the rec
 * to setConfirmMigration on click — matching what RecommendationCard does.
 */
export function recsByGuest(recommendations) {
  const map = {};
  if (!Array.isArray(recommendations)) return map;
  for (const r of recommendations) {
    if (r.vmid != null) map[String(r.vmid)] = r;
  }
  return map;
}

/** Build a multi-line tooltip string for a rec badge. */
export function recBadgeTooltip(rec) {
  if (!rec) return '';
  const lines = [
    `Recommended: ${rec.source_node} → ${rec.target_node}`,
  ];
  const reasonLabel = rec.structured_reason?.primary_label || rec.reason;
  if (reasonLabel) lines.push(`Reason: ${reasonLabel}`);
  if (rec.score_improvement != null) lines.push(`Score improvement: +${rec.score_improvement.toFixed(1)}`);
  if (rec.confidence_score != null) lines.push(`Confidence: ${rec.confidence_score}%`);
  if (rec.mem_gb != null) lines.push(`Memory: ${rec.mem_gb.toFixed(1)} GB`);
  lines.push('');
  lines.push('Click to open migration dialog');
  return lines.join('\n');
}

/**
 * Human-readable labels for the recommendation engine's skip-reason codes.
 * `tone` picks the pill color; unknown codes fall back to a prettified key.
 */
export const SKIP_REASONS = {
  source_memory_healthy: { label: 'Node healthy — no need to move', tone: 'green' },
  has_ignore_tag: { label: "Tagged 'ignore'", tone: 'gray' },
  stopped: { label: 'Not running', tone: 'gray' },
  insufficient_improvement: { label: 'Move would barely help', tone: 'yellow' },
  no_suitable_target: { label: 'No node has room', tone: 'red' },
  ha_managed: { label: 'Managed by PVE HA', tone: 'blue' },
  passthrough_disk: { label: 'Has passthrough disk', tone: 'orange' },
  unshared_bind_mount: { label: 'Has local bind mount', tone: 'orange' },
  seasonal_baseline: { label: 'Normal for this time of day', tone: 'green' },
};

export function skipReasonLabel(code) {
  if (SKIP_REASONS[code]) return SKIP_REASONS[code].label;
  const s = String(code || 'other').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const SKIP_TONE_CLASS = {
  green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50',
  gray: 'bg-pb-surface2 dark:bg-slate-700/50 text-pb-text2 dark:text-gray-300 border-pb-border dark:border-slate-600/50',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
};
export const skipToneClass = (code) => SKIP_TONE_CLASS[SKIP_REASONS[code]?.tone || 'gray'];
