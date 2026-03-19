import {
  ArrowRight, Bell, CheckCircle, Clock, Download, Info,
  RefreshCw, Settings, XCircle
} from '../Icons.jsx';

export default function MigrationLogsSection({
  automationStatus, automigrateLogs,
  migrationHistoryPage, setMigrationHistoryPage,
  migrationHistoryPageSize, setMigrationHistoryPageSize,
  migrationLogsTab, setMigrationLogsTab,
  setAutomigrateLogs, logRefreshTime, setLogRefreshTime,
  fetchAutomationStatus, setCurrentPage,
  collapsedSections, setCollapsedSections, automationConfig
}) {
  return (<>
        {/* Migration Logs & History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-y-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Logs & History</h2>
              <span className="relative group inline-block">
                <Info size={16} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" style={{minWidth: '280px'}}>
                  <div className="font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-2">Migration Scoring System</div>
                  <div className="text-[11px] space-y-1">
                    <div className="text-gray-300">Migrations are scored using a penalty-based system:</div>
                    <div className="mt-2 space-y-0.5">
                      <div>• <span className="text-blue-300">CPU Load</span> × 30%</div>
                      <div>• <span className="text-blue-300">Memory Load</span> × 30%</div>
                      <div>• <span className="text-blue-300">IOWait</span> × 20%</div>
                      <div>• <span className="text-blue-300">Load Average</span> × 10%</div>
                      <div>• <span className="text-blue-300">Storage Pressure</span> × 10%</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-gray-400">Lower penalty score = better target</div>
                      <div className="text-gray-400">Plus penalties for high usage & trends</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div><span className="text-green-400 font-semibold">70%+</span> = Excellent</div>
                      <div><span className="text-yellow-400 font-semibold">50-69%</span> = Good</div>
                      <div><span className="text-orange-400 font-semibold">30-49%</span> = Fair</div>
                      <div><span className="text-red-400 font-semibold">&lt;30%</span> = Poor</div>
                    </div>
                  </div>
                </div>
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setMigrationLogsTab('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  migrationLogsTab === 'history'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Migration History
              </button>
              <button
                onClick={() => setMigrationLogsTab('logs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  migrationLogsTab === 'logs'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Script Logs
              </button>
            </div>
          </div>

          {/* Migration History Table */}
          {migrationLogsTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-y-3">
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0
                      ? `Showing ${((migrationHistoryPage - 1) * migrationHistoryPageSize) + 1}-${Math.min(migrationHistoryPage * migrationHistoryPageSize, automationStatus.recent_migrations.length)} of ${automationStatus.recent_migrations.length} migrations`
                      : 'No migrations'}
                  </div>
                  <select
                    value={migrationHistoryPageSize}
                    onChange={(e) => {
                      setMigrationHistoryPageSize(Number(e.target.value));
                      setMigrationHistoryPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <button
                  onClick={fetchAutomationStatus}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">VM</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Migration</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 ? (
                      (() => {
                        const reversedMigrations = automationStatus.recent_migrations.slice().reverse();
                        const startIndex = (migrationHistoryPage - 1) * migrationHistoryPageSize;
                        const endIndex = startIndex + migrationHistoryPageSize;
                        const paginatedMigrations = reversedMigrations.slice(startIndex, endIndex);
                        return paginatedMigrations.map((migration) => {
                        // Format timestamp
                        let timeDisplay = '';
                        if (migration.timestamp) {
                          try {
                            const timestamp = migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z';
                            const migrationDate = new Date(timestamp);
                            timeDisplay = migrationDate.toLocaleString();
                          } catch (e) {
                            timeDisplay = migration.timestamp;
                          }
                        }

                        // Format duration
                        const durationDisplay = migration.duration_seconds
                          ? `${Math.floor(migration.duration_seconds / 60)}m ${migration.duration_seconds % 60}s`
                          : '-';

                        return (
                          <tr key={migration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {timeDisplay}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {migration.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {migration.vmid}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <span className="font-mono">{migration.source_node}</span>
                                <ArrowRight size={12} />
                                <span className="font-mono">{migration.target_node}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) ? (
                                (() => {
                                  // Convert raw penalty score to suitability percentage
                                  const suitabilityPercent = migration.suitability_rating !== undefined
                                    ? migration.suitability_rating
                                    : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));

                                  return (
                                <div className="flex items-center gap-1">
                                  <span className={`font-semibold ${
                                    suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                    suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {suitabilityPercent}%
                                  </span>
                                  <span className="relative group inline-block">
                                    <Info size={12} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                                      <div className="font-semibold mb-1 text-blue-400">Scoring Breakdown</div>
                                      <div className="text-[10px] space-y-0.5">
                                        <div>Target: {migration.target_node}</div>
                                        <div>Penalty Score: {migration.target_node_score?.toFixed(1) || 'N/A'}</div>
                                        <div>Suitability: {suitabilityPercent}%</div>
                                        <div className="border-t border-gray-700 pt-1 mt-1">
                                          <div className="text-gray-400">Lower penalty = better target</div>
                                          <div>• CPU Load × 30%</div>
                                          <div>• Memory Load × 30%</div>
                                          <div>• IOWait × 20%</div>
                                          <div>• Load Avg × 10%</div>
                                          <div>• Storage Pressure × 10%</div>
                                          <div className="mt-1 text-gray-400">+ Penalties for high usage/trends</div>
                                        </div>
                                        {migration.target_node_score > 100 && (
                                          <div className="border-t border-gray-700 pt-1 mt-1 text-red-400">
                                            ⚠ Penalty score &gt;100 indicates heavy load/trends
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </span>
                                </div>
                                  );
                                })()
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                              <div className="truncate" title={migration.reason}>
                                {migration.reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${
                                  migration.status === 'completed'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : migration.status === 'failed'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : migration.status === 'timeout'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                }`}>
                                  {migration.status === 'completed' && <CheckCircle size={12} />}
                                  {migration.status === 'failed' && <XCircle size={12} />}
                                  {migration.status === 'timeout' && <Clock size={12} />}
                                  {migration.status}
                                </span>
                                {migration.dry_run && (
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    DRY RUN
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {durationDisplay}
                            </td>
                          </tr>
                        );
                      });
                      })()
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No migration history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {migrationHistoryPage} of {Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMigrationHistoryPage(1)}
                      disabled={migrationHistoryPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setMigrationHistoryPage(migrationHistoryPage - 1)}
                      disabled={migrationHistoryPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setMigrationHistoryPage(migrationHistoryPage + 1)}
                      disabled={migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setMigrationHistoryPage(Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize))}
                      disabled={migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Script Logs */}
          {migrationLogsTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-y-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 min-w-0">
                  {logRefreshTime && `Last updated: ${logRefreshTime}`}
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/automigrate/logs?lines=500');
                        const data = await response.json();
                        if (data.success) {
                          setAutomigrateLogs(data.logs);
                          setLogRefreshTime(new Date().toLocaleTimeString());
                        }
                      } catch (error) {
                        console.error('Error fetching logs:', error);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
                    title="Refresh Logs"
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!automigrateLogs) return;
                      const blob = new Blob([automigrateLogs], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `automigrate-logs-${new Date().toISOString().split('T')[0]}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    disabled={!automigrateLogs}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 dark:bg-black rounded border border-gray-700 p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {automigrateLogs || 'Click "Refresh" to load logs...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Notification Settings - Link to Settings page */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-y-3">
            <div className="flex items-center gap-3 min-w-0">
              <Bell size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {automationConfig.notifications?.enabled
                    ? `Enabled - ${Object.entries(automationConfig.notifications?.providers || {}).filter(([,v]) => v?.enabled).length} provider(s) active`
                    : 'Configure notification providers for migration events'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('settings')}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings size={16} />
              Open Settings
            </button>
          </div>
        </div>
  </>);
}
