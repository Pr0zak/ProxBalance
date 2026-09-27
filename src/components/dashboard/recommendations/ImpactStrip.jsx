import { AlertTriangle, CheckCircle } from '../../Icons.jsx';
import { INNER_CARD, metricColor, metricTextColor, statusBadge } from '../../../utils/designTokens.js';

/**
 * One bar: filled to the predicted value, a tick for today and a faint red
 * tick at the node's safety limit.
 */
function MetricBar({ label, before, after, limit, over }) {
  const unknown = after == null;
  const changed = !unknown && Math.abs(after - before) >= 0.5;
  const shown = unknown ? before : after;
  return (
    <div className="text-[11px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-pb-text2 dark:text-gray-400">{label}</span>
        <span className="tabular-nums">
          {unknown ? (
            <span className="text-pb-text2 dark:text-gray-500" title="The engine returned no usable prediction for this node">
              {before.toFixed(0)}% → ?
            </span>
          ) : changed ? (
            <>
              <span className="text-pb-text2 dark:text-gray-500">{before.toFixed(0)} → </span>
              <span className={`font-semibold ${over ? 'text-red-600 dark:text-red-400' : metricTextColor(after)}`}>{after.toFixed(0)}%</span>
            </>
          ) : (
            <span className="text-pb-text2 dark:text-gray-400">{before.toFixed(0)}%</span>
          )}
        </span>
      </div>
      <div className="relative mt-0.5 h-1.5 rounded-full bg-slate-200 dark:bg-pb-track-dark overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${unknown ? 'bg-slate-400 dark:bg-slate-500' : over ? 'bg-red-500' : metricColor(shown)}`}
          style={{ width: `${Math.min(100, shown)}%` }}
        />
        {changed && (
          <div className="absolute inset-y-0 w-0.5 bg-slate-700 dark:bg-white/80" style={{ left: `calc(${Math.min(100, before)}% - 1px)` }} title={`Now ${before.toFixed(0)}%`} />
        )}
        {limit != null && (
          <div className="absolute inset-y-0 w-px bg-red-500/70" style={{ left: `${Math.min(100, limit)}%` }} title={`Limit ${limit}%`} />
        )}
      </div>
    </div>
  );
}

/**
 * Merged health digest + predicted impact: health before → after for the
 * current scope (all / remaining / selected suggestions) and one tile per
 * node. A tile turns red when its predicted load crosses the safety limit.
 */
export default function ImpactStrip({ impact, summary, scopeLabel }) {
  if (!impact) return null;
  const { nodes, healthBefore, healthAfter, limits, resimulated } = impact;
  const delta = healthAfter != null && healthBefore != null ? healthAfter - healthBefore : null;
  const overNodes = nodes.filter(n => n.overCpu || n.overMem);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs">
        {summary?.urgency && summary.urgency !== 'none' && summary.urgency_label && (
          <span className={statusBadge(summary.urgency === 'high' ? 'yellow' : summary.urgency === 'medium' ? 'orange' : 'blue')}>
            {summary.urgency_label}
          </span>
        )}
        <span className="font-semibold text-pb-text dark:text-gray-200">{scopeLabel}</span>
        {healthBefore != null && (
          <span className="text-pb-text2 dark:text-gray-400">
            Health {Math.round(healthBefore)} → {healthAfter != null ? Math.round(healthAfter) : '?'}
            {delta != null && delta > 0.05 && (
              <span className="text-green-600 dark:text-green-400 font-medium ml-1">(+{delta.toFixed(1)})</span>
            )}
          </span>
        )}
        {overNodes.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle size={12} /> {overNodes.map(n => n.name).join(', ')} over limit
          </span>
        ) : limits ? (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle size={12} /> Every node stays under its limits
          </span>
        ) : null}
        {!resimulated && (
          <span className="text-amber-600 dark:text-amber-400" title="This recommendation set predates per-move estimates; regenerate to update">
            Showing the estimate for all suggestions
          </span>
        )}
        <span className="text-pb-text2 dark:text-gray-500 ml-auto hidden sm:inline">
          bar = after · tick = now{limits ? ` · red line = limit (CPU ${limits.cpu}%, mem ${limits.mem}%)` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {nodes.map(n => {
          const over = n.overCpu || n.overMem;
          const gDelta = n.after ? n.after.guest_count - n.before.guest_count : 0;
          return (
            <div
              key={n.name}
              data-impact-node={n.name}
              className={over
                ? 'rounded-lg border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 p-3 sm:p-4'
                : INNER_CARD}
            >
              <div className="flex items-baseline justify-between mb-1.5 gap-2">
                <span className="text-sm font-semibold text-pb-text dark:text-gray-100">{n.name}</span>
                <span className="text-[11px] tabular-nums text-pb-text2 dark:text-gray-400 whitespace-nowrap">
                  {gDelta === 0 ? `${n.before.guest_count} guests` : (
                    <>{n.before.guest_count} → <span className={gDelta > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}>{n.after.guest_count}</span> guests</>
                  )}
                </span>
              </div>
              <div className="space-y-1.5">
                <MetricBar label="CPU" before={n.before.cpu} after={n.after ? n.after.cpu : null} limit={limits?.cpu} over={n.overCpu} />
                <MetricBar label="Mem" before={n.before.mem} after={n.after ? n.after.mem : null} limit={limits?.mem} over={n.overMem} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
