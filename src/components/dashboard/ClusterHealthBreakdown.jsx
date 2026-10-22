import { MODAL_OVERLAY, MODAL_CONTAINER, headroomLevel, levelTextColor, levelDotColor } from '../../utils/designTokens.js';
import { X } from '../Icons.jsx';
import { ScoreBreakdown } from './ScoreBreakdown.jsx';

const { useState } = React;

// Shared columns for the heading and every node row: name + capacity, CPU, memory.
const ROW = 'grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-4 items-center';

// Bar fill per role: over its limit, the heavy end of an uneven gap, the
// spare end of an uneven gap, or nothing to note.
const FILL = {
  over: 'bg-red-500',
  heavy: 'bg-amber-500',
  spare: 'bg-sky-500',
  plain: 'bg-slate-400 dark:bg-slate-500',
};

/** Role of one node's reading within a metric of cluster_balance. */
function roleOf(name, value, side, limit, threshold) {
  if (value > limit) return 'over';
  if (side && side.spread >= threshold) {
    if (name === side.max_node) return 'heavy';
    if (name === side.min_node) return 'spare';
  }
  return 'plain';
}

/** Header figure: dot, label, big number, short line. Matches the dashboard tile. */
function Figure({ label, fig }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-pb-text2 dark:text-gray-400">
        <span className={`w-2 h-2 rounded-full shrink-0 ${levelDotColor(fig.level)}`} aria-hidden="true" />
        {label}
      </div>
      <div className={`text-3xl font-bold tabular-nums leading-tight ${levelTextColor(fig.level)}`}>
        {fig.value ?? '—'}
        {fig.value !== null && <span className="text-sm font-medium text-pb-text2 dark:text-gray-500">/100</span>}
      </div>
      {fig.sub && <div className="text-[11px] text-pb-text2 dark:text-gray-500 truncate">{fig.sub}</div>}
    </div>
  );
}

