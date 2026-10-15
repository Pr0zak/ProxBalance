// Checks the one-chart node comparison helpers (compareSeries.js): colours,
// edge filling, per-period bucket averages, axis ceiling and the spread line.
// Run: node tests/js/compare-series.mjs
import { build } from 'esbuild';
const out = await build({ stdin: { contents: "export * from './src/components/dashboard/compareSeries.js';", resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', write: false, define: { React: 'globalThis.React' } });
globalThis.React = { useState: () => [0, () => {}], useEffect: () => {}, useCallback: (f) => f };
const S = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

let bad = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { bad++; console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); } else console.log(`ok   ${name}`);
};

// Colours: sorted-name order, stable regardless of input order, cycled.
const c1 = S.nodeColors(['pve6', 'pve3', 'pve5', 'pve4']);
const c2 = S.nodeColors(['pve3', 'pve4', 'pve5', 'pve6']);
eq('colours follow sorted names', c1, c2);
eq('first sorted node gets the first colour', c1.pve3, '#3b82f6');
const many = S.nodeColors(Array.from({ length: 9 }, (_, i) => `n${i}`));
eq('colours cycle past the palette', many.n8, many.n0);

// Edge filling: only a missing first/last value, never an inner gap.
eq('trailing lag fills forward', S.fillEdges([1, 2, 3, null]), [1, 2, 3, 3]);
eq('leading lag fills backward', S.fillEdges([null, 5, 6]), [5, 5, 6]);
eq('inner gap stays a gap', S.fillEdges([1, null, 4]), [1, null, 4]);
eq('long trailing gap (offline) stays', S.fillEdges([1, 2, null, null]), [1, 2, null, null]);
eq('all-missing stays missing', S.fillEdges([null, null]), [null, null]);
eq('zero is a value, not a gap', S.fillEdges([0, null]), [0, 0]);

// Averaging windows and labels.
eq('1d uses 5-min buckets', S.COMPARE_BUCKETS['1d'], 300);
eq('labels', ['1h', '1d', '7d', '30d', '1yr'].map(p => S.averageLabel(S.COMPARE_BUCKETS[p])),
  ['1-min averages', '5-min averages', '30-min averages', '2-hour averages', '1-day averages']);
eq('every period keeps at least 60 points', ['1h', '6h', '1d', '7d', '30d', '90d', '180d', '1yr']
  .every(p => ({ '1h': 3600, '6h': 21600, '1d': 86400, '7d': 604800, '30d': 2592000, '90d': 7776000, '180d': 15552000, '1yr': 31536000 })[p] / S.COMPARE_BUCKETS[p] >= 60), true);

// Bucketing at 1h (5-min buckets) over per-minute rows whose value is the minute index.
// Node b is offline for minutes 10-24 (three whole buckets) and its last sample is
// minute 54, one bucket behind node a (minute 59).
const H1 = { id: '1h', ms: 3600 * 1000, rrd: 'hour' };
const T0 = 1800000000; // multiple of 300
const rows = (mins) => mins.map(m => ({ time: T0 + m * 60, cpu: m, mem: 50, iowait: null }));
const all = Array.from({ length: 60 }, (_, m) => m);
const bs = S.bucketSeries([
  { name: 'a', trendData: { hour: rows(all) } },
  { name: 'b', trendData: { hour: rows(all.filter(m => (m < 10 || m > 24) && m <= 54)) } },
  { name: 'c', trendData: {} },
], H1, 'cpu', 300);
eq('one shared axis of whole buckets', bs.times.length === 12 && bs.times[0] === T0 && bs.times[1] - bs.times[0] === 300, true);
eq('bucket averages', bs.lines[0].values, [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57]);
eq('raw range kept for the band', [bs.lines[0].min[1], bs.lines[0].max[1]], [5, 9]);
eq('outage stays a gap, lagging end filled', bs.lines[1].values, [2, 7, null, null, null, 27, 32, 37, 42, 47, 52, 52]);
eq('node without data is left out', bs.lines.map(l => l.name), ['a', 'b']);
eq('label carried', bs.label, '5-min averages');
eq('metric with no samples -> null', S.bucketSeries([{ name: 'a', trendData: { hour: rows(all) } }], H1, 'iowait'), null);
eq('falls back to day rows', S.bucketSeries([{ name: 'a', trendData: { day: rows(all) } }], H1, 'cpu', 300).lines[0].values[0], 2);
eq('nothing to draw -> null', S.bucketSeries([{ name: 'a', trendData: { hour: [] } }], H1, 'cpu'), null);

// Axis ceiling.
eq('cpu axis is 0-100', S.axisMax('cpu', bs.lines, 80), 100);
eq('iowait scales to data', S.axisMax('iowait', [{ values: [1, 3.2, null] }], undefined), 5);
eq('iowait includes threshold', S.axisMax('iowait', [{ values: [1, 2] }], 30), 35);
eq('iowait with no data has a floor', S.axisMax('iowait', [{ values: [null] }], undefined), 10);

// Spread line.
const lines = [{ name: 'pve3', values: [40, 50] }, { name: 'pve6', values: [20, 26] }, { name: 'pve5', values: [30, null] }];
const sp = S.spreadNow('iowait', lines, null);
eq('spread from last points', sp, { spread: 24, low: { name: 'pve6', value: 26 }, high: { name: 'pve3', value: 50 } });
eq('spread text', S.spreadText(sp), 'Spread now: 24 pts (pve6 26% → pve3 50%)');
const api = { memory: { min: 23.5, min_node: 'pve4', max: 48.3, max_node: 'pve3', spread: 24.8 }, cpu: null };
eq('memory prefers the API figure', S.spreadText(S.spreadNow('mem', lines, api)), 'Spread now: 25 pts (pve4 24% → pve3 48%)');
eq('cpu falls back to chart when API has none', S.spreadNow('cpu', lines, api).high.name, 'pve3');
eq('small values keep a decimal', S.spreadText({ spread: 1.25, low: { name: 'a', value: 0.4 }, high: { name: 'b', value: 1.66 } }), 'Spread now: 1.3 pts (a 0.4% → b 1.7%)');
eq('one node -> dash', S.spreadText(S.spreadNow('cpu', [{ name: 'a', values: [5] }], null)), 'Spread now: —');

console.log(bad ? `\n${bad} failure(s)` : '\nall passed');
process.exit(bad ? 1 : 0);
