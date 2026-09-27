import { Clock } from '../Icons.jsx';
import { BANNER_SUCCESS, BANNER_WARN, INNER_CARD } from '../../utils/designTokens.js';
import {
  WEEK_DAYS, windowSegments, scheduleOutlook, nextCheckInfo,
  fmtClock, fmtDuration, reasonPhrase, flipPhrase, useNow,
} from '../../utils/scheduleWindows.js';

const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const DAY_COL = 'w-9 flex-shrink-0';   // day-label column; the now line is offset by it (2.25rem + 0.5rem gap)

/**
 * Live schedule status line plus a weekly grid of migration / blackout
 * windows, both evaluated in the schedule's timezone with automigrate.py's
 * rules (see utils/scheduleWindows.js).
 *
 * The status line describes the *saved* schedule — that is what the runner
 * acts on, and it matches Quick Setup. The grid shows the draft, so edits are
 * visible before saving; when they differ a note says so.
 */
export default function WeeklyScheduleOverview({ schedule, savedConfig, automationStatus, onEditWindow }) {
  const now = useNow(30000);
  const migrationWindows = schedule?.migration_windows || [];
  const blackoutWindows = schedule?.blackout_windows || [];
  const savedSchedule = savedConfig?.schedule || schedule;

  if (migrationWindows.length === 0 && blackoutWindows.length === 0
    && !(savedSchedule?.migration_windows?.length || savedSchedule?.blackout_windows?.length)) return null;

  const outlook = scheduleOutlook(savedSchedule, now);
  const grid = scheduleOutlook(schedule, now);   // draft: drives the marker position and "today"
  const flip = flipPhrase(outlook);
  const check = nextCheckInfo(automationStatus, savedConfig, now);
  const unsaved = JSON.stringify(schedule || {}) !== JSON.stringify(savedSchedule || {});
  const nowFrac = grid.minute / 1440;

  const jumpTo = (globalIndex) => {
    onEditWindow?.(globalIndex);
    setTimeout(() => {
      document.querySelector(`[data-window-index="${globalIndex}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const bars = (windows, type) => windows.flatMap((w, i) => {
    if (w.enabled === false) return [];
    const globalIndex = type === 'migration' ? i : migrationWindows.length + i;
    return windowSegments(w).map(([s, e], k) => ({ key: `${type}-${i}-${k}`, w, s, e, type, globalIndex }));
  });
  const allBars = [...bars(migrationWindows, 'migration'), ...bars(blackoutWindows, 'blackout')];
  const hasDay = (w, day) => (w.days || []).some(d => String(d).toLowerCase() === day.toLowerCase());

  return (
    <div className={`${INNER_CARD} mb-4`}>
      {/* Status line — same outlook as Quick Setup */}
      <div className={`${outlook.allowed ? BANNER_SUCCESS : BANNER_WARN} mb-4 !items-start`}>
        <Clock size={16} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-sm lg:flex lg:items-baseline lg:justify-between lg:gap-4">
          <div>
            <span className="font-semibold">
              {outlook.allowed ? 'Migrations allowed now' : 'Migrations blocked now'}:
            </span>
            <span className="opacity-80"> {reasonPhrase(outlook)} ({outlook.day.slice(0, 3)} {fmtClock(outlook.minute)} {outlook.zone}).</span>
            {flip && <span className="ml-1 font-medium tabular-nums">{flip}.</span>}
          </div>
          {check && (
            <div className="text-xs opacity-80 mt-1 lg:mt-0 lg:whitespace-nowrap tabular-nums">
              Next check {check.clock}{check.minutesUntil > 0 ? ` (in ${fmtDuration(check.minutesUntil)})` : ''}, {check.allowed ? 'can migrate' : 'will skip'}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-2">
        <div className="text-sm font-semibold text-pb-text dark:text-gray-300">Weekly schedule</div>
        <div className="text-xs text-pb-text2 dark:text-gray-500">
          {unsaved && <span className="text-amber-600 dark:text-amber-400 mr-2">Showing unsaved edits</span>}
          Times in {grid.zone}
        </div>
      </div>

      {/* Shared hour axis */}
      <div className="flex gap-2">
        <div className={DAY_COL} />
        <div className="flex-1 relative h-4">
          {AXIS_HOURS.map(h => (
            <span
              key={h}
              className={`absolute text-[10px] tabular-nums text-pb-text2 dark:text-gray-500 ${h === 0 ? '' : h === 24 ? '-translate-x-full' : '-translate-x-1/2'} ${h % 6 !== 0 ? 'hidden sm:inline' : ''}`}
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      <div className="relative space-y-1.5">
        {WEEK_DAYS.map(day => {
          const isToday = day === grid.day;
          return (
            <div key={day} className="flex gap-2 items-center">
              <div className={`${DAY_COL} text-xs ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-pb-text2 dark:text-gray-400'}`}>
                {day.slice(0, 3)}
              </div>
              <div className="flex-1 relative h-5 rounded bg-slate-200 dark:bg-slate-600/60 overflow-hidden">
                {/* 3-hour guides */}
                {AXIS_HOURS.slice(1, -1).map(h => (
                  <div key={h} className="absolute inset-y-0 border-l border-slate-300/70 dark:border-slate-500/40" style={{ left: `${(h / 24) * 100}%` }} />
                ))}
                {allBars.filter(b => hasDay(b.w, day)).map(b => (
                  <div
                    key={b.key}
                    className={`absolute inset-y-0 cursor-pointer transition-opacity hover:opacity-80 ${b.type === 'blackout' ? 'bg-red-500 dark:bg-red-600 z-20' : 'bg-green-500 dark:bg-green-600 z-10'}`}
                    style={{ left: `${(b.s / 1440) * 100}%`, width: `${((b.e - b.s) / 1440) * 100}%` }}
                    title={`${b.w.name}: ${b.w.start_time}–${b.w.end_time} (${b.type === 'blackout' ? 'blocked' : 'allowed'}) — click to edit`}
                    onClick={() => jumpTo(b.globalIndex)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {/* Now line through the whole week, offset past the day-label column */}
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -ml-px bg-blue-600 dark:bg-blue-400 pointer-events-none z-30 rounded"
          style={{ left: `calc(2.75rem + (100% - 2.75rem) * ${nowFrac})` }}
          title={`Now: ${grid.day.slice(0, 3)} ${fmtClock(grid.minute)} ${grid.zone}`}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-pb-text2 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />Allowed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600" />Blackout</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-600/60" />{migrationWindows.length ? 'Outside windows (blocked)' : 'No restriction'}</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-blue-600 dark:bg-blue-400" />Now</span>
      </div>
    </div>
  );
}
