import { TrendingUp, TrendingDown } from '../Icons.jsx';
import { INNER_CARD, scoreColor } from '../../utils/designTokens.js';
import NodeChart from './NodeChart.jsx';

const { useMemo } = React;

function formatMem(gb) {
  if (gb == null) return '—';
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

function GuestRow({ guest, onClick }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.(guest); }}
      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-700/30 cursor-pointer transition-colors"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${guest.status === 'running' ? 'bg-green-400' : 'bg-gray-600'}`} />
      <span className="text-sm text-gray-200 min-w-[160px]">
        {guest.name || `guest-${guest.vmid}`}
        <span className="text-[10px] text-gray-600 ml-1.5">{guest.vmid}</span>
      </span>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
        guest.type === 'VM'
          ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
          : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
      }`}>
        {guest.type}
      </span>
      {guest.status === 'running' ? (
        <div className="flex items-center gap-4 ml-auto text-xs text-gray-500 tabular-nums">
          {guest.cpu_current != null && (
            <span>CPU <span className="text-gray-300">{guest.cpu_current.toFixed(0)}%</span></span>
          )}
          {guest.mem_used_gb != null && (
            <span>Mem <span className="text-gray-300">{formatMem(guest.mem_used_gb)}</span></span>
          )}
        </div>
      ) : (
        <span className="ml-auto text-xs text-gray-600">stopped</span>
      )}
    </div>
  );
}

function TrendArrow({ direction, label }) {
  if (direction === 'sustained_increase') return <TrendingUp size={11} className="text-red-500" title={`${label} rising fast`} />;
  if (direction === 'rising') return <TrendingUp size={11} className="text-orange-400" title={`${label} rising`} />;
  if (direction === 'falling' || direction === 'sustained_decrease') return <TrendingDown size={11} className="text-green-500" title={`${label} falling`} />;
  return null;
}

function MetricLine({ label, value, suffix = '%', color, sparklinePoints, sparkColor, trendDirection }) {
  return (
    <div className="relative">
      <div className="flex justify-between items-center relative z-10">
        <span className="text-gray-400 flex items-center gap-1 text-xs">
          {label}
          {trendDirection && <TrendArrow direction={trendDirection} label={label} />}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${color}`}>
          {value.toFixed(1)}{suffix}
        </span>
      </div>
      {sparklinePoints && (
        <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
          <polyline fill="none" stroke="currentColor" strokeWidth="4" className={sparkColor} points={sparklinePoints} />
        </svg>
      )}
    </div>
  );
}

