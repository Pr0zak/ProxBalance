import { AlertTriangle, ChevronRight } from '../Icons.jsx';
import { parseTimestamp, runStatusLabel } from '../../utils/formatters.js';
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
        detail: `Last collection ${collected.toLocaleString()}; the collector runs every ${intervalMin} min, so it has missed at least one run.`,
        href: '#/settings/collection',
        tone: ageMin > 6 * intervalMin ? 'error' : 'warn',
      });
    }
  }

  // Last automation run failed.
  const lastRun = automationStatus?.state?.last_run;
  if (automationStatus?.enabled && lastRun && typeof lastRun === 'object' && runStatusLabel(lastRun).tone === 'error') {
    const when = parseTimestamp(lastRun.timestamp);
    items.push({
      id: 'run-failed',
      label: 'Last automation run failed',
      detail: `${when ? `Run at ${when.toLocaleString()}` : 'Last run'}${lastRun.error ? `: ${lastRun.error}` : ''}`,
      href: '#/automation/history',
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
        ? `${t.name} headroom ${Math.round(t.rating)}${t.top ? ` · ${t.top.label}` : ''}`
        : `${low.length} nodes under ${LOW_HEADROOM} headroom`,
      detail: low.map(([n, s]) => `${n}: ${Math.round(s.suitability_rating)}`).join(', '),
      href: '#/dashboard/nodes',
      tone: 'warn',
    });
  }

  return items;
}

const TONE = {
  warn: 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/15',
  error: 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/15',
};

/** One-line strip above the KPIs, rendered only when something needs attention. */
export default function NeedsAttentionStrip(props) {
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
            onClick={(e) => { e.preventDefault(); go(item.href); }}
            title={item.detail}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded shrink-0 transition-colors ${TONE[item.tone]}`}
          >
            {item.label}
            <ChevronRight size={12} className="opacity-60" />
          </a>
        </React.Fragment>
      ))}
    </div>
  );
}
