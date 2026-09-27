import { INNER_CARD, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE } from '../../utils/designTokens.js';
import {
  buildNodeSeries, timeLabel, migrationAnnotations, thresholdAxis, chartTheme, withAlpha,
  useIsDark, useCrosshair,
} from './nodeSeries.js';

const { useRef, useEffect } = React;

const THRESHOLD_COLOR = '#ef4444';

// Value of `key` at time t from a sorted point list, or null when no sample sits
// within `tol` seconds (nodes whose RRD rows don't line up leave a gap, not a lie).
const sampleAt = (pts, t, tol) => {
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].time < t) lo = mid + 1; else hi = mid;
  }
  let best = pts[lo];
  if (lo > 0 && Math.abs(pts[lo - 1].time - t) < Math.abs(best.time - t)) best = pts[lo - 1];
  return best && Math.abs(best.time - t) <= tol ? best : null;
};

/**
 * One resource (CPU / Memory / IOWait) across every node: current values ranked
 * highest-first on top (red at/over the recommendation threshold), one line per
 * node below. Clicking a node chip focuses it in all three cards — the others
 * dim, only its migrations are marked, and its min/max band can be shown — so a
 * single host can be followed across resources.
 *
 * `nodes` is [{ name, color, trendData, current, exempt }], memoized by the parent.
 */
