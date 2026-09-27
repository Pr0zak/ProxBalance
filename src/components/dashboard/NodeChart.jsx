import {
  RESOURCE_METRICS, buildNodeSeries, timeLabel, migrationAnnotations, thresholdAxis,
  chartTheme, withAlpha, useIsDark, useCrosshair,
} from './nodeSeries.js';

const { useRef, useEffect } = React;

/**
 * Per-node CPU/Memory/IOWait time-series (Chart.js).
 *  - Migration markers: vertical lines, status-colored, only for migrations into
 *    or out of this node.
 *  - Recommendation thresholds: faint dashed lines, labelled in a right-hand
 *    gutter axis so the labels never sit on top of the data.
 *  - Min/max envelope band per metric (from each sample window) so long-range
 *    averaging doesn't hide spikes.
 *  - Synced crosshair across sibling charts (shared hoverTime / onHoverTime).
 * The legend lives outside the canvas (NodeStatusSection's metric chips), which
 * also drive `hiddenMetrics`. Headroom is a 0-100 score, not a %, so it is a
 * badge in the card header rather than a line on this percent axis.
 *
 * `chartReady` must only be true once Chart.js AND chartjs-plugin-annotation are
 * both registered (useClusterData's chartJsLoaded). Building a chart between the
 * two leaves it without annotation state and it throws on draw.
 */
export default function NodeChart({
  nodeName, trendData, chartPeriod, chartReady,
  migrationHistory, thresholds, hoverTime, onHoverTime,
  showMarkers = true, showThresholds = true, showEnvelope = true, hiddenMetrics = [],
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const timesRef = useRef([]);
  const isDark = useIsDark();
  const hiddenKey = hiddenMetrics.join(',');

  useEffect(() => {
    if (!chartReady || !canvasRef.current || typeof Chart === 'undefined') return;
    const series = buildNodeSeries(trendData, chartPeriod);
    if (!series) return;
    const { pts, step, latestTime, periodSeconds, multiDay } = series;
    const theme = chartTheme(isDark);
    const times = pts.map(p => p.time);
    timesRef.current = times;
    const hasEnvelope = step > 1 && showEnvelope;
    const isHidden = (key) => hiddenMetrics.includes(key);

    const datasets = RESOURCE_METRICS.map(m => ({
      label: `${m.long} %`, data: pts.map(p => +p[m.key].avg.toFixed(1)),
      borderColor: m.color, backgroundColor: withAlpha(m.color, 0.08),
      tension: 0.2, fill: !hasEnvelope, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4,
      hidden: isHidden(m.key),
    }));
    if (hasEnvelope) {
      // Faint min/max band per metric (max fills down to the immediately-following min).
      RESOURCE_METRICS.forEach(m => {
        const hidden = isHidden(m.key);
        datasets.push({ label: `__band_${m.key}_max`, data: pts.map(p => +p[m.key].max.toFixed(1)), borderColor: 'transparent', backgroundColor: withAlpha(m.color, 0.12), pointRadius: 0, pointHoverRadius: 0, fill: '+1', tension: 0.2, hidden });
        datasets.push({ label: `__band_${m.key}_min`, data: pts.map(p => +p[m.key].min.toFixed(1)), borderColor: 'transparent', backgroundColor: 'transparent', pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0.2, hidden });
      });
    }

    const th = thresholds || {};
    const thLines = showThresholds
      ? RESOURCE_METRICS.filter(m => typeof th[m.key] === 'number' && !isHidden(m.key))
          .map(m => ({ value: th[m.key], color: m.color, label: `${m.label} ${th[m.key]}` }))
      : [];
    const annotations = {};
    thLines.forEach((t, i) => {
      annotations[`th_${i}`] = { type: 'line', yMin: t.value, yMax: t.value, borderColor: withAlpha(t.color, 0.45), borderWidth: 1, borderDash: [3, 3] };
    });
    if (showMarkers) {
      Object.assign(annotations, migrationAnnotations(migrationHistory, times, latestTime, periodSeconds,
        (mig) => mig.source_node === nodeName || mig.target_node === nodeName));
    }

    const scales = {
      x: { grid: { color: theme.grid }, ticks: { color: theme.tick, maxTicksLimit: 6, maxRotation: 0, autoSkipPadding: 12, font: { size: 10 } } },
      y: { min: 0, max: 100, grid: { color: theme.grid }, ticks: { color: theme.tick, font: { size: 10 }, stepSize: 20, callback: (v) => v + '%' } },
    };
    const thAxis = thresholdAxis(thLines, 100);
    if (thAxis) scales.yTh = thAxis;

    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
    try {
      chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
        type: 'line',
        data: { labels: times.map(t => timeLabel(t, multiDay)), datasets },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'index', intersect: false },
          onHover: (e, els) => {
            if (typeof onHoverTime !== 'function') return;
            if (els && els.length) onHoverTime(timesRef.current[els[0].index] ?? null);
          },
          plugins: {
            legend: { display: false },
            tooltip: { ...theme.tooltip, filter: (item) => !String(item.dataset.label).startsWith('__band_') },
            annotation: { annotations },
          },
          scales,
        },
      });
    } catch (error) {
      console.error(`Error creating chart for node ${nodeName}:`, error);
    }

    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} chartRef.current = null; } };
  }, [chartReady, trendData, chartPeriod, isDark, migrationHistory, thresholds?.cpu, thresholds?.mem, thresholds?.iowait, showMarkers, showThresholds, showEnvelope, hiddenKey]);

  useCrosshair(chartRef, timesRef, hoverTime, isDark);

  return (
    <canvas
      ref={canvasRef}
      onMouseLeave={() => { if (typeof onHoverTime === 'function') onHoverTime(null); }}
    ></canvas>
  );
}
