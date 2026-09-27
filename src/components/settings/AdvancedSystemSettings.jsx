import {
  ChevronDown, Save, CheckCircle, AlertCircle, AlertTriangle,
  RefreshCw, Download, Upload, Server, Terminal, X
} from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';
import {
  GLASS_CARD, INPUT_FIELD, ICON, INNER_CARD, BTN_SECONDARY, BTN_DANGER, BANNER_SUCCESS, BANNER_WARN,
} from '../../utils/designTokens.js';
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
      {text != null && shown.length > 0 && (
        <p className="text-[11px] text-pb-text3 dark:text-gray-500 mt-1.5">
          Newest {shown.length} {problemsOnly ? 'warning/error' : ''} line{shown.length !== 1 ? 's' : ''} of the last {lines.length} journal lines. Download keeps all of them.
        </p>
      )}
    </div>
  );
}

const BANNER_ERROR =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300';
const NOTICE_STYLE = { ok: BANNER_SUCCESS, warn: BANNER_WARN, error: BANNER_ERROR };
const NOTICE_ICON = { ok: CheckCircle, warn: AlertTriangle, error: AlertCircle };

/** In-page result message under a row, replacing alert(). */
function Notice({ notice, onDismiss }) {
  if (!notice) return null;
  const Icon = NOTICE_ICON[notice.tone] || AlertCircle;
  return (
    <div className="px-4 pb-3" role="status">
      <div className={`${NOTICE_STYLE[notice.tone] || BANNER_ERROR} !items-start text-sm`}>
        <Icon size={16} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="break-words">{notice.text}</div>
          {notice.lines?.length > 0 && (
            <ul className="mt-1 text-xs list-disc pl-4 space-y-0.5">
              {notice.lines.map((l, i) => <li key={i} className="break-words">{l}</li>)}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" title="Dismiss" aria-label="Dismiss">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** In-page confirmation under a row, replacing confirm(). */
function ConfirmStrip({ text, confirmLabel, busy, onConfirm, onCancel }) {
  return (
    <div className="px-4 pb-3">
      <div className={`${BANNER_WARN} flex-wrap text-sm`}>
        <AlertTriangle size={16} className="shrink-0" />
        <span className="flex-1 min-w-[12rem]">{text}</span>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} disabled={busy} className={BTN_ROW}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} className={`${BTN_DANGER} !px-3 !py-1.5 !gap-1.5 text-xs`}>
            {busy ? <RefreshCw size={12} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const SERVICES = [
  {
    id: 'proxmox-balance',
    title: 'API service',
    name: 'the API service',
    about: 'serves this dashboard and the REST API',
    restartEffect: 'The dashboard stops answering for a few seconds while it restarts.',
  },
  {
    id: 'proxmox-collector',
    title: 'Data collector',
    name: 'the data collector',
    about: null, // filled with last run, duration and interval
    restartEffect: 'A collection in progress is cut short and starts again.',
  },
];

/** Settings → System: service logs and restarts, data export, config backup and restore. */
function SystemActions({ data, config }) {
  const [openLog, setOpenLog] = useState(null);
  const [confirmRestart, setConfirmRestart] = useState(null); // service id
  const [restarting, setRestarting] = useState(null);
  const [restartNotice, setRestartNotice] = useState({});     // service id -> notice
  const [importFile, setImportFile] = useState(null);         // File awaiting confirmation
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupNotice, setBackupNotice] = useState(null);
  const importRef = useRef(null);

  const perf = data?.performance;
  const interval = config?.collection_interval_minutes;
  const guestCount = data?.guests ? Object.keys(data.guests).length : 0;
  const collectorDetail = [
    'proxmox-collector',
    data?.collected_at ? `last run ${formatRelativeTime(data.collected_at).toLowerCase()}` : 'no run yet',
    perf?.total_time != null && `took ${perf.total_time}s`,
    interval && `every ${interval} min`,
  ].filter(Boolean).join(' · ');

  const restart = async (svc) => {
    setRestarting(svc.id);
    try {
      const response = await fetch(`${API_BASE}/system/restart-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: svc.id }),
      });
      const result = await response.json().catch(() => ({}));
      setRestartNotice(prev => ({
        ...prev,
        [svc.id]: result.success
          ? { tone: 'ok', text: `${svc.title} restarted at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.` }
          : { tone: 'error', text: `Restart failed: ${result.error || `HTTP ${response.status}`}` },
      }));
    } catch (err) {
      // Restarting the API can drop the very request that asked for it.
      setRestartNotice(prev => ({
        ...prev,
        [svc.id]: svc.id === 'proxmox-balance'
          ? { tone: 'warn', text: 'Restart sent. The API dropped the connection while restarting; the dashboard reconnects on its next refresh.' }
          : { tone: 'error', text: `Restart failed: ${err.message}` },
      }));
    } finally {
      setRestarting(null);
      setConfirmRestart(null);
    }
  };

  const exportGuestsCsv = () => {
    if (!data || !data.guests) return;
    const num = (v) => (typeof v === 'number' ? v.toFixed(2) : '');
    let csv = 'VMID,Name,Type,Node,Status,CPU Usage (%),Memory Used (GB),Memory Max (GB),CPU Cores\n';
    Object.values(data.guests).forEach(guest => {
      csv += `${guest.vmid},"${String(guest.name || '').replace(/"/g, '""')}",${guest.type},${guest.node},${guest.status},${num(guest.cpu_current)},${num(guest.mem_used_gb)},${num(guest.mem_max_gb)},${guest.cpu_cores || 0}\n`;
    });
    saveBlob(csv, 'text/csv', `proxbalance-guests-${new Date().toISOString()}.csv`);
  };

  const pickImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportNotice(null);
    setImportFile(file);
  };

  const importConfig = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await fetch(`${API_BASE}/config/import`, { method: 'POST', body: formData });
      const result = await response.json().catch(() => ({}));
      const warnings = result.validation_warnings || [];
      if (result.success) {
        setImportNotice({
          tone: warnings.length ? 'warn' : 'ok',
          text: `Imported ${importFile.name}. Services restart automatically; this page reloads in a moment.`,
          lines: warnings,
        });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setImportNotice({
          tone: 'error',
          text: `Import failed: ${result.error || `HTTP ${response.status}`}. Nothing was changed.`,
          lines: [...(result.validation_errors || []), ...warnings.map(w => `Warning: ${w}`)],
        });
      }
    } catch (err) {
      setImportNotice({ tone: 'error', text: `Import failed: ${err.message}` });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const createBackup = async () => {
    setBackingUp(true);
    setBackupNotice(null);
    try {
      const response = await fetch(`${API_BASE}/config/backup`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const result = await response.json().catch(() => ({}));
      setBackupNotice(result.success
        ? { tone: 'ok', text: `Backup saved: ${result.backup_file}` }
        : { tone: 'error', text: `Backup failed: ${result.error || `HTTP ${response.status}`}` });
    } catch (err) {
      setBackupNotice({ tone: 'error', text: `Backup failed: ${err.message}` });
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <ActionGroup title="Services" note="Check a service's log before restarting it.">
        {SERVICES.map(svc => (
          <ActionRow
            key={svc.id}
            title={svc.title}
            detail={svc.about ? `${svc.id} · ${svc.about}` : collectorDetail}
            below={<>
              {confirmRestart === svc.id && (
                <ConfirmStrip
                  text={`Restart ${svc.name}? ${svc.restartEffect}`}
                  confirmLabel="Restart now"
                  busy={restarting === svc.id}
                  onConfirm={() => restart(svc)}
                  onCancel={() => setConfirmRestart(null)}
                />
              )}
              <Notice notice={restartNotice[svc.id]} onDismiss={() => setRestartNotice(prev => ({ ...prev, [svc.id]: null }))} />
              {openLog === svc.id && <LogViewer service={svc.id} onClose={() => setOpenLog(null)} />}
            </>}
          >
            <button onClick={() => setOpenLog(prev => (prev === svc.id ? null : svc.id))} className={BTN_ROW} aria-expanded={openLog === svc.id}>
              <Terminal size={12} /> {openLog === svc.id ? 'Hide log' : 'View log'}
            </button>
            <button
              onClick={() => { setRestartNotice(prev => ({ ...prev, [svc.id]: null })); setConfirmRestart(svc.id); }}
              disabled={!!restarting || confirmRestart === svc.id}
              className={BTN_ROW_CAUTION}
            >
              <RefreshCw size={12} /> Restart
            </button>
          </ActionRow>
        ))}
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
          <a href={`${API_BASE}/config/export`} className={BTN_ROW}>
            <Download size={12} /> Export
          </a>
        </ActionRow>
        <ActionRow
          title="Import settings"
          detail="Replace every setting from a file; services restart afterwards"
          below={<>
            {importFile && (
              <ConfirmStrip
                text={`Replace all current settings with ${importFile.name}? The current configuration is backed up first.`}
                confirmLabel="Import"
                busy={importing}
                onConfirm={importConfig}
                onCancel={() => setImportFile(null)}
              />
            )}
            <Notice notice={importNotice} onDismiss={() => setImportNotice(null)} />
          </>}
        >
          <input type="file" ref={importRef} accept=".json" className="hidden" onChange={pickImportFile} />
          <button onClick={() => importRef.current?.click()} disabled={importing} className={BTN_ROW}>
            <Upload size={12} /> Import…
          </button>
        </ActionRow>
        <ActionRow
          title="Backup on the server"
          detail="Save a copy of the current settings on the ProxBalance host"
          below={<Notice notice={backupNotice} onDismiss={() => setBackupNotice(null)} />}
        >
          <button onClick={createBackup} disabled={backingUp} className={BTN_ROW}>
            {backingUp ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />} Create backup
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
                            placeholder="192.168.1.10 or pve-node1"
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

  return <SystemActions data={data} config={config} />;
}
