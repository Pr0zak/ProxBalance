import {
  Settings, ArrowLeft, Sun, Moon, Lock, Save
} from './Icons.jsx';

import AIProviderSection from './settings/AIProviderSection.jsx';
import DataCollectionSection from './settings/DataCollectionSection.jsx';
import RecommendationThresholdsSection from './settings/RecommendationThresholdsSection.jsx';
import NotificationsSection from './settings/NotificationsSection.jsx';
import AdvancedSystemSettings from './settings/AdvancedSystemSettings.jsx';

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

          <hr className="border-gray-300 dark:border-gray-600" />

          <DataCollectionSection
            backendCollected={backendCollected}
            loading={loading}
            data={data}
            config={config}
            handleRefresh={handleRefresh}
            fetchConfig={fetchConfig}
          />

          <hr className="border-gray-300 dark:border-gray-600" />

          <RecommendationThresholdsSection
            config={config}
            fetchConfig={fetchConfig}
          />

          <hr className="border-gray-300 dark:border-gray-600" />

          <NotificationsSection
            automationConfig={automationConfig}
            saveAutomationConfig={saveAutomationConfig}
          />

          <hr className="border-gray-300 dark:border-gray-600" />

          {/* Authentication - Coming Soon */}
          <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30 opacity-60 cursor-not-allowed">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow">
                COMING SOON
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="text-gray-600 dark:text-gray-400" size={24} />
              <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400">Authentication</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Protect access to ProxBalance with user authentication. Configure login credentials, session management, and access control.
            </p>
            <div className="space-y-3 pointer-events-none">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <Lock size={20} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-600 dark:text-gray-400">Dashboard Login</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Username and password protection</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <Lock size={20} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-600 dark:text-gray-400">API Token Authentication</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Secure API access with bearer tokens</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <Lock size={20} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-600 dark:text-gray-400">Session Management</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Configurable session timeout and security</div>
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
