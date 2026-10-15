// Pure helpers for the Forecasts card: which node metrics are heading for a
// limit, in what order, and how to say it. No React, so tests/js can import it.

/**
 * The longest horizon asked for (the backend's default too). A fit over a
 * short history is projected less far: the backend sends the horizon it used
 * per metric (`forecast.horizon_days`, at most twice the history it fitted).
 */
export const FORECAST_HORIZON_DAYS = 30;

/** Charts shown before "Show all". */
export const VISIBLE_FORECASTS = 3;

/** Below this r² a fit counts as no clear trend (backend "low" confidence). */
export const WEAK_FIT_R2 = 0.4;

const METRIC_WORDS = { cpu: 'CPU', memory: 'memory', iowait: 'IO wait' };
const METRIC_ORDER = ['cpu', 'memory', 'iowait'];
const RISING = new Set(['rising', 'sustained_increase']);

const pct = (v) => `${Math.round(v)}%`;
const metricWords = (metric) => METRIC_WORDS[metric] || metric;

/** 2.04 → 2, 0.46 → 0.5, 12.6 → 13. */
function rateWords(rate) {
  const r = Math.abs(rate || 0);
  const v = r >= 10 ? Math.round(r) : Math.round(r * 10) / 10;
  return `${v} point${v === 1 ? '' : 's'} a day`;
}

/**
 * The forecast status for one metric. Newer backends send `status`; for older
 * ones it is worked out from `days_to_limit` and the current value.
 */
export function forecastStatus(m) {
  const fc = m?.forecast;
  if (!fc) return null;
  if (fc.status) return fc.status;
  if (typeof fc.limit !== 'number') return 'no_limit';
  if (typeof fc.days_to_limit === 'number' && fc.days_to_limit > 0) return 'crossing';
  if (typeof m.current_avg === 'number' && m.current_avg >= fc.limit) return 'over_limit';
  return (m.rate_per_day || 0) > 0 ? 'beyond_horizon' : 'not_rising';
}

const horizonOf = (m) => (typeof m?.forecast?.horizon_days === 'number' ? m.forecast.horizon_days : FORECAST_HORIZON_DAYS);
const firm = (m) => m.confidence && m.confidence !== 'low';
const risingFirmly = (m) => firm(m) && (m.rate_per_day || 0) > 0 && RISING.has(m.direction);

function metricsOf(trends) {
  return Object.values(trends?.nodes || {})
    .flatMap(n => METRIC_ORDER.map(metric => ({ node: n.node, metric, m: n[metric] || {} })))
    .map(x => ({ ...x, status: forecastStatus(x.m) }))
    .filter(x => x.status);
}

const byNodeMetric = (a, b) => a.node.localeCompare(b.node) || METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric);

/**
 * Node metrics that get a chart, most urgent first: those already past their
 * limit and still rising (`kind: 'over'`, `days` = days to 100 % or null),
 * then those that reach their limit within the horizon (`kind: 'crossing'`).
 * Medium-confidence fits are marked rough; low-confidence ones are not
 * projected (see weakFits).
 */
export function projectedCrossings(trends) {
  const card = ({ node, metric, m }, kind, days) => ({
    node, metric, m, kind, days,
    forecast: m.forecast,
    limit: m.forecast.limit,
    rough: m.confidence !== 'high',
  });
  const items = metricsOf(trends);
  const over = items
    .filter(x => x.status === 'over_limit' && typeof x.m.forecast.limit === 'number' && risingFirmly(x.m))
    .map(x => card(x, 'over', typeof x.m.forecast.days_to_full === 'number' ? x.m.forecast.days_to_full : null))
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity) || byNodeMetric(a, b));
  const crossing = items
    .filter(x => x.status === 'crossing' && firm(x.m) && typeof x.m.forecast.limit === 'number'
      && typeof x.m.forecast.days_to_limit === 'number' && x.m.forecast.days_to_limit > 0)
    .map(x => card(x, 'crossing', x.m.forecast.days_to_limit))
    .sort((a, b) => a.days - b.days || byNodeMetric(a, b));
  return [...over, ...crossing];
}

/**
 * Confident rises that stay under the limit for the whole horizon:
 * [{ node, metric, rate, limit, horizon }].
 */
export function risingBeyondHorizon(trends) {
  return metricsOf(trends)
    .filter(x => x.status === 'beyond_horizon' && risingFirmly(x.m) && typeof x.m.forecast.limit === 'number')
    .map(({ node, metric, m }) => ({ node, metric, rate: m.rate_per_day, limit: m.forecast.limit, horizon: horizonOf(m) }))
    .sort(byNodeMetric);
}

