import { CheckCircle, Eye, ChevronDown } from '../Icons.jsx';
import { formatRelativeTime } from '../../utils/formatters.js';

const { useState } = React;

const STATUS_LABEL = {
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  no_action: 'Cluster Balanced',
};
const STATUS_COLOR = {
  success: 'text-green-400',
  partial: 'text-yellow-400',
  failed: 'text-red-400',
  no_action: 'text-green-400',
};

function fmtDuration(s) {
  if (s == null) return 'N/A';
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const ACTION_BORDER = {
  executed: 'border-green-500',
  failed: 'border-red-500',
  pending: 'border-blue-500',
  observing: 'border-cyan-500',
  deferred: 'border-amber-500',
  skipped: 'border-yellow-500',
  filtered: 'border-gray-400',
};
const ACTION_BADGE = {
  executed: 'bg-slate-800 text-green-400',
  failed: 'bg-slate-800 text-red-400',
  pending: 'bg-slate-800 text-blue-400',
  observing: 'bg-slate-800 text-cyan-400',
  deferred: 'bg-slate-800 text-amber-400',
  skipped: 'bg-slate-800 text-yellow-400',
  filtered: 'bg-slate-800 text-gray-300',
};
const ACTION_ICON = {
  filtered: '⊗', skipped: '⏭', pending: '🔄', executed: '✅', deferred: '🕐', failed: '✗',
};

function DecisionsList({ decisions }) {
  if (!decisions || decisions.length === 0) return null;
  const sorted = [...decisions].sort((a, b) => {
    const order = (d) => {
      if (d.action === 'executed' || d.action === 'pending' || d.action === 'failed') return 0;
      if (d.action === 'observing' || d.action === 'deferred') return 1;
      if (d.action === 'skipped') return 2;
      return 3;
    };
    return (order(a) - order(b)) || ((a.priority_rank || 999) - (b.priority_rank || 999));
  });
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded p-3 max-h-64 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-300 mb-2">Decisions ({decisions.length})</div>
      <div className="space-y-2">
        {sorted.map((d, idx) => (
          <div key={idx} className={`text-xs bg-slate-700/50 rounded p-2 border-l-4 ${ACTION_BORDER[d.action] || 'border-gray-400'}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.priority_rank && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${d.priority_rank === 1 ? 'bg-green-800 text-green-200' : 'bg-gray-600 text-gray-300'}`}>
                      #{d.priority_rank}
                    </span>
                  )}
                  <span className="font-semibold text-white">
                    {d.action === 'observing' ? <Eye size={12} className="inline text-cyan-400 mr-1" /> : (ACTION_ICON[d.action] || '·')}{' '}
                    {d.name || `VM/CT ${d.vmid}`}
                  </span>
                  {d.type && <span className="px-1 py-0 rounded text-[9px] bg-slate-800 text-blue-400">{d.type}</span>}
                </div>
                {(d.source_node || d.target_node) && (
                  <div className="text-gray-400 text-[11px]">
                    {d.source_node || '?'} → {d.target_node || '?'}
                    {d.target_node_score && <span className="text-gray-500"> (score {d.target_node_score})</span>}
                  </div>
                )}
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTION_BADGE[d.action] || 'bg-slate-800 text-gray-400'}`}>
                {d.action}
              </span>
            </div>
            {(d.selected_reason || d.reason) && (
              <div className="mt-1 text-gray-400 text-[11px]">{d.selected_reason || d.reason}</div>
            )}
            {d.confidence_score != null && (
              <div className="mt-1 text-blue-400 text-[10px] font-semibold">Confidence: {d.confidence_score}%</div>
            )}
            {d.reasoning && (
              <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-gray-400">
                {d.reasoning.score_improvement != null && <span>Score: +{Number(d.reasoning.score_improvement).toFixed(1)}</span>}
                {d.reasoning.cost_benefit != null && <span>Cost-benefit: {Number(d.reasoning.cost_benefit).toFixed(1)}x</span>}
                {d.reasoning.observation_count != null && <span>{d.reasoning.observation_count}/{d.reasoning.required_observations} obs</span>}
              </div>
            )}
            {d.error && <div className="mt-1 text-red-400 text-[10px]">Error: {d.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityLogList({ log }) {
  if (!log || log.length === 0) return null;
  const colorFor = (lv) => lv === 'error' ? 'text-red-400' : lv === 'warn' ? 'text-yellow-400' : 'text-gray-400';
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded p-3">
      <div className="text-xs font-semibold text-gray-300 mb-2">Logs ({log.length})</div>
      <div className="font-mono text-[11px] space-y-0.5 max-h-48 overflow-y-auto">
        {log.map((entry, i) => {
          const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          return (
            <div key={i} className="flex gap-2">
              {ts && <span className="text-gray-600 shrink-0">{ts}</span>}
              <span className={`uppercase shrink-0 ${colorFor(entry.level)}`}>{(entry.level || 'info').padEnd(5)}</span>
              <span className="text-gray-300 break-words">{entry.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SafetyChecksList({ safety }) {
  if (!safety || Object.keys(safety).length === 0) return null;
  const rows = [];
  if (safety.migration_window) rows.push({ k: 'Migration Window', v: safety.migration_window });
  if (safety.cluster_health) rows.push({ k: 'Cluster Health', v: safety.cluster_health });
  if (safety.running_migrations != null) rows.push({ k: 'Running Migrations', v: safety.running_migrations });
  if (rows.length === 0) return null;
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded p-3">
      <div className="text-xs font-semibold text-gray-300 mb-2">Safety Checks</div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <CheckCircle size={12} className="text-green-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-300">{r.k}</div>
              <div className="text-gray-400 text-[11px] break-words">{String(r.v)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable run-detail block — shows everything the existing Last Run Summary
 * shows: status header, counts (X/Y), duration, mode, balanced banner,
 * decisions list, safety checks. Used by all RunHistoryDisplay variants.
 */
export default function RunDetailBlock({ run, compact = false }) {
  if (!run) return <div className="text-sm text-gray-500 italic p-4">No run selected.</div>;
  const status = run.status;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-800/60 rounded p-2 border border-slate-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Status</div>
          <div className={`text-sm font-bold ${STATUS_COLOR[status] || 'text-gray-400'}`}>{STATUS_LABEL[status] || status}</div>
        </div>
        <div className="bg-slate-800/60 rounded p-2 border border-slate-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Migrations</div>
          <div className="text-sm font-bold text-white tabular-nums">
            {run.migrations_successful || 0}<span className="text-gray-500"> / {run.migrations_executed || 0}</span>
          </div>
        </div>
        <div className="bg-slate-800/60 rounded p-2 border border-slate-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Duration</div>
          <div className="text-sm font-bold text-white">{fmtDuration(run.duration_seconds)}</div>
        </div>
        <div className="bg-slate-800/60 rounded p-2 border border-slate-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Mode</div>
          <div className="text-sm font-bold text-white">{run.mode === 'dry_run' ? 'Dry Run' : 'Live'}</div>
        </div>
      </div>
      {run.timestamp && (
        <div className="text-[11px] text-gray-500">{formatRelativeTime(run.timestamp)}</div>
      )}
      {status === 'no_action' && (
        <div className="flex items-center gap-2 text-xs text-green-300 bg-green-900/20 border border-green-800/40 rounded px-3 py-2">
          <CheckCircle size={14} className="shrink-0" /> Cluster balanced — no action needed.
        </div>
      )}
      <DecisionsList decisions={run.decisions} />
      <ActivityLogList log={run.activity_log} />
      {!compact && <SafetyChecksList safety={run.safety_checks} />}
    </div>
  );
}

/**
 * Simple-by-default summary row with click-to-expand for full RunDetailBlock.
 * Used wherever a "last run" or "recent run" is shown alongside other content.
 */
const STATUS_DOT_LOCAL = {
  success: 'bg-green-400',
  partial: 'bg-yellow-400',
  failed: 'bg-red-400',
  no_action: 'bg-green-500',
};

export function RunSummaryRow({ run, defaultExpanded = false, label = 'Last run' }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!run) return null;
  const status = run.status;
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/30 transition-colors flex-wrap"
      >
        <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : '-rotate-90'}`} />
        <span className="text-[11px] uppercase tracking-wider text-gray-500 shrink-0">{label}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_LOCAL[status] || 'bg-gray-500'}`} />
        <span className={`text-sm font-semibold ${STATUS_COLOR[status] || 'text-gray-400'}`}>
          {STATUS_LABEL[status] || status}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          · {run.migrations_successful || 0}/{run.migrations_executed || 0} migrations
        </span>
        <span className="text-xs text-gray-500 tabular-nums">· {fmtDuration(run.duration_seconds)}</span>
        {run.timestamp && (
          <span className="text-xs text-gray-500 ml-auto">{formatRelativeTime(run.timestamp)}</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/40">
          <RunDetailBlock run={run} />
        </div>
      )}
    </div>
  );
}
