const { useState } = React;

export function useUpdates(API_BASE, deps = {}) {
  const { setError } = deps;

  const [systemInfo, setSystemInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState([]);
  const [updateResult, setUpdateResult] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [branchPreview, setBranchPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

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

      if (result.success) {
        setUpdateLog(result.log || []);
        if (result.updated) {
          setUpdateResult('success');
        } else {
          setUpdateResult('up-to-date');
        }
      } else {
        setUpdateLog([...(result.log || []), `Error: ${result.error}`]);
        setUpdateResult('error');
        setUpdateError(result.error || 'Unknown error');
      }
    } catch (err) {
      setUpdateLog(prev => [...prev, `Error: ${err.message}`]);
      setUpdateResult('error');
      setUpdateError(err.message);
    }

    setUpdating(false);
  };

  const fetchBranches = async () => {
    setLoadingBranches(true);
    setBranchPreview(null);
    try {
      const response = await fetch(`${API_BASE}/system/branches`);
      const result = await response.json();
      if (result.success) {
        setAvailableBranches(result.branches || []);
      } else {
        console.error('Failed to fetch branches:', result.error);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
    setLoadingBranches(false);
  };

  const fetchBranchPreview = async (branchName) => {
    setLoadingPreview(true);
    setBranchPreview(null);
    try {
      const response = await fetch(`${API_BASE}/system/branch-preview/${encodeURIComponent(branchName)}`);
      const result = await response.json();
      if (result.success) {
        setBranchPreview(result);
      }
    } catch (err) {
      console.error('Error fetching branch preview:', err);
    }
    setLoadingPreview(false);
  };

  const switchBranch = async (branchName) => {
    setSwitchingBranch(true);
    try {
      const response = await fetch(`${API_BASE}/system/switch-branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchName })
      });
      const result = await response.json();

      if (result.success) {
        setShowBranchModal(false);
        setBranchPreview(null);
        await fetchSystemInfo();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        if (setError) setError(`Failed to switch branch: ${result.error}`);
      }
    } catch (err) {
      if (setError) setError(`Error switching branch: ${err.message}`);
    }
    setSwitchingBranch(false);
  };

  const rollbackBranch = async () => {
    setRollingBack(true);
    try {
      const response = await fetch(`${API_BASE}/system/rollback-branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        setShowBranchModal(false);
        setBranchPreview(null);
        await fetchSystemInfo();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        if (setError) setError(`Failed to rollback: ${result.error}`);
      }
    } catch (err) {
      if (setError) setError(`Error rolling back branch: ${err.message}`);
    }
    setRollingBack(false);
  };

  const clearTestingMode = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/clear-testing-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        await fetchSystemInfo();
      }
    } catch (err) {
      if (setError) setError(`Error clearing testing mode: ${err.message}`);
    }
  };

  return {
    systemInfo,
    updating, updateLog, setUpdateLog,
    updateResult, setUpdateResult, updateError,
    showUpdateModal, setShowUpdateModal,
    showBranchModal, setShowBranchModal,
    availableBranches, loadingBranches,
    switchingBranch,
    branchPreview, setBranchPreview,
    loadingPreview,
    rollingBack,
    fetchSystemInfo,
    handleUpdate,
    fetchBranches, fetchBranchPreview,
    switchBranch, rollbackBranch, clearTestingMode
  };
}
