import {
  ChevronDown, Save, CheckCircle, AlertCircle, AlertTriangle,
  RefreshCw, Download, Upload, Server, Terminal, X
} from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';
import { GLASS_CARD, INPUT_FIELD, ICON, INNER_CARD, BTN_SECONDARY } from '../../utils/designTokens.js';
import { formatRelativeTime } from '../../utils/formatters.js';
import SectionHeader from '../SectionHeader.jsx';
const { useState, useEffect, useRef } = React;

const BTN_ROW = `${BTN_SECONDARY} !px-3 !py-1.5 !gap-1.5 text-xs`;
const BTN_ROW_CAUTION = `${BTN_ROW} !text-orange-600 dark:!text-orange-400`;
const LOG_PROBLEM = /\b(error|warn(ing)?|fail(ed|ure)?|traceback|exception|critical)\b/i;

/** Save text as a file in the browser. */
function saveBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** One titled list of actions: label and detail on the left, buttons on the right. */
function ActionGroup({ title, note, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-pb-text2 dark:text-gray-400 mb-2">{title}</h3>
      <div className={`${INNER_CARD} !p-0 divide-y divide-slate-200/70 dark:divide-pb-border-dark/70`}>{children}</div>
      {note && <p className="text-xs text-pb-text2 dark:text-gray-400 mt-2">{note}</p>}
    </div>
  );
}

function ActionRow({ title, detail, children, below }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-pb-text dark:text-gray-200">{title}</div>
          <div className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5">{detail}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      </div>
      {below}
    </div>
  );
}

/** Tail of a service's journal (GET /api/logs/download returns its last 1000 lines). */
function LogViewer({ service, onClose }) {
  const [text, setText] = useState(null);
  const [error, setLogError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const boxRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setLogError(null);
    try {
      const res = await fetch(`${API_BASE}/logs/download?service=${service}`);
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.includes('json')) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setText(await res.text());
    } catch (err) {
      setLogError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [service]);

  const lines = text ? text.split('\n').filter(Boolean) : [];
  const problems = lines.filter(l => LOG_PROBLEM.test(l));
  const shown = (problemsOnly ? problems : lines).slice(-300);
  // Newest lines are at the bottom; start there.
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [text, problemsOnly]);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap mb-2 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer text-pb-text dark:text-gray-300">
          <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} className="w-3.5 h-3.5 rounded" />
          Warnings &amp; errors only
        </label>
        {text != null && (
          <span className={problems.length ? 'text-amber-600 dark:text-amber-400' : 'text-pb-text2 dark:text-gray-400'}>
            {lines.length} lines · {problems.length ? `${problems.length} warning/error line${problems.length !== 1 ? 's' : ''}` : 'no warnings or errors'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} disabled={loading} className={BTN_ROW}><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          <button onClick={() => saveBlob(text, 'text/plain', `${service}_${new Date().toISOString().replace(/[:.]/g, '-')}.log`)} disabled={!text} className={BTN_ROW}><Download size={12} /> Download</button>
          <button onClick={onClose} className={BTN_ROW} title="Close log"><X size={12} /></button>
        </div>
      </div>
      <div ref={boxRef} className="max-h-72 overflow-auto rounded-lg bg-slate-900 dark:bg-black/40 border border-slate-800 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
        {error ? (
          <div className="text-red-400">Could not read the log: {error}</div>
        ) : text == null ? (
          <div className="text-slate-500">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="text-slate-400">No warnings or errors in the last {lines.length} lines.</div>
        ) : shown.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap break-words ${LOG_PROBLEM.test(line) ? 'text-amber-300' : ''}`}>{line}</div>
        ))}
      </div>
      <p className="text-[11px] text-pb-text3 dark:text-gray-500 mt-1.5">Newest {shown.length} of the last {lines.length || 1000} journal lines. Download keeps all of them.</p>
    </div>
  );
}

function restartService(service, label, detail, setError) {
  if (!confirm(`Restart ${label}?\n\n${detail}`)) return;
  fetch(`${API_BASE}/system/restart-service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service }),
  })
    .then(response => response.json())
    .then(result => { if (!result.success) setError('Failed to restart service: ' + (result.error || 'Unknown error')); })
    .catch(error => setError('Error: ' + error.message));
}

