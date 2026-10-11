import { AlertTriangle } from '../../Icons.jsx';
import { BTN_SECONDARY } from '../../../utils/designTokens.js';

/**
 * Warns that the plan about to run sends more migrations into one node than
 * automation's per-node inflow cap (rules.max_target_inflow_per_cycle)
 * allows in a run. Manual plans are not blocked by the cap, the same as
 * max_migrations_per_run; the button leaves the extra moves out of this run
 * (they come back with the next generation).
 *
 * @param over         entries from planMath.inflowOverCap()
 * @param cap          the configured cap
 * @param scoped       true when the plan is the user's selection
 * @param onDeferMany  (vmids, on=true) => void
 */
export default function InflowCapWarning({ over, cap, scoped, onDeferMany }) {
  const extra = over.flatMap(o => o.extra);
  return (
    <div
      data-inflow-cap
      className="mb-4 rounded-xl border p-3 sm:p-4 text-sm border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-pb-text dark:text-gray-100">
            {scoped ? 'The selection sends' : 'This plan sends'} more than {cap} migration{cap === 1 ? '' : 's'} into one node
          </div>
          <div className="text-xs text-pb-text2 dark:text-gray-400 mb-2">
            Automation would spread these over several runs (max {cap} into one node per run). A manual run is not limited, but you can leave the extra moves out.
          </div>
          <ul className="space-y-1 mb-3 text-xs">
            {over.map(o => (
              <li key={o.target} className="text-pb-text dark:text-gray-200">
                <span className="font-semibold">{o.target}</span>: {o.total} incoming
                <span className="text-pb-text2 dark:text-gray-400"> · extra: {o.extra.map(s => s.name || s.vmid).join(', ')}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onDeferMany(extra.map(s => s.vmid))}
            className={BTN_SECONDARY}
            title="Leave these out of this run; the next generation re-evaluates them"
          >
            Leave out {extra.length} extra move{extra.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
