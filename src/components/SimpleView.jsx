import { X, ChevronRight, Settings } from './Icons.jsx';
import { attentionItems } from './dashboard/NeedsAttentionStrip.jsx';
import { getStatus, getNextCheck } from './dashboard/AutoStatusPill.jsx';
import { projectedCrossings, checkedHorizon, spanPhrase } from './insights/forecastModel.js';
import { fetchNodeTrends, approveQueuedMove, dismissQueuedMove } from '../api/client.js';
import { runStatusLabel } from '../utils/formatters.js';
import { toNodeSet } from '../utils/nodeCondition.js';
import { agoText, approvalRow, pendingApprovals } from '../utils/automationStory.js';
import {
  WIDGETS, PRESETS, widgetById, presetLayout, matchingPreset, readLayout, writeLayout,
  toggleWidget, moveWidget, toggleWide, nodeRows, clusterLine, backupTally, recentMoves,
  roomLeft, timelineEvents, eventTime, needsYou,
} from '../utils/simpleView.js';
import { WALL_PANEL, BTN_PRIMARY, BTN_SECONDARY, MODAL_OVERLAY, MODAL_CONTAINER, TAP_TARGET } from '../utils/designTokens.js';

const { useState, useEffect, useMemo } = React;

const REFRESH_MS = 60000;

