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
