import { GLASS_CARD } from '../../utils/designTokens.js';

const { useState, useEffect, useRef } = React;

// Each period also declares its preferred backend bucket size (minutes).
//   bucket=0  → raw rows (no aggregation, server caps via `limit`)
//   bucket=60 → hourly average
const PERIODS = [
  { id: '1d',   label: '1d',   ms: 1 * 24 * 60 * 60 * 1000,   bucket: 0,    limit: 300 },
  { id: '7d',   label: '7d',   ms: 7 * 24 * 60 * 60 * 1000,   bucket: 30,   limit: 400 },
  { id: '30d',  label: '30d',  ms: 30 * 24 * 60 * 60 * 1000,  bucket: 60,   limit: 800 },
  { id: '90d',  label: '90d',  ms: 90 * 24 * 60 * 60 * 1000,  bucket: 360,  limit: 400 },
  { id: '180d', label: '180d', ms: 180 * 24 * 60 * 60 * 1000, bucket: 720,  limit: 400 },
  { id: '1yr',  label: '1yr',  ms: 365 * 24 * 60 * 60 * 1000, bucket: 1440, limit: 400 },
];

const VIEW_MODES = [
  { id: 'cluster', label: 'Cluster' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'lines',   label: 'Per-node' },
];
const SMOOTHING = [
  { id: 'off',   label: 'Off',    window: 1 },
  { id: 'light', label: 'Light',  window: 3 },
  { id: 'med',   label: 'Medium', window: 7 },
  { id: 'heavy', label: 'Heavy',  window: 15 },
];
const DETAIL = [
  { id: 'full', label: 'Full', max: 100000 },
  { id: 'high', label: 'High', max: 200 },
  { id: 'med',  label: 'Med',  max: 100 },
  { id: 'low',  label: 'Low',  max: 40 },
];
// Distinct per-node colors (cycled if more nodes than colors).
const NODE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Keep at most maxN points by taking every Nth (always preserving the last).
function decimate(arr, maxN) {
  if (arr.length <= maxN) return arr;
  const step = Math.ceil(arr.length / maxN);
  const out = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}
// Centered moving average. Nulls are skipped (so offline-node gaps don't poison neighbours).
function smooth(vals, window) {
  if (window <= 1) return vals;
  const half = Math.floor(window / 2);
  return vals.map((v, i) => {
    if (v == null) return null;
    let s = 0, n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(vals.length - 1, i + half); j++) {
      if (vals[j] != null) { s += vals[j]; n++; }
    }
    return n ? s / n : null;
  });
}

