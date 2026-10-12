import { AlertTriangle, RefreshCw, CheckCircle, X } from '../Icons.jsx';
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
  systemInfo
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
    </>
  );
};

export default SystemModals;
