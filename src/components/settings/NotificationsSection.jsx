import { Bell, CheckCircle, AlertTriangle, ChevronDown, Save, RefreshCw, HelpCircle } from '../Icons.jsx';

const API_BASE = `/api`;
const { useState } = React;

export default function NotificationsSection({
  automationConfig, saveAutomationConfig
}) {
  return (<>
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
  </>);
}
