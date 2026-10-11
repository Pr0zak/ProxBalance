import {
  ArrowRight, ChevronDown, ClipboardList, Download, RefreshCw, Search,
} from '../Icons.jsx';
import {
  GLASS_CARD, INNER_CARD, BTN_SECONDARY, INPUT_FIELD, SELECT_FIELD, TABLE_HEADER, TABLE_ROW,
  statusBadge, headroomTextColor,
} from '../../utils/designTokens.js';
import SectionHeader from '../SectionHeader.jsx';
import TabBar from '../TabBar.jsx';
import { parseTimestamp } from '../../utils/formatters.js';
import { API_BASE } from '../../utils/constants.js';

const { useState, useEffect, useMemo } = React;

const LOG_TABS = [
  { id: 'history', label: 'Migration History' },
  { id: 'logs', label: 'Script Logs' },
];

const STATUS_COLOR = { completed: 'green', failed: 'red', timeout: 'orange', running: 'blue', pending: 'blue' };

const tsOf = (m) => parseTimestamp(m.timestamp)?.getTime() || 0;

function fmtWhen(m) {
  const d = parseTimestamp(m.timestamp);
  if (!d) return m.timestamp || '';
  const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleString(undefined, opts);
}

function fmtDuration(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return '–';
  const s = Math.round(Number(sec));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/** Who started the migration: automation run or a person. */
function startedBy(m) {
  const v = String(m.initiated_by || m.trigger || '').toLowerCase();
  if (!v) return null;
  if (v.startsWith('auto') || v === 'scheduler' || v === 'timer') return 'Automation';
  if (v === 'manual' || v === 'user' || v === 'ui' || v === 'api') return 'Manual';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

const guestName = (m) => m.name || m.guest_name || `Guest ${m.vmid}`;

function StatusBadge({ m }) {
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className={statusBadge(STATUS_COLOR[m.status] || 'gray')}>{m.status || 'unknown'}</span>
      {m.dry_run && <span className={statusBadge('yellow')}>dry run</span>}
    </span>
  );
}

/** "In migration window: During the day (America/Chicago time: 15:30)" -> "During the day". */
function windowLabel(raw) {
  if (!raw) return null;
  return String(raw).replace(/^in migration window:\s*/i, '').replace(/\s*\([^)]*time:[^)]*\)\s*$/i, '').trim() || null;
}

const pct = (v) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');

/**
 * The before/after outcome recorded for a migration, if any. Outcomes are
 * keyed by vmid and the snapshot time taken just before the move, so match on
 * guest, nodes and a start time within 15 minutes of the history entry.
 */
function findOutcome(m, outcomes) {
  if (!outcomes || m.dry_run) return null;
  const t = tsOf(m);
  let best = null;
  let bestGap = 15 * 60 * 1000;
  outcomes.forEach(o => {
    if (String(o.vmid) !== String(m.vmid) || o.source_node !== m.source_node || o.target_node !== m.target_node) return;
    const ot = parseTimestamp(o.pre_migration?.timestamp)?.getTime();
    if (!ot) return;
    const gap = Math.abs(t - ot);
    if (gap <= bestGap) { best = o; bestGap = gap; }
  });
  return best;
}

const VERDICT = {
  beneficial: ['helped', 'text-green-600 dark:text-green-400'],
  neutral: ['made little difference', 'text-pb-text2 dark:text-gray-400'],
  harmful: ['made it worse', 'text-red-600 dark:text-red-400'],
};

/** "pve5 CPU 89% -> 70% after the move, 73% after 1h, 75% after 24h · helped". */
function OutcomeLine({ m, o }) {
  const before = o.pre_migration?.source_node?.cpu;
  const after = (o.post_migration || o.post_5min)?.source_node?.cpu;
  if (typeof before !== 'number' || typeof after !== 'number') return null;
  const h1 = o.post_1h?.source_node?.cpu;
  const h24 = o.post_24h?.source_node?.cpu;
  const verdict = VERDICT[o.verdict];
  return (
    <span>
      {m.source_node} CPU {pct(before)} just before → {pct(after)} after the move
      {typeof h1 === 'number' && `, ${pct(h1)} after 1h`}
      {typeof h24 === 'number' && `, ${pct(h24)} after 24h`}
      {verdict
        ? <span className={verdict[1]}> · {verdict[0]}</span>
        : (o.status && String(o.status).startsWith('pending') && <span className="text-pb-text2 dark:text-gray-500"> · still measuring</span>)}
    </span>
  );
}

