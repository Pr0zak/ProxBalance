import {
  Clock, ChevronDown, ChevronUp, XCircle, CheckCircle, Pause, Settings,
  Play, Loader, X, Info, AlertTriangle, RefreshCw, ClipboardList,
  Download, MinusCircle, ChevronRight, Minus
} from '../Icons.jsx';

export default function AutomationStatusSection({
  automationStatus,
  automationConfig,
  collapsedSections,
  setCollapsedSections,
  toggleSection,
  setCurrentPage,
  fetchAutomationStatus,
  runAutomationNow,
  runningAutomation,
  runNowMessage,
  setRunNowMessage,
  setCancelMigrationModal,
  runHistory,
  expandedRun,
  setExpandedRun
}) {
  if (!automationStatus) return null;

  return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-lg shadow-md shrink-0 ${
                  automationStatus.enabled
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  <Clock size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Automated Migrations</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Scheduled automatic balancing</p>
                </div>
                <button
                  onClick={() => toggleSection('automatedMigrations')}
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  title={collapsedSections.automatedMigrations ? "Expand section" : "Collapse section"}
                >
                  {collapsedSections.automatedMigrations ? (
                    <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {collapsedSections.automatedMigrations && automationStatus.dry_run && automationStatus.enabled && (
              <div className="mb-3">
                <span className="inline-block px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm font-bold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-4">
                {/* Combined Status & Pause/Resume Button */}
                <button
                  onClick={async () => {
                    if (!automationStatus.enabled) return;
                    try {
                      const response = await fetch('/api/automigrate/toggle-timer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: !automationStatus.timer_active })
                      });
                      if (response.ok) {
                        fetchAutomationStatus();
                      } else {
                        console.error('Failed to toggle timer');
                      }
                    } catch (error) {
                      console.error('Error toggling timer:', error);
                    }
                  }}
                  disabled={!automationStatus.enabled}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-sm font-semibold transition-colors flex items-center gap-1.5 sm:gap-2 ${
                    !automationStatus.enabled
                      ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                      : automationStatus.timer_active
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer'
                  }`}
                  title={
                    !automationStatus.enabled
                      ? 'Enable automation in settings first'
                      : automationStatus.timer_active
                      ? 'Click to pause scheduled checks'
                      : 'Click to resume scheduled checks'
                  }
                >
                  <div className={`w-2 h-2 rounded-full ${
                    !automationStatus.enabled
                      ? 'bg-gray-400'
                      : automationStatus.timer_active
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-yellow-500'
                  }`}></div>
                  {!automationStatus.enabled ? (
                    <XCircle size={14} />
                  ) : automationStatus.timer_active ? (
                    <CheckCircle size={14} />
                  ) : (
                    <Pause size={14} />
                  )}
                  <span className="hidden sm:inline">{!automationStatus.enabled ? 'Disabled' : automationStatus.timer_active ? 'Active' : 'Paused'}</span>
                </button>

                {/* Configure Button */}
                <button
                  onClick={() => setCurrentPage('automation')}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 sm:gap-2"
                  title="Configure Automation"
                >
                  <Settings size={16} />
                  <span className="hidden sm:inline">Configure</span>
                </button>

                {/* Run Now Button */}
                <button
                  type="button"
                  onClick={runAutomationNow}
                  disabled={!automationStatus.enabled || runningAutomation}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 sm:gap-2 ${
                    automationStatus.enabled && !runningAutomation
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  title={!automationStatus.enabled ? "Enable automation first" : runningAutomation ? "Running..." : "Run automation check now"}
                >
                  {runningAutomation ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      <span className="hidden sm:inline">Running...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span className="hidden sm:inline">Run Now</span>
                    </>
                  )}
                </button>
            </div>

            {!collapsedSections.automatedMigrations && (
            <>
            {runNowMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                runNowMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                  : runNowMessage.type === 'info'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {runNowMessage.type === 'success' ? (
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    ) : runNowMessage.type === 'info' ? (
                      <Info size={16} className="mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    )}
                    <span style={{whiteSpace: 'pre-line'}}>{runNowMessage.text}</span>
                  </div>
                  <button
                    onClick={() => setRunNowMessage(null)}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                    aria-label="Close message"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
            {automationStatus.dry_run && automationStatus.enabled && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
                  <span className="font-semibold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
                  <span className="text-yellow-600 dark:text-yellow-400">- No actual migrations will be performed</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Automation Status</div>
                <div className={`flex items-center gap-2 ${
                  automationStatus.timer_active
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    automationStatus.timer_active
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}></div>
                  <div className="text-sm font-semibold flex items-center gap-1" title={automationStatus.timer_active ? 'Active' : 'Inactive'}>
                    {automationStatus.timer_active ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-gray-400" />}
                    <span className="hidden sm:inline">{automationStatus.timer_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Check</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    // Check if automated migrations are currently running
                    const hasRunningMigrations = automationStatus.in_progress_migrations &&
                      automationStatus.in_progress_migrations.some(m => m.initiated_by === 'automated');

                    // Priority 1: Show "Running" badge if migrations are active
                    if (hasRunningMigrations) {
                      return (
                        <span className="px-2 py-0.5 rounded-lg border text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center gap-1" title="Running">
                          <Loader size={12} className="animate-spin" /><span className="hidden sm:inline">Running</span>
                        </span>
                      );
                    }

                    // Priority 2: Show countdown if next check time is available
                    if (automationStatus.next_check && automationStatus.enabled) {
                      const nextCheckTime = new Date(automationStatus.next_check);
                      const now = new Date();
                      const diffMs = nextCheckTime - now;
                      const diffMins = Math.floor(diffMs / 60000);

                      if (diffMins > 0) {
                        return (
                          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                            in {diffMins} {diffMins === 1 ? 'min' : 'mins'}
                          </div>
                        );
                      } else {
                        // Show "Now" for 0 or negative (automation should be running/about to run)
                        return (
                          <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                            Now
                          </div>
                        );
                      }
                    }

                    // Priority 3: Fallback to interval display
                    return (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Every {automationStatus.check_interval_minutes} {automationStatus.check_interval_minutes === 1 ? 'min' : 'mins'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Migration History Chart */}
            {(() => {
              const migrations = automationStatus.recent_migrations || [];
              if (migrations.length === 0) return null;

              // Group migrations by date (last 7 days)
              const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                date.setHours(0, 0, 0, 0);
                return date;
              });

              const dailyStats = last7Days.map(date => {
                const dayStart = new Date(date);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);

                const dayMigrations = migrations.filter(m => {
                  let timestamp = m.timestamp;
                  if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                    timestamp += 'Z';
                  }
                  const migDate = new Date(timestamp);
                  return migDate >= dayStart && migDate <= dayEnd;
                });

                const successful = dayMigrations.filter(m => m.status === 'completed').length;
                const failed = dayMigrations.filter(m => m.status === 'failed').length;
                const skipped = dayMigrations.filter(m => m.status === 'skipped').length;

                return {
                  date,
                  total: dayMigrations.length,
                  successful,
                  failed,
                  skipped,
                  label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                };
              });

              const maxMigrations = Math.max(...dailyStats.map(d => d.total), 1);

              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Migration History (Last 7 Days)</h3>
                  <div className="flex items-end justify-between gap-1 h-32">
                    {dailyStats.map((day, idx) => {
                      const heightPercent = (day.total / maxMigrations) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          {/* Bar */}
                          <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '100px' }}>
                            {day.total > 0 ? (
                              <>
                                {day.successful > 0 && (
                                  <div
                                    className="w-full bg-green-500 dark:bg-green-600 rounded-t"
                                    style={{ height: `${(day.successful / day.total) * heightPercent}%` }}
                                    title={`${day.successful} successful`}
                                  />
                                )}
                                {day.failed > 0 && (
                                  <div
                                    className="w-full bg-red-500 dark:bg-red-600"
                                    style={{ height: `${(day.failed / day.total) * heightPercent}%` }}
                                    title={`${day.failed} failed`}
                                  />
                                )}
                                {day.skipped > 0 && (
                                  <div
                                    className="w-full bg-yellow-500 dark:bg-yellow-600 rounded-b"
                                    style={{ height: `${(day.skipped / day.total) * heightPercent}%` }}
                                    title={`${day.skipped} skipped`}
                                  />
                                )}
                              </>
                            ) : (
                              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded" />
                            )}
                          </div>
                          {/* Count */}
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">
                            {day.total > 0 ? day.total : ''}
                          </div>
                          {/* Date Label */}
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                            {day.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Success</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Failed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Skipped</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {automationStatus.state && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Window:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{automationStatus.state.current_window || 'Loading...'}</span>
                </div>
                {automationStatus.state.last_run && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Run:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(() => {
                        // Handle both old string format and new object format
                        let timestamp = automationStatus.state.last_run;
                        if (typeof timestamp === 'object' && timestamp !== null) {
                          timestamp = timestamp.timestamp;
                        }
                        if (timestamp && typeof timestamp === 'string') {
                          if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                            timestamp += 'Z'; // Assume UTC if no timezone specified
                          }
                          return new Date(timestamp).toLocaleString();
                        }
                        return 'Never';
                      })()}
                    </span>
                  </div>
                )}
                {automationStatus.next_check && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Next Run:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(() => {
                        let timestamp = automationStatus.next_check;
                        if (timestamp && typeof timestamp === 'string') {
                          if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                            timestamp += 'Z';
                          }
                          return new Date(timestamp).toLocaleString();
                        }
                        return 'Unknown';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* In-Progress Migrations */}
            {automationStatus.in_progress_migrations && automationStatus.in_progress_migrations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                  Migrations In Progress
                </h4>
                <div className="space-y-2">
                  {automationStatus.in_progress_migrations.map((migration, idx) => {
                    // Calculate elapsed time with robust error handling
                    let elapsedTime = 'N/A';
                    if (migration.starttime && typeof migration.starttime === 'number' && migration.starttime > 0) {
                      try {
                        const elapsedSeconds = Math.floor(Date.now() / 1000 - migration.starttime);
                        if (elapsedSeconds >= 0) {
                          const minutes = Math.floor(elapsedSeconds / 60);
                          const seconds = elapsedSeconds % 60;
                          elapsedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                        }
                      } catch (err) {
                        console.error('Error calculating elapsed time:', err);
                      }
                    }

                    // Determine if automated or manual
                    const isAutomated = migration.initiated_by === 'automated';

                    return (
                      <div key={idx} className={`text-sm rounded p-2 border-2 animate-pulse ${
                        isAutomated
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                          : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                              {migration.source_node} → {migration.target_node || '?'}
                            </span>
                            {migration.type === 'VM' ? (
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded border border-green-300 dark:border-green-600" title="Live migration (no downtime)">
                                LIVE
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded border border-orange-300 dark:border-orange-600" title="Migration with restart (brief downtime)">
                                RESTART
                              </span>
                            )}
                            {!isAutomated && (
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold rounded border border-purple-300 dark:border-purple-600">
                                MANUAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                              isAutomated
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            }`}>
                              <RefreshCw size={12} className="animate-spin" />
                              Running
                            </span>
                            <button
                              onClick={() => setCancelMigrationModal(migration)}
                              className="px-2 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Cancel migration"
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className={`mt-1 text-xs flex items-center gap-3 ${
                          isAutomated
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          {migration.starttime && migration.starttime > 0 ? (
                            <span>Started: {new Date(migration.starttime * 1000).toLocaleTimeString()}</span>
                          ) : (
                            <span>Started: Unknown</span>
                          )}
                          <span className={`font-semibold ${
                            isAutomated
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-purple-600 dark:text-purple-400'
                          }`}>Elapsed: {elapsedTime}</span>
                        </div>
                        {migration.progress && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={isAutomated ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-purple-600 dark:text-purple-400 font-semibold'}>
                                Progress: {migration.progress.percentage}%
                                {migration.progress.speed_mib_s && (
                                  <span className="ml-2 font-normal text-[10px]">
                                    ({migration.progress.speed_mib_s.toFixed(1)} MiB/s)
                                  </span>
                                )}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                                {migration.progress.human_readable}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isAutomated
                                    ? 'bg-blue-600 dark:bg-blue-500'
                                    : 'bg-purple-600 dark:bg-purple-500'
                                }`}
                                style={{ width: `${migration.progress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last Run Summary - Collapsible */}
            {automationStatus.state?.last_run && typeof automationStatus.state.last_run === 'object' && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCollapsedSections(prev => ({...prev, lastRunSummary: !prev.lastRunSummary}))}
                  className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Last Run Summary</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(automationStatus.state.last_run.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {collapsedSections.lastRunSummary ? (
                    <ChevronDown size={18} className="text-gray-500" />
                  ) : (
                    <ChevronUp size={18} className="text-gray-500" />
                  )}
                </button>

                {!collapsedSections.lastRunSummary && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    {/* Run Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</div>
                        <div className={`text-sm font-bold ${
                          automationStatus.state.last_run.status === 'success' ? 'text-green-600 dark:text-green-400' :
                          automationStatus.state.last_run.status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                          automationStatus.state.last_run.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {automationStatus.state.last_run.status === 'success' ? '✓ Success' :
                           automationStatus.state.last_run.status === 'partial' ? '◐ Partial' :
                           automationStatus.state.last_run.status === 'failed' ? '✗ Failed' :
                           automationStatus.state.last_run.status === 'no_action' ? '○ No Action' :
                           automationStatus.state.last_run.status}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Migrations</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.migrations_successful || 0} / {automationStatus.state.last_run.migrations_executed || 0}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.duration_seconds ? `${Math.floor(automationStatus.state.last_run.duration_seconds / 60)}m ${automationStatus.state.last_run.duration_seconds % 60}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mode</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.mode === 'dry_run' ? '🧪 Dry Run' : '🚀 Live'}
                        </div>
                      </div>
                    </div>

                    {/* Decision Details */}
                    {automationStatus.state.last_run.decisions && automationStatus.state.last_run.decisions.length > 0 && (
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3 mb-3 max-h-64 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Decisions Made:</div>
                        <div className="space-y-2">
                          {[...automationStatus.state.last_run.decisions].sort((a, b) => {
                            // Sort by priority: executed/pending first, then skipped by rank, then filtered last
                            const getOrder = (d) => {
                              if (d.action === 'executed' || d.action === 'pending' || d.action === 'failed') return 0;
                              if (d.action === 'skipped') return 1;
                              return 2; // filtered
                            };
                            const orderA = getOrder(a);
                            const orderB = getOrder(b);
                            if (orderA !== orderB) return orderA - orderB;
                            // Within same group, sort by priority rank
                            return (a.priority_rank || 999) - (b.priority_rank || 999);
                          }).map((decision, idx) => {
                            const isExecuted = decision.action === 'executed' || decision.action === 'failed';
                            const isPending = decision.action === 'pending';
                            const borderColor = isExecuted ? 'border-green-500' :
                                               isPending ? 'border-blue-500' :
                                               decision.action === 'skipped' ? 'border-yellow-500' :
                                               'border-gray-400';
                            const bgColor = isExecuted ? 'bg-green-50 dark:bg-green-900/20' :
                                           isPending ? 'bg-blue-50 dark:bg-blue-900/20' :
                                           'bg-gray-50 dark:bg-gray-700';

                            return (
                              <div key={idx} className={`text-xs ${bgColor} rounded p-2 border-l-4 ${borderColor} ${isPending ? 'animate-pulse' : ''}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Priority Rank Badge */}
                                      {decision.priority_rank && (
                                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                          decision.priority_rank === 1
                                            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                        }`}>
                                          #{decision.priority_rank}
                                        </span>
                                      )}

                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {decision.action === 'filtered' ? '⊗' :
                                         decision.action === 'skipped' ? '⏭' :
                                         decision.action === 'pending' ? '🔄' :
                                         decision.action === 'executed' ? '✅' : '✗'} {decision.name || `VM/CT ${decision.vmid}`}
                                      </span>

                                      {decision.type && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                          {decision.type}
                                        </span>
                                      )}

                                      {decision.distribution_balancing && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" title="Distribution Balancing">
                                          ⚖️ Balance
                                        </span>
                                      )}
                                    </div>

                                    <span className="text-gray-600 dark:text-gray-400">
                                      {decision.source_node} → {decision.target_node}
                                      {decision.target_node_score && ` (score: ${decision.target_node_score})`}
                                    </span>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    decision.action === 'executed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    decision.action === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    decision.action === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    decision.action === 'filtered' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {decision.action}
                                  </span>
                                </div>

                                {/* Show selected_reason for executed, regular reason for others */}
                                <div className="mt-1 text-gray-600 dark:text-gray-400">
                                  {decision.selected_reason || decision.reason}
                                </div>

                                {decision.confidence_score && (
                                  <div className="mt-1 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                                    Confidence: {decision.confidence_score}%
                                  </div>
                                )}

                                {decision.error && (
                                  <div className="mt-1 text-red-600 dark:text-red-400 text-[10px]">
                                    Error: {decision.error}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Safety Checks */}
                    {automationStatus.state.last_run.safety_checks && (
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Safety Checks:</div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white">Migration Window</div>
                              <div className="text-gray-600 dark:text-gray-400">{automationStatus.state.last_run.safety_checks.migration_window}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white">Cluster Health</div>
                              <div className="text-gray-600 dark:text-gray-400">{automationStatus.state.last_run.safety_checks.cluster_health}</div>
                            </div>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-900 dark:text-white">Running migrations:</span> {automationStatus.state.last_run.safety_checks.running_migrations || 0}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 recent-auto-migrations">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Auto-Migrations</h4>
                  <button
                    onClick={() => {
                      // Export migration history to CSV
                      const migrations = automationStatus.recent_migrations || [];
                      if (migrations.length === 0) return;

                      // CSV headers
                      const headers = ['Timestamp', 'VM ID', 'VM Name', 'Source Node', 'Target Node', 'Suitability %', 'Reason', 'Confidence Score', 'Status', 'Duration (s)', 'Dry Run', 'Window'];

                      // CSV rows
                      const rows = migrations.map(m => [
                        m.timestamp || '',
                        m.vmid || '',
                        m.name || '',
                        m.source_node || '',
                        m.target_node || '',
                        m.suitability_rating || m.target_node_score || '',
                        (m.reason || '').replace(/,/g, ';'), // Replace commas in reason
                        m.confidence_score || '',
                        m.status || '',
                        m.duration_seconds || '',
                        m.dry_run ? 'Yes' : 'No',
                        (m.window_name || '').replace(/,/g, ';')
                      ]);

                      // Combine headers and rows
                      const csv = [
                        headers.join(','),
                        ...rows.map(row => row.join(','))
                      ].join('\n');

                      // Create download link
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `proxbalance-migrations-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Export migration history to CSV"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {(() => {
                    // Deduplicate migrations by VMID+source+target, keeping only the most recent
                    const seen = new Map();
                    const uniqueMigrations = [];

                    // Sort by timestamp descending (most recent first)
                    const sortedMigrations = [...automationStatus.recent_migrations].sort((a, b) => {
                      return new Date(b.timestamp) - new Date(a.timestamp);
                    });

                    // Keep only first occurrence of each VMID+source+target combo
                    for (const migration of sortedMigrations) {
                      const key = `${migration.vmid}-${migration.source_node}-${migration.target_node}`;
                      if (!seen.has(key)) {
                        seen.set(key, true);
                        uniqueMigrations.push(migration);
                      }
                    }

                    return uniqueMigrations.slice(0, 3);
                  })().map((migration) => {

                    // Format timestamp
                    let timeDisplay = '';
                    if (migration.timestamp) {
                      try {
                        // Parse timestamp - add 'Z' if not present to indicate UTC
                        const timestamp = migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z';
                        const migrationDate = new Date(timestamp);
                        const now = new Date();
                        const diffMs = now - migrationDate;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);

                        if (diffMins < 1) {
                          timeDisplay = 'Just now';
                        } else if (diffMins < 60) {
                          timeDisplay = `${diffMins}m ago`;
                        } else if (diffHours < 24) {
                          timeDisplay = `${diffHours}h ago`;
                        } else if (diffDays < 7) {
                          timeDisplay = `${diffDays}d ago`;
                        } else {
                          timeDisplay = migrationDate.toLocaleDateString();
                        }
                      } catch (e) {
                        timeDisplay = '';
                      }
                    }

                    return (
                    <div key={migration.id} className="text-sm bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {migration.source_node} → {migration.target_node}
                            {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) && (() => {
                              // Convert raw penalty score to suitability percentage
                              const suitabilityPercent = migration.suitability_rating !== undefined
                                ? migration.suitability_rating
                                : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));

                              return (
                              <span className="ml-1 text-[10px] inline-flex items-center gap-1">
                                <span className="text-gray-600 dark:text-gray-400">Score:</span>{' '}
                                <span className={`font-semibold ${
                                  suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                  suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                  suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {suitabilityPercent}%
                                </span>
                                <span className="relative group inline-block">
                                  <Info size={10} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
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
                              </span>
                              );
                            })()}
                          </span>
                          {migration.dry_run && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                              DRY RUN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {timeDisplay && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {timeDisplay}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            migration.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : migration.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : migration.status === 'skipped'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : migration.status === 'timeout'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {migration.status === 'completed' && <CheckCircle size={12} />}
                            {migration.status === 'failed' && <XCircle size={12} />}
                            {migration.status === 'skipped' && <AlertTriangle size={12} />}
                            {migration.status === 'timeout' && <Clock size={12} />}
                            {migration.status}
                          </span>
                        </div>
                      </div>
                      {migration.reason && (
                        <div className="mt-1 flex items-center gap-3">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {migration.reason}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            {migration.confidence_score !== undefined && (
                              <span title="Penalty point reduction achieved by this migration">
                                Improvement: +{(migration.confidence_score / 2).toFixed(1)}
                              </span>
                            )}
                            {migration.duration_seconds !== undefined && migration.duration_seconds > 0 && (
                              <>
                                <span className="text-gray-400 dark:text-gray-600">•</span>
                                <span title="Migration Duration">
                                  Duration: {migration.duration_seconds}s
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Error Message for Failed Migrations */}
                      {migration.status === 'failed' && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex items-start gap-2">
                          <XCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                          <div className="text-xs text-red-800 dark:text-red-300 flex-1">
                            <span className="font-semibold">Error:</span> {migration.error || 'Migration failed (check logs for details)'}
                          </div>
                        </div>
                      )}
                      {/* Rollback Detection */}
                      {(() => {
                        // Only show rollback warning if rollback detection is enabled in settings
                        if (!automationConfig?.rules?.rollback_detection_enabled) {
                          return null;
                        }

                        // Use configured rollback window (default 24 hours if not set)
                        const rollbackWindowHours = automationConfig?.rules?.rollback_window_hours || 24;
                        const rollbackWindow = rollbackWindowHours * 60 * 60 * 1000; // Convert to ms
                        const currentTime = new Date(migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z');

                        // Find potential rollback - look for migration where this VM went back
                        const rollback = automationStatus.recent_migrations.find(m => {
                          if (m.vmid !== migration.vmid) return false;
                          if (m.id === migration.id) return false;

                          // Check if it's a rollback (went from target back to source)
                          const isRollback = m.source_node === migration.target_node && m.target_node === migration.source_node;

                          // Check time window
                          const mTime = new Date(m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z');
                          const timeDiff = Math.abs(mTime - currentTime);
                          const withinWindow = timeDiff < rollbackWindow;

                          return isRollback && withinWindow;
                        });

                        if (rollback) {
                          return (
                            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded flex items-start gap-2">
                              <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                              <div className="text-xs text-orange-800 dark:text-orange-300">
                                <span className="font-semibold">Rollback Detected:</span> This VM was migrated back to its original node within {rollbackWindowHours} hour{rollbackWindowHours !== 1 ? 's' : ''}. This may indicate a problem with the target node or migration configuration.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Automation Runs */}
            {runHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock size={14} />
                  Past Automation Runs
                </h4>
                <div className="space-y-2">
                  {runHistory.slice(0, 5).map((run, idx) => {
                    const isExpanded = expandedRun === run.timestamp;

                    // Format timestamp
                    let timeDisplay = '';
                    try {
                      const timestamp = run.timestamp.endsWith('Z') ? run.timestamp : run.timestamp + 'Z';
                      const runDate = new Date(timestamp);
                      const now = new Date();
                      const diffMs = now - runDate;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);

                      if (diffMins < 1) {
                        timeDisplay = 'Just now';
                      } else if (diffMins < 60) {
                        timeDisplay = `${diffMins}m ago`;
                      } else if (diffHours < 24) {
                        timeDisplay = `${diffHours}h ago`;
                      } else if (diffDays < 7) {
                        timeDisplay = `${diffDays}d ago`;
                      } else {
                        timeDisplay = runDate.toLocaleDateString();
                      }
                    } catch (e) {
                      timeDisplay = '';
                    }

                    return (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 border border-gray-200 dark:border-gray-700">
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded p-1 transition-colors"
                          onClick={() => setExpandedRun(isExpanded ? null : run.timestamp)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" /> : <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />}
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                              {timeDisplay}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              run.status === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : run.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : run.status === 'no_action'
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                              {run.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                            <span>{run.migrations_executed || 0} migration{run.migrations_executed !== 1 ? 's' : ''}</span>
                            <span>{run.duration_seconds || 0}s</span>
                          </div>
                        </div>

                        {isExpanded && run.decisions && run.decisions.length > 0 && (
                          <div className="mt-2 pl-5 space-y-1">
                            <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                              Decisions ({run.decisions.length})
                            </div>
                            {run.decisions.map((decision, didx) => (
                              <div key={didx} className={`text-xs p-1.5 rounded ${
                                decision.action === 'executed'
                                  ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                                  : decision.action === 'pending'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                  : decision.action === 'skipped'
                                  ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700'
                                  : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    {decision.action === 'executed' && <CheckCircle size={10} className="text-green-600 dark:text-green-400" />}
                                    {decision.action === 'pending' && <RefreshCw size={10} className="text-blue-600 dark:text-blue-400" />}
                                    {decision.action === 'skipped' && <Minus size={10} className="text-yellow-600 dark:text-yellow-400" />}
                                    {decision.action === 'filtered' && <XCircle size={10} className="text-gray-600 dark:text-gray-400" />}
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{decision.name}</span>
                                    <span className="text-gray-500 dark:text-gray-400">({decision.vmid})</span>
                                    {decision.distribution_balancing && (
                                      <span className="ml-1" title="Distribution Balancing">⚖️</span>
                                    )}
                                  </div>
                                  {decision.priority_rank && (
                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                      #{decision.priority_rank}
                                    </span>
                                  )}
                                </div>
                                {decision.reason && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">
                                    {decision.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Log */}
            {automationStatus.state?.activity_log && automationStatus.state.activity_log.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Activity Log (Last Check)</h4>
                <div className="space-y-2">
                  {automationStatus.state.activity_log.slice(0, 10).map((activity, idx) => {
                    // Format timestamp
                    let timeDisplay = '';
                    if (activity.timestamp) {
                      try {
                        const timestamp = activity.timestamp.endsWith('Z') ? activity.timestamp : activity.timestamp + 'Z';
                        const activityDate = new Date(timestamp);
                        const now = new Date();
                        const diffMs = now - activityDate;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);

                        if (diffMins < 1) {
                          timeDisplay = 'Just now';
                        } else if (diffMins < 60) {
                          timeDisplay = `${diffMins}m ago`;
                        } else if (diffHours < 24) {
                          timeDisplay = `${diffHours}h ago`;
                        } else {
                          timeDisplay = activityDate.toLocaleDateString();
                        }
                      } catch (e) {
                        timeDisplay = '';
                      }
                    }

                    const isSkipped = activity.action === 'skipped';

                    return (
                      <div key={idx} className="text-xs bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600 flex items-center gap-2" title={activity.reason}>
                        {isSkipped && <MinusCircle size={14} className="text-yellow-600 dark:text-yellow-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{activity.name}</span>
                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                              SKIPPED
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                            {activity.reason}
                          </div>
                        </div>
                        {timeDisplay && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {timeDisplay}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </>
            )}
          </div>
  );
}
