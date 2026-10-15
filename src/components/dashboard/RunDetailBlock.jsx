import { AlertTriangle, ChevronDown } from '../Icons.jsx';
import { statusBadge } from '../../utils/designTokens.js';
import { lastCheckRows, isDryRun, agoText, shortDateTime, observationProgress, heldKey, queuedChip } from '../../utils/automationStory.js';

const { useState } = React;

function fmtDuration(s) {
  if (s == null) return '—';
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** What a decision's action means, worded for the run's mode. */
function actionLabel(d, dry) {
  if (d.action === 'executed') return dry ? 'dry run' : 'moved';
  if (d.action === 'pending') return dry ? 'dry run' : 'moving';
  if (d.action === 'observing') return 'waiting';
  if (d.action === 'queued') return queuedChip(dry);
  if (d.action === 'filtered' || d.action === 'skipped') return 'held back';
  return d.action || '—';
}

/** Result of one decision as plain words for the Details table. */
function resultText(d, dry) {
  if (d.action === 'failed') return 'failed';
  if (d.action === 'observing') {
    const p = observationProgress(d);
    return p ? `waiting ${p.seen}/${p.need}` : 'waiting';
  }
  if (d.action === 'filtered' || d.action === 'skipped' || d.action === 'deferred') {
    // Short forms for the table; the row above the table says why.
    const k = heldKey(d);
    if (k.startsWith('waiting their turn')) return 'next in line';
    if (k.startsWith('held by the per-node limit')) return 'node limit, next check';
    return `held: ${k}`;
  }
  return actionLabel(d, dry);
}

/**
 * Every guest the run looked at, one compact line each, in the same
 * format: guest, route, result, confidence, target score. Used inside
 * "Details"; the rows above it already tell the story.
 */
function DecisionsList({ decisions, dry }) {
  if (!decisions || decisions.length === 0) return null;
  const order = (d) => (['executed', 'pending', 'failed'].includes(d.action) ? 0 : ['queued', 'observing'].includes(d.action) ? 1 : 2);
  const sorted = [...decisions].sort((a, b) => (order(a) - order(b)) || ((a.priority_rank || 999) - (b.priority_rank || 999)));
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] tabular-nums">
        <thead>
          <tr className="text-left text-pb-text2 dark:text-gray-500">
            <th className="font-normal pr-3 pb-0.5">Guest</th>
            <th className="font-normal pr-3 pb-0.5">From → to</th>
            <th className="font-normal pr-3 pb-0.5">Result</th>
            <th className="font-normal pr-3 pb-0.5 text-right">Confidence</th>
            <th className="font-normal pb-0.5 text-right" title="Lower is better">Target score</th>
          </tr>
        </thead>
        <tbody className="text-pb-text2 dark:text-gray-400">
          {sorted.map((d, idx) => (
            <tr key={idx} className="align-top">
              <td className="pr-3 py-0.5 text-pb-text dark:text-gray-300 whitespace-nowrap">{d.name || `guest ${d.vmid}`}</td>
              <td className="pr-3 py-0.5 font-mono whitespace-nowrap">{d.source_node || '—'} → {d.target_node || '—'}</td>
              <td className="pr-3 py-0.5 whitespace-nowrap">
                {resultText(d, dry)}
                {d.error && <div className="text-red-600 dark:text-red-400">Error: {d.error}</div>}
              </td>
              <td className="pr-3 py-0.5 text-right">{d.confidence_score != null ? `${Math.round(d.confidence_score)}%` : '—'}</td>
              <td className="py-0.5 text-right">{d.target_node_score != null ? Number(d.target_node_score).toFixed(1) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityLogList({ log }) {
  if (!log || log.length === 0) return null;
  const colorFor = (lv) => lv === 'error' ? 'text-red-600 dark:text-red-400' : lv === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 'text-pb-text2 dark:text-gray-400';
  return (
    <div>
      <div className="text-[11px] font-semibold text-pb-text2 dark:text-gray-400 mb-1">Log ({log.length})</div>
      <div className="font-mono text-[11px] space-y-0.5 max-h-48 overflow-y-auto">
        {log.map((entry, i) => {
          const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          return (
            <div key={i} className="flex gap-2">
              {ts && <span className="text-pb-text2 dark:text-gray-600 shrink-0">{ts}</span>}
              <span className={`uppercase shrink-0 ${colorFor(entry.level)}`}>{(entry.level || 'info').padEnd(5)}</span>
              <span className="text-pb-text dark:text-gray-300 break-words min-w-0">{entry.message || [entry.name, entry.reason].filter(Boolean).join(': ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Only the safety checks that failed; nothing when all passed. */
function FailedSafetyChecks({ safety }) {
  if (!safety) return null;
  const rows = [];
  if (safety.migration_window && /^outside|^not in|blackout/i.test(safety.migration_window)) rows.push(['Schedule', safety.migration_window]);
  if (safety.cluster_health && !/passed|disabled|^unknown$/i.test(safety.cluster_health)) rows.push(['Cluster health', safety.cluster_health]);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2 text-xs">
          <AlertTriangle size={12} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <span className="text-pb-text dark:text-gray-300 shrink-0">{k}:</span>
          <span className="text-pb-text2 dark:text-gray-400 break-words min-w-0">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

/** Progress pips: filled = checks the guest has been suggested in a row. */
export function Pips({ seen, need }) {
  if (!need) return null;
  const label = `${seen} of ${need} checks`;
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={`Suggested ${label} in a row`}>
      {need <= 10 && (
        <span className="inline-flex gap-0.5" aria-hidden="true">
          {Array.from({ length: need }, (_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i < seen
                ? 'bg-violet-500 dark:bg-violet-400'
                : 'border border-violet-400 dark:border-violet-500'}`}
            />
          ))}
        </span>
      )}
      <span className="text-[11px] tabular-nums text-pb-text2 dark:text-gray-400">{label}</span>
    </span>
  );
}

/**
 * One row per guest worth mentioning: name, route, progress pips, outcome
 * chip and a short reason. Nothing-to-do runs render nothing.
 */
export function GuestRows({ run, ctx = {}, headerChip = null }) {
  const rows = lastCheckRows(run, ctx);
  if (!rows) return null; // the outcome chip beside it already says "nothing to do"
  const shown = rows.slice(0, 5);
  return (
    <ul className="space-y-1.5">
      {shown.map((r, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs min-w-0">
          {r.chip !== headerChip && <span className={`${statusBadge(r.tone)} shrink-0`} title={r.title || undefined}>{r.chip}</span>}
          {r.name && <span className="font-medium text-pb-text dark:text-gray-200">{r.name}</span>}
          {r.route && <span className="font-mono text-pb-text2 dark:text-gray-400">{r.route}</span>}
          {r.pips && <Pips seen={r.pips.seen} need={r.pips.need} />}
          {r.why && <span className="text-pb-text2 dark:text-gray-400 min-w-0 break-words">{r.why}</span>}
        </li>
      ))}
      {rows.length > shown.length && <li className="text-[11px] text-pb-text2 dark:text-gray-500">+{rows.length - shown.length} more in Details</li>}
    </ul>
  );
}

/**
 * One run: guest rows first; duration, confidence, scores and the log
 * inside a "Details" toggle. `compact` starts with Details closed
 * (dashboard); the modal opens it.
 */
export default function RunDetailBlock({ run, compact = false, ctx = {}, headerChip = null, showTime = true }) {
  const [showDetails, setShowDetails] = useState(!compact);
  if (!run) return <div className="text-sm text-pb-text2 dark:text-gray-500 italic p-4">No run selected.</div>;
  const dry = isDryRun(run);
  const meta = [
    showTime && run.timestamp && `${shortDateTime(run.timestamp)} (${agoText(run.timestamp)})`,
    `took ${fmtDuration(run.duration_seconds)}`,
    run.mode === 'dry_run' ? 'dry run' : run.mode === 'live' ? 'live' : null,
    run.migrations_executed > 0 && `${run.migrations_successful ?? 0} of ${run.migrations_executed} ${dry ? 'logged' : 'moves succeeded'}`,
  ].filter(Boolean).join(' · ');
  return (
    <div className="space-y-2">
      <GuestRows run={run} ctx={ctx} headerChip={headerChip} />
      <FailedSafetyChecks safety={run.safety_checks} />
      <button
        type="button"
        onClick={() => setShowDetails(v => !v)}
        className="inline-flex items-center gap-1 text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
        aria-expanded={showDetails}
      >
        <ChevronDown size={12} className={`transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
        Details
      </button>
      {showDetails && (
        <div className="space-y-3 pl-4 border-l-2 border-pb-border dark:border-slate-700/60">
          <div className="text-xs text-pb-text2 dark:text-gray-400 tabular-nums">{meta}</div>
          <DecisionsList decisions={run.decisions} dry={dry} />
          <ActivityLogList log={run.activity_log} />
        </div>
      )}
    </div>
  );
}