/** Extra facts shown when a row is expanded. */
function Details({ m, outcome }) {
  const headroom = m.suitability_rating !== undefined && m.suitability_rating !== null
    ? Math.round(m.suitability_rating)
    : (m.target_node_score !== undefined && m.target_node_score !== null
      ? Math.max(0, Math.round(100 - Math.min(m.target_node_score || 0, 100))) : null);
  const srcHeadroom = typeof m.source_suitability_rating === 'number' ? Math.round(m.source_suitability_rating) : null;
  const confidence = m.confidence_score ?? m.confidence;
  const win = windowLabel(m.window_name);
  const facts = [
    headroom != null && (srcHeadroom != null
      ? ['Headroom', <>
          {m.source_node} <span className={`font-semibold ${headroomTextColor(srcHeadroom)}`}>{srcHeadroom}</span>
          {' → '}{m.target_node} <span className={`font-semibold ${headroomTextColor(headroom)}`}>{headroom}</span>
        </>]
      : ['Target headroom', <span className={`font-semibold ${headroomTextColor(headroom)}`}>{headroom}/100</span>]),
    // Nearly every migration that runs scores high, so only a low one is worth showing.
    confidence != null && confidence < 70 && ['Confidence', `${Math.round(confidence)}% (low)`],
    win && ['Window', win],
  ].filter(Boolean);
  return (
    <div className="text-xs space-y-1.5">
      <p className="text-pb-text dark:text-gray-200 whitespace-pre-wrap break-words">{m.reason || 'No reason recorded.'}</p>
      {m.error_message && <p className="text-red-600 dark:text-red-400 break-words">Error: {m.error_message}</p>}
      {outcome && <p className="text-pb-text2 dark:text-gray-400">Result: <span className="text-pb-text dark:text-gray-200"><OutcomeLine m={m} o={outcome} /></span></p>}
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-pb-text2 dark:text-gray-400">
          {facts.map(([k, v]) => <span key={k}>{k}: <span className="text-pb-text dark:text-gray-200">{v}</span></span>)}
        </div>
      )}
      {m.task_id && (
        <p className="text-[10px] text-pb-text3 dark:text-gray-500 break-all">
          Proxmox task <span className="font-mono select-all">{m.task_id}</span>
        </p>
      )}
    </div>
  );
}

