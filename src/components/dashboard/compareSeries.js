/**
 * Pure helpers for the "One chart" node comparison (NodeCompareChart): node
 * colours, aligning every node's samples onto one time axis with short-gap
 * filling, the y-axis ceiling, and the "Spread now" line under the chart.
 * No React or Chart.js here, so tests/js/compare-series.mjs can run them in node.
 */
import { NODE_COLORS } from './nodeSeries.js';

/** Metrics the one-chart view can show, in segmented-control order. */
export const COMPARE_METRICS = [
  { key: 'cpu',    label: 'CPU',     spreadKey: 'cpu' },
  { key: 'mem',    label: 'Memory',  spreadKey: 'memory' },
  { key: 'iowait', label: 'IO wait', spreadKey: null },
];

/**
 * Stable colour per node: names sorted, then NODE_COLORS in order (cycled), the
 * same rule the Cluster Health chart uses so a node keeps its colour everywhere.
 */
export function nodeColors(names) {
  const out = {};
  Array.from(new Set(names || [])).sort().forEach((n, i) => { out[n] = NODE_COLORS[i % NODE_COLORS.length]; });
  return out;
}

/** Nearest point to time t in a time-sorted list, or null if none within tol seconds. */
export function sampleAt(pts, t, tol) {
  if (!pts || !pts.length) return null;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].time < t) lo = mid + 1; else hi = mid;
  }
  let best = pts[lo];
  if (lo > 0 && Math.abs(pts[lo - 1].time - t) < Math.abs(best.time - t)) best = pts[lo - 1];
  return Math.abs(best.time - t) <= tol ? best : null;
}

/**
 * Fill runs of up to `maxGap` missing values so a node whose samples lag the
 * others by a step or two doesn't split its own line: fill forward from the last
 * value, or backward from the next one when the run starts the series. Longer
 * runs (a node that was really offline) stay null and draw as a gap. A series
 * with no values at all stays all-null.
 */
export function fillShortGaps(values, maxGap = 3) {
  const out = values.slice();
  let i = 0;
  while (i < out.length) {
    if (out[i] != null) { i++; continue; }
    let j = i;
    while (j < out.length && out[j] == null) j++;
    const len = j - i;
    const prev = i > 0 ? out[i - 1] : null;
    const next = j < out.length ? out[j] : null;
    const fill = prev != null ? prev : next;
    if (len <= maxGap && fill != null) for (let k = i; k < j; k++) out[k] = fill;
    i = j;
  }
  return out;
}

const round1 = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(1) : null);

/**
 * Put every node's series on one time axis for one metric.
 *
 * `series` is [{ name, pts }] where pts come from buildNodeSeries (each metric
 * is { avg, min, max }). The axis is the node with the most samples (latest
 * sample wins a tie); other nodes snap to it within half a step, then short gaps
 * are filled. Returns null when nothing can be drawn, else
 * { times, lines: [{ name, values, min, max }] } (min/max for the envelope band).
 */
export function alignSeries(series, metricKey, maxGap = 3) {
  const usable = (series || []).filter(s => s && s.pts && s.pts.length);
  if (!usable.length) return null;
  const lastT = (s) => s.pts[s.pts.length - 1].time;
  const ref = usable.reduce((a, b) => (
    b.pts.length > a.pts.length || (b.pts.length === a.pts.length && lastT(b) > lastT(a)) ? b : a));
  const times = ref.pts.map(p => p.time);
  const tol = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) / 2 : Infinity;
  const lines = usable.map(s => {
    const samples = times.map(t => sampleAt(s.pts, t, tol));
    const pick = (f) => fillShortGaps(samples.map(p => (p && p[metricKey] ? round1(p[metricKey][f]) : null)), maxGap);
    return { name: s.name, values: pick('avg'), min: pick('min'), max: pick('max') };
  });
  return { times, lines };
}

/**
 * Y-axis ceiling. CPU and memory use 0-100; IO wait normally sits in single
 * digits, so it scales to the visible data (and the threshold) instead of
 * flattening against 100.
 */
export function axisMax(metricKey, lines, threshold) {
  if (metricKey !== 'iowait') return 100;
  const peak = Math.max(0, ...(lines || []).flatMap(l => l.values.filter(v => v != null)));
  const ceiling = Math.max(peak, typeof threshold === 'number' ? threshold : 0);
  return Math.min(100, Math.ceil((ceiling * 1.15) / 5) * 5) || 10;
}

/** Last non-missing value of a line, or null. */
export const lastValue = (values) => {
  for (let i = (values || []).length - 1; i >= 0; i--) if (values[i] != null) return values[i];
  return null;
};

/**
 * Lowest and highest node right now. Prefers the API's cluster_spread figure
 * for the metric (so it reads the same as the KPI row); otherwise uses each
 * line's last value. Returns null with fewer than two nodes.
 * -> { spread, low: { name, value }, high: { name, value } }
 */
export function spreadNow(metricKey, lines, clusterSpread) {
  const m = COMPARE_METRICS.find(x => x.key === metricKey);
  const api = m && m.spreadKey ? clusterSpread?.[m.spreadKey] : null;
  if (api && typeof api.spread === 'number' && api.min_node && api.max_node
      && typeof api.min === 'number' && typeof api.max === 'number') {
    return { spread: api.spread, low: { name: api.min_node, value: api.min }, high: { name: api.max_node, value: api.max } };
  }
  const vals = (lines || []).map(l => ({ name: l.name, value: lastValue(l.values) })).filter(v => v.value != null);
  if (vals.length < 2) return null;
  let low = vals[0], high = vals[0];
  vals.forEach(v => { if (v.value < low.value) low = v; if (v.value > high.value) high = v; });
  return { spread: high.value - low.value, low, high };
}

// Whole numbers from 10 up, one decimal below (IO wait lives in single digits).
const num = (v) => (Math.abs(v) >= 10 ? String(Math.round(v)) : String(+v.toFixed(1)));

/** "Spread now: 24 pts (pve6 26% → pve3 50%)", or "Spread now: —". */
export function spreadText(s) {
  if (!s) return 'Spread now: —';
  return `Spread now: ${num(s.spread)} pts (${s.low.name} ${num(s.low.value)}% → ${s.high.name} ${num(s.high.value)}%)`;
}
