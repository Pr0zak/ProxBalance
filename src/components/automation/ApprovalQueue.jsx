import { Check, X, ChevronDown, Loader } from '../Icons.jsx';
import { BTN_PRIMARY, BTN_SECONDARY, TAP_TARGET, statusBadge } from '../../utils/designTokens.js';
import { approvalRow } from '../../utils/automationStory.js';
import { approveQueuedMove, dismissQueuedMove } from '../../api/client.js';

const { useState } = React;

function QueueRow({ entry, dryRun, busy, onAction }) {
  const [open, setOpen] = useState(false);
  const r = approvalRow(entry);
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs min-w-0">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1.5 min-w-0 text-left"
          aria-expanded={open}
          title={open ? 'Hide details' : 'Show details'}
        >
          <ChevronDown size={12} className={`shrink-0 text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          <span className="font-medium text-pb-text dark:text-gray-200">{r.name}</span>
        </button>
        {r.route && <span className="font-mono text-pb-text2 dark:text-gray-400">{r.route}</span>}
        {r.why && <span className="text-pb-text2 dark:text-gray-400 min-w-0 break-words">{r.why}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          {r.approved ? (
            <span className={statusBadge('green')} title="Runs on the next check if every rule still allows it">approved</span>
          ) : (
            <button
              type="button"
              onClick={() => onAction(entry.vmid, 'approve')}
              disabled={dryRun || busy}
              title={dryRun ? 'Dry run is on: nothing would move' : 'Run this move now, with every rule checked again'}
              className={`${BTN_PRIMARY} ${TAP_TARGET} !px-2.5 !py-1 !text-xs !gap-1`}
            >
              {busy === 'approve' ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
              Approve
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction(entry.vmid, 'dismiss')}
            disabled={busy}
            title="Don't ask about this move again until it expires or its target changes"
            className={`${BTN_SECONDARY} ${TAP_TARGET} !px-2.5 !py-1 !text-xs !gap-1`}
          >
            {busy === 'dismiss' ? <Loader size={12} className="animate-spin" /> : <X size={12} />}
            Dismiss
          </button>
        </span>
      </div>
      {open && r.detail && (
        <div className="mt-1 pl-[18px] text-[11px] text-pb-text2 dark:text-gray-500 break-words">{r.detail}</div>
      )}
    </li>
  );
}

/**
 * "Waiting for approval" list for semi-automatic mode: guest, from → to,
 * why, and Approve / Dismiss. Reads the queue from automation status and
 * refreshes it after each action. Renders nothing when the queue is empty.
 */
export default function ApprovalQueue({ queue, dryRun, onChanged }) {
  const [busy, setBusy] = useState({}); // vmid -> 'approve' | 'dismiss'
  const [message, setMessage] = useState(null); // { tone, text }
  const items = (queue || []).filter(e => e?.status !== 'dismissed');
  if (items.length === 0 && !message) return null;

  const onAction = async (vmid, action) => {
    setBusy(b => ({ ...b, [vmid]: action }));
    const result = action === 'approve' ? await approveQueuedMove(vmid) : await dismissQueuedMove(vmid);
    setBusy(b => { const n = { ...b }; delete n[vmid]; return n; });
    if (result?.error) setMessage({ tone: 'error', text: result.message });
    else setMessage(action === 'approve' && result?.message ? { tone: 'ok', text: result.message } : null);
    onChanged?.();
  };

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-pb-text dark:text-gray-200 mb-1.5">
        Waiting for approval{items.length > 0 && <span className="ml-1 tabular-nums text-pb-text2 dark:text-gray-400 font-normal">{items.length}</span>}
        {dryRun && items.length > 0 && <span className="ml-2 font-normal text-amber-700 dark:text-amber-400">dry run is on, approving is off</span>}
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
          {items.map(e => (
            <QueueRow key={e.vmid} entry={e} dryRun={dryRun} busy={busy[e.vmid]} onAction={onAction} />
          ))}
        </ul>
      )}
      {message && (
        <p className={`mt-1.5 text-xs ${message.tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-pb-text2 dark:text-gray-400'}`}>{message.text}</p>
      )}
    </div>
  );
}