// Semantic colours (not the accent): dots, bars and text.
const DOT = { ok: 'bg-green-500', info: 'bg-blue-500', warn: 'bg-amber-500', bad: 'bg-red-500', none: 'bg-slate-400' };
const BAR = { ok: 'bg-green-500', warn: 'bg-amber-500', bad: 'bg-red-500', none: 'bg-slate-300 dark:bg-slate-600' };
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
    <section className={`${WALL_PANEL} flex flex-col gap-3 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-400">{title}</h2>
        {href && <a href={href} className={`text-xs ${LINK} inline-flex items-center`}>{linkText}<ChevronRight size={12} /></a>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }) => <p className={`text-sm ${TEXT.muted}`}>{children}</p>;

function Bar({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <div className="flex justify-between text-[11px] text-pb-text2 dark:text-gray-400">
        <span>{label}</span><span className="tabular-nums">{value == null ? '—' : `${Math.round(value)}%`}</span>
      </div>
      <div className="h-2 rounded bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
        {value != null && <div className={`h-full rounded ${BAR[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

function StatusWidget({ ctx, wide }) {
  const line = clusterLine({
    nodes: ctx.data?.nodes, guests: ctx.data?.guests,
    attentionCount: ctx.needs.length, badCount: ctx.needs.filter(n => n.tone === 'bad').length,
    automationOn: ctx.automationStatus ? !!ctx.automationStatus.enabled : null,
  });
  return (
    <Card title="Cluster" wide={wide}>
      <div className="flex items-center gap-3">
        <Dot tone={line.tone} className="w-3.5 h-3.5" />
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-semibold text-pb-text dark:text-gray-100">{line.text}</p>
          {line.sub && <p className={`text-sm ${TEXT.muted}`}>{line.sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function AttentionWidget({ ctx, wide }) {
  return (
    <Card title="Needs you" wide={wide}>
      {ctx.needs.length === 0 ? <Empty>Nothing needs you.</Empty> : (
        <ul className="flex flex-col gap-1">
          {ctx.needs.map(n => (
            <li key={n.id}>
              <a href={n.href} className={`flex items-center gap-2.5 text-sm rounded-md -mx-1.5 px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-700/40 ${TAP_TARGET}`}>
                <Dot tone={n.tone} />
                <span className="min-w-0 flex-1 text-pb-text dark:text-gray-200">{n.text}</span>
                <ChevronRight size={14} className="shrink-0 text-pb-text3 dark:text-gray-500" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NodesWidget({ ctx, wide }) {
  const rows = nodeRows(ctx.data?.nodes, { cpuLimit: ctx.cpuThreshold, memLimit: ctx.memThreshold, maintenanceNodes: ctx.maintenanceNodes });
  return (
    <Card title="Nodes" href="#/dashboard/nodes" wide={wide}>
      {rows.length === 0 ? <Empty>No node data yet.</Empty> : (
        <div className="flex flex-col gap-2.5">
          {rows.map(r => (
            <div key={r.name} className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,1fr)] gap-3 items-end">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate text-pb-text dark:text-gray-100">{r.name}</div>
                {(!r.online || r.maintenance) && (
                  <div className={`text-[11px] ${r.online ? TEXT.warn : TEXT.bad}`}>{r.online ? 'maintenance' : 'offline'}</div>
                )}
              </div>
              <Bar label="CPU" value={r.cpu} tone={r.cpuTone} />
              <Bar label="Memory" value={r.mem} tone={r.memTone} />
            </div>
          ))}
          <p className={`text-[11px] ${TEXT.muted}`}>Amber at your limits (CPU {ctx.cpuThreshold}%, memory {ctx.memThreshold}%), red at 90%.</p>
        </div>
      )}
    </Card>
  );
}

function MovesWidget({ ctx, wide }) {
  const moves = recentMoves(ctx.migrations, ctx.nowMs).slice(0, 5);
  return (
    <Card title="Moved, last 24 h" href="#/automation/history" wide={wide}>
      {ctx.migrations == null ? <Empty>Loading…</Empty> : moves.length === 0 ? <Empty>No moves in the last 24 hours.</Empty> : (
        <ul className="flex flex-col gap-2">
          {moves.map(m => (
            <li key={`${m.vmid}-${m.time}`} className="flex items-start gap-2.5 text-sm">
              <Dot tone={m.ok ? 'info' : 'bad'} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <div className="text-pb-text dark:text-gray-200"><b className="font-semibold">{m.name}</b> {m.from} → {m.to}</div>
                <div className={`text-xs ${m.ok ? TEXT.muted : TEXT.bad}`}>{m.ok ? m.why : `Failed: ${m.why}`}</div>
              </div>
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
  return (
    <Card title="Backups" href="#/dashboard/guests" wide={wide}>
      <p className="text-pb-text dark:text-gray-100">
        <span className="text-2xl font-bold tabular-nums">{t.good}</span>
        <span className={`text-sm ${TEXT.muted}`}> of {total} guests backed up in the last 3 days</span>
      </p>
      <div className="flex flex-col gap-1 text-sm">
        {t.failed.length > 0 && <p className={TEXT.bad}>{t.failed.length} failed: {listNames(t.failed)}</p>}
        {t.stale.length > 0 && <p className={TEXT.warn}>{t.stale.length} older than 3 days: {listNames(t.stale)}</p>}
        {t.none.length > 0 && <p className={TEXT.warn}>{t.none.length} not backed up: {listNames(t.none)}</p>}
        {t.failed.length + t.stale.length + t.none.length === 0 && <p className={TEXT.ok}>All good.</p>}
      </div>
    </Card>
  );
}

function ForecastWidget({ ctx, wide }) {
  const tr = ctx.trends;
  let body;
  if (tr === undefined) body = <Empty>Checking…</Empty>;
  else if (!tr || tr.error) body = <Empty>Forecasts aren't available right now.</Empty>;
  else {
    const items = projectedCrossings(tr).slice(0, 3);
    const horizon = spanPhrase(checkedHorizon(tr).days);
    body = items.length === 0 ? <Empty>No node is heading for a limit in the next {horizon}.</Empty> : (
      <ul className="flex flex-col gap-2 text-sm">
        {items.map(c => {
          const what = c.metric === 'cpu' ? 'CPU' : c.metric === 'iowait' ? 'IO wait' : 'memory';
          const days = c.days == null ? null : Math.max(1, Math.round(c.days));
          return (
            <li key={`${c.node}-${c.metric}`} className="flex items-start gap-2.5">
              <Dot tone={c.kind === 'over' || (days != null && days <= 7) ? 'bad' : 'warn'} className="mt-1.5" />
              <span className="text-pb-text dark:text-gray-200">
                <b className="font-semibold">{c.node}</b> {what}{' '}
                {c.kind === 'over'
                  ? (days != null ? `is over its ${c.limit}% limit and full in about ${days} days` : `is over its ${c.limit}% limit and rising`)
                  : `reaches its ${c.limit}% limit in about ${days} days`}
                {c.rough && <span className={TEXT.muted}> (rough)</span>}
              </span>
            </li>
          );
        })}
      </ul>
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

function TimelineWidget({ ctx, wide }) {
  const ev = timelineEvents({ migrations: ctx.migrations, guests: ctx.data?.guests, nowMs: ctx.nowMs }).slice(0, 8);
  return (
    <Card title="What happened, last 24 h" href="#/automation/history" linkText="History" wide={wide}>
      {ctx.migrations == null ? <Empty>Loading…</Empty> : ev.length === 0 ? <Empty>Nothing happened in the last 24 hours.</Empty> : (
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
      )}
    </Card>
  );
}

function CapacityWidget({ ctx, wide }) {
  const r = roomLeft(ctx.data?.nodes, { memLimit: ctx.memThreshold, maintenanceNodes: ctx.maintenanceNodes });
  return (
    <Card title="Room left" href="#/insights" wide={wide}>
      {!r ? <Empty>No memory limit set.</Empty> : (
        <>
          <p className="text-pb-text dark:text-gray-100">
            <span className="text-2xl font-bold tabular-nums">{r.count}</span>
            <span className={`text-sm ${TEXT.muted}`}> more {r.sizeGb} GB guests fit before nodes pass {r.memLimit}% memory</span>
          </p>
          {r.per.length > 0 && (
            <p className={`text-xs ${TEXT.muted}`}>{r.per.slice(0, 4).map(p => `${p.name} ${p.fit}`).join(' · ')}</p>
          )}
        </>
      )}
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
                <Dot tone="warn" />
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
  maintenance: MaintenanceWidget,
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
  automationStatus, fetchAutomationStatus, canMigrate, API_BASE,
}) {
  const [layout, setLayoutState] = useState(readLayout);
  const setLayout = (l) => { setLayoutState(l); writeLayout(l); };
  const [customizing, setCustomizing] = useState(false);
  const [migrations, setMigrations] = useState(null);
  const [trends, setTrends] = useState(undefined);
  const [nowMs, setNowMs] = useState(Date.now());
  const collectedAt = data?.collected_at;
  const ids = new Set(layout.map(x => x.id));
  const wantsMoves = ids.has('moves') || ids.has('timeline');
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
    fetchNodeTrends(7, cpuThreshold, memThreshold, { iowaitThreshold })
      .then(r => { if (alive) setTrends(r); });
    return () => { alive = false; };
  }, [wantsTrends, collectedAt, cpuThreshold, memThreshold, iowaitThreshold]);

  const backups = useMemo(() => backupTally(data?.guests), [data]);
  const crossings = trends && !trends.error ? projectedCrossings(trends) : [];
  const needs = needsYou({
    attention: attentionItems({ data, config, automationStatus, maintenanceNodes, nodeScores }),
    approvals: pendingApprovals(automationStatus?.approval_queue),
    backups,
    crossings,
  });
  const ctx = {
    data, nowMs, migrations, trends, backups, needs, maintenanceNodes,
    cpuThreshold, memThreshold, automationStatus, fetchAutomationStatus, canMigrate,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
