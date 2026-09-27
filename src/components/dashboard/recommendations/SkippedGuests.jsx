import { ChevronDown } from '../../Icons.jsx';
import { skipReasonLabel, skipToneClass } from '../recsHelpers.js';

const { useState, useMemo } = React;

/**
 * "Why weren't these guests recommended?" — guests grouped by skip reason.
 * Each reason is a pill with a count; clicking it lists the guests (the
 * engine's per-guest detail is on hover). Biggest groups first.
 */
export default function SkippedGuests({
  recommendationData, penaltyConfig, collapsedSections, setCollapsedSections
}) {
  const skipped = recommendationData?.skipped_guests || [];
  const [openReason, setOpenReason] = useState(null);

  const groups = useMemo(() => {
    const by = {};
    for (const g of skipped) (by[g.reason] = by[g.reason] || []).push(g);
    return Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  }, [skipped]);

  if (!skipped.length) return null;
  const collapsed = collapsedSections.skippedGuests;
  const active = groups.find(([r]) => r === openReason);

  return (
    <div className="mt-4 border-t border-pb-border dark:border-slate-700/50 pt-3">
      <button
        onClick={() => setCollapsedSections(prev => ({ ...prev, skippedGuests: !prev.skippedGuests }))}
        className="flex items-center gap-2 text-sm text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-300 transition-colors"
      >
        <ChevronDown size={16} className={`transition-transform duration-200 ${!collapsed ? 'rotate-180' : ''}`} />
        <span className="font-medium">Not recommended · {skipped.length} guests</span>
      </button>
      {!collapsed && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {groups.map(([reason, list]) => (
              <button
                key={reason}
                onClick={() => setOpenReason(openReason === reason ? null : reason)}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-shadow ${skipToneClass(reason)} ${openReason === reason ? 'ring-2 ring-blue-500/60' : 'hover:shadow'}`}
              >
                {skipReasonLabel(reason)} <span className="tabular-nums opacity-70">{list.length}</span>
              </button>
            ))}
          </div>
          {active && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {active[1].map(g => (
                <span
                  key={`${g.vmid}`}
                  title={g.detail}
                  className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md bg-pb-surface2 dark:bg-slate-800/70 border border-pb-border dark:border-slate-700 text-xs cursor-help"
                >
                  <span className="text-pb-text dark:text-gray-200">{g.name}</span>
                  <span className="text-pb-text3 dark:text-gray-500 tabular-nums">{g.vmid}</span>
                  <span className="text-pb-text3 dark:text-gray-500">· {g.node}</span>
                  {g.score_improvement !== undefined && (
                    <span className="text-yellow-600 dark:text-yellow-400 tabular-nums">
                      +{g.score_improvement}/{penaltyConfig?.min_score_improvement || 15} pts
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          {active && active[1][0]?.detail && new Set(active[1].map(g => g.detail)).size === 1 && (
            <p className="mt-1.5 text-xs text-pb-text2 dark:text-gray-400">{active[1][0].detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
