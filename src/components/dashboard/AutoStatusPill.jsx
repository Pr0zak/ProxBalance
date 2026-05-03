import { Clock, Pause, Play, Loader, Settings, ChevronDown } from '../Icons.jsx';
import { RunSummaryRow } from './RunDetailBlock.jsx';
import RunHistoryDisplay from './RunHistoryDisplay.jsx';
import MigrationOutcomes from './recommendations/insights/MigrationOutcomes.jsx';

const { useState, useEffect } = React;

/**
 * Reusable auto-migration status indicator. Three sizes:
 *  - 'pill'   : compact inline strip (TopNav-style)
 *  - 'banner' : full horizontal bar with controls + expandable last-run detail
 *  - 'card'   : KPI-card-shaped (KpiRow)
 *  - 'strip'  : medium horizontal strip
 */

function getStatus(automationStatus) {
  if (!automationStatus) return { label: 'Unknown', color: 'gray', dotColor: 'bg-gray-500' };
  if (!automationStatus.enabled) return { label: 'Off', color: 'gray', dotColor: 'bg-gray-500' };
  if (automationStatus.dry_run) return { label: 'Dry-Run', color: 'yellow', dotColor: 'bg-yellow-400' };
  if (!automationStatus.timer_active) return { label: 'Paused', color: 'orange', dotColor: 'bg-orange-400' };
  return { label: 'Active', color: 'green', dotColor: 'bg-green-400' };
}

function getNextCheck(automationStatus) {
  if (!automationStatus?.next_check) {
    if (automationStatus?.check_interval_minutes) return `every ${automationStatus.check_interval_minutes}m`;
    return null;
  }
  const ts = automationStatus.next_check.endsWith?.('Z') ? automationStatus.next_check : automationStatus.next_check + 'Z';
  const diffMins = Math.floor((new Date(ts) - new Date()) / 60000);
  if (diffMins > 0) return `${diffMins}m`;
  return 'now';
}

function relativeAgo(ts) {
  if (!ts) return null;
  const tsStr = typeof ts === 'object' ? ts.timestamp : ts;
  const d = new Date(tsStr);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

async function togglePause(automationStatus, fetchAutomationStatus) {
  if (!automationStatus?.enabled) return;
  try {
    const r = await fetch('/api/automigrate/toggle-timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !automationStatus.timer_active }),
    });
    if (r.ok) fetchAutomationStatus?.();
  } catch (e) { /* no-op */ }
}

const COLOR_TO_TEXT = { green: 'text-green-600 dark:text-green-400', yellow: 'text-yellow-600 dark:text-yellow-400', orange: 'text-orange-600 dark:text-orange-400', gray: 'text-pb-text2 dark:text-gray-400' };
const COLOR_TO_BG = {
  green: 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/40',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/15 border-yellow-200 dark:border-yellow-800/40',
  orange: 'bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800/40',
  gray: 'bg-white dark:bg-slate-800/60 border-pb-border dark:border-slate-700/50',
};

