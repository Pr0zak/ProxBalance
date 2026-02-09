import {
  Activity, RefreshCw, CheckCircle, AlertTriangle, Shield, Lock,
  Play, ChevronDown, ChevronUp, AlertCircle
} from '../Icons.jsx';

export default function AIRecommendationsSection({
  config, aiEnabled,
  collapsedSections, toggleSection,
  aiRecommendations, loadingAi, aiAnalysisPeriod, setAiAnalysisPeriod, fetchAiRecommendations,
  migrationStatus, setMigrationStatus, completedMigrations, guestsMigrating, migrationProgress,
  cancelMigration, canMigrate, trackMigration,
  API_BASE
}) {
  if (!config?.ai_recommendations_enabled || !aiEnabled) return null;

  return (
          <div className="hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-md shrink-0">
                  <Activity size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">AI-Enhanced Recommendations</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">AI-powered migration insights</p>
                </div>
                <button
                  onClick={() => toggleSection('aiRecommendations')}
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  title={collapsedSections.aiRecommendations ? "Expand section" : "Collapse section"}
                >
                  {collapsedSections.aiRecommendations ? (
                    <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Period:</label>
                  <select
                    value={aiAnalysisPeriod}
                    onChange={(e) => setAiAnalysisPeriod(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="1h">Last Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                <button
                  onClick={fetchAiRecommendations}
                  disabled={loadingAi}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400"
                >
                  {loadingAi ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      Get AI Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.aiRecommendations && (
            <div className="transition-all duration-300 ease-in-out">
            {!aiRecommendations && !loadingAi && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity size={48} className="mx-auto mb-2" />
                <p className="font-medium">AI Analysis Available</p>
                <p className="text-sm">Click "Get AI Analysis" to receive AI-powered migration recommendations</p>
              </div>
            )}

            {aiRecommendations && !aiRecommendations.success && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle size={20} />
                  <span className="font-medium">AI Analysis Error</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">{aiRecommendations.error}</p>
              </div>
            )}

            {aiRecommendations && aiRecommendations.success && (
              <div className="space-y-4">
                {aiRecommendations.analysis && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-900 dark:text-blue-200">Cluster Analysis</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{aiRecommendations.analysis}</p>
                  </div>
                )}

                {aiRecommendations.predicted_issues && aiRecommendations.predicted_issues.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-900 dark:text-yellow-200">Predicted Issues</span>
                    </div>
                    <div className="space-y-2">
                      {aiRecommendations.predicted_issues.map((issue, idx) => (
                        <div key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                          <span className="font-medium">{issue.node}</span> - {issue.prediction}
                          <span className="ml-2 text-xs">({((issue.confidence || 0) * 100).toFixed(0)}% confidence)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiRecommendations.recommendations && aiRecommendations.recommendations.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle size={48} className="mx-auto mb-2 text-green-500 dark:text-green-400" />
                    <p className="font-medium">No AI Recommendations</p>
                    <p className="text-sm">AI analysis found cluster is well-balanced</p>
                  </div>
                )}

                {aiRecommendations.recommendations && aiRecommendations.recommendations.filter(rec => rec.priority !== 'skipped').length > 0 && (
                  <div className="space-y-4">
                    {aiRecommendations.recommendations.filter(rec => rec.priority !== 'skipped').map((rec, idx) => {
                      const key = `ai-${rec.vmid}-${rec.target_node}`;
                      const status = migrationStatus[key];
                      const completed = completedMigrations[rec.vmid];
                      const isCompleted = completed !== undefined;

                      const priorityColors = {
                        high: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
                        medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
                        low: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                      };

                      const riskColor = rec.risk_score > 0.5 ? 'text-red-600 dark:text-red-400' :
                                       rec.risk_score > 0.2 ? 'text-yellow-600 dark:text-yellow-400' :
                                       'text-green-600 dark:text-green-400';

                      return (
                        <div key={idx} className={`border rounded-lg p-4 transition-all duration-300 ${
                          isCompleted
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
                            : priorityColors[rec.priority] || priorityColors.medium
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-lg">[{rec.type} {rec.vmid}] {rec.name}</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                  rec.priority === 'high' ? 'bg-red-600 text-white' :
                                  rec.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                  'bg-green-600 text-white'
                                }`}>
                                  {rec.priority} Priority
                                </span>
                              </div>

                              <div className="text-sm mb-2">
                                <span className="font-semibold text-red-700 dark:text-red-300">FROM:</span> {rec.source_node}
                                <span className="mx-2">→</span>
                                <span className="font-semibold text-green-700 dark:text-green-300">TO:</span> {rec.target_node}
                              </div>

                              <div className="bg-white dark:bg-gray-800 rounded p-3 mb-2">
                                <div className="flex items-start gap-2 mb-1">
                                  <Shield size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="font-semibold text-sm">AI Reasoning:</span>
                                    <p className="text-sm mt-1">{rec.reasoning}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs mb-2">
                                <AlertTriangle size={14} className={riskColor} />
                                <span className="font-medium">Risk Score:</span>
                                <span className={`font-bold ${riskColor}`}>{((rec.risk_score || 0) * 100).toFixed(0)}%</span>
                              </div>

                              {rec.estimated_impact && (
                                <div className="bg-green-50 dark:bg-green-900/30 rounded p-2 text-xs">
                                  <span className="font-semibold">Expected Impact:</span> {rec.estimated_impact}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {(() => {
                                // If migration is completed, show "Migrated" badge
                                if (isCompleted) {
                                  return (
                                    <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                      <CheckCircle size={16} />
                                      Migrated
                                    </div>
                                  );
                                }

                                // Check if guest is migrating (from Proxmox API via guestsMigrating state)
                                const isMigrating = guestsMigrating[rec.vmid] === true;
                                const migrationKey = `${rec.vmid}-${rec.target_node}`;

                                if (isMigrating && canMigrate) {
                                  const progress = migrationProgress[rec.vmid];
                                  let progressText = '';
                                  let tooltipText = 'Cancel migration in progress';

                                  if (progress) {
                                    if (progress.percentage) {
                                      progressText = ` ${progress.percentage}%`;
                                      if (progress.total_human_readable) {
                                        tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                                      }
                                    } else {
                                      progressText = ` (${progress.human_readable})`;
                                    }
                                  }

                                  return (
                                    <button
                                      onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                                      className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                                      title={tooltipText}
                                    >
                                      <RefreshCw size={16} className="animate-spin" />
                                      Cancel{progressText}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    onClick={() => {
                                      // console.log(`[AI Migration] Starting migration for VMID ${rec.vmid} from ${rec.source_node} to ${rec.target_node}`);
                                      // Use the AI-specific key format
                                      const aiKey = `ai-${rec.vmid}-${rec.target_node}`;
                                      setMigrationStatus(prev => ({ ...prev, [aiKey]: 'running' }));

                                      fetch(`${API_BASE}/migrate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          source_node: rec.source_node,
                                          vmid: rec.vmid,
                                          target_node: rec.target_node,
                                          type: rec.type
                                        })
                                      })
                                      .then(response => response.json())
                                      .then(result => {
                                        // console.log(`[AI Migration] API response for VMID ${rec.vmid}:`, result);
                                        if (result.success) {
                                          // console.log(`[AI Migration] Migration started successfully, calling trackMigration with taskId: ${result.task_id}`);
                                          // Start tracking (button logic will prioritize activeMigrations over migrationStatus)
                                          trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type);
                                          // Migration tracking provides visual feedback - no alert needed
                                        } else {
                                          console.error(`[AI Migration] Migration failed for VMID ${rec.vmid}:`, result.error);
                                          setMigrationStatus(prev => ({ ...prev, [aiKey]: 'failed' }));
                                        }
                                      })
                                      .catch((err) => {
                                        console.error(`[AI Migration] Exception for VMID ${rec.vmid}:`, err);
                                        setMigrationStatus(prev => ({ ...prev, [aiKey]: 'failed' }));
                                      });
                                    }}
                                    disabled={!canMigrate || status === 'running' || isMigrating}
                                    className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                                    title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
                                  >
                                    {!canMigrate ? (
                                      <>
                                        <Lock size={16} />
                                        Read-Only
                                      </>
                                    ) : isMigrating ? (
                                      <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Migrating...
                                      </>
                                    ) : status === 'running' ? (
                                      <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Starting...
                                      </>
                                    ) : (
                                      <>
                                        <Play size={16} />
                                        Migrate
                                      </>
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>
            )}
          </div>
  );
}
