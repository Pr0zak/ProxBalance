import { ArrowRight, ChevronDown } from '../Icons.jsx';
import { TABLE_HEADER, TABLE_ROW, statusBadge } from '../../utils/designTokens.js';
import { fetchMigrationOutcomes, fetchGuestLocations } from '../../api/client.js';
import { parseTimestamp } from '../../utils/formatters.js';
import { isReliableOutcome } from '../dashboard/recommendations/insights/MigrationOutcomes.jsx';
import { useLoad, Loading, Failed } from './shared.jsx';
import MoreInfo from '../MoreInfo.jsx';

const { useState, useEffect, useMemo } = React;

const DAYS_SHOWN = 14;

/**
 * Latest timely source-CPU reading after the move: 24 h, else 1 h, else 5 min.
 * Snapshots flagged late (taken long after their window) don't measure the
 * move, so they count as missing.
 */
function afterReading(o) {
  const ok = (s) => s && !s.late && typeof s.source_node?.cpu === 'number';
  if (ok(o.post_24h)) return { cpu: o.post_24h.source_node.cpu, window: '24 h' };
  if (ok(o.post_1h)) return { cpu: o.post_1h.source_node.cpu, window: '1 h' };
  const p5 = o.post_5min || o.post_migration;
  if (ok(p5) && isReliableOutcome(o)) return { cpu: p5.source_node.cpu, window: '5 min' };
  return null;
}

/**
 * Day verdict over the moves that have an after value:
 *  effective     — average source CPU dropped >= 5 points and most moves helped
 *  not effective — average didn't drop (or rose)
 *  mixed         — anything in between
 *  measuring     — no after values yet
 */
function dayVerdict(moves) {
  const measured = moves.filter(m => m.before != null && m.after != null);
  if (!measured.length) return { key: 'measuring', measured };
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const before = avg(measured.map(m => m.before));
  const after = avg(measured.map(m => m.after.cpu));
  const helped = measured.filter(m => m.helped).length;
  const drop = before - after;
  const key = drop >= 5 && helped > measured.length / 2 ? 'effective' : drop <= 0 ? 'not effective' : 'mixed';
  return { key, measured, before, after, helped };
}

const VERDICT_TONE = { effective: 'green', 'not effective': 'red', mixed: 'yellow', measuring: 'gray' };

