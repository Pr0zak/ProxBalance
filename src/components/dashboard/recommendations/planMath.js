/**
 * Pure helpers for the Suggestions tab: trimming the engine's execution plan
 * to a subset, re-simulating the batch impact for a subset, and the what-if
 * numbers behind a target-node conflict.
 *
 * All numbers come from the engine's own per-move estimates
 * (summary.batch_impact.moves), so the impact strip, the conflict panels
 * and the backend's conflict detector agree with each other.
 */

export const vkey = (vmid) => String(vmid);

/**
 * The engine's plan restricted to `recs`, keeping its order and waves.
 * Steps and waves are renumbered consecutively (1-based, no gaps). Anything
 * the planner did not order runs as a final wave.
 */
export function subsetPlan(plan, recs) {
  const keep = new Set(recs.map(r => vkey(r.vmid)));
  const ordered = (plan?.ordered_recommendations || [])
    .filter(s => keep.has(vkey(s.vmid)))
    .sort((a, b) => (a.step || 0) - (b.step || 0));
  const planned = new Set(ordered.map(s => vkey(s.vmid)));
  const extras = recs.filter(r => !planned.has(vkey(r.vmid))).map(r => ({
    vmid: r.vmid,
    name: r.name,
    source_node: r.source_node,
    target_node: r.target_node,
    parallel_group: Infinity,
    reason_for_order: 'Not ordered by the planner',
  }));
  const all = [...ordered, ...extras];
  const waveIds = [...new Set(all.map(s => s.parallel_group || 1))].sort((a, b) => a - b);
  const waveOf = new Map(waveIds.map((g, i) => [g, i + 1]));
  const steps = all.map((s, i) => ({ ...s, step: i + 1, parallel_group: waveOf.get(s.parallel_group || 1) }));
  const sizes = {};
  for (const s of steps) sizes[s.parallel_group] = (sizes[s.parallel_group] || 0) + 1;
  return {
    ...(plan || {}),
    ordered_recommendations: steps,
    total_steps: steps.length,
    can_parallelize: Object.values(sizes).some(n => n > 1),
  };
}

/** Group plan steps into waves: [{ wave, steps: [...] }] in order. */
export function planWaves(plan) {
  const map = new Map();
  for (const s of plan?.ordered_recommendations || []) {
    if (!map.has(s.parallel_group)) map.set(s.parallel_group, []);
    map.get(s.parallel_group).push(s);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([wave, steps]) => ({ wave, steps }));
}

// A node that still holds guests cannot sit at 0% CPU and 0% memory; older
// engine versions produced exactly that, so treat it as "no prediction".
const isImpossible = (a) => a && a.cpu === 0 && a.mem === 0 && a.guest_count > 0;

const clampPct = (v) => Math.min(100, Math.max(0, v));

/**
 * Predicted per-node load if only the moves in `included` run.
 *
 * @param summary       recommendationData.summary
 * @param included      Set of vmid strings, or null for "every suggestion"
 * @param fallbackLimits {cpu, mem} used when the payload carries no limits
 * @returns {nodes:[{name,before,after,overCpu,overMem}], healthBefore, healthAfter, limits, resimulated}
 *          `after` is null when the engine has no usable prediction.
 */
export function simulateImpact(summary, included, fallbackLimits = null) {
  const bi = summary?.batch_impact;
  if (!bi?.before?.node_scores) return null;
  const before = bi.before.node_scores;
  const limits = bi.limits || fallbackLimits;
  const moves = Array.isArray(bi.moves) ? bi.moves : null;

  let after = {};
  let healthAfter = summary.predicted_health;
  if (moves) {
    const acc = {};
    for (const [n, b] of Object.entries(before)) acc[n] = { cpu: b.cpu, mem: b.mem, guest_count: b.guest_count };
    let health = 0;
    for (const m of moves) {
      if (included && !included.has(vkey(m.vmid))) continue;
      const s = acc[m.source_node];
      const t = acc[m.target_node];
      if (!s || !t) continue;
      s.cpu -= m.source_cpu; s.mem -= m.source_mem; s.guest_count -= 1;
      t.cpu += m.target_cpu; t.mem += m.target_mem; t.guest_count += 1;
      health += m.health_delta || 0;
    }
    for (const [n, a] of Object.entries(acc)) {
      after[n] = { cpu: clampPct(a.cpu), mem: clampPct(a.mem), guest_count: Math.max(0, a.guest_count) };
    }
    if (included) healthAfter = Math.min(100, (summary.cluster_health || 0) + health);
  } else {
    // Older payload without per-move deltas: only the all-moves estimate exists.
    after = bi.after?.node_scores || {};
  }

  const nodes = Object.keys(before).sort().map(name => {
    const a = after[name];
    const usable = a && !isImpossible(a) ? a : null;
    return {
      name,
      before: before[name],
      after: usable,
      overCpu: !!(limits && usable && usable.cpu > limits.cpu),
      overMem: !!(limits && usable && usable.mem > limits.mem),
    };
  });

  return {
    nodes,
    healthBefore: summary.cluster_health,
    healthAfter,
    limits,
    resimulated: !!moves || !included,
  };
}

/**
 * What-if numbers for one target-node conflict, given the moves left out.
 *
 * @param conflict  an entry of recommendationData.conflicts
 * @param summary   recommendationData.summary (for before + per-move deltas)
 * @param excluded  Set of vmid strings left out of this run
 */
export function conflictState(conflict, summary, excluded) {
  const metric = conflict.exceeds_mem || !conflict.exceeds_cpu ? 'mem' : 'cpu';
  const limit = metric === 'mem' ? conflict.mem_threshold : conflict.cpu_threshold;
  const bi = summary?.batch_impact;
  const moveBy = {};
  for (const m of bi?.moves || []) moveBy[vkey(m.vmid)] = m;
  const isOut = (vmid) => excluded.has(vkey(vmid));

  const incoming = (conflict.incoming_guests || []).map(g => {
    const m = moveBy[vkey(g.vmid)];
    const impact = m ? m[`target_${metric}`] : (metric === 'mem' ? g.predicted_mem_impact : g.predicted_cpu_impact) || 0;
    return { vmid: g.vmid, name: g.name, impact, deferred: isOut(g.vmid) };
  }).sort((a, b) => b.impact - a.impact);

  // Guests leaving this node free capacity before the incoming ones land.
  const outgoing = (bi?.moves || [])
    .filter(m => m.source_node === conflict.target_node)
    .map(m => ({ vmid: m.vmid, freed: m[`source_${metric}`], deferred: isOut(m.vmid) }));

  const nodeBefore = bi?.before?.node_scores?.[conflict.target_node];
  const combined = metric === 'mem' ? conflict.combined_predicted_mem : conflict.combined_predicted_cpu;
  const now = nodeBefore
    ? nodeBefore[metric]
    : Math.max(0, combined - incoming.reduce((a, g) => a + g.impact, 0));
  const freed = outgoing.filter(o => !o.deferred).reduce((a, o) => a + o.freed, 0);
  const base = Math.max(0, now - freed);
  const active = incoming.filter(g => !g.deferred);
  const total = base + active.reduce((a, g) => a + g.impact, 0);
  const fits = total <= limit;

  // Smallest set to defer (largest contributors first) that brings the node under its limit.
  const suggestion = [];
  let landsAt = total;
  if (!fits) {
    for (const g of active) {
      if (landsAt <= limit) break;
      suggestion.push(g);
      landsAt -= g.impact;
    }
  }

  return { metric, limit, now, freed, base, total, fits, incoming, active, suggestion, landsAt };
}
