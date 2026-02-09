import { RefreshCw, Save, CheckCircle, Server } from '../Icons.jsx';
import { formatLocalTime, getTimezoneAbbr } from '../../utils/formatters.js';

const API_BASE = `/api`;
const { useState } = React;

export default function DataCollectionSection({
  backendCollected, loading, data, config, handleRefresh, fetchConfig, setError
}) {
  const [savingCollectionSettings, setSavingCollectionSettings] = useState(false);
  const [collectionSettingsSaved, setCollectionSettingsSaved] = useState(false);

  return (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Data Collection & Performance</h3>

                      {/* Last Collection Status */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Status</h4>
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                          {backendCollected && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Server size={16} className="text-green-600 dark:text-green-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Last collected: <span className="font-semibold text-green-600 dark:text-green-400">{formatLocalTime(backendCollected)} {getTimezoneAbbr()}</span>
                                </span>
                              </div>
                              <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh data collection now"
                              >
                                <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''} text-gray-600 dark:text-gray-400`} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Collection Performance Stats */}
                    {data?.performance && (
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Performance Metrics</h4>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Time</div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.performance.total_time}s</div>
                            </div>
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Node Processing</div>
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.performance.node_processing_time}s</div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{data.performance.parallel_enabled ? 'Parallel' : 'Sequential'}</div>
                            </div>
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Guest Processing</div>
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.performance.guest_processing_time}s</div>
                            </div>
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Workers Used</div>
                              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.performance.max_workers}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{data.performance.node_count} nodes, {data.performance.guest_count} guests</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                      {/* Collection Optimization Settings */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Optimization Settings</h4>
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
                            <p className="text-sm text-blue-900 dark:text-blue-200">
                              <strong>Collection Performance:</strong> Optimize data collection speed based on cluster size. Parallel collection can reduce collection time by 3-5x.
                            </p>
                          </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cluster Size Preset
                          </label>
                          <select
                            id="clusterSizePreset"
                            defaultValue={config?.collection_optimization?.cluster_size || 'medium'}
                            onChange={(e) => {
                              const presets = {
                                small: { interval: 5, workers: 3, node_tf: 'day', guest_tf: 'hour' },
                                medium: { interval: 15, workers: 5, node_tf: 'day', guest_tf: 'hour' },
                                large: { interval: 30, workers: 8, node_tf: 'hour', guest_tf: 'hour' },
                                custom: {}
                              };
                              const preset = presets[e.target.value];
                              if (preset && e.target.value !== 'custom') {
                                // Update the form fields
                                const intervalInput = document.getElementById('collectionInterval');
                                const workersInput = document.getElementById('maxWorkers');
                                const nodeTimeframeSelect = document.getElementById('nodeTimeframe');
                                const guestTimeframeSelect = document.getElementById('guestTimeframe');

                                if (intervalInput) intervalInput.value = preset.interval;
                                if (workersInput) workersInput.value = preset.workers;
                                if (nodeTimeframeSelect) nodeTimeframeSelect.value = preset.node_tf;
                                if (guestTimeframeSelect) guestTimeframeSelect.value = preset.guest_tf;
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="small">Small (&lt; 30 VMs/CTs) - 5 min intervals</option>
                            <option value="medium">Medium (30-100 VMs/CTs) - 15 min intervals</option>
                            <option value="large">Large (100+ VMs/CTs) - 30 min intervals</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Collection Interval (minutes)
                          </label>
                          <input
                            type="number"
                            id="collectionInterval"
                            defaultValue={config?.collection_interval_minutes || 15}
                            min="1"
                            max="240"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            How often to collect full cluster metrics
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              id="parallelEnabled"
                              defaultChecked={config?.collection_optimization?.parallel_collection_enabled !== false}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Enable Parallel Collection</span>
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                            Process multiple nodes simultaneously (3-5x faster)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Parallel Workers
                          </label>
                          <input
                            type="number"
                            id="maxWorkers"
                            defaultValue={config?.collection_optimization?.max_parallel_workers || 5}
                            min="1"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Number of nodes to process concurrently
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              id="skipStoppedRRD"
                              defaultChecked={config?.collection_optimization?.skip_stopped_guest_rrd !== false}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Skip RRD for Stopped Guests</span>
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                            Don't collect performance metrics for stopped VMs/CTs (faster collection)
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Node RRD Timeframe
                            </label>
                            <select
                              id="nodeTimeframe"
                              defaultValue={config?.collection_optimization?.node_rrd_timeframe || 'day'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="hour">Hour (~60 points)</option>
                              <option value="day">Day (~1440 points)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Guest RRD Timeframe
                            </label>
                            <select
                              id="guestTimeframe"
                              defaultValue={config?.collection_optimization?.guest_rrd_timeframe || 'hour'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="hour">Hour (~60 points)</option>
                              <option value="day">Day (~1440 points)</option>
                            </select>
                          </div>
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 -mx-4 -mb-4 px-4 py-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => {
                              setSavingCollectionSettings(true);
                              setCollectionSettingsSaved(false);

                              const collectionConfig = {
                                collection_interval_minutes: parseInt(document.getElementById('collectionInterval').value),
                                collection_optimization: {
                                  cluster_size: document.getElementById('clusterSizePreset').value,
                                  parallel_collection_enabled: document.getElementById('parallelEnabled').checked,
                                  max_parallel_workers: parseInt(document.getElementById('maxWorkers').value),
                                  skip_stopped_guest_rrd: document.getElementById('skipStoppedRRD').checked,
                                  node_rrd_timeframe: document.getElementById('nodeTimeframe').value,
                                  guest_rrd_timeframe: document.getElementById('guestTimeframe').value
                                }
                              };

                              fetch(`${API_BASE}/settings/collection`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(collectionConfig)
                              })
                              .then(response => response.json())
                              .then(result => {
                                setSavingCollectionSettings(false);
                                if (result.success) {
                                  setCollectionSettingsSaved(true);
                                  setTimeout(() => setCollectionSettingsSaved(false), 3000);
                                  fetchConfig();
                                } else {
                                  setError('Failed to update settings: ' + (result.error || 'Unknown error'));
                                }
                              })
                              .catch(error => {
                                setSavingCollectionSettings(false);
                                setError('Error: ' + error.message);
                              });
                            }}
                            disabled={savingCollectionSettings}
                            className={`w-full px-4 py-2 text-white rounded font-medium flex items-center justify-center gap-2 shadow-lg transition-colors ${
                              collectionSettingsSaved
                                ? 'bg-emerald-500 dark:bg-emerald-600'
                                : savingCollectionSettings
                                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                  : 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                            }`}
                          >
                            {savingCollectionSettings ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Saving...
                              </>
                            ) : collectionSettingsSaved ? (
                              <>
                                <CheckCircle size={16} />
                                Settings Saved!
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Apply Collection Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>
  );
}
