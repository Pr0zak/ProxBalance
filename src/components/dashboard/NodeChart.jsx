const { useRef, useEffect, useState } = React;

const SOURCE_TIMEFRAME = { '1h': 'hour', '6h': 'day', '12h': 'day', '24h': 'day', '7d': 'week', '30d': 'month', '1y': 'year' };
const PERIOD_SECONDS = { '1h': 3600, '6h': 6 * 3600, '12h': 12 * 3600, '24h': 24 * 3600, '7d': 7 * 24 * 3600, '30d': 30 * 24 * 3600, '1y': 365 * 24 * 3600 };
// Sample windows sized so each period renders ~150-180 points from the (already
// downsampled) RRD source. Each rendered point also carries the window's min/max
// for the envelope band.
const SAMPLE_RATE = { '1h': 1, '6h': 2, '12h': 4, '24h': 8, '7d': 2, '30d': 8, '1y': 5 };
const MULTI_DAY = ['7d', '30d', '1y'];

const aggWindow = (pts, key) => {
  const vals = pts.map(p => (key === 'iowait' ? (p.iowait || 0) : p[key])).filter(v => typeof v === 'number');
  if (!vals.length) return { avg: 0, min: 0, max: 0 };
  return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, min: Math.min(...vals), max: Math.max(...vals) };
};

/**
 * Per-node CPU/Memory/IOWait time-series (Chart.js). Enhancements:
 *  - Migration markers (vertical lines, status-colored) from migrationHistory.
 *  - Recommendation threshold lines (cpu/mem/iowait) so you see what triggers a move.
 *  - Min/max envelope band per metric (from each sample window) so long-range averaging
 *    doesn't hide spikes.
 *  - Synced crosshair: hovering one chart draws a vertical line at the same time on all
 *    of them (via shared hoverTime / onHoverTime).
 */
