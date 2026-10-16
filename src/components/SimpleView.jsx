import { X, ChevronRight, Settings } from './Icons.jsx';
import { attentionItems } from './dashboard/NeedsAttentionStrip.jsx';
import { getStatus, getNextCheck } from './dashboard/AutoStatusPill.jsx';
import { projectedCrossings, checkedHorizon, spanPhrase } from './insights/forecastModel.js';
import { fetchNodeTrends, approveQueuedMove, dismissQueuedMove } from '../api/client.js';
import { runStatusLabel } from '../utils/formatters.js';
import { RunStrip } from './dashboard/RunHistoryDisplay.jsx';
import { Ring, Donut, Spark, DayBars, Legend, STROKE, FILL } from './simple/charts.jsx';
import { toNodeSet } from '../utils/nodeCondition.js';
import { agoText, approvalRow, pendingApprovals } from '../utils/automationStory.js';
import {
  WIDGETS, PRESETS, widgetById, presetLayout, matchingPreset, readLayout, writeLayout,
  toggleWidget, moveWidget, toggleWide, nodeRows, clusterLine, backupTally, recentMoves,
  roomLeft, timelineEvents, eventTime, needsYou,
  downsample, movesByDay, backupsByDay, clusterKpis, guestSpread, trackPos,
} from '../utils/simpleView.js';
import { WALL_PANEL, BTN_PRIMARY, BTN_SECONDARY, MODAL_OVERLAY, MODAL_CONTAINER, TAP_TARGET } from '../utils/designTokens.js';

const { useState, useEffect, useMemo } = React;

const REFRESH_MS = 60000;

// Semantic colours (not the accent): dots, bars and text.
const DOT = { ok: 'bg-green-500', info: 'bg-blue-500', warn: 'bg-amber-500', bad: 'bg-red-500', none: 'bg-slate-400' };
const TEXT = {
  ok: 'text-green-700 dark:text-green-400', warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400', muted: 'text-pb-text2 dark:text-gray-400',
};
const LINK = 'text-blue-600 dark:text-blue-400 hover:underline';

const listNames = (guests, max = 2) => {
  const names = guests.map(g => g.name);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
};

