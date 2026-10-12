import { ChevronDown } from '../Icons.jsx';
import { fetchRightsizing } from '../../api/client.js';
import { hintText, summaryText } from '../../utils/rightsizing.js';
import { useLoad, Loading, Failed } from './shared.jsx';

const { useState } = React;

const VISIBLE_ROWS = 8;

/** Header line: what the VMs could free. Container limits aren't counted. */
export function RightsizingSummary({ data }) {
  if (!data) return null;
  const s = summaryText(data);
  return (
    <p className="text-sm text-pb-text2 dark:text-gray-400 -mt-2 mb-3">
      {s.lead && <span className="font-semibold text-pb-text dark:text-white">{s.lead}</span>}
      {s.lead && s.rest ? ' ' : ''}
      {s.rest}
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

function Rows({ rows }) {
  return (
    <ul className="divide-y divide-pb-border dark:divide-slate-700/60">
      {rows.map(g => <Row key={g.vmid} g={g} />)}
    </ul>
  );
}

/**
 * Right-sizing — guests whose vCPUs or memory don't match their last week of
 * use, biggest savings first. VMs lead: their allocation is real capacity.
 * Containers sit in a collapsed group, because their cores and memory are
 * limits the host doesn't reserve.
 */
export default function Rightsizing({ state }) {
  const [ownState] = useLoad(() => (state ? Promise.resolve({ success: true }) : fetchRightsizing()));
  const { loading, data, error } = state || ownState;
  const [expanded, setExpanded] = useState(false);
  const [showCts, setShowCts] = useState(false);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Failed error={error} />;
  const rows = data?.guests || [];
  const vms = rows.filter(g => g.kind !== 'ct');
  const cts = rows.filter(g => g.kind === 'ct');
  const shown = expanded ? vms : vms.slice(0, VISIBLE_ROWS);
  const short = data?.totals?.not_enough_history || 0;

  return (
    <div>
      {/* With no VM hints the header line already says so. */}
      {vms.length > 0 && <Rows rows={shown} />}
      {vms.length > VISIBLE_ROWS && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? 'Show fewer' : `Show all ${vms.length}`}
        </button>
      )}

      {cts.length > 0 && (
        <div className={vms.length ? 'mt-3 pt-3 border-t border-pb-border dark:border-slate-700/60' : ''}>
          <button
            onClick={() => setShowCts(s => !s)}
            aria-expanded={showCts}
            className="w-full flex items-center justify-between gap-2 text-sm font-medium text-pb-text dark:text-gray-200 py-1"
          >
            <span>Containers (limits only) · {cts.length}</span>
            <ChevronDown size={16} className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${showCts ? 'rotate-180' : ''}`} />
          </button>
          {showCts && (
            <>
              <p className="text-xs text-pb-text3 dark:text-gray-500 mt-1">
                Container limits aren't reserved on the host; lowering them mostly matters for overcommit accounting.
              </p>
              <Rows rows={cts} />
            </>
          )}
        </div>
      )}

      {short > 0 && (
        <p className="mt-2 text-xs text-pb-text3 dark:text-gray-500">
          {short} guest{short === 1 ? ' has' : 's have'} under {data.min_history_days || 3} days of history and {short === 1 ? 'is' : 'are'} left out.
        </p>
      )}
    </div>
  );
}
