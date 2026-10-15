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
  assert.equal(M.headline({ node: 'rigel', metric: 'memory', limit: 85, days: 12.4 }), 'rigel memory reaches 85% in about 12 days');
  assert.equal(M.headline({ node: 'lyra', metric: 'cpu', limit: 80, days: 1.2 }), 'lyra CPU reaches 80% in about 1 day');
  assert.equal(M.headline({ node: 'orion', metric: 'iowait', limit: 20, days: 0.2 }), 'orion IO wait reaches 20% in about 5 hours');
});

test('unknown time is a dash, never 0', () => {
  assert.equal(M.timePhrase(null), '—');
  assert.equal(M.timePhrase(0), '—');
  assert.equal(M.timePhrase(-3), '—');
  assert.equal(M.timePhrase(0.001), 'about 1 hour');
  assert.equal(M.headline({ node: 'orion', metric: 'cpu', limit: 80, days: null }), 'orion CPU is heading for 80%');
});

test('clear line states the horizon checked, and why when history shortened it', () => {
  assert.equal(M.clearText(), 'No node below its limit reaches it within 30 days');
  // A full 7-day window gives a 14-day horizon; the window already says why.
  assert.equal(M.clearText({ days: 14, capped: true, windowDays: 6.98 }, 7), 'No node below its limit reaches it within 14 days');
  // Less history than the window asked for: say how much there is.
  assert.equal(M.clearText({ days: 6, capped: true, windowDays: 3 }, 30), 'No node below its limit reaches it within 6 days (only 3 days of history)');
  assert.equal(M.clearText({ days: 0.5, capped: true, windowDays: 0.25 }, 1), 'No node below its limit reaches it within 12 hours (only 6 hours of history)');
});

// A forecast block as /api/trends/nodes series=1 sends it.
const fcMetric = ({ status, conf = 'high', cur = 50, rate = 2, limit = 70, dir = 'rising', toLimit = null, toFull = null, horizon = 30, max = 30, win = 30, r2 = 0.8 }) => ({
  confidence: conf, current_avg: cur, rate_per_day: rate, direction: dir, r_squared: r2, data_points: 500,
  forecast: { status, limit, days_to_limit: toLimit, days_to_full: toFull, horizon_days: horizon, max_horizon_days: max, window_days: win, history: [], projection: [] },
});

test('past the limit and rising gets a chart first; flat past the limit does not', () => {
  const t = trends({
    lyra: { memory: fcMetric({ status: 'over_limit', cur: 79.7, rate: 2.02, conf: 'medium', toFull: 10.1, horizon: 14, win: 7 }) },
    draco: { cpu: fcMetric({ status: 'over_limit', cur: 71, rate: 1.6, conf: 'low', limit: 60, r2: 0.02 }) },
    vega: { cpu: fcMetric({ status: 'crossing', toLimit: 5, limit: 60 }) },
  });
  const c = M.projectedCrossings(t);
  assert.deepEqual(c.map(x => `${x.node}-${x.metric}-${x.kind}`), ['lyra-memory-over', 'vega-cpu-crossing']);
  assert.equal(M.headline(c[0]), 'lyra memory is past its 70% limit and reaches 100% in about 10 days');
  assert.equal(c[0].rough, true);
  assert.equal(M.headline({ ...c[0], days: null }), 'lyra memory is past its 70% limit and still rising');
});

test('a rise that stays under the limit is said, not dropped', () => {
  const t = trends({
    cygnus: { memory: fcMetric({ status: 'beyond_horizon', cur: 16, rate: 0.39, dir: 'stable' }) },
    vega: { memory: fcMetric({ status: 'beyond_horizon', cur: 36, rate: 0.6, horizon: 14, win: 7 }) },
    orion: { memory: fcMetric({ status: 'not_rising', rate: -0.8, dir: 'falling' }) },
  });
  const b = M.risingBeyondHorizon(t);
  assert.equal(b.length, 1); // cygnus +0.39/day counts as stable
  assert.equal(M.beyondText(b[0]), "vega memory rises 0.6 points a day and doesn't reach 70% within 14 days");
  assert.deepEqual(M.projectedCrossings(t), []);
});

