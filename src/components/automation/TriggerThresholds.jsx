import { useUnsaved } from '../UnsavedChanges.jsx';
import { API_BASE } from '../../utils/constants.js';
import ThresholdSlider from './ThresholdSlider.jsx';
const { useState, useEffect } = React;

/**
 * CPU / memory / IOWait trigger thresholds (the recommendation thresholds),
 * shown as sliders with every node's live position. Edits are staged and
 * saved from the page's unsaved-changes bar.
 */
export default function TriggerThresholds({ fetchConfig, nodes, memFloor }) {
  const [cpuThreshold, setCpuThreshold] = useState(60);
  const [memThreshold, setMemThreshold] = useState(70);
  const [iowaitThreshold, setIowaitThreshold] = useState(30);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [savedValues, setSavedValues] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/settings/recommendation-thresholds`)
      .then(r => r.json())
      .then(result => {
        if (result.success && result.thresholds) {
          setCpuThreshold(result.thresholds.cpu_threshold);
          setMemThreshold(result.thresholds.mem_threshold);
          setIowaitThreshold(result.thresholds.iowait_threshold);
          setSavedValues({ cpu: result.thresholds.cpu_threshold, mem: result.thresholds.mem_threshold, iowait: result.thresholds.iowait_threshold });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = () => {
    setError(null);
    return fetch(`${API_BASE}/settings/recommendation-thresholds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpu_threshold: cpuThreshold,
        mem_threshold: memThreshold,
        iowait_threshold: iowaitThreshold,
      })
    })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setSavedValues({ cpu: cpuThreshold, mem: memThreshold, iowait: iowaitThreshold });
          // Sync localStorage so the dashboard picks up the new values immediately
          try {
            localStorage.setItem('proxbalance_cpu_threshold', cpuThreshold.toString());
            localStorage.setItem('proxbalance_mem_threshold', memThreshold.toString());
            localStorage.setItem('proxbalance_iowait_threshold', iowaitThreshold.toString());
          } catch (e) { /* storage unavailable */ }
          if (fetchConfig) fetchConfig();
          return { ok: true };
        }
        setError(result.error || 'Failed to save');
        return { ok: false, error: result.error || 'Failed to save' };
      })
      .catch(err => {
        setError(err.message);
        return { ok: false, error: err.message };
      });
  };

  const pendingCount = savedValues
    ? [cpuThreshold !== savedValues.cpu, memThreshold !== savedValues.mem, iowaitThreshold !== savedValues.iowait].filter(Boolean).length
    : 0;
  useUnsaved('recommendationThresholds', pendingCount, handleSave, () => {
    if (!savedValues) return;
    setCpuThreshold(savedValues.cpu);
    setMemThreshold(savedValues.mem);
    setIowaitThreshold(savedValues.iowait);
  });

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <ThresholdSlider
        label="CPU" metric="cpu" nodes={nodes} memFloor={memFloor}
        value={cpuThreshold} onChange={setCpuThreshold} min={10} max={95}
        description="Move guests off a node when its CPU stays above this"
      />
      <ThresholdSlider
        label="Memory" metric="mem" nodes={nodes}
        value={memThreshold} onChange={setMemThreshold} min={10} max={95}
        description="Move guests off a node when its memory stays above this"
      />
      <ThresholdSlider
        label="IOWait" metric="iowait" nodes={nodes}
        value={iowaitThreshold} onChange={setIowaitThreshold} min={5} max={60}
        description="Move guests off a node when its IOWait stays above this"
      />
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
