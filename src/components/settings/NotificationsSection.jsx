import {
  Bell, CheckCircle, AlertCircle, AlertTriangle, RefreshCw
} from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import { API_BASE } from '../../utils/constants.js';
import { INPUT_FIELD, SELECT_FIELD, ICON, BTN_PRIMARY, BTN_SECONDARY, statusBadge } from '../../utils/designTokens.js';
import TextField from '../TextField.jsx';
const { useState, useEffect } = React;

const timeOf = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const SUMMARY_TONE = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

/**
 * One channel's state. `ready` comes from the server's validate_config() on
 * the saved settings ({ ready, reason }); `result` is this channel's last test.
 */
function ChannelStatus({ conf, ready, result, dirty }) {
  if (!conf?.enabled) return null;
  if (result?.skipped || (!dirty && ready && ready.ready === false)) {
    const reason = result?.skipped ? result.reason : ready.reason;
    return (
      <span className={`${statusBadge('yellow')} max-w-full sm:max-w-md !rounded-lg`} title="ProxBalance skips a channel whose settings are incomplete, so it gets no alerts and no test messages">
        <AlertTriangle size={12} className="shrink-0" /> <span className="min-w-0 [overflow-wrap:anywhere] sm:truncate">{reason || 'Incomplete settings'} · skipped</span>
      </span>
    );
  }
  if (result?.success) return <span className={statusBadge('green')}><CheckCircle size={12} /> Test sent · {timeOf(result.at)}</span>;
  if (result) {
    return (
      <span className={`${statusBadge('red')} max-w-full sm:max-w-md !rounded-lg`} title={result.error}>
        <AlertCircle size={12} className="shrink-0" /> <span className="min-w-0 [overflow-wrap:anywhere] sm:truncate">Failed: {result.error || 'unknown error'}</span>
      </span>
    );
  }
  if (dirty) return <span className={statusBadge('gray')}>Save to test</span>;
  return <span className={statusBadge('gray')}>Not tested yet</span>;
}

