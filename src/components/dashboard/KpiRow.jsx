import { KPI_CARD, scoreColor } from '../../utils/designTokens.js';
import { Server, Activity, CheckCircle, MoveRight } from '../Icons.jsx';

/**
 * KPI summary row — 5 stat cards showing cluster-level metrics at a glance.
 * Adapts to 2x2 grid on mobile, horizontal row on desktop.
 */
export default function KpiRow({ data, nodeScores, automationStatus, recommendations }) {
  if (!data) return null;

  const nodes = data.nodes || [];
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalNodes = nodes.length;
  const allGuests = nodes.reduce((acc, n) => acc + (n.guests || []).length, 0);

  // Average cluster score from nodeScores
  let avgScore = null;
  if (nodeScores && Object.keys(nodeScores).length > 0) {
    const scores = Object.values(nodeScores).map(s => s.suitability_score).filter(Boolean);
    if (scores.length > 0) avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const activeMigrations = automationStatus?.active_migrations || 0;
  const pendingRecs = recommendations?.length || 0;

  const cards = [
    {
      label: 'Nodes Online',
      value: `${onlineNodes}/${totalNodes}`,
      icon: <Server size={18} className="text-green-400" />,
      color: onlineNodes === totalNodes ? 'text-green-400' : 'text-yellow-400'
    },
    {
      label: 'Total Guests',
      value: allGuests,
      icon: <Activity size={18} className="text-blue-400" />,
      color: 'text-white'
    },
    {
      label: 'Cluster Score',
      value: avgScore !== null ? `${avgScore}` : '—',
      icon: <CheckCircle size={18} className={avgScore !== null ? scoreColor(avgScore).replace('text-', 'text-') : 'text-gray-500'} />,
      color: avgScore !== null ? scoreColor(avgScore) : 'text-gray-500',
      suffix: avgScore !== null ? '/100' : ''
    },
    {
      label: 'Active Migrations',
      value: activeMigrations,
      icon: <MoveRight size={18} className="text-blue-400" />,
      color: activeMigrations > 0 ? 'text-blue-400' : 'text-gray-400'
    },
    {
      label: 'Recommendations',
      value: pendingRecs,
      icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>,
      color: pendingRecs > 0 ? 'text-purple-400' : 'text-gray-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map((card, i) => (
        <div key={i} className={KPI_CARD}>
          <div className="shrink-0">{card.icon}</div>
          <div className="min-w-0">
            <div className={`text-xl font-bold ${card.color} tabular-nums`}>
              {card.value}{card.suffix && <span className="text-sm text-gray-500 font-normal">{card.suffix}</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