function TrendsView({ node, nodeScore, generateSparkline }) {
  const cpuPct = node.cpu_percent || 0;
  const memPct = node.mem_percent || 0;
  const iowait = node.metrics?.current_iowait || 0;
  const cpuColor = cpuPct >= 80 ? 'text-red-400' : cpuPct >= 60 ? 'text-yellow-400' : 'text-blue-400';
  const memColor = memPct >= 80 ? 'text-red-400' : memPct >= 70 ? 'text-yellow-400' : 'text-purple-400';
  const iowaitColor = iowait > 30 ? 'text-red-400' : iowait > 15 ? 'text-orange-400' : 'text-orange-400';

  const ta = node.score_details?.trend_analysis || nodeScore?.trend_analysis;

  return (
    <div className="space-y-2">
      <MetricLine
        label="CPU"
        value={cpuPct}
        color={cpuColor}
        sparklinePoints={generateSparkline?.(cpuPct, 100, 30, 0.3)}
        sparkColor="text-blue-500"
        trendDirection={ta?.cpu_direction || node.metrics?.cpu_trend}
      />
      <MetricLine
        label="Memory"
        value={memPct}
        color={memColor}
        sparklinePoints={generateSparkline?.(memPct, 100, 30, 0.25)}
        sparkColor="text-purple-500"
        trendDirection={ta?.mem_direction || node.metrics?.mem_trend}
      />
      <MetricLine
        label="IOWait"
        value={iowait}
        color={iowaitColor}
        sparklinePoints={generateSparkline?.(iowait, 100, 30, 0.35)}
        sparkColor="text-orange-500"
      />

      {nodeScore && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <span className="text-xs text-gray-400">Suitability</span>
          <span className={`text-sm font-bold tabular-nums ${scoreColor(nodeScore.suitability_rating)}`}>
            {nodeScore.suitability_rating}%
          </span>
        </div>
      )}

      {/* Stability / Overcommit badges */}
      {nodeScore && (
        <div className="flex flex-wrap gap-1">
          {nodeScore.trend_analysis?.stability_score != null && (() => {
            const s = nodeScore.trend_analysis.stability_score;
            const label = s >= 80 ? 'Stable' : s >= 60 ? 'Moderate' : s >= 40 ? 'Variable' : 'Volatile';
            const color = s >= 80 ? 'bg-green-900/30 text-green-300'
              : s >= 60 ? 'bg-blue-900/30 text-blue-300'
              : s >= 40 ? 'bg-yellow-900/30 text-yellow-300'
              : 'bg-red-900/30 text-red-300';
            return (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`} title={`Stability: ${s}/100`}>
                {label}
              </span>
            );
          })()}
          {nodeScore.overcommit_ratio > 0 && (() => {
            const oc = nodeScore.overcommit_ratio;
            const color = oc > 1.2 ? 'bg-red-900/30 text-red-300'
              : oc > 1.0 ? 'bg-orange-900/30 text-orange-300'
              : oc > 0.85 ? 'bg-yellow-900/30 text-yellow-300'
              : '';
            if (!color) return null;
            return (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`} title={`Memory overcommit: ${(oc * 100).toFixed(0)}%`}>
                OC {(oc * 100).toFixed(0)}%
              </span>
            );
          })()}
        </div>
      )}

      {/* Penalty breakdown */}
      {nodeScore?.penalty_categories && (() => {
        const cats = nodeScore.penalty_categories;
        const total = cats.cpu + cats.memory + cats.iowait + cats.trends + cats.spikes;
        if (total === 0) return null;
        const segments = [
          { key: 'cpu', value: cats.cpu, color: 'bg-red-500', label: 'CPU' },
          { key: 'memory', value: cats.memory, color: 'bg-blue-500', label: 'Memory' },
          { key: 'iowait', value: cats.iowait, color: 'bg-orange-500', label: 'IOWait' },
          { key: 'trends', value: cats.trends, color: 'bg-yellow-500', label: 'Trends' },
          { key: 'spikes', value: cats.spikes, color: 'bg-purple-500', label: 'Spikes' },
        ].filter(s => s.value > 0);
        return (
          <div className="pt-1">
            <div className="text-[10px] text-gray-400 mb-1">Penalty sources ({total} pts)</div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-700">
              {segments.map(s => (
                <div key={s.key} className={s.color} style={{ width: `${(s.value / total * 100)}%` }} title={`${s.label}: ${s.value}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 mt-1">
              {segments.map(s => (
                <span key={s.key} className="text-[9px] text-gray-400 flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color}`} />
                  {s.label} {s.value}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ChartView({ node, chartPeriod, darkMode, nodeScore }) {
  if (!node.trend_data || typeof node.trend_data !== 'object' || Object.keys(node.trend_data).length === 0) {
    return <div className="text-xs text-gray-500 italic px-3 py-4">No historical data available for this node.</div>;
  }
  return (
    <div style={{ height: 200 }}>
      <NodeChart
        nodeName={node.name}
        trendData={node.trend_data}
        chartPeriod={chartPeriod}
        darkMode={darkMode}
        nodeScore={nodeScore}
      />
    </div>
  );
}

function PredictedView({ node, recommendationData }) {
  const before = recommendationData?.summary?.batch_impact?.before?.node_scores?.[node.name];
  const after = recommendationData?.summary?.batch_impact?.after?.node_scores?.[node.name];
  if (!before || !after) {
    return <div className="text-xs text-gray-500 italic px-3 py-4">No predicted impact available — generate recommendations to see post-migration projections.</div>;
  }

  const cpuDelta = after.cpu - before.cpu;
  const memDelta = after.mem - before.mem;
  const guestDelta = after.guest_count - before.guest_count;

  const renderRow = (label, beforeVal, afterVal, delta, fmt = (v) => `${v.toFixed(1)}%`) => {
    const up = delta > 0.5;
    const down = delta < -0.5;
    const color = up ? 'text-orange-400' : down ? 'text-green-400' : 'text-gray-400';
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <div className="flex items-center gap-2 tabular-nums">
          <span className="text-gray-500 line-through">{fmt(beforeVal)}</span>
          <span className={`font-semibold ${color}`}>{fmt(afterVal)}</span>
          <span className={`text-[10px] ${color}`}>
            {up ? '+' : ''}{fmt(delta)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`${INNER_CARD} space-y-2`}>
      <div className="text-xs text-gray-400 font-medium mb-1">Predicted after recommended migrations</div>
      {renderRow('CPU', before.cpu, after.cpu, cpuDelta)}
      {renderRow('Memory', before.mem, after.mem, memDelta)}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Guest count</span>
        <div className="flex items-center gap-2 tabular-nums">
          <span className="text-gray-500 line-through">{before.guest_count}</span>
          <span className="font-semibold text-white">{after.guest_count}</span>
          {guestDelta !== 0 && (
            <span className={`text-[10px] ${guestDelta > 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {guestDelta > 0 ? '+' : ''}{guestDelta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GuestsView({ guests, onGuestClick }) {
  if (!guests || guests.length === 0) {
    return <div className="text-xs text-gray-600 italic px-3 py-2">No guests on this node.</div>;
  }
  return (
    <div className="border-l border-slate-700/40 ml-2">
      {guests.map(g => <GuestRow key={g.vmid} guest={g} onClick={onGuestClick} />)}
    </div>
  );
}

export default function NodeDeepDive({
  mode,
  node,
  nodeScore,
  guests,
  onGuestClick,
  chartPeriod,
  darkMode,
  generateSparkline,
  recommendationData,
}) {
  if (!node) return null;
  switch (mode) {
    case 'guests':
      return <GuestsView guests={guests} onGuestClick={onGuestClick} />;
    case 'trends':
      return <TrendsView node={node} nodeScore={nodeScore} generateSparkline={generateSparkline} />;
    case 'chart':
      return <ChartView node={node} chartPeriod={chartPeriod} darkMode={darkMode} nodeScore={nodeScore} />;
    case 'predicted':
      return <PredictedView node={node} recommendationData={recommendationData} />;
    default:
      return null;
  }
}
