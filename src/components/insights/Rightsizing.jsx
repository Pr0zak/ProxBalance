import { CheckCircle } from '../Icons.jsx';
import { fetchRightsizing } from '../../api/client.js';
import { hintText, totalsText } from '../../utils/rightsizing.js';
import { useLoad, Loading, Failed } from './shared.jsx';

const { useState } = React;

const VISIBLE_ROWS = 8;

/** Header line: "could free 9 vCPUs and 14 GB" plus how many guests that is. */
export function RightsizingSummary({ data }) {
  if (!data) return null;
  const t = data.totals || {};
  const free = totalsText(t);
  const n = t.guests_with_hints || 0;
  return (
    <p className="text-sm text-pb-text2 dark:text-gray-400 -mt-2 mb-3">
      {n === 0
        ? `Every guest with ${data.min_history_days || 3}+ days of history fits its allocation.`
        : <>
          {free ? <><span className="font-semibold text-pb-text dark:text-white">{free[0].toUpperCase() + free.slice(1)}</span>{' across '}</> : ''}
          {n} guest{n === 1 ? '' : 's'}, from the last {data.window_days || 7} days of use.
        </>}
    </p>
  );
}

function Row({ g }) {
  return (
    <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 text-sm">
      <div className="sm:w-56 shrink-0 min-w-0 truncate">
        <span className="font-medium text-pb-text dark:text-white">{g.name}</span>
        <span className="text-pb-text3 dark:text-gray-500"> · {g.node || '—'}</span>
        {g.ignored && <span className="text-pb-text3 dark:text-gray-500" title="Tagged ignore: ProxBalance won't migrate it, but the sizing hint still applies"> · ignore</span>}
      </div>
      <div className="min-w-0 text-pb-text2 dark:text-gray-300 tabular-nums">
        {g.hints.map((h, i) => (
          // One hint per line on phones; side by side, never broken inside, from sm up.
          <span key={i} className={`block sm:inline sm:whitespace-nowrap ${h.kind === 'stopped' ? 'text-pb-text3 dark:text-gray-500' : ''}`}>
            {i > 0 && <span className="hidden sm:inline text-pb-text3 dark:text-gray-500"> · </span>}
            {hintText(h)}
          </span>
        ))}
      </div>
    </li>
  );
}

/**
 * Right-sizing — guests whose vCPUs or memory don't match their last week of
 * use, biggest savings first. Only the history ProxBalance already stores;
 * guests with no samples or under 3 days of them get no line.
 */
export default function Rightsizing({ state }) {
  const [ownState] = useLoad(() => (state ? Promise.resolve({ success: true }) : fetchRightsizing()));
  const { loading, data, error } = state || ownState;
  const [expanded, setExpanded] = useState(false);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Failed error={error} />;
  const rows = data?.guests || [];
  const t = data?.totals || {};
  const shown = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const short = t.not_enough_history || 0;

  return (
    <div>
      {rows.length === 0 ? (
        <div className="flex items-start gap-2 text-sm text-pb-text2 dark:text-gray-400">
          <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
          <span>No guest is oversized for what it used over the last {data?.window_days || 7} days.</span>
        </div>
      ) : (
        <ul className="divide-y divide-pb-border dark:divide-slate-700/60">
          {shown.map(g => <Row key={g.vmid} g={g} />)}
        </ul>
      )}
      {rows.length > VISIBLE_ROWS && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
      {short > 0 && (
        <p className="mt-2 text-xs text-pb-text3 dark:text-gray-500">
          {short} guest{short === 1 ? ' has' : 's have'} under {data.min_history_days || 3} days of history and {short === 1 ? 'is' : 'are'} left out.
        </p>
      )}
    </div>
  );
}
