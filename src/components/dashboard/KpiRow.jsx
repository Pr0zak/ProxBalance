import { KPI_CARD, scoreColor } from '../../utils/designTokens.js';
import { Server, Activity, CheckCircle, MoveRight, Tag } from '../Icons.jsx';
import ClusterHealthBreakdown from './ClusterHealthBreakdown.jsx';

const { useState } = React;

/**
 * KPI summary row — 6 stat cards. The "Cluster Health" card is a circular
 * gauge filled to the avg suitability score across all nodes.
 */
export default function KpiRow({
  data, nodeScores, automationStatus, recommendations, recommendationData,
  ignoredGuests = [], autoMigrateOkGuests = [], affinityGuests = [], excludeGuests = [],
}) {
  const [showHealthDetail, setShowHealthDetail] = useState(false);
  if (!data) return null;

  const nodesObj = data.nodes || {};
  const nodes = Object.values(nodesObj);
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalNodes = nodes.length;
  const allGuests = Object.keys(data.guests || {}).length;

  // Cluster health: prefer the backend-computed summary value (matches what
  // the Recommendations section shows), fall back to averaging per-node
  // suitability_rating when no recommendation summary is available.
  let avgScore = null;
  let healthSource = 'unknown';
  const backendHealth = recommendationData?.summary?.cluster_health;
  if (typeof backendHealth === 'number') {
    avgScore = Math.round(backendHealth);
    healthSource = 'backend';
  } else if (nodeScores && Object.keys(nodeScores).length > 0) {
    const scores = Object.values(nodeScores)
      .map(s => s.suitability_rating)
      .filter(v => typeof v === 'number');
    if (scores.length > 0) {
      avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      healthSource = 'avg';
    }
  }

  const activeMigrations = automationStatus?.active_migrations || 0;
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
  const healthVal = avgScore ?? 0;
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (healthVal / 100) * c;
  const scoreColorClass = avgScore !== null ? scoreColor(avgScore) : 'text-claude-muted dark:text-gray-500';

  const otherCards = [
    { label: 'Nodes Online', value: `${onlineNodes}/${totalNodes}`, icon: <Server size={18} className="text-green-400" />, color: onlineNodes === totalNodes ? 'text-green-400' : 'text-yellow-400' },
    { label: 'Total Guests', value: allGuests, icon: <Activity size={18} className="text-blue-400" />, color: 'text-claude-text dark:text-white' },
    { label: 'Active Migrations', value: activeMigrations, icon: <MoveRight size={18} className="text-blue-400" />, color: activeMigrations > 0 ? 'text-blue-400' : 'text-claude-muted dark:text-gray-400' },
    { label: 'Recommendations', value: pendingRecs, icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>, color: pendingRecs > 0 ? 'text-purple-400' : 'text-claude-muted dark:text-gray-400' },
    { label: 'Tagged', value: taggedCount, icon: <Tag size={18} className={taggedCount > 0 ? 'text-pink-400' : 'text-claude-muted dark:text-gray-500'} />, color: taggedCount > 0 ? 'text-pink-400' : 'text-claude-muted dark:text-gray-400', sublabel: tagBreakdown },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* Cluster Health — circular gauge (clickable for breakdown) */}
      <button
        type="button"
        onClick={() => setShowHealthDetail(true)}
        className={`${KPI_CARD} text-left hover:bg-claude-surface dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500`}
        title="Click for per-node breakdown"
      >
        <div className="shrink-0 relative" style={{ width: 56, height: 56 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <circle cx="28" cy="28" r={r} stroke="currentColor" className="text-slate-700" strokeWidth="5" fill="none" />
            <circle
              cx="28" cy="28" r={r}
              stroke="currentColor" className={scoreColorClass}
              strokeWidth="5" fill="none"
              strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold tabular-nums ${scoreColorClass}`}>{avgScore ?? '—'}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xs text-claude-muted dark:text-gray-500 truncate">Cluster Health</div>
          <div className="text-[10px] text-claude-muted dark:text-gray-600">/100 · click for detail</div>
        </div>
      </button>

      <ClusterHealthBreakdown
        open={showHealthDetail}
        onClose={() => setShowHealthDetail(false)}
        avgScore={avgScore}
        nodeScores={nodeScores}
        healthSource={healthSource}
      />

      {/* Other cards */}
      {otherCards.map((card, i) => (
        <div key={i} className={KPI_CARD}>
          <div className="shrink-0">{card.icon}</div>
          <div className="min-w-0">
            <div className={`text-xl font-bold ${card.color} tabular-nums`}>
              {card.value}{card.suffix && <span className="text-sm text-claude-muted dark:text-gray-500 font-normal">{card.suffix}</span>}
            </div>
            <div className="text-xs text-claude-muted dark:text-gray-500 truncate">{card.label}</div>
            {card.sublabel && (
              <div className="text-[10px] text-claude-muted dark:text-gray-600 truncate" title={card.sublabel}>{card.sublabel}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
