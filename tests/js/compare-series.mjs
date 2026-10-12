// Checks the one-chart node comparison helpers (compareSeries.js): colours,
// short-gap filling, time-axis alignment, axis ceiling and the spread line.
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

// Gap filling.
eq('trailing lag fills forward', S.fillShortGaps([1, 2, 3, null]), [1, 2, 3, 3]);
eq('leading lag fills backward', S.fillShortGaps([null, null, 5, 6]), [5, 5, 5, 6]);
eq('short interior gap fills forward', S.fillShortGaps([1, null, null, 4]), [1, 1, 1, 4]);
eq('long gap (outage) stays a gap', S.fillShortGaps([1, null, null, null, null, 6]), [1, null, null, null, null, 6]);
eq('maxGap is respected', S.fillShortGaps([1, null, null, 4], 1), [1, null, null, 4]);
eq('all-missing stays missing', S.fillShortGaps([null, null]), [null, null]);
eq('zero is a value, not a gap', S.fillShortGaps([0, null, 2]), [0, 0, 2]);

// Alignment: node B lags one step at the end and has a 5-sample outage.
const pt = (time, v) => ({ time, cpu: { avg: v, min: v - 1, max: v + 1 }, mem: { avg: v, min: v, max: v }, iowait: { avg: null, min: null, max: null } });
const A = Array.from({ length: 12 }, (_, i) => pt(1000 + i * 60, 10 + i));
const B = A.slice(0, 11).filter((_, i) => i < 2 || i > 6).map(p => pt(p.time + 5, 50));
const al = S.alignSeries([{ name: 'a', pts: A }, { name: 'b', pts: B }], 'cpu');
eq('axis comes from the fullest node', al.times.length, 12);
eq('lagging node filled at the end, outage kept', al.lines[1].values,
  [50, 50, null, null, null, null, null, 50, 50, 50, 50, 50]);
eq('min band aligned too', al.lines[0].min.slice(0, 3), [9, 10, 11]);
eq('missing metric stays null', S.alignSeries([{ name: 'a', pts: A }], 'iowait').lines[0].values.every(v => v === null), true);
eq('nothing to draw -> null', S.alignSeries([{ name: 'a', pts: [] }], 'cpu'), null);

// Axis ceiling.
eq('cpu axis is 0-100', S.axisMax('cpu', al.lines, 80), 100);
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
