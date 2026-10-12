import { KPI_CARD, scoreColor } from '../../utils/designTokens.js';
import { Server, Activity, Clock, MoveRight } from '../Icons.jsx';
import ClusterHealthBreakdown from './ClusterHealthBreakdown.jsx';
import { spreadText } from './ScoreBreakdown.jsx';
import InFlightModal, { inFlightMigrations } from './InFlightModal.jsx';
import { getStatus, getNextCheck } from './AutoStatusPill.jsx';
import { tightestNode, toNodeSet } from '../../utils/nodeCondition.js';
import { parseTimestamp } from '../../utils/formatters.js';
import { nextActionWindow, formatInZone, formatIn } from '../../utils/schedule.js';
import { healthSummary } from '../../utils/healthSummary.js';

const { useState, useMemo } = React;

const STATUS_TEXT = {
  green: 'text-green-700 dark:text-green-400',
  yellow: 'text-yellow-700 dark:text-yellow-400',
  orange: 'text-orange-700 dark:text-orange-400',
  gray: 'text-pb-text dark:text-gray-200',
};

const CLICKABLE = 'hover:bg-white dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Dashboard summary. Desktop/tablet: four tiles — cluster health (with the
 * node pulling it down), nodes online, automation (next action and when, or
 * the migrations running right now) and suggestions. Phones: one compact
 * status line so the node table is on the first screen.
 */
