import { RefreshCw } from '../../../Icons.jsx';
import { statusBadge } from '../../../../utils/designTokens.js';
import { fetchMigrationOutcomes } from '../../../../api/client.js';
import { parseTimestamp } from '../../../../utils/formatters.js';
import {
  outcomeHeadline, headlineText, outcomesSummary, shortDateTime, formatPct,
  cpuChange, barScale, barGeometry, helpedTally,
} from '../../../../utils/automationStory.js';

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

/** Diverging bar around a centre zero line, on the shared scale. */
function DivergingBar({ change, scale, tone }) {
  const g = barGeometry(change, scale);
  return (
    <div className="relative h-3 flex-1 min-w-0">
      <div className="absolute inset-y-[-3px] left-1/2 w-px bg-slate-300 dark:bg-slate-600" />
      {g.side && (
        <div
          className={`absolute top-0 bottom-0 ${TONE_FILL[tone] || TONE_FILL.gray} ${g.side === 'left' ? 'rounded-l' : 'rounded-r'}`}
          style={g.side === 'left'
            ? { right: '50%', width: `${g.pct / 2}%` }
            : { left: '50%', width: `${g.pct / 2}%` }}
        />
      )}
    </div>
  );
}

function OutcomeRow({ o, scale }) {
  const [open, setOpen] = useState(false);
  const h = outcomeHeadline(o);
  const change = cpuChange(h);
  const name = o.guest_name || `${o.guest_type || 'guest'} ${o.vmid}`;
  const when = shortDateTime(o.pre_migration?.timestamp);
  const cpuText = h.before == null && h.after == null
    ? `${h.node} CPU —`
    : `${h.node} CPU ${formatPct(h.before)} → ${formatPct(h.after)}`;
  const aria = `${name} moved ${o.source_node} to ${o.target_node} ${when}: ${headlineText(h)}, ${h.label}`;
  return (
    <li className="border-b border-pb-border/60 dark:border-slate-700/50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full py-1.5 text-left text-xs rounded hover:bg-pb-surface2/60 dark:hover:bg-slate-700/30"
        aria-expanded={open}
        aria-label={aria}
        title={aria}
      >
        {/* What moved, where, when */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-medium text-pb-text dark:text-gray-200 truncate">{name}</span>
          <span className="font-mono text-pb-text2 dark:text-gray-400">{o.source_node} → {o.target_node}</span>
          <span className="text-pb-text2 dark:text-gray-500">{when}</span>
          <span className={`ml-auto ${statusBadge(h.tone)}`}>{h.label}</span>
        </div>
        {/* What it did to the node it left */}
        <div className="mt-1 flex items-center gap-2">
          <DivergingBar change={change} scale={scale} tone={h.tone} />
          <span className="w-32 shrink-0 text-right tabular-nums text-pb-text dark:text-gray-200">{cpuText}</span>
        </div>
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
  const scale = barScale(shown.map(o => cpuChange(outcomeHeadline(o))));

  return (
    <div>
      {shown.length === 0 ? (
        <p className="text-xs text-pb-text2 dark:text-gray-500">No measured moves yet.</p>
      ) : (
        <>
          {tally.total > 0 && (
            <div className="flex items-center gap-3 mb-2" title={outcomesSummary(list.slice(0, 10))}>
              <span className="text-sm font-medium text-pb-text dark:text-gray-200 whitespace-nowrap tabular-nums">Helped {tally.helped} of {tally.total}</span>
              <div className="flex gap-0.5 flex-1 max-w-[12rem]" aria-hidden="true">
                {tally.segments.map((t, i) => <span key={i} className={`h-2 flex-1 rounded-sm ${TONE_FILL[t] || TONE_FILL.gray}`} />)}
              </div>
            </div>
          )}
          <ul>
            {shown.map(o => <OutcomeRow key={o.key} o={o} scale={scale} />)}
          </ul>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-pb-text2 dark:text-gray-500">
            <div className="flex-1 flex justify-between tabular-nums">
              <span>◀ lower CPU (helped)</span>
              <span>higher CPU (worse) ▶</span>
            </div>
            <span className="w-32 shrink-0" />
          </div>
          <p className="text-[10px] text-pb-text2 dark:text-gray-500">Each bar: CPU on the node the guest left, 24 h after the move compared with just before.</p>
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
