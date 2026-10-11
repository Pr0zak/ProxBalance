import {
  Save, CheckCircle, AlertCircle, AlertTriangle,
  RefreshCw, Download, Upload, Server, Terminal, X, Lock, Play
} from '../Icons.jsx';
import { API_BASE } from '../../utils/constants.js';
import {
  INPUT_FIELD, ICON, INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, BANNER_SUCCESS, BANNER_WARN, statusBadge,
} from '../../utils/designTokens.js';
import { formatRelativeTime } from '../../utils/formatters.js';
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
export function LogViewer({ service, onClose }) {
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
    action: 'restart',
    confirm: 'The dashboard stops answering for a few seconds while it restarts.',
  },
  {
    id: 'proxmox-collector',
    title: 'Data collector',
    name: 'the data collector',
    about: 'gathers metrics from Proxmox',
    action: 'run',
  },
  {
    id: 'proxmox-balance-automigrate',
    title: 'Automated migrations',
    name: 'the automated migration check',
    about: 'checks the cluster and migrates guests when automation is on',
    action: 'run',
    confirm: 'If automation is on and not in dry-run mode, this can start migrations right away.',
  },
  {
    id: 'proxmox-balance-recommendations',
    title: 'Suggestions',
    name: 'the suggestion generator',
    about: 'refreshes migration suggestions',
    action: 'run',
  },
];

const clock = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "in 12m" / "in 2h" / "now" for a future ISO time. */
function untilText(iso) {
  const ms = new Date(iso) - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms < 60000) return 'any moment';
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  return `in ${h}h${m % 60 ? ` ${m % 60}m` : ''}`;
}

/** One-line state of a unit from GET /api/system/services, or null. */
export function unitState(st) {
  if (!st) return null;
  const rel = (iso) => formatRelativeTime(iso).replace('Just now', 'just now');
  if (!st.timer) {
    const up = st.active_state === 'active';
    return {
      tone: up ? 'green' : 'red',
      text: up ? `Running${st.since ? ` since ${rel(st.since)}` : ''}` : `Not running (${st.active_state})`,
    };
  }
  const parts = [];
  let tone = 'gray';
  if (st.result === 'running') { parts.push('Running now'); tone = 'blue'; }
  else if (st.last_start) {
    const failed = st.result === 'failed';
    tone = failed ? 'red' : 'green';
    parts.push(`Last run ${rel(st.last_end || st.last_start)} · ${failed ? `failed${st.exit_status && st.exit_status !== '0' ? ` (exit ${st.exit_status})` : ''}` : 'succeeded'}`);
  } else parts.push('No run since boot');
  if (!st.timer.active) { parts.push('timer off'); tone = 'yellow'; }
  else if (st.timer.next) parts.push(`next ${untilText(st.timer.next)}`);
  return { tone, text: parts.join(' · ') };
}

export const STATE_TEXT = {
  green: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  blue: 'text-pb-accent dark:text-pb-accent-dark',
  gray: 'text-pb-text2 dark:text-gray-400',
};