test('weak fits that would cross are named, not projected', () => {
  const t = trends({
    lyra: { cpu: fcMetric({ status: 'crossing', conf: 'low', toLimit: 3.2, limit: 60, r2: 0.03 }) },
    vega: { iowait: fcMetric({ status: 'crossing', conf: 'low', toLimit: 1.1, limit: 30, r2: 0.17 }) },
  });
  assert.deepEqual(M.projectedCrossings(t), []);
  assert.equal(M.weakText(M.weakFits(t)), 'Not projected, fit too weak (r² under 0.4): lyra CPU, vega IO wait');
  assert.equal(M.weakText([]), null);
});

test('checked horizon is the shortest one used', () => {
  const t = trends({
    a: { cpu: fcMetric({ status: 'not_rising', horizon: 30 }) },
    b: { cpu: fcMetric({ status: 'not_rising', horizon: 4, win: 2 }) },
  });
  assert.deepEqual(M.checkedHorizon(t), { days: 4, capped: true, windowDays: 2 });
  assert.deepEqual(M.checkedHorizon({ nodes: {} }), { days: 30, capped: false, windowDays: null });
});

test('old backend without status: worked out from days_to_limit and current value', () => {
  assert.equal(M.forecastStatus({ current_avg: 80, forecast: { limit: 70, days_to_limit: null } }), 'over_limit');
  assert.equal(M.forecastStatus({ current_avg: 50, forecast: { limit: 70, days_to_limit: 4 } }), 'crossing');
  assert.equal(M.forecastStatus({ current_avg: 50, rate_per_day: 1, forecast: { limit: 70, days_to_limit: null } }), 'beyond_horizon');
  assert.equal(M.forecastStatus({ current_avg: 50, forecast: { limit: null } }), 'no_limit');
  assert.equal(M.forecastStatus({}), null);
});

test('crossings: soonest first, low confidence and no crossing left out', () => {
  const t = trends({
    lyra: { cpu: metric(20), memory: metric(null), iowait: metric(2, 'low') },
    rigel: { cpu: metric(4, 'medium'), memory: metric(12) },
    vega: { memory: { confidence: 'high' } }, // old backend: no forecast block
  });
  const c = M.projectedCrossings(t);
  assert.deepEqual(c.map(x => `${x.node}-${x.metric}`), ['rigel-cpu', 'rigel-memory', 'lyra-cpu']);
  assert.equal(c[0].rough, true);
  assert.equal(c[1].rough, false);
  assert.equal(c[1].limit, 80);
});

test('crossings: ties break by node then metric order', () => {
  const t = trends({ vega: { cpu: metric(5) }, orion: { memory: metric(5), cpu: metric(5) } });
  assert.deepEqual(M.projectedCrossings(t).map(x => `${x.node}-${x.metric}`), ['orion-cpu', 'orion-memory', 'vega-cpu']);
});

test('empty or missing data', () => {
  assert.deepEqual(M.projectedCrossings(null), []);
  assert.deepEqual(M.projectedCrossings({ nodes: {} }), []);
});

test('shared range: history window left, a little past the furthest crossing right', () => {
  assert.deepEqual(M.sharedDayRange([{ days: 12 }, { days: 4 }], 7), { min: -7, max: 15 });
  assert.deepEqual(M.sharedDayRange([{ days: 29 }], 30), { min: -30, max: 30 });
  assert.deepEqual(M.sharedDayRange([{ days: 0.5 }], 1), { min: -1, max: 3 });
  // Never past the horizon the charts were projected over.
  assert.deepEqual(M.sharedDayRange([{ days: 1.5, forecast: { horizon_days: 2 } }], 1), { min: -1, max: 2 });
  assert.deepEqual(M.sharedDayRange([{ days: null, forecast: { horizon_days: 14 } }], 7), { min: -7, max: 14 });
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
    { node: 'rigel', metric: 'cpu', threshold: 80, estimated_hours_to_crossing: 30 },
    { node: 'orion', metric: 'memory', threshold: 85, estimated_hours_to_crossing: 6 },
    { metric: 'cpu', threshold: 80 },
  ]);
  assert.deepEqual(c.map(x => x.node), ['orion', 'rigel']);
  assert.equal(M.headline(c[0]), 'orion memory reaches 85% in about 6 hours');
});
