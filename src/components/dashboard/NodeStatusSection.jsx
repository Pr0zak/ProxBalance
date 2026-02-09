import { HardDrive, ChevronDown, ChevronUp, Eye } from '../Icons.jsx';

export default function NodeStatusSection({
  data,
  collapsedSections, toggleSection,
  showPredicted, setShowPredicted,
  recommendationData, recommendations,
  nodeGridColumns, setNodeGridColumns,
  chartPeriod, setChartPeriod,
  nodeScores,
  generateSparkline,
}) {
  return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg shadow-md shrink-0">
                <HardDrive size={24} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Node Status</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Detailed node metrics</p>
              </div>
              <button
                onClick={() => toggleSection('nodeStatus')}
                className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                title={collapsedSections.nodeStatus ? "Expand section" : "Collapse section"}
              >
                {collapsedSections.nodeStatus ? (
                  <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* B4: Predicted Impact Toggle */}
              {recommendationData?.summary?.batch_impact && recommendations.length > 0 && (
                <button
                  onClick={() => setShowPredicted(!showPredicted)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    showPredicted
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                  }`}
                  title="Show predicted node metrics after all recommended migrations"
                >
                  <Eye size={14} />
                  {showPredicted ? 'Showing Predicted' : 'Show Predicted'}
                </button>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Grid:</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(cols => (
                    <button
                      key={cols}
                      onClick={() => setNodeGridColumns(cols)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        nodeGridColumns === cols
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title={`${cols} column${cols > 1 ? 's' : ''}`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Chart Period:</label>
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            </div>
          </div>

          {collapsedSections.nodeStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Object.values(data.nodes).map(node => {
                const predicted = showPredicted && recommendationData?.summary?.batch_impact?.after?.node_scores?.[node.name];
                const before = showPredicted && recommendationData?.summary?.batch_impact?.before?.node_scores?.[node.name];
                return (
                <div key={node.name} className={`border rounded p-3 hover:shadow-md transition-shadow ${
                  showPredicted && predicted ? 'border-indigo-300 dark:border-indigo-600 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                    <div className="flex items-center gap-1">
                      {showPredicted && predicted && before && (
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                          predicted.cpu < before.cpu - 0.5 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                          predicted.cpu > before.cpu + 0.5 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                          {predicted.guest_count !== before.guest_count
                            ? `${predicted.guest_count > before.guest_count ? '+' : ''}${predicted.guest_count - before.guest_count} guest${Math.abs(predicted.guest_count - before.guest_count) !== 1 ? 's' : ''}`
                            : 'no change'
                          }
                        </span>
                      )}
                      <span className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={node.status}></span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {/* CPU with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                        {showPredicted && predicted ? (
                          <span className="font-semibold">
                            <span className="text-gray-400 line-through mr-1">{(node.cpu_percent || 0).toFixed(0)}%</span>
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
                      <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-blue-500"
                          points={generateSparkline(node.cpu_percent || 0, 100, 30, 0.3)}
                        />
                      </svg>
                    </div>

                    {/* Memory with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                        {showPredicted && predicted ? (
                          <span className="font-semibold">
                            <span className="text-gray-400 line-through mr-1">{(node.mem_percent || 0).toFixed(0)}%</span>
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
                      <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-purple-500"
                          points={generateSparkline(node.mem_percent || 0, 100, 30, 0.25)}
                        />
                      </svg>
                    </div>

                    {/* IOWait with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">IOWait:</span>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {(node.metrics?.current_iowait || 0).toFixed(1)}%
                        </span>
                      </div>
                      <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-orange-500"
                          points={generateSparkline(node.metrics?.current_iowait || 0, 100, 30, 0.35)}
                        />
                      </svg>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-600 dark:text-gray-400">Suitability:</span>
                      <span className={`font-semibold ${
                        nodeScores && nodeScores[node.name] ? (
                          nodeScores[node.name].suitability_rating >= 70 ? 'text-green-600 dark:text-green-400' :
                          nodeScores[node.name].suitability_rating >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          nodeScores[node.name].suitability_rating >= 30 ? 'text-orange-600 dark:text-orange-400' :
                          'text-red-600 dark:text-red-400'
                        ) : 'text-gray-900 dark:text-white'
                      }`}>
                        {nodeScores && nodeScores[node.name] ? `${nodeScores[node.name].suitability_rating}%` : 'N/A'}
                      </span>
                    </div>

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
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Penalty Sources ({total} pts)</div>
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600" title={segments.map(s => `${s.label}: ${s.value}`).join(', ')}>
                            {segments.map(s => (
                              <div key={s.key} className={`${s.color}`} style={{ width: `${(s.value / total * 100)}%` }} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
                            {segments.map(s => (
                              <span key={s.key} className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color}`}></span>
                                {s.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Guests:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
          <div className={`grid gap-4 transition-all duration-300 ease-in-out ${
            nodeGridColumns === 1 ? 'grid-cols-1' :
            nodeGridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            nodeGridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          }`}>
            {Object.values(data.nodes).map(node => (
              <div key={node.name} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                  <span className={`text-sm font-medium ${node.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{node.status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm mb-4">
                  <div><span className="text-gray-600 dark:text-gray-400">CPU:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{(node.cpu_percent || 0).toFixed(1)}%</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">Memory:</span> <span className="font-semibold text-purple-600 dark:text-purple-400">{(node.mem_percent || 0).toFixed(1)}%</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">IOWait:</span> <span className="font-semibold text-orange-600 dark:text-orange-400">{(node.metrics?.current_iowait || 0).toFixed(1)}%</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">Cores:</span> <span className="font-semibold text-gray-900 dark:text-white">{node.cpu_cores || 0}</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">Guests:</span> <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span></div>
                </div>

                {node.trend_data && typeof node.trend_data === 'object' && Object.keys(node.trend_data).length > 0 && (
                  <div className="mt-4" style={{height: '200px'}}>
                    <canvas id={`chart-${node.name}`}></canvas>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
  );
}
