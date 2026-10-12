import { AlertTriangle, ChevronDown } from '../Icons.jsx';
import { statusBadge } from '../../utils/designTokens.js';
import { decisionSkipLabel } from '../../utils/formatters.js';
import { lastCheckRows, isDryRun, agoText, shortDateTime, whyText } from '../../utils/automationStory.js';

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
  if (d.action === 'filtered' || d.action === 'skipped') return 'held back';
  return d.action || '—';
}
const ACTION_TONE = { executed: 'green', pending: 'blue', failed: 'red', observing: 'purple', deferred: 'yellow', skipped: 'orange', filtered: 'gray' };

/** Full per-guest list, used inside "Details". */
function DecisionsList({ decisions, dry, shown = new Set() }) {
  if (!decisions || decisions.length === 0) return null;
  const order = (d) => (['executed', 'pending', 'failed'].includes(d.action) ? 0 : ['observing', 'deferred'].includes(d.action) ? 1 : d.action === 'skipped' ? 2 : 3);
  const sorted = [...decisions].sort((a, b) => (order(a) - order(b)) || ((a.priority_rank || 999) - (b.priority_rank || 999)));
  return (
    <div>
      <div className="text-[11px] font-semibold text-pb-text2 dark:text-gray-400 mb-1">Scores</div>
      <ul className="divide-y divide-pb-border dark:divide-slate-700/50">
        {sorted.map((d, idx) => {
          const tone = d.action === 'executed' && dry ? 'yellow' : (ACTION_TONE[d.action] || 'gray');
          const why = ['executed', 'pending', 'failed'].includes(d.action) ? whyText(d) : (d.reason || '');
          // Guests already shown in the rows above only add their numbers here.
          if (shown.has(d.name || `guest ${d.vmid}`)) {
            if (d.confidence_score == null && d.target_node_score == null && !d.error) return null;
            return (
              <li key={idx} className="py-1 text-[11px] text-pb-text2 dark:text-gray-500 tabular-nums">
                <span className="text-pb-text dark:text-gray-300">{d.name || `guest ${d.vmid}`}</span>
                {d.confidence_score != null && <> · confidence {d.confidence_score}%</>}
                {d.target_node_score != null && <> · target score {d.target_node_score}</>}
                {d.error && <div className="mt-0.5 text-red-600 dark:text-red-400">Error: {d.error}</div>}
              </li>
            );
          }
          return (
            <li key={idx} className="py-1.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-pb-text dark:text-gray-200">{d.name || `guest ${d.vmid}`}</span>
                {(d.source_node || d.target_node) && (
                  <span className="font-mono text-pb-text2 dark:text-gray-400">{d.source_node || '—'} → {d.target_node || '—'}</span>
                )}
                <span className={statusBadge(tone)}>{d.action === 'failed' ? 'failed' : actionLabel(d, dry)}</span>
                {decisionSkipLabel(d) && <span className={statusBadge('yellow')}>{decisionSkipLabel(d)}</span>}
              </div>
              {why && <div className="mt-0.5 text-pb-text2 dark:text-gray-400">{why}</div>}
              {(d.confidence_score != null || d.target_node_score != null) && (
                <div className="mt-0.5 text-[11px] text-pb-text2 dark:text-gray-500 tabular-nums">
                  {d.confidence_score != null && <>confidence {d.confidence_score}%</>}
                  {d.confidence_score != null && d.target_node_score != null && ' · '}
                  {d.target_node_score != null && <>target score {d.target_node_score}</>}
                  {d.reasoning?.score_improvement != null && <> · improvement +{Number(d.reasoning.score_improvement).toFixed(1)}</>}
                </div>
              )}
              {d.error && <div className="mt-0.5 text-red-600 dark:text-red-400">Error: {d.error}</div>}
            </li>
          );
        })}
      </ul>
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
          <DecisionsList decisions={run.decisions} dry={dry}
            shown={new Set((lastCheckRows(run, ctx) || []).slice(0, 5).map(r => r.name).filter(Boolean))} />
          <ActivityLogList log={run.activity_log} />
        </div>
      )}
    </div>
  );
}
