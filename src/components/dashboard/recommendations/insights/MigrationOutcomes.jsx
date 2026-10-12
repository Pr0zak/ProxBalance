import { RefreshCw, ChevronDown, ArrowRight } from '../../../Icons.jsx';
import { statusBadge } from '../../../../utils/designTokens.js';
import { fetchMigrationOutcomes } from '../../../../api/client.js';
import { parseTimestamp } from '../../../../utils/formatters.js';
import { outcomeHeadline, headlineText, outcomesSummary, shortDateTime, formatPct } from '../../../../utils/automationStory.js';

const { useState, useEffect } = React;

const MAX_GAP_MS = 2 * 3600 * 1000;

/**
 * A post snapshot only measures the migration if it was taken near its
 * window. Older records were back-filled weeks later; newer ones carry a
 * `late` flag from the backend.
 */
export function isReliableOutcome(o) {
  const pre = parseTimestamp(o.pre_migration?.timestamp);
  const post5 = o.post_5min || o.post_migration;
  const post = parseTimestamp(post5?.timestamp);
  if (!pre || !post) return false;
  if (post5?.late) return false;
  return post - pre < MAX_GAP_MS;
}

/** Records worth showing: measuring now, or measured on time. Newest first. */
export function usableOutcomes(outcomes) {
  const all = outcomes || [];
  const pending = all.filter(o => o.status?.startsWith('pending_') && (o.status === 'pending_5min' || isReliableOutcome(o)));
  const reliable = all.filter(o => !o.status?.startsWith('pending_') && isReliableOutcome(o));
  return { list: [...pending, ...reliable], excluded: all.length - pending.length - reliable.length };
}

const HEADLINE_TEXT = {
  green: 'text-green-700 dark:text-green-400',
  red: 'text-red-700 dark:text-red-400',
  gray: 'text-pb-text dark:text-gray-200',
  blue: 'text-pb-text dark:text-gray-200',
};

/** Secondary numbers for one move, uncoloured so they never fight the verdict. */
function OutcomeDetail({ o }) {
  const pre = o.pre_migration || {};
  const p5 = o.post_5min || o.post_migration || {};
  const p24 = o.post_24h && !o.post_24h.late ? o.post_24h : null;
  const rows = [
    [`${o.source_node} CPU`, pre.source_node?.cpu, p5.source_node?.cpu, p24?.source_node?.cpu],
    [`${o.source_node} memory`, pre.source_node?.mem, p5.source_node?.mem, p24?.source_node?.mem],
    [`${o.target_node} CPU`, pre.target_node?.cpu, p5.target_node?.cpu, p24?.target_node?.cpu],
  ];
  return (
    <div className="mt-1.5 ml-5 overflow-x-auto">
      <table className="text-[11px] tabular-nums text-pb-text2 dark:text-gray-400">
        <thead>
          <tr className="text-left">
            <th className="font-normal pr-3"></th>
            <th className="font-normal pr-3">before</th>
            <th className="font-normal pr-3">5 min</th>
            <th className="font-normal">24 h</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b, c]) => (
            <tr key={label}>
              <td className="pr-3 text-pb-text dark:text-gray-300 whitespace-nowrap">{label}</td>
              <td className="pr-3">{formatPct(a)}</td>
              <td className="pr-3">{formatPct(b)}</td>
              <td>{formatPct(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-pb-text2 dark:text-gray-500">The verdict follows {o.source_node}'s CPU 24 h after the move.</p>
    </div>
  );
}

function OutcomeRow({ o }) {
  const [open, setOpen] = useState(false);
  const h = outcomeHeadline(o);
  const when = shortDateTime(o.pre_migration?.timestamp);
  const name = o.guest_name || `${o.guest_type || 'guest'} ${o.vmid}`;
  return (
    <li className="py-1.5 text-xs">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 text-left rounded hover:bg-pb-surface2/60 dark:hover:bg-slate-700/30"
        aria-expanded={open}
      >
        <ChevronDown size={12} className={`shrink-0 text-pb-text2 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        <span className="font-medium text-pb-text dark:text-gray-200 truncate max-w-[10rem]">{name}</span>
        <span className="font-mono text-pb-text2 dark:text-gray-400 inline-flex items-center gap-1 shrink-0">
          {o.source_node}<ArrowRight size={10} />{o.target_node}
        </span>
        <span className="text-pb-text2 dark:text-gray-500 shrink-0">{when}</span>
        <span className="basis-full sm:basis-auto sm:ml-auto pl-5 sm:pl-0 flex items-center gap-2">
          <span className={`tabular-nums ${HEADLINE_TEXT[h.tone] || HEADLINE_TEXT.gray}`}>{headlineText(h)}</span>
          <span className={`${statusBadge(h.tone)} shrink-0`}>{h.label}</span>
        </span>
      </button>
      {open && <OutcomeDetail o={o} />}
    </li>
  );
}

/**
 * "Did past moves help?" — a one-line tally, then one row per move with the
 * single number its verdict is based on. Other metrics sit in a row expand.
 */
export default function MigrationOutcomes({ active, limit = 5, onOpenInsights }) {
  const [outcomes, setOutcomes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || outcomes || loading) return;
    setLoading(true);
    (async () => {
      const res = await fetchMigrationOutcomes(null, 50);
      setOutcomes(res.success ? (res.outcomes || []) : []);
      setLoading(false);
    })();
  }, [active]);

  if (loading || !outcomes) {
    return (
      <div className="text-xs text-pb-text2 dark:text-gray-400 py-2 flex items-center gap-2">
        <RefreshCw size={12} className="animate-spin" /> Loading outcomes…
      </div>
    );
  }

  const { list, excluded } = usableOutcomes(outcomes);
  const shown = list.slice(0, limit);
  const summarised = list.slice(0, 10);

  return (
    <div>
      {shown.length === 0 ? (
        <p className="text-xs text-pb-text2 dark:text-gray-500">
          No measured moves yet. Each live move is measured before, 5 minutes after and 24 hours after.
        </p>
      ) : (
        <>
          <p className="text-sm text-pb-text dark:text-gray-200">{outcomesSummary(summarised)}.</p>
          <ul className="mt-1 divide-y divide-pb-border dark:divide-slate-700/50">
            {shown.map(o => <OutcomeRow key={o.key} o={o} />)}
          </ul>
        </>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-pb-text2 dark:text-gray-500">
        {onOpenInsights && (
          <button type="button" onClick={onOpenInsights} className="text-pb-accent dark:text-pb-accent-dark hover:underline">
            All outcomes → Insights
          </button>
        )}
        {excluded > 0 && <span>{excluded} older record{excluded !== 1 ? 's' : ''} not shown: measured too late to count.</span>}
      </div>
    </div>
  );
}
