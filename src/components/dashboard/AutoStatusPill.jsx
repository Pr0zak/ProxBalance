import { Clock, Pause, Play, Loader, Settings, ChevronDown, MoveRight, Eye } from '../Icons.jsx';
import { RunStrip } from './RunHistoryDisplay.jsx';
import RunDetailBlock from './RunDetailBlock.jsx';
import MigrationOutcomes from './recommendations/insights/MigrationOutcomes.jsx';
import { parseTimestamp } from '../../utils/formatters.js';
import { nextActionWindow, formatInZone, formatIn } from '../../utils/schedule.js';
import { useAppStatus } from '../AppStatus.jsx';
import { statusBadge } from '../../utils/designTokens.js';
import { lastCheckSentence, lastCheckParts, lastRealMove, shortDateTime } from '../../utils/automationStory.js';

const { useState, useEffect, useMemo } = React;

/**
 * Reusable auto-migration status indicator. Three sizes:
 *  - 'pill'   : compact inline strip (TopNav-style)
 *  - 'banner' : full horizontal bar with controls, the last check as a chip
 *               plus the guest it concerned, and an expandable view of
 *               recent checks and whether past moves helped
 *  - 'card'   : KPI-card-shaped (KpiRow)
 *  - 'strip'  : medium horizontal strip
 */

export function getStatus(automationStatus) {
  if (!automationStatus) return { label: 'Unknown', color: 'gray', dotColor: 'bg-gray-500' };
  if (!automationStatus.enabled) return { label: 'Off', color: 'gray', dotColor: 'bg-gray-500' };
  if (automationStatus.dry_run) return { label: 'Dry-Run', color: 'yellow', dotColor: 'bg-yellow-400' };
  if (!automationStatus.timer_active) return { label: 'Paused', color: 'orange', dotColor: 'bg-orange-400' };
  // Timer is running but we're outside every configured migration window —
  // scheduled runs will exit early, so don't claim "Active".
  const cw = (automationStatus.state?.current_window || '').toLowerCase();
  if (cw.startsWith('outside')) return { label: 'Idle', color: 'gray', dotColor: 'bg-gray-400' };
  return { label: 'Active', color: 'green', dotColor: 'bg-green-400' };
}

