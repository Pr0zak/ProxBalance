/**
 * Shared series helpers for the node resource charts: the per-node chart
 * (NodeChart) and the cross-node metric comparison (MetricCompareCard).
 */

export const SOURCE_TIMEFRAME = { '1h': 'hour', '6h': 'day', '12h': 'day', '24h': 'day', '7d': 'week', '30d': 'month', '1y': 'year' };
export const PERIOD_SECONDS = { '1h': 3600, '6h': 6 * 3600, '12h': 12 * 3600, '24h': 24 * 3600, '7d': 7 * 24 * 3600, '30d': 30 * 24 * 3600, '1y': 365 * 24 * 3600 };
// Sample windows sized so each period renders ~150-180 points from the (already
// downsampled) RRD source. Each rendered point also carries the window's min/max
// for the envelope band.
export const SAMPLE_RATE = { '1h': 1, '6h': 2, '12h': 4, '24h': 8, '7d': 2, '30d': 8, '1y': 5 };
export const MULTI_DAY = ['7d', '30d', '1y'];

// Distinct per-node colors, shared with the Cluster Health chart so a node keeps
// the same color in every view (cycled if there are more nodes than colors).
export const NODE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Resource series drawn on each per-node chart. `color` is the line color and is
// reused by the metric chips that double as the legend.
export const RESOURCE_METRICS = [
  { key: 'cpu',    label: 'CPU',    long: 'CPU',    color: '#3b82f6', current: (n) => n.cpu_percent || 0 },
  { key: 'mem',    label: 'Mem',    long: 'Memory', color: '#10b981', current: (n) => n.mem_percent || 0 },
  { key: 'iowait', label: 'IOWait', long: 'IOWait', color: '#f59e0b', current: (n) => n.metrics?.current_iowait || 0 },
];

export const withAlpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const hasTrendData = (node) =>
  !!node?.trend_data && typeof node.trend_data === 'object' && Object.keys(node.trend_data).length > 0;

const aggWindow = (pts, key) => {
  const vals = pts.map(p => (key === 'iowait' ? (p.iowait || 0) : p[key])).filter(v => typeof v === 'number');
  if (!vals.length) return { avg: 0, min: 0, max: 0 };
  return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, min: Math.min(...vals), max: Math.max(...vals) };
};

/**
 * Window-aggregate a node's RRD trend data for the selected period.
 *
 * Returns null when there is nothing to plot, otherwise
 * { pts: [{ time, cpu, mem, iowait }], step, latestTime, periodSeconds, multiDay }
 * where each metric is { avg, min, max } over its sample window.
 */
export function buildNodeSeries(trendData, chartPeriod) {
  if (!trendData || typeof trendData !== 'object') return null;
  const periodSeconds = PERIOD_SECONDS[chartPeriod] || 24 * 3600;
  let raw = trendData[SOURCE_TIMEFRAME[chartPeriod] || 'day'] || [];
  if (raw.length === 0) raw = trendData.day || [];
  if (raw.length === 0) return null;

  const latestTime = raw.reduce((m, p) => Math.max(m, p.time), 0);
  const filtered = raw.filter(p => (latestTime - p.time) <= periodSeconds);
  if (filtered.length === 0) return null;

  const step = Math.max(1, SAMPLE_RATE[chartPeriod] || 1);
  const pts = [];
  for (let i = 0; i < filtered.length; i += step) {
    const win = filtered.slice(i, Math.min(filtered.length, i + step));
    pts.push({ time: win[0].time, cpu: aggWindow(win, 'cpu'), mem: aggWindow(win, 'mem'), iowait: aggWindow(win, 'iowait') });
  }
  const last = filtered[filtered.length - 1];
  if (pts[pts.length - 1].time !== last.time) {
    pts.push({ time: last.time, cpu: aggWindow([last], 'cpu'), mem: aggWindow([last], 'mem'), iowait: aggWindow([last], 'iowait') });
  }
  return { pts, step, latestTime, periodSeconds, multiDay: MULTI_DAY.includes(chartPeriod) };
}

