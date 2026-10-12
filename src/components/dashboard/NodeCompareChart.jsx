import { TAP_TARGET } from '../../utils/designTokens.js';
import useIsMobile from '../../utils/useIsMobile.js';
import {
  buildNodeSeries, timeLabel, migrationAnnotations, chartTheme, withAlpha, useIsDark,
} from './nodeSeries.js';
import { COMPARE_METRICS, alignSeries, axisMax, spreadNow, spreadText } from './compareSeries.js';

const { useRef, useEffect, useMemo, useState } = React;

const METRIC_KEY = 'nodeCompareMetric';

/**
 * Every node on one chart, one metric at a time (CPU / Memory / IO wait), so an
 * uneven cluster shows up as lines that sit apart.
 *  - Same samples and period as the per-node charts (buildNodeSeries). A node
 *    that lags by a sample or two is filled so its line doesn't break; a longer
 *    stretch with no samples (node offline) stays a gap.
 *  - Legend under the chart: each item shows or hides its node; hovering it
 *    highlights the line. Tapping a line highlights that node (tap again to
 *    clear) and, with Min/Max on, draws its min/max band.
 *  - The recommendation threshold for the metric is one thin dashed line,
 *    labelled on the line itself.
 *  - One line of text under the chart: the spread between the lowest and
 *    highest node right now.
 *
 * `nodes` is [{ name, color, trendData }], memoized by the parent.
 * `chartReady` follows NodeChart: Chart.js and the annotation plugin are loaded.
 */
