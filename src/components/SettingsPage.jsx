import {
  AlertCircle, Settings, ChevronDown, Save, Sun, Moon,
  ArrowLeft, Lock, RefreshCw, Download, Upload, CheckCircle,
  Bell, AlertTriangle, Server, Edit, Trash, Check, X, RotateCcw,
  Copy, Eye, EyeOff, Plus, HelpCircle, Power
} from './Icons.jsx';
import { formatLocalTime, getTimezoneAbbr } from '../utils/formatters.js';

const API_BASE = `/api`;

export default function SettingsPage(props) {
  const {
    darkMode, setDarkMode,
    config,
    setCurrentPage,
    aiEnabled, setAiEnabled,
    aiProvider, setAiProvider,
    openaiKey, setOpenaiKey,
    openaiModel, setOpenaiModel,
    anthropicKey, setAnthropicKey,
    anthropicModel, setAnthropicModel,
    localUrl, setLocalUrl,
    localModel, setLocalModel,
    localLoadingModels, setLocalLoadingModels,
    localAvailableModels, setLocalAvailableModels,
    backendCollected,
    loading,
    data,
    savingCollectionSettings, setSavingCollectionSettings,
    collectionSettingsSaved, setCollectionSettingsSaved,
    automationConfig,
    showPenaltyConfig, setShowPenaltyConfig,
    penaltyConfig, setPenaltyConfig,
    penaltyDefaults,
    penaltyConfigSaved,
    savingPenaltyConfig,
    showAdvancedSettings, setShowAdvancedSettings,
    logLevel, setLogLevel,
    verboseLogging, setVerboseLogging,
    proxmoxTokenId, setProxmoxTokenId,
    proxmoxTokenSecret, setProxmoxTokenSecret,
    validatingToken,
    tokenValidationResult,
    confirmHostChange, setConfirmHostChange,
    savingSettings,
    error, setError,
    handleRefresh,
    fetchConfig,
    saveSettings,
    saveAutomationConfig,
    validateToken,
    confirmAndChangeHost,
    savePenaltyConfig,
    resetPenaltyConfig,
  } = props;

  return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0">
                <div className="max-w-5xl mx-auto p-4">
                  {/* Settings Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
                    <div className="flex items-center justify-between flex-wrap gap-y-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <button
                          onClick={() => setCurrentPage('dashboard')}
                          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0"
                          title="Back to Dashboard"
                        >
                          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                        </button>
                        <div className="flex items-center gap-3 min-w-0">
                          <Settings size={28} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                        </div>
                      </div>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
                      </button>
                    </div>
                  </div>

                  {/* Settings Content */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-8">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        AI-Powered Recommendations
                      </label>
                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          checked={aiEnabled}
                          onChange={(e) => setAiEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Enable AI-Enhanced Migration Recommendations
                        </label>
                      </div>
                    </div>

                    {aiEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            AI Provider
                          </label>
                          <select
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="none">None</option>
                            <option value="openai">OpenAI (GPT-4)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="local">Local LLM (Ollama)</option>
                          </select>
                        </div>

                        {aiProvider === 'openai' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">OpenAI Configuration</h4>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <input
                                type="text"
                                value={openaiModel}
                                onChange={(e) => setOpenaiModel(e.target.value)}
                                placeholder="gpt-4o"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                See available models at <a href="https://platform.openai.com/docs/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenAI Models</a>
                              </p>
                            </div>
                          </div>
                        )}

                        {aiProvider === 'anthropic' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Anthropic Configuration</h4>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                                placeholder="sk-ant-..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <input
                                type="text"
                                value={anthropicModel}
                                onChange={(e) => setAnthropicModel(e.target.value)}
                                placeholder="claude-3-5-sonnet-20241022"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                See available models at <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Anthropic Models</a>
                              </p>
                            </div>
                          </div>
                        )}

                        {aiProvider === 'local' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Local LLM (Ollama) Configuration</h4>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ollama Base URL
                              </label>
                              <input
                                type="text"
                                value={localUrl}
                                onChange={(e) => setLocalUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="http://localhost:11434"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The URL where Ollama is running</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Model
                                </label>
                                <button
                                  onClick={async () => {
                                    setLocalLoadingModels(true);
                                    try {
                                      const response = await fetch('/api/ai-models', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          provider: 'local',
                                          base_url: localUrl
                                        })
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        setLocalAvailableModels(data.models || []);
                                      } else {
                                        setError('Failed to fetch models: ' + (data.error || 'Unknown error'));
                                      }
                                    } catch (error) {
                                      setError('Error fetching models: ' + error.message);
                                    } finally {
                                      setLocalLoadingModels(false);
                                    }
                                  }}
                                  disabled={localLoadingModels}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                  <RefreshCw size={12} className={localLoadingModels ? 'animate-spin' : ''} />
                                  {localLoadingModels ? 'Loading...' : 'Refresh Models'}
                                </button>
                              </div>
                              {localAvailableModels.length > 0 ? (
                                <select
                                  value={localModel}
                                  onChange={(e) => setLocalModel(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {localAvailableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={localModel}
                                  onChange={(e) => setLocalModel(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="llama3.1:8b"
                                />
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ollama model to use for recommendations</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                              <p className="text-sm text-blue-900 dark:text-blue-200">
                                <strong>Note:</strong> Ensure Ollama is installed and running. Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> for installation instructions.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <hr className="border-gray-300 dark:border-gray-600" />

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

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Notifications */}
                    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-y-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Bell className="text-gray-600 dark:text-gray-400 shrink-0" size={24} />
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about migrations, maintenance events, and cluster alerts</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox"
                            checked={automationConfig.notifications?.enabled || false}
                            onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, enabled: e.target.checked } })}
                            className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {automationConfig.notifications?.enabled && (
                      <div className="space-y-4 mt-4">
                        {/* Migration Events */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Migration Events</div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_start !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_start: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Run started
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_complete !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_complete: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Run completed
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_action !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_action: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Each migration
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_failure !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_failure: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Safety check failure
                            </label>
                          </div>
                          {/* Sub-filter: success/failure for individual migrations */}
                          {automationConfig.notifications?.on_action !== false && (
                            <div className="mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1">
                              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={automationConfig.notifications?.on_action_success !== false}
                                  onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_action_success: e.target.checked } })}
                                  className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                                Successful migrations
                              </label>
                              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={automationConfig.notifications?.on_action_failure !== false}
                                  onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_action_failure: e.target.checked } })}
                                  className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                                Failed migrations
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Cluster Events */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Cluster Events</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" title="Alert when a node goes offline or comes back online">
                              <input type="checkbox" checked={automationConfig.notifications?.on_node_status !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_node_status: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Node status changes
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" title="Alert when CPU or memory exceeds safety thresholds">
                              <input type="checkbox" checked={automationConfig.notifications?.on_resource_threshold === true}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_resource_threshold: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Resource threshold breach
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" title="Alert when node evacuation starts or completes">
                              <input type="checkbox" checked={automationConfig.notifications?.on_evacuation !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_evacuation: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Evacuation events
                            </label>
                          </div>
                        </div>

                        {/* System Events */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">System Events</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" title="Alert when new migration recommendations are generated">
                              <input type="checkbox" checked={automationConfig.notifications?.on_recommendations === true}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_recommendations: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              New recommendations
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" title="Alert when data collection succeeds or fails">
                              <input type="checkbox" checked={automationConfig.notifications?.on_collector_status === true}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_collector_status: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Collector status
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" title="Alert when a new ProxBalance version is available">
                              <input type="checkbox" checked={automationConfig.notifications?.on_update_available !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_update_available: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Update available
                            </label>
                          </div>
                        </div>

                        {/* Pushover */}
                        <div className="bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-pushover'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Pushover</span>
                              {automationConfig.notifications?.providers?.pushover?.enabled && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full" title="Active"><CheckCircle size={12} /></span>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.pushover?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.pushover = { ...(providers.pushover || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <div id="settings-notif-pushover" className="hidden p-3 pt-0 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">API Token</label>
                                <input type="password" placeholder="Application API token"
                                  value={automationConfig.notifications?.providers?.pushover?.api_token || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), api_token: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">User Key</label>
                                <input type="password" placeholder="Your user/group key"
                                  value={automationConfig.notifications?.providers?.pushover?.user_key || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), user_key: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                <select value={automationConfig.notifications?.providers?.pushover?.priority ?? 0}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), priority: parseInt(e.target.value) };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white">
                                  <option value={-1}>Low</option>
                                  <option value={0}>Normal</option>
                                  <option value={1}>High</option>
                                  <option value={2}>Emergency</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sound</label>
                                <select value={automationConfig.notifications?.providers?.pushover?.sound || 'pushover'}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), sound: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white">
                                  <option value="pushover">Pushover (default)</option>
                                  <option value="bike">Bike</option>
                                  <option value="bugle">Bugle</option>
                                  <option value="cashregister">Cash Register</option>
                                  <option value="classical">Classical</option>
                                  <option value="cosmic">Cosmic</option>
                                  <option value="falling">Falling</option>
                                  <option value="gamelan">Gamelan</option>
                                  <option value="incoming">Incoming</option>
                                  <option value="intermission">Intermission</option>
                                  <option value="magic">Magic</option>
                                  <option value="mechanical">Mechanical</option>
                                  <option value="pianobar">Piano Bar</option>
                                  <option value="siren">Siren</option>
                                  <option value="spacealarm">Space Alarm</option>
                                  <option value="tugboat">Tugboat</option>
                                  <option value="alien">Alien Alarm (long)</option>
                                  <option value="climb">Climb (long)</option>
                                  <option value="persistent">Persistent (long)</option>
                                  <option value="echo">Echo (long)</option>
                                  <option value="updown">Up Down (long)</option>
                                  <option value="vibrate">Vibrate Only</option>
                                  <option value="none">None (silent)</option>
                                </select>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Get your API token and user key from <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">pushover.net</a></p>
                          </div>
                        </div>

                        {/* Email (SMTP) */}
                        <div className="bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-email'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Email (SMTP)</span>
                              {automationConfig.notifications?.providers?.email?.enabled && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full" title="Active"><CheckCircle size={12} /></span>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.email?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.email = { ...(providers.email || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <div id="settings-notif-email" className="hidden p-3 pt-0 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Host</label>
                                <input type="text" placeholder="smtp.gmail.com"
                                  value={automationConfig.notifications?.providers?.email?.smtp_host || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_host: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Port</label>
                                <input type="number" min="1" max="65535"
                                  value={automationConfig.notifications?.providers?.email?.smtp_port || 587}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_port: parseInt(e.target.value) };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <input type="text" placeholder="user@example.com"
                                  value={automationConfig.notifications?.providers?.email?.smtp_username || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_username: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input type="password" placeholder="App password"
                                  value={automationConfig.notifications?.providers?.email?.smtp_password || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_password: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Address</label>
                                <input type="email" placeholder="proxbalance@example.com"
                                  value={automationConfig.notifications?.providers?.email?.from_address || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), from_address: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To Addresses</label>
                                <input type="text" placeholder="admin@example.com, ops@example.com"
                                  value={Array.isArray(automationConfig.notifications?.providers?.email?.to_addresses) ? automationConfig.notifications.providers.email.to_addresses.join(', ') : (automationConfig.notifications?.providers?.email?.to_addresses || '')}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), to_addresses: e.target.value.split(',').map(a => a.trim()).filter(a => a) };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.email?.smtp_tls !== false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.email = { ...(providers.email || {}), smtp_tls: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Use STARTTLS
                            </label>
                          </div>
                        </div>

                        {/* Telegram */}
                        <div className="bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-telegram'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Telegram</span>
                              {automationConfig.notifications?.providers?.telegram?.enabled && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full" title="Active"><CheckCircle size={12} /></span>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.telegram?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.telegram = { ...(providers.telegram || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <div id="settings-notif-telegram" className="hidden p-3 pt-0 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bot Token</label>
                                <input type="password" placeholder="123456:ABC-DEF..."
                                  value={automationConfig.notifications?.providers?.telegram?.bot_token || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.telegram = { ...(providers.telegram || {}), bot_token: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Chat ID</label>
                                <input type="text" placeholder="-1001234567890"
                                  value={automationConfig.notifications?.providers?.telegram?.chat_id || ''}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.telegram = { ...(providers.telegram || {}), chat_id: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Create a bot via <span className="font-mono">@BotFather</span> on Telegram and add it to your group/channel</p>
                          </div>
                        </div>

                        {/* Discord */}
                        <div className="bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-discord'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Discord</span>
                              {automationConfig.notifications?.providers?.discord?.enabled && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full" title="Active"><CheckCircle size={12} /></span>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.discord?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.discord = { ...(providers.discord || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <div id="settings-notif-discord" className="hidden p-3 pt-0 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</label>
                              <input type="url" placeholder="https://discord.com/api/webhooks/..."
                                value={automationConfig.notifications?.providers?.discord?.webhook_url || ''}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.discord = { ...(providers.discord || {}), webhook_url: e.target.value };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Server Settings &gt; Integrations &gt; Webhooks &gt; New Webhook</p>
                          </div>
                        </div>

                        {/* Slack */}
                        <div className="bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-slack'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Slack</span>
                              {automationConfig.notifications?.providers?.slack?.enabled && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full" title="Active"><CheckCircle size={12} /></span>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.slack?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.slack = { ...(providers.slack || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <div id="settings-notif-slack" className="hidden p-3 pt-0 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</label>
                              <input type="url" placeholder="https://hooks.slack.com/services/T.../B.../..."
                                value={automationConfig.notifications?.providers?.slack?.webhook_url || ''}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.slack = { ...(providers.slack || {}), webhook_url: e.target.value };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Create an Incoming Webhook in your Slack workspace settings</p>
                          </div>
                        </div>

                        {/* Generic Webhook */}
                        <div className="bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <div className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-webhook'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Generic Webhook</span>
                              {automationConfig.notifications?.providers?.webhook?.enabled && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full" title="Active"><CheckCircle size={12} /></span>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.webhook?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.webhook = { ...(providers.webhook || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <div id="settings-notif-webhook" className="hidden p-3 pt-0 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</label>
                              <input type="url" placeholder="https://your-server.com/webhook"
                                value={automationConfig.notifications?.providers?.webhook?.url || ''}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.webhook = { ...(providers.webhook || {}), url: e.target.value };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sends a JSON POST with title, message, priority, and timestamp</p>
                          </div>
                        </div>

                        {/* Test Notification Button */}
                        <div className="pt-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`${API_BASE}/notifications/test`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const result = await response.json();
                                if (result.success) {
                                  alert('Test notifications sent successfully to all enabled providers.');
                                } else {
                                  const details = result.results ? Object.entries(result.results).map(([k, v]) => `${k}: ${v.success ? 'OK' : v.error}`).join('\n') : result.error;
                                  alert(`Notification test results:\n${details}`);
                                }
                              } catch (err) {
                                alert(`Failed to send test: ${err.message}`);
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Bell size={14} />
                            Send Test Notification
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Sends a test message to all enabled providers to verify your configuration
                          </p>
                        </div>
                      </div>
                      )}
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Authentication - Coming Soon */}
                    <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30 opacity-60 cursor-not-allowed">
                      {/* Coming Soon Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow">
                          COMING SOON
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <Lock className="text-gray-600 dark:text-gray-400" size={24} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Authentication & Access Control</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Secure your ProxBalance instance with user authentication and role-based access</p>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        {/* Enable Authentication */}
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700 dark:text-gray-300">Enable Authentication</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Require login to access ProxBalance</div>
                          </div>
                          <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                          </div>
                        </div>

                        {/* Authentication Methods */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">Authentication Methods</div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Local User Database</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>LDAP/Active Directory</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>OAuth2/OIDC (SSO)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Proxmox VE Authentication</span>
                            </div>
                          </div>
                        </div>

                        {/* User Management */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">User Management</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Create and manage user accounts with role-based permissions</div>
                          <div className="flex gap-2">
                            <button disabled className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded text-xs font-medium flex items-center justify-center gap-1.5">
                              <Plus size={12} />
                              Add User
                            </button>
                            <button disabled className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded text-xs font-medium flex items-center justify-center gap-1.5">
                              <Settings size={12} />
                              Manage Roles
                            </button>
                          </div>
                        </div>

                        {/* Access Control Roles */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Role-Based Access Control</div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-between">
                              <span>• Administrator - Full access to all features</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>• Operator - Can execute migrations and maintenance</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>• Viewer - Read-only access to dashboard</span>
                            </div>
                          </div>
                        </div>

                        {/* Session Settings */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">Session Settings</div>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Session Timeout</span>
                              <span className="text-gray-500 dark:text-gray-400">30 minutes</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Require 2FA</span>
                              <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Penalty Scoring Configuration - Standalone Section */}
                    <div id="penalty-config-section" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
                      <button
                        onClick={() => setShowPenaltyConfig(!showPenaltyConfig)}
                        className="w-full flex items-center justify-between text-left group flex-wrap gap-y-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Settings size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Penalty Scoring Configuration</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Configure penalty weights used by the scoring algorithm</p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${showPenaltyConfig ? 'rotate-180' : ''}`}
                          size={20}
                        />
                      </button>

                      {showPenaltyConfig && penaltyConfig && penaltyDefaults && (
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded mt-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Configure penalty weights used by the scoring algorithm when evaluating migration targets. Lower penalties favor that condition.
                          </p>

                          {/* Time Period Weights */}
                          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Time Period Weights</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Control how much weight to give to recent vs. historical metrics. Values must sum to 1.0.
                              <br/>Example for 6-hour window: Current=0.6, 24h=0.4, 7d=0.0
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Current Weight (default: {penaltyDefaults.weight_current})
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={penaltyConfig.weight_current}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, weight_current: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  24h Weight (default: {penaltyDefaults.weight_24h})
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={penaltyConfig.weight_24h}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, weight_24h: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  7d Weight (default: {penaltyDefaults.weight_7d})
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={penaltyConfig.weight_7d}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, weight_7d: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                            {(() => {
                              const sum = (penaltyConfig.weight_current || 0) + (penaltyConfig.weight_24h || 0) + (penaltyConfig.weight_7d || 0);
                              const isValid = Math.abs(sum - 1.0) < 0.01;
                              return (
                                <div className={`text-sm font-medium ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  Sum: {sum.toFixed(2)} {isValid ? '✓ Valid' : '✗ Must equal 1.0'}
                                </div>
                              );
                            })()}
                          </div>

                          {/* CPU Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">CPU Penalties</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Applied when target node CPU usage is high. Higher values = avoid nodes with high CPU. Set to 0 to disable penalty.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.cpu_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={penaltyConfig.cpu_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, cpu_high_penalty: parseInt(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Very High (default: {penaltyDefaults.cpu_very_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={penaltyConfig.cpu_very_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, cpu_very_high_penalty: parseInt(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Extreme (default: {penaltyDefaults.cpu_extreme_penalty})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={penaltyConfig.cpu_extreme_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, cpu_extreme_penalty: parseInt(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Memory Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">Memory Penalties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.mem_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.mem_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, mem_high_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Very High (default: {penaltyDefaults.mem_very_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.mem_very_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, mem_very_high_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Extreme (default: {penaltyDefaults.mem_extreme_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.mem_extreme_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, mem_extreme_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* IOWait Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">IOWait Penalties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Moderate (default: {penaltyDefaults.iowait_moderate_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.iowait_moderate_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, iowait_moderate_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.iowait_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.iowait_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, iowait_high_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Severe (default: {penaltyDefaults.iowait_severe_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.iowait_severe_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, iowait_severe_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
              </div>
                            </div>
                          </div>

                          {/* Minimum Score Improvement */}
                          <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Minimum Score Improvement</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Minimum score improvement (in points) required for a migration to be recommended. This threshold filters out migrations that would provide only marginal benefit.
                              <br />Lower values = more sensitive to small improvements (more migrations)
                              <br />Higher values = only migrate when there's significant benefit (fewer migrations)
                            </p>
                            <div className="max-w-md">
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Minimum Score Improvement (default: {penaltyDefaults.min_score_improvement || 15})
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={penaltyConfig.min_score_improvement !== undefined ? penaltyConfig.min_score_improvement : 15}
                                onChange={(e) => setPenaltyConfig({...penaltyConfig, min_score_improvement: parseInt(e.target.value) || 15})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Recommended values: Conservative (20-30), Balanced (10-15), Aggressive (5-10)
                              </p>
                            </div>
                          </div>

                          {/* Success Message */}
                          {penaltyConfigSaved && (
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded text-green-800 dark:text-green-300">
                              Penalty configuration saved successfully!
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4">
                            <button
                              onClick={savePenaltyConfig}
                              disabled={savingPenaltyConfig}
                              className={`flex-1 px-4 py-2 text-white rounded font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 ${
                                penaltyConfigSaved
                                  ? 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                                  : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                              }`}
                            >
                              {savingPenaltyConfig ? 'Saving...' : penaltyConfigSaved ? (<><CheckCircle size={14} /> Saved!</>) : (<><Save size={14} /> Save Penalty Config</>)}
                            </button>
                            <button
                              onClick={resetPenaltyConfig}
                              disabled={savingPenaltyConfig}
                              className="flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw size={14} />
                              Reset to Defaults
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Advanced System Settings - Collapsible */}
                    <div className="border-2 border-red-500 dark:border-red-600 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                      <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="w-full flex items-center justify-between text-left group flex-wrap gap-y-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AlertTriangle className="text-red-600 dark:text-red-500 shrink-0" size={24} />
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced System Settings</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Data management, debugging, API configuration, and system controls</p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${showAdvancedSettings ? 'rotate-180' : ''}`}
                          size={20}
                        />
                      </button>

                      {showAdvancedSettings && (
                        <div className="mt-4 space-y-6">
                          <hr className="border-gray-300 dark:border-gray-600" />

                          {/* Data Management */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Management</h3>
                      <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <button
                          onClick={() => {
                            const dataStr = JSON.stringify(data, null, 2);
                            const blob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `proxbalance-data-${new Date().toISOString()}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Export Cluster Data (JSON)
                        </button>
                        <button
                          onClick={() => {
                            if (!data || !data.guests) return;

                            // Create CSV header
                            let csv = 'VMID,Name,Type,Node,Status,CPU Usage (%),Memory Used (GB),Memory Max (GB),CPU Cores\n';

                            // Add data rows
                            Object.values(data.guests).forEach(guest => {
                              csv += `${guest.vmid},"${guest.name}",${guest.type},${guest.node},${guest.status},${guest.cpu_current.toFixed(2)},${guest.mem_used_gb.toFixed(2)},${guest.mem_max_gb.toFixed(2)},${guest.cpu_cores || 0}\n`;
                            });

                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `proxbalance-guests-${new Date().toISOString()}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Export Guest List (CSV)
                        </button>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Debug & Logging */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Debug & Logging</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Log Level
                          </label>
                          <select
                            value={logLevel}
                            onChange={(e) => setLogLevel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="ERROR">ERROR - Only critical errors</option>
                            <option value="WARN">WARN - Warnings and errors</option>
                            <option value="INFO">INFO - General information</option>
                            <option value="DEBUG">DEBUG - Detailed debugging</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={verboseLogging}
                            onChange={(e) => setVerboseLogging(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Enable Verbose Logging (includes API calls and data processing)
                          </label>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              window.open('/api/logs/download?service=proxmox-balance', '_blank');
                            }}
                            className="w-full px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Download API Logs
                          </button>
                          <button
                            onClick={() => {
                              window.open('/api/logs/download?service=proxmox-collector', '_blank');
                            }}
                            className="w-full px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Download Collector Logs
                          </button>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div id="proxmox-api-config">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proxmox API Configuration</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            API Token ID
                          </label>
                          <input
                            type="text"
                            value={proxmoxTokenId}
                            onChange={(e) => setProxmoxTokenId(e.target.value)}
                            placeholder="proxbalance@pam!proxbalance"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Format: user@realm!tokenname (e.g., proxbalance@pam!proxbalance)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            API Token Secret
                          </label>
                          <input
                            type="password"
                            value={proxmoxTokenSecret}
                            onChange={(e) => setProxmoxTokenSecret(e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            The UUID token secret from Proxmox
                          </p>
                        </div>
                        <button
                          onClick={validateToken}
                          disabled={validatingToken || !proxmoxTokenId || !proxmoxTokenSecret}
                          className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {validatingToken ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              Validating Token...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              Validate Token & Check Permissions
                            </>
                          )}
                        </button>

                        {tokenValidationResult && (
                          <div className={`p-4 rounded border ${
                            tokenValidationResult.success
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}>
                            <div className="flex items-start gap-2">
                              {tokenValidationResult.success ? (
                                <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className={`font-semibold text-sm mb-1 ${
                                  tokenValidationResult.success
                                    ? 'text-green-900 dark:text-green-200'
                                    : 'text-red-900 dark:text-red-200'
                                }`}>
                                  {tokenValidationResult.message}
                                </p>
                                {tokenValidationResult.success && (
                                  <>
                                    {tokenValidationResult.version && (
                                      <p className="text-xs text-green-800 dark:text-green-300 mb-2">
                                        Proxmox VE Version: {tokenValidationResult.version}
                                      </p>
                                    )}
                                    {tokenValidationResult.permissions && tokenValidationResult.permissions.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-semibold text-green-900 dark:text-green-200 mb-1">
                                          Token Permissions:
                                        </p>
                                        <ul className="text-xs text-green-800 dark:text-green-300 space-y-1 ml-4">
                                          {tokenValidationResult.permissions.map((perm, idx) => (
                                            <li key={idx} className="flex items-start gap-1">
                                              <span className="text-green-600 dark:text-green-400">•</span>
                                              <span>{perm}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                          <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>Tip:</strong> Use the installation script to automatically create an API token with proper permissions. Click "Validate Token" after entering credentials to verify connectivity and check permissions.
                          </p>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proxmox Host Configuration</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
                          <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>Current Proxmox Host:</strong> {config?.proxmox_host || 'Not configured'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Proxmox Host IP/Hostname
                          </label>
                          <input
                            type="text"
                            id="proxmoxHostInput"
                            defaultValue={config?.proxmox_host || ''}
                            placeholder="10.0.0.3 or pve-node1"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            IP address or hostname of the Proxmox node to connect to
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newHost = document.getElementById('proxmoxHostInput').value.trim();
                            if (!newHost) {
                              setError('Please enter a valid Proxmox host');
                              return;
                            }

                            // Two-click pattern: first click sets confirm state, second click executes
                            if (confirmHostChange === newHost) {
                              // Second click - execute the change
                              confirmAndChangeHost();
                            } else {
                              // First click - set confirm state
                              setConfirmHostChange(newHost);
                            }
                          }}
                          className={`w-full px-4 py-2 text-white rounded font-medium flex items-center justify-center gap-1.5 ${
                            confirmHostChange
                              ? 'bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600'
                              : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                          }`}
                        >
                          {confirmHostChange ? (<><AlertTriangle size={14} /> Click again to confirm</>) : (<><Server size={14} /> Update Proxmox Host</>)}
                        </button>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Configuration Export/Import */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration Backup & Restore</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Export your configuration for backup or import it on a fresh installation. Automatic backups are created before each import.
                        </p>

                        {/* Export Configuration */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Export Configuration</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Download all settings as a JSON file for backup or migration to another instance.
                          </p>
                          <button
                            onClick={() => {
                              window.location.href = `${API_BASE}/config/export`;
                            }}
                            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Export Configuration
                          </button>
                        </div>

                        {/* Import Configuration */}
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Import Configuration</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Upload a configuration file to restore settings. Your current configuration will be automatically backed up before import.
                          </p>

                          <input
                            type="file"
                            ref={(el) => {
                              if (!window.configFileInput) window.configFileInput = el;
                            }}
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              if (!confirm('Import configuration?\n\nThis will replace all current settings. Your current configuration will be backed up automatically.\n\nAre you sure?')) {
                                e.target.value = '';
                                return;
                              }

                              const formData = new FormData();
                              formData.append('file', file);

                              fetch(`${API_BASE}/config/import`, {
                                method: 'POST',
                                body: formData
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  alert('Configuration imported successfully!\n\n' +
                                        (result.validation_warnings?.length > 0
                                          ? 'Warnings:\n' + result.validation_warnings.join('\n')
                                          : 'Services will restart automatically.'));
                                  // Reload page to reflect new configuration
                                  setTimeout(() => window.location.reload(), 2000);
                                } else {
                                  let errorMsg = 'Failed to import configuration:\n' + result.error;
                                  if (result.validation_errors?.length > 0) {
                                    errorMsg += '\n\nValidation Errors:\n' + result.validation_errors.join('\n');
                                  }
                                  if (result.validation_warnings?.length > 0) {
                                    errorMsg += '\n\nWarnings:\n' + result.validation_warnings.join('\n');
                                  }
                                  alert(errorMsg);
                                }
                              })
                              .catch(error => {
                                alert('Error importing configuration: ' + error.message);
                              })
                              .finally(() => {
                                e.target.value = '';
                              });
                            }}
                          />

                          <button
                            onClick={() => window.configFileInput?.click()}
                            className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Upload size={16} />
                            Import Configuration
                          </button>
                        </div>

                        {/* Manual Backup */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Create Backup</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Create a manual backup of your current configuration. Last 5 backups are kept automatically.
                          </p>
                          <button
                            onClick={() => {
                              fetch(`${API_BASE}/config/backup`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  alert('Backup created successfully!\n\nFile: ' + result.backup_file);
                                } else {
                                  alert('Failed to create backup: ' + result.error);
                                }
                              })
                              .catch(error => {
                                alert('Error creating backup: ' + error.message);
                              });
                            }}
                            className="w-full px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Save size={16} />
                            Create Backup Now
                          </button>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 italic p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                          <strong>Note:</strong> Backups are stored in /opt/proxmox-balance-manager/backups/ and rotated automatically (last 5 kept).
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Management</h3>
                      <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <button
                          onClick={() => {
                            if (confirm('Restart ProxBalance API service?\n\nThis will briefly interrupt data collection.')) {
                              fetch(`${API_BASE}/system/restart-service`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'proxmox-balance' })
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  // Service restarted successfully - no popup needed
                                } else {
                                  setError('Failed to restart service: ' + (result.error || 'Unknown error'));
                                }
                              })
                              .catch(error => setError('Error: ' + error.message));
                            }
                          }}
                          className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={16} />
                          Restart API Service
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Restart Data Collector service?\n\nThis will restart the background data collection process.')) {
                              fetch(`${API_BASE}/system/restart-service`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'proxmox-collector' })
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  // Service restarted successfully - no popup needed
                                } else {
                                  setError('Failed to restart service: ' + (result.error || 'Unknown error'));
                                }
                              })
                              .catch(error => setError('Error: ' + error.message));
                            }
                          }}
                          className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={16} />
                          Restart Collector Service
                        </button>
                      </div>
                    </div>
                        </div>
                      )}
                    </div>

                    {/* Save Button - Sticky at bottom */}
                    <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg">
                      <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                      >
                        <Save size={18} />
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
  );
}
