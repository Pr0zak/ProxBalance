import { Clock, Pause, Play, Loader, Settings } from '../Icons.jsx';

/**
 * Reusable auto-migration status indicator. Three sizes:
 *  - 'pill'   : compact inline strip (TopNav-style)
 *  - 'banner' : full horizontal bar with controls (above ClusterSection)
 *  - 'card'   : KPI-card-shaped (KpiRow)
 *  - 'strip'  : medium horizontal strip (inside Recs tab)
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

const COLOR_TO_TEXT = { green: 'text-green-400', yellow: 'text-yellow-400', orange: 'text-orange-400', gray: 'text-gray-400' };

export default function AutoStatusPill({
  size = 'pill',
  automationStatus,
  fetchAutomationStatus,
  runAutomationNow,
  runningAutomation,
  setCurrentPage,
}) {
  if (!automationStatus) return null;
  const status = getStatus(automationStatus);
  const nextCheck = getNextCheck(automationStatus);
  const showActions = (size === 'banner' || size === 'card' || size === 'strip') && automationStatus.enabled;

  if (size === 'pill') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs">
        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
        <span className={`font-medium ${COLOR_TO_TEXT[status.color]}`}>Auto: {status.label}</span>
        {nextCheck && <span className="text-gray-500">· next {nextCheck}</span>}
      </div>
    );
  }

  if (size === 'card') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
        <Clock size={18} className={COLOR_TO_TEXT[status.color]} />
        <div className="min-w-0">
          <div className={`text-xl font-bold ${COLOR_TO_TEXT[status.color]} tabular-nums`}>{status.label}</div>
          <div className="text-xs text-gray-500 truncate">Auto-migration</div>
          {nextCheck && (
            <div className="text-[10px] text-gray-600 truncate">next {nextCheck}</div>
          )}
        </div>
      </div>
    );
  }

  // banner OR strip
  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap px-4 py-2 rounded-lg border ${
      status.color === 'green' ? 'bg-green-900/15 border-green-800/40'
      : status.color === 'yellow' ? 'bg-yellow-900/15 border-yellow-800/40'
      : status.color === 'orange' ? 'bg-orange-900/15 border-orange-800/40'
      : 'bg-slate-800/60 border-slate-700/50'
    }`}>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
        <span className={`font-medium ${COLOR_TO_TEXT[status.color]}`}>Auto-migration: {status.label}</span>
        {nextCheck && <span className="text-gray-400 text-xs">next check {nextCheck}</span>}
        {automationStatus.state?.last_run && (
          <span className="text-gray-500 text-xs">· last run {(() => {
            let ts = typeof automationStatus.state.last_run === 'object' ? automationStatus.state.last_run.timestamp : automationStatus.state.last_run;
            const d = new Date(ts);
            const mins = Math.floor((Date.now() - d.getTime()) / 60000);
            if (mins < 60) return `${mins}m ago`;
            if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
            return `${Math.floor(mins/1440)}d ago`;
          })()}</span>
        )}
      </div>
      {showActions && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => togglePause(automationStatus, fetchAutomationStatus)}
            className="px-2.5 py-1 text-xs rounded border bg-slate-800/60 border-slate-700/50 text-gray-200 hover:bg-slate-700/60 inline-flex items-center gap-1"
            title={automationStatus.timer_active ? 'Pause auto-migration timer' : 'Resume auto-migration timer'}
          >
            {automationStatus.timer_active ? <Pause size={12} /> : <Play size={12} />}
            {automationStatus.timer_active ? 'Pause' : 'Resume'}
          </button>
          {runAutomationNow && (
            <button
              onClick={() => runAutomationNow()}
              disabled={runningAutomation}
              className="px-2.5 py-1 text-xs rounded border bg-blue-600 border-blue-500 text-white hover:bg-blue-700 disabled:bg-gray-600 inline-flex items-center gap-1"
              title="Trigger an automation run now"
            >
              {runningAutomation ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
              Run Now
            </button>
          )}
          {setCurrentPage && (
            <button
              onClick={() => setCurrentPage('automation')}
              className="px-2.5 py-1 text-xs rounded border bg-slate-800/60 border-slate-700/50 text-gray-300 hover:bg-slate-700/60 inline-flex items-center gap-1"
              title="Open automation settings"
            >
              <Settings size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