/** Settings → System: service logs and restarts, data export, config backup and restore. */
function SystemActions({ data, config }) {
  const [openLog, setOpenLog] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);   // service id awaiting confirmation
  const [busy, setBusy] = useState(null);
  const [actionNotice, setActionNotice] = useState({});       // service id -> notice
  const [unitStatus, setUnitStatus] = useState(null);         // GET /api/system/services → services
  const [importFile, setImportFile] = useState(null);         // File awaiting confirmation
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupNotice, setBackupNotice] = useState(null);
  const importRef = useRef(null);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/services`);
      const body = await res.json();
      if (body?.success && body.services) setUnitStatus(body.services);
    } catch (e) { /* older backend or offline: rows fall back to static text */ }
  };
  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 60000);
    return () => clearInterval(t);
  }, []);
  // A run takes a few seconds; look again shortly after starting one.
  const refreshSoon = () => { setTimeout(loadStatus, 3000); setTimeout(loadStatus, 15000); };

  const perf = data?.performance;
  const interval = config?.collection_interval_minutes;
  const guestCount = data?.guests ? Object.keys(data.guests).length : 0;
  const detailFor = (svc) => {
    if (svc.id !== 'proxmox-collector') return `${svc.id} · ${svc.about}`;
    return [
      svc.id,
      perf?.total_time != null && `last took ${perf.total_time}s`,
      interval && `every ${interval} min`,
    ].filter(Boolean).join(' · ');
  };

  const runAction = async (svc) => {
    setBusy(svc.id);
    const restart = svc.action === 'restart';
    try {
      const response = await fetch(`${API_BASE}/system/${restart ? 'restart-service' : 'run-service'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: svc.id }),
      });
      const result = await response.json().catch(() => ({}));
      setActionNotice(prev => ({
        ...prev,
        [svc.id]: result.success
          ? { tone: 'ok', text: restart ? `${svc.title} restarted at ${clock(new Date())}.` : `${svc.title} started at ${clock(new Date())}. Its log shows the result.` }
          : { tone: 'error', text: `${restart ? 'Restart' : 'Run'} failed: ${result.error || `HTTP ${response.status}`}` },
      }));
      if (result.success) refreshSoon();
    } catch (err) {
      // Restarting the API can drop the very request that asked for it.
      setActionNotice(prev => ({
        ...prev,
        [svc.id]: svc.id === 'proxmox-balance'
          ? { tone: 'warn', text: 'Restart sent. The API dropped the connection while restarting; the dashboard reconnects on its next refresh.' }
          : { tone: 'error', text: `${restart ? 'Restart' : 'Run'} failed: ${err.message}` },
      }));
    } finally {
      setBusy(null);
      setConfirmAction(null);
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
      <ActionGroup title="Services" note="Check a service's log before restarting it. Times update every minute.">
        {SERVICES.map(svc => {
          const state = unitState(unitStatus?.[svc.id]);
          const ActionIcon = svc.action === 'restart' ? RefreshCw : Play;
          return (
            <ActionRow
              key={svc.id}
              title={svc.title}
              detail={<>
                {state && <span className={`block ${STATE_TEXT[state.tone]}`}>{state.text}</span>}
                <span className="block break-words">{detailFor(svc)}</span>
              </>}
              below={<>
                {confirmAction === svc.id && (
                  <ConfirmStrip
                    text={`${svc.action === 'restart' ? 'Restart' : 'Run'} ${svc.name} now? ${svc.confirm}`}
                    confirmLabel={svc.action === 'restart' ? 'Restart now' : 'Run now'}
                    busy={busy === svc.id}
                    onConfirm={() => runAction(svc)}
                    onCancel={() => setConfirmAction(null)}
                  />
                )}
                <Notice notice={actionNotice[svc.id]} onDismiss={() => setActionNotice(prev => ({ ...prev, [svc.id]: null }))} />
                {openLog === svc.id && <LogViewer service={svc.id} onClose={() => setOpenLog(null)} />}
              </>}
            >
              <button onClick={() => setOpenLog(prev => (prev === svc.id ? null : svc.id))} className={BTN_ROW} aria-expanded={openLog === svc.id}>
                <Terminal size={12} /> {openLog === svc.id ? 'Hide log' : 'View log'}
              </button>
              <button
                onClick={() => {
                  setActionNotice(prev => ({ ...prev, [svc.id]: null }));
                  if (svc.confirm) setConfirmAction(svc.id); else runAction(svc);
                }}
                disabled={!!busy || confirmAction === svc.id || unitStatus?.[svc.id]?.result === 'running'}
                className={svc.action === 'restart' ? BTN_ROW_CAUTION : BTN_ROW}
              >
                {busy === svc.id ? <RefreshCw size={12} className="animate-spin" /> : <ActionIcon size={12} />}
                {svc.action === 'restart' ? 'Restart' : 'Run now'}
              </button>
            </ActionRow>
          );
        })}
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

const LAST_VALIDATION_KEY = 'proxbalance.lastTokenValidation';
const readLastValidation = () => {
  try { return JSON.parse(localStorage.getItem(LAST_VALIDATION_KEY)) || null; } catch (e) { return null; }
};
const LABEL = 'block text-sm font-medium text-pb-text dark:text-gray-300 mb-1';
const HELP = 'text-xs text-pb-text2 dark:text-gray-400 mt-1';

/** Settings → Connection: Proxmox API token and host. */
function ConnectionSettings({
  config,
  proxmoxTokenId, setProxmoxTokenId, proxmoxTokenSecret, setProxmoxTokenSecret,
  validatingToken, tokenValidationResult,
  confirmHostChange, setConfirmHostChange,
  validateToken, confirmAndChangeHost, setError,
}) {
  const storedSecret = config?.proxmox_api_token_secret ?? '';
  // Older backends only show the '***' placeholder; newer ones add a flag too.
  const secretSaved = config?.proxmox_api_token_secret_set ?? storedSecret === '***';
  const [replacing, setReplacing] = useState(false);
  // A reload after saving closes the replace field again.
  useEffect(() => { setReplacing(false); }, [storedSecret]);
  const showSecretInput = !secretSaved || replacing || proxmoxTokenSecret !== storedSecret;

  // Last validation outcome survives reloads (kept in this browser only).
  const [lastValidation, setLastValidation] = useState(readLastValidation);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    if (!tokenValidationResult) return;
    const entry = {
      success: !!tokenValidationResult.success,
      message: tokenValidationResult.message,
      version: tokenValidationResult.version,
      tokenId: proxmoxTokenId,
      at: new Date().toISOString(),
    };
    setLastValidation(entry);
    setShowDetails(true);
    try { localStorage.setItem(LAST_VALIDATION_KEY, JSON.stringify(entry)); } catch (e) { /* storage blocked */ }
  }, [tokenValidationResult]);

  const canValidate = !validatingToken && proxmoxTokenId && (showSecretInput ? proxmoxTokenSecret : secretSaved);
  const lastAge = lastValidation ? formatRelativeTime(lastValidation.at).replace('Just now', 'just now') : '';
  const lastStale = lastValidation && lastValidation.tokenId && lastValidation.tokenId !== proxmoxTokenId;
  const perms = tokenValidationResult?.success ? tokenValidationResult.permissions || [] : [];

  const [hostDraft, setHostDraft] = useState(config?.proxmox_host || '');
  useEffect(() => { setHostDraft(config?.proxmox_host || ''); }, [config?.proxmox_host]);
  const submitHost = () => {
    const newHost = hostDraft.trim();
    if (!newHost) { setError('Please enter a valid Proxmox host'); return; }
    // Two clicks: the first arms the change, the second applies it.
    if (confirmHostChange === newHost) confirmAndChangeHost();
    else setConfirmHostChange(newHost);
  };

  return (
    <div className="space-y-6">
      <div id="proxmox-api-config">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-pb-text2 dark:text-gray-400 mb-2">API token</h3>
        <div className={`${INNER_CARD} space-y-4`}>
          <div>
            <label className={LABEL} htmlFor="pb-token-id">Token ID</label>
            <input
              id="pb-token-id" type="text" value={proxmoxTokenId}
              onChange={(e) => setProxmoxTokenId(e.target.value)}
              placeholder="proxbalance@pam!proxbalance"
              className={`${INPUT_FIELD} font-mono sm:max-w-lg`}
            />
            <p className={HELP}>user@realm!tokenname</p>
          </div>

          <div>
            <label className={LABEL} htmlFor="pb-token-secret">Token secret</label>
            {showSecretInput ? (
              <div className="flex items-center gap-2">
                <input
                  id="pb-token-secret" type="password" autoFocus={replacing}
                  value={proxmoxTokenSecret === '***' ? '' : proxmoxTokenSecret}
                  onChange={(e) => setProxmoxTokenSecret(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoComplete="new-password"
                  className={`${INPUT_FIELD} font-mono sm:max-w-lg`}
                />
                {secretSaved && (
                  <button
                    onClick={() => { setProxmoxTokenSecret(storedSecret); setReplacing(false); }}
                    className={BTN_ROW}
                    title="Keep the saved secret"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className={statusBadge('green')}><Lock size={12} /> Saved · hidden</span>
                <button
                  onClick={() => setReplacing(true)}
                  className={BTN_ROW}
                >
                  Replace
                </button>
              </div>
            )}
            <p className={HELP}>
              {showSecretInput && secretSaved
                ? 'Leave empty to keep the saved secret.'
                : 'The UUID shown once when the token was created in Proxmox. Never sent back to the browser.'}
            </p>
          </div>

          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
            <button onClick={validateToken} disabled={!canValidate} className={BTN_PRIMARY}>
              {validatingToken ? <RefreshCw size={ICON.action} className="animate-spin" /> : <CheckCircle size={ICON.action} />}
              {validatingToken ? 'Checking…' : 'Validate token'}
            </button>
            {lastValidation && !validatingToken && (
              <span
                className={`text-sm min-w-0 ${lastValidation.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                title={lastValidation.message}
              >
                {lastValidation.success
                  ? `Valid${lastValidation.version ? ` · PVE ${lastValidation.version}` : ''}`
                  : `Failed: ${lastValidation.message || 'unknown error'}`}
                <span className="text-pb-text3 dark:text-gray-500"> · {lastAge}{lastStale ? ' · different token ID' : ''}</span>
              </span>
            )}
            {perms.length > 0 && (
              <button onClick={() => setShowDetails(v => !v)} className="text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 underline-offset-2 hover:underline">
                {showDetails ? 'Hide permissions' : 'Show permissions'}
              </button>
            )}
          </div>
          {showDetails && perms.length > 0 && (
            <ul className="text-xs text-pb-text2 dark:text-gray-400 space-y-0.5">
              {perms.map((perm, idx) => <li key={idx}>{perm}</li>)}
            </ul>
          )}
          <p className="text-xs text-pb-text3 dark:text-gray-500">
            The installer creates a token with the right permissions. Validating checks the token against the current host.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-pb-text2 dark:text-gray-400 mb-2">Proxmox host</h3>
        <div className={`${INNER_CARD} space-y-3`}>
          <div className="text-sm text-pb-text2 dark:text-gray-400">
            Connected to <span className="font-mono font-medium text-pb-text dark:text-gray-200">{config?.proxmox_host || 'not configured'}</span>
          </div>
          <div>
            <label className={LABEL} htmlFor="proxmoxHostInput">New host IP or hostname</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text" id="proxmoxHostInput"
                value={hostDraft}
                onChange={(e) => { setHostDraft(e.target.value); if (confirmHostChange) setConfirmHostChange(null); }}
                placeholder="192.168.1.10 or pve-node1"
                className={`${INPUT_FIELD} sm:max-w-xs`}
              />
              <button
                onClick={submitHost}
                disabled={!hostDraft.trim() || hostDraft.trim() === config?.proxmox_host}
                className={`${confirmHostChange ? BTN_ROW_CAUTION : BTN_SECONDARY} !py-2 self-start sm:self-auto`}
              >
                {confirmHostChange ? <><AlertTriangle size={14} /> Click again to switch</> : <><Server size={14} /> Change host</>}
              </button>
            </div>
            <p className={HELP}>Any node in the cluster works; the collector restarts against the new host.</p>
          </div>
        </div>
      </div>
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
  error, setError,
  ...connection
}) {
  if (part === 'connection') {
    return <ConnectionSettings config={config} setError={setError} {...connection} />;
  }

  return <SystemActions data={data} config={config} />;
}
