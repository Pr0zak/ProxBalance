import {
  Activity, X, MoveRight, XCircle, Plus, Trash, Play,
  AlertTriangle, Info, List, ArrowRight, Terminal, CheckCircle
} from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';

export default function MigrationModals({
  showMigrationDialog, setShowMigrationDialog,
  selectedGuest,
  canMigrate,
  migrationTarget, setMigrationTarget,
  data, setData,
  executeMigration,
  showTagModal, setShowTagModal,
  tagModalGuest, setTagModalGuest,
  newTag, setNewTag,
  setError,
  handleAddTag,
  confirmRemoveTag, setConfirmRemoveTag,
  confirmAndRemoveTag,
  confirmMigration, setConfirmMigration,
  confirmAndMigrate,
  showBatchConfirmation, setShowBatchConfirmation,
  pendingBatchMigrations,
  collapsedSections, setCollapsedSections,
  confirmBatchMigration,
  cancelMigrationModal, setCancelMigrationModal,
  cancellingMigration, setCancellingMigration,
  fetchAutomationStatus
}) {
  return (<>
    {/* Migration Dialog Modal */}
    {showMigrationDialog && selectedGuest && canMigrate && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowMigrationDialog(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Migrate Guest</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Move VM or container</p>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Guest:</strong> {selectedGuest.name || `Guest ${selectedGuest.vmid}`} ({selectedGuest.vmid})
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Type:</strong> {((selectedGuest.type || '').toUpperCase() === 'VM' || (selectedGuest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'Container'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Current Node:</strong> {selectedGuest.currentNode}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Node
            </label>
            <select
              value={migrationTarget}
              onChange={(e) => setMigrationTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select target node...</option>
              {data && data.nodes && Object.values(data.nodes)
                .filter(node => node.name !== selectedGuest.currentNode && node.status === 'online')
                .map(node => (
                  <option key={node.name} value={node.name}>
                    {node.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowMigrationDialog(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={() => {
                if (migrationTarget) {
                  executeMigration({
                    vmid: selectedGuest.vmid,
                    source_node: selectedGuest.currentNode,
                    target_node: migrationTarget,
                    type: selectedGuest.type,
                    name: selectedGuest.name
                  });
                  setShowMigrationDialog(false);
                }
              }}
              disabled={!migrationTarget}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <MoveRight size={14} /> Migrate
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Tag Management Modal */}
    {showTagModal && tagModalGuest && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Add Tag</h3>
            <button
              onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Guest: <span className="font-semibold text-gray-900 dark:text-white">[{tagModalGuest.type} {tagModalGuest.vmid}] {tagModalGuest.name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Node: <span className="font-semibold text-gray-900 dark:text-white">{tagModalGuest.node}</span>
              </p>
            </div>

            {/* Quick Add Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Add
              </label>
              <div className="flex flex-wrap gap-2">
                {!tagModalGuest.tags.has_ignore && (
                  <button
                    onClick={async () => {
                      try {
                        const vmid = tagModalGuest.vmid;

                        const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tag: 'ignore' })
                        });

                        const result = await response.json();

                        if (result.success) {
                          setShowTagModal(false);
                          setNewTag('');
                          setTagModalGuest(null);

                          // Fast refresh - just update this guest's tags
                          const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                            method: 'POST'
                          });
                          const refreshResult = await refreshResponse.json();

                          if (refreshResult.success && data) {
                            // Update just this guest in the data state
                            setData({
                              ...data,
                              guests: {
                                ...data.guests,
                                [vmid]: {
                                  ...data.guests[vmid],
                                  tags: refreshResult.tags
                                }
                              }
                            });
                          }
                        } else {
                          setError(`Error: ${result.error}`);
                        }
                      } catch (error) {
                        setError(`Error adding tag: ${error.message}`);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    + ignore
                  </button>
                )}
                {!tagModalGuest.tags.all_tags?.includes('auto_migrate_ok') && (
                  <button
                    onClick={async () => {
                      try {
                        const vmid = tagModalGuest.vmid;

                        const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tag: 'auto_migrate_ok' })
                        });

                        const result = await response.json();

                        if (result.success) {
                          setShowTagModal(false);
                          setNewTag('');
                          setTagModalGuest(null);

                          // Fast refresh - just update this guest's tags
                          const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                            method: 'POST'
                          });
                          const refreshResult = await refreshResponse.json();

                          if (refreshResult.success && data) {
                            // Update just this guest in the data state
                            setData({
                              ...data,
                              guests: {
                                ...data.guests,
                                [vmid]: {
                                  ...data.guests[vmid],
                                  tags: refreshResult.tags
                                }
                              }
                            });
                          }
                        } else {
                          setError(`Error: ${result.error}`);
                        }
                      } catch (error) {
                        setError(`Error adding tag: ${error.message}`);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                  >
                    + auto_migrate_ok
                  </button>
                )}
                <button
                  onClick={() => setNewTag('exclude_')}
                  className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  + exclude_...
                </button>
                <button
                  onClick={() => setNewTag('affinity_')}
                  className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
                >
                  + affinity_...
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Enter Custom Tag
              </label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., exclude_database, affinity_web"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-mono">ignore</span> = never migrate | <span className="font-mono">exclude_[name]</span> = anti-affinity | <span className="font-mono">affinity_[name]</span> = keep together
              </p>
            </div>

            {/* Current Tags */}
            {tagModalGuest.tags.all_tags.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {tagModalGuest.tags.all_tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Add Tag
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Remove Tag Confirmation Modal */}
    {confirmRemoveTag && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmRemoveTag(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Confirm Tag Removal</h3>
            <button onClick={() => setConfirmRemoveTag(null)}>
              <XCircle size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-gray-700 dark:text-gray-300">
              Remove tag <span className="font-mono font-semibold text-red-600 dark:text-red-400">"{confirmRemoveTag.tag}"</span> from {confirmRemoveTag.guest.type} <span className="font-semibold">{confirmRemoveTag.guest.vmid}</span> ({confirmRemoveTag.guest.name})?
            </p>
          </div>

          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setConfirmRemoveTag(null)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={confirmAndRemoveTag}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Trash size={14} /> Remove Tag
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Migration Confirmation Modal */}
    {confirmMigration && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmMigration(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Confirm Migration</h3>
            <button onClick={() => setConfirmMigration(null)}>
              <XCircle size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Start migration for <span className="font-semibold text-blue-600 dark:text-blue-400">{confirmMigration.type} {confirmMigration.vmid}</span> ({confirmMigration.name})?
            </p>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">From:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{confirmMigration.source_node}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">To:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{confirmMigration.target_node}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{(confirmMigration.mem_gb || 0).toFixed(1)} GB</span>
              </div>
              {confirmMigration.score_improvement !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Improvement:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+{confirmMigration.score_improvement.toFixed(1)}</span>
                </div>
              )}
            </div>

            {confirmMigration.reason && (
              <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Reason:</span> {confirmMigration.reason}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setConfirmMigration(null)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={confirmAndMigrate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Play size={16} />
              Start Migration
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Batch Migration Confirmation Modal */}
    {showBatchConfirmation && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={24} className="text-yellow-500" />
                Confirm Batch Migration
              </h2>
              <button
                onClick={() => setShowBatchConfirmation(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Review the migration plan below. Migrations will be executed <strong>sequentially</strong> (one at a time).
            </p>
          </div>

          {/* Modal Body - Scrollable Task List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                <Info size={20} />
                <div>
                  <p className="font-semibold">Total Migrations: {pendingBatchMigrations.length}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Each migration will be tracked with real-time progress. You can monitor the status panel for updates.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <List size={18} />
              Migration Tasks
            </h3>

            <div className="space-y-3">
              {pendingBatchMigrations.map((rec, idx) => {
                const sourceNode = data?.nodes?.[rec.source_node];
                const targetNode = data?.nodes?.[rec.target_node];

                return (
                  <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            [{rec.type} {rec.vmid}] {rec.name}
                          </span>
                          {rec.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                              rec.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            }`}>
                              {rec.priority}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 text-sm">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source Node</div>
                            <div className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                              <ArrowRight size={14} />
                              {rec.source_node}
                            </div>
                            {sourceNode && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                CPU: {sourceNode.cpu_percent?.toFixed(1)}% | RAM: {sourceNode.mem_percent?.toFixed(1)}%
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Node</div>
                            <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                              <ArrowRight size={14} />
                              {rec.target_node}
                            </div>
                            {targetNode && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                CPU: {targetNode.cpu_percent?.toFixed(1)}% | RAM: {targetNode.mem_percent?.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {rec.reasoning && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                            <span className="font-semibold">Reason:</span> {rec.reasoning}
                          </div>
                        )}

                        <div className="mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const commandKey = `ai-command-${idx}`;
                              setCollapsedSections(prev => ({
                                ...prev,
                                [commandKey]: !prev[commandKey]
                              }));
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Terminal size={12} />
                            {collapsedSections[`ai-command-${idx}`] ? 'Show' : 'Hide'} command
                          </button>
                          {!collapsedSections[`ai-command-${idx}`] && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(rec.command);
                                const btn = e.currentTarget;
                                const originalText = btn.textContent;
                                btn.textContent = 'Copied!';
                                btn.classList.add('bg-green-100', 'dark:bg-green-900');
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                  btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                                }, 1000);
                              }}
                              className="text-xs font-mono bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-gray-700 dark:text-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                              title="Click to copy"
                            >
                              {rec.command}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <AlertTriangle size={16} className="inline mr-1 text-yellow-500" />
                Migrations will execute one at a time to ensure system stability
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchConfirmation(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={confirmBatchMigration}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-semibold"
                >
                  <CheckCircle size={16} />
                  Start {pendingBatchMigrations.length} Migration{pendingBatchMigrations.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Cancel Migration Confirmation Modal */}
    {cancelMigrationModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setCancelMigrationModal(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancel Migration?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This will stop the migration in progress
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {cancelMigrationModal.name}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                {cancelMigrationModal.type === 'qemu' ? 'VM' : 'CT'} {cancelMigrationModal.vmid}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="font-mono">{cancelMigrationModal.source_node}</span>
              <ArrowRight size={14} />
              <span className="font-mono">{cancelMigrationModal.target_node}</span>
            </div>
            {cancelMigrationModal.progress_info && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Progress: {cancelMigrationModal.progress_info.human_readable}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setCancelMigrationModal(null)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
            >
              <Play size={14} /> Keep Running
            </button>
            <button
              onClick={async () => {
                setCancellingMigration(true);
                try {
                  // Use custom onConfirm handler if provided (for manual migrations), otherwise use default API
                  if (cancelMigrationModal.onConfirm) {
                    await cancelMigrationModal.onConfirm();
                  } else {
                    const response = await fetch(`/api/migrations/${cancelMigrationModal.task_id}/cancel`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    if (response.ok) {
                      setCancelMigrationModal(null);
                      fetchAutomationStatus();
                    } else {
                      setError('Failed to cancel migration');
                    }
                  }
                } catch (error) {
                  console.error('Error cancelling migration:', error);
                  setError('Error cancelling migration');
                } finally {
                  setCancellingMigration(false);
                }
              }}
              disabled={cancellingMigration}
              className={`px-4 py-2 ${cancellingMigration ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2`}
            >
              {cancellingMigration ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cancelling...
                </>
              ) : (
                <>
                  <X size={16} />
                  Cancel Migration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
}
