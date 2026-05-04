import { GLASS_CARD, MODAL_OVERLAY, MODAL_CONTAINER, iconBadge, ICON } from '../../utils/designTokens.js';
import { ClipboardList, CheckCircle, ChevronDown, X } from '../Icons.jsx';
import { formatRelativeTime, runStatusLabel } from '../../utils/formatters.js';
import RunDetailBlock, { RunSummaryRow } from './RunDetailBlock.jsx';

const { useState } = React;

const TONE_COLOR = {
  success: 'text-green-600 dark:text-green-400',
  warn:    'text-yellow-600 dark:text-yellow-400',
  error:   'text-red-600 dark:text-red-400',
  info:    'text-blue-600 dark:text-blue-400',
  neutral: 'text-pb-text2 dark:text-gray-400',
};
const TONE_DOT = {
  success: 'bg-green-500',
  warn:    'bg-yellow-400',
  error:   'bg-red-400',
  info:    'bg-blue-400',
  neutral: 'bg-gray-500',
};

function fmtDuration(s) {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-sm text-pb-text2 dark:text-gray-500">
      No run history yet. Once auto-migration executes, runs appear here.
    </div>
  );
}

function HeaderRow({ count }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={iconBadge('green', 'emerald')}>
          <ClipboardList size={ICON.action} className="text-pb-text dark:text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-pb-text dark:text-white">Run History</h3>
          <p className="text-[11px] text-pb-text2 dark:text-gray-500">{count} run{count !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ run, onClose }) {
  if (!run) return null;
  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} max-w-3xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-pb-text dark:text-white">Run details</h3>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <RunDetailBlock run={run} />
      </div>
    </div>
  );
}

/** Result-card layout: prominent last-run summary card, older runs collapse to "Show N more" */
function ResultCardVariant({ runHistory, lastRun }) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);
  const hasLast = lastRun && typeof lastRun === 'object';
  if (!hasLast && (!runHistory || runHistory.length === 0)) return <EmptyState />;
  const olderRuns = runHistory ? runHistory.slice(hasLast ? 1 : 0) : [];

  return (
    <div className="space-y-3">
      {hasLast && (
        <div className="bg-white dark:bg-slate-800/80 border-2 border-slate-700/80 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="text-[11px] text-pb-text2 dark:text-gray-500 uppercase tracking-wider">Last Run</div>
              {(() => {
                const rsl = runStatusLabel(lastRun);
                return (
                  <div className={`text-2xl font-bold ${TONE_COLOR[rsl.tone] || TONE_COLOR.neutral}`}>
                    {rsl.label}
                  </div>
                );
              })()}
              <div className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5">
                {formatRelativeTime(lastRun.timestamp)} · {fmtDuration(lastRun.duration_seconds)} · {lastRun.mode === 'dry_run' ? 'dry run' : 'live'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums text-pb-text dark:text-white">
                {lastRun.migrations_successful || 0}
                <span className="text-lg text-pb-text2 dark:text-gray-500">/{lastRun.migrations_executed || 0}</span>
              </div>
              <div className="text-[11px] text-pb-text2 dark:text-gray-500">migrations succeeded</div>
            </div>
          </div>
          <RunDetailBlock run={lastRun} compact />
        </div>
      )}
      {olderRuns.length > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 flex items-center justify-center gap-2 py-2 rounded border border-pb-border dark:border-slate-700/50 hover:bg-pb-surface2/60 dark:hover:bg-slate-700/30 transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll ? 'Hide' : `Show ${olderRuns.length} previous run${olderRuns.length !== 1 ? 's' : ''}`}
        </button>
      )}
      {showAll && olderRuns.map((r, i) => {
        const rsl = runStatusLabel(r);
        return (
          <button
            key={i}
            onClick={() => setSelected(r)}
            className="w-full text-left bg-pb-surface2 dark:bg-slate-800/40 border border-pb-border dark:border-slate-700/50 rounded p-2 flex items-center gap-2 text-xs hover:bg-pb-surface2/60 dark:hover:bg-slate-700/40 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[rsl.tone] || TONE_DOT.neutral}`} />
            <span className="text-pb-text dark:text-gray-300">{formatRelativeTime(r.timestamp)}</span>
            <span className={`text-[10px] ${TONE_COLOR[rsl.tone] || TONE_COLOR.neutral}`}>{rsl.label}</span>
            <span className="ml-auto text-pb-text2 dark:text-gray-500 tabular-nums">
              {r.migrations_successful || 0}/{r.migrations_executed || 0} · {fmtDuration(r.duration_seconds)} · click for detail
            </span>
          </button>
        );
      })}
      <DetailModal run={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function RunHistoryDisplay({ runHistory, automationStatus, embedded = false }) {
  const lastRun = automationStatus?.state?.last_run;
  const count = runHistory?.length || 0;
  if (embedded) {
    return <ResultCardVariant runHistory={runHistory} lastRun={lastRun} />;
  }
  return (
    <div className={`${GLASS_CARD} overflow-hidden`}>
      <HeaderRow count={count} />
      <ResultCardVariant runHistory={runHistory} lastRun={lastRun} />
    </div>
  );
}
