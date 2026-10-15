/**
 * Pure helpers for the "One chart" node comparison (NodeCompareChart): node
 * colours, averaging every node's samples into shared time buckets, the y-axis
 * ceiling, the min/max band and the spread line under the chart.
 * No React or Chart.js here, so tests/js/compare-series.mjs can run them in node.
 */
import { NODE_COLORS } from './nodeSeries.js';

/** Metrics the one-chart view can show, in segmented-control order. */
export const COMPARE_METRICS = [
  { key: 'cpu',    label: 'CPU' },
  { key: 'mem',    label: 'Memory' },
  { key: 'iowait', label: 'IO wait' },
];

/**
 * Buckets either side of a point that the min/max band looks at when buckets
 * hold a single raw sample each (1h, 7d and 90d on a stock RRD), so the band
 * covers 2 * BAND_REACH + 1 samples instead of collapsing onto the line.
 */
export const BAND_REACH = 2;

/**
 * Stable colour per node: names sorted, then NODE_COLORS in order (cycled), the
 * same rule the Cluster Health chart uses so a node keeps its colour everywhere.
 */
export function nodeColors(names) {
  const out = {};
  Array.from(new Set(names || [])).sort().forEach((n, i) => { out[n] = NODE_COLORS[i % NODE_COLORS.length]; });
  return out;
}

/**
 * Averaging window per period, in seconds. Each period keeps roughly 180-360
 * points per node so short spikes still show: 1h and 7d use the raw RRD step
 * (1 min, 30 min) and 90d the raw 6 h year step; the others average just enough
 * samples to keep four lines apart.
 */
export const COMPARE_BUCKETS = {
  '1h': 60, '6h': 120, '1d': 300, '7d': 1800,
  '30d': 2 * 3600, '90d': 6 * 3600, '180d': 12 * 3600, '1yr': 86400,
};

/** "15-min averages", "1-hour averages", "2-day averages". */
export function averageLabel(bucketSeconds) {
  const s = bucketSeconds;
  if (s < 3600) return `${Math.round(s / 60)}-min averages`;
  if (s < 86400) return `${Math.round(s / 3600)}-hour averages`;
  return `${Math.round(s / 86400)}-day averages`;
}

/**
 * Fill a missing first or last value (up to `maxEdge` in a row) from its
 * neighbour, so a node whose newest sample lags the others by a bucket doesn't
 * end its line early. Gaps inside the series are never filled: an empty bucket
 * means no samples at all for that whole stretch (node offline).
 */
export function fillEdges(values, maxEdge = 1) {
  const out = values.slice();
  const n = out.length;
  const first = out.findIndex(v => v != null);
  if (first < 0) return out;
  let last = n - 1;
  while (out[last] == null) last--;
  if (first <= maxEdge) for (let i = 0; i < first; i++) out[i] = out[first];
  if (n - 1 - last <= maxEdge) for (let i = last + 1; i < n; i++) out[i] = out[last];
  return out;
}

const round1 = (v) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(1) : null);
const isNum = (v) => typeof v === 'number' && isFinite(v);

/** The RRD rows a node's chart uses for this period (same choice as buildNodeSeries). */
const rawRows = (trendData, cfg) => {
  if (!trendData || typeof trendData !== 'object') return [];
  const rows = trendData[cfg.rrd] || [];
  return rows.length ? rows : (trendData.day || []);
};

/**
 * Every node on one time axis for one metric, averaged per bucket.
 *
 * `nodes` is [{ name, trendData }] (raw RRD rows: { time, cpu, mem, iowait });
 * `cfg` is a CHART_PERIODS entry. Buckets are clock-aligned
 * (floor(time / bucket)) and cover the period, starting at the first whole
 * bucket, up to the newest sample of any node, so every node shares one axis. A bucket with no samples for a node is
 * null (a gap; nothing is averaged across it); only a missing first or last
 * bucket is filled (fillEdges).
 *
 * Returns null when nothing can be drawn, else
 * { times, bucket, label, latestTime, periodSeconds, band, lines: [{ name, values, min, max }] }
 * with times in unix seconds and values the bucket averages.
 *
 * min/max is the band. When buckets typically hold two or more raw samples it
 * is the raw range inside each bucket (band.rolling false). When they hold one
 * (the bucket equals the RRD step, so the line is the raw samples), an
 * in-bucket range would have zero width; the band is then the lowest and
 * highest raw sample within BAND_REACH buckets either side of each point
 * (band.rolling true). Either way the line lies inside the band and every band
 * edge is a real sample. band.seconds is the span the band covers.
 */
