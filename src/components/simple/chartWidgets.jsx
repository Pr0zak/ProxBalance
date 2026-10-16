// The chart-led Simple view widgets: load over 24 hours, busy hours, the
// busiest guests, storage pools and the memory map. Data comes from the
// collector snapshot already on the page (trend_data, guests, storage).

import { TEXT, Card, Empty, Switch, usePref, useSlot } from './parts.jsx';
import { FILL } from './charts.jsx';
import { nodeColors } from '../dashboard/compareSeries.js';
import ClusterMap from '../dashboard/ClusterMap.jsx';
import { nodeRoles } from '../../utils/nodeRoles.js';
import {
  alignedSeries, hourGrid, topGuests, GUEST_METRICS, storagePools, fmtGb, memoryColumns,
} from '../../utils/simpleView.js';

const { useState, useMemo, useRef, useLayoutEffect } = React;

const hm = (sec) => new Date(sec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtPct = (v) => (typeof v === 'number' ? `${v < 10 ? v.toFixed(1) : Math.round(v)}%` : '—');

/** A size from the card's width, kept between `min` and `max` px. */
export const fitPx = (widthPx, ratio, min, max) => (widthPx ? Math.round(Math.max(min, Math.min(max, widthPx * ratio))) : min);

const onlineNodes = (data) => Object.values(data?.nodes || {}).filter(n => n.status === 'online')
  .sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Load, 24 h
// ---------------------------------------------------------------------------

const LOAD_METRICS = [
  { id: 'cpu', label: 'CPU', key: 'cpu' },
  { id: 'mem', label: 'Memory', key: 'mem' },
  { id: 'iowait', label: 'IO wait', key: 'iowait' },
];

/**
 * One line per node over the last 24 hours on a shared axis, the limit as a
 * dashed line. Touch or hover the chart to read every node at that time.
 */
export function LoadWidget({ ctx }) {
  const [metric, setMetric] = usePref('load.metric', 'cpu', LOAD_METRICS.map(m => m.id));
  const [hover, setHover] = useState(null);
  const { widthPx } = useSlot();
  const chartH = fitPx(widthPx, 0.26, 160, 360);
  const nodes = onlineNodes(ctx.data);
  const colors = nodeColors(Object.keys(ctx.data?.nodes || {}));
  const m = LOAD_METRICS.find(x => x.id === metric) || LOAD_METRICS[0];
  const limit = metric === 'cpu' ? ctx.cpuThreshold : metric === 'mem' ? ctx.memThreshold : ctx.iowaitThreshold;

  const { times, lines, endSec } = useMemo(() => {
    const byNode = {};
    let last = 0;
    for (const n of nodes) {
      const day = n.trend_data?.day || [];
      byNode[n.name] = day;
      const t = day.length ? day[day.length - 1].time : 0;
      if (typeof t === 'number' && t > last) last = t;
    }
    const end = last || ctx.nowMs / 1000;
    return { ...alignedSeries(byNode, m.key, { nowSec: end + 1, hours: 24, n: 96 }), endSec: end };
  }, [ctx.data, m.key]);

  const all = Object.values(lines).flat().filter(v => typeof v === 'number');
  if (all.length === 0) {
    return <Card title="Load, 24 h" href="#/dashboard/charts"><Empty>No history yet.</Empty></Card>;
  }
  const peak = Math.max(...all, typeof limit === 'number' ? limit : 0);
  const top = metric === 'iowait' ? Math.max(5, Math.ceil((peak * 1.15) / 5) * 5) : 100;
  const n = times.length;
  const W = 100, H = 100;
  const X = (i) => (i / (n - 1)) * W;
  const Y = (v) => H - (Math.max(0, Math.min(top, v)) / top) * H;
  const runs = (vals) => {
    const out = [];
    let cur = [];
    vals.forEach((v, i) => {
      if (typeof v === 'number') cur.push(`${X(i).toFixed(2)},${Y(v).toFixed(2)}`);
      else if (cur.length) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const lastOf = (vals) => [...vals].reverse().find(v => typeof v === 'number');
  const at = hover != null
    ? nodes.map(nd => ({ name: nd.name, v: lines[nd.name]?.[hover] })).filter(x => typeof x.v === 'number').sort((a, b) => b.v - a.v)
    : null;
  const grid = [0.25, 0.5, 0.75].map(f => f * top);

  return (
    <Card title="Load, 24 h" href="#/dashboard/charts"
      tools={<Switch label="Metric" options={LOAD_METRICS} value={metric} onChange={(v) => { setMetric(v); setHover(null); }} />}>
      <div className="relative">
        <div className="relative ml-8 touch-none select-none cursor-crosshair" style={{ height: chartH }}
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null); }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible"
            role="img" aria-label={`${m.label} per node over the last 24 hours`}>
            {grid.map(g => (
              <line key={g} x1="0" x2={W} y1={Y(g)} y2={Y(g)} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-slate-200 dark:stroke-slate-700/70" />
            ))}
            <line x1="0" x2={W} y1={H} y2={H} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-slate-300 dark:stroke-slate-600" />
            {typeof limit === 'number' && limit <= top && (
              <line x1="0" x2={W} y1={Y(limit)} y2={Y(limit)} strokeWidth="1.25" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" className="stroke-red-500/80" />
            )}
            {nodes.map(nd => runs(lines[nd.name] || []).map((r, i) => (
              <polyline key={`${nd.name}-${i}`} points={r.join(' ')} fill="none" stroke={colors[nd.name]}
                strokeWidth={at && at[0]?.name === nd.name ? 2.5 : 1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            )))}
            {hover != null && (
              <line x1={X(hover)} x2={X(hover)} y1="0" y2={H} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-slate-500 dark:stroke-slate-300" />
            )}
          </svg>
          {hover != null && at && at.length > 0 && (
            <div className={`absolute top-1 z-10 rounded-lg border border-pb-border dark:border-slate-600 bg-white/95 dark:bg-slate-900/95 shadow-lg px-2.5 py-1.5 text-xs pointer-events-none ${hover > n / 2 ? '-translate-x-full -ml-2' : 'ml-2'}`}
              style={{ left: `${(hover / (n - 1)) * 100}%` }}>
              <div className="font-semibold tabular-nums text-pb-text dark:text-gray-100 mb-0.5">{hm(times[hover])}</div>
              {at.map(x => (
                <div key={x.name} className="flex items-center gap-2 tabular-nums whitespace-nowrap">
                  <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: colors[x.name] }} />
                  <span className="text-pb-text2 dark:text-gray-300">{x.name}</span>
                  <span className="ml-auto pl-2 font-semibold text-pb-text dark:text-gray-100">{fmtPct(x.v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ height: chartH }} className="absolute left-0 top-0 w-7 text-[10px] tabular-nums text-right text-pb-text3 dark:text-gray-500 pointer-events-none">
          {[top, ...grid.slice().reverse()].map(g => (
            <span key={g} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - g / top) * 100}%` }}>{Math.round(g)}%</span>
          ))}
        </div>
        <div className={`relative h-4 ml-8 mt-1 text-[10px] tabular-nums ${TEXT.muted}`}>
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <span key={f} className={`absolute ${f === 0 ? '' : f === 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${f * 100}%` }}>
              {hm(f === 1 ? endSec : times[0] + f * 24 * 3600)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {nodes.map(nd => (
          <span key={nd.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-1 rounded" style={{ background: colors[nd.name] }} />
            <span className="text-pb-text dark:text-gray-200">{nd.name}</span>
            <span className={`tabular-nums ${TEXT.muted}`}>{fmtPct(lastOf(lines[nd.name] || []))}</span>
          </span>
        ))}
        {typeof limit === 'number' && <span className={`inline-flex items-center gap-1.5 ${TEXT.muted}`}><span className="inline-block w-3 border-t border-dashed border-red-500" />limit {limit}%</span>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Busy hours
// ---------------------------------------------------------------------------

const RHYTHM_METRICS = [{ id: 'cpu', label: 'CPU' }, { id: 'iowait', label: 'IO wait' }];

/**
 * Cluster average by local day (rows) and hour (columns) for 7 days. Darker
 * is busier; amber cells are at or over the limit. Tap a cell to read it.
 */
export function RhythmWidget({ ctx }) {
  const [metric, setMetric] = usePref('rhythm.metric', 'cpu', RHYTHM_METRICS.map(m => m.id));
  const [picked, setPicked] = useState(null);
  const limit = metric === 'cpu' ? ctx.cpuThreshold : ctx.iowaitThreshold;
  const grid = useMemo(() => {
    const byNode = {};
    for (const n of onlineNodes(ctx.data)) byNode[n.name] = n.trend_data?.week || [];
    return hourGrid(byNode, metric, ctx.nowMs, 7);
  }, [ctx.data, metric, Math.floor(ctx.nowMs / 3600e3)]);
  const label = metric === 'cpu' ? 'CPU' : 'IO wait';
  if (!grid.peak) {
    return <Card title="Busy hours" href="#/insights"><Empty>No week of history yet.</Empty></Card>;
  }
  // Shade from the week's quietest hour to its busiest so the pattern shows
  // even when the whole week sits in a narrow band; the limit ring and the
  // tapped value give the absolute level.
  const span = Math.max(grid.max - grid.min, 0.5);
  const cellStyle = (v) => {
    if (v == null) return undefined;
    const a = 0.08 + 0.87 * Math.max(0, Math.min(1, (v - grid.min) / span));
    return { background: `rgba(14, 165, 233, ${a.toFixed(3)})` };
  };
  const sel = picked ? grid.rows.find(r => r.key === picked.day) : null;
  const selV = sel ? sel.cells[picked.hour] : null;
  return (
    <Card title="Busy hours" href="#/insights"
      tools={<Switch label="Metric" options={RHYTHM_METRICS} value={metric} onChange={(v) => { setMetric(v); setPicked(null); }} />}>
      <p className="text-sm text-pb-text dark:text-gray-200">
        Busiest: <b className="font-semibold">{grid.peak.label} {String(grid.peak.hour).padStart(2, '0')}:00</b>
        <span className={TEXT.muted}> · {label} {fmtPct(grid.peak.value)} across the cluster</span>
      </p>
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-1.5 gap-y-[3px]">
        {grid.rows.map(r => (
          <React.Fragment key={r.key}>
            <span className={`text-[10px] leading-none self-center ${TEXT.muted}`}>{r.label}</span>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
              {r.cells.map((v, h) => {
                const over = v != null && typeof limit === 'number' && v >= limit;
                const isSel = picked && picked.day === r.key && picked.hour === h;
                return (
                  <button key={h} type="button" disabled={v == null}
                    aria-label={`${r.label} ${h}:00, ${v == null ? 'no data' : fmtPct(v)}`}
                    title={v == null ? undefined : `${r.label} ${String(h).padStart(2, '0')}:00 · ${fmtPct(v)}`}
                    onClick={() => setPicked(isSel ? null : { day: r.key, hour: h })}
                    className={`h-4 sm:h-5 rounded-[3px] ${v == null ? 'bg-slate-100 dark:bg-slate-800/60' : ''} ${over ? 'ring-2 ring-inset ring-amber-500' : ''} ${isSel ? 'outline outline-2 outline-pb-text dark:outline-white' : ''}`}
                    style={cellStyle(v)} />
                );
              })}
            </div>
          </React.Fragment>
        ))}
        <span />
        <div className={`relative h-3 text-[10px] tabular-nums ${TEXT.muted}`}>
          {[0, 6, 12, 18].map(h => (
            <span key={h} className="absolute" style={{ left: `${(h / 24) * 100}%` }}>{String(h).padStart(2, '0')}</span>
          ))}
        </div>
      </div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${TEXT.muted}`}>
        <span className="inline-flex items-center gap-1 tabular-nums">{fmtPct(grid.min)}
          {[0.1, 0.3, 0.55, 0.8, 1].map(f => <span key={f} className="inline-block w-3 h-3 rounded-sm" style={{ background: `rgba(14, 165, 233, ${(0.08 + 0.87 * f).toFixed(3)})` }} />)}
          {fmtPct(grid.max)}</span>
        {typeof limit === 'number' && <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm ring-2 ring-inset ring-amber-500" />at your {limit}% limit</span>}
      </div>
      {sel && <p className="text-xs text-pb-text dark:text-gray-200">{sel.label} {String(picked.hour).padStart(2, '0')}:00–{String((picked.hour + 1) % 24).padStart(2, '0')}:00: {label} {fmtPct(selV)} on average</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Busiest guests
// ---------------------------------------------------------------------------

const TYPE_FILL = { VM: 'bg-indigo-500', CT: 'bg-teal-500' };

export function TopGuestsWidget({ ctx }) {
  const [metric, setMetric] = usePref('topguests.metric', 'cpu', GUEST_METRICS.map(m => m.id));
  const rows = topGuests(ctx.data?.guests, metric, 6);
  const scale = metric === 'cpu' ? 100 : Math.max(...rows.map(r => r.value), 1);
  return (
    <Card title="Busiest guests" href="#/dashboard/guests"
      tools={<Switch label="Metric" options={GUEST_METRICS} value={metric} onChange={setMetric} />}>
      {rows.length === 0 ? <Empty>No running guest reports this yet.</Empty> : (
        <>
          <ul className="flex flex-col gap-2">
            {rows.map(r => (
              <li key={r.vmid}>
                <a href={`#/dashboard/guests/guest/${r.vmid}`} className="block rounded-md -mx-1.5 px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/40">
                  <div className="flex items-baseline gap-2 text-sm min-w-0">
                    <span className="font-semibold truncate text-pb-text dark:text-gray-100">{r.name}</span>
                    <span className={`text-[11px] shrink-0 ${TEXT.muted}`}>{r.type} · {r.node}</span>
                    <span className="ml-auto text-xs tabular-nums shrink-0 text-pb-text2 dark:text-gray-300">{r.text}</span>
                  </div>
                  <div className="h-2 mt-1 rounded bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                    <div className={`h-full rounded ${TYPE_FILL[r.type] || FILL.info}`} style={{ width: `${Math.max(2, Math.min(100, (r.value / scale) * 100))}%` }} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
          <p className={`text-[11px] ${TEXT.muted}`}>
            <span className="inline-flex items-center gap-1 mr-3"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${TYPE_FILL.VM}`} />VM</span>
            <span className="inline-flex items-center gap-1 mr-3"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${TYPE_FILL.CT}`} />CT</span>
            {metric === 'cpu' ? 'Bar = share of the guest’s own cores' : metric === 'mem' ? 'Bar against the biggest; text = used of its maximum' : 'Bar against the busiest'}
          </p>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_SHOWN = 6;

export function StorageWidget({ ctx }) {
  const [all, setAll] = useState(false);
  const pools = storagePools(ctx.data?.nodes);
  const shown = all ? pools : pools.slice(0, STORAGE_SHOWN);
  const full = pools.filter(p => p.tone !== 'ok').length;
  return (
    <Card title="Storage" href="#/dashboard/nodes">
      {pools.length === 0 ? <Empty>No storage reported.</Empty> : (
        <>
          <p className="text-sm text-pb-text dark:text-gray-200">
            <b className="font-semibold tabular-nums">{pools.length}</b> pools
            {full > 0 ? <span className={TEXT.warn}> · {full} over 80% full</span> : <span className={TEXT.muted}> · all under 80% full</span>}
          </p>
          <ul className="flex flex-col gap-2.5">
            {shown.map(p => (
              <li key={p.id}>
                <div className="flex items-baseline gap-2 text-sm min-w-0">
                  <span className="font-semibold truncate text-pb-text dark:text-gray-100">{p.name}</span>
                  <span className={`text-[11px] shrink-0 ${TEXT.muted}`}>{p.shared ? 'shared' : p.node}</span>
                  <span className={`ml-auto text-xs tabular-nums shrink-0 ${p.tone === 'ok' ? 'text-pb-text2 dark:text-gray-300' : TEXT[p.tone === 'bad' ? 'bad' : 'warn']}`}>
                    {fmtGb(p.usedGb)} of {fmtGb(p.totalGb)} · {Math.round(p.pct)}%
                  </span>
                </div>
                <div className="relative h-2.5 mt-1 rounded bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                  <div className={`h-full rounded ${FILL[p.tone]}`} style={{ width: `${Math.min(100, p.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {pools.length > STORAGE_SHOWN && (
            <button type="button" onClick={() => setAll(a => !a)} className="self-start text-xs text-blue-600 dark:text-blue-400 hover:underline">
              {all ? 'Show fewer' : `Show all ${pools.length}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Memory map
// ---------------------------------------------------------------------------


/**
 * A column per node, as tall as its memory: running guests stacked from the
 * bottom (largest first, VM indigo, CT teal), then the host and anything
 * else, then free. A line marks the memory limit. Tap a block to name it.
 */
export function MemoryMapWidget({ ctx }) {
  const [picked, setPicked] = useState(null);
  const { widthPx } = useSlot();
  const MAP_H = fitPx(widthPx, 0.2, 170, 340);
  const cols = memoryColumns(ctx.data?.nodes, ctx.data?.guests);
  if (cols.length === 0) return <Card title="Memory map" href="#/dashboard/map"><Empty>No node data yet.</Empty></Card>;
  const biggest = Math.max(...cols.map(c => c.totalGb));
  const limit = ctx.memThreshold;
  return (
    <Card title="Memory map" href="#/dashboard/map">
      <div className="flex items-end gap-2 sm:gap-4" style={{ height: MAP_H + 36 }}>
        {cols.map(c => {
          const h = (c.totalGb / biggest) * MAP_H;
          const px = (gb) => (gb / c.totalGb) * h;
          const usedPct = ((c.totalGb - c.freeGb) / c.totalGb) * 100;
          return (
            <div key={c.name} className="flex-1 min-w-0 flex flex-col items-stretch">
              <div className="text-center leading-tight mb-1 min-w-0">
                <div className="text-xs font-semibold truncate text-pb-text dark:text-gray-100">{c.name}</div>
                <div className={`text-[10px] tabular-nums ${typeof limit === 'number' && usedPct >= limit ? TEXT.warn : TEXT.muted}`}>{Math.round(usedPct)}% of {fmtGb(c.totalGb)}</div>
              </div>
              <div className="relative flex flex-col-reverse rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800/70 border border-pb-border/70 dark:border-slate-700"
                style={{ height: h }}>
                {c.guests.map(g => {
                  const ph = px(g.gb);
                  const isSel = picked?.vmid === g.vmid;
                  return (
                    <button key={g.vmid} type="button" onClick={() => setPicked(isSel ? null : { ...g, node: c.name })}
                      title={`${g.name} · ${g.gb.toFixed(1)} GB`} aria-label={`${g.name}, ${g.gb.toFixed(1)} GB on ${c.name}`}
                      className={`relative w-full shrink-0 border-t border-white/50 dark:border-slate-900/60 text-left overflow-hidden ${TYPE_FILL[g.type] || FILL.info} ${isSel ? 'brightness-125 ring-2 ring-inset ring-white' : 'hover:brightness-110'}`}
                      style={{ height: ph }}>
                      {ph >= 15 && <span className="absolute inset-x-1 top-0.5 text-[10px] leading-tight text-white truncate">{g.name}</span>}
                    </button>
                  );
                })}
                {c.otherGb > 0 && (
                  <div className="w-full shrink-0 bg-slate-400/70 dark:bg-slate-500/70 border-t border-white/50 dark:border-slate-900/60" style={{ height: px(c.otherGb) }}
                    title={`Host and other: ${c.otherGb.toFixed(1)} GB`} />
                )}
                {typeof limit === 'number' && (
                  <span aria-hidden="true" className="absolute inset-x-0 border-t-2 border-dashed border-red-500/90 pointer-events-none" style={{ bottom: `${limit}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pb-text2 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${TYPE_FILL.VM}`} />VM</span>
        <span className="inline-flex items-center gap-1"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${TYPE_FILL.CT}`} />CT</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400/70" />host and other</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-pb-border dark:border-slate-600" />free</span>
        {typeof limit === 'number' && <span className="inline-flex items-center gap-1"><span className="inline-block w-3 border-t-2 border-dashed border-red-500" />{limit}% limit</span>}
      </div>
      {picked
        ? <p className="text-xs text-pb-text dark:text-gray-200"><b className="font-semibold">{picked.name}</b> ({picked.type}) on {picked.node}: {picked.gb.toFixed(1)} GB · <a className="text-blue-600 dark:text-blue-400 hover:underline" href={`#/dashboard/guests/guest/${picked.vmid}`}>open</a></p>
        : <p className={`text-[11px] ${TEXT.muted}`}>Column height = node memory. Tap a block to name it.</p>}
    </Card>
  );
}


// ---------------------------------------------------------------------------
// Cluster map
// ---------------------------------------------------------------------------

const MAP_MODES = [
  { id: 'cpu', label: 'CPU' },
  { id: 'memory', label: 'Memory' },
  { id: 'allocated', label: 'Allocated' },
  { id: 'disk_io', label: 'Disk IO' },
  { id: 'network', label: 'Network' },
];
const noop = () => {};

// Width one node column takes in the map (its 196 px minimum plus the gap).
const MAP_COL_PX = 212;
// Smallest scale before the map wraps to more rows instead.
const MAP_MIN_SCALE = 0.6;
// Below this card width (phones) the map is not scaled: it stacks as on the Dashboard.
const MAP_NO_SCALE_BELOW = 500;

/**
 * Lays the map out wide enough for one row of nodes and scales it down (never
 * up) to the card's width; when that would go under MAP_MIN_SCALE it lays
 * out at the widest width that scale allows, so the nodes wrap. The box
 * takes the scaled height, so nothing scrolls.
 */
function FitWidth({ columns, children }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const [fit, setFit] = useState({ w: null, s: 1, h: null });
  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return undefined;
    const measure = () => {
      const bw = box.clientWidth;
      if (!bw) return;
      let w = bw;
      let sc = 1;
      if (bw >= MAP_NO_SCALE_BELOW) {
        w = Math.max(bw, Math.min(columns * MAP_COL_PX, bw / MAP_MIN_SCALE));
        sc = bw / w;
      }
      const h = Math.ceil(inner.offsetHeight * sc);
      setFit(f => (f.w === w && Math.abs(f.s - sc) < 0.005 && f.h === h ? f : { w, s: sc, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [columns]);
  return (
    <div ref={boxRef} className="relative w-full overflow-x-clip" style={{ height: fit.h ?? undefined }}>
      <div ref={innerRef} className="absolute top-0 left-0"
        style={{ width: fit.w ? `${fit.w}px` : '100%', transform: fit.s < 1 ? `scale(${fit.s})` : undefined, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * The Dashboard's Cluster Map, map only (no toolbar, find bar or dragging).
 * Tapping a node or guest opens it on the full Dashboard's Map tab.
 */
export function MapWidget({ ctx }) {
  const [mode, setMode] = usePref('map.mode', 'cpu', MAP_MODES.map(m => m.id));
  const roles = useMemo(
    () => nodeRoles({ nodes: ctx.data?.nodes, recommendations: ctx.recommendations, maintenanceNodes: ctx.maintenanceNodes }),
    [ctx.data, ctx.recommendations, ctx.maintenanceNodes],
  );
  const openNode = (node) => { if (node?.name) window.location.hash = `#/dashboard/map/node/${encodeURIComponent(node.name)}`; };
  const openGuest = (g) => { if (g?.vmid != null) window.location.hash = `#/dashboard/map/guest/${g.vmid}`; };
  return (
    <Card title="Cluster map" href="#/dashboard/map"
      tools={<Switch label="Bubble size" options={MAP_MODES} value={mode} onChange={setMode} />}>
      <FitWidth columns={Object.keys(ctx.data?.nodes || {}).length}>
        <ClusterMap
          embedded wall
          data={ctx.data}
          showPoweredOffGuests={false}
          setShowPoweredOffGuests={noop}
          clusterMapViewMode={mode}
          setClusterMapViewMode={setMode}
          maintenanceNodes={ctx.maintenanceNodes}
          nodeRoleMap={roles}
          setSelectedNode={openNode}
          setSelectedGuestDetails={openGuest}
          guestsMigrating={ctx.guestsMigrating || {}}
          migrationProgress={ctx.migrationProgress || {}}
          completedMigrations={ctx.completedMigrations || {}}
          nodeScores={ctx.nodeScores}
          recommendations={ctx.recommendations || []}
        />
      </FitWidth>
      <p className={`text-[11px] ${TEXT.muted}`}>Bubble size = the guest's {MAP_MODES.find(m => m.id === mode)?.label.toLowerCase()}. Tap a node or guest to open it.</p>
    </Card>
  );
}
