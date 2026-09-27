import { TrendingUp, TrendingDown, Minus } from '../Icons.jsx';
import { FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE, BANNER_WARN } from '../../utils/designTokens.js';
import { METRICS, RANGES, RANGE_LABEL, formatHorizon, trendCrossings, Loading, Failed } from './shared.jsx';

const DIRECTION_ICON = {
  rising: <TrendingUp size={14} className="text-orange-500" />,
  sustained_increase: <TrendingUp size={14} className="text-red-500" />,
  falling: <TrendingDown size={14} className="text-green-500" />,
  stable: <Minus size={14} className="text-pb-text3 dark:text-gray-500" />,
};

// Same per-metric colours as the Dashboard node charts; `key` indexes RRD trend_data.
const SERIES = {
  cpu: { key: 'cpu', rgb: '59, 130, 246' },
  memory: { key: 'mem', rgb: '16, 185, 129' },
  iowait: { key: 'iowait', rgb: '245, 158, 11' },
};
// Which collector RRD timeframe covers each trend window.
const RRD_SOURCE = { 1: 'day', 7: 'week', 30: 'month', 90: 'year' };
const SPARK_POINTS = 90;
const SPARK_W = 120;
const SPARK_H = 28;

/** "30-min", "2-hour", "1-day" for a bucket length in seconds. */
function bucketLabel(seconds) {
  if (!seconds) return null;
  const min = seconds / 60;
  if (min < 90) return `${Math.max(1, Math.round(min / 5) * 5)}-min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}-hour`;
  return `${Math.round(h / 24)}-day`;
}

/**
 * Series for one metric over the selected window from the collector's RRD
 * data, averaged down to ~SPARK_POINTS points. Keeps the raw peak so a short
 * spike still shows in the label even when averaging flattens it.
 */
function windowSeries(trendData, key, days) {
  const src = trendData?.[RRD_SOURCE[days]] || [];
  const samples = src.filter(p => typeof p[key] === 'number' && typeof p.time === 'number');
  if (samples.length < 8) return null;
  const cutoff = samples[samples.length - 1].time - days * 86400;
  const inWindow = samples.filter(p => p.time >= cutoff);
  if (inWindow.length < 8) return null;
  const group = Math.max(1, Math.ceil(inWindow.length / SPARK_POINTS));
  const pts = [];
  for (let i = 0; i < inWindow.length; i += group) {
    const win = inWindow.slice(i, i + group);
    pts.push(win.reduce((a, p) => a + p[key], 0) / win.length);
  }
  const span = inWindow[inWindow.length - 1].time - inWindow[0].time;
  return { pts, peak: Math.max(...inWindow.map(p => p[key])), bucket: pts.length > 1 ? span / (pts.length - 1) : 0 };
}

