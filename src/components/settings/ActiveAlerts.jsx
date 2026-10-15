import { ChevronDown } from '../Icons.jsx';
import { INNER_CARD, SELECT_FIELD, BTN_SECONDARY, TAP_TARGET, statusBadge } from '../../utils/designTokens.js';
import { fetchNotificationAlerts, createAlertSilence, deleteAlertSilence } from '../../api/client.js';
const { useState, useEffect, useCallback } = React;

const TYPE_LABELS = {
  resource_threshold: 'node resource alerts',
  capacity_warning: 'cluster health alerts',
  node_status: 'node offline alerts',
  collector_status: 'collection failure alerts',
  failure: 'safety check alerts',
  recommendations: 'suggestion alerts',
  recommendations_urgent: 'urgent suggestion alerts',
};
const typeLabel = (t) => TYPE_LABELS[t] || `${String(t || '').replace(/_/g, ' ')} alerts`;
// Threshold alerts where a low value is the bad side.
const LOWER_IS_WORSE = new Set(['capacity_warning']);

const timeOf = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
function whenText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === new Date().toDateString()) return timeOf(d);
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} ${timeOf(d)}`;
}
const untilText = (s) => (s.until_resolved ? 'until resolved' : `until ${whenText(s.expires_at)}`);

const DURATIONS = [['1h', '1 hour'], ['8h', '8 hours'], ['24h', '24 hours']];

function AlertRow({ alert, settings, onSilence, busy }) {
  const [open, setOpen] = useState(false);
  const n = settings?.resolve_collections ?? 3;
  const margin = settings?.resolve_margin ?? 5;
  const hasLimit = alert.threshold != null;
  const lower = LOWER_IS_WORSE.has(alert.alert_type);
  const clearAt = hasLimit ? (lower ? alert.threshold + margin : alert.threshold - margin) : null;
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 basis-40 flex items-start gap-1.5 text-left text-sm text-pb-text dark:text-gray-200"
        >
          <ChevronDown size={14} className={`mt-0.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {alert.label || alert.subject}
            <span className="text-pb-text2 dark:text-gray-400"> · since {whenText(alert.first_seen)}</span>
          </span>
        </button>
        {alert.silence && (
          <span className={statusBadge('gray')} title={untilText(alert.silence)}>Silenced</span>
        )}
        <select
          value=""
          disabled={busy}
          aria-label="Silence"
          onChange={(e) => {
            const [scope, duration] = e.target.value.split('|');
            if (!duration) return;
            onSilence(scope === 'type' ? { alert_type: alert.alert_type, duration } : { fingerprint: alert.fingerprint, duration });
          }}
          className={`${SELECT_FIELD} ${TAP_TARGET} !w-auto !py-1 text-xs`}
        >
          <option value="">Silence</option>
          <optgroup label="This alert">
            {DURATIONS.map(([d, l]) => <option key={d} value={`one|${d}`}>{l}</option>)}
            <option value="one|resolved">Until resolved</option>
          </optgroup>
          <optgroup label={`All ${typeLabel(alert.alert_type)}`}>
            {DURATIONS.map(([d, l]) => <option key={d} value={`type|${d}`}>{l}</option>)}
            <option value="type|resolved">Until all resolve</option>
          </optgroup>
        </select>
      </div>
      {open && (
        <div className="mt-1 pl-5 text-xs text-pb-text2 dark:text-gray-400 space-y-0.5 [overflow-wrap:anywhere]">
          {hasLimit && <div>Limit {alert.threshold}</div>}
          <div>
            Resolves after {n} checks in a row{hasLimit ? ` at ${lower ? '≥' : '≤'} ${clearAt}` : ' without it'} · {alert.clear_count || 0}/{n} so far
          </div>
          <div>
            {alert.notified_at ? `Notified ${whenText(alert.notified_at)}` : alert.silence ? 'Not notified: silenced' : 'Not notified: event type or channels off'}
            {alert.repeats ? ` · ${alert.repeats} repeat${alert.repeats === 1 ? '' : 's'} suppressed` : ''}
          </div>
          <div className="font-mono">{alert.fingerprint}</div>
        </div>
      )}
    </li>
  );
}

/** Active alerts with a Silence menu per row, and the active silences. */
export default function ActiveAlerts() {
  const [data, setData] = useState(null);   // { alerts, silences, settings } or null
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetchNotificationAlerts();
    if (r.error) { setError(r.message); return; }
    setError(null);
    setData(r);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (fn) => {
    setBusy(true);
    const r = await fn();
    if (r?.error) setError(r.message);
    await load();
    setBusy(false);
  };

  if (!data) {
    return error ? <p className="text-xs text-red-600 dark:text-red-400">Active alerts: {error}</p> : null;
  }

  const alerts = data.alerts || [];
  const silences = data.silences || [];
  const labelOf = (fp) => alerts.find(a => a.fingerprint === fp)?.label || fp;

  return (
    <div className={INNER_CARD}>
      <div className="font-medium text-pb-text dark:text-gray-300 mb-2">
        Active alerts{alerts.length ? ` · ${alerts.length}` : ''}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-pb-text2 dark:text-gray-400">None</p>
      ) : (
        <ul className="divide-y divide-pb-border dark:divide-gray-700">
          {alerts.map(a => (
            <AlertRow key={a.fingerprint} alert={a} settings={data.settings} busy={busy}
              onSilence={(body) => act(() => createAlertSilence(body))} />
          ))}
        </ul>
      )}

      {silences.length > 0 && (
        <div className="mt-3 pt-3 border-t border-pb-border dark:border-gray-700">
          <div className="text-xs font-medium text-pb-text dark:text-gray-300 mb-1">Silences</div>
          <ul className="space-y-1">
            {silences.map(s => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 basis-40 text-pb-text dark:text-gray-200 [overflow-wrap:anywhere]">
                  {s.fingerprint ? labelOf(s.fingerprint) : `All ${typeLabel(s.alert_type)}`}
                  <span className="text-pb-text2 dark:text-gray-400"> · {untilText(s)}</span>
                </span>
                <button type="button" disabled={busy}
                  onClick={() => act(() => deleteAlertSilence(s.id))}
                  className={`${TAP_TARGET} ${BTN_SECONDARY} !px-2.5 !py-1 text-xs`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
