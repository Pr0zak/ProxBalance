/**
 * Migration-schedule arithmetic for the UI, shared by the dashboard banner and
 * any other screen that needs to say "automation can act next at ...".
 *
 * Mirrors automigrate.py's _check_time_window():
 *  - a window matches when the current weekday (in the window's own time zone,
 *    falling back to schedule.timezone, then UTC) is one of its `days` and the
 *    wall-clock time is within [start_time, end_time], both ends inclusive;
 *  - `days` are the days a window starts on: an overnight window (end < start)
 *    covers start-24:00 on a listed day and 00:00-end on the following day
 *    (so "Sat 22:00-02:00" covers Saturday night into Sunday morning);
 *  - windows with `enabled: false` are ignored;
 *  - no migration windows means always allowed, but a list of only disabled
 *    windows blocks every run; any matching blackout wins.
 *
 * src/utils/scheduleWindows.js (Automation page) implements the same rules on
 * a day/minute grid; tests/js/schedule-agree.mjs checks the two agree.
 *
 * Every instant is evaluated as a real Date in each window's zone, so DST
 * changes are handled the same way the backend handles them.
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MINUTE = 60 * 1000;
const WEEK = 7 * 24 * 60 * MINUTE;

const formatters = new Map();
function wallFormatter(tz) {
  if (!formatters.has(tz)) {
    formatters.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }));
  }
  return formatters.get(tz);
}

/** Weekday index (0 = Sunday) and seconds-of-day for `date` in zone `tz`. */
function wallClock(date, tz) {
  const parts = wallFormatter(tz).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value;
  return {
    day: DAYS.indexOf(String(get('weekday')).toLowerCase()),
    sec: (parseInt(get('hour'), 10) % 24) * 3600 + parseInt(get('minute'), 10) * 60 + parseInt(get('second'), 10),
  };
}

function toSec(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return ((h || 0) * 60 + (m || 0)) * 60;
}

function windowMatches(win, date, defaultTz) {
  if (!win || win.enabled === false) return false;
  let wc;
  try { wc = wallClock(date, win.timezone || defaultTz); } catch { return false; }
  const days = (win.days || []).map(d => String(d).toLowerCase());
  const today = days.includes(DAYS[wc.day]);
  const yesterday = days.includes(DAYS[(wc.day + 6) % 7]);
  const s = toSec(win.start_time);
  const e = toSec(win.end_time);
  // Backend compares datetime.time (with seconds) against HH:MM, so an end of
  // 06:00 stops matching at 06:00:00.000001; treat the end minute's start as
  // the last matching second.
  if (s <= e) return today && wc.sec >= s && wc.sec <= e;
  return (today && wc.sec >= s) || (yesterday && wc.sec <= e);
}

/**
 * Whether the schedule allows a migration at `date`.
 *
 * @param {object} schedule  automigrate config `schedule` block
 *                           ({ timezone, migration_windows[], blackout_windows[] })
 * @param {Date}   date
 * @returns {{ allowed: boolean, inWindow: boolean, window: object|null, blackout: object|null }}
 */
export function scheduleStateAt(schedule, date = new Date()) {
  const tz = schedule?.timezone || 'UTC';
  // automigrate treats "no migration windows" as unrestricted, but a list whose
  // windows are all disabled blocks every run (nothing can match).
  const all = schedule?.migration_windows || [];
  const mig = all.filter(w => w && w.enabled !== false);
  const blk = schedule?.blackout_windows || [];
  const window = mig.find(w => windowMatches(w, date, tz)) || null;
  const inWindow = all.length === 0 || !!window;
  const blackout = blk.find(w => windowMatches(w, date, tz)) || null;
  return { allowed: inWindow && !blackout, inWindow, window, blackout };
}

/**
 * When can automation next actually migrate?
 *
 * @param {object} schedule  automigrate config `schedule` block
 * @param {object} [opts]
 * @param {Date}   [opts.now]          reference time (default: now)
 * @param {Date}   [opts.nextCheck]    next automigrate timer tick, if known
 * @param {number} [opts.intervalMin]  timer interval in minutes, to project later ticks
 * @returns {null | {
 *   blocked: boolean,                      // false = the schedule allows migrations right now
 *   reason: 'outside'|'blackout'|null,
 *   blackoutName: string|null,             // matching blackout's name, when reason = 'blackout'
 *   blackoutEnd: string|null,              // its end_time ("03:00")
 *   blackoutUntil: Date|null,              // first minute no blackout matches (back-to-back blackouts chained)
 *   opensAt: Date|null,                    // first minute the schedule allows migrations (within a week)
 *   firstRunAt: Date|null,                 // first timer tick that lands inside an allowed minute
 *   tz: string,                            // schedule time zone, for formatting
 * }}
 *   Returns null when there is no schedule or the time zone is invalid.
 */
export function nextActionWindow(schedule, { now = new Date(), nextCheck = null, intervalMin = 0 } = {}) {
  if (!schedule) return null;
  const tz = schedule.timezone || 'UTC';
  try { wallFormatter(tz); } catch { return null; }

  const current = scheduleStateAt(schedule, now);
  const result = {
    blocked: !current.allowed,
    reason: current.allowed ? null : (current.blackout ? 'blackout' : 'outside'),
    blackoutName: current.blackout?.name || null,
    blackoutEnd: current.blackout?.end_time || null,
    blackoutUntil: null,
    opensAt: null,
    firstRunAt: null,
    tz,
  };
  if (current.allowed) return result;

  // First allowed minute, probed one second past each minute boundary.
  const firstProbe = Math.floor(now.getTime() / MINUTE) * MINUTE + MINUTE + 1000;
  for (let t = firstProbe; t <= now.getTime() + WEEK; t += MINUTE) {
    const st = scheduleStateAt(schedule, new Date(t));
    if (current.blackout && !result.blackoutUntil && !st.blackout) result.blackoutUntil = new Date(t - 1000);
    if (st.allowed) { result.opensAt = new Date(t - 1000); break; }
  }

  // First automigrate timer tick that lands inside an allowed minute.
  if (result.opensAt && nextCheck instanceof Date && !isNaN(nextCheck) && intervalMin > 0) {
    const step = intervalMin * MINUTE;
    let t = nextCheck.getTime();
    // Skip ticks before the window opens without walking them one by one.
    if (t < result.opensAt.getTime()) t += Math.floor((result.opensAt.getTime() - t) / step) * step;
    for (; t <= now.getTime() + WEEK; t += step) {
      if (t >= now.getTime() && scheduleStateAt(schedule, new Date(t)).allowed) { result.firstRunAt = new Date(t); break; }
    }
  }
  return result;
}

/** "03:00 CDT" today, or "Sun 03:00 CDT" on another day, in zone `tz`. */
export function formatInZone(date, tz, now = new Date()) {
  if (!date) return '';
  const sameDay = wallClock(date, tz).day === wallClock(now, tz).day && Math.abs(date - now) < 24 * 60 * MINUTE;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
  }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value || '';
  const hh = String(parseInt(get('hour'), 10) % 24).padStart(2, '0');
  return `${sameDay ? '' : `${get('weekday')} `}${hh}:${get('minute')} ${get('timeZoneName')}`.trim();
}

/** "3h 55m" / "12m" / "2d 4h" until `date`. */
export function formatIn(date, now = new Date()) {
  const mins = Math.max(0, Math.round((date - now) / MINUTE));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}
