import { GLASS_CARD } from '../../utils/designTokens.js';

/**
 * Cluster-wide cluster_health over time, derived from scoreHistory entries.
 * Renders a simple SVG sparkline-style area chart with a header showing the
 * latest value and the delta from the first sample. Hidden when there are
 * fewer than 2 datapoints.
 */
export default function ClusterHealthChart({ scoreHistory }) {
  if (!scoreHistory || scoreHistory.length < 2) return null;
  const points = scoreHistory.map(e => e.cluster_health).filter(v => typeof v === 'number');
  if (points.length < 2) return null;

  const w = 600, h = 80, pad = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = (max - min) || 1;
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const linePoints = coords.join(' ');
  const areaPoints = `${pad},${h - pad} ${linePoints} ${w - pad},${h - pad}`;
  const latest = points[points.length - 1];
  const trend = latest - points[0];

  return (
    <div className={`${GLASS_CARD} mb-3`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-white">Cluster Health Over Time</h3>
          <p className="text-[11px] text-gray-500">From {new Date(scoreHistory[0].timestamp).toLocaleDateString()} to now</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-white tabular-nums">{latest.toFixed(1)}</span>
          <span className={`text-xs font-semibold tabular-nums ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="clusterHealthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#clusterHealthGrad)" />
        <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{new Date(scoreHistory[0].timestamp).toLocaleDateString()}</span>
        <span>min {min.toFixed(1)}</span>
        <span>max {max.toFixed(1)}</span>
        <span>{new Date(scoreHistory[scoreHistory.length - 1].timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