export default function MetricCompareCard({ metric, nodes, threshold, focusNode, onFocusNode, showEnvelope, ...chartProps }) {
  const ranked = nodes.slice().sort((a, b) => b.current - a.current);
  const hasThreshold = typeof threshold === 'number';
  const envelopeNote = showEnvelope && (!focusNode ? 'Pick a node to see its min/max band' : chartProps.chartPeriod === '1h' ? 'No min/max band at 1 hour (raw samples)' : null);
  return (
    <div className={INNER_CARD}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-semibold text-pb-text dark:text-white">{metric.long}</h3>
        {hasThreshold && <span className="text-xs text-pb-text2 dark:text-gray-400">threshold {threshold}%</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label={`Focus a node (${metric.long})`}>
        {ranked.map(n => {
          const focused = focusNode === n.name;
          const over = hasThreshold && n.current >= threshold && !n.exempt;
          return (
            <button
              key={n.name}
              type="button"
              aria-pressed={focused}
              onClick={() => onFocusNode(focused ? null : n.name)}
              className={`${FILTER_CHIP} ${focused ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE} !px-2.5 !py-1 inline-flex items-center gap-1.5 ${focusNode && !focused ? 'opacity-50' : ''}`}
              title={`${focused ? 'Show all nodes' : `Focus ${n.name} in every metric`}${over ? ` · over the ${threshold}% threshold` : ''}${n.exempt ? ' · IOWait excluded from scoring (io-exempt guest)' : ''}`}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: n.color }} />
              {n.name}
              <span className={`font-semibold tabular-nums ${over ? 'text-red-600 dark:text-red-400' : focused ? '' : 'text-pb-text dark:text-white'}`}>
                {n.current.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ height: '220px' }}>
        <MetricCompareChart metricKey={metric.key} nodes={nodes} threshold={threshold} focusNode={focusNode} showEnvelope={showEnvelope} {...chartProps} />
      </div>
      {envelopeNote && <p className="mt-1.5 text-[11px] text-pb-text2 dark:text-gray-500">{envelopeNote}</p>}
    </div>
  );
}

function MetricCompareChart({ metricKey, nodes, chartPeriod, chartReady, threshold, migrationHistory, hoverTime, onHoverTime, showMarkers, showThresholds, showEnvelope, focusNode }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const timesRef = useRef([]);
  const isDark = useIsDark();

  useEffect(() => {
    if (!chartReady || !canvasRef.current || typeof Chart === 'undefined') return;
    const series = nodes.map(n => ({ n, s: buildNodeSeries(n.trendData, chartPeriod) })).filter(x => x.s);
    if (!series.length) return;
    const theme = chartTheme(isDark);

    // Time axis from the node with the most samples; others snap within half a step.
    const ref = series.reduce((a, b) => (b.s.pts.length > a.s.pts.length ? b : a)).s;
    const times = ref.pts.map(p => p.time);
    const tol = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) / 2 : Infinity;
    timesRef.current = times;

    const datasets = [];
    series.forEach(({ n, s }) => {
      const focused = focusNode === n.name;
      const dim = focusNode && !focused;
      const samples = times.map(t => sampleAt(s.pts, t, tol));
      datasets.push({
        label: n.name,
        data: samples.map(p => (p ? +p[metricKey].avg.toFixed(1) : null)),
        borderColor: dim ? withAlpha(n.color, 0.18) : n.color,
        backgroundColor: n.color,
        borderWidth: focused ? 2.5 : 1.5,
        order: focused ? 0 : 1,
        tension: 0.2, pointRadius: 0, pointHoverRadius: 3, fill: false, spanGaps: true,
      });
      // Min/max band only for the focused node — four overlapping bands are noise.
      if (focused && showEnvelope && s.step > 1) {
        datasets.push({ label: '__band_max', data: samples.map(p => (p ? +p[metricKey].max.toFixed(1) : null)), borderColor: 'transparent', backgroundColor: withAlpha(n.color, 0.22), pointRadius: 0, pointHoverRadius: 0, fill: '+1', tension: 0.2, order: 2, spanGaps: true });
        datasets.push({ label: '__band_min', data: samples.map(p => (p ? +p[metricKey].min.toFixed(1) : null)), borderColor: 'transparent', backgroundColor: 'transparent', pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0.2, order: 2, spanGaps: true });
      }
    });

    // IOWait normally lives in single digits — scale to the data (and the
    // threshold) instead of flattening it against a 0-100 axis.
    let yMax = 100;
    if (metricKey === 'iowait') {
      const peak = Math.max(0, ...datasets.flatMap(d => d.data.filter(v => v != null)));
      const ceiling = Math.max(peak, showThresholds && typeof threshold === 'number' ? threshold : 0);
      yMax = Math.min(100, Math.ceil((ceiling * 1.15) / 5) * 5) || 10;
    }

    const thLines = showThresholds && typeof threshold === 'number' && threshold <= yMax
      ? [{ value: threshold, color: THRESHOLD_COLOR, label: `${threshold}%` }] : [];
    const annotations = {};
    if (thLines.length) {
      annotations.threshold = { type: 'line', yMin: threshold, yMax: threshold, borderColor: withAlpha(THRESHOLD_COLOR, 0.55), borderWidth: 1, borderDash: [4, 3] };
    }
    if (showMarkers) {
      Object.assign(annotations, migrationAnnotations(migrationHistory, times, ref.latestTime, ref.periodSeconds,
        focusNode ? (mig) => mig.source_node === focusNode || mig.target_node === focusNode : null));
    }

    const scales = {
      x: { grid: { color: theme.grid }, ticks: { color: theme.tick, maxTicksLimit: 6, maxRotation: 0, autoSkipPadding: 12, font: { size: 10 } } },
      y: { min: 0, max: yMax, grid: { color: theme.grid }, ticks: { color: theme.tick, font: { size: 10 }, maxTicksLimit: 6, callback: (v) => v + '%' } },
    };
    const thAxis = thresholdAxis(thLines, yMax);
    if (thAxis) scales.yTh = thAxis;

    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
    try {
      chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
        type: 'line',
        data: { labels: times.map(t => timeLabel(t, ref.multiDay)), datasets },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'index', intersect: false },
          onHover: (e, els) => {
            if (typeof onHoverTime !== 'function') return;
            if (els && els.length) onHoverTime(timesRef.current[els[0].index] ?? null);
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...theme.tooltip,
              filter: (item) => !String(item.dataset.label).startsWith('__band_'),
              itemSort: (a, b) => (b.raw ?? -1) - (a.raw ?? -1),
              callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw == null ? '—' : ctx.raw + '%'}` },
            },
            annotation: { annotations },
          },
          scales,
        },
      });
    } catch (error) {
      console.error(`Error creating ${metricKey} comparison chart:`, error);
    }
    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} chartRef.current = null; } };
  }, [chartReady, nodes, chartPeriod, metricKey, threshold, isDark, migrationHistory, showMarkers, showThresholds, showEnvelope, focusNode]);

  useCrosshair(chartRef, timesRef, hoverTime, isDark);

  return (
    <canvas ref={canvasRef} onMouseLeave={() => { if (typeof onHoverTime === 'function') onHoverTime(null); }}></canvas>
  );
}
