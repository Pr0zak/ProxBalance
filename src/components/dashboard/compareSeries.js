/**
 * Pure helpers for the "One chart" node comparison (NodeCompareChart): node
 * colours, averaging every node's samples into shared time buckets, the y-axis
 * ceiling, and the "Spread now" line under the chart.
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
 * { times, bucket, label, latestTime, periodSeconds, lines: [{ name, values, min, max }] }
 * with times in unix seconds, values the bucket averages and min/max the raw
 * range inside each bucket.
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
  const lines = withRows.map(n => {
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
    const avg = sum.map((s, i) => (cnt[i] ? round1(s / cnt[i]) : null));
    return { name: n.name, values: fillEdges(avg), min: fillEdges(lo.map(round1)), max: fillEdges(hi.map(round1)) };
  }).filter(l => l.values.some(v => v != null));
  if (!lines.length) return null;
  return { times, bucket, label: averageLabel(bucket), latestTime, periodSeconds, lines };
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