export default function NodeCompareChart({
  nodes, thresholds, clusterSpread, chartPeriod, chartReady, migrationHistory,
  showMarkers = true, showThresholds = true, showEnvelope = false,
}) {
  const [metric, setMetricState] = useState(() => {
    try { const v = localStorage.getItem(METRIC_KEY); if (COMPARE_METRICS.some(m => m.key === v)) return v; } catch {}
    return 'cpu';
  });
  const setMetric = (k) => { setMetricState(k); try { localStorage.setItem(METRIC_KEY, k); } catch {} };
  const [hidden, setHidden] = useState([]);
  const [highlight, setHighlight] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);

  // Drop hidden/highlighted names for nodes that have gone away.
  const names = nodes.map(n => n.name).join(',');
  useEffect(() => {
    const present = new Set(nodes.map(n => n.name));
    setHidden(h => (h.every(n => present.has(n)) ? h : h.filter(n => present.has(n))));
    if (highlight && !present.has(highlight)) setHighlight(null);
  }, [names]);

  const aligned = useMemo(() => {
    const series = nodes.map(n => {
      const s = buildNodeSeries(n.trendData, chartPeriod);
      return s ? { name: n.name, pts: s.pts, meta: s } : null;
    }).filter(Boolean);
    const a = alignSeries(series, metric);
    if (!a) return null;
    const ref = series.reduce((x, y) => (y.pts.length > x.pts.length ? y : x)).meta;
    return { ...a, latestTime: ref.latestTime, periodSeconds: ref.periodSeconds, multiDay: ref.multiDay, step: ref.step };
  }, [nodes, chartPeriod, metric]);

  const colorOf = useMemo(() => Object.fromEntries(nodes.map(n => [n.name, n.color])), [nodes]);
  const threshold = typeof thresholds?.[metric] === 'number' ? thresholds[metric] : null;
  const spread = useMemo(() => spreadNow(metric, aligned?.lines, clusterSpread), [metric, aligned, clusterSpread]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div role="group" aria-label="Metric" className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800/60 border border-pb-border dark:border-slate-700/50 p-0.5">
          {COMPARE_METRICS.map(m => (
            <button
              key={m.key}
              type="button"
              aria-pressed={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={`${TAP_TARGET} px-3 py-1 text-xs font-medium rounded transition-colors ${
                metric === m.key ? 'bg-blue-600 text-white' : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {aligned ? (
        <CompareCanvas
          aligned={aligned} metric={metric} colorOf={colorOf} threshold={showThresholds ? threshold : null}
          hidden={hidden} highlight={highlight} hoverNode={hoverNode} onPickNode={(n) => setHighlight(h => (h === n ? null : n))}
          chartReady={chartReady} migrationHistory={migrationHistory} showMarkers={showMarkers} showEnvelope={showEnvelope}
        />
      ) : (
        <div className="h-[240px] flex items-center justify-center text-sm text-pb-text2 dark:text-gray-400">No chart data yet</div>
      )}

      {aligned && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Show or hide nodes">
          {aligned.lines.map(l => {
            const off = hidden.includes(l.name);
            const lit = highlight === l.name;
            return (
              <button
                key={l.name}
                type="button"
                aria-pressed={!off}
                onClick={() => {
                  setHidden(h => (off ? h.filter(n => n !== l.name) : [...h, l.name]));
                  if (!off && highlight === l.name) setHighlight(null);
                }}
                onMouseEnter={() => !off && setHoverNode(l.name)}
                onMouseLeave={() => setHoverNode(null)}
                onFocus={() => !off && setHoverNode(l.name)}
                onBlur={() => setHoverNode(null)}
                title={`${off ? 'Show' : 'Hide'} ${l.name}`}
                className={`${TAP_TARGET} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-transparent hover:bg-pb-surface2 dark:hover:bg-slate-700/60 transition-colors ${
                  off ? 'opacity-50 line-through text-pb-text2 dark:text-gray-500' : 'text-pb-text dark:text-gray-200'
                } ${lit ? 'font-semibold border-pb-border dark:border-slate-600' : ''}`}
              >
                <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: colorOf[l.name] }} />
                {l.name}
              </button>
            );
          })}
          {highlight && (
            <button type="button" onClick={() => setHighlight(null)} className={`${TAP_TARGET} px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline`}>
              Clear highlight
            </button>
          )}
        </div>
      )}

      {aligned && (
        <p className="mt-1.5 text-sm text-pb-text2 dark:text-gray-400 tabular-nums">
          {spreadText(spread)}
          {showEnvelope && !highlight && <span className="block sm:inline sm:ml-3 text-xs text-pb-text2 dark:text-gray-500">Tap a line to see its min/max band</span>}
        </p>
      )}
    </div>
  );
}

function CompareCanvas({ aligned, metric, colorOf, threshold, hidden, highlight, hoverNode, onPickNode, chartReady, migrationHistory, showMarkers, showEnvelope }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const pickRef = useRef(onPickNode);
  pickRef.current = onPickNode;
  const isDark = useIsDark();
  const isMobile = useIsMobile(640);
  // Build only once the container has a width: a chart created at zero size in
  // a hidden tab or before layout on a phone renders blank.
  const [sized, setSized] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (el.clientWidth > 0) { setSized(true); return; }
    if (typeof ResizeObserver === 'undefined') { setSized(true); return; }
    const ro = new ResizeObserver(() => { if (el.clientWidth > 0) { setSized(true); ro.disconnect(); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hiddenKey = hidden.join(',');
  const lineStyle = (name, focus) => {
    const lit = focus === name;
    const dim = focus && !lit;
    return { borderColor: dim ? withAlpha(colorOf[name], 0.2) : colorOf[name], borderWidth: lit ? 2.75 : 1.75, order: lit ? 0 : 1 };
  };

  useEffect(() => {
    if (!chartReady || !sized || !canvasRef.current || typeof Chart === 'undefined') return;
    const theme = chartTheme(isDark);
    const { times, lines } = aligned;
    const datasets = [];
    lines.forEach(l => {
      const isHidden = hidden.includes(l.name);
      datasets.push({
        label: l.name, data: l.values, backgroundColor: colorOf[l.name],
        ...lineStyle(l.name, highlight),
        tension: 0.2, pointRadius: 0, pointHoverRadius: 3, fill: false, spanGaps: false, hidden: isHidden,
      });
      if (highlight === l.name && showEnvelope && aligned.step > 1 && !isHidden) {
        datasets.push({ label: '__band_max', data: l.max, borderColor: 'transparent', backgroundColor: withAlpha(colorOf[l.name], 0.2), pointRadius: 0, pointHoverRadius: 0, fill: '+1', tension: 0.2, order: 2 });
        datasets.push({ label: '__band_min', data: l.min, borderColor: 'transparent', backgroundColor: 'transparent', pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0.2, order: 2 });
      }
    });
    const visible = lines.filter(l => !hidden.includes(l.name));
    const yMax = axisMax(metric, visible.length ? visible : lines, threshold ?? undefined);

    const annotations = {};
    if (threshold != null && threshold <= yMax) {
      annotations.threshold = {
        type: 'line', yMin: threshold, yMax: threshold, drawTime: 'beforeDatasetsDraw',
        borderColor: isDark ? 'rgba(203,213,225,0.55)' : 'rgba(71,85,105,0.5)', borderWidth: 1, borderDash: [4, 4],
        label: {
          display: true, content: `threshold ${threshold}%`, position: 'start', yAdjust: -9,
          color: theme.tick, backgroundColor: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)',
          font: { size: 10, weight: '500' }, padding: { x: 4, y: 1 },
        },
      };
    }
    if (showMarkers) {
      Object.assign(annotations, migrationAnnotations(migrationHistory, times, aligned.latestTime, aligned.periodSeconds,
        highlight ? (mig) => mig.source_node === highlight || mig.target_node === highlight : null));
    }

    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
    try {
      chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
        type: 'line',
        data: { labels: times.map(t => timeLabel(t, aligned.multiDay)), datasets },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'index', intersect: false },
          onClick: (evt, _els, chart) => {
            const near = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: false, axis: 'xy' }, false)
              .map(e => chart.data.datasets[e.datasetIndex])
              .find(d => d && !String(d.label).startsWith('__band_') && !d.hidden);
            if (near) pickRef.current(near.label);
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
          scales: {
            x: { grid: { color: theme.grid }, ticks: { color: theme.tick, maxTicksLimit: isMobile ? 4 : 7, maxRotation: 0, autoSkipPadding: 12, font: { size: 10 } } },
            y: { min: 0, max: yMax, grid: { color: theme.grid }, ticks: { color: theme.tick, font: { size: 10 }, ...(yMax === 100 ? { stepSize: isMobile ? 25 : 20 } : { maxTicksLimit: isMobile ? 5 : 6 }), callback: (v) => v + '%' } },
          },
        },
      });
    } catch (error) {
      console.error('Error creating node comparison chart:', error);
    }
    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} chartRef.current = null; } };
  }, [chartReady, sized, aligned, metric, threshold, isDark, isMobile, migrationHistory, showMarkers, showEnvelope, hiddenKey, highlight, colorOf]);

  // Hovering a legend item restyles the lines in place (no rebuild).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const focus = hoverNode || highlight;
    chart.data.datasets.forEach(d => {
      if (String(d.label).startsWith('__band_')) return;
      Object.assign(d, lineStyle(d.label, focus));
    });
    chart.update('none');
  }, [hoverNode]);

  return (
    <div ref={wrapRef} className="relative w-full h-[240px] sm:h-[300px] cursor-pointer">
      <canvas ref={canvasRef} role="img" aria-label={`${COMPARE_METRICS.find(m => m.key === metric)?.label} for every node over time`}></canvas>
    </div>
  );
}
