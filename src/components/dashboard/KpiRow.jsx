import { KPI_CARD, scoreColor, metricTextColor } from '../../utils/designTokens.js';
import { Server, Activity, CheckCircle, MoveRight, Tag, ChevronDown, Cpu, MemoryStick } from '../Icons.jsx';

/**
 * KPI summary row — 6 stat cards. The "Cluster Health" card has 7 visual
 * variants (current + 6 alternatives) selectable via the clusterHealthVariant prop
 * for the in-progress design preview.
 */
export default function KpiRow({
  data, nodeScores, automationStatus, recommendations,
  ignoredGuests = [], autoMigrateOkGuests = [], affinityGuests = [], excludeGuests = [],
  scoreHistory,
  clusterHealthVariant = 'current',
}) {
  if (!data) return null;

  const nodesObj = data.nodes || {};
  const nodes = Object.values(nodesObj);
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalNodes = nodes.length;
  const allGuests = Object.keys(data.guests || {}).length;

  // Average cluster score from nodeScores
  let avgScore = null;
  if (nodeScores && Object.keys(nodeScores).length > 0) {
    const scores = Object.values(nodeScores).map(s => s.suitability_score).filter(Boolean);
    if (scores.length > 0) avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // Cluster averages for variant 4 (multi-metric)
  const avgCpu = nodes.length > 0 ? nodes.reduce((s, n) => s + (n.cpu_percent || 0), 0) / nodes.length : 0;
  const avgMem = nodes.length > 0 ? nodes.reduce((s, n) => s + (n.mem_percent || 0), 0) / nodes.length : 0;
  const avgIowait = nodes.length > 0 ? nodes.reduce((s, n) => s + (n.metrics?.current_iowait || 0), 0) / nodes.length : 0;

  // Delta vs ~24h ago for variant 2
  let scoreDelta = null;
  if (scoreHistory && scoreHistory.length > 1 && avgScore != null) {
    // Find oldest entry within last ~24h, fall back to first entry
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const ref = scoreHistory.find(p => new Date(p.timestamp).getTime() >= dayAgo) || scoreHistory[0];
    const refScore = ref?.cluster_health;
    if (typeof refScore === 'number') scoreDelta = avgScore - Math.round(refScore);
  }

  // Sparkline polyline points for variant 1 (recent cluster_health series)
  const sparklinePoints = (() => {
    if (!scoreHistory || scoreHistory.length < 2) return null;
    const pts = scoreHistory.slice(-30).map(p => p.cluster_health).filter(v => typeof v === 'number');
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = Math.max(1, max - min);
    return pts.map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  })();

  // Stoplight reason for variant 5
  const healthReason = (() => {
    if (avgScore == null) return { dot: 'bg-gray-500', text: 'No score data', color: 'text-gray-400' };
    const hot = nodes.filter(n => (n.cpu_percent || 0) >= 80).map(n => n.name);
    const tightMem = nodes.filter(n => (n.mem_percent || 0) >= 80).map(n => n.name);
    if (avgScore >= 80) return { dot: 'bg-green-400', text: 'Cluster healthy', color: 'text-green-400' };
    if (hot.length > 0) return { dot: 'bg-red-400', text: `${hot.length} node${hot.length > 1 ? 's' : ''} hot (${hot.join(', ')})`, color: 'text-red-400' };
    if (tightMem.length > 0) return { dot: 'bg-orange-400', text: `Memory tight on ${tightMem.join(', ')}`, color: 'text-orange-400' };
    if (avgScore < 60) return { dot: 'bg-orange-400', text: 'Score below 60', color: 'text-orange-400' };
    return { dot: 'bg-yellow-400', text: 'Mild pressure', color: 'text-yellow-400' };
  })();

  const activeMigrations = automationStatus?.active_migrations || 0;
  const pendingRecs = recommendations?.length || 0;

  // Tagged
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

  // Other (non-cluster-health) cards stay simple
  const otherCards = [
    { label: 'Nodes Online', value: `${onlineNodes}/${totalNodes}`, icon: <Server size={18} className="text-green-400" />, color: onlineNodes === totalNodes ? 'text-green-400' : 'text-yellow-400' },
    { label: 'Total Guests', value: allGuests, icon: <Activity size={18} className="text-blue-400" />, color: 'text-white' },
    { label: 'Active Migrations', value: activeMigrations, icon: <MoveRight size={18} className="text-blue-400" />, color: activeMigrations > 0 ? 'text-blue-400' : 'text-gray-400' },
    { label: 'Recommendations', value: pendingRecs, icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>, color: pendingRecs > 0 ? 'text-purple-400' : 'text-gray-400' },
    { label: 'Tagged', value: taggedCount, icon: <Tag size={18} className={taggedCount > 0 ? 'text-pink-400' : 'text-gray-500'} />, color: taggedCount > 0 ? 'text-pink-400' : 'text-gray-400', sublabel: tagBreakdown },
  ];

  const scoreColorClass = avgScore !== null ? scoreColor(avgScore) : 'text-gray-500';
  const wideClass = clusterHealthVariant === '4' ? 'col-span-2' : '';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* Cluster Health card — variant-driven */}
      <div className={`${KPI_CARD} ${wideClass}`}>
        {/* Variant Current — original single-number card */}
        {clusterHealthVariant === 'current' && (
          <>
            <div className="shrink-0"><CheckCircle size={18} className={scoreColorClass} /></div>
            <div className="min-w-0">
              <div className={`text-xl font-bold ${scoreColorClass} tabular-nums`}>
                {avgScore !== null ? avgScore : '—'}
                {avgScore !== null && <span className="text-sm text-gray-500 font-normal">/100</span>}
              </div>
              <div className="text-xs text-gray-500 truncate">Cluster Health</div>
            </div>
          </>
        )}

        {/* Variant 1 — Number + sparkline */}
        {clusterHealthVariant === '1' && (
          <>
            <div className="shrink-0"><CheckCircle size={18} className={scoreColorClass} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-2">
                <div className={`text-xl font-bold ${scoreColorClass} tabular-nums`}>
                  {avgScore !== null ? avgScore : '—'}
                </div>
                {sparklinePoints && (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="flex-1 h-6 opacity-80">
                    <polyline fill="none" stroke="currentColor" strokeWidth="3" className={scoreColorClass} points={sparklinePoints} />
                  </svg>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">Cluster Health</div>
            </div>
          </>
        )}

        {/* Variant 2 — Number + delta */}
        {clusterHealthVariant === '2' && (
          <>
            <div className="shrink-0"><CheckCircle size={18} className={scoreColorClass} /></div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <div className={`text-xl font-bold ${scoreColorClass} tabular-nums`}>
                  {avgScore !== null ? avgScore : '—'}
                </div>
                {scoreDelta != null && scoreDelta !== 0 && (
                  <span className={`text-xs font-semibold tabular-nums ${scoreDelta > 0 ? 'text-green-400' : 'text-orange-400'}`}>
                    {scoreDelta > 0 ? '↑' : '↓'} {Math.abs(scoreDelta)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">
                Cluster Health
                {scoreDelta != null && <span className="text-gray-600"> · vs 24h</span>}
              </div>
            </div>
          </>
        )}

        {/* Variant 3 — Circular gauge */}
        {clusterHealthVariant === '3' && (() => {
          const v = avgScore ?? 0;
          const r = 22;
          const c = 2 * Math.PI * r;
          const offset = c - (v / 100) * c;
          const stroke = scoreColorClass.replace('text-', 'stroke-');
          return (
            <>
              <div className="shrink-0 relative" style={{ width: 56, height: 56 }}>
                <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                  <circle cx="28" cy="28" r={r} stroke="currentColor" className="text-slate-700" strokeWidth="5" fill="none" />
                  <circle cx="28" cy="28" r={r} stroke="currentColor" className={scoreColorClass} strokeWidth="5" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold tabular-nums ${scoreColorClass}`}>{avgScore ?? '—'}</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 truncate">Cluster Health</div>
                <div className="text-[10px] text-gray-600">/100</div>
              </div>
            </>
          );
        })()}

        {/* Variant 4 — Multi-metric (CPU / Mem / IOWait / Score) */}
        {clusterHealthVariant === '4' && (
          <div className="w-full grid grid-cols-4 gap-2">
            <div>
              <div className="flex items-center gap-1"><Cpu size={11} className="text-gray-500" /><span className="text-[9px] uppercase text-gray-500">CPU</span></div>
              <div className={`text-base font-bold tabular-nums ${metricTextColor(avgCpu)}`}>{avgCpu.toFixed(0)}%</div>
            </div>
            <div>
              <div className="flex items-center gap-1"><MemoryStick size={11} className="text-gray-500" /><span className="text-[9px] uppercase text-gray-500">Mem</span></div>
              <div className={`text-base font-bold tabular-nums ${metricTextColor(avgMem)}`}>{avgMem.toFixed(0)}%</div>
            </div>
            <div>
              <div className="flex items-center gap-1"><Activity size={11} className="text-gray-500" /><span className="text-[9px] uppercase text-gray-500">IO</span></div>
              <div className={`text-base font-bold tabular-nums ${avgIowait > 15 ? 'text-orange-400' : 'text-gray-300'}`}>{avgIowait.toFixed(0)}%</div>
            </div>
            <div>
              <div className="flex items-center gap-1"><CheckCircle size={11} className={scoreColorClass} /><span className="text-[9px] uppercase text-gray-500">Score</span></div>
              <div className={`text-base font-bold tabular-nums ${scoreColorClass}`}>{avgScore ?? '—'}</div>
            </div>
          </div>
        )}

        {/* Variant 5 — Stoplight + reason */}
        {clusterHealthVariant === '5' && (
          <>
            <div className="shrink-0">
              <div className={`w-6 h-6 rounded-full ${healthReason.dot} shadow-lg`} />
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-bold ${healthReason.color} truncate`} title={healthReason.text}>
                {healthReason.text}
              </div>
              <div className="text-xs text-gray-500 truncate">
                Cluster Health · score {avgScore ?? '—'}
              </div>
            </div>
          </>
        )}

        {/* Variant 6 — Expandable hint */}
        {clusterHealthVariant === '6' && (
          <button
            type="button"
            className="flex items-center gap-3 w-full text-left hover:opacity-80"
            title="Click to view per-node breakdown (drawer not implemented in preview)"
          >
            <div className="shrink-0"><CheckCircle size={18} className={scoreColorClass} /></div>
            <div className="min-w-0 flex-1">
              <div className={`text-xl font-bold ${scoreColorClass} tabular-nums`}>
                {avgScore !== null ? avgScore : '—'}
                {avgScore !== null && <span className="text-sm text-gray-500 font-normal">/100</span>}
              </div>
              <div className="text-xs text-gray-500 truncate">Cluster Health · drill in</div>
            </div>
            <ChevronDown size={14} className="text-gray-500 -rotate-90 shrink-0" />
          </button>
        )}
      </div>

      {/* Other cards (unchanged) */}
      {otherCards.map((card, i) => (
        <div key={i} className={KPI_CARD}>
          <div className="shrink-0">{card.icon}</div>
          <div className="min-w-0">
            <div className={`text-xl font-bold ${card.color} tabular-nums`}>
              {card.value}{card.suffix && <span className="text-sm text-gray-500 font-normal">{card.suffix}</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{card.label}</div>
            {card.sublabel && (
              <div className="text-[10px] text-gray-600 truncate" title={card.sublabel}>{card.sublabel}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
