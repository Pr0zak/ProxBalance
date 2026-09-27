import { RefreshCw } from '../Icons.jsx';

const { useState, useEffect, useRef } = React;

export const METRICS = [['cpu', 'CPU'], ['memory', 'Memory'], ['iowait', 'IOWait']];

// Trend-fit windows. A short window catches a sudden climb; a long one shows
// slow creep that a week of noise hides.
export const RANGES = [[1, '24 h'], [7, '7 d'], [30, '30 d'], [90, '90 d']];
export const RANGE_LABEL = { 1: '24 hours', 7: '7 days', 30: '30 days', 90: '90 days' };
export const RANGE_ADJ = { 1: '24-hour', 7: '7-day', 30: '30-day', 90: '90-day' };

/** Projections further out than this are noise, not a deadline. */
export const HORIZON_LIMIT_HOURS = 24 * 365;

/** "3 d", "5 wk", "> 1 yr" or "—" for a projected hours-to-threshold. */
export function formatHorizon(hours) {
  if (hours == null) return '—';
  if (hours > HORIZON_LIMIT_HOURS) return '> 1 yr';
  if (hours < 48) return `${Math.round(hours)} h`;
  if (hours < 24 * 60) return `${Math.round(hours / 24)} d`;
  return `${Math.round(hours / 24 / 7)} wk`;
}

/**
 * Confident threshold crossings from a /api/trends/nodes response, soonest
 * first. Low-confidence fits (r² near 0) project noise and are left out.
 */
export function trendCrossings(trends, thresholds) {
  const nodes = Object.values(trends?.nodes || {});
  return nodes
    .flatMap(n => METRICS.map(([k, label]) => ({ node: n.node, metric: k, label, m: n[k] || {}, threshold: thresholds[k] })))
    .filter(({ m }) => m.confidence && m.confidence !== 'low' && m.hours_to_threshold != null && m.hours_to_threshold < HORIZON_LIMIT_HOURS)
    .sort((a, b) => a.m.hours_to_threshold - b.m.hours_to_threshold);
}

/**
 * Load `loader()` whenever `deps` change. Keeps the last good data while a new
 * request is in flight and drops responses that a newer request superseded.
 */
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const seq = useRef(0);
  const load = async () => {
    const id = ++seq.current;
    setState(s => ({ ...s, loading: true }));
    const res = await loader();
    if (id !== seq.current) return;
    const failed = !res || res.error || res.success === false;
    const message = res?.message || (typeof res?.error === 'string' ? res.error : 'request failed');
    setState(s => (failed
      ? { loading: false, data: s.data, error: message }
      : { loading: false, data: res, error: null }));
  };
  useEffect(() => { load(); }, deps);
  return [state, load];
}

export function Loading() {
  return <div className="text-sm text-pb-text2 dark:text-gray-400 flex items-center gap-2 py-4"><RefreshCw size={14} className="animate-spin" /> Loading…</div>;
}

export function Failed({ error }) {
  return <div className="text-sm text-red-600 dark:text-red-400 py-2">Couldn't load: {error}</div>;
}