/** Settings → System: service logs and restarts, data export, config backup and restore. */
function SystemActions({ data, config, setError }) {
  const [openLog, setOpenLog] = useState(null);
  const importRef = useRef(null);
  const perf = data?.performance;
  const interval = config?.collection_interval_minutes;
  const guestCount = data?.guests ? Object.keys(data.guests).length : 0;
  const collectorDetail = [
    'proxmox-collector',
    data?.collected_at && `last run ${formatRelativeTime(data.collected_at).toLowerCase()}`,
    perf?.total_time != null && `took ${perf.total_time}s`,
    interval && `every ${interval} min`,
  ].filter(Boolean).join(' · ');

  const logButton = (service) => (
    <button onClick={() => setOpenLog(prev => (prev === service ? null : service))} className={BTN_ROW} aria-expanded={openLog === service}>
      <Terminal size={12} /> {openLog === service ? 'Hide log' : 'View log'}
    </button>
  );

  const exportGuestsCsv = () => {
    if (!data || !data.guests) return;
    let csv = 'VMID,Name,Type,Node,Status,CPU Usage (%),Memory Used (GB),Memory Max (GB),CPU Cores\n';
    Object.values(data.guests).forEach(guest => {
      csv += `${guest.vmid},"${guest.name}",${guest.type},${guest.node},${guest.status},${guest.cpu_current.toFixed(2)},${guest.mem_used_gb.toFixed(2)},${guest.mem_max_gb.toFixed(2)},${guest.cpu_cores || 0}\n`;
    });
    saveBlob(csv, 'text/csv', `proxbalance-guests-${new Date().toISOString()}.csv`);
  };

  const importConfig = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Import configuration?\n\nThis will replace all current settings. Your current configuration will be backed up automatically.\n\nAre you sure?')) {
      e.target.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    fetch(`${API_BASE}/config/import`, { method: 'POST', body: formData })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          alert('Configuration imported successfully!\n\n' +
                (result.validation_warnings?.length > 0
                  ? 'Warnings:\n' + result.validation_warnings.join('\n')
                  : 'Services will restart automatically.'));
          setTimeout(() => window.location.reload(), 2000);
        } else {
          let errorMsg = 'Failed to import configuration:\n' + result.error;
          if (result.validation_errors?.length > 0) errorMsg += '\n\nValidation Errors:\n' + result.validation_errors.join('\n');
          if (result.validation_warnings?.length > 0) errorMsg += '\n\nWarnings:\n' + result.validation_warnings.join('\n');
          alert(errorMsg);
        }
      })
      .catch(error => alert('Error importing configuration: ' + error.message))
      .finally(() => { e.target.value = ''; });
  };

  const createBackup = () => {
    fetch(`${API_BASE}/config/backup`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(response => response.json())
      .then(result => alert(result.success ? 'Backup created successfully!\n\nFile: ' + result.backup_file : 'Failed to create backup: ' + result.error))
      .catch(error => alert('Error creating backup: ' + error.message));
  };

  return (
    <div className="space-y-6">
      <ActionGroup title="Services" note="Check a service's log before restarting it. A restart briefly interrupts the dashboard or data collection.">
        <ActionRow
          title="API service"
          detail="proxmox-balance · serves this dashboard and the REST API"
          below={openLog === 'proxmox-balance' && <LogViewer service="proxmox-balance" onClose={() => setOpenLog(null)} />}
        >
          {logButton('proxmox-balance')}
          <button onClick={() => restartService('proxmox-balance', 'the API service', 'This will briefly interrupt data collection.', setError)} className={BTN_ROW_CAUTION}>
            <RefreshCw size={12} /> Restart
          </button>
        </ActionRow>
        <ActionRow
          title="Data collector"
          detail={collectorDetail}
          below={openLog === 'proxmox-collector' && <LogViewer service="proxmox-collector" onClose={() => setOpenLog(null)} />}
        >
          {logButton('proxmox-collector')}
          <button onClick={() => restartService('proxmox-collector', 'the data collector', 'This will restart the background data collection process.', setError)} className={BTN_ROW_CAUTION}>
            <RefreshCw size={12} /> Restart
          </button>
        </ActionRow>
      </ActionGroup>

      <ActionGroup title="Export data">
        <ActionRow title="Cluster snapshot" detail="Everything from the last collection, as JSON">
          <button onClick={() => saveBlob(JSON.stringify(data, null, 2), 'application/json', `proxbalance-data-${new Date().toISOString()}.json`)} disabled={!data} className={BTN_ROW}>
            <Download size={12} /> JSON
          </button>
        </ActionRow>
        <ActionRow title="Guest list" detail={`${guestCount ? `${guestCount} guests` : 'Every guest'} with node, status, CPU and memory, as CSV`}>
          <button onClick={exportGuestsCsv} disabled={!data?.guests} className={BTN_ROW}>
            <Download size={12} /> CSV
          </button>
        </ActionRow>
      </ActionGroup>

      <ActionGroup title="Configuration backup" note="Server backups live in /opt/proxmox-balance-manager/backups/ and rotate automatically (last 5 kept). One is also taken before every import.">
        <ActionRow title="Export settings" detail="Download all settings as JSON, to keep or to move to another instance">
          <button onClick={() => { window.location.href = `${API_BASE}/config/export`; }} className={BTN_ROW}>
            <Download size={12} /> Export
          </button>
        </ActionRow>
        <ActionRow title="Import settings" detail="Replace every setting from a file; services restart afterwards">
          <input type="file" ref={importRef} accept=".json" className="hidden" onChange={importConfig} />
          <button onClick={() => importRef.current?.click()} className={BTN_ROW}>
            <Upload size={12} /> Import…
          </button>
        </ActionRow>
        <ActionRow title="Backup on the server" detail="Save a copy of the current settings on the ProxBalance host">
          <button onClick={createBackup} className={BTN_ROW}>
            <Save size={12} /> Create backup
          </button>
        </ActionRow>
      </ActionGroup>
    </div>
  );
}

