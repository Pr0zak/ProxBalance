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
const c1 = S.nodeColors(['vega', 'lyra', 'rigel', 'orion']);
const c2 = S.nodeColors(['lyra', 'orion', 'rigel', 'vega']);
eq('colours follow sorted names', c1, c2);
eq('first sorted node gets the first colour', c1.lyra, '#3b82f6');
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

// Band when each bucket holds one raw sample (bucket == RRD step): rolling
// min/max over BAND_REACH buckets either side, never zero width, gaps kept.
const vals1 = [10, 30, 20, 50, 40, 60, 0, 25];
const one = S.bucketSeries([{ name: 'a', trendData: { hour: vals1.map((v, k) => ({ time: T0 + k * 60, cpu: v })) } }], H1, 'cpu', 60);
eq('single-sample buckets switch to a rolling band', one.band, { rolling: true, seconds: 300 });
eq('line stays the raw samples', one.lines[0].values.slice(-8), vals1);
eq('rolling min', one.lines[0].min.slice(-8), [10, 10, 10, 20, 0, 0, 0, 0]);
eq('rolling max', one.lines[0].max.slice(-8), [30, 50, 50, 60, 60, 60, 60, 60]);
eq('line inside band', one.lines[0].values.every((v, k) => v == null || (one.lines[0].min[k] <= v && v <= one.lines[0].max[k])), true);
eq('label says raw', one.label, 'raw samples every 1 min');
eq('multi-sample buckets keep the in-bucket band', bs.band, { rolling: false, seconds: 300 });
eq('rollingExtreme keeps gaps', S.rollingExtreme([5, null, 1, 9], 1, Math.max), [5, null, 9, 9]);
eq('band text rolling', S.bandText(one.band), 'band: lowest to highest sample over 5 min around each point');
eq('band text in-bucket', S.bandText(bs.band), 'band: lowest to highest sample in each 5-min average');
eq('band text for 7d at 30-min step', S.bandText({ rolling: true, seconds: 5 * 1800 }), 'band: lowest to highest sample over 2.5 hours around each point');
eq('span text', [S.spanText(300), S.spanText(3600), S.spanText(5 * 21600), S.spanText(86400)], ['5 min', '1 hour', '1.3 days', '1 day']);

// Axis ceiling.
eq('cpu axis is 0-100', S.axisMax('cpu', bs.lines, 80), 100);
eq('iowait scales to data', S.axisMax('iowait', [{ values: [1, 3.2, null] }], undefined), 5);
eq('iowait includes threshold', S.axisMax('iowait', [{ values: [1, 2] }], 30), 35);
eq('iowait with no data has a floor', S.axisMax('iowait', [{ values: [null] }], undefined), 10);

// Spread line: from the last plotted bucket, visible nodes only.
const lines = [{ name: 'lyra', values: [40, 50] }, { name: 'vega', values: [20, 26] }, { name: 'rigel', values: [30, null] }];
const sp = S.spreadAtLast(lines);
eq('spread from last bucket, offline node left out', sp, { spread: 24, low: { name: 'vega', value: 26 }, high: { name: 'lyra', value: 50 } });
eq('spread text', S.spreadText(sp, '14:35'), 'Spread 24 pts at 14:35 (vega 26% → lyra 50%)');
eq('hidden node left out', S.spreadAtLast([...lines, { name: 'x', values: [0, 99] }], ['x']), sp);
eq('zero spread is a value', S.spreadText(S.spreadAtLast([{ name: 'a', values: [5] }, { name: 'b', values: [5] }]), '1:00'), 'Spread 0 pts at 1:00 (a 5% → b 5%)');
eq('small values keep a decimal', S.spreadText({ spread: 1.25, low: { name: 'a', value: 0.4 }, high: { name: 'b', value: 1.66 } }), 'Spread 1.3 pts (a 0.4% → b 1.7%)');
eq('one node -> dash', S.spreadText(S.spreadAtLast([{ name: 'a', values: [5] }]), '1:00'), 'Spread at 1:00: —');
eq('missing last values -> dash, not 0', S.spreadText(S.spreadAtLast([{ name: 'a', values: [5, null] }, { name: 'b', values: [7, null] }])), 'Spread: —');

console.log(bad ? `\n${bad} failure(s)` : '\nall passed');
process.exit(bad ? 1 : 0);