export const timeLabel = (unixSeconds, multiDay) => {
  const d = new Date(unixSeconds * 1000);
  return multiDay ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Index of the entry in a sorted `times` array closest to `t`. */
export const nearestIndex = (times, t) => {
  let bi = 0, bd = Infinity;
  for (let k = 0; k < times.length; k++) {
    const d = Math.abs(times[k] - t);
    if (d < bd) { bd = d; bi = k; }
  }
  return bi;
};

/** Status color (r,g,b) for a migration marker line. */
export const migrationRgb = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'success') return '34,197,94';
  if (s === 'failed' || s === 'error' || s === 'cancelled') return '239,68,68';
  return '234,179,8';
};

/**
 * Migration marker annotations (vertical dashed lines) for the rendered window.
 * `involves(mig)` filters which migrations belong on this chart.
 */
export function migrationAnnotations(migrationHistory, times, latestTime, periodSeconds, involves) {
  const out = {};
  (migrationHistory || []).forEach((mig, i) => {
    if (involves && !involves(mig)) return;
    const t = new Date(mig.timestamp).getTime() / 1000;
    if (isNaN(t) || t < (latestTime - periodSeconds) || t > latestTime) return;
    out[`mig_${i}`] = {
      type: 'line', scaleID: 'x', value: nearestIndex(times, t),
      borderColor: `rgba(${migrationRgb(mig.status)},0.6)`, borderWidth: 1, borderDash: [3, 2],
    };
  });
  return out;
}

/**
 * Right-hand y axis whose only ticks are the threshold values, so threshold
 * labels sit in the axis gutter instead of on top of the plotted lines.
 * `lines` is [{ value, color, label }]; returns null when there is nothing to show.
 */
export function thresholdAxis(lines, yMax, fontSize = 9) {
  const shown = lines.filter(l => typeof l.value === 'number' && l.value >= 0 && l.value <= yMax);
  if (!shown.length) return null;
  const byValue = new Map(shown.map(l => [l.value, l]));
  return {
    position: 'right', min: 0, max: yMax,
    grid: { display: false, drawTicks: false },
    border: { display: false },
    afterBuildTicks: (axis) => { axis.ticks = [...byValue.keys()].sort((a, b) => a - b).map(value => ({ value })); },
    ticks: {
      autoSkip: false, padding: 3,
      font: { size: fontSize, weight: '600' },
      color: (ctx) => byValue.get(ctx.tick?.value)?.color || '#9ca3af',
      callback: (v) => byValue.get(v)?.label ?? '',
    },
  };
}

/** Theme colors shared by the Chart.js charts on the Charts tab. */
export const chartTheme = (isDark) => ({
  grid: isDark ? '#374151' : '#e5e7eb',
  tick: isDark ? '#9ca3af' : '#6b7280',
  tooltip: {
    backgroundColor: isDark ? '#1f2937' : '#fff', titleColor: isDark ? '#f3f4f6' : '#111827', bodyColor: isDark ? '#d1d5db' : '#374151',
    borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: 1,
  },
  crosshair: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
});

/** Tracks the `dark` class on <html> so charts can restyle on theme change. */
export function useIsDark() {
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

/**
 * Synced crosshair: draw/update a vertical line at the time hovered on any
 * sibling chart, without rebuilding the chart.
 */
export function useCrosshair(chartRef, timesRef, hoverTime, isDark) {
  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chart.options?.plugins?.annotation) return;
    const anns = chart.options.plugins.annotation.annotations;
    if (hoverTime == null) {
      if (anns.crosshair) { delete anns.crosshair; chart.update('none'); }
      return;
    }
    anns.crosshair = { type: 'line', scaleID: 'x', value: nearestIndex(timesRef.current, hoverTime), borderColor: chartTheme(isDark).crosshair, borderWidth: 1 };
    chart.update('none');
  }, [hoverTime, isDark]);
}
