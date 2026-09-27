import { HardDrive, ChevronDown, Eye, TrendingUp, TrendingDown, Minus, X } from '../Icons.jsx';
import { GLASS_CARD, GLASS_CARD_SUBTLE, INNER_CARD, iconBadge, BTN_PRIMARY, BTN_SECONDARY, BTN_ICON, ICON, SELECT_FIELD, MODAL_OVERLAY, MODAL_CONTAINER, FILTER_CHIP, FILTER_CHIP_INACTIVE, statusBadge, headroomBadge, headroomTextColor } from '../../utils/designTokens.js';
import NodeChart from './NodeChart.jsx';
import MetricCompareCard from './MetricCompareCard.jsx';
import { NODE_COLORS, RESOURCE_METRICS, hasTrendData } from './nodeSeries.js';

const { useState, useMemo, useEffect } = React;

const COMPARE_MODES = [
  { id: 'node',   label: 'By node',   title: 'One chart per node (CPU, memory, IOWait together)' },
  { id: 'metric', label: 'By metric', title: 'One chart per metric with every node overlaid' },
];

const headroomTone = headroomBadge;

/**
 * Live value per chart series, doubling as the chart legend. Clicking one hides
 * or shows that series on every node chart; values at/over their migration
 * threshold turn red.
 */