export default function NodeChart({ nodeName, trendData, chartPeriod, nodeScore, migrationHistory, thresholds, hoverTime, onHoverTime }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const timesRef = useRef([]);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !trendData || typeof trendData !== 'object' || typeof Chart === 'undefined') return;

    const sourceTimeframe = SOURCE_TIMEFRAME[chartPeriod] || 'day';
    const periodSeconds = PERIOD_SECONDS[chartPeriod] || 24 * 3600;
    let raw = trendData?.[sourceTimeframe] || [];
    if (raw.length === 0) raw = trendData?.day || [];
    if (raw.length === 0) return;

    const latestTime = raw.reduce((m, p) => Math.max(m, p.time), 0);
    const filtered = raw.filter(p => (latestTime - p.time) <= periodSeconds);
    if (filtered.length === 0) return;

    // Window-aggregate into ~150-180 points, each with avg + min/max.
    const step = Math.max(1, SAMPLE_RATE[chartPeriod] || 1);
    const pts = [];
    for (let i = 0; i < filtered.length; i += step) {
      const win = filtered.slice(i, Math.min(filtered.length, i + step));
      pts.push({
        time: win[0].time,
        cpu: aggWindow(win, 'cpu'), mem: aggWindow(win, 'mem'), iowait: aggWindow(win, 'iowait'),
      });
    }
    if (filtered.length && pts[pts.length - 1].time !== filtered[filtered.length - 1].time) {
      const last = filtered[filtered.length - 1];
      pts.push({ time: last.time, cpu: aggWindow([last], 'cpu'), mem: aggWindow([last], 'mem'), iowait: aggWindow([last], 'iowait') });
    }
    timesRef.current = pts.map(p => p.time);
    const hasEnvelope = step > 1;
    const multiDay = MULTI_DAY.includes(chartPeriod);

    const labels = pts.map(p => {
      const d = new Date(p.time * 1000);
      return multiDay ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const METRICS = [
      { key: 'cpu',    label: 'CPU %',    rgb: '59, 130, 246' },
      { key: 'mem',    label: 'Memory %', rgb: '16, 185, 129' },
      { key: 'iowait', label: 'IOWait %', rgb: '245, 158, 11' },
    ];
    const datasets = [];
    METRICS.forEach(m => {
      datasets.push({
        label: m.label, data: pts.map(p => +p[m.key].avg.toFixed(1)),
        borderColor: `rgb(${m.rgb})`, backgroundColor: `rgba(${m.rgb}, 0.08)`,
        tension: 0.2, fill: !hasEnvelope, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4,
      });
    });
    if (hasEnvelope) {
      // Faint min/max band per metric (max fills down to the immediately-following min).
      METRICS.forEach(m => {
        datasets.push({ label: `__band_${m.key}_max`, data: pts.map(p => +p[m.key].max.toFixed(1)), borderColor: 'transparent', backgroundColor: `rgba(${m.rgb}, 0.12)`, pointRadius: 0, fill: '+1', tension: 0.2 });
        datasets.push({ label: `__band_${m.key}_min`, data: pts.map(p => +p[m.key].min.toFixed(1)), borderColor: 'transparent', backgroundColor: 'transparent', pointRadius: 0, fill: false, tension: 0.2 });
      });
    }

    // ---- Annotations: suitability + thresholds + migration markers ----
    const annotations = {};
    if (nodeScore) {
      const r = nodeScore.suitability_rating;
      const c = r >= 70 ? '34, 197, 94' : r >= 50 ? '234, 179, 8' : r >= 30 ? '249, 115, 22' : '239, 68, 68';
      annotations.scoreLine = {
        type: 'line', yMin: r, yMax: r, borderColor: `rgba(${c}, 0.7)`, borderWidth: 2, borderDash: [5, 5],
        label: { display: true, content: `Suitability: ${r}%`, position: 'start', backgroundColor: `rgba(${c}, 0.9)`, color: '#fff', font: { size: 10, weight: 'bold' }, padding: 3 },
      };
    }
    const th = thresholds || {};
    const thLines = [
      { v: th.cpu, rgb: '59, 130, 246', name: 'CPU' },
      { v: th.mem, rgb: '16, 185, 129', name: 'Mem' },
      { v: th.iowait, rgb: '245, 158, 11', name: 'IOWait' },
    ];
    thLines.forEach((t, i) => {
      if (typeof t.v !== 'number') return;
      annotations[`th_${i}`] = {
        type: 'line', yMin: t.v, yMax: t.v, borderColor: `rgba(${t.rgb}, 0.35)`, borderWidth: 1, borderDash: [2, 3],
        label: { display: true, content: `${t.name} thr ${t.v}%`, position: 'end', backgroundColor: 'transparent', color: `rgba(${t.rgb}, 0.9)`, font: { size: 8 }, padding: 0 },
      };
    });
    // Migration markers: nearest rendered index per migration in the window.
    (migrationHistory || []).forEach((mig, i) => {
      const t = new Date(mig.timestamp).getTime() / 1000;
      if (isNaN(t) || t < (latestTime - periodSeconds) || t > latestTime) return;
      let bi = 0, bd = Infinity;
      timesRef.current.forEach((tt, k) => { const d = Math.abs(tt - t); if (d < bd) { bd = d; bi = k; } });
      const status = (mig.status || '').toLowerCase();
      const col = (status === 'completed' || status === 'success') ? '34,197,94' : (status === 'failed' || status === 'error' || status === 'cancelled') ? '239,68,68' : '234,179,8';
      annotations[`mig_${i}`] = { type: 'line', scaleID: 'x', value: bi, borderColor: `rgba(${col},0.55)`, borderWidth: 1, borderDash: [3, 2] };
    });

    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
    const ctx = canvasRef.current.getContext('2d');
    try {
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          onHover: (e, els) => {
            if (typeof onHoverTime !== 'function') return;
            if (els && els.length) onHoverTime(timesRef.current[els[0].index] ?? null);
          },
          plugins: {
            legend: { display: true, position: 'top', labels: { color: isDark ? '#9ca3af' : '#4b5563', font: { size: 11 }, filter: (item) => !String(item.text).startsWith('__band_') } },
            tooltip: { backgroundColor: isDark ? '#1f2937' : '#fff', titleColor: isDark ? '#f3f4f6' : '#111827', bodyColor: isDark ? '#d1d5db' : '#374151', borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: 1, filter: (item) => !String(item.dataset.label).startsWith('__band_') },
            annotation: { annotations },
          },
          scales: {
            x: { display: true, grid: { color: isDark ? '#374151' : '#e5e7eb' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280', maxTicksLimit: 8, font: { size: 10 } } },
            y: { display: true, min: 0, max: 100, grid: { color: isDark ? '#374151' : '#e5e7eb' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 10 }, callback: (v) => v + '%' } },
          },
        },
      });
    } catch (error) {
      console.error(`Error creating chart for node ${nodeName}:`, error);
    }

    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} chartRef.current = null; } };
  }, [trendData, chartPeriod, nodeScore?.suitability_rating, isDark, migrationHistory, thresholds?.cpu, thresholds?.mem, thresholds?.iowait]);

  // Synced crosshair: draw/update a vertical line at the time hovered on any sibling
  // chart, without rebuilding the whole chart.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chart.options?.plugins?.annotation) return;
    const anns = chart.options.plugins.annotation.annotations;
    if (hoverTime == null) {
      if (anns.crosshair) { delete anns.crosshair; chart.update('none'); }
      return;
    }
    let bi = 0, bd = Infinity;
    timesRef.current.forEach((tt, k) => { const d = Math.abs(tt - hoverTime); if (d < bd) { bd = d; bi = k; } });
    anns.crosshair = { type: 'line', scaleID: 'x', value: bi, borderColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', borderWidth: 1 };
    chart.update('none');
  }, [hoverTime, isDark]);

  return (
    <canvas
      ref={canvasRef}
      onMouseLeave={() => { if (typeof onHoverTime === 'function') onHoverTime(null); }}
    ></canvas>
  );
}