export default function MigrationLogsSection({
  automationStatus, automigrateLogs,
  migrationHistoryPage, setMigrationHistoryPage,
  migrationHistoryPageSize, setMigrationHistoryPageSize,
  migrationLogsTab, setMigrationLogsTab,
  setAutomigrateLogs, logRefreshTime, setLogRefreshTime,
  fetchAutomationStatus, active = true,
}) {
  // Full history (all time) is loaded when the tab is first opened; until
  // then (or if it fails) the status endpoint's last 7 days are shown.
  const [fullHistory, setFullHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [query, setQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [outcomes, setOutcomes] = useState(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/automigrate/history?type=migrations&limit=5000`);
      const data = await res.json();
      if (data.success && Array.isArray(data.migrations)) setFullHistory(data.migrations);
      const oRes = await fetch(`${API_BASE}/migrate/outcomes?limit=1000`);
      const oData = await oRes.json();
      if (oData.success && Array.isArray(oData.outcomes)) setOutcomes(oData.outcomes);
    } catch (err) {
      console.error('Failed to load migration history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (active && fullHistory === null && !loadingHistory) loadHistory();
  }, [active]);

  const source = fullHistory || automationStatus.recent_migrations || [];
  // Newest first, whatever order the API returns.
  const sorted = useMemo(() => source.slice().sort((a, b) => tsOf(b) - tsOf(a)), [source]);
  const nodes = useMemo(() => {
    const set = new Set();
    sorted.forEach(m => { if (m.source_node) set.add(m.source_node); if (m.target_node) set.add(m.target_node); });
    return [...set].sort();
  }, [sorted]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(m => {
      if (nodeFilter && m.source_node !== nodeFilter && m.target_node !== nodeFilter) return false;
      if (!q) return true;
      return guestName(m).toLowerCase().includes(q) || String(m.vmid ?? '').includes(q);
    });
  }, [sorted, query, nodeFilter]);

  const pageSize = migrationHistoryPageSize || 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, migrationHistoryPage), pageCount);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const setPage = (p) => setMigrationHistoryPage(Math.min(Math.max(1, p), pageCount));

  const keyOf = (m, i) => m.id || m.migration_id || `${m.vmid}-${m.timestamp}-${i}`;
  const toggle = (k) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const refresh = () => { fetchAutomationStatus?.(); loadHistory(); };

  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <SectionHeader title="Migration Logs & History" icon={ClipboardList} accent={['green', 'emerald']} />

      <TabBar tabs={LOG_TABS} active={migrationLogsTab} onChange={setMigrationLogsTab} className="mb-4" />

      {migrationLogsTab === 'history' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[10rem] sm:max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pb-text2 dark:text-gray-500 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setMigrationHistoryPage(1); }}
                placeholder="Guest name or ID"
                className={`${INPUT_FIELD} !pl-8 !py-1.5`}
                aria-label="Filter by guest"
              />
            </div>
            <select
              value={nodeFilter}
              onChange={(e) => { setNodeFilter(e.target.value); setMigrationHistoryPage(1); }}
              className={`${SELECT_FIELD} !py-1.5 text-xs`}
              aria-label="Filter by node"
            >
              <option value="">All nodes</option>
              {nodes.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setMigrationHistoryPageSize(Number(e.target.value)); setMigrationHistoryPage(1); }}
              className={`${SELECT_FIELD} !py-1.5 text-xs`}
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button onClick={refresh} className={`${BTN_SECONDARY} !px-3 !py-1.5 ml-auto`} title="Refresh">
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="text-xs text-pb-text2 dark:text-gray-400 mb-2">
            {filtered.length === 0
              ? (source.length === 0 ? (loadingHistory ? 'Loading…' : 'No migrations recorded') : 'No migrations match')
              : `${filtered.length.toLocaleString()} migration${filtered.length === 1 ? '' : 's'}${fullHistory ? '' : ' in the last 7 days'}, newest first · tap one for the full reason`}
          </div>

          {/* Phone: one card per migration */}
          <div className="sm:hidden space-y-2">
            {rows.map((m, i) => {
              const k = keyOf(m, i);
              const open = expanded.has(k);
              const by = startedBy(m);
              return (
                <button
                  key={k}
                  onClick={() => toggle(k)}
                  aria-expanded={open}
                  className={`${INNER_CARD} !p-3 w-full text-left block`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-pb-text dark:text-white truncate">
                        {guestName(m)} <span className="font-normal text-pb-text2 dark:text-gray-400">{m.vmid}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-mono text-pb-text2 dark:text-gray-400">
                        {m.source_node} <ArrowRight size={12} /> {m.target_node}
                      </div>
                    </div>
                    <StatusBadge m={m} />
                  </div>
                  <div className="text-xs text-pb-text2 dark:text-gray-400 mt-1 tabular-nums">
                    {fmtWhen(m)} · {fmtDuration(m.duration_seconds)}{by ? ` · ${by}` : ''}
                  </div>
                  <div className="mt-1.5 flex items-start gap-1">
                    {open ? (
                      <div className="flex-1 min-w-0"><Details m={m} outcome={findOutcome(m, outcomes)} /></div>
                    ) : (
                      <p className="flex-1 min-w-0 text-xs text-pb-text dark:text-gray-300 line-clamp-2">{m.reason || 'No reason recorded.'}</p>
                    )}
                    <ChevronDown size={14} className={`shrink-0 mt-0.5 text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop: table, click a row to expand */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-pb-border-dark">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TABLE_HEADER}>When</th>
                  <th className={TABLE_HEADER}>Guest</th>
                  <th className={TABLE_HEADER}>Move</th>
                  <th className={TABLE_HEADER}>Status</th>
                  <th className={`${TABLE_HEADER} whitespace-nowrap`}>Started by</th>
                  <th className={TABLE_HEADER}>Duration</th>
                  <th className={`${TABLE_HEADER} w-full`}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => {
                  const k = keyOf(m, i);
                  const open = expanded.has(k);
                  return [
                    <tr
                      key={k}
                      onClick={() => toggle(k)}
                      aria-expanded={open}
                      className={`${TABLE_ROW} cursor-pointer align-top`}
                    >
                      <td className="p-3 text-xs text-pb-text2 dark:text-gray-400 whitespace-nowrap tabular-nums">{fmtWhen(m)}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-medium text-pb-text dark:text-white">{guestName(m)}</span>
                        <span className="ml-1.5 text-xs text-pb-text2 dark:text-gray-400">{m.vmid}</span>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-pb-text2 dark:text-gray-400">
                          {m.source_node} <ArrowRight size={12} /> {m.target_node}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap"><StatusBadge m={m} /></td>
                      <td className="p-3 text-xs text-pb-text2 dark:text-gray-400 whitespace-nowrap">{startedBy(m) || '–'}</td>
                      <td className="p-3 text-xs text-pb-text2 dark:text-gray-400 whitespace-nowrap tabular-nums">{fmtDuration(m.duration_seconds)}</td>
                      <td className="p-3 text-xs text-pb-text dark:text-gray-300 max-w-0 w-full">
                        <div className="flex items-start gap-1">
                          <span className={`flex-1 min-w-0 ${open ? 'text-pb-text2 dark:text-gray-500' : 'truncate'}`}>{open ? 'Details below' : (m.reason || '–')}</span>
                          <ChevronDown size={14} className={`shrink-0 text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </div>
                      </td>
                    </tr>,
                    open && (
                      <tr key={`${k}-d`} className="border-b border-slate-100 dark:border-pb-border-dark/70 bg-slate-50/60 dark:bg-pb-surface2-dark/40">
                        <td colSpan={7} className="px-3 pb-3 pt-1"><Details m={m} outcome={findOutcome(m, outcomes)} /></td>
                      </tr>
                    ),
                  ];
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-pb-text2 dark:text-gray-400">
                      {loadingHistory ? 'Loading…' : 'No migrations to show'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between gap-2 mt-3">
              <span className="text-xs text-pb-text2 dark:text-gray-400 tabular-nums">Page {page} of {pageCount}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(1)} disabled={page === 1} className={`${BTN_SECONDARY} !px-2.5 !py-1 !text-xs hidden sm:inline-flex`}>Newest</button>
                <button onClick={() => setPage(page - 1)} disabled={page === 1} className={`${BTN_SECONDARY} !px-2.5 !py-1 !text-xs`}>Newer</button>
                <button onClick={() => setPage(page + 1)} disabled={page >= pageCount} className={`${BTN_SECONDARY} !px-2.5 !py-1 !text-xs`}>Older</button>
                <button onClick={() => setPage(pageCount)} disabled={page >= pageCount} className={`${BTN_SECONDARY} !px-2.5 !py-1 !text-xs hidden sm:inline-flex`}>Oldest</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Script Logs */}
      {migrationLogsTab === 'logs' && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-y-3">
            <div className="text-xs text-pb-text2 dark:text-gray-400 min-w-0">
              {logRefreshTime && `Last updated: ${logRefreshTime}`}
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${API_BASE}/automigrate/logs?lines=500`);
                    const data = await response.json();
                    if (data.success) {
                      setAutomigrateLogs(data.logs);
                      setLogRefreshTime(new Date().toLocaleTimeString());
                    }
                  } catch (error) {
                    console.error('Error fetching logs:', error);
                  }
                }}
                className={`${BTN_SECONDARY} !px-3 !py-1.5`}
                title="Refresh logs"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => {
                  if (!automigrateLogs) return;
                  const blob = new Blob([automigrateLogs], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `automigrate-logs-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                disabled={!automigrateLogs}
                className={`${BTN_SECONDARY} !px-3 !py-1.5`}
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>
          <div className="bg-slate-900 dark:bg-black rounded-lg border border-slate-700 p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {automigrateLogs || 'Click "Refresh" to load logs...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
