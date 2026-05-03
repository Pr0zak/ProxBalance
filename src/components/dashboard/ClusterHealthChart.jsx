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
 * markers. Markers are status-colored triangles per migration in
 * migration_history (green=completed, yellow=other, red=failed).
 */
export default function ClusterHealthChart({ scoreHistory, migrationHistory }) {
  const [period, setPeriod] = useState(() => localStorage.getItem('clusterHealthChartPeriod') || '30d');
  const setPeriodPersisted = (id) => {
    setPeriod(id);
    localStorage.setItem('clusterHealthChartPeriod', id);
  };

  const allPoints = (scoreHistory || [])
    .map(e => ({ t: new Date(e.timestamp).getTime(), v: e.cluster_health }))
    .filter(p => typeof p.v === 'number' && !isNaN(p.t));

  const allMigTs = (migrationHistory || [])
    .map(m => new Date(m.timestamp).getTime())
    .filter(t => !isNaN(t));

  if (allPoints.length === 0 && allMigTs.length === 0) return null;

  // Anchor the period to the latest known event so collector gaps don't blank the chart.
  const latestT = Math.max(
    allPoints.length ? allPoints[allPoints.length - 1].t : 0,
    allMigTs.length ? Math.max(...allMigTs) : 0,
    Date.now()
  );
  const earliestT = Math.min(
    allPoints.length ? allPoints[0].t : Infinity,
    allMigTs.length ? Math.min(...allMigTs) : Infinity
  );
  const periodCfg = PERIODS.find(p => p.id === period) || PERIODS[2];

  // Window covers the chosen period (or the full data range for 'all'). The
  // cluster_health line draws wherever scoreHistory has data; migration markers
  // plot anywhere in this window. Mismatched data ranges no longer hide markers.
  const tStart = periodCfg.ms == null ? earliestT : (latestT - periodCfg.ms);
  const tEnd = latestT;
  const tRange = (tEnd - tStart) || 1;

  const points = allPoints.filter(p => p.t >= tStart && p.t <= tEnd);

  const w = 600, h = 80, pad = 4;
  const min = points.length > 0 ? Math.min(...points.map(p => p.v)) : 0;
  const max = points.length > 0 ? Math.max(...points.map(p => p.v)) : 100;
  const range = (max - min) || 1;

  const xFor = (t) => pad + ((t - tStart) / tRange) * (w - 2 * pad);
  const yFor = (v) => h - pad - ((v - min) / range) * (h - 2 * pad);

  const coords = points.map(p => `${xFor(p.t).toFixed(2)},${yFor(p.v).toFixed(2)}`);
  const linePoints = coords.join(' ');
  const hasLine = points.length >= 2;
  const areaPoints = hasLine
    ? `${xFor(points[0].t).toFixed(2)},${h - pad} ${linePoints} ${xFor(points[points.length-1].t).toFixed(2)},${h - pad}`
    : '';
  const latest = points.length > 0 ? points[points.length - 1].v : null;
  const trend = points.length > 1 ? (latest - points[0].v) : null;

  // Per-migration markers (from migration_history) within the selected period.
  const markers = (migrationHistory || [])
    .map(m => {
      const t = new Date(m.timestamp).getTime();
      if (isNaN(t) || t < tStart || t > tEnd) return null;
      const status = (m.status || '').toLowerCase();
      let color = 'fill-yellow-500';
      if (status === 'completed' || status === 'success') color = 'fill-green-500';
      else if (status === 'failed' || status === 'error' || status === 'cancelled') color = 'fill-red-500';
      const dur = m.duration_seconds != null
        ? (m.duration_seconds < 60 ? `${Math.round(m.duration_seconds)}s` : `${Math.floor(m.duration_seconds / 60)}m ${Math.round(m.duration_seconds % 60)}s`)
        : '';
      const trigger = m.initiated_by ? ` (${m.initiated_by})` : '';
      const guest = m.name || (m.vmid ? `VM/CT ${m.vmid}` : 'guest');
      const route = (m.source_node && m.target_node) ? `${m.source_node} → ${m.target_node}` : '';
      const title = `${new Date(t).toLocaleString()} — ${guest}${trigger} ${route} · ${m.status}${dur ? ' · ' + dur : ''}`;
      return { x: xFor(t), color, title };
    })
    .filter(Boolean);

  return (
    <div className={`${GLASS_CARD} mb-3`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-pb-text dark:text-white">Cluster Health Over Time</h3>
          <p className="text-[11px] text-pb-text2 dark:text-gray-500">
            {new Date(tStart).toLocaleDateString()} → {new Date(tEnd).toLocaleDateString()}
            {markers.length > 0 && ` · ${markers.length} migration${markers.length !== 1 ? 's' : ''} marked`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {latest != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-pb-text dark:text-white tabular-nums">{latest.toFixed(1)}</span>
              {trend != null && (
                <span className={`text-xs font-semibold tabular-nums ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
                </span>
              )}
            </div>
          )}
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
        {hasLine && <polygon points={areaPoints} fill="url(#clusterHealthGrad)" />}
        {hasLine && <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />}
        {!hasLine && (
          <text x={w / 2} y={h / 2} textAnchor="middle" className="fill-gray-600" fontSize="10">No cluster_health samples in this period</text>
        )}
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
      <div className="flex justify-between text-[10px] text-pb-text2 dark:text-gray-500 mt-1">
        <span>{new Date(tStart).toLocaleDateString()}</span>
        <span>min {min.toFixed(1)}</span>
        <span>max {max.toFixed(1)}</span>
        <span>{new Date(tEnd).toLocaleDateString()}</span>
      </div>
      {markers.length > 0 && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-pb-text2 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-green-500" />completed</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-yellow-500" />other</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-500" />failed</span>
          <span className="ml-auto">hover a marker for detail</span>
        </div>
      )}
    </div>
  );
}

function PeriodPills({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800/60 border border-pb-border dark:border-slate-700/50 p-0.5">
      {PERIODS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            value === p.id
              ? 'bg-blue-600 text-pb-text dark:text-white'
              : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
