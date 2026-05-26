import { X, Save, AlertTriangle, Info } from '../Icons.jsx';
import { MODAL_OVERLAY, MODAL_CONTAINER, BTN_PRIMARY, BTN_SECONDARY } from '../../utils/designTokens.js';

const { useState } = React;

/**
 * Editor for the PVE Cluster Resource Scheduler (datacenter.cfg `crs`).
 * POSTs to /api/pve-crs, which writes via the Proxmox API. Requires the
 * ProxBalance token to hold Sys.Modify on '/' — a 403 is surfaced inline.
 */
export default function CrsEditorModal({ pveCrs, automationEnabled, onClose, onSaved, API_BASE }) {
  const crs = pveCrs || {};
  const [ha, setHa] = useState(crs.ha || 'basic');
  const [rebalanceOnStart, setRebalanceOnStart] = useState(!!crs['ha-rebalance-on-start']);
  const [autoRebalance, setAutoRebalance] = useState(!!crs['ha-auto-rebalance']);
  const [threshold, setThreshold] = useState(crs['ha-auto-rebalance-threshold'] ?? 30);
  const [margin, setMargin] = useState(crs['ha-auto-rebalance-margin'] ?? 10);
  const [holdDuration, setHoldDuration] = useState(crs['ha-auto-rebalance-hold-duration'] ?? 3);
  const [method, setMethod] = useState(crs['ha-auto-rebalance-method'] || 'bruteforce');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const showDynamicOpts = ha === 'dynamic';
  const showRebalanceOnStart = ha === 'static' || ha === 'dynamic';
  const willDuel = ha === 'dynamic' && autoRebalance && automationEnabled;

  const numField = (label, value, setValue, min, max, suffix) => (
    <label className="flex items-center justify-between gap-3 text-sm text-pb-text dark:text-gray-200">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number" min={min} max={max} value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 text-sm px-2 py-1 border rounded bg-pb-surface2 dark:bg-gray-700 border-pb-border dark:border-gray-600 text-pb-text dark:text-white"
        />
        {suffix && <span className="text-xs text-pb-text2 dark:text-gray-400">{suffix}</span>}
      </span>
    </label>
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = { ha };
    if (showRebalanceOnStart) payload['ha-rebalance-on-start'] = rebalanceOnStart;
    if (showDynamicOpts) {
      payload['ha-auto-rebalance'] = autoRebalance;
      if (autoRebalance) {
        payload['ha-auto-rebalance-threshold'] = threshold;
        payload['ha-auto-rebalance-margin'] = margin;
        payload['ha-auto-rebalance-hold-duration'] = holdDuration;
        payload['ha-auto-rebalance-method'] = method;
      }
    }
    try {
      const res = await fetch(`${API_BASE}/pve-crs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || `Request failed (${res.status})`);
        setSaving(false);
        return;
      }
      // Optimistic normalized config for an instant banner update.
      const normalized = {
        ha,
        'ha-rebalance-on-start': showRebalanceOnStart && rebalanceOnStart ? 1 : 0,
        'ha-auto-rebalance': showDynamicOpts && autoRebalance ? 1 : 0,
        'ha-auto-rebalance-threshold': Number(threshold),
        'ha-auto-rebalance-margin': Number(margin),
        'ha-auto-rebalance-hold-duration': Number(holdDuration),
        'ha-auto-rebalance-method': method,
        dynamic_balancer_active: showDynamicOpts && autoRebalance,
      };
      if (onSaved) onSaved(normalized);
      onClose();
    } catch (e) {
      setError(`Connection failed: ${e.message}`);
      setSaving(false);
    }
  };

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
          <h3 className="text-lg font-bold text-pb-text dark:text-white">Edit PVE Cluster Resource Scheduler</h3>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-2 text-xs text-pb-text2 dark:text-gray-400">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>Writes to the cluster's <code>datacenter.cfg</code> via the Proxmox API. Requires the ProxBalance token to have <code>Sys.Modify</code> on <code>/</code> — a permission error here means it hasn't been granted yet.</span>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-pb-text dark:text-gray-200">HA scheduling mode</span>
            <select
              value={ha}
              onChange={(e) => setHa(e.target.value)}
              className="mt-1 w-full text-sm px-2 py-2 border rounded bg-pb-surface2 dark:bg-gray-700 border-pb-border dark:border-gray-600 text-pb-text dark:text-white"
            >
              <option value="basic">basic — guest count only</option>
              <option value="static">static — configured CPU/RAM</option>
              <option value="dynamic">dynamic — live utilization (9.2+)</option>
            </select>
          </label>

          {showRebalanceOnStart && (
            <label className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={rebalanceOnStart} onChange={(e) => setRebalanceOnStart(e.target.checked)} className="w-4 h-4" />
              Rebalance on start — pick the best node when an HA guest starts
            </label>
          )}

          {showDynamicOpts && (
            <div className="space-y-3 border-t border-pb-border dark:border-slate-700 pt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-pb-text dark:text-gray-200 cursor-pointer">
                <input type="checkbox" checked={autoRebalance} onChange={(e) => setAutoRebalance(e.target.checked)} className="w-4 h-4" />
                Automatic load balancing (auto-rebalance)
              </label>
              {autoRebalance && (
                <div className="space-y-2.5 pl-6">
                  {numField('Imbalance threshold', threshold, setThreshold, 0, 100, '%')}
                  {numField('Min improvement margin', margin, setMargin, 0, 100, '%')}
                  {numField('Hold duration', holdDuration, setHoldDuration, 0, 1000, 'rounds (~10s each)')}
                  <label className="flex items-center justify-between gap-3 text-sm text-pb-text dark:text-gray-200">
                    <span>Scoring method</span>
                    <select
                      value={method} onChange={(e) => setMethod(e.target.value)}
                      className="text-sm px-2 py-1 border rounded bg-pb-surface2 dark:bg-gray-700 border-pb-border dark:border-gray-600 text-pb-text dark:text-white"
                    >
                      <option value="bruteforce">bruteforce (CPU+RAM equal)</option>
                      <option value="topsis">topsis (memory-weighted)</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}

          {willDuel && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-r text-xs text-yellow-800 dark:text-yellow-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
              <span>ProxBalance automigrate is also enabled. With dynamic auto-rebalance on, PVE will autonomously migrate HA-managed guests on a ~10s loop — ProxBalance already excludes those guests, but consider whether you want both engines active.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-pb-border dark:border-slate-700">
          <button onClick={onClose} className={BTN_SECONDARY} disabled={saving}>Cancel</button>
          <button onClick={handleSave} className={`${BTN_PRIMARY} flex items-center gap-2`} disabled={saving}>
            <Save size={16} /> {saving ? 'Applying…' : 'Apply to cluster'}
          </button>
        </div>
      </div>
    </div>
  );
}