export default function AutoStatusPill({
  size = 'pill',
  automationStatus,
  fetchAutomationStatus,
  runAutomationNow,
  runningAutomation,
  setCurrentPage,
  runHistory,
  API_BASE,
}) {
  const lastRun = automationStatus?.state?.last_run;
  const lastRunObj = lastRun && typeof lastRun === 'object' ? lastRun : null;

  // Banner-only: persisted expand/collapse state for last-run detail
  const [expanded, setExpanded] = useState(() => {
    if (size !== 'banner') return false;
    return localStorage.getItem('autoBannerExpanded') === 'true';
  });
  useEffect(() => {
    if (size === 'banner') localStorage.setItem('autoBannerExpanded', String(expanded));
  }, [expanded, size]);

  if (!automationStatus) return null;
  const status = getStatus(automationStatus);
  const nextCheck = getNextCheck(automationStatus);
  const showActions = (size === 'banner' || size === 'card' || size === 'strip') && automationStatus.enabled;
  const canExpand = size === 'banner' && lastRunObj;

  if (size === 'pill') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800/80 border border-pb-border dark:border-slate-700/50 text-xs">
        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
        <span className={`font-medium ${COLOR_TO_TEXT[status.color]}`}>Auto: {status.label}</span>
        {nextCheck && <span className="text-pb-text2 dark:text-gray-500">· next {nextCheck}</span>}
      </div>
    );
  }

  if (size === 'card') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-pb-border dark:border-slate-700/50">
        <Clock size={18} className={COLOR_TO_TEXT[status.color]} />
        <div className="min-w-0">
          <div className={`text-xl font-bold ${COLOR_TO_TEXT[status.color]} tabular-nums`}>{status.label}</div>
          <div className="text-xs text-pb-text2 dark:text-gray-500 truncate">Auto-migration</div>
          {nextCheck && (
            <div className="text-[10px] text-pb-text2 dark:text-gray-600 truncate">next {nextCheck}</div>
          )}
        </div>
      </div>
    );
  }

  // banner OR strip
  return (
    <div className={`rounded-lg border ${COLOR_TO_BG[status.color]}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-2">
        <div className="flex items-center gap-2 text-sm flex-wrap min-w-0">
          {canExpand && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-0.5 rounded hover:bg-pb-surface2 dark:hover:bg-slate-700/50 transition-colors"
              title={expanded ? 'Hide last-run detail' : 'Show last-run detail'}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronDown size={14} className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : '-rotate-90'}`} />
            </button>
          )}
          <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
          <span className={`font-medium ${COLOR_TO_TEXT[status.color]}`}>Auto-migration: {status.label}</span>
          {nextCheck && <span className="text-pb-text2 dark:text-gray-400 text-xs">next check {nextCheck}</span>}
          {lastRun && (
            <span className="text-pb-text2 dark:text-gray-500 text-xs">· last run {relativeAgo(lastRun)}</span>
          )}
        </div>
        {showActions && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => togglePause(automationStatus, fetchAutomationStatus)}
              className="px-2.5 py-1 text-xs rounded border bg-white dark:bg-slate-800/60 border-pb-border dark:border-slate-700/50 text-pb-text dark:text-gray-200 hover:bg-pb-surface2 dark:hover:bg-slate-700/60 inline-flex items-center gap-1"
              title={automationStatus.timer_active ? 'Pause auto-migration timer' : 'Resume auto-migration timer'}
            >
              {automationStatus.timer_active ? <Pause size={12} /> : <Play size={12} />}
              {automationStatus.timer_active ? 'Pause' : 'Resume'}
            </button>
            {runAutomationNow && (
              <button
                onClick={() => runAutomationNow()}
                disabled={runningAutomation}
                className="px-2.5 py-1 text-xs rounded border bg-blue-600 border-blue-500 text-pb-text dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 disabled:bg-gray-600 inline-flex items-center gap-1"
                title="Trigger an automation run now"
              >
                {runningAutomation ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                Run Now
              </button>
            )}
            {setCurrentPage && (
              <button
                onClick={() => setCurrentPage('automation')}
                className="px-2.5 py-1 text-xs rounded border bg-white dark:bg-slate-800/60 border-pb-border dark:border-slate-700/50 text-pb-text dark:text-gray-300 hover:bg-pb-surface2 dark:hover:bg-slate-700/60 inline-flex items-center gap-1"
                title="Open automation settings"
              >
                <Settings size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {canExpand && expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-pb-border dark:border-slate-700/40 space-y-4">
          <RunSummaryRow run={lastRunObj} label="Last run" />
          {runHistory && runHistory.length > 0 && (
            <div>
              <div className="text-xs text-pb-text2 dark:text-gray-500 mb-2 uppercase tracking-wider">Run history</div>
              <RunHistoryDisplay
                embedded
                runHistory={runHistory}
                automationStatus={automationStatus}
              />
            </div>
          )}
          {API_BASE && (
            <div>
              <div className="text-xs text-pb-text2 dark:text-gray-500 mb-2 uppercase tracking-wider">Migration outcomes — predicted vs actual</div>
              <MigrationOutcomes API_BASE={API_BASE} active={expanded} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
