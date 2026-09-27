import {
  Activity, X, MoveRight, XCircle, Plus, Trash, Play,
  AlertTriangle, Info, List, ArrowRight, Terminal, CheckCircle
} from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';
import { MODAL_OVERLAY, MODAL_CONTAINER, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, ICON, INPUT_FIELD, SELECT_FIELD } from '../../utils/designTokens.js';

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
  collapsedSections, setCollapsedSections,
  cancelMigrationModal, setCancelMigrationModal,
  cancellingMigration, setCancellingMigration,
  fetchAutomationStatus
}) {
  return (<>
    {/* Migration Dialog Modal */}
    {showMigrationDialog && selectedGuest && canMigrate && (
      <div className={MODAL_OVERLAY} onClick={() => setShowMigrationDialog(false)}>
        <div className={MODAL_CONTAINER} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
              <Activity size={24} className="text-pb-text dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-pb-text dark:text-white">Migrate Guest</h2>
              <p className="text-sm text-pb-text2 dark:text-gray-400 mt-0.5">Move VM or container</p>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="text-sm text-pb-text2 dark:text-gray-400">
              <strong>Guest:</strong> {selectedGuest.name || `Guest ${selectedGuest.vmid}`} ({selectedGuest.vmid})
            </div>
            <div className="text-sm text-pb-text2 dark:text-gray-400">
              <strong>Type:</strong> {((selectedGuest.type || '').toUpperCase() === 'VM' || (selectedGuest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'Container'}
            </div>
            <div className="text-sm text-pb-text2 dark:text-gray-400">
              <strong>Current Node:</strong> {(selectedGuest.currentNode || selectedGuest.node)}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-2">
              Target Node
            </label>
            <select
              value={migrationTarget}
              onChange={(e) => setMigrationTarget(e.target.value)}
              className={`${SELECT_FIELD} w-full`}
            >
              <option value="">Select target node...</option>
              {data && data.nodes && Object.values(data.nodes)
                .filter(node => node.name !== (selectedGuest.currentNode || selectedGuest.node) && node.status === 'online')
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
              className="px-4 py-2 border border-pb-border dark:border-slate-600 text-pb-text dark:text-gray-300 rounded hover:bg-pb-surface2 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={() => {
                if (migrationTarget) {
                  executeMigration({
                    vmid: selectedGuest.vmid,
                    source_node: (selectedGuest.currentNode || selectedGuest.node),
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
      <div className={MODAL_OVERLAY} onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}>
        <div className={MODAL_CONTAINER} onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
            <h3 className="text-lg sm:text-xl font-semibold text-pb-text dark:text-white">Add Tag</h3>
            <button
              onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
              className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-300"
              aria-label="Close"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6">
            <div className="mb-4">
              <p className="text-sm text-pb-text2 dark:text-gray-400 mb-2">
                Guest: <span className="font-semibold text-pb-text dark:text-white">[{tagModalGuest.type} {tagModalGuest.vmid}] {tagModalGuest.name}</span>
              </p>
              <p className="text-sm text-pb-text2 dark:text-gray-400">
                Node: <span className="font-semibold text-pb-text dark:text-white">{tagModalGuest.node}</span>
              </p>
            </div>

            {/* Quick Add Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-2">
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
                    className="px-3 py-1.5 text-sm bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/50"
                  >
                    + ignore
                  </button>
                )}
                {!tagModalGuest.tags.all_tags?.some(t => t === 'auto_migrate_ok' || t === 'auto-migrate-ok') && (
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
                    className="px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/50"
                  >
                    + auto_migrate_ok
                  </button>
                )}
                <button
                  onClick={() => setNewTag('exclude_')}
                  className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/50"
                >
                  + exclude_...
                </button>
                <button
                  onClick={() => setNewTag('affinity_')}
                  className="px-3 py-1.5 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded hover:bg-purple-50 dark:hover:bg-purple-900/50"
                >
                  + affinity_...
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-2">
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
                className={INPUT_FIELD}
                placeholder="e.g., exclude_database, affinity_web"
              />
              <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                <span className="font-mono">ignore</span> = never migrate | <span className="font-mono">exclude_[name]</span> = anti-affinity | <span className="font-mono">affinity_[name]</span> = keep together
              </p>
            </div>

            {/* Current Tags */}
            {tagModalGuest.tags.all_tags.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-2">
                  Current Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {tagModalGuest.tags.all_tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-200 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-pb-border dark:border-slate-700">
            <button
              onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-pb-text dark:text-gray-300 bg-pb-surface2 dark:bg-gray-700 rounded hover:bg-gray-600"
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
      <div className={MODAL_OVERLAY} onClick={() => setConfirmRemoveTag(null)}>
        <div className={MODAL_CONTAINER} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
            <h3 className="text-lg sm:text-xl font-semibold text-pb-text dark:text-white">Confirm Tag Removal</h3>
            <button onClick={() => setConfirmRemoveTag(null)} aria-label="Close">
              <XCircle size={24} className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-300" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-pb-text dark:text-gray-300">
              Remove tag <span className="font-mono font-semibold text-red-600 dark:text-red-400">"{confirmRemoveTag.tag}"</span> from {confirmRemoveTag.guest.type} <span className="font-semibold">{confirmRemoveTag.guest.vmid}</span> ({confirmRemoveTag.guest.name})?
            </p>
          </div>

          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-pb-border dark:border-slate-700">
            <button
              onClick={() => setConfirmRemoveTag(null)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-200 rounded hover:bg-gray-600"
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
      <div className={MODAL_OVERLAY} onClick={() => setConfirmMigration(null)}>
        <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
            <h3 className="text-lg sm:text-xl font-semibold text-pb-text dark:text-white">Confirm Migration</h3>
            <button onClick={() => setConfirmMigration(null)} aria-label="Close">
              <XCircle size={24} className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-300" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-pb-text dark:text-gray-300 mb-4">
              Start migration for <span className="font-semibold text-blue-600 dark:text-blue-400">{confirmMigration.type} {confirmMigration.vmid}</span> ({confirmMigration.name})?
            </p>

            <div className="bg-pb-surface2 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-pb-text2 dark:text-gray-400">From:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{confirmMigration.source_node}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-pb-text2 dark:text-gray-400">To:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{confirmMigration.target_node}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-pb-text2 dark:text-gray-400">Memory:</span>
                <span className="font-mono text-pb-text dark:text-gray-100">{(confirmMigration.mem_gb || 0).toFixed(1)} GB</span>
              </div>
              {confirmMigration.score_improvement !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-pb-text2 dark:text-gray-400">Improvement:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+{confirmMigration.score_improvement.toFixed(1)}</span>
                </div>
              )}
            </div>

            {confirmMigration.reason && (
              <div className="mt-4 text-xs text-pb-text2 dark:text-gray-400">
                <span className="font-medium">Reason:</span> {confirmMigration.reason}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-pb-border dark:border-slate-700">
            <button
              onClick={() => setConfirmMigration(null)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-200 rounded hover:bg-gray-600"
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

    {/* Cancel Migration Confirmation Modal */}
    {cancelMigrationModal && (
      <div className={MODAL_OVERLAY} onClick={() => setCancelMigrationModal(null)}>
        <div className={MODAL_CONTAINER} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-pb-text dark:text-gray-100">Cancel Migration?</h3>
              <p className="text-sm text-pb-text2 dark:text-gray-400 mt-1">
                This will stop the migration in progress
              </p>
            </div>
          </div>

          <div className="bg-pb-surface2 dark:bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-pb-text dark:text-gray-300">
                {cancelMigrationModal.name}
              </span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                {cancelMigrationModal.type === 'qemu' ? 'VM' : 'CT'} {cancelMigrationModal.vmid}
              </span>
            </div>
            <div className="text-sm text-pb-text2 dark:text-gray-400 flex items-center gap-2">
              <span className="font-mono">{cancelMigrationModal.source_node}</span>
              <ArrowRight size={14} />
              <span className="font-mono">{cancelMigrationModal.target_node}</span>
            </div>
            {cancelMigrationModal.progress_info && (
              <div className="text-xs text-pb-text2 dark:text-gray-500">
                Progress: {cancelMigrationModal.progress_info.human_readable}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setCancelMigrationModal(null)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-pb-surface2 dark:bg-gray-700 hover:bg-gray-600 text-pb-text dark:text-gray-300 rounded-lg font-semibold transition-colors"
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
              className={`px-4 py-2 ${cancellingMigration ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-500'} text-white rounded-lg font-semibold transition-colors flex items-center gap-2`}
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
