// Unit tests for the compact suggestion card's pure helpers (cardModel.js):
// the status chip decision, the driving metric, before/after bars and the
// one-line reason. Run: node tests/js/suggestion-card.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/components/dashboard/recommendations/cardModel.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const live = { enabled: true, timer_active: true, dry_run: false };
const imOn = { rules: { intelligent_migrations: { enabled: true, observation_periods: 3 } } };
const base = {
  vmid: 245, name: 'zentry-det-pve5', type: 'CT', source_node: 'pve5', target_node: 'pve3', mem_gb: 3,
  structured_reason: {
    primary_reason: 'cpu_imbalance', primary_label: 'Balance CPU load',
    contributing_factors: [
      { factor: 'target_cpu_headroom', value: 78, label: 'Target has 78% CPU headroom' },
      { factor: 'target_mem_headroom', value: 50, label: 'Target has 50% memory headroom' },
      { factor: 'source_cpu_trend', label: 'Source CPU trending upward' },
    ],
  },
  score_details: { source: { trend_analysis: { cpu_rate_per_day: 4.52, cpu_direction: 'rising' } } },
};
const ready = { ...base, seen_count: 3, seen_required: 3, seen_same_target: 3, seen_status: 'ready' };

test('status: automation off or ignored guest is manual only', () => {
  assert.equal(M.autoStatus(ready, { automation: { enabled: false } }).label, 'Manual only');
  assert.equal(M.autoStatus(ready, { automation: null }).key, 'manual');
  const s = M.autoStatus(ready, { automation: live, guest: { tags: { has_ignore: true } } });
  assert.equal(s.label, 'Manual only');
  assert.match(s.lines[0], /ignore tag/);
});

test('status: ready, dry run vs live', () => {
  assert.equal(M.autoStatus(ready, { automation: { ...live, dry_run: true }, config: imOn }).label, 'Ready · dry run');
  const s = M.autoStatus(ready, { automation: live, config: imOn });
  assert.equal(s.label, 'Ready · will run next check');
  assert.equal(s.color, 'green');
  assert.ok(s.lines.some(l => /Seen in 3 consecutive/.test(l)), 'seen-count explanation folded in');
});

test('status: waiting on the seen count', () => {
  const w = { ...base, seen_count: 2, seen_required: 3, seen_same_target: 2, seen_status: 'observing' };
  assert.equal(M.autoStatus(w, { automation: live, config: imOn }).label, 'Waiting 2/3 runs');
  const met = { ...w, seen_count: 3 };
  assert.equal(M.autoStatus(met, { automation: live, config: imOn }).label, 'Waiting for data');
  assert.equal(M.autoStatus(base, { automation: live, config: imOn }).label, 'Waiting · not counted yet');
  // Intelligent migrations off: no count needed.
  assert.equal(M.autoStatus(base, { automation: live, config: {} }).key, 'ready');
  // Maintenance evacuations aren't gated on the count.
  const maint = { ...base, structured_reason: { primary_reason: 'maintenance_evacuation' } };
  assert.equal(M.autoStatus(maint, { automation: live, config: imOn }).key, 'ready');
});

test('status: paused, HA block and inflow cap', () => {
  assert.equal(M.autoStatus(ready, { automation: { ...live, timer_active: false } }).label, 'Automation paused');
  const guest = { ha_placement: { pve3: { blocks: ['Rule r1 keeps it off pve3'], warnings: [] } } };
  assert.equal(M.autoStatus(ready, { automation: live, guest }).label, 'Blocked: HA rule');
  const s = M.autoStatus(ready, { automation: live, config: imOn, inflow: { target: 'pve3', cap: 1 } });
  assert.equal(s.label, 'Blocked: inflow cap');
  assert.equal(s.color, 'red');
});

