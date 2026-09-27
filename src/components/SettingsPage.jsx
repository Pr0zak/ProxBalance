import { Cpu, HardDrive, Bell, Server, Settings } from './Icons.jsx';
import { GLASS_CARD, INPUT_FIELD, statusBadge } from '../utils/designTokens.js';
import { parseTimestamp, formatRelativeTime } from '../utils/formatters.js';

import AIProviderSection from './settings/AIProviderSection.jsx';
import DataCollectionSection from './settings/DataCollectionSection.jsx';
import NotificationsSection from './settings/NotificationsSection.jsx';
import AdvancedSystemSettings from './settings/AdvancedSystemSettings.jsx';
import SectionHeader from './SectionHeader.jsx';
import { UnsavedContext, useUnsavedRegistry, UnsavedBar, countChanges, useBeforeUnload } from './UnsavedChanges.jsx';

const { useState, useEffect, useRef } = React;

const DOT = { green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500', gray: 'bg-slate-400 dark:bg-slate-500' };
const AI_LABELS = { openai: 'OpenAI', anthropic: 'Anthropic', local: 'Ollama' };
// Notification events and whether each is on when the key is absent.
const NOTIF_EVENTS = {
  on_start: true, on_complete: true, on_action: true, on_failure: true, on_node_status: true,
  on_evacuation: true, on_update_available: true,
  on_resource_threshold: false, on_recommendations: false, on_collector_status: false,
};
const CONNECTION_KEYS = ['proxmox_api_token_id', 'proxmox_api_token_secret'];
const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj?.[k]]));
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !keys.includes(k)));

/** One-line live state for each section, shown under its name in the nav. */
function sectionStatus({ config, data, backendCollected, automationConfig, aiEnabled, aiProvider, systemInfo, proxmoxTokenId, aiModel }) {
  const out = {};

  const health = data?.cluster_health;
  if (!proxmoxTokenId) out.connection = { tone: 'amber', text: 'No API token set' };
  else if (!health) out.connection = { tone: 'gray', text: config?.proxmox_host || 'Not connected yet' };
  else {
    const allUp = health.online_nodes === health.nodes;
    out.connection = {
      tone: allUp ? 'green' : 'red',
      text: `${config?.proxmox_host || 'host'} · ${health.online_nodes}/${health.nodes} nodes online`,
    };
  }

  const interval = config?.collection_interval_minutes;
  const last = parseTimestamp(backendCollected || data?.collected_at);
  if (!last) out.collection = { tone: 'gray', text: interval ? `Every ${interval} min · never run` : 'Never run' };
  else {
    const ageMin = (Date.now() - last) / 60000;
    // Stale once two runs in a row were missed (plus a little slack).
    const stale = interval && ageMin > interval * 2 + 5;
    const rel = formatRelativeTime(last.toISOString()).replace('Just now', 'just now');
    out.collection = {
      tone: stale ? 'amber' : 'green',
      text: `${interval ? `Every ${interval} min · ` : ''}${rel}${stale ? ' · overdue' : ''}`,
    };
  }

  const n = automationConfig?.notifications;
  if (!n?.enabled) out.notifications = { tone: 'gray', text: 'Off' };
  else {
    const channels = Object.entries(n.providers || {}).filter(([, p]) => p?.enabled).map(([k]) => k);
    const events = Object.entries(NOTIF_EVENTS).filter(([k, dflt]) => (dflt ? n[k] !== false : n[k] === true)).length;
    const name = (k) => ({ email: 'Email', webhook: 'Webhook' }[k] || k.charAt(0).toUpperCase() + k.slice(1));
    out.notifications = channels.length
      ? { tone: 'green', text: `${channels.length === 1 ? name(channels[0]) : `${channels.length} channels`} · ${events} event${events !== 1 ? 's' : ''}` }
      : { tone: 'amber', text: 'On, but no channel enabled' };
  }

  out.ai = aiEnabled && aiProvider && aiProvider !== 'none'
    ? { tone: 'green', text: [AI_LABELS[aiProvider] || aiProvider, aiModel].filter(Boolean).join(' · ') }
    : { tone: 'gray', text: 'Off' };

  if (systemInfo?.version) {
    out.system = systemInfo.updates_available
      ? { tone: 'amber', text: `${systemInfo.version} · update available` }
      : { tone: 'green', text: `${systemInfo.version}${systemInfo.branch ? ` · ${systemInfo.branch}` : ''}` };
  }
  return out;
}

const SECTIONS = [
  { id: 'connection', label: 'Connection', icon: Server, accent: ['cyan', 'blue'], blurb: 'Proxmox API token and host' },
  { id: 'collection', label: 'Collection', icon: HardDrive, accent: ['emerald', 'green'], blurb: 'How often and how much data is gathered' },
  { id: 'notifications', label: 'Notifications', icon: Bell, accent: ['amber', 'orange'], blurb: 'Where alerts go and which events send them' },
  { id: 'ai', label: 'AI', icon: Cpu, accent: ['purple', 'pink'], blurb: 'Optional LLM review of suggestions' },
  { id: 'system', label: 'System', icon: Settings, accent: ['indigo', 'violet'], blurb: 'Export, backup and restore, service restarts' },
];

