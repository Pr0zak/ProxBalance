const { useState } = React;

export function useAutomation(API_BASE, deps = {}) {
  const { setError } = deps;

  const [automationStatus, setAutomationStatus] = useState({
    enabled: false,
    timer_active: false,
    check_interval_minutes: 0,
    dry_run: false,
    state: {}
  });
  const [loadingAutomationStatus, setLoadingAutomationStatus] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [loadingRunHistory, setLoadingRunHistory] = useState(false);
  const [expandedRun, setExpandedRun] = useState(null);
  const [automationConfig, setAutomationConfig] = useState({
    enabled: false,
    dry_run: false,
    check_interval_minutes: 5,
    maintenance_nodes: [],
    rules: {
      min_confidence_score: 75,
      max_migrations_per_run: 3
    },
    safety_checks: {
      max_node_cpu_percent: 85,
      max_node_memory_percent: 85,
      min_free_disk_gb: 20
    },
    time_windows: []
  });
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
  const [confirmEnableAutomation, setConfirmEnableAutomation] = useState(false);
  const [confirmDisableDryRun, setConfirmDisableDryRun] = useState(false);

  const fetchAutomationStatus = async () => {
    setLoadingAutomationStatus(true);
    try {
      const response = await fetch(`${API_BASE}/automigrate/status`);
      const result = await response.json();
      if (result.success) {
        setAutomationStatus(result);
      }
    } catch (err) {
      console.error('Failed to fetch automation status:', err);
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

  const fetchAutomationConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/automigrate/config`);
      const result = await response.json();
      if (result.success) {
        setAutomationConfig(result.config);
      }
    } catch (err) {
      console.error('Failed to fetch automation config:', err);
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
      } else {
        if (setError) setError(`Failed to save settings: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to save automation config:', err);
      if (setError) setError(`Error saving settings: ${err.message}`);
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
                messageText += ' (cluster is balanced or no recommendations available).';
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
    loadingAutomationStatus,
    runHistory, expandedRun, setExpandedRun,
    automationConfig, setAutomationConfig,
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
    confirmEnableAutomation, setConfirmEnableAutomation,
    confirmDisableDryRun, setConfirmDisableDryRun,
    fetchAutomationStatus,
    fetchRunHistory,
    fetchAutomationConfig,
    saveAutomationConfig,
    testAutomation,
    runAutomationNow
  };
}
