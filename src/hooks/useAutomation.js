const { useState } = React;

export function useAutomation(API_BASE, deps = {}) {
  const { setError } = deps;

  // null until the first successful load — never a made-up "Off" placeholder.
  // A failed load sets the matching *Error; consumers show "unavailable".
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationStatusError, setAutomationStatusError] = useState(null);
  const [loadingAutomationStatus, setLoadingAutomationStatus] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [migrationHistory, setMigrationHistory] = useState([]);
  const [loadingRunHistory, setLoadingRunHistory] = useState(false);
  const [expandedRun, setExpandedRun] = useState(null);
  const [automationConfig, setAutomationConfig] = useState(null);
  const [automationConfigError, setAutomationConfigError] = useState(null);
  const [savingAutomationConfig, setSavingAutomationConfig] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingAutomation, setTestingAutomation] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [runNowMessage, setRunNowMessage] = useState(null);

  // Automigrate logs
  const [automigrateLogs, setAutomigrateLogs] = useState(null);
  const [logRefreshTime, setLogRefreshTime] = useState(null);
  const [migrationLogsTab, setMigrationLogsTab] = useState('history');
  const [migrationHistoryPage, setMigrationHistoryPage] = useState(1);
  const [migrationHistoryPageSize, setMigrationHistoryPageSize] = useState(5);

  // Time windows form state
  const [showTimeWindowForm, setShowTimeWindowForm] = useState(false);
  const [editingWindowIndex, setEditingWindowIndex] = useState(null);
  const [newWindowData, setNewWindowData] = useState({
    name: '',
    type: 'migration',
    days: [],
    start_time: '00:00',
    end_time: '00:00'
  });

  // Confirmation modals
  const [confirmRemoveWindow, setConfirmRemoveWindow] = useState(null);

  const fetchAutomationStatus = async () => {
    setLoadingAutomationStatus(true);
    try {
      const response = await fetch(`${API_BASE}/automigrate/status`);
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        setAutomationStatus(result);
        setAutomationStatusError(null);
      } else {
        setAutomationStatusError(result.error || result.message || `HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch automation status:', err);
      setAutomationStatusError(err.message || 'Network error');
    } finally {
      setLoadingAutomationStatus(false);
    }
  };

  const fetchRunHistory = async (limit = 10) => {
    setLoadingRunHistory(true);
    try {
      const response = await fetch(`${API_BASE}/automigrate/history?type=runs&limit=${limit}`);
      const result = await response.json();
      if (result.success) {
        setRunHistory(result.runs || []);
      }
    } catch (err) {
      console.error('Failed to fetch run history:', err);
    } finally {
      setLoadingRunHistory(false);
    }
  };

  const fetchMigrationHistory = async (limit = 2000) => {
    try {
      const response = await fetch(`${API_BASE}/automigrate/history?type=migrations&limit=${limit}`);
      const result = await response.json();
      if (result.success) {
        setMigrationHistory(result.migrations || []);
      }
    } catch (err) {
      console.error('Failed to fetch migration history:', err);
    }
  };

  const fetchAutomationConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/automigrate/config`);
      const result = await response.json().catch(() => ({}));
      if (result.success && result.config) {
        setAutomationConfig(result.config);
        setAutomationConfigError(null);
      } else {
        setAutomationConfigError(result.error || result.message || `HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch automation config:', err);
      setAutomationConfigError(err.message || 'Network error');
    }
  };

  const saveAutomationConfig = async (updates) => {
    setSavingAutomationConfig(true);
    try {
      const response = await fetch(`${API_BASE}/automigrate/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (result.success) {
        setAutomationConfig(result.config);
        fetchAutomationStatus();
        return true;
      }
      if (setError) setError(`Couldn't save automation settings: ${result.error || 'unknown error'}`);
      return false;
    } catch (err) {
      console.error('Failed to save automation config:', err);
      if (setError) setError(`Couldn't save automation settings: ${err.message}`);
      return false;
    } finally {
      setSavingAutomationConfig(false);
    }
  };

  const testAutomation = async () => {
    setTestingAutomation(true);
    setTestResult(null);
    try {
      const response = await fetch(`${API_BASE}/automigrate/test`, {
        method: 'POST'
      });
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingAutomation(false);
    }
  };

  const runAutomationNow = async () => {
    setRunningAutomation(true);
    setRunNowMessage(null);
    try {
      const response = await fetch(`${API_BASE}/automigrate/run`, {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        if (result.migration_info) {
          const migration = result.migration_info;
          setRunNowMessage({
            type: 'success',
            text: `Migration started: ${migration.name} (${migration.vmid}) from ${migration.source_node} to ${migration.target_node}`
          });

          setTimeout(() => fetchAutomationStatus(), 2000);
        } else {
          setRunNowMessage({ type: 'info', text: 'Automation check running... checking for recommendations and filtering rules.' });

          const runStartTime = new Date();

          await new Promise(resolve => setTimeout(resolve, 10000));

          const statusResponse = await fetch(`${API_BASE}/automigrate/status`);
          const statusData = await statusResponse.json();

          await fetchAutomationStatus();

          const newMigrations = statusData.recent_migrations?.[0];
          const recentTimestamp = newMigrations ? new Date(newMigrations.timestamp) : null;
          const wasJustStarted = recentTimestamp && (recentTimestamp >= runStartTime) && (new Date() - recentTimestamp) < 30000;

          if (wasJustStarted) {
            setRunNowMessage({
              type: 'success',
              text: `Migration started: ${newMigrations.name} (${newMigrations.vmid}) from ${newMigrations.source_node} to ${newMigrations.target_node}`
            });
          } else {
            const hasInProgressMigrations = statusData.in_progress_migrations && statusData.in_progress_migrations.length > 0;

            if (hasInProgressMigrations) {
              const migration = statusData.in_progress_migrations[0];
              setRunNowMessage({
                type: 'info',
                text: `Migration already in progress: ${migration.name} (${migration.vmid})`
              });
            } else {
              const filterReasons = statusData.filter_reasons || [];
              let messageText = 'Automation completed. No migrations were started';

              if (filterReasons.length > 0) {
                messageText += ':\n' + filterReasons.map(r => `  • ${r}`).join('\n');
              } else {
                // Don't claim "balanced" — that implies a measurement was made.
                // It just means nothing reached the migration step.
                messageText += ' — no actionable recommendations this cycle.';
              }

              setRunNowMessage({
                type: 'info',
                text: messageText
              });
            }
          }
        }

        setTimeout(() => setRunNowMessage(null), 30000);
      } else {
        setRunNowMessage({ type: 'error', text: `Failed to start automation: ${result.error}` });
        setTimeout(() => setRunNowMessage(null), 30000);
      }
    } catch (err) {
      setRunNowMessage({ type: 'error', text: `Error: ${err.message}` });
      setTimeout(() => setRunNowMessage(null), 30000);
      console.error('Failed to run automation:', err);
    } finally {
      setRunningAutomation(false);
    }
  };

  return {
    automationStatus, setAutomationStatus,
    automationStatusError,
    loadingAutomationStatus,
    runHistory, expandedRun, setExpandedRun,
    migrationHistory, fetchMigrationHistory,
    automationConfig, setAutomationConfig,
    automationConfigError,
    savingAutomationConfig,
    testResult, setTestResult,
    testingAutomation,
    runningAutomation,
    runNowMessage, setRunNowMessage,
    automigrateLogs, setAutomigrateLogs,
    logRefreshTime, setLogRefreshTime,
    migrationLogsTab, setMigrationLogsTab,
    migrationHistoryPage, setMigrationHistoryPage,
    migrationHistoryPageSize, setMigrationHistoryPageSize,
    showTimeWindowForm, setShowTimeWindowForm,
    editingWindowIndex, setEditingWindowIndex,
    newWindowData, setNewWindowData,
    confirmRemoveWindow, setConfirmRemoveWindow,
    fetchAutomationStatus,
    fetchRunHistory,
    fetchAutomationConfig,
    saveAutomationConfig,
    testAutomation,
    runAutomationNow
  };
}
