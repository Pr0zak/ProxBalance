import { GLASS_CARD, INNER_CARD, scoreColor, metricTextColor, TEXT_HEADING } from '../../../utils/designTokens.js';
import { ChevronDown, Cpu, MemoryStick, Activity } from '../../Icons.jsx';
import NodeDeepDive from '../NodeDeepDive.jsx';

const { useState, useMemo } = React;

const SUB_VIEWS = [
  { id: 'guests', label: 'Guests' },
  { id: 'chart', label: 'Chart' },
  { id: 'predicted', label: 'Predicted' },
];

/**
 * Variant B — one rich card per node. Header always shows trends (sparklines + score + penalty bar).
 * Toggle row reveals one of {guests, chart, predicted} below.
 */
export default function NodeCardStackB({
  data, nodeScores, recommendationData, chartPeriod, darkMode,
  generateSparkline, setSelectedNode, setSelectedGuestDetails,
  collapsedSections, setCollapsedSections,
}) {
  const collapsed = collapsedSections?.nodeOverview;

  const guestsByNode = useMemo(() => {
    const byNode = {};
    Object.values(data?.guests || {}).forEach(g => {
      const n = g.node || 'unknown';
      if (!byNode[n]) byNode[n] = [];
      byNode[n].push(g);
    });
    Object.values(byNode).forEach(arr => arr.sort((a, b) => (a.vmid || 0) - (b.vmid || 0)));
    return byNode;
  }, [data]);

  const nodes = useMemo(() => {
    if (!data?.nodes) return [];
    return Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes);
  }, [data]);

  return (
    <div className={GLASS_CARD}>
      <button
        onClick={() => setCollapsedSections?.(prev => ({ ...prev, nodeOverview: !prev.nodeOverview }))}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity"
      >
        <h2 className={TEXT_HEADING}>Cluster Nodes</h2>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${!collapsed ? 'rotate-180' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="space-y-3">
          {nodes.map(node => (
            <NodeCard
              key={node.name}
              node={node}
              nodeScore={nodeScores?.[node.name]}
              guests={guestsByNode[node.name] || []}
              recommendationData={recommendationData}
              chartPeriod={chartPeriod}
              darkMode={darkMode}
              generateSparkline={generateSparkline}
              onNodeClick={setSelectedNode}
              onGuestClick={setSelectedGuestDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeCard({ node, nodeScore, guests, recommendationData, chartPeriod, darkMode, generateSparkline, onNodeClick, onGuestClick }) {
  const [activeSub, setActiveSub] = useState(null);

  const cpuPct = node.cpu_percent || 0;
  const memPct = node.mem_percent || 0;
  const iowait = node.metrics?.current_iowait || 0;
  const online = node.status === 'online';
  const score = nodeScore?.suitability_score;
  const vmCount = guests.filter(g => g.type === 'VM').length;
  const ctCount = guests.filter(g => g.type === 'LXC').length;

  const toggle = (id) => setActiveSub(prev => prev === id ? null : id);

  return (
    <div className={`${INNER_CARD} hover:shadow-md transition-shadow`}>
      {/* Header — name, status, key metrics, score */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-2 cursor-pointer"
        onClick={() => onNodeClick?.(node)}
      >
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
          <h3 className="text-base font-bold text-white">{node.name}</h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Cpu size={14} className="text-gray-500" />
          <span className="text-gray-500">CPU</span>
          <span className={`font-mono tabular-nums ${metricTextColor(cpuPct)}`}>{cpuPct.toFixed(0)}%</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <MemoryStick size={14} className="text-gray-500" />
          <span className="text-gray-500">Mem</span>
          <span className={`font-mono tabular-nums ${metricTextColor(memPct)}`}>{memPct.toFixed(0)}%</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Activity size={14} className="text-gray-500" />
          <span className="text-gray-500">IOWait</span>
          <span className={`font-mono tabular-nums ${iowait > 15 ? 'text-orange-400' : 'text-gray-400'}`}>{iowait.toFixed(0)}%</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs ml-auto">
          <span className="text-gray-500">{vmCount} VMs · {ctCount} CTs</span>
          {score != null && (
            <span className={`font-bold tabular-nums text-sm ${scoreColor(score)}`}>{Math.round(score)}</span>
          )}
        </div>
      </div>

      {/* Trends always shown inline */}
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <NodeDeepDive
          mode="trends"
          node={node}
          nodeScore={nodeScore}
          generateSparkline={generateSparkline}
        />
      </div>

      {/* Toggle row */}
      <div className="mt-3 flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {SUB_VIEWS.map(sv => (
          <button
            key={sv.id}
            onClick={() => toggle(sv.id)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              activeSub === sv.id
                ? 'bg-blue-600/80 border-blue-500 text-white'
                : 'bg-slate-800/60 border-slate-700/50 text-gray-300 hover:bg-slate-700/40'
            }`}
          >
            {sv.label} {sv.id === 'guests' ? `(${guests.length})` : ''}
          </button>
        ))}
      </div>

      {/* Selected sub-view */}
      {activeSub && (
        <div className="mt-3 pt-3 border-t border-slate-700/30" onClick={(e) => e.stopPropagation()}>
          <NodeDeepDive
            mode={activeSub}
            node={node}
            nodeScore={nodeScore}
            guests={guests}
            onGuestClick={onGuestClick}
            chartPeriod={chartPeriod}
            darkMode={darkMode}
            generateSparkline={generateSparkline}
            recommendationData={recommendationData}
          />
        </div>
      )}
    </div>
  );
}