export function bucketSeries(nodes, cfg, metricKey, bucket = COMPARE_BUCKETS[cfg.id] || 300) {
  const periodSeconds = cfg.ms / 1000;
  const withRows = (nodes || []).map(n => ({ name: n.name, rows: rawRows(n.trendData, cfg) })).filter(n => n.rows.length);
  if (!withRows.length) return null;
  const latestTime = Math.max(...withRows.map(n => n.rows.reduce((m, p) => Math.max(m, p.time), 0)));
  const from = latestTime - periodSeconds;
  const startB = Math.ceil(from / bucket);
  const count = Math.floor(latestTime / bucket) - startB + 1;
  const times = Array.from({ length: count }, (_, i) => (startB + i) * bucket);
  const perNode = withRows.map(n => {
    const sum = new Array(count).fill(0), cnt = new Array(count).fill(0);
    const lo = new Array(count).fill(null), hi = new Array(count).fill(null);
    n.rows.forEach(p => {
      const v = p[metricKey];
      if (!isNum(v) || p.time < startB * bucket || p.time > latestTime) return;
      const i = Math.floor(p.time / bucket) - startB;
      sum[i] += v; cnt[i] += 1;
      lo[i] = lo[i] == null ? v : Math.min(lo[i], v);
      hi[i] = hi[i] == null ? v : Math.max(hi[i], v);
    });
    return { name: n.name, cnt, lo, hi, avg: sum.map((s, i) => (cnt[i] ? round1(s / cnt[i]) : null)) };
  }).filter(l => l.avg.some(v => v != null));
  if (!perNode.length) return null;
  const rolling = medianCount(perNode.flatMap(l => l.cnt)) < 2;
  const lines = perNode.map(l => {
    const lo = rolling ? rollingExtreme(l.lo, BAND_REACH, Math.min) : l.lo;
    const hi = rolling ? rollingExtreme(l.hi, BAND_REACH, Math.max) : l.hi;
    return { name: l.name, values: fillEdges(l.avg), min: fillEdges(lo.map(round1)), max: fillEdges(hi.map(round1)) };
  });
  const band = { rolling, seconds: rolling ? (2 * BAND_REACH + 1) * bucket : bucket };
  // One sample per bucket means nothing was averaged; say so.
  const label = rolling ? `raw samples every ${spanText(bucket)}` : averageLabel(bucket);
  return { times, bucket, label, latestTime, periodSeconds, band, lines };
}

/** Median of the non-zero sample counts per bucket (0 when there are none). */
function medianCount(counts) {
  const c = counts.filter(n => n > 0).sort((a, b) => a - b);
  return c.length ? c[Math.floor(c.length / 2)] : 0;
}

/**
 * For each bucket that has a value, the min (or max) over the buckets within
 * `reach` of it; empty buckets stay null so an outage remains a gap.
 */
export function rollingExtreme(values, reach, pick) {
  return values.map((v, i) => {
    if (v == null) return null;
    let out = v;
    for (let j = Math.max(0, i - reach); j <= Math.min(values.length - 1, i + reach); j++) {
      if (values[j] != null) out = pick(out, values[j]);
    }
    return out;
  });
}

/** "5 min", "2.5 hours", "1 day". */
export function spanText(seconds) {
  const fmt = (v, unit) => `${+v.toFixed(1)} ${unit}${+v.toFixed(1) === 1 ? '' : 's'}`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return fmt(seconds / 3600, 'hour');
  return fmt(seconds / 86400, 'day');
}

/** What the min/max band shows, for the line under the chart. */
export function bandText(band) {
  if (!band) return '';
  return band.rolling
    ? `band: lowest to highest sample over ${spanText(band.seconds)} around each point`
    : `band: lowest to highest sample in each ${averageLabel(band.seconds).replace(/ averages$/, '')} average`;
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

/**
 * Lowest and highest node at the last plotted point: the newest bucket of the
 * series, as drawn (a node lagging by one bucket shows its previous bucket,
 * as its line does). Nodes in `hidden`, and nodes with no value there (offline),
 * are left out. Returns null with fewer than two values.
 * -> { spread, low: { name, value }, high: { name, value } }
 */
export function spreadAtLast(lines, hidden = []) {
  const vals = (lines || [])
    .filter(l => !hidden.includes(l.name))
    .map(l => ({ name: l.name, value: (l.values || [])[(l.values || []).length - 1] }))
    .filter(v => isNum(v.value));
  if (vals.length < 2) return null;
  // Ties: low is the first node with the lowest value, high the last with the
  // highest, so a 0-pt spread still names two nodes.
  let low = vals[0], high = vals[0];
  vals.forEach(v => { if (v.value < low.value) low = v; if (v.value >= high.value) high = v; });
  return { spread: high.value - low.value, low, high };
}

// Whole numbers from 10 up, one decimal below (IO wait lives in single digits).
const num = (v) => (Math.abs(v) >= 10 ? String(Math.round(v)) : String(+v.toFixed(1)));

/**
 * "Spread 24 pts at 14:35 (vega 26% → lyra 50%)", or "Spread at 14:35: —".
 * `when` is the last point's time label.
 */
export function spreadText(s, when) {
  const at = when ? ` at ${when}` : '';
  if (!s) return `Spread${at}: —`;
  return `Spread ${num(s.spread)} pts${at} (${s.low.name} ${num(s.low.value)}% → ${s.high.name} ${num(s.high.value)}%)`;
}
