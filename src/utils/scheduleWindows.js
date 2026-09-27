/**
 * Client-side evaluation of the automation schedule, mirroring automigrate.py
 * (`_check_time_window`, `is_in_migration_window`, `is_in_blackout_window`
 * and the order `main()` applies them):
 *
 *  - a window matches on its listed days only; for a window that wraps past
 *    midnight (start > end) the after-midnight part is also checked against
 *    the *current* day, exactly like the backend does;
 *  - start <= end is a same-day range;
 *  - an empty migration_windows list means "always allowed", but a non-empty
 *    list whose windows are all disabled blocks every run (the backend only
 *    falls back to "allowed" when the list itself is empty);
 *  - any matching blackout blocks the run.
 *
 * Everything on the Automation page that says whether automation may move
 * guests right now (Quick Setup status line, the schedule outlook, the
 * "Active now" badges) goes through `scheduleOutlook` so they always agree.
 *
 * Known gaps vs. the backend: per-window `timezone` overrides are ignored
 * (the UI never sets them; the schedule timezone is used), and times are
 * evaluated at minute granularity (the backend's end time is inclusive only
 * for its :00 second, so treating it as exclusive differs by < 1 minute).
 */

import { parseTimestamp } from './formatters.js';

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// "23:59" is how the form spells "until midnight" — treat it as 24:00.
const endMinutes = (hhmm) => {
  const m = toMinutes(hhmm);
  return m === 1439 ? 1440 : m;
};

const lower = (s) => String(s || '').toLowerCase();

/** Weekday name + minute-of-day for `date` in IANA zone `tz`. */
export function zonedParts(date, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const get = (t) => parts.find(p => p.type === t)?.value;
    return { day: get('weekday'), minute: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
  } catch (e) {
    return { day: WEEK_DAYS[(date.getUTCDay() + 6) % 7], minute: date.getUTCHours() * 60 + date.getUTCMinutes() };
  }
}

/** True when the window runs past midnight (e.g. 22:00–02:00). */
export const isOvernight = (w) => toMinutes(w.start_time) > endMinutes(w.end_time);

/** Visible [start, end) segments of a window on each of its listed days, in minutes. */
export function windowSegments(w) {
  const s = toMinutes(w.start_time);
  const e = endMinutes(w.end_time);
  if (s <= e) return [[s, e]];
  return [[s, 1440], [0, e]];  // wraps: both parts sit on the listed day (backend rule)
}

const covers = (w, day, minute) =>
  w.enabled !== false
  && (w.days || []).map(lower).includes(lower(day))
  && windowSegments(w).some(([s, e]) => minute >= s && minute < e);

/**
 * State at (day, minute) in the schedule's timezone: { allowed, reason, window }.
 * reason: 'blackout' | 'window' | 'outside' | 'all_disabled' | 'unrestricted'.
 */
export function stateAt(schedule, day, minute) {
  const migration = schedule?.migration_windows || [];
  const blackout = schedule?.blackout_windows || [];
  const b = blackout.find(w => covers(w, day, minute));
  if (b) return { allowed: false, reason: 'blackout', window: b };
  if (migration.length === 0) return { allowed: true, reason: 'unrestricted', window: null };
  const m = migration.find(w => covers(w, day, minute));
  if (m) return { allowed: true, reason: 'window', window: m };
  const anyEnabled = migration.some(w => w.enabled !== false);
  return { allowed: false, reason: anyEnabled ? 'outside' : 'all_disabled', window: null };
}

/** Whole clock minutes between two instants (what a reader subtracts from the shown times). */
export const minutesBetween = (from, to) => Math.floor(to.getTime() / 60000) - Math.floor(from.getTime() / 60000);

/**
 * Current state plus the next time "allowed" flips, scanning up to one week
 * ahead. Returns { tz, zone, day, minute, allowed, reason, window, next } where
 * next is { date, day, minute, minutesUntil, state } or null when it never changes.
 */
export function scheduleOutlook(schedule, now = new Date()) {
  const tz = schedule?.timezone || 'UTC';
  const zone = zoneAbbrev(tz, now);
  const { day, minute } = zonedParts(now, tz);
  const current = stateAt(schedule, day, minute);
  const base = { tz, zone, day, minute, ...current, next: null };
  let d = WEEK_DAYS.indexOf(day);
  if (d === -1) return base;
  let m = minute;
  for (let i = 1; i <= 7 * 1440; i++) {
    m += 1;
    if (m >= 1440) { m = 0; d = (d + 1) % 7; }
    const s = stateAt(schedule, WEEK_DAYS[d], m);
    if (s.allowed !== current.allowed) {
      const date = new Date((Math.floor(now.getTime() / 60000) + i) * 60000);
      return { ...base, next: { date, day: WEEK_DAYS[d], minute: m, minutesUntil: i, state: s } };
    }
  }
  return base;
}