export function getNextCheck(automationStatus) {
  if (!automationStatus?.next_check) {
    if (automationStatus?.check_interval_minutes) return `every ${automationStatus.check_interval_minutes}m`;
    return null;
  }
  const next = parseTimestamp(automationStatus.next_check);
  if (!next) return null;
  const diffMins = Math.floor((next - new Date()) / 60000);
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
  automationConfig,
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
  const [showWatching, setShowWatching] = useState(false);

  // Banner-only: when the schedule next lets a run act. Recomputed once a
  // minute at most, since the forward search walks up to a week of minutes.
  const minuteKey = Math.floor(Date.now() / 60000);
  const wantsSchedule = size === 'banner' && !!automationStatus?.enabled && !!automationStatus?.timer_active;
  const schedule = automationConfig?.schedule;
  const nextAct = useMemo(() => (wantsSchedule
    ? nextActionWindow(schedule, {
        now: new Date(),
        nextCheck: parseTimestamp(automationStatus?.next_check),
        intervalMin: automationStatus?.check_interval_minutes || 0,
      })
    : null
  ), [wantsSchedule, schedule, automationStatus?.next_check, automationStatus?.check_interval_minutes, minuteKey]);

  // A failed status fetch must not read as "Auto: Off"; while the first load
  // is in flight (automationStatus null, no error) render nothing.
  const { automationStatusError, retryAutomationStatus } = useAppStatus();
  if (automationStatusError) {
    const retry = retryAutomationStatus || fetchAutomationStatus;
    return (
      <div
        className={`${size === 'pill' ? 'inline-flex px-2 py-0.5 rounded-full text-xs' : 'flex px-4 py-2 rounded-lg text-sm'} items-center gap-1.5 border bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300`}
        title={automationStatusError}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span className="font-medium">{size === 'pill' ? 'Auto: status unavailable' : 'Auto-migration status unavailable'}</span>
        {retry && (
          <>
            <span aria-hidden="true">·</span>
            <button onClick={() => retry()} className="font-medium underline-offset-2 hover:underline">Retry</button>
          </>
        )}
      </div>
    );
  }
  if (!automationStatus) return null;
  const status = getStatus(automationStatus);
  const nextCheck = getNextCheck(automationStatus);
  const showActions = (size === 'banner' || size === 'card' || size === 'strip') && automationStatus.enabled;
  const canExpand = size === 'banner' && lastRunObj;
  const outsideWindow = automationStatus.enabled
    && (automationStatus.state?.current_window || '').toLowerCase().startsWith('outside');

  // Banner context: which guests automation is watching before it moves them.
  const now = new Date();
  const actAt = nextAct?.firstRunAt || nextAct?.opensAt || null;
  // "until HH:MM" only when the blackout is the last thing in the way;
  // otherwise the "can act next" time says it.
  const blackoutUntil = nextAct?.blackoutUntil && nextAct?.opensAt
    && nextAct.blackoutUntil.getTime() === nextAct.opensAt.getTime() ? nextAct.blackoutUntil : null;
  const tracking = automationStatus.intelligent_tracking;
  const watching = (tracking?.items || []).filter(i => i.status === 'observing');
  const periods = tracking?.observation_periods || null;

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
  const modeLabel = status.label === 'Dry-Run' ? 'Dry run' : status.label;
  const tz = nextAct?.tz || automationConfig?.schedule?.timezone;
  const nextAt = parseTimestamp(automationStatus.next_check);
  const opensAt = nextAct?.blocked && actAt ? formatInZone(nextAct.opensAt || actAt, nextAct.tz, now) : null;
  const storyCtx = { now, opensAt, observationPeriods: tracking?.enabled ? periods : null };
  const last = lastRunObj ? lastCheckParts(lastRunObj, storyCtx) : null;
  // The banner line already says "nothing to do"; the section only appears
  // when the last check has guests or a reason to show.
  const showLastCheck = last && last.kind !== 'nothing';
  const realMove = lastRealMove(automationStatus.recent_migrations);
  const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-500 mb-1.5';
  return (
    <div className={`rounded-lg border ${COLOR_TO_BG[status.color]}`}>
      <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap px-4 pt-2 pb-1">
        <div className="flex items-center gap-x-2 gap-y-0.5 text-sm flex-wrap min-w-0">
          {canExpand && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-0.5 rounded hover:bg-pb-surface2 dark:hover:bg-slate-700/50 transition-colors"
              title={expanded ? 'Hide what automation did' : 'Show what automation did and why'}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              aria-expanded={expanded}
            >
              <ChevronDown size={14} className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
          <span className="font-medium text-pb-text dark:text-gray-200">Automation</span>
          <span className="text-pb-text2 dark:text-gray-500" aria-hidden="true">·</span>
          <span className={`font-medium ${COLOR_TO_TEXT[status.color]}`}>{modeLabel}</span>
          {nextAct?.blocked && actAt ? (
            <span
              className="text-pb-text2 dark:text-gray-400 text-xs"
              title={[
                nextAct.opensAt && `Schedule allows migrations from ${formatInZone(nextAct.opensAt, nextAct.tz, now)}`,
                nextAct.firstRunAt && `First ${automationStatus.check_interval_minutes}-minute timer run inside it: ${formatInZone(nextAct.firstRunAt, nextAct.tz, now)}`,
                'Run Now still works, but exits early until then.',
              ].filter(Boolean).join('\n')}
            >
              <span className="hidden sm:inline">· </span>{nextAct.reason === 'blackout'
                ? <>{nextAct.blackoutName || 'Blackout'}{nextAct.blackoutName ? ' blackout' : ''}{blackoutUntil ? <> until {formatInZone(blackoutUntil, nextAct.tz, now)}</> : null}</>
                : <>outside migration windows</>}
              {' '}· can act next <span className="text-pb-text dark:text-gray-200 font-medium">{formatInZone(actAt, nextAct.tz, now)}</span>
              <span className="text-pb-text2 dark:text-gray-500"> (in {formatIn(actAt, now)})</span>
            </span>
          ) : nextAt && automationStatus.enabled && automationStatus.timer_active ? (
            <span className="text-pb-text2 dark:text-gray-400 text-xs">
              <span className="hidden sm:inline">· </span>next check <span className="text-pb-text dark:text-gray-200 font-medium">{formatInZone(nextAt, tz, now)}</span>
              <span className="text-pb-text2 dark:text-gray-500"> (in {formatIn(nextAt, now)})</span>
            </span>
          ) : nextCheck ? (
            <span className="text-pb-text2 dark:text-gray-400 text-xs"><span className="hidden sm:inline">· </span>next check {nextCheck}</span>
          ) : null}
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
                className={`px-2.5 py-1 text-xs rounded border text-white inline-flex items-center gap-1 disabled:bg-gray-600 ${
                  outsideWindow
                    ? 'bg-blue-600/40 border-blue-500/40 hover:bg-blue-600/60'
                    : 'bg-blue-600 border-blue-500 hover:bg-blue-700'
                }`}
                title={outsideWindow
                  ? 'Outside migration window — the run will start but exit early. Click anyway to test.'
                  : 'Trigger an automation run now'}
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
                aria-label="Open automation settings"
              >
                <Settings size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {size === 'banner' && automationStatus.enabled && (last || realMove || watching.length > 0) && (
        <div className="px-4 pb-2">
          {last && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm" title={lastCheckSentence(lastRunObj, storyCtx)}>
              <span className="text-pb-text2 dark:text-gray-400">{last.lead}</span>
              {last.chip && <span className={statusBadge(last.tone)}>{last.chip}</span>}
              {last.subject && <span className="text-pb-text dark:text-gray-200 min-w-0 break-words">{last.subject}</span>}
            </p>
          )}
          {(realMove || watching.length > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-pb-text2 dark:text-gray-400">
              {realMove && (
                <span className="inline-flex items-center gap-1.5 min-w-0 flex-wrap" title={realMove.reason || undefined}>
                  <MoveRight size={12} className={realMove.status === 'failed' ? 'text-red-500' : 'text-blue-500 dark:text-blue-400'} />
                  {automationStatus.dry_run ? 'Last real move' : 'Last move'}
                  <span className="text-pb-text dark:text-gray-200">{realMove.name || realMove.vmid}</span>
                  <span className="font-mono">{realMove.source_node} → {realMove.target_node}</span>
                  {realMove.status === 'failed' && <span className="text-red-600 dark:text-red-400">failed</span>}
                  <span className="text-pb-text2 dark:text-gray-500">· {shortDateTime(realMove.timestamp)}</span>
                </span>
              )}
              {watching.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWatching(v => !v)}
                  className="inline-flex items-center gap-1.5 hover:text-pb-text dark:hover:text-gray-200"
                  title="Guests the engine keeps suggesting. It moves one only after it has been suggested on enough checks in a row."
                  aria-expanded={showWatching}
                >
                  <Eye size={12} className="text-violet-500 dark:text-violet-400" />
                  Watching <span className="text-pb-text dark:text-gray-200">{watching.length}</span> guest{watching.length !== 1 ? 's' : ''} before moving
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showWatching ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
          {showWatching && watching.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {watching.map(w => (
                <span
                  key={w.vmid}
                  className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/25 text-violet-800 dark:text-violet-200"
                  title={`Suggested on ${w.consecutive_count}${periods ? ` of ${periods}` : ''} checks in a row · first seen ${relativeAgo(w.first_seen)}`}
                >
                  {w.name}
                  <span className="font-mono text-violet-600 dark:text-violet-300/80">{w.source_node} → {w.last_target_node}</span>
                  {periods && <span className="tabular-nums text-violet-600/80 dark:text-violet-300/70">{w.consecutive_count} of {periods}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {canExpand && expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-pb-border dark:border-slate-700/40 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
          <section className="min-w-0 lg:col-span-2">
            <h4 className={sectionTitle}>Recent checks · last 24 h</h4>
            <RunStrip runs={runHistory && runHistory.length ? runHistory : [lastRunObj]} ctx={storyCtx} />
          </section>
          {showLastCheck && (
            <section className="min-w-0">
              <h4 className={sectionTitle}>Last check</h4>
              <RunDetailBlock run={lastRunObj} compact ctx={storyCtx} />
            </section>
          )}
          {API_BASE && (
            <section className={`min-w-0 ${showLastCheck ? '' : 'lg:max-w-xl'}`}>
              <h4 className={sectionTitle}>Did past moves help?</h4>
              <MigrationOutcomes
                active={expanded}
                onOpenInsights={setCurrentPage ? () => setCurrentPage('insights') : undefined}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
