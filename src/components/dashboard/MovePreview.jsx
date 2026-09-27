import { MoveRight, AlertTriangle, Info, XCircle, Eye, ChevronDown } from '../Icons.jsx';
import {
  INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, ICON, MODAL_OVERLAY, MODAL_CONTAINER,
} from '../../utils/designTokens.js';
import { nodePreview, CPU_WARN, MEM_WARN } from './clusterMapHelpers.js';

const pct = (v) => `${Math.round(v || 0)}%`;

// "45% → 52%" with the after value coloured when it crosses a threshold.
function BeforeAfter({ before, after, limit, overClass = 'text-red-600 dark:text-red-400' }) {
  const over = limit != null && after > limit;
  return (
    <span className="tabular-nums whitespace-nowrap">
      <span className="text-pb-text2 dark:text-gray-400">{pct(before)}</span>
      <span className="mx-1 text-pb-text2 dark:text-gray-500">→</span>
      <span className={`font-semibold ${over ? overClass : 'text-pb-text dark:text-gray-100'}`}>{pct(after)}</span>
    </span>
  );
}

function CheckList({ checks }) {
  if (!checks.length) return null;
  return (
    <ul className="mt-3 space-y-1 text-xs">
      {checks.map((c, i) => (
        <li
          key={i}
          className={`flex items-start gap-1.5 ${
            c.level === 'block' ? 'text-red-600 dark:text-red-400 font-medium'
              : c.level === 'warn' ? 'text-amber-700 dark:text-amber-300'
              : 'text-pb-text2 dark:text-gray-400'
          }`}
        >
          {c.level === 'info'
            ? <Info size={12} className="mt-0.5 shrink-0" />
            : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

// Before/after panel for moving `guest` (currently on guest.node) to `targetName`.
export function MovePreviewPanel({
  guest, targetName, nodes, allGuests, maintenanceNodes,
  canMigrate, onReview, onCancel, framed = true, panelRef = null, showGuest = true,
}) {
  const source = nodes[guest.node];
  const target = nodes[targetName];
  if (!source || !target) return null;
  const tp = nodePreview(target, guest, maintenanceNodes, allGuests);
  const sp = nodePreview(source, guest, maintenanceNodes, allGuests);
  const committedPct = (n) => (n.committed_mem_gb != null && n.total_mem_gb > 0 ? n.committed_mem_gb / n.total_mem_gb * 100 : null);

  const rows = [
    { name: target.name, node: target, p: tp, role: 'gains' },
    { name: source.name, node: source, p: sp, role: 'frees up' },
  ];

  return (
    <div ref={panelRef} className={framed ? `${INNER_CARD} !border-sky-300 dark:!border-sky-500/40` : ''} role="region" aria-label="Move preview">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-pb-text dark:text-gray-100">
        <MoveRight size={ICON.action} className="text-sky-600 dark:text-sky-400" />
        {showGuest && <span>Move {guest.vmid} {guest.name}</span>}
        <span className={showGuest ? 'font-normal text-pb-text2 dark:text-gray-400' : ''}>{source.name} → {target.name}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300">Estimate</span>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map(r => (
          <div key={r.name} className="text-xs">
            <div>
              <span className="font-semibold text-pb-text dark:text-gray-200">{r.name}</span>
              <span className="ml-1 text-pb-text2 dark:text-gray-500">{r.role}</span>
            </div>
            <div className="mt-0.5 grid grid-cols-3 gap-2 sm:max-w-xl">
              {[
                { label: 'CPU', el: <BeforeAfter before={r.node.cpu_percent} after={r.p.cpu} limit={CPU_WARN} /> },
                { label: 'Memory', el: <BeforeAfter before={r.node.mem_percent} after={r.p.mem} limit={MEM_WARN} /> },
                {
                  label: 'Committed',
                  el: r.p.committedPct != null
                    ? <BeforeAfter before={committedPct(r.node)} after={r.p.committedPct} limit={100} overClass="text-orange-600 dark:text-orange-400" />
                    : <span className="text-pb-text2 dark:text-gray-500">—</span>,
                },
              ].map(c => (
                <div key={c.label} className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-pb-text2 dark:text-gray-500">{c.label}</div>
                  {c.el}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CheckList checks={tp.checks} />

      <p className="mt-3 text-[11px] text-pb-text2 dark:text-gray-500">
        Estimate from current usage only. Storage, affinity and scoring checks run again when the migration starts.
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {!canMigrate && (
          <span className="text-xs text-pb-text2 dark:text-gray-400 mr-auto">Read-only session: migrations need the migrate permission.</span>
        )}
        <button onClick={onCancel} className={BTN_SECONDARY}>Cancel</button>
        {canMigrate && (
          <button
            onClick={onReview}
            disabled={tp.blocked}
            className={BTN_PRIMARY}
            title={tp.blocked ? 'This node cannot take the guest' : 'Open the migration confirmation'}
          >
            <MoveRight size={ICON.action} /> Review migration…
          </button>
        )}
      </div>
    </div>
  );
}

// Touch fallback for drag-and-drop: tap a bubble → pick a node → same preview.
export function MoveToSheet({
  guest, nodes, allGuests, maintenanceNodes, canMigrate,
  onReview, onDetails, onClose,
}) {
  const [target, setTarget] = React.useState(null);
  const others = Object.values(nodes)
    .filter(n => n.name !== guest.node)
    .sort((a, b) => a.name.localeCompare(b.name));
  const pinned = !!guest.local_disks?.is_pinned;

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div
        className={MODAL_CONTAINER.replace('max-w-md', 'max-w-lg')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Move ${guest.name || guest.vmid}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-pb-text dark:text-white truncate">
              {guest.vmid} {guest.name}
            </h3>
            <p className="text-xs text-pb-text2 dark:text-gray-400">on {guest.node} · {guest.status}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0">
            <XCircle size={22} className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-300" />
          </button>
        </div>

        {target ? (
          <>
            <button
              onClick={() => setTarget(null)}
              className="mb-2 flex items-center gap-1 text-xs text-pb-accent dark:text-pb-accent-dark hover:underline"
            >
              <ChevronDown size={12} className="rotate-90" /> Other nodes
            </button>
            <MovePreviewPanel
              guest={guest}
              targetName={target}
              nodes={nodes}
              allGuests={allGuests}
              maintenanceNodes={maintenanceNodes}
              canMigrate={canMigrate}
              onReview={() => onReview(target)}
              onCancel={onClose}
              framed={false}
              showGuest={false}
            />
          </>
        ) : (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide text-pb-text2 dark:text-gray-500 mb-1.5">
              Move to… <span className="normal-case font-normal">(estimate)</span>
            </div>
            {pinned ? (
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                Can't migrate: {guest.local_disks.pinned_reason || 'pinned to its host'}.
              </p>
            ) : (
              <div className="space-y-1.5">
                {others.map(n => {
                  const p = nodePreview(n, guest, maintenanceNodes, allGuests);
                  const reason = p.blocked ? p.checks.find(c => c.level === 'block')?.text : null;
                  return (
                    <button
                      key={n.name}
                      disabled={p.blocked}
                      onClick={() => setTarget(n.name)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        p.blocked
                          ? 'border-pb-border dark:border-slate-700 opacity-60 cursor-not-allowed'
                          : 'border-pb-border dark:border-slate-700 hover:border-sky-400 hover:bg-sky-500/5 active:bg-sky-500/10'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-pb-text dark:text-gray-100">{n.name}</span>
                        {p.warn && <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                      </span>
                      <span className={`text-xs tabular-nums text-right ${p.blocked ? 'text-red-600 dark:text-red-400' : p.warn ? 'text-amber-700 dark:text-amber-300' : 'text-pb-text2 dark:text-gray-400'}`}>
                        {reason || `If here: CPU ${pct(p.cpu)} · MEM ${pct(p.mem)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={onDetails} className={BTN_SECONDARY}>
                <Eye size={ICON.action} /> Guest details
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
