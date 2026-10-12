import { GLASS_CARD, MODAL_OVERLAY, MODAL_CONTAINER, iconBadge, ICON, statusBadge } from '../../utils/designTokens.js';
import { ClipboardList, ChevronDown, X } from '../Icons.jsx';
import { groupRuns, groupLine, agoText, clockTime } from '../../utils/automationStory.js';
import RunDetailBlock from './RunDetailBlock.jsx';

const { useState } = React;

const PAGE = 10;

export function DetailModal({ run, onClose, ctx }) {
  if (!run) return null;
  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} max-w-3xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-pb-text dark:text-white">Check details</h3>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <RunDetailBlock run={run} ctx={ctx} />
      </div>
    </div>
  );
}

/**
 * "Recent checks": one line per run, newest first, with an outcome chip.
 * Neighbouring runs that read the same ("nothing to do", or skipped for the
 * same reason) collapse into one line. Clicking a single run opens its story.
 */
export function RecentChecks({ runs, ctx: parentCtx = {} }) {
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(null);
  // "opens HH:MM" describes the schedule now, not when an old run was skipped.
  const ctx = { ...parentCtx, opensAt: null };
  const groups = groupRuns(runs || [], ctx);
  if (groups.length === 0) {
    return <div className="text-xs text-pb-text2 dark:text-gray-500 py-2">No checks recorded yet.</div>;
  }
  return (
    <div>
      <ul className="divide-y divide-pb-border dark:divide-slate-700/50">
        {groups.slice(0, shown).map((g, i) => {
          const single = g.count === 1;
          const isOpen = single && open === i;
          const when = single ? agoText(g.newest) : null;
          const chip = g.outcome.kind === 'skipped' ? 'skipped' : g.outcome.chip;
          const row = (
            <>
              <span className={`${statusBadge(g.outcome.tone)} shrink-0`}>{chip}</span>
              <span className="min-w-0 flex-1 text-pb-text dark:text-gray-300 break-words">{groupLine(g, ctx)}</span>
              {when && <span className="shrink-0 text-pb-text2 dark:text-gray-500 tabular-nums" title={clockTime(g.newest)}>{when}</span>}
            </>
          );
          return (
            <li key={`${g.newest}-${i}`} className="py-1.5 text-xs">
              {single ? (
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-start sm:items-center gap-2 text-left rounded hover:bg-pb-surface2/60 dark:hover:bg-slate-700/30"
                  aria-expanded={isOpen}
                >
                  <ChevronDown size={12} className={`mt-1 sm:mt-0 shrink-0 text-pb-text2 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  {row}
                </button>
              ) : (
                <div className="flex items-start sm:items-center gap-2 pl-5">{row}</div>
              )}
              {isOpen && (
                <div className="mt-2 mb-1 ml-5">
                  <RunDetailBlock run={g.runs[0]} compact ctx={ctx} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {groups.length > shown && (
        <button
          type="button"
          onClick={() => setShown(s => s + PAGE)}
          className="mt-1 text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
        >
          Show more ({groups.length - shown})
        </button>
      )}
    </div>
  );
}

export default function RunHistoryDisplay({ runHistory, embedded = false, ctx }) {
  if (embedded) return <RecentChecks runs={runHistory} ctx={ctx} />;
  const count = runHistory?.length || 0;
  return (
    <div className={`${GLASS_CARD} overflow-hidden`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={iconBadge('green', 'emerald')}>
          <ClipboardList size={ICON.action} className="text-pb-text dark:text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-pb-text dark:text-white">Recent checks</h3>
          <p className="text-[11px] text-pb-text2 dark:text-gray-500">{count} check{count !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <RecentChecks runs={runHistory} ctx={ctx} />
    </div>
  );
}