/**
 * Metrics whose straight line would reach the limit within the horizon, but
 * whose fit is too weak (r² under WEAK_FIT_R2) to call it a forecast.
 */
export function weakFits(trends) {
  return metricsOf(trends)
    .filter(x => x.status === 'crossing' && !firm(x.m))
    .map(({ node, metric, m }) => ({ node, metric, r2: m.r_squared }))
    .sort(byNodeMetric);
}

/**
 * The horizon every node was checked over (the shortest one used) and
 * whether a short history cut it below what was asked for.
 */
export function checkedHorizon(trends) {
  const fcs = metricsOf(trends).map(x => x.m.forecast);
  if (!fcs.length) return { days: FORECAST_HORIZON_DAYS, capped: false, windowDays: null };
  const shortest = fcs.reduce((a, b) => ((b.horizon_days ?? FORECAST_HORIZON_DAYS) < (a.horizon_days ?? FORECAST_HORIZON_DAYS) ? b : a));
  const days = shortest.horizon_days ?? FORECAST_HORIZON_DAYS;
  const max = shortest.max_horizon_days ?? FORECAST_HORIZON_DAYS;
  return { days, capped: days < max, windowDays: shortest.window_days ?? null };
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

/** "14 days", "1 day", "12 hours" for a horizon. */
export function spanPhrase(days) {
  if (typeof days !== 'number' || !isFinite(days) || days <= 0) return '0 days';
  if (days < 1) {
    const h = Math.max(1, Math.round(days * 24));
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  const d = Math.round(days);
  return `${d} day${d === 1 ? '' : 's'}`;
}

/**
 * "pve5 memory reaches 85% in about 12 days";
 * "pve5 memory is past its 70% limit and reaches 100% in about 10 days".
 */
export function headline({ node, metric, limit, days, kind = 'crossing' }) {
  const words = metricWords(metric);
  const when = timePhrase(days);
  if (kind === 'over') {
    return when === '—'
      ? `${node} ${words} is past its ${pct(limit)} limit and still rising`
      : `${node} ${words} is past its ${pct(limit)} limit and reaches 100% in ${when}`;
  }
  return when === '—'
    ? `${node} ${words} is heading for ${pct(limit)}`
    : `${node} ${words} reaches ${pct(limit)} in ${when}`;
}

/** "cygnus memory rises 0.4 points a day and doesn't reach 70% within 30 days". */
export function beyondText({ node, metric, rate, limit, horizon }) {
  return `${node} ${metricWords(metric)} rises ${rateWords(rate)} and doesn't reach ${pct(limit)} within ${spanPhrase(horizon)}`;
}

/** "Not projected, fit too weak (r² under 0.4): lyra CPU, vega IO wait". */
export function weakText(fits) {
  if (!fits?.length) return null;
  return `Not projected, fit too weak (r² under ${WEAK_FIT_R2}): ${fits.map(f => `${f.node} ${metricWords(f.metric)}`).join(', ')}`;
}

/**
 * The all-clear line: "No node below its limit reaches it within 30 days".
 * When the history is shorter than the selected window (`selectedDays`), the
 * horizon was cut to twice that history, and the line says how much there is.
 */
export function clearText(horizon = { days: FORECAST_HORIZON_DAYS, capped: false }, selectedDays = null) {
  const base = `No node below its limit reaches it within ${spanPhrase(horizon.days)}`;
  const short = horizon.capped && typeof horizon.windowDays === 'number'
    && typeof selectedDays === 'number' && horizon.windowDays < 0.9 * selectedDays;
  return short ? `${base} (only ${spanPhrase(horizon.windowDays)} of history)` : base;
}

/** "Now 54%, rising about 2 points a day." */
export function nowText(m) {
  if (typeof m?.current_avg !== 'number') return '—';
  return `Now ${pct(m.current_avg)}, rising about ${rateWords(m.rate_per_day)}.`;
}

/**
 * One x range (days, 0 = now) for every chart: the whole history window on
 * the left, and on the right a little past the furthest day shown, never
 * beyond the longest horizon used by those charts.
 */
export function sharedDayRange(crossings, windowDays, horizonDays) {
  const horizon = typeof horizonDays === 'number' ? horizonDays
    : Math.max(0, ...crossings.map(c => c.forecast?.horizon_days ?? FORECAST_HORIZON_DAYS));
  const furthest = Math.max(0, ...crossings.map(c => (typeof c.days === 'number' ? c.days : horizon)));
  return { min: -windowDays, max: Math.min(horizon, Math.max(3, Math.ceil(furthest * 1.25))) };
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
