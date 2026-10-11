import { AlertTriangle, ChevronRight } from '../Icons.jsx';
import { parseTimestamp, runStatusLabel, runFailureReason } from '../../utils/formatters.js';
import { DetailModal } from './RunHistoryDisplay.jsx';
import { LogViewer, unitState, STATE_TEXT } from '../settings/AdvancedSystemSettings.jsx';
import { MODAL_OVERLAY, MODAL_CONTAINER, BTN_PRIMARY, BTN_SECONDARY } from '../../utils/designTokens.js';
import { API_BASE } from '../../utils/constants.js';
import { X, RefreshCw } from '../Icons.jsx';

const { useState, useEffect } = React;
import { tightestNode, toNodeSet } from '../../utils/nodeCondition.js';

// Below this headroom a node is called out even if nothing else is wrong.
const LOW_HEADROOM = 30;

function ago(date) {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

/**
 * Work out what, if anything, needs the operator's attention. Pure, so other
 * screens can reuse the rules.
 *
 * @returns {Array<{ id, label, detail, href, tone: 'warn'|'error' }>}
 */
export function attentionItems({ data, config, automationStatus, maintenanceNodes, nodeScores }) {
  const items = [];

  // Collector data older than twice the collection interval.
  const collected = parseTimestamp(data?.collected_at);
  const intervalMin = Number(config?.collection_interval_minutes) || 0;
  if (collected && intervalMin > 0) {
    const ageMin = (Date.now() - collected.getTime()) / 60000;
    if (ageMin > 2 * intervalMin) {
      items.push({
        id: 'stale',
        label: `Data ${ago(collected)} old`,
        detail: `Data on this page was collected ${collected.toLocaleString()}; the collector runs every ${intervalMin} min. Click for the collector's status and log.`,
        href: '#/settings/system',
        collector: true,
        tone: ageMin > 6 * intervalMin ? 'error' : 'warn',
      });
    }
  }

  // Last automation run failed.
  const lastRun = automationStatus?.state?.last_run;
  if (automationStatus?.enabled && lastRun && typeof lastRun === 'object' && runStatusLabel(lastRun).tone === 'error') {
    const when = parseTimestamp(lastRun.timestamp);
    const reason = runFailureReason(lastRun);
    items.push({
      id: 'run-failed',
      label: reason ? `Last automation run failed: ${reason.length > 60 ? `${reason.slice(0, 58)}…` : reason}` : 'Last automation run failed',
      detail: `${when ? `Run at ${when.toLocaleString()}` : 'Last run'}${reason ? `: ${reason}` : ''}. Click for the run's details.`,
      href: '#/automation/history',
      run: lastRun,
      tone: 'error',
    });
  }

  // Nodes in maintenance.
  const maint = [...toNodeSet(maintenanceNodes)];
  if (maint.length > 0) {
    items.push({
      id: 'maintenance',
      label: maint.length === 1 ? `${maint[0]} in maintenance` : `${maint.length} nodes in maintenance`,
      detail: `In maintenance: ${maint.join(', ')}`,
      href: '#/dashboard/nodes',
      tone: 'warn',
    });
  }

  // Online, non-maintenance nodes with little headroom (same values as the Nodes table).
  const nodes = data?.nodes || {};
  const low = Object.entries(nodeScores || {})
    .filter(([name, s]) => typeof s?.suitability_rating === 'number'
      && s.suitability_rating < LOW_HEADROOM
      && !maint.includes(name)
      && (!nodes[name] || nodes[name].status === 'online'))
    .sort((a, b) => a[1].suitability_rating - b[1].suitability_rating);
  if (low.length > 0) {
    const t = tightestNode(Object.fromEntries(low), { nodes, maintenanceNodes: maint });
    items.push({
      id: 'low-headroom',
      label: low.length === 1
        ? `${t.name} is short on room (headroom ${Math.round(t.rating)})${t.top ? ` — mostly: ${t.top.description}` : ''}`
        : `${low.length} nodes under ${LOW_HEADROOM} headroom`,
      detail: low.map(([n, s]) => `${n}: ${Math.round(s.suitability_rating)}`).join(', '),
      href: '#/dashboard/nodes',
      tone: 'warn',
    });
  }

  return items;
}

/**
 * Opened from the "Data N old" item: whether the collector is running, how
 * its last run ended, when the next is due, and its log, with a button to
 * collect now. The page's data can be old because the collector stopped or
 * failed, or only because this page has not reloaded; this tells them apart.
 */
function CollectorModal({ collectedAt, onClose, onCollect }) {
  const [unit, setUnit] = useState(undefined);
  const [collecting, setCollecting] = useState(false);
  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/services`);
      const body = await res.json();
      setUnit(body?.success ? body.services?.['proxmox-collector'] || null : null);
    } catch (e) { setUnit(null); }
  };
  useEffect(() => { load(); }, []);
  const state = unitState(unit);
  const collect = async () => {
    setCollecting(true);
    try { await onCollect?.(); } finally { setCollecting(false); load(); }
  };
  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} max-w-3xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-pb-text dark:text-white">Data collector</h3>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="text-sm space-y-1 mb-3">
          <p className="text-pb-text2 dark:text-gray-400">
            Data on this page: collected {collectedAt ? collectedAt.toLocaleString() : '—'}
          </p>
          <p className={state ? STATE_TEXT[state.tone] : 'text-pb-text2 dark:text-gray-400'}>
            Collector: {unit === undefined ? 'checking…' : state ? state.text : 'status unavailable'}
          </p>
          {state?.tone === 'green' && (
            <p className="text-pb-text2 dark:text-gray-400">The collector is running normally, so only this page's copy is old. Collect now reloads it.</p>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          {onCollect && (
            <button onClick={collect} disabled={collecting} className={BTN_PRIMARY}>
              <RefreshCw size={14} className={collecting ? 'animate-spin' : ''} /> {collecting ? 'Collecting…' : 'Collect now'}
            </button>
          )}
          <a href="#/settings/system" onClick={onClose} className={BTN_SECONDARY}>All services</a>
        </div>
        <div className="-mx-4">
          <LogViewer service="proxmox-collector" onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

const TONE = {
  warn: 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/15',
  error: 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/15',
};

/** One-line strip above the KPIs, rendered only when something needs attention. */
export default function NeedsAttentionStrip(props) {
  const [openRun, setOpenRun] = useState(null);
  const [showCollector, setShowCollector] = useState(false);
  const items = attentionItems(props);
  if (items.length === 0) return null;
  const anyError = items.some(i => i.tone === 'error');

  const go = (href) => {
    window.location.hash = href;
    if (href.startsWith('#/dashboard/')) {
      document.getElementById('cluster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
    <div
      role="status"
      className={`mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs overflow-x-auto whitespace-nowrap ${anyError
        ? 'bg-red-50 dark:bg-red-900/35 border-red-300 dark:border-red-700/70'
        : 'bg-amber-50 dark:bg-amber-900/35 border-amber-300 dark:border-amber-600/70'}`}
    >
      <span className={`inline-flex items-center gap-1.5 font-semibold shrink-0 ${anyError ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
        <AlertTriangle size={14} />
        <span className="hidden sm:inline">Needs attention</span>
      </span>
      {items.map((item, i) => (
        <React.Fragment key={item.id}>
          {i > 0 && <span className="text-pb-text2 dark:text-gray-600 shrink-0" aria-hidden="true">·</span>}
          <a
            href={item.href}
            onClick={(e) => { e.preventDefault(); if (item.run) setOpenRun(item.run); else if (item.collector) setShowCollector(true); else go(item.href); }}
            title={item.detail}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded shrink-0 transition-colors ${TONE[item.tone]}`}
          >
            {item.label}
            <ChevronRight size={12} className="opacity-60" />
          </a>
        </React.Fragment>
      ))}
    </div>
    {openRun && <DetailModal run={openRun} onClose={() => setOpenRun(null)} />}
    {showCollector && (
      <CollectorModal
        collectedAt={parseTimestamp(props.data?.collected_at)}
        onCollect={props.onCollect}
        onClose={() => setShowCollector(false)}
      />
    )}
    </>
  );
}
