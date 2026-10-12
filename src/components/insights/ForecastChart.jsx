import { RESOURCE_METRICS, chartTheme, withAlpha, useIsDark } from '../dashboard/nodeSeries.js';
import useIsMobile from '../../utils/useIsMobile.js';
import { dayTick } from './forecastModel.js';

const { useRef, useEffect } = React;

// Same per-metric colours as the Dashboard node charts.
const COLOR = {
  cpu: RESOURCE_METRICS.find(m => m.key === 'cpu').color,
  memory: RESOURCE_METRICS.find(m => m.key === 'mem').color,
  iowait: RESOURCE_METRICS.find(m => m.key === 'iowait').color,
};
const LIMIT_COLOR = '#dc4c3f';

const pts = (pairs) => (pairs || []).map(([x, y]) => ({ x, y }));

/**
 * One node metric: solid history, the trend continued as a dashed line from
 * "now", and the limit as a dashed horizontal line. `range` is the shared
 * x range in days so every chart on the card lines up.
 *
 * Lifecycle as NodeChart: rebuilt when its inputs change, destroyed on
 * unmount; `chartReady` must mean Chart.js and the annotation plugin are both
 * registered.
 */
export default function ForecastChart({ metric, forecast, range, chartReady, label }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const isDark = useIsDark();
  const isMobile = useIsMobile(640);

  useEffect(() => {
    if (!chartReady || !canvasRef.current || typeof Chart === 'undefined' || !forecast) return;
    const theme = chartTheme(isDark);
    const color = COLOR[metric] || COLOR.cpu;
    const limit = forecast.limit;

    const annotations = {
      // Labelled "now" by the x tick under it (dayTick(0)), so said once.
      now: { type: 'line', xMin: 0, xMax: 0, borderColor: theme.crosshair, borderWidth: 1 },
    };
    if (typeof limit === 'number') {
      annotations.limit = {
        type: 'line', yMin: limit, yMax: limit, borderColor: withAlpha(LIMIT_COLOR, 0.8), borderWidth: 1.5, borderDash: [5, 4],
        label: {
          display: true, content: `limit ${Math.round(limit)}%`, position: 'start', yAdjust: -9,
          backgroundColor: 'transparent', color: isDark ? '#f87171' : '#b91c1c', font: { size: 10, weight: '600' }, padding: 0,
        },
      };
    }

    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
    try {
      chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [
            { label: 'History', data: pts(forecast.history), borderColor: color, backgroundColor: withAlpha(color, 0.08), fill: true, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, tension: 0.2 },
            { label: 'Projected', data: pts(forecast.projection), borderColor: color, borderDash: [6, 5], borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, fill: false },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
          interaction: { mode: 'nearest', axis: 'x', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...theme.tooltip,
              callbacks: {
                title: (items) => dayTick(items[0].parsed.x),
                label: (item) => `${item.dataset.label}: ${Math.round(item.parsed.y)}%`,
              },
            },
            annotation: { annotations },
          },
          scales: {
            x: {
              type: 'linear', min: range.min, max: range.max, grid: { color: theme.grid },
              // The "now" tick is always drawn so the marker keeps its label.
              afterBuildTicks: (axis) => {
                if (!axis.ticks.some(t => t.value === 0)) axis.ticks = [...axis.ticks, { value: 0 }].sort((a, b) => a.value - b.value);
              },
              ticks: { color: theme.tick, maxTicksLimit: isMobile ? 4 : 8, maxRotation: 0, font: { size: 10 }, callback: dayTick },
            },
            y: { min: 0, max: 100, grid: { color: theme.grid }, ticks: { color: theme.tick, font: { size: 10 }, stepSize: isMobile ? 50 : 25, callback: (v) => `${v}%` } },
          },
        },
      });
    } catch (error) {
      console.error('Forecast chart failed:', error);
    }
  }, [chartReady, forecast, metric, range.min, range.max, isDark, isMobile]);

  useEffect(() => () => {
    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} chartRef.current = null; }
  }, []);

  return (
    <div className="relative h-40 sm:h-48 w-full">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
