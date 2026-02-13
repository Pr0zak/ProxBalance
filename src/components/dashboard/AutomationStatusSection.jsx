import {
  Clock, ChevronDown, ChevronUp, XCircle, CheckCircle, Pause, Settings,
  Play, Loader, X, Info, AlertTriangle, RefreshCw, ClipboardList,
  Download, MinusCircle, ChevronRight, Minus
} from '../Icons.jsx';
import { formatRelativeTime } from '../../utils/formatters.js';

const { useState } = React;

export default function AutomationStatusSection({
  automationStatus,
  automationConfig,
  scoreHistory,
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
  const [chartTab, setChartTab] = useState('migrations');

  if (!automationStatus) return null;

  return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
            {/* ── Header ── */}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Scheduled automatic balancing</span>
                    {automationStatus.state?.current_window && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded">
                        {automationStatus.state.current_window}
                      </span>
                    )}
                    {automationStatus.state?.last_run && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        Last: {(() => {
                          let ts = typeof automationStatus.state.last_run === 'object' ? automationStatus.state.last_run.timestamp : automationStatus.state.last_run;
                          return formatRelativeTime(ts) || 'Never';
                        })()}
                      </span>
                    )}
                  </p>
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

            {/* ── Button Bar with inline next-check ── */}
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

                {/* Inline Next Check */}
                {automationStatus.enabled && (() => {
                  const hasRunning = automationStatus.in_progress_migrations?.some(m => m.initiated_by === 'automated');
                  if (hasRunning) {
                    return (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Loader size={12} className="animate-spin" /> Running
                      </span>
                    );
                  }
                  if (automationStatus.next_check) {
                    const ts = automationStatus.next_check.endsWith?.('Z') ? automationStatus.next_check : automationStatus.next_check + 'Z';
                    const diffMins = Math.floor((new Date(ts) - new Date()) / 60000);
                    if (diffMins > 0) return <span className="text-xs text-gray-500 dark:text-gray-400">Next: {diffMins}m</span>;
                    return <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Next: Now</span>;
                  }
                  if (automationStatus.check_interval_minutes) {
                    return <span className="text-xs text-gray-500 dark:text-gray-400">Every {automationStatus.check_interval_minutes}m</span>;
                  }
                  return null;
                })()}
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

            {/* ── Learning Progress (compact inline) ── */}
            {automationStatus.intelligent_tracking?.enabled && automationStatus.intelligent_tracking?.learning_progress && (() => {
              const lp = automationStatus.intelligent_tracking.learning_progress;
              const pct = lp.min_required_hours > 0 ? Math.min(100, Math.round((lp.data_collection_hours / lp.min_required_hours) * 100)) : 100;
              if (pct >= 100) return null;
              const level = automationStatus.intelligent_tracking.intelligence_level;
              return (
                <div className="flex items-center gap-3 mb-3 px-1 text-xs">
                  <Info size={14} className="text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-gray-600 dark:text-gray-400">Learning: {Math.round(lp.data_collection_hours)}h / {lp.min_required_hours}h</span>
                      {level && <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded capitalize">{level}</span>}
                      {lp.guest_profiles_count > 0 && <span className="text-gray-500 dark:text-gray-500">{lp.guest_profiles_count} profiles</span>}
                      {lp.outcomes_count > 0 && <span className="text-gray-500 dark:text-gray-500">{lp.outcomes_count} outcomes</span>}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                      <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0">{pct}%</span>
                </div>
              );
            })()}

            {/* ── Tabbed Charts ── */}
            {(() => {
              const migrations = automationStatus.recent_migrations || [];
              const hasHistory = migrations.length > 0;
              const hasHealth = scoreHistory && scoreHistory.length > 1;
              if (!hasHistory && !hasHealth) return null;

              // Build migration chart data
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
                  let ts = m.timestamp;
                  if (!ts.endsWith('Z') && !ts.includes('+')) ts += 'Z';
                  const d = new Date(ts);
                  return d >= dayStart && d <= dayEnd;
                });
                return {
                  date,
                  total: dayMigrations.length,
                  successful: dayMigrations.filter(m => m.status === 'completed').length,
                  failed: dayMigrations.filter(m => m.status === 'failed').length,
                  skipped: dayMigrations.filter(m => m.status === 'skipped').length,
                  label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                };
              });
              const maxMigrations = Math.max(...dailyStats.map(d => d.total), 1);

              // Build health chart data
              let healthPoints = [], healthMin = 0, healthMax = 100, healthRange = 1;
              if (hasHealth) {
                healthPoints = scoreHistory.map(e => e.cluster_health).filter(v => v != null);
                if (healthPoints.length >= 2) {
                  healthMin = Math.min(...healthPoints);
                  healthMax = Math.max(...healthPoints);
                  healthRange = healthMax - healthMin || 1;
                }
              }

              const activeTab = hasHistory && hasHealth ? chartTab : (hasHistory ? 'migrations' : 'health');

              return (
                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                  {hasHistory && hasHealth && (
                    <div className="flex border-b border-gray-200 dark:border-gray-600 px-3">
                      <button
                        onClick={() => setChartTab('migrations')}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          activeTab === 'migrations'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >Migration History</button>
                      <button
                        onClick={() => setChartTab('health')}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          activeTab === 'health'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >Cluster Health</button>
                    </div>
                  )}
                  <div className="p-4">
                    {/* Migration History Chart */}
                    {activeTab === 'migrations' && hasHistory && (
                      <>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Last 7 Days</h3>
                        <div className="flex items-end justify-between gap-1 h-32">
                          {dailyStats.map((day, idx) => {
                            const heightPercent = (day.total / maxMigrations) * 100;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '100px' }}>
                                  {day.total > 0 ? (
                                    <>
                                      {day.successful > 0 && (
                                        <div className="w-full bg-green-500 dark:bg-green-600 rounded-t" style={{ height: `${(day.successful / day.total) * heightPercent}%` }} title={`${day.successful} successful`} />
                                      )}
                                      {day.failed > 0 && (
                                        <div className="w-full bg-red-500 dark:bg-red-600" style={{ height: `${(day.failed / day.total) * heightPercent}%` }} title={`${day.failed} failed`} />
                                      )}
                                      {day.skipped > 0 && (
                                        <div className="w-full bg-yellow-500 dark:bg-yellow-600 rounded-b" style={{ height: `${(day.skipped / day.total) * heightPercent}%` }} title={`${day.skipped} skipped`} />
                                      )}
                                    </>
                                  ) : (
                                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded" />
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">{day.total > 0 ? day.total : ''}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">{day.label}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div><span className="text-gray-600 dark:text-gray-400">Success</span></div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded"></div><span className="text-gray-600 dark:text-gray-400">Failed</span></div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded"></div><span className="text-gray-600 dark:text-gray-400">Skipped</span></div>
                        </div>
                      </>
                    )}
                    {/* Cluster Health Chart */}
                    {activeTab === 'health' && hasHealth && healthPoints.length >= 2 && (() => {
                      const w = 400, h = 80, pad = 4;
                      const coords = healthPoints.map((v, i) => {
                        const x = pad + (i / (healthPoints.length - 1)) * (w - 2 * pad);
                        const y = h - pad - ((v - healthMin) / healthRange) * (h - 2 * pad);
                        return `${x},${y}`;
                      });
                      const linePoints = coords.join(' ');
                      const areaPoints = `${pad},${h - pad} ${linePoints} ${w - pad},${h - pad}`;
                      const latest = healthPoints[healthPoints.length - 1];
                      const trend = latest - healthPoints[0];
                      return (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cluster Health</h3>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-gray-900 dark:text-white">{latest.toFixed(1)}%</span>
                              <span className={`font-semibold ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: '80px' }} preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polygon points={areaPoints} fill="url(#healthGrad)" opacity="0.3" />
                            <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                          </svg>
                          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            <span>{new Date(scoreHistory[0].timestamp).toLocaleDateString()}</span>
                            <span>{new Date(scoreHistory[scoreHistory.length - 1].timestamp).toLocaleDateString()}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

            {/* ── In-Progress Migrations ── */}
            {automationStatus.in_progress_migrations && automationStatus.in_progress_migrations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                  Migrations In Progress
                </h4>
                <div className="space-y-2">
                  {automationStatus.in_progress_migrations.map((migration, idx) => {
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
                    const isAutomated = migration.initiated_by === 'automated';
                    return (
                      <div key={idx} className={`text-sm rounded-lg p-3 border-2 animate-pulse ${
                        isAutomated
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                          : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">{migration.source_node} → {migration.target_node || '?'}</span>
                            {migration.type === 'VM' ? (
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded border border-green-300 dark:border-green-600" title="Live migration (no downtime)">LIVE</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded border border-orange-300 dark:border-orange-600" title="Migration with restart (brief downtime)">RESTART</span>
                            )}
                            {!isAutomated && (
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold rounded border border-purple-300 dark:border-purple-600">MANUAL</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                              isAutomated
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            }`}>
                              <RefreshCw size={12} className="animate-spin" /> Running
                            </span>
                            <button
                              onClick={() => setCancelMigrationModal(migration)}
                              className="px-2 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Cancel migration"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </div>
                        <div className={`mt-1 text-xs flex items-center gap-3 ${isAutomated ? 'text-gray-600 dark:text-gray-400' : 'text-purple-600 dark:text-purple-400'}`}>
                          {migration.starttime && migration.starttime > 0 ? (
                            <span>Started: {new Date(migration.starttime * 1000).toLocaleTimeString()}</span>
                          ) : (
                            <span>Started: Unknown</span>
                          )}
                          <span className={`font-semibold ${isAutomated ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>Elapsed: {elapsedTime}</span>
                        </div>
                        {migration.progress && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`${isAutomated ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'} font-semibold`}>
                                Progress: {migration.progress.percentage}%
                                {migration.progress.speed_mib_s && <span className="ml-2 font-normal text-[10px]">({migration.progress.speed_mib_s.toFixed(1)} MiB/s)</span>}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-[10px]">{migration.progress.human_readable}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all duration-300 ${isAutomated ? 'bg-blue-600 dark:bg-blue-500' : 'bg-purple-600 dark:bg-purple-500'}`} style={{ width: `${migration.progress.percentage}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Last Run Summary ── */}
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
                      {formatRelativeTime(automationStatus.state.last_run.timestamp)}
                    </span>
                  </div>
                  {collapsedSections.lastRunSummary ? (
                    <ChevronDown size={18} className="text-gray-500" />
                  ) : (
                    <ChevronUp size={18} className="text-gray-500" />
                  )}
                </button>

                {!collapsedSections.lastRunSummary && (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    {/* Run Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</div>
                        <div className={`text-sm font-bold ${
                          automationStatus.state.last_run.status === 'success' ? 'text-green-600 dark:text-green-400' :
                          automationStatus.state.last_run.status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                          automationStatus.state.last_run.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {automationStatus.state.last_run.status === 'success' ? 'Success' :
                           automationStatus.state.last_run.status === 'partial' ? 'Partial' :
                           automationStatus.state.last_run.status === 'failed' ? 'Failed' :
                           automationStatus.state.last_run.status === 'no_action' ? 'No Action' :
                           automationStatus.state.last_run.status}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Migrations</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.migrations_successful || 0} / {automationStatus.state.last_run.migrations_executed || 0}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.duration_seconds ? `${Math.floor(automationStatus.state.last_run.duration_seconds / 60)}m ${automationStatus.state.last_run.duration_seconds % 60}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mode</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.mode === 'dry_run' ? 'Dry Run' : 'Live'}
                        </div>
                      </div>
                    </div>

                    {/* Decision Details */}
                    {automationStatus.state.last_run.decisions && automationStatus.state.last_run.decisions.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mb-3 max-h-64 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Decisions Made:</div>
                        <div className="space-y-2">
                          {[...automationStatus.state.last_run.decisions].sort((a, b) => {
                            const getOrder = (d) => {
                              if (d.action === 'executed' || d.action === 'pending' || d.action === 'failed') return 0;
                              if (d.action === 'observing' || d.action === 'deferred') return 1;
                              if (d.action === 'skipped') return 2;
                              return 3;
                            };
                            return (getOrder(a) - getOrder(b)) || ((a.priority_rank || 999) - (b.priority_rank || 999));
                          }).map((decision, idx) => {
                            const isExecuted = decision.action === 'executed' || decision.action === 'failed';
                            const isPending = decision.action === 'pending';
                            const borderColor = isExecuted ? 'border-green-500' :
                                               isPending ? 'border-blue-500' :
                                               decision.action === 'observing' ? 'border-cyan-500' :
                                               decision.action === 'deferred' ? 'border-amber-500' :
                                               decision.action === 'skipped' ? 'border-yellow-500' :
                                               'border-gray-400';
                            const bgColor = isExecuted ? 'bg-green-50 dark:bg-gray-800' :
                                           isPending ? 'bg-blue-50 dark:bg-gray-800' :
                                           decision.action === 'observing' ? 'bg-cyan-50 dark:bg-gray-800' :
                                           decision.action === 'deferred' ? 'bg-amber-50 dark:bg-gray-800' :
                                           'bg-gray-50 dark:bg-gray-800';

                            return (
                              <div key={idx} className={`text-xs ${bgColor} rounded p-2 border-l-4 ${borderColor} ${isPending ? 'animate-pulse' : ''}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
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
                                         decision.action === 'executed' ? '✅' :
                                         decision.action === 'observing' ? '👁' :
                                         decision.action === 'deferred' ? '🕐' : '✗'} {decision.name || `VM/CT ${decision.vmid}`}
                                      </span>
                                      {decision.type && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{decision.type}</span>
                                      )}
                                      {decision.distribution_balancing && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" title="Distribution Balancing">Balance</span>
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
                                    decision.action === 'observing' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' :
                                    decision.action === 'deferred' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                    decision.action === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    decision.action === 'filtered' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {decision.action}
                                  </span>
                                </div>
                                <div className="mt-1 text-gray-600 dark:text-gray-400">
                                  {decision.selected_reason || decision.reason}
                                </div>
                                {decision.confidence_score && (
                                  <div className="mt-1 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">Confidence: {decision.confidence_score}%</div>
                                )}
                                {decision.reasoning && (
                                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                    {decision.reasoning.score_improvement != null && <span>Score: +{Number(decision.reasoning.score_improvement).toFixed(1)}</span>}
                                    {decision.reasoning.cost_benefit != null && <><span className="text-gray-400 dark:text-gray-600">|</span><span>Cost-benefit: {Number(decision.reasoning.cost_benefit).toFixed(1)}x</span></>}
                                    {decision.reasoning.observation_count != null && <><span className="text-gray-400 dark:text-gray-600">|</span><span>Observed {decision.reasoning.observation_count}/{decision.reasoning.required_observations}</span></>}
                                    {decision.reasoning.hours_tracked != null && <><span className="text-gray-400 dark:text-gray-600">|</span><span>{Number(decision.reasoning.hours_tracked).toFixed(1)}h tracked</span></>}
                                    {decision.reasoning.guest_behavior && decision.reasoning.guest_behavior !== 'unknown' && <><span className="text-gray-400 dark:text-gray-600">|</span><span>{decision.reasoning.guest_behavior}</span></>}
                                  </div>
                                )}
                                {decision.error && (
                                  <div className="mt-1 text-red-600 dark:text-red-400 text-[10px]">Error: {decision.error}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Safety Checks */}
                    {automationStatus.state.last_run.safety_checks && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
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

                    {/* Activity Log — VMs considered but not migrated */}
                    {automationStatus.state?.activity_log && automationStatus.state.activity_log.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mt-3 max-h-64 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Activity Log — Skipped ({automationStatus.state.activity_log.length}):
                        </div>
                        <div className="space-y-1.5">
                          {automationStatus.state.activity_log.map((activity, aidx) => (
                            <div key={aidx} className="text-xs bg-white dark:bg-gray-700 rounded p-2 border-l-4 border-yellow-400 dark:border-yellow-600 flex items-start gap-2">
                              <MinusCircle size={12} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-gray-900 dark:text-white">{activity.name}</span>
                                {activity.vmid && <span className="text-gray-500 dark:text-gray-400 ml-1">({activity.vmid})</span>}
                                <div className="text-gray-600 dark:text-gray-400 mt-0.5">{activity.reason}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback: show filter_reasons when decisions and activity_log are empty */}
                    {(!automationStatus.state.last_run.decisions || automationStatus.state.last_run.decisions.length === 0) &&
                     (!automationStatus.state?.activity_log || automationStatus.state.activity_log.length === 0) &&
                     automationStatus.filter_reasons && automationStatus.filter_reasons.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mt-3 max-h-64 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Filtered ({automationStatus.filter_reasons.length}):
                        </div>
                        <div className="space-y-1.5">
                          {automationStatus.filter_reasons.map((reason, idx) => (
                            <div key={idx} className="text-xs bg-white dark:bg-gray-700 rounded p-2 border-l-4 border-yellow-400 dark:border-yellow-600 flex items-start gap-2">
                              <MinusCircle size={12} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                              <span className="text-gray-700 dark:text-gray-300">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Recent Auto-Migrations ── */}
            {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 recent-auto-migrations">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Auto-Migrations</h4>
                  <button
                    onClick={() => {
                      const migrations = automationStatus.recent_migrations || [];
                      if (migrations.length === 0) return;
                      const headers = ['Timestamp', 'VM ID', 'VM Name', 'Source Node', 'Target Node', 'Suitability %', 'Reason', 'Confidence Score', 'Status', 'Duration (s)', 'Dry Run', 'Window'];
                      const rows = migrations.map(m => [
                        m.timestamp || '', m.vmid || '', m.name || '', m.source_node || '', m.target_node || '',
                        m.suitability_rating || m.target_node_score || '',
                        (m.reason || '').replace(/,/g, ';'), m.confidence_score || '',
                        m.status || '', m.duration_seconds || '', m.dry_run ? 'Yes' : 'No',
                        (m.window_name || '').replace(/,/g, ';')
                      ]);
                      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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
                    <Download size={12} /> Export CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const seen = new Map();
                    const uniqueMigrations = [];
                    const sortedMigrations = [...automationStatus.recent_migrations].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    for (const migration of sortedMigrations) {
                      const key = `${migration.vmid}-${migration.source_node}-${migration.target_node}`;
                      if (!seen.has(key)) { seen.set(key, true); uniqueMigrations.push(migration); }
                    }
                    return uniqueMigrations.slice(0, 3);
                  })().map((migration) => {
                    const timeDisplay = formatRelativeTime(migration.timestamp);
                    return (
                    <div key={migration.id} className="text-sm bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {migration.source_node} → {migration.target_node}
                            {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) && (() => {
                              const suitabilityPercent = migration.suitability_rating !== undefined
                                ? migration.suitability_rating
                                : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));
                              return (
                              <span className="ml-1 text-[10px] inline-flex items-center gap-1">
                                <span className="relative group inline-block">
                                  <span className={`font-semibold ${
                                    suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                    suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {suitabilityPercent}%
                                  </span>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                                    <div>Target: {migration.target_node}</div>
                                    <div>Penalty: {migration.target_node_score?.toFixed(1) || 'N/A'}</div>
                                    <div>Suitability: {suitabilityPercent}%</div>
                                  </div>
                                </span>
                              </span>
                              );
                            })()}
                          </span>
                          {migration.dry_run && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">DRY RUN</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {timeDisplay && <span className="text-xs text-gray-500 dark:text-gray-400">{timeDisplay}</span>}
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            migration.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            migration.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            migration.status === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            migration.status === 'timeout' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
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
                          <span className="text-xs text-gray-600 dark:text-gray-400">{migration.reason}</span>
                          {migration.duration_seconds !== undefined && migration.duration_seconds > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-500">{migration.duration_seconds}s</span>
                          )}
                        </div>
                      )}
                      {migration.status === 'failed' && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex items-start gap-2">
                          <XCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                          <div className="text-xs text-red-800 dark:text-red-300 flex-1">
                            <span className="font-semibold">Error:</span> {migration.error || 'Migration failed (check logs for details)'}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Run History (Past Runs + Activity Log) ── */}
            {(runHistory.length > 0 || (automationStatus.state?.activity_log?.length > 0)) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock size={14} />
                  Run History
                </h4>
                <div className="space-y-2">
                  {runHistory.slice(0, 5).map((run, idx) => {
                    const isExpanded = expandedRun === run.timestamp;
                    const timeDisplay = formatRelativeTime(run.timestamp);
                    // Activity log now shown in Last Run Summary section above

                    return (
                      <div key={idx} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 rounded p-1 transition-colors"
                          onClick={() => setExpandedRun(isExpanded ? null : run.timestamp)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" /> : <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />}
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{timeDisplay}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              run.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                              run.status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                              run.status === 'no_action' ? 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                              {run.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                            <span>{run.migrations_executed || 0} migration{run.migrations_executed !== 1 ? 's' : ''}</span>
                            <span>{run.duration_seconds || 0}s</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <>
                            {run.decisions && run.decisions.length > 0 && (
                              <div className="mt-2 pl-5 space-y-1">
                                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                  Decisions ({run.decisions.length})
                                </div>
                                {run.decisions.map((decision, didx) => (
                                  <div key={didx} className={`text-xs p-1.5 rounded bg-gray-50 dark:bg-gray-800 border-l-2 ${
                                    decision.action === 'executed' ? 'border-green-500' :
                                    decision.action === 'pending' ? 'border-blue-500' :
                                    decision.action === 'observing' ? 'border-cyan-500' :
                                    decision.action === 'deferred' ? 'border-amber-500' :
                                    decision.action === 'skipped' ? 'border-yellow-500' :
                                    'border-gray-400'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        {decision.action === 'executed' && <CheckCircle size={10} className="text-green-600 dark:text-green-400" />}
                                        {decision.action === 'pending' && <RefreshCw size={10} className="text-blue-600 dark:text-blue-400" />}
                                        {decision.action === 'observing' && <Info size={10} className="text-cyan-600 dark:text-cyan-400" />}
                                        {decision.action === 'deferred' && <Clock size={10} className="text-amber-600 dark:text-amber-400" />}
                                        {decision.action === 'skipped' && <Minus size={10} className="text-yellow-600 dark:text-yellow-400" />}
                                        {decision.action === 'filtered' && <XCircle size={10} className="text-gray-600 dark:text-gray-400" />}
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{decision.name}</span>
                                        <span className="text-gray-500 dark:text-gray-400">({decision.vmid})</span>
                                        {decision.distribution_balancing && <span className="ml-1" title="Distribution Balancing">⚖️</span>}
                                      </div>
                                      {decision.priority_rank && (
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">#{decision.priority_rank}</span>
                                      )}
                                    </div>
                                    {decision.reason && (
                                      <div className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">{decision.reason}</div>
                                    )}
                                    {decision.reasoning && (
                                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[9px] text-gray-500 dark:text-gray-400">
                                        {decision.reasoning.score_improvement != null && <span>+{Number(decision.reasoning.score_improvement).toFixed(1)}pts</span>}
                                        {decision.reasoning.cost_benefit != null && <span>CB:{Number(decision.reasoning.cost_benefit).toFixed(1)}x</span>}
                                        {decision.reasoning.observation_count != null && <span>{decision.reasoning.observation_count}/{decision.reasoning.required_observations} obs</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          </>
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