export default function KpiRow({
  data, nodeScores, automationStatus, automationConfig, recommendations, recommendationData,
  onNavigate, onOpenAutomation,
  // Optional: maintenance nodes are left out of "busiest"
  maintenanceNodes,
  // Optional: locally tracked migrations + cancel dialog for the in-flight list
  guestsMigrating, migrationProgress, canMigrate, setCancelMigrationModal,
}) {
  const [showHealthDetail, setShowHealthDetail] = useState(false);
  const [showInFlight, setShowInFlight] = useState(false);

  // When the schedule next lets automation act (walks up to a week of
  // minutes, so recomputed at most once a minute).
  const minuteKey = Math.floor(Date.now() / 60000);
  const wantsSchedule = !!automationStatus?.enabled && !!automationStatus?.timer_active;
  const nextAct = useMemo(() => (wantsSchedule
    ? nextActionWindow(automationConfig?.schedule, {
        now: new Date(),
        nextCheck: parseTimestamp(automationStatus?.next_check),
        intervalMin: automationStatus?.check_interval_minutes || 0,
      })
    : null
  ), [wantsSchedule, automationConfig?.schedule, automationStatus?.next_check, automationStatus?.check_interval_minutes, minuteKey]);

  if (!data) return null;

  const nodesObj = data.nodes || {};
  const nodes = Object.values(nodesObj);
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalNodes = nodes.length;
  const offline = nodes.filter(n => n.status !== 'online').map(n => n.name);
  const maint = [...toNodeSet(maintenanceNodes)];

  // ── Cluster health: the busiest node's headroom (same /api/node-scores
  // value as the Nodes table). Fall back to the backend summary value.
  const busiest = tightestNode(nodeScores, { nodes: nodesObj, maintenanceNodes });
  let healthVal = null;
  let meanScore = null;
  let healthSource = 'unknown';
  if (busiest) {
    healthVal = Math.round(busiest.rating);
    meanScore = Math.round(busiest.mean);
    healthSource = 'tightest';
  } else if (typeof recommendationData?.summary?.cluster_health === 'number') {
    healthVal = Math.round(recommendationData.summary.cluster_health);
    meanScore = healthVal;
    healthSource = 'backend';
  }
  // Plain facts instead of a vague word: every node has room, or which node
  // is short and its biggest problem (largest penalty item).
  const health = healthSummary({
    node: busiest?.name || null,
    headroom: healthVal,
    score: busiest ? nodeScores?.[busiest.name] : null,
  });
  const healthColor = healthVal !== null ? scoreColor(healthVal) : 'text-pb-text2 dark:text-gray-500';
  const healthTitle = busiest
    ? `Busiest node: ${busiest.name}, headroom ${healthVal}/100${busiest.top ? ` (mostly: ${busiest.top.description})` : ''}.\n`
      + `Average across ${busiest.count} node${busiest.count !== 1 ? 's' : ''}: ${meanScore}. Click for the per-node breakdown.`
    : 'Click for the per-node breakdown';

  // ── Migrations running now (Proxmox's list + ones this browser started).
  const inFlight = inFlightMigrations({ automationStatus, guestsMigrating, migrationProgress, guests: data.guests });
  const moving = inFlight.length;

  // ── Automation: state + the next thing it will do, and when.
  const auto = automationStatus ? getStatus(automationStatus) : null;
  const now = new Date();
  const actAt = nextAct?.firstRunAt || nextAct?.opensAt || null;
  const watching = (automationStatus?.intelligent_tracking?.items || []).filter(i => i.status === 'observing').length;
  let autoNext = null;
  if (automationStatus?.enabled) {
    if (!automationStatus.timer_active) {
      autoNext = 'paused — no checks until resumed';
    } else if (nextAct?.blocked && actAt) {
      autoNext = `can act ${formatInZone(actAt, nextAct.tz, now)} (in ${formatIn(actAt, now)})`;
    } else {
      const nc = getNextCheck(automationStatus);
      if (nc) {
        autoNext = nc === 'now' ? 'checking now' : nc.startsWith('every') ? `checks ${nc}` : `next check in ${nc}`;
      }
    }
  } else if (automationStatus) {
    autoNext = 'suggestions only — nothing moves on its own';
  }
  const watchText = automationStatus?.enabled && watching > 0
    ? `watching ${watching} guest${watching !== 1 ? 's' : ''} before moving`
    : null;

  // ── Suggestions
  const recCount = Array.isArray(recommendations) ? recommendations.length : null;

  const go = (tab) => {
    onNavigate?.(tab);
    document.getElementById('cluster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const openAutomation = () => { if (onOpenAutomation) onOpenAutomation(); };

  const nodesSub = offline.length > 0
    ? `${offline.join(', ')} offline`
    : maint.length > 0
      ? `${maint.join(', ')} in maintenance`
      : null;

  const modals = (
    <>
      <ClusterHealthBreakdown
        open={showHealthDetail}
        onClose={() => setShowHealthDetail(false)}
        avgScore={meanScore}
        tightest={busiest}
        nodeScores={nodeScores}
        healthSource={healthSource}
        spread={data.cluster_spread}
      />
      <InFlightModal
        open={showInFlight}
        onClose={() => setShowInFlight(false)}
        migrations={inFlight}
        canMigrate={canMigrate}
        setCancelMigrationModal={setCancelMigrationModal}
      />
    </>
  );

  // ─────────────────────────── phone: one status line ───────────────────────────
  const sep = <span className="text-pb-text2 dark:text-gray-600" aria-hidden="true">·</span>;
  const phone = (
    <div className="sm:hidden mb-3 flex flex-wrap items-center gap-x-2 px-3 py-0.5 rounded-xl border bg-white dark:bg-pb-surface-dark border-slate-200 dark:border-pb-border-dark text-xs">
      <button type="button" onClick={() => setShowHealthDetail(true)} title={healthTitle} className="inline-flex items-center gap-1 min-w-0 min-h-[40px]">
        <span className={`font-semibold truncate ${healthColor}`}>{health.headline}</span>
      </button>
      {sep}
      <button type="button" onClick={() => go('nodes')} title={nodesSub || 'All nodes online'} className="inline-flex items-center gap-1 min-h-[40px]">
        <span className={`font-semibold tabular-nums ${onlineNodes === totalNodes ? 'text-pb-text dark:text-gray-100' : 'text-yellow-700 dark:text-yellow-400'}`}>{onlineNodes}/{totalNodes}</span>
        <span className="text-pb-text2 dark:text-gray-400">nodes</span>
      </button>
      {/* Automation state is on the banner right below; only flag moves in flight here */}
      {moving > 0 && (
        <>
          {sep}
          <button type="button" onClick={() => setShowInFlight(true)} className="inline-flex items-center gap-1 min-h-[40px] font-semibold text-blue-700 dark:text-blue-300">
            <MoveRight size={12} /> Moving {moving}
          </button>
        </>
      )}
      {recCount > 0 && (
        <>
          {sep}
          <button type="button" onClick={() => go('suggestions')} className="min-h-[40px] font-semibold text-purple-700 dark:text-purple-300">
            {recCount} suggestion{recCount !== 1 ? 's' : ''}
          </button>
        </>
      )}
    </div>
  );

  // ─────────────────────────── desktop / tablet tiles ───────────────────────────
  const Tile = ({ onClick, title, className = '', children }) => (
    <button type="button" onClick={onClick} title={title} className={`${KPI_CARD} ${CLICKABLE} text-left min-w-0 ${className}`}>
      {children}
    </button>
  );
  const Label = ({ children }) => <div className="text-xs text-pb-text2 dark:text-gray-400 truncate">{children}</div>;
  const Sub = ({ children, title }) => <div className="text-[11px] text-pb-text2 dark:text-gray-500 truncate" title={title}>{children}</div>;

  const suggestionsActive = recCount > 0;

  const tiles = (
    <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* Cluster health */}
      <Tile onClick={() => setShowHealthDetail(true)} title={healthTitle}>
        <Activity size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="min-w-0">
          <div className={`text-lg font-bold leading-snug text-balance ${healthColor}`}>{health.headline}</div>
          <Label>Cluster health</Label>
          {health.sub && <Sub>{health.sub}</Sub>}
          {data.cluster_spread && <Sub title="Max − min across online nodes">{spreadText(data.cluster_spread)}</Sub>}
        </div>
      </Tile>

      {/* Nodes online */}
      <Tile onClick={() => go('nodes')} title="Show the Nodes tab">
        <Server size={18} className={`shrink-0 ${onlineNodes === totalNodes ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
        <div className="min-w-0">
          <div className={`text-xl font-bold tabular-nums ${onlineNodes === totalNodes ? 'text-pb-text dark:text-white' : 'text-yellow-700 dark:text-yellow-400'}`}>{onlineNodes}/{totalNodes}</div>
          <Label>Nodes online</Label>
          {nodesSub && <Sub>{nodesSub}</Sub>}
        </div>
      </Tile>

      {/* Automation — or the migrations running right now */}
      {moving > 0 ? (
        <Tile
          onClick={() => setShowInFlight(true)}
          title="Show migrations in flight"
          className="!border-blue-300 dark:!border-blue-500/50 !bg-blue-50 dark:!bg-blue-500/10"
        >
          <MoveRight size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="min-w-0">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">Moving {moving}</div>
            <Label>Migration{moving !== 1 ? 's' : ''} running</Label>
            <Sub>{inFlight.map(m => m.name || m.vmid).slice(0, 3).join(', ')}{moving > 3 ? ` +${moving - 3}` : ''}</Sub>
          </div>
        </Tile>
      ) : (
        <Tile onClick={openAutomation} title={[autoNext, watchText].filter(Boolean).join('\n') || 'Open automation'}>
          <Clock size={18} className={`shrink-0 ${auto ? STATUS_TEXT[auto.color] : 'text-pb-text2 dark:text-gray-500'}`} />
          <div className="min-w-0">
            <div className={`text-xl font-bold ${auto ? STATUS_TEXT[auto.color] : 'text-pb-text2 dark:text-gray-500'}`}>{auto ? auto.label : '—'}</div>
            <Label>Automation</Label>
            {autoNext && <Sub>{autoNext}</Sub>}
            {watchText && <Sub>{watchText}</Sub>}
          </div>
        </Tile>
      )}

      {/* Suggestions — highlighted only when there is something to do */}
      <Tile
        onClick={() => go('suggestions')}
        title="Show the Suggestions tab"
        className={suggestionsActive ? '!border-purple-300 dark:!border-purple-500/50 !bg-purple-50 dark:!bg-purple-500/10' : ''}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${suggestionsActive ? 'text-purple-600 dark:text-purple-400' : 'text-pb-text2 dark:text-gray-500'}`}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>
        <div className="min-w-0">
          <div className={`text-xl font-bold tabular-nums ${suggestionsActive ? 'text-purple-700 dark:text-purple-300' : 'text-pb-text2 dark:text-gray-400'}`}>{recCount ?? '—'}</div>
          <Label>Suggestion{recCount !== 1 ? 's' : ''}</Label>
          {recCount === 0 && <Sub>nothing worth moving</Sub>}
          {suggestionsActive && <Sub>moves that would even out load</Sub>}
        </div>
      </Tile>
    </div>
  );

  return (
    <>
      {phone}
      {tiles}
      {modals}
    </>
  );
}