/** One reading as a 0-100 bar, with the cluster average and the limit marked. */
function Bar({ value, role, mean, limit, title }) {
  if (typeof value !== 'number') {
    return <div className="text-xs text-pb-text2 dark:text-gray-500 text-right">—</div>;
  }
  const pct = (v) => `${Math.min(100, Math.max(0, v))}%`;
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={title}>
      <div className="relative flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60">
        <div className={`absolute inset-y-0 left-0 rounded-full ${FILL[role]}`} style={{ width: pct(value) }} />
        {typeof mean === 'number' && (
          <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-pb-text dark:bg-gray-200" style={{ left: pct(mean) }} />
        )}
        <div className="absolute -top-1 -bottom-1 border-l border-dashed border-red-500" style={{ left: pct(limit) }} />
      </div>
      <span className={`w-7 text-right text-xs tabular-nums ${role === 'over' ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-pb-text dark:text-gray-200'}`}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/** Column heading: metric name, dot coloured by its gap, and the gap. */
function GapHeading({ label, side, threshold, over }) {
  const level = !side ? null : over ? 'crit' : side.spread >= threshold ? 'warn' : 'ok';
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-pb-text2 dark:text-gray-400 min-w-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${levelDotColor(level)}`} aria-hidden="true" />
      <span>{label}</span>
      <span className={`ml-auto sm:pr-8 whitespace-nowrap tabular-nums font-semibold ${levelTextColor(level)}`} title="Busiest minus quietest node, in points">
        {side ? `gap ${Math.round(side.spread)}` : '—'}
      </span>
    </div>
  );
}

function Legend({ threshold }) {
  const swatch = (cls) => <span className={`inline-block w-2.5 h-2.5 rounded-sm ${cls}`} />;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-pb-text2 dark:text-gray-500">
      <span className="flex items-center gap-1">{swatch(FILL.heavy)}most loaded</span>
      <span className="flex items-center gap-1">{swatch(FILL.spare)}most free</span>
      <span className="flex items-center gap-1">{swatch(FILL.over)}too full</span>
      <span className="flex items-center gap-1"><span className="inline-block w-0.5 h-3 bg-pb-text dark:bg-gray-200" />cluster average</span>
      <span className="flex items-center gap-1"><span className="inline-block h-3 border-l border-dashed border-red-500" />max allowed</span>
      <span>even = nodes within {Math.round(threshold)}% of each other</span>
    </div>
  );
}

/**
 * Click-in panel for the dashboard's cluster health tile.
 *
 * Header: the tile's two numbers (Capacity, Balance). Body: one row per node
 * with its capacity and a CPU and memory bar. The heaviest and most spare
 * node of an uneven metric are coloured, so where the gap comes from shows
 * at a glance; a row opens that node's capacity breakdown.
 */
export default function ClusterHealthBreakdown({
  open, onClose,
  capacity, balanceFig,    // { level, value, sub } for the header, as on the tile
  balance,                 // /api/analyze cluster_balance
  nodeScores, nodes, maintenanceNodes, busiestName,
}) {
  const [expanded, setExpanded] = useState(null);
  if (!open) return null;

  const maint = new Set(maintenanceNodes ? [...maintenanceNodes] : []);
  const threshold = balance?.threshold ?? 8;
  const cpuLimit = balance?.limits?.cpu ?? 80;
  const memLimit = balance?.limits?.memory ?? 80;
  const cpuVals = balance?.cpu?.values || {};
  const memVals = balance?.memory?.values || {};
  const mean = (vals) => {
    const v = Object.values(vals);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const cpuMean = mean(cpuVals);
  const memMean = mean(memVals);
  const overCpu = (balance?.over || []).some(o => o.metric === 'cpu');
  const overMem = (balance?.over || []).some(o => o.metric === 'memory');

  const names = [...new Set([...Object.keys(nodes || {}), ...Object.keys(nodeScores || {})])].sort();
  const rows = names.map(name => {
    const online = !nodes?.[name] || nodes[name].status === 'online';
    const rating = nodeScores?.[name]?.suitability_rating;
    return { name, online, maint: maint.has(name), rating: typeof rating === 'number' ? rating : null };
  });

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div
        className={`${MODAL_CONTAINER} w-full sm:max-w-2xl max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4 shrink-0">
          <Figure label="Capacity" fig={capacity} />
          <span className="w-px self-stretch bg-slate-200 dark:bg-pb-border-dark" aria-hidden="true" />
          <Figure label="Balance" fig={balanceFig} />
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 shrink-0 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          <div className={`${ROW} pb-2`}>
            <div className="text-[11px] text-pb-text2 dark:text-gray-400 " title="Headroom left on each node, 0-100">capacity</div>
            <GapHeading label="CPU" side={balance?.cpu} threshold={threshold} over={overCpu} />
            <GapHeading label="Mem" side={balance?.memory} threshold={threshold} over={overMem} />
          </div>

            {rows.map(r => {
              const cpu = cpuVals[r.name];
              const mem = memVals[r.name];
              const isOpen = expanded === r.name;
              const capLevel = r.maint ? null : headroomLevel(r.rating);
              return (
                <div key={r.name} className="border-t border-slate-100 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.name)}
                    disabled={!nodeScores?.[r.name]?.score_breakdown}
                    aria-expanded={isOpen}
                    className={`${ROW} w-full py-2 text-left rounded ${r.name === busiestName ? 'bg-slate-50 dark:bg-slate-800/50' : ''} ${r.online ? '' : 'opacity-50'} hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:cursor-default`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pl-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${levelDotColor(capLevel)}`} aria-hidden="true" />
                      <span className="text-sm font-medium text-pb-text dark:text-gray-100 truncate">{r.name}</span>
                      <span className={`ml-auto text-xs tabular-nums ${levelTextColor(capLevel)}`}>
                        {!r.online ? 'off' : r.maint ? 'maint' : r.rating !== null ? Math.round(r.rating) : '—'}
                      </span>
                    </div>
                    <Bar
                      value={cpu}
                      role={roleOf(r.name, cpu, balance?.cpu, cpuLimit, threshold)}
                      mean={cpuMean} limit={cpuLimit}
                      title={typeof cpu === 'number' ? `${r.name} CPU ${cpu}% (movable load: anchored guests left out) · limit ${cpuLimit}%` : undefined}
                    />
                    <Bar
                      value={mem}
                      role={roleOf(r.name, mem, balance?.memory, memLimit, threshold)}
                      mean={memMean} limit={memLimit}
                      title={typeof mem === 'number' ? `${r.name} memory ${mem}% · limit ${memLimit}%` : undefined}
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-3 pl-1">
                      <ScoreBreakdown score={nodeScores?.[r.name]} compact />
                    </div>
                  )}
                </div>
              );
            })}

          {rows.length === 0 && (
            <div className="text-sm text-pb-text2 dark:text-gray-500 italic p-4 text-center">No node readings yet.</div>
          )}

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <Legend threshold={threshold} />
          </div>
        </div>
      </div>
    </div>
  );
}
