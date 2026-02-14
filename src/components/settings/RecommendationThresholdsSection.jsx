import { Save, CheckCircle, ChevronDown } from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';
const { useState, useEffect } = React;

export default function RecommendationThresholdsSection({ config, fetchConfig, collapsedSections, setCollapsedSections, embedded }) {
  const [cpuThreshold, setCpuThreshold] = useState(60);
  const [memThreshold, setMemThreshold] = useState(70);
  const [iowaitThreshold, setIowaitThreshold] = useState(30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load thresholds from backend config on mount
  useEffect(() => {
    fetch(`${API_BASE}/settings/recommendation-thresholds`)
      .then(r => r.json())
      .then(result => {
        if (result.success && result.thresholds) {
          setCpuThreshold(result.thresholds.cpu_threshold);
          setMemThreshold(result.thresholds.mem_threshold);
          setIowaitThreshold(result.thresholds.iowait_threshold);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    fetch(`${API_BASE}/settings/recommendation-thresholds`, {
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
        setSaving(false);
        if (result.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          // Sync localStorage so the dashboard picks up the new values immediately
          localStorage.setItem('proxbalance_cpu_threshold', cpuThreshold.toString());
          localStorage.setItem('proxbalance_mem_threshold', memThreshold.toString());
          localStorage.setItem('proxbalance_iowait_threshold', iowaitThreshold.toString());
          if (fetchConfig) fetchConfig();
        } else {
          setError(result.error || 'Failed to save');
        }
      })
      .catch(err => {
        setSaving(false);
        setError(err.message);
      });
  };

  if (!loaded) return null;

  const isCollapsed = collapsedSections?.recommendationThresholds;

  const outerClass = embedded
    ? ''
    : 'bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden';

  return (
    <div className={outerClass}>
      <button
        onClick={() => setCollapsedSections && setCollapsedSections(prev => ({ ...prev, recommendationThresholds: !prev.recommendationThresholds }))}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      >
        {embedded
          ? <h3 className="text-base font-bold text-gray-900 dark:text-white">Recommendation Thresholds</h3>
          : <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recommendation Thresholds</h2>
        }
        {setCollapsedSections && (
          <ChevronDown
            size={embedded ? 20 : 24}
            className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${isCollapsed ? '' : '-rotate-180'}`}
          />
        )}
      </button>

      {!isCollapsed && (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>When to recommend migrations:</strong> When a node's resource usage exceeds these thresholds,
            the engine will start recommending migrations to move guests off that node. Lower values mean more
            proactive balancing. These are used by both the dashboard and background recommendation services.
          </p>
        </div>

        {/* CPU Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CPU Threshold: <span className="font-bold text-blue-600 dark:text-blue-400">{cpuThreshold}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="95"
            step="5"
            value={cpuThreshold}
            onChange={(e) => setCpuThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span>10%</span>
            <span>Aggressive</span>
            <span>Relaxed</span>
            <span>95%</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recommend moving guests when a node's CPU exceeds this level
          </p>
        </div>

        {/* Memory Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Memory Threshold: <span className="font-bold text-blue-600 dark:text-blue-400">{memThreshold}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="95"
            step="5"
            value={memThreshold}
            onChange={(e) => setMemThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span>10%</span>
            <span>Aggressive</span>
            <span>Relaxed</span>
            <span>95%</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recommend moving guests when a node's memory exceeds this level
          </p>
        </div>

        {/* IOWait Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            IOWait Threshold: <span className="font-bold text-blue-600 dark:text-blue-400">{iowaitThreshold}%</span>
          </label>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={iowaitThreshold}
            onChange={(e) => setIowaitThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span>5%</span>
            <span>Aggressive</span>
            <span>Relaxed</span>
            <span>60%</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recommend moving guests when a node's IOWait exceeds this level
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full px-4 py-2 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
            saved
              ? 'bg-emerald-500 dark:bg-emerald-600'
              : saving
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle size={16} />
              Thresholds Saved!
            </>
          ) : (
            <>
              <Save size={16} />
              Apply Recommendation Thresholds
            </>
          )}
        </button>
      </div>
      )}
    </div>
  );
}
