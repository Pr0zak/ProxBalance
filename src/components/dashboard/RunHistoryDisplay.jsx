import { GLASS_CARD, INNER_CARD, iconBadge, ICON } from '../../utils/designTokens.js';
import { ClipboardList, CheckCircle, XCircle, MinusCircle, ChevronDown } from '../Icons.jsx';
import { formatRelativeTime } from '../../utils/formatters.js';

const { useState } = React;

const STATUS_LABEL = {
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  no_action: 'Balanced',
};
const STATUS_COLOR = {
  success: 'text-green-400',
  partial: 'text-yellow-400',
  failed: 'text-red-400',
  no_action: 'text-green-400',
};
const STATUS_DOT = {
  success: 'bg-green-400',
  partial: 'bg-yellow-400',
  failed: 'bg-red-400',
  no_action: 'bg-green-500',
};

function fmtDuration(s) {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-sm text-gray-500">
      No run history yet. Once auto-migration executes, runs appear here.
    </div>
  );
}

function HeaderRow({ count }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={iconBadge('green', 'emerald')}>
          <ClipboardList size={ICON.action} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Run History</h3>
          <p className="text-[11px] text-gray-500">{count} run{count !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}

// ── Variant 1: Timeline strip ──────────────────────────────────────────────
function TimelineVariant({ runHistory }) {
  if (!runHistory || runHistory.length === 0) return <EmptyState />;
  const visible = runHistory.slice(0, 30);
  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {visible.slice().reverse().map((run, i) => (
          <button
            key={i}
            title={`${formatRelativeTime(run.timestamp)} · ${STATUS_LABEL[run.status] || run.status} · ${run.migrations_successful || 0}/${run.migrations_executed || 0} migrations · ${fmtDuration(run.duration_seconds)}`}
            className={`w-3 h-3 rounded-full ${STATUS_DOT[run.status] || 'bg-gray-500'} hover:scale-125 transition-transform shadow`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{formatRelativeTime(visible[visible.length - 1]?.timestamp)}</span>
        <span>now</span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-400">
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />success</span>
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1" />partial</span>
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1" />failed</span>
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />balanced</span>
      </div>
    </div>
  );
}

// ── Variant 2: Two-pane (list + detail) ────────────────────────────────────
function TwoPaneVariant({ runHistory }) {
  if (!runHistory || runHistory.length === 0) return <EmptyState />;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const list = runHistory.slice(0, 15);
  const sel = list[selectedIdx];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {list.map((r, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
              i === selectedIdx ? 'bg-slate-700' : 'hover:bg-slate-700/50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status] || 'bg-gray-500'}`} />
            <span className="text-gray-300 flex-1 truncate">{formatRelativeTime(r.timestamp)}</span>
            <span className="text-[10px] text-gray-500 tabular-nums">{r.migrations_successful || 0}/{r.migrations_executed || 0}</span>
          </button>
        ))}
      </div>
      <div className="md:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
        {sel ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className={`text-base font-bold ${STATUS_COLOR[sel.status]}`}>{STATUS_LABEL[sel.status] || sel.status}</div>
                <div className="text-[11px] text-gray-500">{formatRelativeTime(sel.timestamp)}</div>
              </div>
              <div className="text-xs text-gray-400">
                {sel.mode === 'dry_run' ? 'Dry Run' : 'Live'} · {fmtDuration(sel.duration_seconds)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900/40 rounded p-2"><div className="text-gray-500 text-[10px]">Successful</div><div className="font-bold text-green-400">{sel.migrations_successful || 0}</div></div>
              <div className="bg-slate-900/40 rounded p-2"><div className="text-gray-500 text-[10px]">Executed</div><div className="font-bold text-white">{sel.migrations_executed || 0}</div></div>
              <div className="bg-slate-900/40 rounded p-2"><div className="text-gray-500 text-[10px]">Decisions</div><div className="font-bold text-white">{sel.decisions?.length || 0}</div></div>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500">Select a run</div>
        )}
      </div>
    </div>
  );
}

// ── Variant 3: Result card + collapsed list ────────────────────────────────
function ResultCardVariant({ runHistory, lastRun }) {
  const [showAll, setShowAll] = useState(false);
  const hasLast = lastRun && typeof lastRun === 'object';
  if (!hasLast && (!runHistory || runHistory.length === 0)) return <EmptyState />;
  const olderRuns = runHistory ? runHistory.slice(hasLast ? 1 : 0) : [];

  return (
    <div className="space-y-3">
      {hasLast && (
        <div className="bg-slate-800/80 border-2 border-slate-700/80 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="text-[11px] text-gray-500 uppercase tracking-wider">Last Run</div>
              <div className={`text-2xl font-bold ${STATUS_COLOR[lastRun.status] || 'text-gray-400'}`}>
                {STATUS_LABEL[lastRun.status] || lastRun.status}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(lastRun.timestamp)} · {fmtDuration(lastRun.duration_seconds)} · {lastRun.mode === 'dry_run' ? 'dry run' : 'live'}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums text-white">
                {lastRun.migrations_successful || 0}<span className="text-lg text-gray-500">/{lastRun.migrations_executed || 0}</span>
              </div>
              <div className="text-[11px] text-gray-500">migrations succeeded</div>
            </div>
          </div>
          {lastRun.status === 'no_action' && (
            <div className="flex items-center gap-2 text-xs text-green-300 bg-green-900/20 border border-green-800/40 rounded px-2 py-1.5">
              <CheckCircle size={14} /> Cluster balanced — no action needed.
            </div>
          )}
        </div>
      )}
      {olderRuns.length > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full text-xs text-gray-400 hover:text-gray-200 flex items-center justify-center gap-2 py-2 rounded border border-slate-700/50 hover:bg-slate-700/30 transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll ? 'Hide' : `Show ${olderRuns.length} previous run${olderRuns.length !== 1 ? 's' : ''}`}
        </button>
      )}
      {showAll && olderRuns.map((r, i) => (
        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded p-2 flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status] || 'bg-gray-500'}`} />
          <span className="text-gray-300">{formatRelativeTime(r.timestamp)}</span>
          <span className={`text-[10px] ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status] || r.status}</span>
          <span className="ml-auto text-gray-500 tabular-nums">{r.migrations_successful || 0}/{r.migrations_executed || 0} · {fmtDuration(r.duration_seconds)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Variant 4: Stat + sparkline ────────────────────────────────────────────
function StatSparklineVariant({ runHistory, lastRun }) {
  if (!runHistory || runHistory.length === 0) return <EmptyState />;
  const totalRuns = runHistory.length;
  const totalMigrations = runHistory.reduce((s, r) => s + (r.migrations_successful || 0), 0);
  const successRate = (() => {
    const acted = runHistory.filter(r => (r.migrations_executed || 0) > 0);
    if (acted.length === 0) return null;
    const ok = acted.filter(r => r.status === 'success').length;
    return Math.round((ok / acted.length) * 100);
  })();

  const series = runHistory.slice(0, 30).slice().reverse().map(r => r.migrations_successful || 0);
  const maxV = Math.max(1, ...series);
  const points = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * 100;
    const y = 100 - (v / maxV) * 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className={INNER_CARD}>
          <div className="text-xs text-gray-500">Runs</div>
          <div className="text-2xl font-bold text-white tabular-nums">{totalRuns}</div>
        </div>
        <div className={INNER_CARD}>
          <div className="text-xs text-gray-500">Migrations</div>
          <div className="text-2xl font-bold text-blue-400 tabular-nums">{totalMigrations}</div>
        </div>
        <div className={INNER_CARD}>
          <div className="text-xs text-gray-500">Success rate</div>
          <div className={`text-2xl font-bold tabular-nums ${successRate == null ? 'text-gray-500' : successRate >= 90 ? 'text-green-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
            {successRate == null ? '—' : `${successRate}%`}
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Migrations per run · last {series.length}</span>
          <span>oldest → newest</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12 text-blue-400 opacity-90">
          <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
        </svg>
      </div>
      {lastRun && (
        <div className="text-xs text-gray-400">
          Last run: <span className={STATUS_COLOR[lastRun.status]}>{STATUS_LABEL[lastRun.status] || lastRun.status}</span>
          {' · '}{formatRelativeTime(lastRun.timestamp)}
        </div>
      )}
    </div>
  );
}

const VARIANT_RENDERERS = {
  '1': TimelineVariant,
  '2': TwoPaneVariant,
  '3': ResultCardVariant,
  '4': StatSparklineVariant,
};

export default function RunHistoryDisplay({ variant, runHistory, automationStatus }) {
  const Renderer = VARIANT_RENDERERS[variant];
  if (!Renderer) return null;
  const lastRun = automationStatus?.state?.last_run;
  const count = runHistory?.length || 0;
  return (
    <div className={`${GLASS_CARD} overflow-hidden`}>
      <HeaderRow count={count} />
      <Renderer runHistory={runHistory} lastRun={lastRun} />
    </div>
  );
}
