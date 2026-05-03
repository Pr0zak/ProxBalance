import { GLASS_CARD } from '../../utils/designTokens.js';

const { useState } = React;

const PERIODS = [
  { id: '1d',  label: '1d',  ms: 24 * 60 * 60 * 1000 },
  { id: '7d',  label: '7d',  ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: '90d', label: '90d', ms: 90 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'All', ms: null },
];

/**
 * Cluster-wide cluster_health over time. User-adjustable period selector
 * (1d/7d/30d/90d/all, default 30d) filters both the line and the migration
 * markers. Markers are status-colored triangles for runs with executed
 * migrations: green=success, yellow=partial, red=failed.
 */
export default function ClusterHealthChart({ scoreHistory, runHistory }) {
  const [period, setPeriod] = useState(() => localStorage.getItem('clusterHealthChartPeriod') || '30d');
  const setPeriodPersisted = (id) => {
    setPeriod(id);
    localStorage.setItem('clusterHealthChartPeriod', id);
  };

  if (!scoreHistory || scoreHistory.length < 2) return null;

  const allPoints = scoreHistory
    .map(e => ({ t: new Date(e.timestamp).getTime(), v: e.cluster_health }))
    .filter(p => typeof p.v === 'number' && !isNaN(p.t));
  if (allPoints.length < 2) return null;

  // Anchor the period to the latest sample so a stale collector doesn't blank the chart.
  const latestT = allPoints[allPoints.length - 1].t;
  const periodCfg = PERIODS.find(p => p.id === period) || PERIODS[2];
  const cutoff = periodCfg.ms == null ? -Infinity : latestT - periodCfg.ms;
  const points = allPoints.filter(p => p.t >= cutoff);

  if (points.length < 2) {
    return (
      <div className={`${GLASS_CARD} mb-3`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-base font-bold text-white">Cluster Health Over Time</h3>
          <PeriodPills value={period} onChange={setPeriodPersisted} />
        </div>
        <div className="text-sm text-gray-500 italic py-6 text-center">
          Not enough data in the last {periodCfg.label} — pick a wider range.
        </div>
      </div>
    );
  }

  const w = 600, h = 80, pad = 4;
  const tStart = points[0].t;
  const tEnd = points[points.length - 1].t;
  const tRange = (tEnd - tStart) || 1;
  const min = Math.min(...points.map(p => p.v));
  const max = Math.max(...points.map(p => p.v));
  const range = (max - min) || 1;

  const xFor = (t) => pad + ((t - tStart) / tRange) * (w - 2 * pad);
  const yFor = (v) => h - pad - ((v - min) / range) * (h - 2 * pad);

  const coords = points.map(p => `${xFor(p.t).toFixed(2)},${yFor(p.v).toFixed(2)}`);
  const linePoints = coords.join(' ');
  const areaPoints = `${pad},${h - pad} ${linePoints} ${w - pad},${h - pad}`;
  const latest = points[points.length - 1].v;
  const trend = latest - points[0].v;

  // Migration markers — only those within the selected period
  const markers = (runHistory || [])
    .filter(r => (r.migrations_executed || 0) > 0)
    .map(r => {
      const t = new Date(r.timestamp).getTime();
      if (isNaN(t) || t < tStart || t > tEnd) return null;
      const ok = r.migrations_successful || 0;
      const total = r.migrations_executed || 0;
      const failed = total - ok;
      let color = 'fill-green-500';
      if (r.status === 'failed' || failed === total) color = 'fill-red-500';
      else if (r.status === 'partial' || failed > 0) color = 'fill-yellow-500';
      const x = xFor(t);
      const dur = r.duration_seconds != null
        ? (r.duration_seconds < 60 ? `${r.duration_seconds}s` : `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s`)
        : '';
      const title = `${new Date(t).toLocaleString()} — ${r.status} · ${ok}/${total} migrations${dur ? ' · ' + dur : ''}`;
      return { x, color, title };
    })
    .filter(Boolean);

  return (
    <div className={`${GLASS_CARD} mb-3`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white">Cluster Health Over Time</h3>
          <p className="text-[11px] text-gray-500">
            {new Date(tStart).toLocaleDateString()} → {new Date(tEnd).toLocaleDateString()}
            {markers.length > 0 && ` · ${markers.length} migration run${markers.length !== 1 ? 's' : ''} marked`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-white tabular-nums">{latest.toFixed(1)}</span>
            <span className={`text-xs font-semibold tabular-nums ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
            </span>
          </div>
          <PeriodPills value={period} onChange={setPeriodPersisted} />
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 8}`} className="w-full" style={{ height: 88 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="clusterHealthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#clusterHealthGrad)" />
        <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        {markers.map((m, i) => (
          <g key={i}>
            <line x1={m.x} y1={pad} x2={m.x} y2={h - pad} stroke="currentColor" className="text-slate-600/40" strokeWidth="0.5" strokeDasharray="2,2" />
            <polygon
              points={`${m.x - 3},${h + 2} ${m.x + 3},${h + 2} ${m.x},${h - 4}`}
              className={m.color}
            >
              <title>{m.title}</title>
            </polygon>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{new Date(tStart).toLocaleDateString()}</span>
        <span>min {min.toFixed(1)}</span>
        <span>max {max.toFixed(1)}</span>
        <span>{new Date(tEnd).toLocaleDateString()}</span>
      </div>
      {markers.length > 0 && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-green-500" />success</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-yellow-500" />partial</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-500" />failed</span>
          <span className="ml-auto">hover a marker for detail</span>
        </div>
      )}
    </div>
  );
}

function PeriodPills({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-800/60 border border-slate-700/50 p-0.5">
      {PERIODS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            value === p.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
