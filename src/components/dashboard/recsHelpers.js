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
 * Returns { [vmid]: { target_node, confidence_score } }
 * One rec per guest (latest if duplicates somehow exist).
 */
export function recsByGuest(recommendations) {
  const map = {};
  if (!Array.isArray(recommendations)) return map;
  for (const r of recommendations) {
    if (r.vmid != null) {
      map[String(r.vmid)] = {
        target_node: r.target_node,
        source_node: r.source_node,
        confidence_score: r.confidence_score,
      };
    }
  }
  return map;
}
