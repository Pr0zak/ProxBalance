const { useRef, useEffect } = React;

/**
 * Renders a Chart.js line chart for a single node's trend data.
 * Creates/destroys the chart instance internally — no parent chart management needed.
 */
export default function NodeChart({ nodeName, trendData, chartPeriod, darkMode, nodeScore }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !trendData || typeof trendData !== 'object') return;
    if (typeof Chart === 'undefined') return;

    // Determine source timeframe from chartPeriod
    let sourceTimeframe = 'day';
    const periodSeconds = {
      '1h': 3600, '6h': 6 * 3600, '12h': 12 * 3600, '24h': 24 * 3600,
      '7d': 7 * 24 * 3600, '30d': 30 * 24 * 3600, '1y': 365 * 24 * 3600
    }[chartPeriod] || 24 * 3600;

    if (chartPeriod === '1h') sourceTimeframe = 'hour';
    else if (['6h', '12h', '24h'].includes(chartPeriod)) sourceTimeframe = 'day';
    else if (chartPeriod === '7d') sourceTimeframe = 'week';
    else if (chartPeriod === '30d') sourceTimeframe = 'month';
    else if (chartPeriod === '1y') sourceTimeframe = 'year';

    let raw = trendData?.[sourceTimeframe] || [];
    if (raw.length === 0) raw = trendData?.day || [];
    if (raw.length === 0) return;

    // Anchor the period window to the latest sample, not "now". Collectors
    // run on a timer (default 120 min), so the freshest hour-bucket data may
    // be older than 60 min — filtering against now would empty out the chart.
    const latestTime = raw.reduce((m, p) => Math.max(m, p.time), 0);
    const filtered = raw.filter(p => (latestTime - p.time) <= periodSeconds);
    if (filtered.length === 0) return;

    const sampleRate = { '1h': 2, '6h': 5, '12h': 10, '24h': 20, '7d': 20, '30d': 25, '1y': 25 }[chartPeriod] || 1;
    const sampled = filtered.filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % sampleRate === 0);

    const isDark = darkMode;
    const ctx = canvasRef.current.getContext('2d');

    // Build annotation for suitability score line
    const annotations = nodeScore ? {
      scoreLine: {
        type: 'line',
        yMin: nodeScore.suitability_rating,
        yMax: nodeScore.suitability_rating,
        borderColor: (() => { const r = nodeScore.suitability_rating; if (r >= 70) return 'rgba(34, 197, 94, 0.7)'; if (r >= 50) return 'rgba(234, 179, 8, 0.7)'; if (r >= 30) return 'rgba(249, 115, 22, 0.7)'; return 'rgba(239, 68, 68, 0.7)'; })(),
        borderWidth: 3, borderDash: [5, 5],
        label: {
          display: true, content: `Suitability: ${nodeScore.suitability_rating}%`, position: 'start',
          backgroundColor: (() => { const r = nodeScore.suitability_rating; if (r >= 70) return 'rgba(34, 197, 94, 0.9)'; if (r >= 50) return 'rgba(234, 179, 8, 0.9)'; if (r >= 30) return 'rgba(249, 115, 22, 0.9)'; return 'rgba(239, 68, 68, 0.9)'; })(),
          color: '#ffffff', font: { size: 11, weight: 'bold' }, padding: 4
        }
      }
    } : {};

    // Destroy previous instance
    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
    }

    try {
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sampled.map(p => {
            const d = new Date(p.time * 1000);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }),
          datasets: [
            { label: 'CPU %', data: sampled.map(p => p.cpu), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, fill: true },
            { label: 'Memory %', data: sampled.map(p => p.mem), borderColor: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
            { label: 'IOWait %', data: sampled.map(p => p.iowait || 0), borderColor: 'rgb(245, 158, 11)', backgroundColor: 'rgba(245, 158, 11, 0.1)', tension: 0.4, fill: true }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: true, position: 'top', labels: { color: isDark ? '#9ca3af' : '#4b5563', font: { size: 11 } } },
            tooltip: { backgroundColor: isDark ? '#1f2937' : '#ffffff', titleColor: isDark ? '#f3f4f6' : '#111827', bodyColor: isDark ? '#d1d5db' : '#374151', borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: 1 },
            annotation: { annotations }
          },
          scales: {
            x: { display: true, grid: { color: isDark ? '#374151' : '#e5e7eb' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280', maxTicksLimit: 8, font: { size: 10 } } },
            y: { display: true, min: 0, max: 100, grid: { color: isDark ? '#374151' : '#e5e7eb' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 10 }, callback: function(v) { return v + '%'; } } }
          }
        }
      });
    } catch (error) {
      console.error(`Error creating chart for node ${nodeName}:`, error);
    }

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
        chartRef.current = null;
      }
    };
  }, [trendData, chartPeriod, darkMode, nodeScore?.suitability_rating]);

  return <canvas ref={canvasRef}></canvas>;
}