export default function SettingsPage(props) {
  const {
    config,
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
    getAiSettingsPayload, resetAiFromConfig,
    tempUiInterval, setTempUiInterval,
    backendCollected,
    loading,
    data,
    automationConfig,
    proxmoxTokenId, setProxmoxTokenId,
    proxmoxTokenSecret, setProxmoxTokenSecret,
    validatingToken,
    tokenValidationResult,
    confirmHostChange, setConfirmHostChange,
    error, setError,
    handleRefresh,
    fetchConfig,
    saveSettings,
    saveAutomationConfig,
    validateToken,
    confirmAndChangeHost,
    routeTab, onRouteTab,
    setNavGuard,
    systemInfo,
  } = props;

  const active = SECTIONS.some(s => s.id === routeTab) ? routeTab : 'connection';
  const section = SECTIONS.find(s => s.id === active);

  const registry = useUnsavedRegistry();
  const { register, unregister } = registry.context;

  // ── General settings (Proxmox token, AI, dashboard refresh) ───────────────
  // These live in root hooks; compare against a snapshot taken once the
  // config has been loaded into them.
  const generalNow = {
    proxmox_api_token_id: proxmoxTokenId,
    proxmox_api_token_secret: proxmoxTokenSecret,
    ui_refresh_interval_minutes: tempUiInterval,
    ...getAiSettingsPayload(),
  };
  const generalNowRef = useRef(generalNow);
  generalNowRef.current = generalNow;
  const [generalBaseline, setGeneralBaseline] = useState(null);
  const generalCount = generalBaseline ? countChanges(generalNow, generalBaseline) : 0;
  const generalCountRef = useRef(0);
  generalCountRef.current = generalCount;
  useEffect(() => {
    if (!config) return;
    // Root hooks are initialised from config right after it loads; read them next
    // tick. A reload while edits are pending must not bless those edits as saved.
    const t = setTimeout(() => {
      if (generalCountRef.current === 0) setGeneralBaseline(generalNowRef.current);
    }, 0);
    return () => clearTimeout(t);
  }, [config]);
  const discardGeneral = () => {
    if (!config) return;
    resetAiFromConfig(config);
    setProxmoxTokenId(config.proxmox_api_token_id || '');
    setProxmoxTokenSecret(config.proxmox_api_token_secret || '');
    setTempUiInterval(config.ui_refresh_interval_minutes || 60);
  };
  useEffect(() => {
    register('general', generalCount, async () => {
      const ok = await saveSettings();
      if (ok) setGeneralBaseline(generalNowRef.current);
    }, discardGeneral, -1); // before Collection, whose save reloads config
  });

  // ── Notifications (part of the automation config) ─────────────────────────
  const [notifDraft, setNotifDraft] = useState(null);
  const liveNotifications = automationConfig?.notifications || {};
  const notifications = notifDraft ?? liveNotifications;
  const stageNotifications = (updates) => {
    if (updates.notifications) setNotifDraft(updates.notifications);
  };
  const notifCount = notifDraft ? countChanges(notifDraft, liveNotifications) : 0;
  useEffect(() => {
    register('notifications', notifCount, async () => {
      const ok = await saveAutomationConfig({ notifications: notifDraft });
      if (ok !== false) setNotifDraft(null);
    }, () => setNotifDraft(null));
  });

  useEffect(() => () => ['general', 'notifications'].forEach(unregister), []);

  // Leaving the page drops local drafts; put root-hook edits back as well.
  const discardGeneralRef = useRef(discardGeneral);
  discardGeneralRef.current = discardGeneral;
  useEffect(() => () => { if (generalCountRef.current) discardGeneralRef.current(); }, []);

  useBeforeUnload(registry.total > 0);
  useEffect(() => {
    if (!setNavGuard) return;
    setNavGuard(registry.total > 0
      ? () => window.confirm(`Discard ${registry.total} unsaved change${registry.total !== 1 ? 's' : ''} in Settings?`)
      : null);
    return () => setNavGuard(null);
  }, [registry.total]);

  const draftAutomationConfig = automationConfig ? { ...automationConfig, notifications } : automationConfig;

  // Where the pending edits are, so the nav can point at them.
  const unsavedBySection = generalBaseline ? {
    connection: countChanges(pick(generalNow, CONNECTION_KEYS), pick(generalBaseline, CONNECTION_KEYS)),
    collection: (registry.counts.collection || 0) + countChanges(generalNow.ui_refresh_interval_minutes, generalBaseline.ui_refresh_interval_minutes),
    notifications: notifCount,
    ai: countChanges(omit(generalNow, [...CONNECTION_KEYS, 'ui_refresh_interval_minutes']), omit(generalBaseline, [...CONNECTION_KEYS, 'ui_refresh_interval_minutes'])),
  } : { collection: registry.counts.collection || 0, notifications: notifCount };

  const aiModel = { openai: openaiModel, anthropic: anthropicModel, local: localModel }[aiProvider];
  // Phones show the nav as a scrolling row; keep the active pill in view.
  const navRef = useRef(null);
  useEffect(() => {
    const row = navRef.current;
    const el = row?.querySelector('[data-active="true"]');
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    const offset = el.getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollLeft += offset - (row.clientWidth - el.offsetWidth) / 2;
  }, [active]);

  const status = sectionStatus({
    config, data, backendCollected, automationConfig: draftAutomationConfig,
    aiEnabled, aiProvider, aiModel, systemInfo, proxmoxTokenId,
  });

  return (
    <UnsavedContext.Provider value={registry.context}>
    <div className="pb-20 sm:pb-0">
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Section nav: vertical on desktop, scrolling pills on phones */}
          <nav className="md:w-64 shrink-0">
            <div ref={navRef} className="flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-20">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const isActive = s.id === active;
                const st = status[s.id];
                const pending = unsavedBySection[s.id] || 0;
                return (
                  <button
                    key={s.id}
                    data-active={isActive}
                    onClick={() => onRouteTab?.(s.id)}
                    title={st ? `${s.label}: ${st.text}` : s.label}
                    className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap text-left transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-pb-text2 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-pb-text dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        {s.label}
                        {st && <span className={`md:hidden w-1.5 h-1.5 rounded-full ${DOT[st.tone]}`} />}
                        {pending > 0 && (
                          <span className={`${statusBadge('yellow')} ml-auto !px-1.5 !py-0 text-[10px]`} title={`${pending} unsaved change${pending !== 1 ? 's' : ''} here`}>
                            {pending}<span className="hidden md:inline">unsaved</span>
                          </span>
                        )}
                      </span>
                      {st && (
                        <span className={`hidden md:flex items-center gap-1.5 mt-0.5 text-xs font-normal truncate ${isActive ? 'text-blue-100' : 'text-pb-text3 dark:text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[st.tone]}`} />
                          <span className="truncate">{st.text}</span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            <div className={GLASS_CARD}>
              <SectionHeader title={section.label} icon={section.icon} accent={section.accent} />
              <p className="text-sm text-pb-text2 dark:text-gray-400 -mt-2 mb-5">{section.blurb}</p>

              {/* Every section stays mounted so drafts survive switching sections */}
              <div hidden={active !== 'connection'}>
                <AdvancedSystemSettings
                  part="connection"
                  data={data} config={config}
                  proxmoxTokenId={proxmoxTokenId} setProxmoxTokenId={setProxmoxTokenId}
                  proxmoxTokenSecret={proxmoxTokenSecret} setProxmoxTokenSecret={setProxmoxTokenSecret}
                  validatingToken={validatingToken} tokenValidationResult={tokenValidationResult}
                  confirmHostChange={confirmHostChange} setConfirmHostChange={setConfirmHostChange}
                  validateToken={validateToken} confirmAndChangeHost={confirmAndChangeHost}
                  error={error} setError={setError}
                />
              </div>

              <div hidden={active !== 'collection'} className="space-y-6">
                <DataCollectionSection
                  backendCollected={backendCollected}
                  loading={loading}
                  data={data}
                  config={config}
                  handleRefresh={handleRefresh}
                  fetchConfig={fetchConfig}
                  setError={setError}
                />
                <div>
                  <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">Dashboard auto-refresh (minutes)</label>
                  <input
                    type="number" min="1" max="1440"
                    value={tempUiInterval}
                    onChange={(e) => setTempUiInterval(parseInt(e.target.value, 10) || 1)}
                    className={INPUT_FIELD}
                  />
                  <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">How often this page re-runs the full cluster analysis in the browser</p>
                </div>
              </div>

              <div hidden={active !== 'notifications'}>
                {draftAutomationConfig && (
                  <NotificationsSection
                    automationConfig={draftAutomationConfig}
                    saveAutomationConfig={stageNotifications}
                    testDisabledReason={notifCount ? 'Save your notification changes first — the test uses the saved settings.' : null}
                  />
                )}
              </div>

              <div hidden={active !== 'ai'}>
                <AIProviderSection
                  aiEnabled={aiEnabled} setAiEnabled={setAiEnabled}
                  aiProvider={aiProvider} setAiProvider={setAiProvider}
                  openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
                  openaiModel={openaiModel} setOpenaiModel={setOpenaiModel}
                  anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey}
                  anthropicModel={anthropicModel} setAnthropicModel={setAnthropicModel}
                  localUrl={localUrl} setLocalUrl={setLocalUrl}
                  localModel={localModel} setLocalModel={setLocalModel}
                  localLoadingModels={localLoadingModels} setLocalLoadingModels={setLocalLoadingModels}
                  localAvailableModels={localAvailableModels} setLocalAvailableModels={setLocalAvailableModels}
                  setError={setError}
                />
              </div>

              <div hidden={active !== 'system'}>
                <AdvancedSystemSettings part="system" data={data} config={config} error={error} setError={setError} />
              </div>
            </div>

            <UnsavedBar total={registry.total} saving={registry.saving} onSave={registry.saveAll} onDiscard={registry.discardAll} />
          </div>
        </div>
      </div>
    </div>
    </UnsavedContext.Provider>
  );
}