/** Sparkline scaled 0 → max(threshold, peak) so the gap to the dashed line is the headroom. */
function Spark({ series, threshold, rgb, label, windowLabel }) {
  if (!series || series.pts.length < 2) return null;
  const top = Math.max(threshold || 0, series.peak, 1) * 1.1;
  const over = threshold > 0 && series.peak >= threshold;
  const y = v => SPARK_H - (v / top) * SPARK_H;
  const step = SPARK_W / (series.pts.length - 1);
  const line = series.pts.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <div className="flex items-center gap-2 mt-1">
      <svg
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        className="w-28 sm:w-24 lg:w-36 xl:w-44 h-8 shrink-0"
        role="img"
        aria-label={`${label}, last ${windowLabel}, peak ${Math.round(series.peak)}%${threshold ? `, threshold ${threshold}%` : ''}`}
      >
        <title>{`${label}: peak ${Math.round(series.peak)}% over the last ${windowLabel}${threshold ? ` (threshold ${threshold}%)` : ''}`}</title>
        <polygon points={`0,${SPARK_H} ${line} ${SPARK_W},${SPARK_H}`} fill={`rgba(${rgb}, 0.15)`} />
        <polyline points={line} fill="none" stroke={`rgb(${rgb})`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {threshold > 0 && (
          <line x1="0" x2={SPARK_W} y1={y(threshold)} y2={y(threshold)} stroke="rgb(239, 68, 68)" strokeOpacity="0.75" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <span className="text-[10px] leading-tight whitespace-nowrap text-pb-text3 dark:text-gray-500 tabular-nums">
        <span className={over ? 'font-semibold text-red-600 dark:text-red-400' : ''}>peak {Math.round(series.peak)}%</span>
        {threshold > 0 && <><br />of {threshold}%</>}
      </span>
    </div>
  );
}

export function RangePicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Trend window">
      {RANGES.map(([d, label]) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={`${FILTER_CHIP} ${value === d ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Value, rate, sparkline and projection for one node metric. */
function MetricCell({ node, metricKey, label, m, threshold, trendData, days }) {
  const noTrend = m.confidence === 'low';
  const rateTitle = noTrend
    ? `No clear trend (r² ${m.r_squared ?? 0}): day-to-day noise outweighs the slope`
    : `${m.confidence || 'unknown'} confidence (r² ${m.r_squared ?? '—'})`;
  return (
    <>
      <div className="flex items-center gap-1.5 tabular-nums text-pb-text dark:text-gray-200">
        {DIRECTION_ICON[m.direction] || DIRECTION_ICON.stable}
        <span className="font-medium">{m.current_avg != null ? `${Math.round(m.current_avg)}%` : '—'}</span>
        <span className={`text-xs ${noTrend ? 'text-pb-text3/70 dark:text-gray-600' : 'text-pb-text2 dark:text-gray-400'}`} title={rateTitle}>
          {m.rate_display}
        </span>
      </div>
      <Spark
        series={windowSeries(trendData, SERIES[metricKey].key, days)}
        threshold={threshold}
        rgb={SERIES[metricKey].rgb}
        label={`${node} ${label}`}
        windowLabel={RANGE_LABEL[days]}
      />
      {!noTrend && m.hours_to_threshold != null && m.hours_to_threshold < 24 * 365 && (
        <div className="text-xs text-orange-600 dark:text-orange-400">threshold in {formatHorizon(m.hours_to_threshold)}</div>
      )}
    </>
  );
}

/**
 * Per-node trend table for the selected window. `state` is the page-level
 * /api/trends/nodes load so the Forecasts card reads the same fit.
 */
export default function NodeTrends({ state, days, thresholds, clusterNodes }) {
  const { loading, data, error } = state;
  // Keep the previous table on screen (dimmed) while a new window loads.
  if (loading && !data) return <Loading />;
  if (error) return <Failed error={error} />;
  if (!data?.data_available) return <p className="text-sm text-pb-text2 dark:text-gray-400">Not enough history yet — trends need a few days of collected metrics.</p>;

  const nodes = Object.values(data.nodes || {}).sort((a, b) => a.node.localeCompare(b.node));
  const approaching = trendCrossings(data, thresholds);
  const anySeries = nodes.map(n => windowSeries(clusterNodes?.[n.node]?.trend_data, 'cpu', days)).find(Boolean);
  const bucket = bucketLabel(anySeries?.bucket);
  const cellProps = (n, k, label) => ({
    node: n.node, metricKey: k, label, m: n[k] || {}, threshold: thresholds[k],
    trendData: clusterNodes?.[n.node]?.trend_data, days,
  });

  return (
    <div className={`space-y-3 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={loading}>
      <p className="text-sm text-pb-text dark:text-gray-300">
        Over the last {RANGE_LABEL[days]} the cluster is <strong>{data.cluster_direction}</strong>.
        {data.top_movers?.[0] && data.top_movers[0].direction !== 'stable' && (
          <> Biggest mover: <strong>{data.top_movers[0].node}</strong> {data.top_movers[0].metric} {data.top_movers[0].rate_display}.</>
        )}
      </p>
      {approaching.length > 0 && (
        <div className={BANNER_WARN}>
          <TrendingUp size={16} className="shrink-0" />
          <div className="text-sm">
            {approaching.map(({ node, label, m, threshold }, i) => (
              <span key={`${node}-${label}`}>
                {i > 0 && ' · '}
                <strong>{node}</strong> {label.toLowerCase()} reaches {threshold ? `${threshold}%` : 'its threshold'} in ~{formatHorizon(m.hours_to_threshold)}
                <span className="opacity-75"> ({m.rate_display}, {m.confidence} confidence)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Phones: one block per node with the metrics stacked, so nothing clips. */}
      <div className="sm:hidden divide-y divide-pb-border dark:divide-slate-700/50">
        {nodes.map(n => (
          <div key={n.node} className="py-2.5 first:pt-0">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="font-medium text-pb-text dark:text-white">{n.node}</span>
              <span className="text-[11px] text-pb-text3 dark:text-gray-500">{n.overall_stability_label} · {n.data_quality?.coverage_days} d of data</span>
            </div>
            <div className="space-y-2">
              {METRICS.map(([k, label]) => (
                <div key={k} className="grid grid-cols-[4rem_1fr] gap-2 items-start">
                  <span className="text-xs text-pb-text2 dark:text-gray-400 pt-0.5">{label}</span>
                  <div className="min-w-0"><MetricCell {...cellProps(n, k, label)} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-pb-text2 dark:text-gray-400">
              <th className="px-2 py-1.5 font-medium">Node</th>
              {METRICS.map(([k, l]) => <th key={k} className="px-2 py-1.5 font-medium">{l}</th>)}
              <th className="px-2 py-1.5 font-medium hidden md:table-cell">Stability</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(n => (
              <tr key={n.node} className="border-t border-pb-border dark:border-slate-700/50 align-top">
                <td className="px-2 py-2 font-medium text-pb-text dark:text-white">{n.node}</td>
                {METRICS.map(([k, label]) => (
                  <td key={k} className="px-2 py-2"><MetricCell {...cellProps(n, k, label)} /></td>
                ))}
                <td className="px-2 py-2 hidden md:table-cell text-xs text-pb-text2 dark:text-gray-400">
                  {n.overall_stability_label} ({n.overall_stability}/100)
                  <div className="text-pb-text3 dark:text-gray-500">{n.data_quality?.coverage_days} days of data</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-pb-text3 dark:text-gray-500">
        <span>Sparklines: last {RANGE_LABEL[days]}{bucket ? `, ${bucket} averages` : ''}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed border-red-500/70" /> recommendation threshold</span>
        <span>Faded rate = no clear trend (noise outweighs the slope)</span>
      </p>
    </div>
  );
}