test('driving metric follows the structured reason', () => {
  assert.equal(M.drivingMetric(base), 'cpu');
  assert.equal(M.drivingMetric({ structured_reason: { primary_reason: 'mem_imbalance' } }), 'mem');
  assert.equal(M.drivingMetric({ structured_reason: { primary_reason: 'iowait_relief' } }), 'iowait');
  assert.equal(M.drivingMetric({ reason: 'Balance memory load' }), 'mem');
});

test('bars use batch_impact before + this move\'s deltas', () => {
  const summary = { batch_impact: {
    before: { node_scores: { pve5: { cpu: 42, mem: 60 }, pve3: { cpu: 22, mem: 40 } } },
    moves: [{ vmid: 245, source_node: 'pve5', target_node: 'pve3', source_cpu: 7, source_mem: 5, target_cpu: 7.2, target_mem: 9 }],
    limits: { cpu: 85, mem: 90 },
  } };
  const b = M.moveBars(base, summary);
  assert.deepEqual(b.source, { node: 'pve5', before: 42, after: 35 });
  assert.deepEqual(b.target, { node: 'pve3', before: 22, after: 29.2 });
  assert.equal(b.limit, 85);
  // No move delta → no after value, never an invented one.
  const none = M.moveBars(base, { batch_impact: { ...summary.batch_impact, moves: [] } });
  assert.equal(none.source.after, null);
  assert.equal(none.source.before, 42);
  // No summary at all → nothing known.
  const empty = M.moveBars(base, null);
  assert.equal(empty.source.before, null);
  assert.equal(M.fmtPct(empty.source.before), '—');
});

test('iowait bars shift the recent reading by the engine\'s predicted delta', () => {
  const rec = { ...base, structured_reason: { primary_reason: 'iowait_relief', contributing_factors: [] },
    score_details: {
      source: { metrics: { immediate_iowait: 30, weighted_iowait: 25, predicted_iowait: 20 } },
      target: { metrics: { immediate_iowait: 2, weighted_iowait: 3, predicted_iowait: 8 } },
    } };
  const b = M.moveBars(rec, null, { iowait_threshold: 20 });
  assert.deepEqual(b.source, { node: 'pve5', before: 30, after: 25 });
  assert.deepEqual(b.target, { node: 'pve3', before: 2, after: 7 });
  assert.equal(b.limit, 20);
});

test('reason sentence picks the single most important reason', () => {
  assert.equal(M.reasonSentence(base, { cpu_threshold: 80 }), 'pve5 CPU rising 4.5%/day');
  const hot = { ...base, structured_reason: { ...base.structured_reason,
    contributing_factors: [{ factor: 'source_cpu', value: 86 }, ...base.structured_reason.contributing_factors] } };
  assert.equal(M.reasonSentence(hot, { cpu_threshold: 80 }), 'pve5 CPU over 80%');
  const mem = { ...base, structured_reason: { primary_reason: 'mem_imbalance', contributing_factors: [{ factor: 'source_mem', value: 83 }] } };
  assert.equal(M.reasonSentence(mem, { mem_threshold: 80 }), 'pve5 memory over 80%');
  const maint = { ...base, structured_reason: { primary_reason: 'maintenance_evacuation' } };
  assert.equal(M.reasonSentence(maint), 'pve5 is in maintenance mode');
});

test('why bullets name the nodes; risk, seen and size summaries', () => {
  assert.deepEqual(M.whyBullets(base), [
    'pve3 keeps 78% CPU free after the move',
    'pve3 keeps 50% memory free after the move',
    'pve5 CPU rising 4.5%/day',
  ]);
  assert.equal(M.riskLabel({ risk_level: 'moderate' }), 'medium');
  assert.equal(M.riskLabel({}), null);
  assert.equal(M.seenSummary(ready), '3 of 3 runs, same target');
  assert.equal(M.seenSummary({ ...ready, seen_same_target: 0 }), '3 of 3 runs, pve3 not counted yet');
  assert.equal(M.seenSummary(base), null);
  assert.equal(M.guestSize(base, { cpu_cores: 2 }), '3.0 GB memory · 2 cores');
  assert.equal(M.guestSize({}, null), null);
});