/**
 * When the automigrate timer fires next. The timer is wall-clock
 * (OnCalendar=*:0/N for 1–59 min, *:00 for 60 — see routes/automation.py),
 * so the next run is the next matching minute, not last_run + interval.
 * Multi-hour or odd intervals fall back to the backend's `next_check`.
 */
export function nextTimerFire(intervalMinutes, backendNextCheck, now = new Date()) {
  const n = Number(intervalMinutes) || 5;
  if (n >= 1 && n <= 60) {
    const step = n === 60 ? 60 : n;
    const start = Math.floor(now.getTime() / 60000) + 1;
    for (let k = 0; k <= 60; k++) {
      const d = new Date((start + k) * 60000);
      if (d.getUTCMinutes() % step === 0) return d;
    }
  }
  const d = parseTimestamp(backendNextCheck);
  return d && d > now ? d : null;
}

/**
 * The next scheduled check and whether it will be allowed to migrate.
 * Returns null when automation is off or its timer is paused.
 */
export function nextCheckInfo(automationStatus, automationConfig, now = new Date()) {
  const st = automationStatus || {};
  const enabled = st.enabled ?? automationConfig?.enabled;
  if (!enabled || st.timer_active === false) return null;
  const interval = st.check_interval_minutes ?? automationConfig?.check_interval_minutes;
  const date = nextTimerFire(interval, st.next_check, now);
  if (!date) return null;
  const schedule = automationConfig?.schedule;
  const tz = schedule?.timezone || 'UTC';
  const p = zonedParts(date, tz);
  const state = stateAt(schedule, p.day, p.minute);
  return { date, minute: p.minute, clock: fmtClock(p.minute), minutesUntil: minutesBetween(now, date), allowed: state.allowed, state };
}

export const fmtClock = (minute) =>
  `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export const fmtDuration = (mins) => {
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return mins % 60 ? `${h}h ${mins % 60}m` : `${h}h`;
  return h % 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${Math.floor(h / 24)}d`;
};

/** Short phrase for why the schedule allows/blocks right now. */
export function reasonPhrase(outlook) {
  switch (outlook.reason) {
    case 'blackout': return `“${outlook.window?.name || 'Blackout'}” blackout`;
    case 'outside': return 'outside every migration window';
    case 'all_disabled': return 'every migration window is disabled';
    case 'window': return `in “${outlook.window?.name || 'migration window'}”`;
    default: return 'no time restrictions';
  }
}

/** "Opens Sun 03:00 CDT, in 3h 40m" / "Closes today 06:00 CDT, in 2h" or null. */
export function flipPhrase(outlook) {
  const next = outlook.next;
  if (!next) return null;
  const when = next.day === outlook.day && next.minutesUntil < 1440 ? 'today' : next.day.slice(0, 3);
  return `${next.state.allowed ? 'Opens' : 'Closes'} ${when} ${fmtClock(next.minute)} ${outlook.zone}, in ${fmtDuration(next.minutesUntil)}`;
}

/** "Every day", "Weekdays", "Weekends", or "Mon, Wed, Fri". */
export function describeDays(days = []) {
  const set = new Set((days || []).map(lower));
  const has = (d) => set.has(lower(d));
  if (WEEK_DAYS.every(has)) return 'Every day';
  const weekdays = WEEK_DAYS.slice(0, 5);
  if (set.size === 5 && weekdays.every(has)) return 'Weekdays';
  if (set.size === 2 && has('Saturday') && has('Sunday')) return 'Weekends';
  if (set.size === 0) return 'No days';
  return WEEK_DAYS.filter(has).map(d => d.slice(0, 3)).join(', ');
}

/** Short zone label, e.g. "CDT" for America/Chicago. */
export function zoneAbbrev(tz, date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', timeZoneName: 'short' })
      .formatToParts(date).find(p => p.type === 'timeZoneName')?.value || tz;
  } catch (e) {
    return tz || 'UTC';
  }
}

/** Current time, re-rendered every `ms` milliseconds. */
export function useNow(ms = 30000) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