function MetricChips({ node, hidden, onToggle, thresholds }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {RESOURCE_METRICS.map(m => {
        const off = hidden.includes(m.key);
        const v = m.current(node);
        const over = typeof thresholds[m.key] === 'number' && v >= thresholds[m.key];
        const exempt = m.key === 'iowait' && node.iowait_exempt;
        return (
          <button
            key={m.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(m.key); }}
            aria-pressed={!off}
            title={`${off ? 'Show' : 'Hide'} ${m.label} on every node chart${typeof thresholds[m.key] === 'number' ? ` · threshold ${thresholds[m.key]}%` : ''}${exempt ? ` · excluded from scoring (io-exempt: ${(node.iowait_exempt_guests || []).map(g => g.name).join(', ') || 'passthrough'})` : ''}`}
            className={`${FILTER_CHIP} ${FILTER_CHIP_INACTIVE} !px-2.5 !py-1 inline-flex items-center gap-1.5 ${off ? 'opacity-40' : ''}`}
          >
            <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: m.color }} />
            {m.label}
            <span className={`font-semibold tabular-nums ${over && !exempt ? 'text-red-600 dark:text-red-400' : 'text-pb-text dark:text-white'}`}>{v.toFixed(1)}%</span>
            {exempt && <span className="text-[9px] font-semibold px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">exempt</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function NodeStatusSection({
  data,
  collapsedSections, toggleSection,
  recommendationData, recommendations,
  nodeGridColumns, setNodeGridColumns,
  chartPeriod, setChartPeriod,
  nodeScores,
  migrationHistory,
  chartJsLoaded, loadChartJs,
  embedded = false,
}) {
  // Charts build only once Chart.js and its annotation plugin are both loaded.
  useEffect(() => {
    if (!chartJsLoaded && typeof loadChartJs === 'function') loadChartJs();
  }, [chartJsLoaded]);
  // Shared crosshair time across all node charts; expanded node for the detail modal.
  const [hoverTime, setHoverTime] = useState(null);
  const [expandedNode, setExpandedNode] = useState(null);
  // Predicted-impact overlay was removed; keep the flag false so the collapsed-card
  // conditionals simply render live values.
  const showPredicted = false;
  // Recommendation thresholds (the lines that trigger migrations) for chart overlays.
  const thresholds = {
    cpu: recommendationData?.parameters?.cpu_threshold,
    mem: recommendationData?.parameters?.mem_threshold,
    iowait: recommendationData?.parameters?.iowait_threshold,
  };
  // Chart overlay toggles (persisted). Envelope defaults off — it's the busiest.
  const lsBool = (k, dflt) => { try { const v = localStorage.getItem(k); return v == null ? dflt : v === 'true'; } catch { return dflt; } };
  const [showMarkers, setShowMarkers] = useState(() => lsBool('nodeChartMarkers', true));
  const [showThresholds, setShowThresholds] = useState(() => lsBool('nodeChartThresholds', true));
  const [showEnvelope, setShowEnvelope] = useState(() => lsBool('nodeChartEnvelope', false));
  const overlayToggle = (key, val, setter) => { setter(val); try { localStorage.setItem(key, String(val)); } catch {} };
  // Group charts by node (default) or by metric; focusNode highlights one node in metric view.
  const [compareBy, setCompareBy] = useState(() => { try { return localStorage.getItem('nodeChartCompare') === 'metric' ? 'metric' : 'node'; } catch { return 'node'; } });
  const setCompare = (id) => { setCompareBy(id); try { localStorage.setItem('nodeChartCompare', id); } catch {} };
  const [focusNode, setFocusNode] = useState(null);
  // Colors follow the sorted node order, matching the Cluster Health chart's per-node views.
  // Memoized so hover re-renders don't rebuild the comparison charts.
  const compareNodes = useMemo(() => Object.values(data.nodes || {})
    .slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((n, i) => ({ node: n, name: n.name, color: NODE_COLORS[i % NODE_COLORS.length], trendData: n.trend_data }))
    .filter(n => hasTrendData(n.node)), [data.nodes]);
  const metricNodes = useMemo(() => Object.fromEntries(RESOURCE_METRICS.map(m => [
    m.key, compareNodes.map(({ node, ...rest }) => ({ ...rest, current: m.current(node), exempt: m.key === 'iowait' && !!node.iowait_exempt })),
  ])), [compareNodes]);
  // Drop a focus whose node has gone away (renamed, removed from the cluster).
  useEffect(() => {
    if (focusNode && !compareNodes.some(n => n.name === focusNode)) setFocusNode(null);
  }, [compareNodes, focusNode]);
  // Series hidden on every node chart (toggled from the metric chips; persisted).
  const [hiddenMetrics, setHiddenMetrics] = useState(() => { try { return JSON.parse(localStorage.getItem('nodeChartHidden') || '[]'); } catch { return []; } });
  const toggleMetric = (key) => {
    const next = hiddenMetrics.includes(key) ? hiddenMetrics.filter(k => k !== key) : [...hiddenMetrics, key];
    setHiddenMetrics(next);
    try { localStorage.setItem('nodeChartHidden', JSON.stringify(next)); } catch {}
  };
  // When embedded, the parent owns the section card and header; always render expanded.
  const Wrapper = embedded ? React.Fragment : 'div';
  const wrapperProps = embedded ? {} : { className: `${GLASS_CARD} overflow-hidden` };
  const isCollapsed = embedded ? false : collapsedSections.nodeStatus;
  return (
        <Wrapper {...wrapperProps}>
          <div className={`flex flex-wrap items-center justify-between gap-y-3 ${embedded ? 'mb-3' : 'mb-6'}`}>
            {!embedded && (
              <div className="flex items-center gap-3 min-w-0">
                <div className={iconBadge('cyan', 'blue')}>
                  <HardDrive size={ICON.section} className="text-pb-text dark:text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-pb-text dark:text-white">Node Status</h2>
                  <p className="text-sm text-pb-text2 dark:text-gray-400 mt-0.5">Detailed node metrics</p>
                </div>
                <button
                  onClick={() => toggleSection('nodeStatus')}
                  className="ml-2 p-2 hover:bg-pb-surface2 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                  title={collapsedSections.nodeStatus ? "Expand section" : "Collapse section"}
                >
                  <ChevronDown size={ICON.section} className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${!collapsedSections.nodeStatus ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-pb-text2 dark:text-gray-400">Compare:</label>
                <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800/60 border border-pb-border dark:border-slate-700/50 p-0.5">
                  {COMPARE_MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setCompare(m.id)}
                      title={m.title}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        compareBy === m.id ? 'bg-blue-600 text-white' : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <label className="text-sm text-pb-text2 dark:text-gray-400">Grid:</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(cols => (
                    <button
                      key={cols}
                      onClick={() => setNodeGridColumns(cols)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        nodeGridColumns === cols
                          ? 'bg-blue-600 text-white'
                          : 'bg-pb-surface2 dark:bg-slate-700 text-pb-text dark:text-gray-300 hover:bg-slate-600'
                      }`}
                      title={`${cols} column${cols > 1 ? 's' : ''}`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-pb-text2 dark:text-gray-400">Chart Period:</label>
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className={SELECT_FIELD}
                >
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="12h">12 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="1y">1 Year</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-pb-text2 dark:text-gray-400">Overlays:</label>
                <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800/60 border border-pb-border dark:border-slate-700/50 p-0.5">
                  {[
                    { k: 'nodeChartMarkers', label: 'Markers', val: showMarkers, set: setShowMarkers },
                    { k: 'nodeChartThresholds', label: 'Thresholds', val: showThresholds, set: setShowThresholds },
                    { k: 'nodeChartEnvelope', label: 'Min/Max', val: showEnvelope, set: setShowEnvelope },
                  ].map(o => (
                    <button
                      key={o.k}
                      onClick={() => overlayToggle(o.k, !o.val, o.set)}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                        o.val ? 'bg-blue-600 text-white' : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
                      }`}
                      title={`${o.val ? 'Hide' : 'Show'} ${o.label.toLowerCase()} on the resource charts`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isCollapsed ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Object.values(data.nodes).slice().sort((a, b) => a.name.localeCompare(b.name)).map(node => {
                const predicted = showPredicted && recommendationData?.summary?.batch_impact?.after?.node_scores?.[node.name];
                const before = showPredicted && recommendationData?.summary?.batch_impact?.before?.node_scores?.[node.name];
                return (
                <div key={node.name} className={`${INNER_CARD} hover:shadow-md transition-shadow ${
                  showPredicted && predicted ? 'border-indigo-600 ring-1 ring-indigo-800' : ''
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-pb-text dark:text-white">{node.name}</h3>
                    <div className="flex items-center gap-1">
                      {showPredicted && predicted && before && (
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                          predicted.cpu < before.cpu - 0.5 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                          predicted.cpu > before.cpu + 0.5 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                          'bg-pb-surface2 dark:bg-slate-700 text-pb-text2 dark:text-gray-500'
                        }`}>
                          {predicted.guest_count !== before.guest_count
                            ? `${predicted.guest_count > before.guest_count ? '+' : ''}${predicted.guest_count - before.guest_count} guest${Math.abs(predicted.guest_count - before.guest_count) !== 1 ? 's' : ''}`
                            : 'no change'
                          }
                        </span>
                      )}
                      <span className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={node.status} aria-label={node.status} role="status"></span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {/* CPU */}
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-pb-text2 dark:text-gray-400 flex items-center gap-0.5">CPU:
                          {(() => {
                            const trend = node.metrics?.cpu_trend;
                            const ta = node.score_details?.trend_analysis || nodeScores?.[node.name]?.trend_analysis;
                            const dir = ta?.cpu_direction || trend;
                            if (dir === 'sustained_increase') return <TrendingUp size={10} className="text-red-500" title={ta ? `CPU ${ta.cpu_rate_per_day > 0 ? '+' : ''}${ta.cpu_rate_per_day?.toFixed(1)}%/day` : 'Rising fast'} />;
                            if (dir === 'rising') return <TrendingUp size={10} className="text-orange-600 dark:text-orange-400" title={ta ? `CPU ${ta.cpu_rate_per_day > 0 ? '+' : ''}${ta.cpu_rate_per_day?.toFixed(1)}%/day` : 'Rising'} />;
                            if (dir === 'falling' || dir === 'sustained_decrease') return <TrendingDown size={10} className="text-green-500" title="Falling" />;
                            return null;
                          })()}
                        </span>
                        {showPredicted && predicted ? (
                          <span className="font-semibold">
                            <span className="text-pb-text2 dark:text-gray-400 line-through mr-1">{(node.cpu_percent || 0).toFixed(0)}%</span>
                            <span className={`${predicted.cpu < (node.cpu_percent || 0) - 0.5 ? 'text-green-600 dark:text-green-400' : predicted.cpu > (node.cpu_percent || 0) + 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {predicted.cpu.toFixed(1)}%
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {(node.cpu_percent || 0).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Memory */}
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-pb-text2 dark:text-gray-400 flex items-center gap-0.5">Memory:
                          {(() => {
                            const trend = node.metrics?.mem_trend;
                            const ta = node.score_details?.trend_analysis || nodeScores?.[node.name]?.trend_analysis;
                            const dir = ta?.mem_direction || trend;
                            if (dir === 'sustained_increase') return <TrendingUp size={10} className="text-red-500" title={ta ? `Mem ${ta.mem_rate_per_day > 0 ? '+' : ''}${ta.mem_rate_per_day?.toFixed(1)}%/day` : 'Rising fast'} />;
                            if (dir === 'rising') return <TrendingUp size={10} className="text-orange-600 dark:text-orange-400" title="Rising" />;
                            if (dir === 'falling' || dir === 'sustained_decrease') return <TrendingDown size={10} className="text-green-500" title="Falling" />;
                            return null;
                          })()}
                        </span>
                        {showPredicted && predicted ? (
                          <span className="font-semibold">
                            <span className="text-pb-text2 dark:text-gray-400 line-through mr-1">{(node.mem_percent || 0).toFixed(0)}%</span>
                            <span className={`${predicted.mem < (node.mem_percent || 0) - 0.5 ? 'text-green-600 dark:text-green-400' : predicted.mem > (node.mem_percent || 0) + 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`}>
                              {predicted.mem.toFixed(1)}%
                            </span>
                          </span>
                        ) : (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {(node.mem_percent || 0).toFixed(1)}%
                        </span>
                        )}
                      </div>
                    </div>

                    {/* IOWait */}
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-pb-text2 dark:text-gray-400 flex items-center gap-0.5">IOWait:
                          {(() => {
                            const iowait = node.metrics?.current_iowait || 0;
                            const avgIowait = node.metrics?.avg_iowait || 0;
                            if (iowait > 30) return <TrendingUp size={10} className="text-red-500" title={`IOWait ${iowait.toFixed(1)}% (critical)`} />;
                            if (iowait > 15 && avgIowait > 10) return <TrendingUp size={10} className="text-orange-600 dark:text-orange-400" title={`IOWait ${iowait.toFixed(1)}% (elevated, avg ${avgIowait.toFixed(1)}%)`} />;
                            return null;
                          })()}
                          {node.iowait_exempt && (
                            <span
                              className="text-[9px] font-semibold px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                              title={`Excluded from node scoring — io-exempt guest(s): ${(node.iowait_exempt_guests || []).map(g => g.name).join(', ') || 'passthrough'}`}
                            >exempt</span>
                          )}
                        </span>
                        <span className={`font-semibold ${
                          (node.metrics?.current_iowait || 0) > 30 ? 'text-red-600 dark:text-red-400' :
                          (node.metrics?.current_iowait || 0) > 15 ? 'text-orange-600 dark:text-orange-400' :
                          'text-orange-600 dark:text-orange-400'
                        }`}>
                          {(node.metrics?.current_iowait || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-pb-border dark:border-slate-600">
                      <span className="text-pb-text2 dark:text-gray-400">Headroom:</span>
                      <span className={`font-semibold ${
                        nodeScores && nodeScores[node.name] ? headroomTextColor(nodeScores[node.name].suitability_rating) : 'text-pb-text dark:text-white'
                      }`}>
                        {nodeScores && nodeScores[node.name] ? `${nodeScores[node.name].suitability_rating}/100` : 'N/A'}
                      </span>
                    </div>

                    {/* Stability + Overcommit indicators */}
                    {nodeScores && nodeScores[node.name] && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {nodeScores[node.name].trend_analysis?.stability_score != null && (() => {
                          const s = nodeScores[node.name].trend_analysis.stability_score;
                          const label = s >= 80 ? 'Stable' : s >= 60 ? 'Moderate' : s >= 40 ? 'Variable' : 'Volatile';
                          const color = s >= 80 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : s >= 60 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : s >= 40 ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
                          const factor = nodeScores[node.name].trend_analysis.cpu_stability_factor;
                          const factorTip = factor && factor !== 1.0 ? ` | CPU penalties ${factor < 1 ? `reduced ${Math.round((1 - factor) * 100)}%` : `inflated ${Math.round((factor - 1) * 100)}%`}` : '';
                          return (
                            <span className={`px-1.5 py-0 rounded text-[9px] font-medium ${color}`}
                              title={`Stability: ${s}/100${factorTip}`}>
                              {label}
                            </span>
                          );
                        })()}
                        {nodeScores[node.name].overcommit_ratio > 0 && (() => {
                          const oc = nodeScores[node.name].overcommit_ratio;
                          const committed = nodeScores[node.name].committed_mem_gb;
                          const color = oc > 1.2 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : oc > 1.0 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            : oc > 0.85 ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : '';
                          if (!color) return null;
                          return (
                            <span className={`px-1.5 py-0 rounded text-[9px] font-medium ${color}`}
                              title={`Memory overcommit: ${(oc * 100).toFixed(0)}% (${committed?.toFixed(1) || '?'}GB committed)`}>
                              OC {(oc * 100).toFixed(0)}%
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Penalty Breakdown Bar */}
                    {nodeScores && nodeScores[node.name] && nodeScores[node.name].penalty_categories && (() => {
                      const cats = nodeScores[node.name].penalty_categories;
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
                        <div className="mt-1">
                          <div className="text-[10px] text-pb-text2 dark:text-gray-400 mb-0.5">Penalty Sources ({total} pts)</div>
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-600" title={segments.map(s => `${s.label}: ${s.value}`).join(', ')}>
                            {segments.map(s => (
                              <div key={s.key} className={`${s.color}`} style={{ width: `${(s.value / total * 100)}%` }} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
                            {segments.map(s => (
                              <span key={s.key} className="text-[9px] text-pb-text2 dark:text-gray-400 flex items-center gap-0.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color}`}></span>
                                {s.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-between">
                      <span className="text-pb-text2 dark:text-gray-400">Guests:</span>
                      <span className="font-semibold text-pb-text dark:text-white">{node.guests?.length || 0}</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : compareBy === 'metric' ? (
          <div className={`grid gap-4 ${
            nodeGridColumns === 1 ? 'grid-cols-1' :
            nodeGridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}>
            {RESOURCE_METRICS.map(m => (
              <MetricCompareCard
                key={m.key}
                metric={m}
                nodes={metricNodes[m.key]}
                threshold={thresholds[m.key]}
                focusNode={focusNode}
                onFocusNode={setFocusNode}
                chartPeriod={chartPeriod}
                migrationHistory={migrationHistory}
                hoverTime={hoverTime}
                onHoverTime={setHoverTime}
                showMarkers={showMarkers}
                showThresholds={showThresholds}
                showEnvelope={showEnvelope}
                chartReady={!!chartJsLoaded}
              />
            ))}
          </div>
          ) : (
          <div className={`grid gap-4 transition-all duration-300 ease-in-out ${
            nodeGridColumns === 1 ? 'grid-cols-1' :
            nodeGridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            nodeGridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          }`}>
            {Object.values(data.nodes).slice().sort((a, b) => a.name.localeCompare(b.name)).map(node => (
              <div key={node.name} className={INNER_CARD}>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-pb-text dark:text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={node.status} aria-label={node.status} role="status"></span>
                      {node.name}
                    </h3>
                    <div className="text-xs text-pb-text2 dark:text-gray-400">
                      {node.cpu_cores || 0} cores · {node.guests?.length || 0} guests{node.status !== 'online' ? ` · ${node.status}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {nodeScores?.[node.name] && (
                      <span className={statusBadge(headroomTone(nodeScores[node.name].suitability_rating))} title="Headroom 0–100 — higher means more room to take guests">
                        Headroom {Math.round(nodeScores[node.name].suitability_rating)}
                      </span>
                    )}
                    {hasTrendData(node) && (
                      <button onClick={() => setExpandedNode(node.name)} title="Expand chart" aria-label="Expand chart" className={`${BTN_ICON} !p-1 text-sm leading-none`}>⤢</button>
                    )}
                  </div>
                </div>

                <MetricChips node={node} hidden={hiddenMetrics} onToggle={toggleMetric} thresholds={thresholds} />

                {hasTrendData(node) && (
                  <div
                    className="mt-3 cursor-pointer"
                    style={{height: '200px'}}
                    onClick={() => setExpandedNode(node.name)}
                    title="Click to expand"
                  >
                    <NodeChart
                      nodeName={node.name}
                      trendData={node.trend_data}
                      chartPeriod={chartPeriod}
                      migrationHistory={migrationHistory}
                      thresholds={thresholds}
                      hoverTime={hoverTime}
                      onHoverTime={setHoverTime}
                      showMarkers={showMarkers}
                      showThresholds={showThresholds}
                      showEnvelope={showEnvelope}
                      hiddenMetrics={hiddenMetrics}
                      chartReady={!!chartJsLoaded}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          )}

          {expandedNode && data.nodes[expandedNode] && (
            <div className={MODAL_OVERLAY} onClick={() => setExpandedNode(null)}>
              <div className={`${MODAL_CONTAINER.replace('max-w-md', 'max-w-5xl')} !overflow-visible`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-pb-border dark:border-slate-700">
                  <h3 className="text-lg font-bold text-pb-text dark:text-white">{expandedNode} — resource trend</h3>
                  <button onClick={() => setExpandedNode(null)} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"><X size={22} /></button>
                </div>
                <div className="p-4">
                  <div className="mb-3"><MetricChips node={data.nodes[expandedNode]} hidden={hiddenMetrics} onToggle={toggleMetric} thresholds={thresholds} /></div>
                  <div style={{ height: '60vh' }}>
                    <NodeChart
                      nodeName={expandedNode}
                      trendData={data.nodes[expandedNode].trend_data}
                      chartPeriod={chartPeriod}
                      migrationHistory={migrationHistory}
                      thresholds={thresholds}
                      hoverTime={hoverTime}
                      onHoverTime={setHoverTime}
                      showMarkers={showMarkers}
                      showThresholds={showThresholds}
                      showEnvelope={showEnvelope}
                      hiddenMetrics={hiddenMetrics}
                      chartReady={!!chartJsLoaded}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Wrapper>
  );
}
