import {
  ChevronDown, Save, CheckCircle, AlertCircle, AlertTriangle,
  RefreshCw, Download, Upload, Server
} from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';
const { useState } = React;

export default function AdvancedSystemSettings({
  showAdvancedSettings, setShowAdvancedSettings,
  data, config,
  logLevel, setLogLevel, verboseLogging, setVerboseLogging,
  proxmoxTokenId, setProxmoxTokenId, proxmoxTokenSecret, setProxmoxTokenSecret,
  validatingToken, tokenValidationResult,
  confirmHostChange, setConfirmHostChange,
  validateToken, confirmAndChangeHost,
  error, setError
}) {
  return (<>
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
  </>);
}
