import { AlertTriangle, RefreshCw, CheckCircle, X, GitBranch, ArrowLeft } from '../Icons.jsx';
import { MODAL_OVERLAY, MODAL_CONTAINER, BTN_PRIMARY, BTN_SECONDARY, INNER_CARD } from '../../utils/designTokens.js';

const CHANNELS = [
  { id: 'stable', label: 'Stable', help: 'Tested releases only' },
  { id: 'beta', label: 'Beta', help: 'Releases and pre-releases' },
  { id: 'dev', label: 'Development', help: 'Every commit on the current branch' },
];

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const SystemModals = ({
  showUpdateModal, setShowUpdateModal, updating, updateLog, setUpdateLog, updateResult, setUpdateResult, updateError, handleUpdate,
  checkForUpdates, checkingUpdates, setUpdateChannel, savingChannel,
  systemInfo,
  showBranchModal, setShowBranchModal, loadingBranches, availableBranches, branchPreview, setBranchPreview, loadingPreview, switchingBranch, rollingBack, fetchBranches, switchBranch, rollbackBranch, clearTestingMode, fetchBranchPreview
}) => {
  return (
    <>
    {showUpdateModal && (
      <div className={MODAL_OVERLAY}>
        <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-2xl')}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg shadow-md ${updating ? 'animate-pulse' : ''}`}>
                <RefreshCw size={24} className={updating ? "text-pb-text dark:text-white animate-spin" : "text-pb-text dark:text-white"} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-pb-text dark:text-white">Update ProxBalance</h2>
                <p className="text-sm text-pb-text2 dark:text-gray-400 mt-0.5">System update management</p>
              </div>
            </div>
            {!updating && updateResult !== 'success' && (
              <button
                onClick={() => { setShowUpdateModal(false); setUpdateLog([]); setUpdateResult(null); }}
                className="p-2 rounded-lg hover:bg-pb-surface2 dark:hover:bg-gray-700 transition-all duration-200"
                aria-label="Close"
              >
                <X size={20} className="text-pb-text2 dark:text-gray-400" />
              </button>
            )}
          </div>

          {systemInfo && !updating && updateResult === null && (() => {
            const channel = systemInfo.update_channel || 'stable';
            const release = systemInfo.latest_release;
            const isDev = systemInfo.update_type === 'branch';
            const available = systemInfo.updates_available;
            return (
            <div className="space-y-4">
              {/* Channel */}
              <div className={`${INNER_CARD} p-3 space-y-2`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-pb-text dark:text-white">Update channel</span>
                  <button onClick={checkForUpdates} disabled={checkingUpdates || savingChannel} className={BTN_SECONDARY}>
                    <RefreshCw size={14} className={checkingUpdates ? 'animate-spin' : ''} /> {checkingUpdates ? 'Checking…' : 'Check now'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Update channel">
                  {CHANNELS.map(c => (
                    <button key={c.id} role="radio" aria-checked={channel === c.id} disabled={savingChannel}
                      onClick={() => channel !== c.id && setUpdateChannel(c.id)}
                      className={`text-left rounded-lg border px-3 py-2 transition-colors ${channel === c.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500'
                        : 'border-pb-border dark:border-slate-600 hover:bg-pb-surface2 dark:hover:bg-slate-700/40'}`}>
                      <div className="text-sm font-medium text-pb-text dark:text-white">{c.label}</div>
                      <div className="text-xs text-pb-text2 dark:text-gray-400">{c.help}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Versions */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className={`${INNER_CARD} p-3`}>
                  <div className="text-xs text-pb-text2 dark:text-gray-400">Running</div>
                  <div className="font-mono text-pb-text dark:text-white break-all">{systemInfo.current_version || systemInfo.version}</div>
                  <div className="text-xs text-pb-text2 dark:text-gray-400">{systemInfo.on_release ? 'release' : `branch ${systemInfo.branch || '—'}`}</div>
                </div>
                <div className={`${INNER_CARD} p-3`}>
                  <div className="text-xs text-pb-text2 dark:text-gray-400">{isDev ? 'Latest commit' : 'Latest release'}</div>
                  <div className="font-mono text-pb-text dark:text-white break-all">{systemInfo.latest_version || '—'}</div>
                  <div className="text-xs text-pb-text2 dark:text-gray-400">{isDev ? `${systemInfo.commits_behind || 0} commit(s) ahead` : formatDate(release?.published_at)}</div>
                </div>
              </div>

              {systemInfo.update_check_error && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300">{systemInfo.update_check_error}</p>
              )}

              {!available && (
                <p className="text-sm text-pb-text2 dark:text-gray-400 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600 dark:text-green-400" /> You're on the latest version for this channel.
                </p>
              )}

              {available && systemInfo.update_type === 'switch_to_release' && (
                <p className="text-sm text-pb-text dark:text-gray-200">
                  This install follows <span className="font-mono">{systemInfo.branch}</span> rather than a release. Updating moves it to the tested release <span className="font-mono">{systemInfo.latest_version}</span>; after that it only updates to new releases.
                </p>
              )}

              {/* Release notes */}
              {available && release && !isDev && (
                <div className={`${INNER_CARD} p-3 space-y-2`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-pb-text dark:text-white">{release.name}</h3>
                    {release.url && <a href={release.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View on GitHub</a>}
                  </div>
                  <div className="text-sm text-pb-text dark:text-gray-200 whitespace-pre-wrap max-h-64 overflow-y-auto break-words">{release.notes || 'No release notes.'}</div>
                </div>
              )}

              {/* Branch commits (dev channel) */}
              {available && isDev && systemInfo.changelog && systemInfo.changelog.length > 0 && (
                <div className={`${INNER_CARD} p-3`}>
                  <h3 className="text-sm font-semibold text-pb-text dark:text-white mb-2">New commits on {systemInfo.branch}</h3>
                  <ul className="space-y-1 max-h-48 overflow-y-auto text-sm">
                    {systemInfo.changelog.map((item, idx) => (
                      <li key={idx} className="text-pb-text dark:text-gray-200">
                        {item.message} <span className="font-mono text-xs text-pb-text2 dark:text-gray-400">{item.commit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {available && (
                <div className="text-sm text-pb-text2 dark:text-gray-400">
                  <p className="font-medium text-pb-text dark:text-gray-200 mb-1">Updating will:</p>
                  <ul className="list-disc ml-5 space-y-0.5">
                    <li>Back up the database, settings and current web files</li>
                    <li>{isDev ? `Move to the latest commit on ${systemInfo.branch}` : `Install ${systemInfo.latest_version}${release?.prebuilt ? ' with its tested web bundle' : ''}`}</li>
                    <li>Restart ProxBalance and check it reports healthy</li>
                    <li>Go back to {systemInfo.current_version || systemInfo.version} automatically if it doesn't</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowUpdateModal(false)} className={BTN_SECONDARY}>
                  <X size={14} /> {available ? 'Cancel' : 'Close'}
                </button>
                {available && (
                  <button onClick={handleUpdate} disabled={systemInfo.update_in_progress} className={BTN_PRIMARY}>
                    <RefreshCw size={16} />
                    {systemInfo.update_in_progress ? 'Update in progress…' : `Update to ${systemInfo.latest_version}`}
                  </button>
                )}
              </div>
            </div>
            );
          })()}

          {updating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw size={40} className="text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="text-center">
                <p className="text-lg font-semibold text-pb-text dark:text-white">Updating ProxBalance...</p>
                <p className="text-sm text-pb-text2 dark:text-gray-400 mt-1">This may take a minute. The page may briefly lose connection while ProxBalance restarts.</p>
              </div>
              {updateLog.length > 0 && (
                <ul className="w-full text-sm font-mono space-y-1">
                  {updateLog.map((line, idx) => (
                    <li key={idx} className={line.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!updating && updateResult === 'rolled-back' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Update failed; ProxBalance went back to the previous version</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 whitespace-pre-wrap">{updateError}</p>
                  </div>
                </div>
              </div>
              <ul className="text-sm font-mono space-y-1 max-h-64 overflow-y-auto">
                {updateLog.map((line, idx) => (
                  <li key={idx} className={line.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{line}</li>
                ))}
              </ul>
              <div className="flex justify-end">
                <button onClick={() => window.location.reload()} className={BTN_PRIMARY}>
                  <RefreshCw size={16} /> Close & Reload
                </button>
              </div>
            </div>
          )}

          {!updating && updateResult === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                <p className="text-lg font-semibold text-pb-text dark:text-white">Update complete!</p>
              </div>
              {updateLog.length > 0 && (
                <div className="bg-pb-bg dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="font-mono text-sm space-y-1">
                    {updateLog.map((line, idx) => (
                      <div key={idx} className="text-pb-text dark:text-gray-200">
                        {line.includes('✓') ? (
                          <span className="text-green-600 dark:text-green-400">{line}</span>
                        ) : line.includes('Error') || line.includes('⚠') || line.includes('Failed') ? (
                          <span className="text-red-600 dark:text-red-400">{line}</span>
                        ) : line.includes('━') ? (
                          <span className="text-blue-600 dark:text-blue-400">{line}</span>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <RefreshCw size={16} />
                  Close & Reload
                </button>
              </div>
            </div>
          )}

          {!updating && updateResult === 'up-to-date' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle size={40} className="text-blue-600 dark:text-blue-400" />
              <div className="text-center">
                <p className="text-lg font-semibold text-pb-text dark:text-white">Already up to date</p>
                <p className="text-sm text-pb-text2 dark:text-gray-400 mt-1">No new updates available.</p>
              </div>
              <button
                onClick={() => { setShowUpdateModal(false); setUpdateLog([]); setUpdateResult(null); }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          )}

          {!updating && updateResult === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200">Update failed</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{updateError}</p>
                  </div>
                </div>
              </div>

              {updateLog.length > 0 && (
                <details>
                  <summary className="text-sm text-pb-text2 dark:text-gray-400 cursor-pointer hover:text-pb-text dark:hover:text-gray-200">
                    Show update log
                  </summary>
                  <div className="mt-2 bg-pb-bg dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="font-mono text-sm space-y-1">
                      {updateLog.map((line, idx) => (
                        <div key={idx} className="text-pb-text dark:text-gray-200">
                          {line.includes('✓') ? (
                            <span className="text-green-600 dark:text-green-400">{line}</span>
                          ) : line.includes('Error') || line.includes('⚠') || line.includes('Failed') ? (
                            <span className="text-red-600 dark:text-red-400">{line}</span>
                          ) : line.includes('━') ? (
                            <span className="text-blue-600 dark:text-blue-400">{line}</span>
                          ) : (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => { setShowUpdateModal(false); setUpdateLog([]); setUpdateResult(null); }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-1.5"
                >
                  <X size={14} /> Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {showBranchModal && (
      <div className={MODAL_OVERLAY}>
        <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-2xl')}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg shadow-md">
                  <GitBranch size={24} className="text-pb-text dark:text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-pb-text dark:text-white">Branch Manager</h2>
                  <p className="text-sm text-pb-text2 dark:text-gray-400 mt-0.5">Test feature branches before pushing to main</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBranchModal(false); setBranchPreview(null); }}
                className="p-2 rounded-lg hover:bg-pb-surface2 dark:hover:bg-gray-700 transition-all duration-200"
                aria-label="Close"
              >
                <X size={20} className="text-pb-text2 dark:text-gray-400" />
              </button>
            </div>

            {loadingBranches ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-pb-text2 dark:text-gray-400">Loading branches...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Operation in progress banner */}
                {systemInfo && systemInfo.update_in_progress && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={18} className="text-blue-600 dark:text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        An update or branch switch is in progress. Health check is verifying the service...
                      </span>
                    </div>
                  </div>
                )}

                {/* Return to previous branch banner */}
                {systemInfo && systemInfo.previous_branch && systemInfo.previous_branch !== systemInfo.branch && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowLeft size={18} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-sm text-amber-700 dark:text-amber-300">
                          Testing a branch? Return to <span className="font-mono font-semibold">{systemInfo.previous_branch}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={clearTestingMode}
                          disabled={rollingBack || switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                          className="px-3 py-1.5 text-amber-700 dark:text-amber-300 text-sm rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Stay on current branch and dismiss this banner"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={rollbackBranch}
                          disabled={rollingBack || switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                          className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rollingBack ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Busy...' : 'Go Back')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Branch preview panel */}
                {branchPreview && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                        <GitBranch size={16} />
                        <span className="font-mono">{branchPreview.branch}</span>
                      </h3>
                      <button
                        onClick={() => setBranchPreview(null)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <X size={12} /> Close preview
                      </button>
                    </div>
                    <div className="text-sm text-indigo-700 dark:text-indigo-300 space-y-2">
                      <div className="flex gap-4 text-xs">
                        <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                          +{branchPreview.ahead} ahead
                        </span>
                        <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded">
                          -{branchPreview.behind} behind
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          vs {branchPreview.base_branch}
                        </span>
                      </div>
                      {branchPreview.commits && branchPreview.commits.length > 0 && (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                          {branchPreview.commits.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0">●</span>
                              <span className="text-indigo-100">{item.message}</span>
                              <span className="font-mono text-indigo-600 dark:text-indigo-400 flex-shrink-0">({item.commit})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {branchPreview.commits && branchPreview.commits.length === 0 && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">No unique commits (branch is up to date with {branchPreview.base_branch})</p>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => switchBranch(branchPreview.branch)}
                        disabled={switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                        className="px-4 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {switchingBranch ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Operation in progress...' : `Switch to ${branchPreview.branch}`)}
                      </button>
                    </div>
                  </div>
                )}

                {loadingPreview && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw size={18} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="ml-2 text-sm text-pb-text2 dark:text-gray-400">Loading branch preview...</span>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold text-pb-text dark:text-white mb-3">Available Branches</h3>
                  {availableBranches.length === 0 ? (
                    <p className="text-pb-text2 dark:text-gray-400 text-sm">No branches found</p>
                  ) : (
                    availableBranches.map((branch) => (
                      <div
                        key={branch.name}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          branch.current
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : branch.previous
                              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                              : 'border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <GitBranch size={16} className={branch.current ? 'text-purple-600 dark:text-purple-400' : 'text-pb-text2 dark:text-gray-400'} />
                              <span className={`font-mono font-semibold ${
                                branch.current
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : 'text-pb-text dark:text-white'
                              }`}>
                                {branch.name}
                              </span>
                              {branch.current && (
                                <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                                  Current
                                </span>
                              )}
                              {branch.previous && !branch.current && (
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                                  Previous
                                </span>
                              )}
                              {branch.ahead_of_base > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                                  +{branch.ahead_of_base}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 ml-6">
                              {branch.last_commit && (
                                <p className="text-xs text-pb-text2 dark:text-gray-400 truncate">
                                  {branch.last_commit.substring(0, 60)}{branch.last_commit.length > 60 ? '...' : ''}
                                </p>
                              )}
                              {branch.last_commit_date && (
                                <span className="text-xs text-pb-text2 dark:text-gray-500 flex-shrink-0">
                                  {branch.last_commit_date}
                                </span>
                              )}
                            </div>
                          </div>
                          {!branch.current && (
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <button
                                onClick={() => fetchBranchPreview(branch.name)}
                                disabled={loadingPreview || (systemInfo && systemInfo.update_in_progress)}
                                className="px-3 py-2 text-sm border border-pb-border dark:border-slate-600 text-pb-text dark:text-gray-300 rounded hover:bg-pb-surface2 dark:hover:bg-slate-700 disabled:opacity-50"
                                title="Preview branch changes"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => switchBranch(branch.name)}
                                disabled={switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                                className="px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {switchingBranch ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Busy...' : 'Switch')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => { setShowBranchModal(false); setBranchPreview(null); }}
                    className="px-4 py-2 border border-pb-border dark:border-slate-600 text-pb-text dark:text-gray-300 rounded hover:bg-pb-surface2 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default SystemModals;