function Dot({ tone, className = '' }) {
  return <span aria-hidden="true" className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${DOT[tone] || DOT.none} ${className}`} />;
}

/** A widget card: small uppercase title, optional "Open" link, body. */
function Card({ title, href, linkText = 'Open', wide, children }) {
  return (
    <section className={`${WALL_PANEL} flex flex-col gap-3 min-w-0 ${wide ? 'md:col-span-2 xl:col-span-3' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-400">{title}</h2>
        {href && <a href={href} className={`text-xs ${LINK} inline-flex items-center`}>{linkText}<ChevronRight size={12} /></a>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }) => <p className={`text-sm ${TEXT.muted}`}>{children}</p>;

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

const pct = (v) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');

/** One headline figure: a gauge (or a number) over a short label. */
function Kpi({ label, children, href }) {
  const body = (
    <>
      {children}
      <span className={`text-[11px] text-center leading-tight ${TEXT.muted}`}>{label}</span>
    </>
  );
  const cls = 'flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 min-w-0';
  return href
    ? <a href={href} className={`${cls} hover:bg-slate-100 dark:hover:bg-slate-700/40`}>{body}</a>
    : <div className={cls}>{body}</div>;
}

/** A big number sized like a Ring, for counts that have no "out of". */
function BigNumber({ value, tone = 'none', sub, size = 64 }) {
  const color = { ok: TEXT.ok, warn: TEXT.warn, bad: TEXT.bad }[tone] || 'text-pb-text dark:text-gray-100';
  return (
    <div className="flex flex-col items-center justify-center leading-none" style={{ width: size, height: size }}>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      {sub && <span className={`text-[10px] mt-1 ${TEXT.muted}`}>{sub}</span>}
    </div>
  );
}

function StatusWidget({ ctx, wide }) {
  const line = clusterLine({
    nodes: ctx.data?.nodes, guests: ctx.data?.guests,
    attentionCount: ctx.needs.length, badCount: ctx.needs.filter(n => n.tone === 'bad').length,
    automationOn: ctx.automationStatus ? !!ctx.automationStatus.enabled : null,
  });
  const k = clusterKpis(ctx.data?.nodes, ctx.data?.guests, { cpuLimit: ctx.cpuThreshold, memLimit: ctx.memThreshold });
  const moves = ctx.migrations == null ? null : recentMoves(ctx.migrations, ctx.nowMs);
  const movesFailed = moves ? moves.filter(m => !m.ok).length : 0;
  const b = ctx.backups;
  const bTotal = b.good + b.failed.length + b.stale.length + b.none.length;
  const needTone = ctx.needs.some(n => n.tone === 'bad') ? 'bad' : ctx.needs.length ? 'warn' : 'ok';
  return (
    <Card title="Cluster" wide={wide}>
      <div className="flex items-center gap-3">
        <Dot tone={line.tone} className="w-3.5 h-3.5" />
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-semibold text-pb-text dark:text-gray-100">{line.text}</p>
          {line.sub && <p className={`text-sm ${TEXT.muted}`}>{line.sub}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-1">
        <Kpi label="Nodes up" href="#/dashboard/nodes">
          <Ring value={k.nodesUp} max={Math.max(1, k.nodesTotal)} tone={k.nodesUp < k.nodesTotal ? 'bad' : 'ok'}
            center={`${k.nodesUp}/${k.nodesTotal}`} label="Nodes up" />
        </Kpi>
        <Kpi label="Guests running" href="#/dashboard/guests">
          <Ring value={k.running} max={Math.max(1, k.guestsTotal)} tone="info" center={k.running} sub={`of ${k.guestsTotal}`} label="Guests running" />
        </Kpi>
        <Kpi label="CPU, average" href="#/dashboard/nodes">
          <Ring value={k.cpu} tone={k.cpuTone} limit={ctx.cpuThreshold} label="Average CPU" />
        </Kpi>
        <Kpi label="Memory, average" href="#/dashboard/nodes">
          <Ring value={k.mem} tone={k.memTone} limit={ctx.memThreshold} label="Average memory" />
        </Kpi>
        <Kpi label="Moves, 24 h" href="#/automation/history">
          <BigNumber value={moves == null ? '—' : moves.length} tone={movesFailed ? 'bad' : 'none'} sub={movesFailed ? `${movesFailed} failed` : null} />
        </Kpi>
        {b.known && (
          <Kpi label="Backed up, 3 days" href="#/dashboard/guests">
            <Donut size={64} stroke={7} small center={b.good} sub={`of ${bTotal}`} label={`${b.good} of ${bTotal} guests backed up in the last 3 days`}
              parts={[{ value: b.good, tone: 'ok' }, { value: b.stale.length, tone: 'warn' }, { value: b.failed.length, tone: 'bad' }, { value: b.none.length, tone: 'none' }]} />
          </Kpi>
        )}
        <Kpi label="Needs you" href={ctx.needs[0]?.href}>
          <BigNumber value={ctx.needs.length} tone={needTone} />
        </Kpi>
      </div>
    </Card>
  );
}

function AttentionWidget({ ctx, wide }) {
  const bad = ctx.needs.filter(n => n.tone === 'bad').length;
  const warn = ctx.needs.length - bad;
  return (
    <Card title="Needs you" wide={wide}>
      {ctx.needs.length === 0 ? (
        <div className="flex items-center gap-3">
          <Ring value={1} max={1} tone="ok" center="✓" size={48} stroke={5} label="Nothing needs you" />
          <Empty>Nothing needs you.</Empty>
        </div>
      ) : (
        <>
          <div className="flex gap-2 text-xs">
            {bad > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold">{bad} urgent</span>}
            {warn > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold">{warn} to check</span>}
          </div>
          <ul className="flex flex-col gap-1">
            {ctx.needs.map(n => (
              <li key={n.id}>
                <a href={n.href} className={`flex items-center gap-2.5 text-sm rounded-md -mx-1.5 px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-700/40 border-l-4 ${n.tone === 'bad' ? 'border-red-500' : 'border-amber-500'} ${TAP_TARGET}`}>
                  <span className="min-w-0 flex-1 text-pb-text dark:text-gray-200">{n.text}</span>
                  <ChevronRight size={14} className="shrink-0 text-pb-text3 dark:text-gray-500" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function NodeTile({ r, node, ctx }) {
  const day = node?.trend_data?.day;
  const cpu = downsample(day, 'cpu');
  const mem = downsample(day, 'mem');
  const guests = (node?.guests || []).filter(v => ctx.data?.guests?.[v]?.status === 'running').length;
  const state = !r.online ? { t: 'offline', c: TEXT.bad } : r.maintenance ? { t: 'maintenance', c: TEXT.warn } : null;
  return (
    <a href={`#/dashboard/nodes/node/${encodeURIComponent(r.name)}`}
      className="flex flex-col gap-2 rounded-xl border border-pb-border/70 dark:border-slate-700/70 p-2.5 sm:p-3 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm sm:text-base font-semibold truncate text-pb-text dark:text-gray-100">{r.name}</span>
        <span className={`text-[11px] shrink-0 ${state ? state.c : TEXT.muted}`}>{state ? state.t : `${guests} running`}</span>
      </div>
      <div className="flex items-center justify-around gap-1">
        <div className="flex flex-col items-center gap-1">
          <Ring value={r.cpu} tone={r.cpuTone} limit={ctx.cpuThreshold} size={54} label={`${r.name} CPU`} />
          <span className={`text-[11px] ${TEXT.muted}`}>CPU</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Ring value={r.mem} tone={r.memTone} limit={ctx.memThreshold} size={54} label={`${r.name} memory`} />
          <span className={`text-[11px] ${TEXT.muted}`}>Memory</span>
        </div>
      </div>
      {r.online && (
        <div>
          <Spark height={36} label={`${r.name}, last 24 hours`}
            series={[{ values: mem, tone: 'mem', area: 'fill-violet-500/15' }, { values: cpu, tone: 'cpu' }]} />
          <div className={`flex justify-between text-[10px] ${TEXT.muted}`}><span>24 h ago</span><span>now</span></div>
        </div>
      )}
    </a>
  );
}

function NodesWidget({ ctx, wide }) {
  const rows = nodeRows(ctx.data?.nodes, { cpuLimit: ctx.cpuThreshold, memLimit: ctx.memThreshold, maintenanceNodes: ctx.maintenanceNodes });
  return (
    <Card title="Nodes" href="#/dashboard/nodes" wide={wide}>
      {rows.length === 0 ? <Empty>No node data yet.</Empty> : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2 sm:gap-3">
            {rows.map(r => <NodeTile key={r.name} r={r} node={ctx.data.nodes[r.name]} ctx={ctx} />)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Legend items={[{ tone: 'cpu', text: 'CPU' }, { tone: 'mem', text: 'Memory' }]} />
            <p className={`text-[11px] ${TEXT.muted}`}>Tick on the ring = your limit (CPU {ctx.cpuThreshold}%, memory {ctx.memThreshold}%)</p>
          </div>
        </>
      )}
    </Card>
  );
}

function MovesWidget({ ctx, wide }) {
  if (ctx.migrations == null) return <Card title="Moves" href="#/automation/history" wide={wide}><Empty>Loading…</Empty></Card>;
  const days = movesByDay(ctx.migrations, ctx.nowMs, 7).map(d => {
    const total = d.auto + d.manual + d.failed;
    return {
      ...d,
      parts: [{ value: d.auto, tone: 'info' }, { value: d.manual, tone: 'mem' }, { value: d.failed, tone: 'bad' }],
      text: total === 0 ? 'no moves' : [d.auto && `${d.auto} by automation`, d.manual && `${d.manual} by hand`, d.failed && `${d.failed} failed`].filter(Boolean).join(', '),
    };
  });
  const week = days.reduce((a, d) => a + d.auto + d.manual, 0);
  const moves = recentMoves(ctx.migrations, ctx.nowMs).slice(0, 3);
  return (
    <Card title="Moves" href="#/automation/history" wide={wide}>
      <p className="text-pb-text dark:text-gray-100">
        <span className="text-2xl font-bold tabular-nums">{week}</span>
        <span className={`text-sm ${TEXT.muted}`}> in 7 days</span>
      </p>
      <DayBars days={days} height={56} />
      <Legend items={[{ tone: 'info', text: 'Automation' }, { tone: 'mem', text: 'By hand' }, { tone: 'bad', text: 'Failed' }]} />
      {moves.length > 0 && (
        <ul className="flex flex-col gap-1.5 pt-1 border-t border-pb-border/60 dark:border-slate-700/60">
          {moves.map(m => (
            <li key={`${m.vmid}-${m.time}`} className="flex items-baseline gap-2 text-sm min-w-0">
              <Dot tone={m.ok ? 'info' : 'bad'} />
              <span className="min-w-0 flex-1 truncate text-pb-text dark:text-gray-200" title={m.why}><b className="font-semibold">{m.name}</b> {m.from} → {m.to}</span>
              <span className={`text-xs tabular-nums shrink-0 ${TEXT.muted}`}>{eventTime(m.time, ctx.nowMs)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BackupsWidget({ ctx, wide }) {
  const t = ctx.backups;
  if (!t.known) {
    return <Card title="Backups" wide={wide}><Empty>Backup results haven't been collected yet.</Empty></Card>;
  }
  const total = t.good + t.failed.length + t.stale.length + t.none.length;
  const share = total ? Math.round((t.good / total) * 100) : null;
  const runs = ctx.backupRuns;
  const days = runs && !runs.error ? backupsByDay(runs.runs, ctx.nowMs, 14, runs.recorded_from).map(d => ({
    ...d,
    parts: [{ value: d.ok, tone: 'ok' }, { value: d.failed, tone: 'bad' }],
    text: !d.known ? 'not recorded yet' : d.ok + d.failed === 0 ? 'no backups' : `${d.ok} good${d.failed ? `, ${d.failed} failed` : ''}`,
  })) : null;
  return (
    <Card title="Backups" href="#/dashboard/guests" wide={wide}>
      <div className="flex items-center gap-4">
        <Donut size={92} center={share == null ? '—' : `${share}%`} sub="backed up" label={`${t.good} of ${total} guests backed up in the last 3 days`}
          parts={[{ value: t.good, tone: 'ok' }, { value: t.stale.length, tone: 'warn' }, { value: t.failed.length, tone: 'bad' }, { value: t.none.length, tone: 'none' }]} />
        <ul className="flex flex-col gap-1 text-sm min-w-0">
          <li className="flex items-center gap-2"><Dot tone="ok" /><span className="tabular-nums font-semibold">{t.good}</span><span className={TEXT.muted}>in the last 3 days</span></li>
          {t.failed.length > 0 && <li className="flex items-center gap-2 min-w-0"><Dot tone="bad" /><span className="tabular-nums font-semibold">{t.failed.length}</span><span className={`truncate ${TEXT.bad}`}>failed: {listNames(t.failed)}</span></li>}
          {t.stale.length > 0 && <li className="flex items-center gap-2 min-w-0"><Dot tone="warn" /><span className="tabular-nums font-semibold">{t.stale.length}</span><span className={`truncate ${TEXT.muted}`}>older: {listNames(t.stale)}</span></li>}
          {t.none.length > 0 && <li className="flex items-center gap-2 min-w-0"><Dot tone="none" /><span className="tabular-nums font-semibold">{t.none.length}</span><span className={`truncate ${TEXT.muted}`}>none: {listNames(t.none)}</span></li>}
        </ul>
      </div>
      {days && (
        <div>
          <div className={`text-[11px] mb-1 ${TEXT.muted}`}>Backups per day, 14 days</div>
          <DayBars days={days} height={44} showEvery={2} />
        </div>
      )}
    </Card>
  );
}

const METRIC_NAME = { cpu: 'CPU', memory: 'Memory', iowait: 'IO wait' };
const METRIC_TONE = { cpu: 'cpu', memory: 'mem', iowait: 'warn' };

/** History (solid), the trend from now (dashed) and the limit, on one day axis. */
function ForecastLine({ forecast, metric, height = 72 }) {
  const hist = forecast?.history || [];
  const proj = forecast?.projection || [];
  if (hist.length < 2) return null;
  const x0 = hist[0][0];
  const x1 = Math.max(0.5, ...proj.map(p => p[0]));
  const W = 100, H = height;
  const X = (d) => ((d - x0) / (x1 - x0)) * W;
  const Y = (v) => H - (Math.max(0, Math.min(100, v)) / 100) * (H - 2) - 1;
  const line = (pts) => pts.map(([d, v]) => `${X(d).toFixed(2)},${Y(v).toFixed(2)}`).join(' ');
  const tone = METRIC_TONE[metric] || 'cpu';
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full block" style={{ height }} role="img"
        aria-label={`${METRIC_NAME[metric] || metric}: history and trend to the ${forecast.limit}% limit`}>
        <polygon points={`${X(hist[0][0])},${H} ${line(hist)} ${X(hist[hist.length - 1][0])},${H}`} className={tone === 'mem' ? 'fill-violet-500/15' : 'fill-sky-500/15'} />
        <line x1={X(0)} x2={X(0)} y1="0" y2={H} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-slate-300 dark:stroke-slate-600" />
        {typeof forecast.limit === 'number' && (
          <line x1="0" x2={W} y1={Y(forecast.limit)} y2={Y(forecast.limit)} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="stroke-red-500/80" />
        )}
        <polyline points={line(hist)} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className={STROKE[tone]} />
        {proj.length > 1 && <polyline points={line(proj)} fill="none" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" className={STROKE[tone]} />}
      </svg>
      <div className={`relative h-3.5 text-[10px] tabular-nums ${TEXT.muted}`}>
        <span className="absolute left-0">{Math.round(-x0)} d ago</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${X(0)}%` }}>now</span>
        <span className="absolute right-0">+{Math.round(x1)} d</span>
      </div>
    </div>
  );
}

function ForecastWidget({ ctx, wide }) {
  const tr = ctx.trends;
  let body;
  if (tr === undefined) body = <Empty>Checking…</Empty>;
  else if (!tr || tr.error) body = <Empty>Forecasts aren't available right now.</Empty>;
  else {
    const items = projectedCrossings(tr);
    const horizon = spanPhrase(checkedHorizon(tr).days);
    const first = items[0];
    const days = (c) => (c.days == null ? null : Math.max(1, Math.round(c.days)));
    body = !first ? (
      <div className="flex items-center gap-3">
        <Ring value={1} max={1} tone="ok" center="✓" size={48} stroke={5} label="No limit coming up" />
        <Empty>No node is heading for a limit in the next {horizon}.</Empty>
      </div>
    ) : (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-pb-text dark:text-gray-200"><b className="font-semibold">{first.node}</b> {METRIC_NAME[first.metric] || first.metric}</span>
          <span className={`text-sm font-semibold ${first.kind === 'over' || (days(first) ?? 99) <= 7 ? TEXT.bad : TEXT.warn}`}>
            {first.kind === 'over' ? (days(first) != null ? `over limit · full in ~${days(first)} d` : 'over limit, rising') : `limit in ~${days(first)} d`}
            {first.rough && <span className={`font-normal ${TEXT.muted}`}> (rough)</span>}
          </span>
        </div>
        <ForecastLine forecast={first.forecast} metric={first.metric} />
        <Legend items={[{ tone: METRIC_TONE[first.metric] || 'cpu', text: 'History, then trend (dashed)' }, { tone: 'bad', text: `${first.limit}% limit` }]} />
        {items.length > 1 && (
          <ul className="flex flex-col gap-1 text-sm pt-1 border-t border-pb-border/60 dark:border-slate-700/60">
            {items.slice(1, 4).map(c => (
              <li key={`${c.node}-${c.metric}`} className="flex items-center gap-2">
                <Dot tone={c.kind === 'over' || (days(c) ?? 99) <= 7 ? 'bad' : 'warn'} />
                <span className="flex-1 min-w-0 truncate text-pb-text dark:text-gray-200"><b className="font-semibold">{c.node}</b> {METRIC_NAME[c.metric] || c.metric}</span>
                <span className={`text-xs tabular-nums ${TEXT.muted}`}>{c.kind === 'over' ? 'over now' : `~${days(c)} d`}</span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
  return <Card title="Coming up" href="#/insights" wide={wide}>{body}</Card>;
}

function AutomationWidget({ ctx, wide }) {
  const st = ctx.automationStatus;
  const s = getStatus(st);
  const last = st?.state?.last_run;
  const lastLabel = last && typeof last === 'object' ? runStatusLabel(last) : null;
  const next = st?.enabled ? getNextCheck(st) : null;
  const tone = !st?.enabled ? 'none' : s.color === 'green' ? 'ok' : 'warn';
  const runs = ctx.runHistory?.length ? ctx.runHistory : (last && typeof last === 'object' ? [last] : []);
  return (
    <Card title="Automation" href="#/automation" wide={wide}>
      <div className="flex items-center gap-2.5">
        <Dot tone={tone} />
        <span className="text-xl font-bold text-pb-text dark:text-gray-100">{s.label}</span>
      </div>
      <p className={`text-sm ${TEXT.muted}`}>
        {[
          lastLabel ? `Last check ${agoText(last.timestamp)}: ${lastLabel.label.toLowerCase()}` : 'No check yet',
          next ? (next === 'now' ? 'next check now' : next.startsWith('every') ? `checks ${next}` : `next in ${next}`) : null,
        ].filter(Boolean).join(' · ')}
      </p>
      {st?.enabled && runs.length > 0 && (
        <div>
          <div className={`text-[11px] mb-1 ${TEXT.muted}`}>Checks, last 24 h (tap one)</div>
          <RunStrip runs={runs} ctx={{ now: new Date(ctx.nowMs) }} />
        </div>
      )}
    </Card>
  );
}

function ApprovalsWidget({ ctx, wide }) {
  const st = ctx.automationStatus;
  const items = pendingApprovals(st?.approval_queue).map(e => approvalRow(e));
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState(null);
  const dry = !!st?.dry_run;
  const act = async (vmid, action) => {
    setBusy(b => ({ ...b, [vmid]: action }));
    const r = action === 'approve' ? await approveQueuedMove(vmid) : await dismissQueuedMove(vmid);
    setBusy(b => { const n = { ...b }; delete n[vmid]; return n; });
    setMsg(r?.error ? { bad: true, text: r.message } : (r?.message ? { text: r.message } : null));
    ctx.fetchAutomationStatus?.();
  };
  return (
    <Card title="Waiting for approval" href="#/automation" wide={wide}>
      {st?.mode !== 'semi' && items.length === 0 ? <Empty>Automation isn't asking for approval (it's not in semi-automatic mode).</Empty>
        : items.length === 0 ? <Empty>Nothing waiting.</Empty> : (
          <ul className="flex flex-col gap-3">
            {items.map(it => (
              <li key={it.vmid} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-pb-text dark:text-gray-200"><b className="font-semibold">{it.name}</b> {it.route}</div>
                  <div className={`text-xs ${TEXT.muted}`}>{it.why}</div>
                </div>
                {ctx.canMigrate && !dry && (
                  <div className="flex gap-2 shrink-0">
                    <button type="button" disabled={!!busy[it.vmid]} onClick={() => act(it.vmid, 'approve')} className={`${BTN_PRIMARY} text-xs`}>
                      {busy[it.vmid] === 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                    <button type="button" disabled={!!busy[it.vmid]} onClick={() => act(it.vmid, 'dismiss')} className={`${BTN_SECONDARY} text-xs`}>Skip</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      {dry && items.length > 0 && <p className={`text-xs ${TEXT.warn}`}>Dry run is on, so approving is off.</p>}
      {msg && <p className={`text-xs ${msg.bad ? TEXT.bad : TEXT.muted}`}>{msg.text}</p>}
    </Card>
  );
}

/** The last 24 hours as one track, a mark per event, ticks every 6 hours. */
function DayTrack({ events, nowMs }) {
  return (
    <div className="relative h-8" role="img" aria-label={`${events.length} events in the last 24 hours`}>
      <div className="absolute left-0 right-0 top-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60" />
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <span key={f} className={`absolute top-5 text-[10px] tabular-nums ${TEXT.muted} ${f === 0 ? '' : f === 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
          style={{ left: `${f * 100}%` }}>{f === 1 ? 'now' : `-${Math.round((1 - f) * 24)} h`}</span>
      ))}
      {events.map((e, i) => (
        <span key={i} title={e.text} className={`absolute top-2 w-3.5 h-3.5 -translate-x-1/2 rounded-full ring-2 ring-white dark:ring-slate-900 ${DOT[e.tone] || DOT.none}`}
          style={{ left: `${trackPos(e.time, nowMs) * 100}%` }} />
      ))}
    </div>
  );
}

function TimelineWidget({ ctx, wide }) {
  const all = timelineEvents({ migrations: ctx.migrations, guests: ctx.data?.guests, nowMs: ctx.nowMs });
  const ev = all.slice(0, 8);
  return (
    <Card title="What happened, last 24 h" href="#/automation/history" linkText="History" wide={wide}>
      {ctx.migrations == null ? <Empty>Loading…</Empty> : all.length === 0 ? <Empty>Nothing happened in the last 24 hours.</Empty> : (
        <>
          <DayTrack events={all} nowMs={ctx.nowMs} />
          <ol className="flex flex-col">
            {ev.map((e, i) => (
              <li key={`${e.time}-${i}`} className="grid grid-cols-[3.75rem_0.75rem_minmax(0,1fr)] gap-2.5 text-sm py-1.5">
                <span className={`text-xs tabular-nums pt-0.5 ${TEXT.muted}`}>{eventTime(e.time, ctx.nowMs)}</span>
                <span className="relative flex justify-center">
                  {i < ev.length - 1 && <span aria-hidden="true" className="absolute top-3 -bottom-3 w-px bg-slate-200 dark:bg-slate-700" />}
                  <Dot tone={e.tone} className="mt-1 relative" />
                </span>
                <a href={e.href} className="min-w-0 hover:underline">
                  <div className="text-pb-text dark:text-gray-200">{e.text}</div>
                  {e.detail && <div className={`text-xs truncate ${TEXT.muted}`} title={e.detail}>{e.detail}</div>}
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

function CapacityWidget({ ctx, wide }) {
  const r = roomLeft(ctx.data?.nodes, { memLimit: ctx.memThreshold, maintenanceNodes: ctx.maintenanceNodes });
  const rows = nodeRows(ctx.data?.nodes, { cpuLimit: ctx.cpuThreshold, memLimit: ctx.memThreshold, maintenanceNodes: ctx.maintenanceNodes });
  const fit = new Map((r?.per || []).map(p => [p.name, p.fit]));
  return (
    <Card title="Room left" href="#/insights" wide={wide}>
      {!r ? <Empty>No memory limit set.</Empty> : (
        <>
          <p className="text-pb-text dark:text-gray-100">
            <span className="text-2xl font-bold tabular-nums">{r.count}</span>
            <span className={`text-sm ${TEXT.muted}`}> more {r.sizeGb} GB guests fit under {r.memLimit}% memory</span>
          </p>
          <div className="flex flex-col gap-2">
            {rows.map(n => (
              <div key={n.name} className="grid grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
                <span className="truncate font-semibold text-pb-text dark:text-gray-200">{n.name}</span>
                <div className="relative h-3 rounded bg-slate-100 dark:bg-slate-700/60">
                  {n.mem != null && <div className={`absolute inset-y-0 left-0 rounded ${FILL[n.memTone]}`} style={{ width: `${Math.min(100, n.mem)}%` }} />}
                  <span aria-hidden="true" className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-pb-text dark:bg-gray-200" style={{ left: `${r.memLimit}%` }} />
                </div>
                <span className={`text-right tabular-nums ${TEXT.muted}`} title={`${r.sizeGb} GB guests that still fit`}>
                  {fit.has(n.name) ? `+${fit.get(n.name)}` : '—'}
                </span>
              </div>
            ))}
          </div>
          <p className={`text-[11px] ${TEXT.muted}`}>Bar = memory used; line = your {r.memLimit}% limit; number = guests that still fit.</p>
        </>
      )}
    </Card>
  );
}

function GuestsWidget({ ctx, wide }) {
  const rows = guestSpread(ctx.data?.nodes, ctx.data?.guests);
  const max = Math.max(1, ...rows.map(r => r.running + r.stopped));
  const running = rows.reduce((a, r) => a + r.running, 0);
  const stopped = rows.reduce((a, r) => a + r.stopped, 0);
  return (
    <Card title="Guests" href="#/dashboard/guests" wide={wide}>
      <div className="flex items-center gap-4">
        <Donut size={80} stroke={10} center={running + stopped} sub="guests" label={`${running} running, ${stopped} stopped`}
          parts={[{ value: running, tone: 'info' }, { value: stopped, tone: 'none' }]} />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {rows.map(r => (
            <div key={r.name} className="grid grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
              <span className="truncate font-semibold text-pb-text dark:text-gray-200">{r.name}</span>
              <div className="flex h-3 rounded overflow-hidden bg-slate-100 dark:bg-slate-700/60">
                <span className={FILL.info} style={{ width: `${(r.running / max) * 100}%` }} />
                <span className={FILL.none} style={{ width: `${(r.stopped / max) * 100}%` }} />
              </div>
              <span className={`text-right tabular-nums ${TEXT.muted}`}>{r.running + r.stopped}</span>
            </div>
          ))}
        </div>
      </div>
      <Legend items={[{ tone: 'info', text: `${running} running` }, { tone: 'none', text: `${stopped} stopped` }]} />
    </Card>
  );
}

function MaintenanceWidget({ ctx, wide }) {
  const nodes = ctx.data?.nodes || {};
  const maint = toNodeSet(ctx.maintenanceNodes);
  const names = Object.keys(nodes).filter(n => maint.has(n)).sort();
  return (
    <Card title="Maintenance" href="#/dashboard/nodes" wide={wide}>
      {names.length === 0 ? <Empty>No node in maintenance.</Empty> : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {names.map(n => {
            const left = (nodes[n].guests || []).filter(v => ctx.data?.guests?.[v]?.status === 'running').length;
            return (
              <li key={n} className="flex items-center gap-2.5">
                <Dot tone={left === 0 ? 'ok' : 'warn'} />
                <span className="text-pb-text dark:text-gray-200"><b className="font-semibold">{n}</b> · {left === 0 ? 'empty, ready for work' : `${left} running guest${left === 1 ? '' : 's'} still on it`}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const RENDER = {
  status: StatusWidget, attention: AttentionWidget, nodes: NodesWidget, moves: MovesWidget,
  backups: BackupsWidget, forecast: ForecastWidget, automation: AutomationWidget,
  approvals: ApprovalsWidget, timeline: TimelineWidget, capacity: CapacityWidget,
  maintenance: MaintenanceWidget, guests: GuestsWidget,
};

// ---------------------------------------------------------------------------
// Customize dialog
// ---------------------------------------------------------------------------

function CustomizeDialog({ layout, setLayout, onClose }) {
  const picked = new Map(layout.map((x, i) => [x.id, i]));
  const order = [...layout.map(x => x.id), ...WIDGETS.map(w => w.id).filter(id => !picked.has(id))];
  const preset = matchingPreset(layout);
  const iconBtn = 'w-8 h-8 rounded-md border border-pb-border dark:border-slate-600 bg-pb-surface2 dark:bg-slate-800 text-sm disabled:opacity-30';
  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} max-w-lg`} onClick={e => e.stopPropagation()} role="dialog" aria-label="Customize the simple view">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-pb-text dark:text-white">Customize</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <p className={`text-sm mb-3 ${TEXT.muted}`}>Saved in this browser only, so a wall screen and a phone can differ.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setLayout(presetLayout(p.id))}
              className={`px-3 py-1 rounded-full text-sm border ${preset === p.id ? 'border-blue-500 text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/15' : 'border-pb-border dark:border-slate-600 text-pb-text dark:text-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <ul className="flex flex-col max-h-[60vh] overflow-y-auto -mx-1">
          {order.map(id => {
            const w = widgetById(id);
            const idx = picked.get(id);
            const on = idx !== undefined;
            return (
              <li key={id} className="flex items-center gap-3 px-1 py-2 border-b border-pb-border/60 dark:border-slate-700/60 last:border-b-0">
                <input type="checkbox" id={`sw-${id}`} checked={on} onChange={() => setLayout(toggleWidget(layout, id))} className="w-4 h-4 accent-blue-600" />
                <label htmlFor={`sw-${id}`} className="min-w-0 flex-1 cursor-pointer">
                  <div className="text-sm text-pb-text dark:text-gray-200">{w.name}</div>
                  <div className={`text-xs ${TEXT.muted}`}>{w.desc}</div>
                </label>
                {on && (
                  <div className="flex gap-1 shrink-0">
                    <button type="button" className={iconBtn} disabled={idx === 0} onClick={() => setLayout(moveWidget(layout, id, -1))} aria-label={`Move ${w.name} up`}>↑</button>
                    <button type="button" className={iconBtn} disabled={idx === layout.length - 1} onClick={() => setLayout(moveWidget(layout, id, 1))} aria-label={`Move ${w.name} down`}>↓</button>
                    <button type="button" className={`${iconBtn} hidden md:inline-block ${layout[idx].wide ? '!border-blue-500 text-blue-600 dark:text-blue-300' : ''}`}
                      aria-pressed={layout[idx].wide} onClick={() => setLayout(toggleWide(layout, id))} title="Full width" aria-label={`Make ${w.name} full width`}>⇔</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end mt-4">
          <button type="button" onClick={onClose} className={BTN_PRIMARY}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Simple view (#/simple): only whether the cluster is fine, what it did and
 * what needs you, as widgets the viewer picks. Every widget links to the
 * full page it summarizes.
 */
export default function SimpleView({
  data, config, nodeScores, maintenanceNodes,
  cpuThreshold, memThreshold, iowaitThreshold,
  automationStatus, fetchAutomationStatus, runHistory, canMigrate, API_BASE,
}) {
  const [layout, setLayoutState] = useState(readLayout);
  const setLayout = (l) => { setLayoutState(l); writeLayout(l); };
  const [customizing, setCustomizing] = useState(false);
  const [migrations, setMigrations] = useState(null);
  const [trends, setTrends] = useState(undefined);
  const [backupRuns, setBackupRuns] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const collectedAt = data?.collected_at;
  const ids = new Set(layout.map(x => x.id));
  const wantsMoves = ids.has('moves') || ids.has('timeline') || ids.has('status');
  const wantsBackupRuns = ids.has('backups');
  const wantsTrends = ids.has('forecast') || ids.has('attention');

  useEffect(() => {
    if (!wantsMoves) return undefined;
    let alive = true;
    const load = () => fetch(`${API_BASE}/automigrate/history?type=migrations&limit=100`)
      .then(r => r.json()).then(j => { if (alive) setMigrations(j.migrations || []); })
      .catch(() => { if (alive) setMigrations([]); });
    load();
    const t = setInterval(() => { load(); setNowMs(Date.now()); }, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [wantsMoves, API_BASE]);

  useEffect(() => {
    if (!wantsTrends) return undefined;
    let alive = true;
    fetchNodeTrends(7, cpuThreshold, memThreshold, { iowaitThreshold, series: ids.has('forecast') })
      .then(r => { if (alive) setTrends(r); });
    return () => { alive = false; };
  }, [wantsTrends, ids.has('forecast'), collectedAt, cpuThreshold, memThreshold, iowaitThreshold]);

  useEffect(() => {
    if (!wantsBackupRuns) return undefined;
    let alive = true;
    fetch(`${API_BASE}/backups/runs?days=14`)
      .then(r => r.json()).then(j => { if (alive) setBackupRuns(j.success ? j : { error: true }); })
      .catch(() => { if (alive) setBackupRuns({ error: true }); });
    return () => { alive = false; };
  }, [wantsBackupRuns, collectedAt, API_BASE]);

  const backups = useMemo(() => backupTally(data?.guests), [data]);
  const crossings = trends && !trends.error ? projectedCrossings(trends) : [];
  const needs = needsYou({
    attention: attentionItems({ data, config, automationStatus, maintenanceNodes, nodeScores }),
    approvals: pendingApprovals(automationStatus?.approval_queue),
    backups,
    crossings,
  });
  const ctx = {
    data, nowMs, migrations, trends, backups, backupRuns, needs, maintenanceNodes,
    cpuThreshold, memThreshold, automationStatus, fetchAutomationStatus, runHistory, canMigrate,
  };

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-semibold text-pb-text dark:text-gray-100">Overview</h1>
        <button type="button" onClick={() => setCustomizing(true)} className={`${BTN_SECONDARY} text-sm`}>
          <Settings size={14} /> Customize
        </button>
      </div>
      {!data ? <Empty>Loading cluster data…</Empty> : layout.length === 0 ? (
        <div className={WALL_PANEL}><Empty>No widgets picked. Use Customize to add some.</Empty></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {layout.map(it => {
            const W = RENDER[it.id];
            return W ? <W key={it.id} ctx={ctx} wide={it.wide} /> : null;
          })}
        </div>
      )}
      {customizing && <CustomizeDialog layout={layout} setLayout={setLayout} onClose={() => setCustomizing(false)} />}
    </main>
  );
}
