import { CheckCircle, AlertTriangle, XCircle, MinusCircle, RefreshCw, Copy, Check, ChevronDown, Loader } from '../Icons.jsx';
import { BTN_PRIMARY, BTN_SECONDARY, INNER_CARD, TAP_TARGET } from '../../utils/designTokens.js';
import { fetchDiagnostics } from '../../api/client.js';
import { summaryText, formatReport } from '../../utils/diagnosticsReport.js';
import { formatRelativeTime } from '../../utils/formatters.js';

const { useState, useEffect } = React;

const STATUS_ICON = {
  pass: { Icon: CheckCircle, cls: 'text-emerald-600 dark:text-emerald-400', label: 'Pass' },
  warn: { Icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400', label: 'Warning' },
  fail: { Icon: XCircle, cls: 'text-red-600 dark:text-red-400', label: 'Fail' },
  skip: { Icon: MinusCircle, cls: 'text-slate-400 dark:text-slate-500', label: 'Skipped' },
};

// Clipboard write that also works on plain-HTTP origins.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

function CheckRow({ r }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_ICON[r.status] || STATUS_ICON.skip;
  const hasDetails = r.details && Object.keys(r.details).length > 0;
  return (
    <li className="py-2.5">
      <button
        type="button"
        onClick={() => hasDetails && setOpen(o => !o)}
        aria-expanded={hasDetails ? open : undefined}
        className={`w-full flex items-start gap-2.5 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`mt-0.5 shrink-0 ${s.cls}`} title={s.label} aria-label={s.label}><s.Icon size={16} /></span>
        <span className="flex-1 min-w-0 sm:flex sm:gap-3">
          <span className="block sm:w-44 shrink-0 text-sm font-medium text-pb-text dark:text-gray-200">{r.name}</span>
          <span className="block text-sm text-pb-text2 dark:text-gray-400 break-words">{r.fact}</span>
        </span>
        {hasDetails && (
          <ChevronDown size={14} className={`mt-1 shrink-0 text-pb-text3 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && hasDetails && (
        <pre className={`${INNER_CARD} mt-2 ml-6 text-xs text-pb-text2 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap break-all`}>
          {JSON.stringify(r.details, null, 2)}
        </pre>
      )}
    </li>
  );
}

/** Settings → Diagnostics: runs read-only checks when opened and on "Run again". */
export default function DiagnosticsSection({ active, systemInfo, onResult }) {
  const [run, setRun] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const start = async () => {
    setRunning(true);
    setError(null);
    const res = await fetchDiagnostics();
    if (res?.error || !res?.results) {
      setError(res?.message || 'Diagnostics did not return results');
    } else {
      setRun(res);
      onResult?.(res);
    }
    setRunning(false);
  };

  // Run the first time the section is opened.
  useEffect(() => {
    if (active && !run && !running && !error) start();
  }, [active]);

  const copy = async () => {
    const ok = await copyText(formatReport(run, { version: systemInfo?.version }));
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  const groups = [];
  for (const r of run?.results || []) {
    const g = groups.find(x => x.name === r.group);
    if (g) g.items.push(r); else groups.push({ name: r.group, items: [r] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button type="button" onClick={start} disabled={running} className={`${BTN_PRIMARY} ${TAP_TARGET}`}>
          {running ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {running ? 'Running…' : (run ? 'Run again' : 'Run checks')}
        </button>
        <button type="button" onClick={copy} disabled={!run || running} className={`${BTN_SECONDARY} ${TAP_TARGET}`}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy as text'}
        </button>
        {run && (
          <span className="text-xs text-pb-text3 dark:text-gray-500 w-full sm:w-auto sm:ml-auto">
            {summaryText(run.summary)} · {formatRelativeTime(run.ran_at)}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
      {!run && running && <p className="text-sm text-pb-text2 dark:text-gray-400">Checking the API, nodes, storage and services…</p>}

      {groups.map(g => (
        <div key={g.name} className="mb-4 last:mb-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-pb-text3 dark:text-gray-500 mb-1">{g.name}</h3>
          <ul className="divide-y divide-slate-200 dark:divide-pb-border-dark">
            {g.items.map(r => <CheckRow key={r.id} r={r} />)}
          </ul>
        </div>
      ))}

      {run && (
        <p className="text-xs text-pb-text3 dark:text-gray-500 mt-3">
          Read-only: these checks change nothing. Tap a line for raw values. Copied text has secrets removed.
        </p>
      )}
    </div>
  );
}