/**
 * Settings → Connection ("connection") and Settings → System ("system").
 * Connection holds the Proxmox API token and host; System holds data export,
 * config backup/restore and service restarts. All actions here are immediate.
 */
export default function AdvancedSystemSettings({
  part,
  data, config,
  proxmoxTokenId, setProxmoxTokenId, proxmoxTokenSecret, setProxmoxTokenSecret,
  validatingToken, tokenValidationResult,
  confirmHostChange, setConfirmHostChange,
  validateToken, confirmAndChangeHost,
  error, setError
}) {
  if (part === 'connection') {
    return (
      <div className="space-y-6">
                    <div id="proxmox-api-config">
                      <h3 className="text-lg font-semibold text-pb-text dark:text-white mb-4">Proxmox API Configuration</h3>
                      <div className="space-y-4 p-4 bg-pb-surface2 dark:bg-slate-700/50 rounded">
                        <div>
                          <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">
                            API Token ID
                          </label>
                          <input
                            type="text"
                            value={proxmoxTokenId}
                            onChange={(e) => setProxmoxTokenId(e.target.value)}
                            placeholder="proxbalance@pam!proxbalance"
                            className={`${INPUT_FIELD} font-mono`}
                          />
                          <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                            Format: user@realm!tokenname (e.g., proxbalance@pam!proxbalance)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">
                            API Token Secret
                          </label>
                          <input
                            type="password"
                            value={proxmoxTokenSecret}
                            onChange={(e) => setProxmoxTokenSecret(e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className={`${INPUT_FIELD} font-mono`}
                          />
                          <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                            The UUID token secret from Proxmox
                          </p>
                        </div>
                        <button
                          onClick={validateToken}
                          disabled={validatingToken || !proxmoxTokenId || !proxmoxTokenSecret}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {validatingToken ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              Validating Token...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              Validate Token & Check Permissions
                            </>
                          )}
                        </button>

                        {tokenValidationResult && (
                          <div className={`p-4 rounded border ${
                            tokenValidationResult.success
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}>
                            <div className="flex items-start gap-2">
                              {tokenValidationResult.success ? (
                                <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className={`font-semibold text-sm mb-1 ${
                                  tokenValidationResult.success
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-red-800 dark:text-red-200'
                                }`}>
                                  {tokenValidationResult.message}
                                </p>
                                {tokenValidationResult.success && (
                                  <>
                                    {tokenValidationResult.version && (
                                      <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                                        Proxmox VE Version: {tokenValidationResult.version}
                                      </p>
                                    )}
                                    {tokenValidationResult.permissions && tokenValidationResult.permissions.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">
                                          Token Permissions:
                                        </p>
                                        <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 ml-4">
                                          {tokenValidationResult.permissions.map((perm, idx) => (
                                            <li key={idx} className="flex items-start gap-1">
                                              <span className="text-green-600 dark:text-green-400">•</span>
                                              <span>{perm}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Tip:</strong> Use the installation script to automatically create an API token with proper permissions. Click "Validate Token" after entering credentials to verify connectivity and check permissions.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-pb-text dark:text-white mb-4">Proxmox Host Configuration</h3>
                      <div className="space-y-4 p-4 bg-pb-surface2 dark:bg-slate-700/50 rounded">
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Current Proxmox Host:</strong> {config?.proxmox_host || 'Not configured'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">
                            New Proxmox Host IP/Hostname
                          </label>
                          <input
                            type="text"
                            id="proxmoxHostInput"
                            defaultValue={config?.proxmox_host || ''}
                            placeholder="10.0.0.3 or pve-node1"
                            className={INPUT_FIELD}
                          />
                          <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                            IP address or hostname of the Proxmox node to connect to
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newHost = document.getElementById('proxmoxHostInput').value.trim();
                            if (!newHost) {
                              setError('Please enter a valid Proxmox host');
                              return;
                            }

                            // Two-click pattern: first click sets confirm state, second click executes
                            if (confirmHostChange === newHost) {
                              // Second click - execute the change
                              confirmAndChangeHost();
                            } else {
                              // First click - set confirm state
                              setConfirmHostChange(newHost);
                            }
                          }}
                          className={`w-full px-4 py-2 text-pb-text dark:text-white rounded font-medium flex items-center justify-center gap-1.5 ${
                            confirmHostChange
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          {confirmHostChange ? (<><AlertTriangle size={14} /> Click again to confirm</>) : (<><Server size={14} /> Update Proxmox Host</>)}
                        </button>
                      </div>
                    </div>

      </div>
    );
  }

  return <SystemActions data={data} config={config} setError={setError} />;
}
