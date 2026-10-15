// Pure helpers for the Forecasts card: which node metrics are heading for a
// limit, in what order, and how to say it. No React, so tests/js can import it.

/** Crossings further out than this are not shown (the backend's default too). */
export const FORECAST_HORIZON_DAYS = 30;

/** Charts shown before "Show all". */
export const VISIBLE_FORECASTS = 3;

const METRIC_WORDS = { cpu: 'CPU', memory: 'memory', iowait: 'IO wait' };
const METRIC_ORDER = ['cpu', 'memory', 'iowait'];

const pct = (v) => `${Math.round(v)}%`;

/**
 * Node metrics whose trend reaches its limit within the horizon, soonest
 * first. Reads the `forecast` block /api/trends/nodes returns with series=1.
 * Low-confidence fits project noise and are left out (the same rule as the
 * Node trends banner); medium ones are kept but marked rough.
 */
export function projectedCrossings(trends) {
  const nodes = Object.values(trends?.nodes || {});
  return nodes
    .flatMap(n => METRIC_ORDER.map(metric => ({ node: n.node, metric, m: n[metric] || {} })))
    .filter(({ m }) => {
      const fc = m.forecast;
      return fc && typeof fc.days_to_limit === 'number' && fc.days_to_limit > 0
        && typeof fc.limit === 'number' && m.confidence && m.confidence !== 'low';
    })
    .map(({ node, metric, m }) => ({
      node, metric, m,
      forecast: m.forecast,
      days: m.forecast.days_to_limit,
      limit: m.forecast.limit,
      rough: m.confidence !== 'high',
    }))
    .sort((a, b) => a.days - b.days || a.node.localeCompare(b.node)
      || METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric));
}

/** "about 12 days", "about 1 day", "about 5 hours"; "—" when unknown. */
export function timePhrase(days) {
  if (typeof days !== 'number' || !isFinite(days) || days <= 0) return '—';
  if (days < 1) {
    const h = Math.max(1, Math.round(days * 24));
    return `about ${h} hour${h === 1 ? '' : 's'}`;
  }
  const d = Math.round(days);
  return `about ${d} day${d === 1 ? '' : 's'}`;
}

/** "rigel memory reaches 85% in about 12 days". */
export function headline({ node, metric, limit, days }) {
  const words = METRIC_WORDS[metric] || metric;
  const when = timePhrase(days);
  return when === '—'
    ? `${node} ${words} is heading for ${pct(limit)}`
    : `${node} ${words} reaches ${pct(limit)} in ${when}`;
}

/** The one line shown when nothing crosses within the horizon. */
export function clearText(horizonDays = FORECAST_HORIZON_DAYS) {
  return `No node is heading for a limit in the next ${horizonDays} days`;
}

/** "Now 54%, rising about 2 points a day." */
export function nowText(m) {
  if (typeof m?.current_avg !== 'number') return '—';
  const rate = Math.abs(m.rate_per_day || 0);
  const r = rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10;
  return `Now ${pct(m.current_avg)}, rising about ${r} point${r === 1 ? '' : 's'} a day.`;
}

/**
 * One x range (days, 0 = now) for every chart: the whole history window on
 * the left, and on the right a little past the furthest crossing shown, never
 * beyond the horizon.
 */
export function sharedDayRange(crossings, windowDays, horizonDays = FORECAST_HORIZON_DAYS) {
  const furthest = Math.max(0, ...crossings.map(c => c.days));
  const max = Math.min(horizonDays, Math.max(3, Math.ceil(furthest * 1.25)));
  return { min: -windowDays, max };
}

/** Axis tick: "7d ago", "now", "in 14d". */
export function dayTick(v) {
  const d = Math.round(v * 10) / 10;
  if (d === 0) return 'now';
  return d < 0 ? `${-d}d ago` : `in ${d}d`;
}

/** Engine alerts (recommendation cache) as the same kind of crossing. */
export function engineCrossings(forecasts) {
  return (forecasts || [])
    .map(f => {
      const hours = f.estimated_hours_to_crossing ?? f.hours_to_threshold;
      return {
        node: f.node || f.source_node, metric: f.metric,
        limit: f.threshold, days: typeof hours === 'number' ? hours / 24 : null,
      };
    })
    .filter(c => c.node && typeof c.limit === 'number')
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
}
