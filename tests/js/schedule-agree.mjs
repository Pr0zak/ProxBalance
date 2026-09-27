// Checks that the dashboard (schedule.js) and Automation page (scheduleWindows.js)
// schedule calculations agree minute by minute over a week.
// Run: node tests/js/schedule-agree.mjs [live-config-url]
import { build } from 'esbuild';
const out = await build({ stdin: { contents: "export * as A from './src/utils/schedule.js'; export * as B from './src/utils/scheduleWindows.js';", resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', write: false, define: { React: 'globalThis.React' } });
globalThis.React = { useState: () => [0, () => {}], useEffect: () => {} };
const { A, B } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));
const tz = 'America/Chicago';
const all = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const cases = {
  typical: { timezone: tz, migration_windows: [{ name: 'Day', days: all, start_time: '03:00', end_time: '21:00' }],
             blackout_windows: [{ name: 'B1', days: all, start_time: '21:00', end_time: '23:59' }, { name: 'B2', days: all, start_time: '00:00', end_time: '03:00' }] },
  overnight: { timezone: tz, migration_windows: [{ name: 'Night', days: ['Friday'], start_time: '22:00', end_time: '02:00' }], blackout_windows: [] },
  allDisabled: { timezone: tz, migration_windows: [{ name: 'Off', days: all, start_time: '00:00', end_time: '23:59', enabled: false }], blackout_windows: [] },
  none: { timezone: tz, migration_windows: [], blackout_windows: [{ name: 'Wkd', days: ['Saturday','Sunday'], start_time: '08:00', end_time: '12:00' }] },
};
if (process.argv[2]) cases.live = (await (await fetch(process.argv[2])).json()).config.schedule;
let bad = 0;
for (const [name, sch] of Object.entries(cases)) {
  const start = Date.UTC(2026, 8, 21, 5, 0, 30); // a Monday, 00:00:30 in Chicago
  for (let i = 0; i < 7 * 1440; i++) {
    const d = new Date(start + i * 60000);
    const { day, minute } = B.zonedParts(d, sch.timezone || 'UTC');
    const a = A.scheduleStateAt(sch, d).allowed, b = B.stateAt(sch, day, minute).allowed;
    if (a !== b) { if (bad++ < 5) console.log(`MISMATCH ${name} ${day} ${Math.floor(minute/60)}:${minute%60} dashboard=${a} automation=${b}`); }
  }
  console.log(`${name}: checked ${7*1440} minutes`);
}
console.log(bad ? `${bad} mismatches` : 'all agree'); process.exit(bad ? 1 : 0);
