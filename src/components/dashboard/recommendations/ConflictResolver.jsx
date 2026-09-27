import { AlertTriangle, CheckCircle, ArrowRight, RotateCcw } from '../../Icons.jsx';
import { BTN_PRIMARY, BTN_SECONDARY, statusBadge } from '../../../utils/designTokens.js';
import { conflictState, vkey } from './planMath.js';

/**
 * One target-node conflict as a what-if panel.
 *
 * Shows the node's load as a stacked bar (today, net of guests leaving it,
 * plus each incoming guest) against its limit. Clicking a guest chip leaves
 * that move out of this run and the bar, the verdict and the impact strip
 * recompute. Offers the smallest set to defer and, when the engine found
 * one, its alternative target as a one-click migrate dialog.
 */
export default function ConflictResolver({
  conflict, summary, recommendations, deferred, onToggleDefer, onDeferMany, onSendElsewhere, canMigrate,
}) {
  const st = conflictState(conflict, summary, deferred);
  const label = st.metric === 'mem' ? 'memory' : 'CPU';
  const deferredHere = st.incoming.filter(g => g.deferred);

  // Engine's alternative target (structured field; no text parsing).
  const altRec = conflict.resolution_action === 'retarget' && conflict.resolution_target
    ? recommendations.find(r => vkey(r.vmid) === vkey(conflict.resolution_vmid))
    : null;
  const altTarget = conflict.resolution_target;

  const scale = Math.max(100, st.total, st.now);
  const pct = v => `${(Math.max(0, v) / scale) * 100}%`;

  return (
    <div
      data-conflict={conflict.target_node}
      className={`mb-4 rounded-xl border p-3 sm:p-4 text-sm ${st.fits
        ? 'border-green-300 dark:border-green-700/50 bg-green-50 dark:bg-green-900/15'
        : 'border-orange-300 dark:border-orange-700/50 bg-orange-50 dark:bg-orange-900/20'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          {st.fits
            ? <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
            : <AlertTriangle size={16} className="shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />}
          <div className="min-w-0">
            <div className="font-semibold text-pb-text dark:text-gray-100">
              {st.fits
                ? `Conflict on ${conflict.target_node} resolved: ${label} lands at ${st.total.toFixed(1)}%`
                : `Target conflict: ${conflict.target_node} would go over its ${label} limit`}
            </div>
            <div className="text-xs text-pb-text2 dark:text-gray-400">
              {st.active.length} of {st.incoming.length} incoming migrations · {label} {st.now.toFixed(0)}% now
              {st.freed >= 0.5 ? ` (−${st.freed.toFixed(1)} from guests leaving)` : ''} → {st.total.toFixed(1)}% · limit {st.limit}%
            </div>
          </div>
        </div>
        <span className={statusBadge(st.fits ? 'green' : 'red')}>
          {st.fits ? `${(st.limit - st.total).toFixed(1)}% headroom` : `Over by ${(st.total - st.limit).toFixed(1)}%`}
        </span>
      </div>

      {/* Stacked load bar: today (net of departures) + each incoming guest, limit marked */}
      <div className="relative h-3 rounded-full bg-slate-200 dark:bg-pb-track-dark overflow-hidden flex" role="img"
        aria-label={`${conflict.target_node} ${label}: ${st.total.toFixed(1)}% of a ${st.limit}% limit`}>
        <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: pct(st.base) }} title={`Before incoming ${st.base.toFixed(1)}%`} />
        {st.active.map(g => (
          <div
            key={g.vmid}
            className={`h-full border-l border-white/70 dark:border-slate-900/60 ${st.fits ? 'bg-green-500 dark:bg-green-500/80' : 'bg-orange-500 dark:bg-orange-500/90'}`}
            style={{ width: pct(g.impact) }}
            title={`${g.name} +${g.impact.toFixed(1)}%`}
          />
        ))}
        <div className="absolute inset-y-0 w-0.5 bg-red-600 dark:bg-red-400" style={{ left: pct(st.limit) }} title={`Limit ${st.limit}%`} />
      </div>
      <div className="relative h-4 text-[10px] text-red-600 dark:text-red-400">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(st.limit) }}>limit {st.limit}%</span>
      </div>

      <div className="text-xs text-pb-text2 dark:text-gray-400 mb-1.5">
        Incoming to {conflict.target_node}. Click a guest to leave it out of this run:
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {st.incoming.map(g => (
          <button
            key={g.vmid}
            onClick={() => onToggleDefer(g.vmid)}
            aria-pressed={g.deferred}
            className={`inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md border text-xs transition-colors ${g.deferred
              ? 'border-dashed border-slate-300 dark:border-slate-600 text-pb-text2 dark:text-gray-500 line-through'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/70 text-pb-text dark:text-gray-200 hover:border-orange-400'}`}
            title={g.deferred ? 'Left out of this run. Click to put it back' : 'Leave this migration out of this run'}
          >
            {g.name}
            <span className={`tabular-nums ${g.deferred ? '' : 'text-orange-600 dark:text-orange-400'}`}>+{g.impact.toFixed(1)}%</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {st.suggestion.length > 0 && (
          <button
            data-suggest-defer
            onClick={() => onDeferMany(st.suggestion.map(g => g.vmid))}
            className={BTN_PRIMARY}
            title="Leave these out of this run; the next generation re-evaluates them"
          >
            Defer {st.suggestion.map(g => g.name).join(', ')}
            <span className="opacity-80 font-normal">→ lands at {st.landsAt.toFixed(1)}%</span>
          </button>
        )}
        {!st.fits && altRec && altTarget && canMigrate && !deferred.has(vkey(altRec.vmid)) && (
          <button
            onClick={() => onSendElsewhere(altRec, altTarget)}
            className={BTN_SECONDARY}
            title="The engine's own resolution: opens the migrate dialog with the alternative target"
          >
            Send {altRec.name} to {altTarget} instead <ArrowRight size={14} />
          </button>
        )}
        {deferredHere.length > 0 && (
          <button
            onClick={() => onDeferMany(deferredHere.map(g => g.vmid), false)}
            className="inline-flex items-center gap-1 text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
          >
            <RotateCcw size={12} /> Restore {deferredHere.length} deferred
          </button>
        )}
      </div>
    </div>
  );
}