const pct = (v) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dayLabel = (d) => d.toLocaleDateString([], { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
const timeLabel = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function MoveResult({ m }) {
  if (m.pending && !m.after) return <span className="text-pb-text3 dark:text-gray-500">measuring</span>;
  if (m.verdict) return <span className={statusBadge(m.verdict === 'beneficial' ? 'green' : m.verdict === 'harmful' ? 'red' : 'gray')}>{m.verdict}</span>;
  if (m.pending) return <span className="text-pb-text3 dark:text-gray-500">measuring 24 h</span>;
  return <span className="text-pb-text3 dark:text-gray-500">—</span>;
}

function CpuChange({ m }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
      <span className="text-pb-text2 dark:text-gray-400">{pct(m.before)}</span>
      <ArrowRight size={10} className="text-pb-text3 dark:text-gray-500" />
      {m.after ? (
        <span className={`font-medium ${m.after.cpu < m.before ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{pct(m.after.cpu)}</span>
      ) : <span className="text-pb-text3 dark:text-gray-500">—</span>}
      {m.after && <span className="text-[10px] text-pb-text3 dark:text-gray-500">{m.after.window}</span>}
    </span>
  );
}

function DayGroup({ day, open, onToggle }) {
  const { date, moves, verdict } = day;
  const sources = Array.from(new Set(moves.map(m => m.source)));
  const where = sources.length === 1 ? `off ${sources[0]}` : `from ${sources.length} nodes`;
  const flagged = verdict.key === 'not effective' || (verdict.key === 'mixed' && verdict.helped <= verdict.measured.length / 2);
  return (
    <div className={`rounded-lg border ${flagged ? 'border-red-200 dark:border-red-500/30' : 'border-pb-border dark:border-slate-700'} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${flagged ? 'bg-red-50/60 dark:bg-red-500/10' : 'bg-pb-surface2/60 dark:bg-slate-800/40'} hover:bg-pb-surface2 dark:hover:bg-slate-800/70`}
      >
        <ChevronDown size={14} className={`shrink-0 text-pb-text3 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        <span className="min-w-0 flex-1 text-pb-text dark:text-gray-200">
          <span className="font-semibold">{dayLabel(date)}</span>
          <span className="text-pb-text2 dark:text-gray-400">
            {' · '}{moves.length} move{moves.length !== 1 ? 's' : ''} {where}
            {verdict.measured.length > 0 && <> · CPU <span className="tabular-nums">{pct(verdict.before)} → {pct(verdict.after)}</span></>}
            {verdict.measured.length > 0 && verdict.measured.length < moves.length && <span className="text-pb-text3 dark:text-gray-500"> ({verdict.measured.length} measured)</span>}
          </span>
        </span>
        <span className={`${statusBadge(VERDICT_TONE[verdict.key])} shrink-0`}>{verdict.key}</span>
      </button>
      {open && (
        <>
          {/* Desktop: compact table */}
          <table className="hidden sm:table w-full text-xs">
            <thead>
              <tr>
                <th className={`${TABLE_HEADER} !py-1.5`}>Time</th>
                <th className={`${TABLE_HEADER} !py-1.5`}>Guest</th>
                <th className={`${TABLE_HEADER} !py-1.5`}>Move</th>
                <th className={`${TABLE_HEADER} !py-1.5`}>Source CPU before → after</th>
                <th className={`${TABLE_HEADER} !py-1.5`}>Result</th>
              </tr>
            </thead>
            <tbody>
              {moves.map(m => (
                <tr key={m.key} className={TABLE_ROW}>
                  <td className="px-3 py-1.5 tabular-nums text-pb-text2 dark:text-gray-400">{timeLabel(m.when)}</td>
                  <td className="px-3 py-1.5">
                    <span className="font-medium text-pb-text dark:text-gray-200">{m.name}</span>
                    <span className="ml-1.5 text-pb-text3 dark:text-gray-500">{m.type} {m.vmid}</span>
                  </td>
                  <td className="px-3 py-1.5 text-pb-text2 dark:text-gray-400 whitespace-nowrap">{m.source} → {m.target}</td>
                  <td className="px-3 py-1.5"><CpuChange m={m} /></td>
                  <td className="px-3 py-1.5"><MoveResult m={m} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Phone: one small card per move */}
          <ul className="sm:hidden divide-y divide-pb-border dark:divide-slate-700/70">
            {moves.map(m => (
              <li key={m.key} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-pb-text dark:text-gray-200">{m.name}</span>
                    <span className="ml-1.5 text-pb-text3 dark:text-gray-500">{m.type} {m.vmid}</span>
                  </span>
                  <MoveResult m={m} />
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-pb-text2 dark:text-gray-400">
                  <span className="tabular-nums">{timeLabel(m.when)} · {m.source} → {m.target}</span>
                  <CpuChange m={m} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Migration outcomes grouped by day: one verdict line per day (did the moves
 * relieve their source node?) over a compact table of the moves, with guest
 * names. Days where most moves didn't help are flagged.
 */
export default function OutcomesByDay() {
  const [{ loading, data, error }] = useLoad(() => fetchMigrationOutcomes(null, 200));
  const outcomes = data?.outcomes || [];
  // Older backends send no guest_name; fall back to current guest names.
  const needNames = outcomes.some(o => !o.guest_name);
  const [names, setNames] = useState({});
  useEffect(() => {
    if (!needNames) return;
    let live = true;
    (async () => {
      const res = await fetchGuestLocations();
      if (!live || !res || res.error) return;
      const out = {};
      Object.values(res.guests || {}).forEach(g => { if (g && g.vmid != null && g.name) out[String(g.vmid)] = g.name; });
      setNames(out);
    })();
    return () => { live = false; };
  }, [needNames]);

  const [openDays, setOpenDays] = useState(null);

  // Records whose first post snapshot wasn't taken near the move (old
  // back-filled rows) don't measure it; they're counted, not shown.
  const usable = outcomes.filter(o => o.status === 'pending_5min' || isReliableOutcome(o));
  const hidden = outcomes.length - usable.length;

  const days = useMemo(() => {
    const groups = new Map();
    usable.forEach(o => {
      const when = parseTimestamp(o.pre_migration?.timestamp);
      if (!when) return;
      const after = afterReading(o);
      const before = o.pre_migration?.source_node?.cpu;
      const m = {
        key: o.key, when, vmid: o.vmid, type: o.guest_type || '',
        name: o.guest_name || names[String(o.vmid)] || `${o.guest_type || 'guest'} ${o.vmid}`,
        source: o.source_node, target: o.target_node,
        before: typeof before === 'number' ? before : null, after,
        pending: !!o.status?.startsWith('pending_'), verdict: o.verdict,
        helped: o.verdict ? o.verdict === 'beneficial' : (after && typeof before === 'number' ? after.cpu < before : false),
      };
      const k = dayKey(when);
      if (!groups.has(k)) groups.set(k, { key: k, date: when, moves: [] });
      groups.get(k).moves.push(m);
    });
    return Array.from(groups.values())
      .map(g => ({ ...g, moves: g.moves.sort((a, b) => b.when - a.when) }))
      .sort((a, b) => b.date - a.date)
      .slice(0, DAYS_SHOWN)
      .map(g => ({ ...g, verdict: dayVerdict(g.moves) }));
  }, [outcomes, names]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Failed error={error} />;
  if (!days.length) {
    return <p className="text-sm text-pb-text2 dark:text-gray-400">No measured outcomes yet. Each live move is compared 5 min, 1 h and 24 h after.</p>;
  }
  // Most recent day open by default.
  const isOpen = (k) => (openDays ? openDays.includes(k) : k === days[0].key);
  const toggle = (k) => {
    const cur = openDays || [days[0].key];
    setOpenDays(cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]);
  };

  return (
    <div className="space-y-2">
      {days.map(d => <DayGroup key={d.key} day={d} open={isOpen(d.key)} onToggle={() => toggle(d.key)} />)}
      <MoreInfo
        className="text-[11px] text-pb-text3 dark:text-gray-500"
        label="How outcomes are measured"
        detail={'CPU = average source-node CPU before → after. After is 24 h after the move, else 1 h, else 5 min. Day verdict: effective if the average dropped 5+ points and most moves helped; not effective if it didn\'t drop.'
          + (hidden > 0 ? ` ${hidden} older record${hidden !== 1 ? 's' : ''} hidden: their after-move metrics were captured long after the move.` : '')}
      >
        CPU = source node, before → after the move.
        {data?.total > outcomes.length && ` Latest ${outcomes.length} of ${data.total} moves.`}
      </MoreInfo>
    </div>
  );
}