const lsGet = (k, fallback) => { try { return localStorage.getItem(k) || fallback; } catch { return fallback; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

// Health bands (cluster_health / suitability: higher = healthier).
const HEALTH_BANDS = [
  { min: 70, color: '#22c55e', label: 'Healthy' },
  { min: 50, color: '#eab308', label: 'Fair' },
  { min: 30, color: '#f97316', label: 'Strained' },
  { min: -Infinity, color: '#ef4444', label: 'Critical' },
];
const healthColor = (v) => (HEALTH_BANDS.find(b => v >= b.min) || HEALTH_BANDS[HEALTH_BANDS.length - 1]).color;
// Build vertical-gradient stops so the line/area is colored by absolute health value,
// with hard transitions at the band boundaries — even though the y-axis is zoomed to
// the data's [min,max]. offset 0 = top (max value), offset 1 = bottom (min value).
const healthStops = (vMin, vMax) => {
  const range = (vMax - vMin) || 1;
  const off = (v) => Math.min(1, Math.max(0, (vMax - v) / range));
  const stops = [{ o: 0, c: healthColor(vMax) }];
  [70, 50, 30].forEach(b => {
    if (b > vMin && b < vMax) {
      const o = off(b);
      stops.push({ o, c: healthColor(b + 0.01) });
      stops.push({ o, c: healthColor(b - 0.01) });
    }
  });
  stops.push({ o: 1, c: healthColor(vMin) });
  return stops;
};

/**
 * Cluster health over time. Three views:
 *  - Cluster: the aggregate cluster_health line/area (original).
 *  - Stacked: each node's suitability as a stacked band — a dip traces to one node.
 *  - Per-node: one line per node (fixed 0-100 suitability scale) for direct comparison.
 * Plus Smoothing (moving average) and Detail (point decimation) controls. Migration
 * markers (status-colored triangles) overlay all views.
 */
export default function ClusterHealthChart({ scoreHistory, migrationHistory, fetchScoreHistory }) {
  const [period, setPeriodState] = useState(() => {
    const saved = lsGet('clusterHealthChartPeriod', '30d');
    return PERIODS.find(p => p.id === saved) ? saved : '30d';
  });
  const [view, setViewState] = useState(() => {
    const s = lsGet('clusterHealthChartView', 'cluster');
    return VIEW_MODES.find(v => v.id === s) ? s : 'cluster';
  });
  // Locked defaults (their selectors are hidden): Medium smoothing + Full detail read best.
  const smoothId = 'med';
  const detailId = 'full';
  const setPeriod = (id) => { setPeriodState(id); lsSet('clusterHealthChartPeriod', id); };
  const setView = (id) => { setViewState(id); lsSet('clusterHealthChartView', id); };

  const [hover, setHover] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof fetchScoreHistory !== 'function') return;
    const cfg = PERIODS.find(p => p.id === period) || PERIODS[2];
    fetchScoreHistory(cfg.limit, cfg.bucket);
  }, [period, fetchScoreHistory]);

  const periodCfg = PERIODS.find(p => p.id === period) || PERIODS[2];
  const smWindow = (SMOOTHING.find(s => s.id === smoothId) || SMOOTHING[0]).window;
  const detailMax = (DETAIL.find(d => d.id === detailId) || DETAIL[0]).max;

  // ---- Window ----
  const allEntries = (scoreHistory || [])
    .map(e => ({ t: new Date(e.timestamp).getTime(), cluster: e.cluster_health, nodes: e.nodes || {} }))
    .filter(e => !isNaN(e.t) && typeof e.cluster === 'number')
    .sort((a, b) => a.t - b.t);
  const allMigTs = (migrationHistory || []).map(m => new Date(m.timestamp).getTime()).filter(t => !isNaN(t));

  if (allEntries.length === 0 && allMigTs.length === 0) return null;

  const latestT = Math.max(
    allEntries.length ? allEntries[allEntries.length - 1].t : 0,
    allMigTs.length ? Math.max(...allMigTs) : 0
  ) || Date.now();
  const tEnd = latestT;
  const tStart = latestT - periodCfg.ms;
  const tRange = (tEnd - tStart) || 1;

  // ---- Series (windowed → decimated → smoothed) ----
  const windowed = allEntries.filter(e => e.t >= tStart && e.t <= tEnd);
  const ent = decimate(windowed, detailMax);
  const ts = ent.map(e => e.t);
  const nodeNames = Array.from(new Set(windowed.flatMap(e => Object.keys(e.nodes)))).sort();

  const clusterVals = smooth(ent.map(e => e.cluster), smWindow);
  const nodeVals = {};
  nodeNames.forEach(n => {
    nodeVals[n] = smooth(ent.map(e => {
      const v = e.nodes[n] && typeof e.nodes[n].suitability === 'number' ? e.nodes[n].suitability : null;
      return v;
    }), smWindow);
  });

  const w = 600, h = 80, pad = 4;
  const xFor = (t) => pad + ((t - tStart) / tRange) * (w - 2 * pad);

  // ---- Per-mode geometry ----
  const colorFor = (i) => NODE_COLORS[i % NODE_COLORS.length];
  const hasData = ts.length >= 2;

  // Cluster: dynamic min/max zoom (preserves original behaviour).
  const cMin = clusterVals.length ? Math.min(...clusterVals.filter(v => v != null)) : 0;
  const cMax = clusterVals.length ? Math.max(...clusterVals.filter(v => v != null)) : 100;
  const cRange = (cMax - cMin) || 1;
  const yCluster = (v) => h - pad - ((v - cMin) / cRange) * (h - 2 * pad);

  // Per-node lines: fixed 0-100 suitability scale so nodes are directly comparable.
  const yNode = (v) => h - pad - (v / 100) * (h - 2 * pad);

  // Stacked: bands of suitability summed; y-scale 0..maxTotal.
  const stackTotals = ts.map((_, i) => nodeNames.reduce((s, n) => s + (nodeVals[n][i] ?? 0), 0));
  const stackMax = Math.max(1, ...stackTotals);
  const yStack = (v) => h - pad - (v / stackMax) * (h - 2 * pad);

  const clusterStops = (view === 'cluster' && hasData) ? healthStops(cMin, cMax) : [];
  let clusterLine = '', clusterArea = '';
  if (view === 'cluster' && hasData) {
    const pts = ts.map((t, i) => clusterVals[i] != null ? `${xFor(t).toFixed(2)},${yCluster(clusterVals[i]).toFixed(2)}` : null).filter(Boolean);
    clusterLine = pts.join(' ');
    clusterArea = `${xFor(ts[0]).toFixed(2)},${h - pad} ${clusterLine} ${xFor(ts[ts.length - 1]).toFixed(2)},${h - pad}`;
  }

  const nodeLines = (view === 'lines' && hasData) ? nodeNames.map((n, k) => {
    // Break the polyline into segments across null gaps.
    const segs = [];
    let cur = [];
    ts.forEach((t, i) => {
      const v = nodeVals[n][i];
      if (v == null) { if (cur.length) { segs.push(cur); cur = []; } }
      else cur.push(`${xFor(t).toFixed(2)},${yNode(v).toFixed(2)}`);
    });
    if (cur.length) segs.push(cur);
    return { name: n, color: colorFor(k), segs };
  }) : [];

  const stackBands = [];
  if (view === 'stacked' && hasData) {
    let below = ts.map(() => 0);
    nodeNames.forEach((n, k) => {
      const top = ts.map((_, i) => below[i] + (nodeVals[n][i] ?? 0));
      const topPts = ts.map((t, i) => `${xFor(t).toFixed(2)},${yStack(top[i]).toFixed(2)}`);
      const botPts = ts.map((t, i) => `${xFor(t).toFixed(2)},${yStack(below[i]).toFixed(2)}`).reverse();
      stackBands.push({ name: n, color: colorFor(k), poly: [...topPts, ...botPts].join(' ') });
      below = top;
    });
  }

  const latest = clusterVals.length ? clusterVals[clusterVals.length - 1] : null;
  const trend = clusterVals.length > 1 ? (latest - clusterVals[0]) : null;

  // ---- Hover (snap to nearest decimated index) ----
  const handleMouseMove = (e) => {
    if (!ts.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pxX = e.clientX - rect.left, pxY = e.clientY - rect.top;
    const vbX = (pxX / rect.width) * w;
    if (vbX < pad - 2 || vbX > w - pad + 2) { setHover(null); return; }
    let bi = 0, bd = Infinity;
    for (let i = 0; i < ts.length; i++) {
      const d = Math.abs(xFor(ts[i]) - vbX);
      if (d < bd) { bd = d; bi = i; }
    }
    setHover({ idx: bi, pixelX: pxX, pixelY: pxY, containerW: rect.width });
  };

  const fmtHoverTime = (t) => {
    const d = new Date(t);
    if (periodCfg.bucket >= 1440) return d.toLocaleDateString();
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const markers = (migrationHistory || [])
    .map(m => {
      const t = new Date(m.timestamp).getTime();
      if (isNaN(t) || t < tStart || t > tEnd) return null;
      const status = (m.status || '').toLowerCase();
      let color = 'fill-yellow-500';
      if (status === 'completed' || status === 'success') color = 'fill-green-500';
      else if (status === 'failed' || status === 'error' || status === 'cancelled') color = 'fill-red-500';
      const guest = m.name || (m.vmid ? `VM/CT ${m.vmid}` : 'guest');
      const route = (m.source_node && m.target_node) ? `${m.source_node} → ${m.target_node}` : '';
      return { x: xFor(t), color, title: `${new Date(t).toLocaleString()} — ${guest} ${route} · ${m.status}` };
    })
    .filter(Boolean);

  const showLegend = view !== 'cluster' && nodeNames.length > 0;

  return (
    <div className={`${GLASS_CARD} mb-3`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-pb-text dark:text-white">Cluster Health Over Time</h3>
          <p className="text-[11px] text-pb-text2 dark:text-gray-500">
            {new Date(tStart).toLocaleDateString()} → {new Date(tEnd).toLocaleDateString()}
            {markers.length > 0 && ` · ${markers.length} migration${markers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {view === 'cluster' && latest != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-pb-text dark:text-white tabular-nums">{latest.toFixed(1)}</span>
              {trend != null && (
                <span className={`text-xs font-semibold tabular-nums ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
                </span>
              )}
            </div>
          )}
          <Pills options={PERIODS} value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* View selector (Smoothing=Medium + Detail=Full are locked) */}
      <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mb-2 text-[11px]">
        <LabeledPills label="View" options={VIEW_MODES} value={view} onChange={setView} />
      </div>

      <div ref={containerRef} className="relative">
        <svg
          viewBox={`0 0 ${w} ${h + 8}`} className="w-full" style={{ height: 88 }}
          preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="clusterHealthGrad" x1="0" y1="0" x2="0" y2="1">
              {clusterStops.map((s, i) => (
                <stop key={i} offset={`${(s.o * 100).toFixed(2)}%`} stopColor={s.c} />
              ))}
            </linearGradient>
          </defs>

          {!hasData && (
            <text x={w / 2} y={h / 2} textAnchor="middle" className="fill-gray-600" fontSize="10">No samples in this period</text>
          )}

          {view === 'cluster' && hasData && (
            <>
              {/* Area + line colored by health value (green healthy → red critical). */}
              <polygon points={clusterArea} fill="url(#clusterHealthGrad)" fillOpacity="0.18" />
              <polyline points={clusterLine} fill="none" stroke="url(#clusterHealthGrad)" strokeWidth="2.5" strokeLinejoin="round" />
            </>
          )}

          {view === 'stacked' && stackBands.map((b, i) => (
            <polygon key={b.name} points={b.poly} fill={b.color} fillOpacity="0.78" stroke={b.color} strokeWidth="0.4">
              <title>{b.name}</title>
            </polygon>
          ))}

          {view === 'lines' && nodeLines.map((nl) => (
            nl.segs.map((seg, si) => (
              <polyline key={`${nl.name}-${si}`} points={seg.join(' ')} fill="none" stroke={nl.color} strokeWidth="1.5" strokeLinejoin="round" />
            ))
          ))}

          {markers.map((m, i) => (
            <g key={i}>
              <line x1={m.x} y1={pad} x2={m.x} y2={h - pad} stroke="currentColor" className="text-slate-600/40" strokeWidth="0.5" strokeDasharray="2,2" />
              <polygon points={`${m.x - 3},${h + 2} ${m.x + 3},${h + 2} ${m.x},${h - 4}`} className={m.color}>
                <title>{m.title}</title>
              </polygon>
            </g>
          ))}

          {hover && hasData && (
            <line
              x1={xFor(ts[hover.idx])} y1={pad} x2={xFor(ts[hover.idx])} y2={h - pad}
              stroke="currentColor" className="text-pb-text dark:text-white" strokeOpacity="0.4" strokeWidth="0.6" pointerEvents="none"
            />
          )}
        </svg>

        {hover && hasData && (() => {
          const flipLeft = hover.containerW && hover.pixelX > hover.containerW * 0.6;
          const style = flipLeft
            ? { right: Math.max(0, hover.containerW - hover.pixelX + 12), top: Math.max(0, hover.pixelY - 50) }
            : { left: hover.pixelX + 12, top: Math.max(0, hover.pixelY - 50) };
          const i = hover.idx;
          return (
            <div className="absolute pointer-events-none z-10 px-2 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-pb-border dark:border-slate-700 shadow-lg text-[11px] max-w-[220px]" style={style}>
              <div className="text-pb-text2 dark:text-gray-400 whitespace-nowrap mb-0.5">{fmtHoverTime(ts[i])}</div>
              {view === 'cluster' ? (
                <div className="font-semibold text-pb-text dark:text-white tabular-nums">{clusterVals[i] != null ? clusterVals[i].toFixed(1) : '—'} <span className="font-normal text-pb-text2 dark:text-gray-500">cluster</span></div>
              ) : (
                <div className="space-y-0.5">
                  {nodeNames
                    .map((n, k) => ({ n, k, v: nodeVals[n][i] }))
                    .sort((a, b) => (a.v ?? -1) - (b.v ?? -1))
                    .map(({ n, k, v }) => (
                      <div key={n} className="flex items-center justify-between gap-3 tabular-nums">
                        <span className="flex items-center gap-1 text-pb-text dark:text-gray-200">
                          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: colorFor(k) }} />{n}
                        </span>
                        <span className="text-pb-text2 dark:text-gray-400">{v != null ? v.toFixed(1) : '—'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {showLegend && (
        <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[10px] text-pb-text2 dark:text-gray-400">
          {nodeNames.map((n, k) => (
            <span key={n} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colorFor(k) }} />{n}
            </span>
          ))}
          <span className="ml-auto">{view === 'lines' ? 'suitability 0–100 per node' : 'band height = node suitability'}</span>
        </div>
      )}

      {view === 'cluster' && hasData && (
        <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[10px] text-pb-text2 dark:text-gray-400">
          {HEALTH_BANDS.map((b) => (
            <span key={b.label} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
              {b.label}{b.min > -Infinity ? ` ≥${b.min}` : ' <30'}
            </span>
          ))}
          <span className="ml-auto">line colored by health value</span>
        </div>
      )}

      {markers.length > 0 && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-pb-text2 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-green-500" />completed</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-yellow-500" />other</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-500" />failed</span>
          <span className="ml-auto">hover for detail</span>
        </div>
      )}
    </div>
  );
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800/60 border border-pb-border dark:border-slate-700/50 p-0.5">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            value === o.id ? 'bg-blue-600 text-white' : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LabeledPills({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-pb-text2 dark:text-gray-500">{label}</span>
      <Pills options={options} value={value} onChange={onChange} />
    </div>
  );
}
