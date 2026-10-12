const { useState } = React;

export function useUpdates(API_BASE, deps = {}) {
  const { setError } = deps;

  const [systemInfo, setSystemInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState([]);
  const [updateResult, setUpdateResult] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/info`);
      const result = await response.json();
      if (result.success) {
        setSystemInfo(result);
      }
    } catch (err) {
      console.error('Failed to fetch system info:', err);
    }
  };

  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);

  // One step of the update runner's status file as a log line. The result
  // view colours lines containing ✓ green and "Failed" red.
  const stepLine = (step) => `${step.ok ? '✓' : '✗ Failed:'} ${step.name}${step.detail ? ` — ${step.detail}` : ''}`;

  // The runner restarts the API mid-update, so failed polls are expected for
  // a few seconds; keep polling until the status leaves "running" or ~10 min pass.
  const pollUpdateStatus = async () => {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const response = await fetch(`${API_BASE}/system/update-status`, { cache: 'no-store' });
        if (!response.ok) continue;
        const status = await response.json();
        setUpdateLog((status.steps || []).map(stepLine));
        if (status.state && status.state !== 'running') return status;
      } catch (err) {
        // API restarting; try again.
      }
    }
    return { state: 'failed', error: 'Timed out waiting for the update to finish. Check: journalctl -u proxbalance-update' };
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateLog([]);
    setUpdateResult(null);
    setUpdateError(null);
    setShowUpdateModal(true);

    try {
      const response = await fetch(`${API_BASE}/system/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (!result.success) {
        setUpdateResult('error');
        setUpdateError(result.error || 'Unknown error');
      } else if (!result.started) {
        setUpdateResult('up-to-date');
      } else {
        const status = await pollUpdateStatus();
        if (status.state === 'succeeded') {
          setUpdateResult('success');
        } else if (status.state === 'rolled_back') {
          setUpdateResult('rolled-back');
          setUpdateError(status.error || 'The new version failed its checks');
        } else {
          setUpdateResult('error');
          setUpdateError(status.error || 'Update failed');
        }
      }
    } catch (err) {
      setUpdateLog(prev => [...prev, `Error: ${err.message}`]);
      setUpdateResult('error');
      setUpdateError(err.message);
    }

    setUpdating(false);
  };

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      await fetch(`${API_BASE}/system/check-update?force=1`, { cache: 'no-store' });
      await fetchSystemInfo();
    } catch (err) {
      console.error('Failed to check for updates:', err);
    }
    setCheckingUpdates(false);
  };

  const setUpdateChannel = async (channel) => {
    setSavingChannel(true);
    try {
      const response = await fetch(`${API_BASE}/system/update-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel })
      });
      const result = await response.json();
      if (!result.success && setError) setError(result.message || 'Could not change the update channel');
      await fetchSystemInfo();
    } catch (err) {
      if (setError) setError(`Could not change the update channel: ${err.message}`);
    }
    setSavingChannel(false);
  };

  return {
    systemInfo,
    updating, updateLog, setUpdateLog,
    updateResult, setUpdateResult, updateError,
    showUpdateModal, setShowUpdateModal,
    fetchSystemInfo,
    handleUpdate,
    checkForUpdates, checkingUpdates,
    setUpdateChannel, savingChannel
  };
}