export default function NotificationsSection({ automationConfig, saveAutomationConfig, collapsedSections, setCollapsedSections, testDisabledReason }) {
  const [tests, setTests] = useState({});        // channel -> { success, error, skipped, reason, at }
  const [readiness, setReadiness] = useState({}); // channel -> { ready, reason } for the saved settings
  const [testing, setTesting] = useState(null);   // channel name, 'all', or null
  const [summary, setSummary] = useState(null);   // last "test all": { text, tone, at, perChannel }
  const providers = automationConfig.notifications?.providers || {};
  const enabledChannels = Object.keys(providers).filter(k => providers[k]?.enabled);
  const dirty = !!testDisabledReason;

  // Ask the server which enabled channels it would skip, and why. Only when
  // there are no pending edits: the check runs against the saved settings.
  const savedKey = dirty ? null : JSON.stringify([automationConfig.notifications?.enabled, providers]);
  useEffect(() => {
    if (savedKey == null) return undefined;
    let cancelled = false;
    fetch(`${API_BASE}/notifications/providers`)
      .then(r => r.json())
      .then(body => { if (!cancelled && body?.channels) setReadiness(body.channels); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [savedKey]);

  // Test one channel, or every enabled one. Results land on each channel row.
  const runTest = async (channel) => {
    setTesting(channel || 'all');
    if (!channel) setSummary(null);
    const at = new Date();
    const fail = (error) => {
      if (channel) setTests(prev => ({ ...prev, [channel]: { success: false, error, at } }));
      else setSummary({ text: error, tone: 'error', at, perChannel: false });
    };
    try {
      const response = await fetch(`${API_BASE}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel ? { provider: channel } : {}),
      });
      const result = await response.json().catch(() => ({}));
      if (!result.results) {
        fail(result.error || `The test could not be sent (HTTP ${response.status})`);
        return;
      }
      const skipped = result.skipped || {};
      setTests(prev => {
        const next = { ...prev };
        for (const [k, r] of Object.entries(result.results)) next[k] = { ...r, at };
        for (const [k, reason] of Object.entries(skipped)) next[k] = { skipped: true, reason, at };
        return next;
      });
      if (Object.keys(skipped).length) {
        setReadiness(prev => {
          const next = { ...prev };
          for (const [k, reason] of Object.entries(skipped)) next[k] = { ready: false, reason };
          return next;
        });
      }
      if (!channel) {
        const failed = Object.values(result.results).some(r => !r.success);
        setSummary({
          text: result.message || (result.success ? 'All sent' : 'Some channels need attention'),
          tone: failed ? 'error' : Object.keys(skipped).length ? 'warn' : 'ok',
          at,
          perChannel: true,
        });
      }
    } catch (err) {
      fail(`The test could not be sent: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const testButton = (channel) => providers[channel]?.enabled ? (
    <button
      onClick={(e) => { e.stopPropagation(); runTest(channel); }}
      disabled={!!testing || dirty || readiness[channel]?.ready === false}
      title={testDisabledReason || (readiness[channel]?.ready === false ? readiness[channel].reason : 'Send a test message to this channel only')}
      className={`${BTN_SECONDARY} !px-2.5 !py-1 !gap-1.5 text-xs`}
    >
      {testing === channel ? <RefreshCw size={12} className="animate-spin" /> : <Bell size={12} />}
      Test
    </button>
  ) : null;

  const status = (channel) => (
    <ChannelStatus conf={providers[channel]} ready={readiness[channel]} result={tests[channel]} dirty={dirty} />
  );

  return (
                    <div>
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-y-3">
                        <p className="text-sm text-pb-text2 dark:text-gray-400">Get notified about migrations, maintenance events, and cluster alerts</p>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox"
                            checked={automationConfig.notifications?.enabled || false}
                            onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, enabled: e.target.checked } })}
                            className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {automationConfig.notifications?.enabled && (
                      <div className="space-y-4 mt-4">
                        {/* Migration Events */}
                        <div className="p-3 bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600">
                          <div className="font-medium text-pb-text dark:text-gray-300 mb-2">Migration Events</div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_start !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_start: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Run started
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_complete !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_complete: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Run completed
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_action !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_action: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Each migration
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={automationConfig.notifications?.on_failure !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_failure: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Safety check failure
                            </label>
                          </div>
                          {/* Sub-filter: success/failure for individual migrations */}
                          {automationConfig.notifications?.on_action !== false && (
                            <div className="mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1">
                              <label className="flex items-center gap-2 text-xs text-pb-text2 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={automationConfig.notifications?.on_action_success !== false}
                                  onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_action_success: e.target.checked } })}
                                  className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                                Successful migrations
                              </label>
                              <label className="flex items-center gap-2 text-xs text-pb-text2 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={automationConfig.notifications?.on_action_failure !== false}
                                  onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_action_failure: e.target.checked } })}
                                  className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                                Failed migrations
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Cluster Events */}
                        <div className="p-3 bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600">
                          <div className="font-medium text-pb-text dark:text-gray-300 mb-2">Cluster Events</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer" title="Alert when a node goes offline or comes back online">
                              <input type="checkbox" checked={automationConfig.notifications?.on_node_status !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_node_status: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Node status changes
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer" title="Alert when CPU or memory exceeds safety thresholds">
                              <input type="checkbox" checked={automationConfig.notifications?.on_resource_threshold === true}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_resource_threshold: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Resource threshold breach
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer" title="Alert when node evacuation starts or completes">
                              <input type="checkbox" checked={automationConfig.notifications?.on_evacuation !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_evacuation: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Evacuation events
                            </label>
                          </div>
                        </div>

                        {/* System Events */}
                        <div className="p-3 bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600">
                          <div className="font-medium text-pb-text dark:text-gray-300 mb-2">System Events</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer" title="Alert when new migration recommendations are generated">
                              <input type="checkbox" checked={automationConfig.notifications?.on_recommendations === true}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_recommendations: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              New recommendations
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer" title="Alert when data collection succeeds or fails">
                              <input type="checkbox" checked={automationConfig.notifications?.on_collector_status === true}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_collector_status: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Collector status
                            </label>
                            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300 cursor-pointer" title="Alert when a new ProxBalance version is available">
                              <input type="checkbox" checked={automationConfig.notifications?.on_update_available !== false}
                                onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_update_available: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              Update available
                            </label>
                          </div>
                        </div>

                        {/* Pushover */}
                        <div className="bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600 overflow-hidden hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-pushover'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span className="font-medium text-pb-text dark:text-gray-300">Pushover</span>
                              {status('pushover')}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {testButton('pushover')}
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.pushover?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.pushover = { ...(providers.pushover || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                            </div>
                          </div>
                          <div id="settings-notif-pushover" className="hidden p-3 pt-0 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">API Token</label>
                                <TextField type="password" placeholder="Application API token"
                                  value={automationConfig.notifications?.providers?.pushover?.api_token || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), api_token: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">User Key</label>
                                <TextField type="password" placeholder="Your user/group key"
                                  value={automationConfig.notifications?.providers?.pushover?.user_key || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), user_key: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Priority</label>
                                <select value={automationConfig.notifications?.providers?.pushover?.priority ?? 0}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), priority: parseInt(e.target.value) };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={`${SELECT_FIELD} w-full`}>
                                  <option value={-1}>Low</option>
                                  <option value={0}>Normal</option>
                                  <option value={1}>High</option>
                                  <option value={2}>Emergency</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Sound</label>
                                <select value={automationConfig.notifications?.providers?.pushover?.sound || 'pushover'}
                                  onChange={(e) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.pushover = { ...(providers.pushover || {}), sound: e.target.value };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={`${SELECT_FIELD} w-full`}>
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
                            <p className="text-xs text-pb-text2 dark:text-gray-400">Get your API token and user key from <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">pushover.net</a></p>
                          </div>
                        </div>

                        {/* Email (SMTP) */}
                        <div className="bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600 overflow-hidden hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-email'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span className="font-medium text-pb-text dark:text-gray-300">Email (SMTP)</span>
                              {status('email')}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {testButton('email')}
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.email?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.email = { ...(providers.email || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                            </div>
                          </div>
                          <div id="settings-notif-email" className="hidden p-3 pt-0 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">SMTP Host</label>
                                <TextField type="text" placeholder="smtp.gmail.com"
                                  value={automationConfig.notifications?.providers?.email?.smtp_host || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_host: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">SMTP Port</label>
                                <NumberField min="1" max="65535"
                                  value={automationConfig.notifications?.providers?.email?.smtp_port || 587}
                                  onCommit={(val) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_port: val };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Username</label>
                                <TextField type="text" placeholder="user@example.com"
                                  value={automationConfig.notifications?.providers?.email?.smtp_username || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_username: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Password</label>
                                <TextField type="password" placeholder="App password"
                                  value={automationConfig.notifications?.providers?.email?.smtp_password || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), smtp_password: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">From Address</label>
                                <TextField type="email" placeholder="proxbalance@example.com"
                                  value={automationConfig.notifications?.providers?.email?.from_address || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), from_address: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">To Addresses</label>
                                <TextField type="text" placeholder="admin@example.com, ops@example.com"
                                  value={Array.isArray(automationConfig.notifications?.providers?.email?.to_addresses) ? automationConfig.notifications.providers.email.to_addresses.join(', ') : (automationConfig.notifications?.providers?.email?.to_addresses || '')}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.email = { ...(providers.email || {}), to_addresses: v.split(',').map(a => a.trim()).filter(a => a) };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-pb-text dark:text-gray-300 cursor-pointer">
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
                        <div className="bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600 overflow-hidden hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-telegram'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span className="font-medium text-pb-text dark:text-gray-300">Telegram</span>
                              {status('telegram')}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {testButton('telegram')}
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.telegram?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.telegram = { ...(providers.telegram || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                            </div>
                          </div>
                          <div id="settings-notif-telegram" className="hidden p-3 pt-0 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Bot Token</label>
                                <TextField type="password" placeholder="123456:ABC-DEF..."
                                  value={automationConfig.notifications?.providers?.telegram?.bot_token || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.telegram = { ...(providers.telegram || {}), bot_token: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Chat ID</label>
                                <TextField type="text" placeholder="-1001234567890"
                                  value={automationConfig.notifications?.providers?.telegram?.chat_id || ''}
                                  onCommit={(v) => {
                                    const providers = { ...(automationConfig.notifications?.providers || {}) };
                                    providers.telegram = { ...(providers.telegram || {}), chat_id: v };
                                    saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                  }}
                                  className={INPUT_FIELD} />
                              </div>
                            </div>
                            <p className="text-xs text-pb-text2 dark:text-gray-400">Create a bot via <span className="font-mono">@BotFather</span> on Telegram and add it to your group/channel</p>
                          </div>
                        </div>

                        {/* Discord */}
                        <div className="bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600 overflow-hidden hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-discord'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span className="font-medium text-pb-text dark:text-gray-300">Discord</span>
                              {status('discord')}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {testButton('discord')}
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.discord?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.discord = { ...(providers.discord || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                            </div>
                          </div>
                          <div id="settings-notif-discord" className="hidden p-3 pt-0 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Webhook URL</label>
                              <TextField type="url" placeholder="https://discord.com/api/webhooks/..."
                                value={automationConfig.notifications?.providers?.discord?.webhook_url || ''}
                                onCommit={(v) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.discord = { ...(providers.discord || {}), webhook_url: v };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className={INPUT_FIELD} />
                            </div>
                            <p className="text-xs text-pb-text2 dark:text-gray-400">Server Settings &gt; Integrations &gt; Webhooks &gt; New Webhook</p>
                          </div>
                        </div>

                        {/* Slack */}
                        <div className="bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600 overflow-hidden hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-slack'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span className="font-medium text-pb-text dark:text-gray-300">Slack</span>
                              {status('slack')}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {testButton('slack')}
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.slack?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.slack = { ...(providers.slack || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                            </div>
                          </div>
                          <div id="settings-notif-slack" className="hidden p-3 pt-0 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Webhook URL</label>
                              <TextField type="url" placeholder="https://hooks.slack.com/services/T.../B.../..."
                                value={automationConfig.notifications?.providers?.slack?.webhook_url || ''}
                                onCommit={(v) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.slack = { ...(providers.slack || {}), webhook_url: v };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className={INPUT_FIELD} />
                            </div>
                            <p className="text-xs text-pb-text2 dark:text-gray-400">Create an Incoming Webhook in your Slack workspace settings</p>
                          </div>
                        </div>

                        {/* Generic Webhook */}
                        <div className="bg-pb-surface2 dark:bg-gray-800/50 rounded border border-pb-border dark:border-slate-600 overflow-hidden hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between gap-3 p-3 cursor-pointer"
                            onClick={() => { const el = document.getElementById('settings-notif-webhook'); if (el) el.classList.toggle('hidden'); }}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span className="font-medium text-pb-text dark:text-gray-300">Generic Webhook</span>
                              {status('webhook')}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {testButton('webhook')}
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={automationConfig.notifications?.providers?.webhook?.enabled || false}
                                onChange={(e) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.webhook = { ...(providers.webhook || {}), enabled: e.target.checked };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-pb-border dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                            </div>
                          </div>
                          <div id="settings-notif-webhook" className="hidden p-3 pt-0 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Webhook URL</label>
                              <TextField type="url" placeholder="https://your-server.com/webhook"
                                value={automationConfig.notifications?.providers?.webhook?.url || ''}
                                onCommit={(v) => {
                                  const providers = { ...(automationConfig.notifications?.providers || {}) };
                                  providers.webhook = { ...(providers.webhook || {}), url: v };
                                  saveAutomationConfig({ notifications: { ...automationConfig.notifications, providers } });
                                }}
                                className={INPUT_FIELD} />
                            </div>
                            <p className="text-xs text-pb-text2 dark:text-gray-400">Sends a JSON POST with title, message, priority, and timestamp</p>
                          </div>
                        </div>

                        {/* Test all enabled channels */}
                        <div className="pt-2 flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => runTest(null)}
                            disabled={!!testing || dirty || enabledChannels.length === 0}
                            title={testDisabledReason || (enabledChannels.length === 0 ? 'Enable a channel first' : '')}
                            className={BTN_PRIMARY}
                          >
                            {testing === 'all' ? <RefreshCw size={14} className="animate-spin" /> : <Bell size={14} />}
                            Test all enabled channels
                          </button>
                          {summary && (
                            <span className={`text-sm flex items-center gap-1.5 ${SUMMARY_TONE[summary.tone]}`} role="status">
                              {summary.tone === 'ok' ? <CheckCircle size={14} className="shrink-0" /> : summary.tone === 'warn' ? <AlertTriangle size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                              <span>
                                <span className="font-medium">{summary.text}</span>
                                <span className="text-pb-text2 dark:text-gray-400"> · {timeOf(summary.at)}{summary.perChannel ? ' · details on each channel' : ''}</span>
                              </span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-pb-text2 dark:text-gray-400 -mt-2">
                          {testDisabledReason || 'Tests use the saved settings. Each channel shows whether its test went through.'}
                        </p>
                      </div>
                      )}
                    </div>
  );
}
