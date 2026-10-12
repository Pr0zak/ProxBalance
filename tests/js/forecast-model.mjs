// Unit tests for the Forecasts card helpers (src/components/insights/forecastModel.js).
// Run: node tests/js/forecast-model.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/components/insights/forecastModel.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const metric = (days, confidence = 'high', limit = 80) => ({
  confidence, current_avg: 50, rate_per_day: 2, r_squared: 0.8, data_points: 100,
  forecast: { days_to_limit: days, limit, history: [[-1, 48], [0, 50]], projection: [[0, 50], [30, 100]] },
});
const trends = (nodes) => ({ nodes: Object.fromEntries(Object.entries(nodes).map(([node, ms]) => [node, { node, ...ms }])) });

test('headline in plain words', () => {
  assert.equal(M.headline({ node: 'pve5', metric: 'memory', limit: 85, days: 12.4 }), 'pve5 memory reaches 85% in about 12 days');
  assert.equal(M.headline({ node: 'pve3', metric: 'cpu', limit: 80, days: 1.2 }), 'pve3 CPU reaches 80% in about 1 day');
  assert.equal(M.headline({ node: 'pve4', metric: 'iowait', limit: 20, days: 0.2 }), 'pve4 IO wait reaches 20% in about 5 hours');
});

test('unknown time is a dash, never 0', () => {
  assert.equal(M.timePhrase(null), '—');
  assert.equal(M.timePhrase(0), '—');
  assert.equal(M.timePhrase(-3), '—');
  assert.equal(M.timePhrase(0.001), 'about 1 hour');
  assert.equal(M.headline({ node: 'pve4', metric: 'cpu', limit: 80, days: null }), 'pve4 CPU is heading for 80%');
});

test('clear line', () => {
  assert.equal(M.clearText(), 'No node is heading for a limit in the next 30 days');
});

test('crossings: soonest first, low confidence and no crossing left out', () => {
  const t = trends({
    pve3: { cpu: metric(20), memory: metric(null), iowait: metric(2, 'low') },
    pve5: { cpu: metric(4, 'medium'), memory: metric(12) },
    pve6: { memory: { confidence: 'high' } }, // old backend: no forecast block
  });
  const c = M.projectedCrossings(t);
  assert.deepEqual(c.map(x => `${x.node}-${x.metric}`), ['pve5-cpu', 'pve5-memory', 'pve3-cpu']);
  assert.equal(c[0].rough, true);
  assert.equal(c[1].rough, false);
  assert.equal(c[1].limit, 80);
});

test('crossings: ties break by node then metric order', () => {
  const t = trends({ pve6: { cpu: metric(5) }, pve4: { memory: metric(5), cpu: metric(5) } });
  assert.deepEqual(M.projectedCrossings(t).map(x => `${x.node}-${x.metric}`), ['pve4-cpu', 'pve4-memory', 'pve6-cpu']);
});

test('empty or missing data', () => {
  assert.deepEqual(M.projectedCrossings(null), []);
  assert.deepEqual(M.projectedCrossings({ nodes: {} }), []);
});

test('shared range: history window left, a little past the furthest crossing right', () => {
  assert.deepEqual(M.sharedDayRange([{ days: 12 }, { days: 4 }], 7), { min: -7, max: 15 });
  assert.deepEqual(M.sharedDayRange([{ days: 29 }], 30), { min: -30, max: 30 });
  assert.deepEqual(M.sharedDayRange([{ days: 0.5 }], 1), { min: -1, max: 3 });
});

test('day ticks', () => {
  assert.equal(M.dayTick(0), 'now');
  assert.equal(M.dayTick(-7), '7d ago');
  assert.equal(M.dayTick(14), 'in 14d');
});

test('now line', () => {
  assert.equal(M.nowText({ current_avg: 54.4, rate_per_day: 2.04 }), 'Now 54%, rising about 2 points a day.');
  assert.equal(M.nowText({ current_avg: 30, rate_per_day: 1 }), 'Now 30%, rising about 1 point a day.');
  assert.equal(M.nowText({}), '—');
});

test('engine alerts become crossings', () => {
  const c = M.engineCrossings([
    { node: 'pve5', metric: 'cpu', threshold: 80, estimated_hours_to_crossing: 30 },
    { node: 'pve4', metric: 'memory', threshold: 85, estimated_hours_to_crossing: 6 },
    { metric: 'cpu', threshold: 80 },
  ]);
  assert.deepEqual(c.map(x => x.node), ['pve4', 'pve5']);
  assert.equal(M.headline(c[0]), 'pve4 memory reaches 85% in about 6 hours');
});
