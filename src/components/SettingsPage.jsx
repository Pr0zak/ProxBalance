import {
  Lock, Save, Cpu, HardDrive, Bell, Settings
} from './Icons.jsx';
import { GLASS_CARD } from '../utils/designTokens.js';

import AIProviderSection from './settings/AIProviderSection.jsx';
import DataCollectionSection from './settings/DataCollectionSection.jsx';
import NotificationsSection from './settings/NotificationsSection.jsx';
import AdvancedSystemSettings from './settings/AdvancedSystemSettings.jsx';
import SectionHeader from './SectionHeader.jsx';

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
    backendCollected,
    loading,
    data,
    automationConfig,
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
  } = props;

  return (
    <div className="pb-20 sm:pb-0">
      <div className="max-w-screen-2xl mx-auto p-4">
        {/* Settings Content */}
        <div className={`${GLASS_CARD} space-y-8`}>

          <div>
            <SectionHeader title="AI Provider" icon={Cpu} accent={['blue', 'cyan']} />
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
            />
          </div>

          <hr className="border-pb-border dark:border-slate-600" />

          <div>
            <SectionHeader title="Data Collection & Performance" icon={HardDrive} accent={['emerald', 'green']} />
            <DataCollectionSection
              backendCollected={backendCollected}
              loading={loading}
              data={data}
              config={config}
              handleRefresh={handleRefresh}
              fetchConfig={fetchConfig}
            />
          </div>

          <hr className="border-pb-border dark:border-slate-600" />

          <div>
            <SectionHeader title="Notifications" icon={Bell} accent={['amber', 'orange']} />
            <NotificationsSection
              automationConfig={automationConfig}
              saveAutomationConfig={saveAutomationConfig}
            />
          </div>

          <hr className="border-pb-border dark:border-slate-600" />

          {/* Authentication - Coming Soon */}
          <div className="relative border-2 border-pb-border dark:border-slate-600 rounded-lg p-6 bg-pb-surface2/60 dark:bg-slate-700/30 opacity-60 cursor-not-allowed">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow">
                COMING SOON
              </span>
            </div>
            <SectionHeader title="Authentication" icon={Lock} accent={['slate', 'gray']} />
            <p className="text-sm text-pb-text2 dark:text-gray-400 mb-4">
              Protect access to ProxBalance with user authentication. Configure login credentials, session management, and access control.
            </p>
            <div className="space-y-3 pointer-events-none">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded border border-pb-border dark:border-slate-600">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                  <Lock size={20} className="text-pb-text2 dark:text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-pb-text2 dark:text-gray-400">Dashboard Login</div>
                  <div className="text-xs text-pb-text2 dark:text-gray-500">Username and password protection</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded border border-pb-border dark:border-slate-600">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                  <Lock size={20} className="text-pb-text2 dark:text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-pb-text2 dark:text-gray-400">API Token Authentication</div>
                  <div className="text-xs text-pb-text2 dark:text-gray-500">Secure API access with bearer tokens</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded border border-pb-border dark:border-slate-600">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                  <Lock size={20} className="text-pb-text2 dark:text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-pb-text2 dark:text-gray-400">Session Management</div>
                  <div className="text-xs text-pb-text2 dark:text-gray-500">Configurable session timeout and security</div>
                </div>
              </div>
            </div>
          </div>

          <AdvancedSystemSettings
            showAdvancedSettings={showAdvancedSettings} setShowAdvancedSettings={setShowAdvancedSettings}
            data={data} config={config}
            logLevel={logLevel} setLogLevel={setLogLevel}
            verboseLogging={verboseLogging} setVerboseLogging={setVerboseLogging}
            proxmoxTokenId={proxmoxTokenId} setProxmoxTokenId={setProxmoxTokenId}
            proxmoxTokenSecret={proxmoxTokenSecret} setProxmoxTokenSecret={setProxmoxTokenSecret}
            validatingToken={validatingToken} tokenValidationResult={tokenValidationResult}
            confirmHostChange={confirmHostChange} setConfirmHostChange={setConfirmHostChange}
            validateToken={validateToken} confirmAndChangeHost={confirmAndChangeHost}
            error={error} setError={setError}
          />

          {/* Save Button - Sticky at bottom */}
          <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-white/95 dark:bg-pb-surface-dark/95 backdrop-blur-sm border-t border-pb-border dark:border-pb-border-dark shadow-lg">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="w-full px-6 py-3 bg-pb-accent hover:bg-pb-accent-hover text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
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
