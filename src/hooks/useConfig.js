const { useState, useEffect } = React;

export function useConfig(API_BASE, deps = {}) {
  const { setError } = deps;

  const [config, setConfig] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(60 * 60 * 1000);
  const [tempBackendInterval, setTempBackendInterval] = useState(60);
  const [tempUiInterval, setTempUiInterval] = useState(60);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingCollectionSettings, setSavingCollectionSettings] = useState(false);
  const [collectionSettingsSaved, setCollectionSettingsSaved] = useState(false);
  const [logLevel, setLogLevel] = useState('INFO');
  const [verboseLogging, setVerboseLogging] = useState(false);

  // Penalty Configuration state
  const [penaltyConfig, setPenaltyConfig] = useState(null);
  const [penaltyDefaults, setPenaltyDefaults] = useState(null);
  const [savingPenaltyConfig, setSavingPenaltyConfig] = useState(false);
  const [penaltyConfigSaved, setPenaltyConfigSaved] = useState(false);
  const [penaltyPresets, setPenaltyPresets] = useState(null);
  const [activePreset, setActivePreset] = useState('custom');
  const [openPenaltyConfigOnAutomation, setOpenPenaltyConfigOnAutomation] = useState(false);

  // Simplified Migration Settings state
  const [migrationSettings, setMigrationSettings] = useState(null);
  const [migrationSettingsDefaults, setMigrationSettingsDefaults] = useState(null);
  const [migrationSettingsDescriptions, setMigrationSettingsDescriptions] = useState(null);
  const [effectivePenaltyConfig, setEffectivePenaltyConfig] = useState(null);
  const [hasExpertOverrides, setHasExpertOverrides] = useState(false);
  const [savingMigrationSettings, setSavingMigrationSettings] = useState(false);
  const [migrationSettingsSaved, setMigrationSettingsSaved] = useState(false);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const result = await response.json();
      if (result.success) {
        setConfig(result.config);
        const intervalMs = (result.config.ui_refresh_interval_minutes || 60) * 60 * 1000;
        setAutoRefreshInterval(intervalMs);
        setTempBackendInterval(result.config.collection_interval_minutes || 60);
        setTempUiInterval(result.config.ui_refresh_interval_minutes || 60);
        return result.config;
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
    return null;
  };

  const fetchPenaltyConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/penalty-config`);
      const result = await response.json();
      if (result.success) {
        setPenaltyConfig(result.config);
        setPenaltyDefaults(result.defaults);
        if (result.presets) setPenaltyPresets(result.presets);
        if (result.active_preset) setActivePreset(result.active_preset);
      }
    } catch (err) {
      console.error('Failed to load penalty config:', err);
    }
  };

  const applyPenaltyPreset = async (presetName) => {
    try {
      setSavingPenaltyConfig(true);
      const response = await fetch(`${API_BASE}/penalty-config/presets/${presetName}`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        setPenaltyConfig(result.config);
        setActivePreset(result.active_preset || presetName);
        setPenaltyConfigSaved(true);
        setTimeout(() => setPenaltyConfigSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setSavingPenaltyConfig(false);
    }
  };

  const saveSettings = async (settingsPayload) => {
    setSavingSettings(true);
    try {
      const response = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload)
      });

      const result = await response.json();
      if (result.success) {
        setConfig(result.config);
        const intervalMs = (result.config.ui_refresh_interval_minutes || tempUiInterval) * 60 * 1000;
        setAutoRefreshInterval(intervalMs);
        return { success: true, config: result.config, intervalMs };
      } else {
        if (setError) setError('Failed to save settings: ' + result.error);
        return { success: false };
      }
    } catch (err) {
      if (setError) setError('Failed to save settings: ' + err.message);
      return { success: false };
    } finally {
      setSavingSettings(false);
    }
  };

  const savePenaltyConfig = async () => {
    setSavingPenaltyConfig(true);
    setPenaltyConfigSaved(false);
    try {
      const response = await fetch(`${API_BASE}/penalty-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: penaltyConfig })
      });
      const result = await response.json();
      if (result.success) {
        setPenaltyConfig(result.config);
        setPenaltyConfigSaved(true);
        setTimeout(() => setPenaltyConfigSaved(false), 3000);
      } else {
        if (setError) setError(`Failed to save penalty config: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to save penalty config:', err);
      if (setError) setError(`Error saving penalty config: ${err.message}`);
    } finally {
      setSavingPenaltyConfig(false);
    }
  };

  const resetPenaltyConfig = async () => {
    setSavingPenaltyConfig(true);
    try {
      const response = await fetch(`${API_BASE}/penalty-config/reset`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        setPenaltyConfig(result.config);
      } else {
        if (setError) setError(`Failed to reset penalty config: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to reset penalty config:', err);
      if (setError) setError(`Error resetting penalty config: ${err.message}`);
    } finally {
      setSavingPenaltyConfig(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Simplified Migration Settings
  // ---------------------------------------------------------------------------

  const fetchMigrationSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/migration-settings`);
      const result = await response.json();
      if (result.success) {
        setMigrationSettings(result.settings);
        setMigrationSettingsDefaults(result.defaults);
        setMigrationSettingsDescriptions(result.descriptions);
        setEffectivePenaltyConfig(result.effective_penalty_config);
        setHasExpertOverrides(result.has_expert_overrides || false);
      }
    } catch (err) {
      console.error('Failed to load migration settings:', err);
    }
  };

  const saveMigrationSettingsAction = async () => {
    if (!migrationSettings) return;
    setSavingMigrationSettings(true);
    setMigrationSettingsSaved(false);
    try {
      const response = await fetch(`${API_BASE}/migration-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: migrationSettings })
      });
      const result = await response.json();
      if (result.success) {
        setMigrationSettings(result.settings);
        setEffectivePenaltyConfig(result.effective_penalty_config);
        setMigrationSettingsSaved(true);
        setTimeout(() => setMigrationSettingsSaved(false), 3000);
        // Also refresh penalty config so expert mode stays in sync
        fetchPenaltyConfig();
      } else {
        if (setError) setError(`Failed to save migration settings: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to save migration settings:', err);
      if (setError) setError(`Error saving migration settings: ${err.message}`);
    } finally {
      setSavingMigrationSettings(false);
    }
  };

  const resetMigrationSettingsAction = async () => {
    setSavingMigrationSettings(true);
    try {
      const response = await fetch(`${API_BASE}/migration-settings/reset`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        setMigrationSettings(result.settings);
        setEffectivePenaltyConfig(result.effective_penalty_config);
        setMigrationSettingsSaved(true);
        setTimeout(() => setMigrationSettingsSaved(false), 3000);
        fetchPenaltyConfig();
      } else {
        if (setError) setError(`Failed to reset migration settings: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to reset migration settings:', err);
      if (setError) setError(`Error resetting migration settings: ${err.message}`);
    } finally {
      setSavingMigrationSettings(false);
    }
  };

  return {
    config, setConfig,
    autoRefreshInterval, setAutoRefreshInterval,
    tempBackendInterval, setTempBackendInterval,
    tempUiInterval, setTempUiInterval,
    savingSettings,
    savingCollectionSettings, setSavingCollectionSettings,
    collectionSettingsSaved, setCollectionSettingsSaved,
    logLevel, setLogLevel,
    verboseLogging, setVerboseLogging,
    penaltyConfig, setPenaltyConfig,
    penaltyDefaults,
    savingPenaltyConfig,
    penaltyConfigSaved,
    penaltyPresets,
    activePreset,
    openPenaltyConfigOnAutomation, setOpenPenaltyConfigOnAutomation,
    fetchConfig,
    fetchPenaltyConfig,
    applyPenaltyPreset,
    saveSettings,
    savePenaltyConfig,
    resetPenaltyConfig,
    // Migration settings
    migrationSettings, setMigrationSettings,
    migrationSettingsDefaults,
    migrationSettingsDescriptions,
    effectivePenaltyConfig,
    hasExpertOverrides,
    savingMigrationSettings,
    migrationSettingsSaved,
    fetchMigrationSettings,
    saveMigrationSettingsAction,
    resetMigrationSettingsAction,
  };
}
