import { KPI_CARD, scoreColor } from '../../utils/designTokens.js';
import { Server, Activity, CheckCircle, MoveRight, Tag } from '../Icons.jsx';
import ClusterHealthBreakdown from './ClusterHealthBreakdown.jsx';
import InFlightModal, { inFlightMigrations } from './InFlightModal.jsx';
import { tightestNode } from '../../utils/nodeCondition.js';

const { useState } = React;

/**
 * KPI summary row — 6 stat cards. The "Cluster Health" card is a circular
 * gauge filled to the tightest node's headroom (the same /api/node-scores
 * value the Nodes table shows), with the mean in small text.
 */
export default function KpiRow({
  data, nodeScores, automationStatus, recommendations, recommendationData,
  ignoredGuests = [], autoMigrateOkGuests = [], affinityGuests = [], excludeGuests = [],
  onNavigate,
  // Optional: maintenance nodes are left out of "tightest"
  maintenanceNodes,
  // Optional: locally tracked migrations + cancel dialog for the In flight list
  guestsMigrating, migrationProgress, canMigrate, setCancelMigrationModal,
}) {
  const [showHealthDetail, setShowHealthDetail] = useState(false);
  const [showInFlight, setShowInFlight] = useState(false);
  if (!data) return null;

  const nodesObj = data.nodes || {};
  const nodes = Object.values(nodesObj);
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalNodes = nodes.length;
  const allGuests = Object.keys(data.guests || {}).length;

  // Cluster health: the tightest node's headroom, from the same node-scores
  // values as the Nodes table. The mean is secondary. Fall back to the
  // backend summary value when node scores haven't loaded yet.
  const tightest = tightestNode(nodeScores, { nodes: nodesObj, maintenanceNodes });
  let healthVal = null;
  let meanScore = null;
  let healthSource = 'unknown';
  if (tightest) {
    healthVal = Math.round(tightest.rating);
    meanScore = Math.round(tightest.mean);
    healthSource = 'tightest';
  } else if (typeof recommendationData?.summary?.cluster_health === 'number') {
    healthVal = Math.round(recommendationData.summary.cluster_health);
    meanScore = healthVal;
    healthSource = 'backend';
  }

  // Active migrations: what Proxmox reports running (automigrate status
  // returns them as in_progress_migrations) plus guests this browser started
  // that the status poll hasn't picked up yet.
  const inFlight = inFlightMigrations({ automationStatus, guestsMigrating, migrationProgress, guests: data.guests });
  const activeMigrations = inFlight.length;
  const pendingRecs = recommendations?.length || 0;

  // Tagged guests: union of any tag categories (a guest with multiple tags counts once)
  const taggedSet = new Set();
  ignoredGuests.forEach(g => taggedSet.add(g.vmid));
  autoMigrateOkGuests.forEach(g => taggedSet.add(g.vmid));
  affinityGuests.forEach(g => taggedSet.add(g.vmid));
  excludeGuests.forEach(g => taggedSet.add(g.vmid));
  const taggedCount = taggedSet.size;
  const tagBreakdown = [
    ignoredGuests.length > 0 && `ign ${ignoredGuests.length}`,
    autoMigrateOkGuests.length > 0 && `auto ${autoMigrateOkGuests.length}`,
    affinityGuests.length > 0 && `aff ${affinityGuests.length}`,
    excludeGuests.length > 0 && `anti ${excludeGuests.length}`,
  ].filter(Boolean).join(' · ');

  // Cluster Health gauge geometry
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - ((healthVal ?? 0) / 100) * c;
  const scoreColorClass = healthVal !== null ? scoreColor(healthVal) : 'text-pb-text2 dark:text-gray-500';
  const tightReason = tightest ? (tightest.top ? tightest.top.label : 'no penalties') : null;

  const otherCards = [
    { label: 'Nodes Online', to: 'nodes', value: `${onlineNodes}/${totalNodes}`, icon: <Server size={18} className="text-green-600 dark:text-green-400" />, color: onlineNodes === totalNodes ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Total Guests', to: 'guests', value: allGuests, icon: <Activity size={18} className="text-blue-600 dark:text-blue-400" />, color: 'text-pb-text dark:text-white' },
    { label: 'Active Migrations', onClick: () => setShowInFlight(true), clickTitle: activeMigrations > 0 ? 'Show migrations in flight' : 'No migrations running', value: activeMigrations, icon: <MoveRight size={18} className="text-blue-600 dark:text-blue-400" />, color: activeMigrations > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-pb-text2 dark:text-gray-400' },
    { label: 'Suggestions', to: 'suggestions', value: pendingRecs, icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 dark:text-purple-400"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>, color: pendingRecs > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-pb-text2 dark:text-gray-400' },
    { label: 'Tagged', to: 'guests', value: taggedCount, icon: <Tag size={18} className={taggedCount > 0 ? 'text-pink-600 dark:text-pink-400' : 'text-pb-text2 dark:text-gray-500'} />, color: taggedCount > 0 ? 'text-pink-600 dark:text-pink-400' : 'text-pb-text2 dark:text-gray-400', sublabel: tagBreakdown },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* Cluster Health — circular gauge (clickable for breakdown) */}
      <button
        type="button"
        onClick={() => setShowHealthDetail(true)}
        className={`${KPI_CARD} text-left hover:bg-white dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500`}
        title={tightest
          ? `Tightest node: ${tightest.name} at ${Math.round(tightest.rating)} headroom (${tightReason}). Mean across ${tightest.count} node${tightest.count !== 1 ? 's' : ''}: ${meanScore}. Click for per-node breakdown.`
          : 'Click for per-node breakdown'}
      >
        <div className="shrink-0 relative" style={{ width: 56, height: 56 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <circle cx="28" cy="28" r={r} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="5" fill="none" />
            <circle
              cx="28" cy="28" r={r}
              stroke="currentColor" className={scoreColorClass}
              strokeWidth="5" fill="none"
              strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold tabular-nums ${scoreColorClass}`}>{healthVal ?? '—'}</span>
          </div>
        </div>
        <div className="min-w-0">
          {tightest ? (
            <>
              <div className="text-xs text-pb-text dark:text-gray-200 truncate">
                <span className="text-pb-text2 dark:text-gray-500 hidden sm:inline">Tightest: </span>
                <span className="font-semibold">{tightest.name}</span>
                <span className={`tabular-nums font-semibold ${scoreColorClass}`}> {healthVal}</span>
              </div>
              <div className="text-[11px] text-pb-text2 dark:text-gray-400 truncate">{tightReason}</div>
              <div className="text-[10px] text-pb-text2 dark:text-gray-600 truncate tabular-nums">mean {meanScore}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-pb-text2 dark:text-gray-500 truncate"><span className="hidden sm:inline">Cluster </span>Health</div>
              <div className="text-[10px] text-pb-text2 dark:text-gray-600 hidden sm:block">/100 · click for detail</div>
            </>
          )}
        </div>
      </button>

      <ClusterHealthBreakdown
        open={showHealthDetail}
        onClose={() => setShowHealthDetail(false)}
        avgScore={meanScore}
        tightest={tightest}
        nodeScores={nodeScores}
        healthSource={healthSource}
      />

      <InFlightModal
        open={showInFlight}
        onClose={() => setShowInFlight(false)}
        migrations={inFlight}
        canMigrate={canMigrate}
        setCancelMigrationModal={setCancelMigrationModal}
      />

      {/* Other cards */}
      {otherCards.map((card, i) => {
        const clickable = !!card.onClick || !!(card.to && onNavigate);
        const Tag_ = clickable ? 'button' : 'div';
        const nav = card.onClick ? {
          type: 'button',
          title: card.clickTitle,
          onClick: card.onClick,
        } : card.to && onNavigate ? {
          type: 'button',
          title: `Show ${card.to}`,
          onClick: () => {
            onNavigate(card.to);
            document.getElementById('cluster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
        } : {};
        return (
        <Tag_ key={i} {...nav} className={`${KPI_CARD} text-left ${clickable ? 'hover:bg-white dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}`}>
          <div className="shrink-0">{card.icon}</div>
          <div className="min-w-0">
            <div className={`text-xl font-bold ${card.color} tabular-nums`}>
              {card.value}{card.suffix && <span className="text-sm text-pb-text2 dark:text-gray-500 font-normal">{card.suffix}</span>}
            </div>
            <div className="text-xs text-pb-text2 dark:text-gray-500 truncate">{card.label}</div>
            {card.sublabel && (
              <div className="text-[10px] text-pb-text2 dark:text-gray-600 truncate" title={card.sublabel}>{card.sublabel}</div>
            )}
          </div>
        </Tag_>
        );
      })}
    </div>
  );
}
