import { RefreshCw, ChevronDown } from '../../../Icons.jsx';
import { statusBadge } from '../../../../utils/designTokens.js';
import { fetchMigrationOutcomes } from '../../../../api/client.js';
import { parseTimestamp } from '../../../../utils/formatters.js';
import {
  outcomeHeadline, headlineText, outcomesSummary, shortDateTime, formatPct,
  cpuChange, helpedTally,
} from '../../../../utils/automationStory.js';

import useIsMobile from '../../../../utils/useIsMobile.js';

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

// Bar / segment fill per verdict tone. Text never takes these colours.
const TONE_FILL = {
  green: 'bg-emerald-500 dark:bg-emerald-400',
  red: 'bg-red-500 dark:bg-red-400',
  gray: 'bg-slate-300 dark:bg-slate-600',
  blue: 'ring-1 ring-inset ring-slate-400 dark:ring-slate-500',
};

/** Secondary numbers for one move, uncoloured so they never fight the verdict. */
function OutcomeDetail({ o, h }) {
  const pre = o.pre_migration || {};
  const p5 = o.post_5min || o.post_migration || {};
  const p24 = o.post_24h && !o.post_24h.late ? o.post_24h : null;
  const rows = [
    [`${o.source_node} CPU`, pre.source_node?.cpu, p5.source_node?.cpu, p24?.source_node?.cpu],
    [`${o.source_node} memory`, pre.source_node?.mem, p5.source_node?.mem, p24?.source_node?.mem],
    [`${o.target_node} CPU`, pre.target_node?.cpu, p5.target_node?.cpu, p24?.target_node?.cpu],
  ];
  return (
    <div className="mt-1.5 mb-1 ml-1 overflow-x-auto">
      <div className="text-[11px] text-pb-text2 dark:text-gray-400 mb-1">
        <span className="font-mono">{o.source_node} → {o.target_node}</span> · {shortDateTime(o.pre_migration?.timestamp)} · <span className={statusBadge(h.tone)}>{h.label}</span>
      </div>
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
    </div>
  );
}

// Change text colour per verdict (the only colour on the row).
const TONE_TEXT = {
  green: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  gray: 'text-pb-text2 dark:text-gray-400',
  blue: 'text-pb-text2 dark:text-gray-400',
};

/** "▼17" (lower), "▲14" (higher), "±0", or the verdict word when unmeasured. */
function changeText(change, h) {
  if (change == null) return h.label;
  const n = Math.round(Math.abs(change));
  if (n === 0) return '±0';
  return `${change < 0 ? '▼' : '▲'}${n}`;
}

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_7.5rem_4.5rem_6.5rem_3rem] items-center gap-x-3';

function OutcomeRow({ o }) {
  const [open, setOpen] = useState(false);
  const h = outcomeHeadline(o);
  const change = cpuChange(h);
  const name = o.guest_name || `${o.guest_type || 'guest'} ${o.vmid}`;
  const when = shortDateTime(o.pre_migration?.timestamp);
  const day = when.split(',')[0];
  const nums = h.before == null && h.after == null ? '—' : `${formatPct(h.before)} → ${formatPct(h.after)}`;
  const aria = `${name} moved ${o.source_node} to ${o.target_node} ${when}: ${headlineText(h)}, ${h.label}`;
  return (
    <li>
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={aria} title={aria}
        className={`${ROW_GRID} w-full py-1 text-left text-xs rounded hover:bg-pb-surface2/60 dark:hover:bg-slate-700/30`}>
        <span className="min-w-0 truncate">
          <span className="text-pb-text dark:text-gray-200">{name}</span>
          <span className="sm:hidden text-pb-text2 dark:text-gray-500"> · {o.source_node}→{o.target_node} · {day}</span>
        </span>
        <span className="hidden sm:block font-mono text-pb-text2 dark:text-gray-400 truncate">{o.source_node} → {o.target_node}</span>
        <span className="hidden sm:block text-pb-text2 dark:text-gray-500">{day}</span>
        <span className="tabular-nums text-right text-pb-text dark:text-gray-300">{nums}</span>
        <span className={`tabular-nums text-right font-medium ${TONE_TEXT[h.tone] || TONE_TEXT.gray}`}>{changeText(change, h)}</span>
      </button>
      {open && <OutcomeDetail o={o} h={h} />}
    </li>
  );
}

/**
 * "Did past moves help?" — "Helped 8 of 10" with a segment bar, then one
 * diverging bar per recent move: the change in source-node CPU 24 h after
 * the move (left = lower CPU, right = higher), the number the verdict uses.
 */
export default function MigrationOutcomes({ active, limit = 5, onOpenInsights }) {
  const [outcomes, setOutcomes] = useState(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile(640);
  const [rowsOpen, setRowsOpen] = useState(null); // null = default: open on desktop, closed on phones
  const showRows = rowsOpen ?? !isMobile;

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
  const tally = helpedTally(list.slice(0, 10));

  return (
    <div>
      {shown.length === 0 ? (
        <p className="text-xs text-pb-text2 dark:text-gray-500">No measured moves yet.</p>
      ) : (
        <>
          {tally.total > 0 && (
            <button type="button" onClick={() => setRowsOpen(!showRows)} aria-expanded={showRows}
              className="w-full flex items-center gap-3 mb-2 text-left" title={outcomesSummary(list.slice(0, 10))}>
              <span className="text-sm font-medium text-pb-text dark:text-gray-200 whitespace-nowrap tabular-nums">Helped {tally.helped} of {tally.total}</span>
              <div className="flex gap-0.5 flex-1 max-w-[12rem]" aria-hidden="true">
                {tally.segments.map((t, i) => <span key={i} className={`h-2 flex-1 rounded-sm ${TONE_FILL[t] || TONE_FILL.gray}`} />)}
              </div>
              <ChevronDown size={14} className={`ml-auto shrink-0 text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${showRows ? 'rotate-180' : ''}`} />
            </button>
          )}
          {showRows && <>
          <div className={`${ROW_GRID} text-[10px] text-pb-text2 dark:text-gray-500 pb-0.5 border-b border-pb-border dark:border-slate-700/50`}>
            <span>Guest moved</span>
            <span className="hidden sm:block">From → to</span>
            <span className="hidden sm:block">When</span>
            <span className="text-right" title="CPU on the node the guest left: just before the move → 24 h after">Old node CPU</span>
            <span className="text-right">Change</span>
          </div>
          <ul>
            {shown.map(o => <OutcomeRow key={o.key} o={o} />)}
          </ul>
          </>}
        </>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-pb-text2 dark:text-gray-500">
        {onOpenInsights && (
          <button type="button" onClick={onOpenInsights} className="text-pb-accent dark:text-pb-accent-dark hover:underline">
            All outcomes → Insights
          </button>
        )}
        {excluded > 0 && <span>{excluded} older not shown (measured too late).</span>}
      </div>
    </div>
  );
}
