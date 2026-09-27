import { MODAL_OVERLAY, MODAL_CONTAINER, BTN_DANGER, PROGRESS_BAR_BG } from '../../utils/designTokens.js';
import { X, ArrowRight, Loader } from '../Icons.jsx';

/**
 * Merge the migrations Proxmox reports as running (automigrate status
 * `in_progress_migrations`, any initiator) with guests this browser is still
 * tracking (`guestsMigrating`) that the status poll has not picked up yet.
 *
 * @returns {Array<{ vmid, name, type, source, target, progress, taskId, fromApi }>}
 */
export function inFlightMigrations({ automationStatus, guestsMigrating, migrationProgress, guests }) {
  const list = [];
  const seen = new Set();
  (automationStatus?.in_progress_migrations || []).forEach(m => {
    const vmid = String(m.vmid);
    seen.add(vmid);
    list.push({
      vmid,
      name: m.name || `guest-${vmid}`,
      type: m.type,
      source: m.source_node,
      target: m.target_node,
      progress: m.progress || migrationProgress?.[m.vmid] || null,
      taskId: m.task_id || null,
      initiatedBy: m.initiated_by || null,
      fromApi: true,
    });
  });
  Object.entries(guestsMigrating || {}).forEach(([vmid, on]) => {
    if (!on || seen.has(String(vmid))) return;
    const g = guests?.[vmid] || guests?.[String(vmid)] || {};
    list.push({
      vmid: String(vmid),
      name: g.name || `guest-${vmid}`,
      type: g.type,
      source: g.node || null,
      target: null,
      progress: migrationProgress?.[vmid] || null,
      taskId: null,
      initiatedBy: null,
      fromApi: false,
    });
  });
  return list;
}

/** "In flight" list behind the Active Migrations KPI. */
export default function InFlightModal({ open, onClose, migrations, canMigrate, setCancelMigrationModal }) {
  if (!open) return null;
  const canCancel = (m) => canMigrate && setCancelMigrationModal && m.fromApi && m.taskId && m.source;

  const handleCancel = (m) => {
    // The shared cancel dialog (MigrationModals) stops the task through
    // /api/migrations/<task>/cancel when no custom onConfirm is given.
    setCancelMigrationModal({
      name: m.name,
      vmid: m.vmid,
      type: m.type === 'VM' ? 'qemu' : 'lxc',
      source_node: m.source,
      target_node: m.target,
      task_id: m.taskId,
      progress_info: m.progress || undefined,
    });
    onClose();
  };

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} sm:max-w-lg`} onClick={e => e.stopPropagation()} role="dialog" aria-label="Migrations in flight">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-pb-text dark:text-white">In flight</h3>
            <p className="text-[11px] text-pb-text2 dark:text-gray-500 mt-0.5">
              Migrations Proxmox reports as running right now
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 p-1">
            <X size={18} />
          </button>
        </div>

        {migrations.length === 0 ? (
          <div className="text-sm text-pb-text2 dark:text-gray-500 text-center py-6">No migrations running.</div>
        ) : (
          <ul className="space-y-2">
            {migrations.map(m => {
              const pct = typeof m.progress?.percentage === 'number' ? m.progress.percentage : null;
              return (
                <li key={m.vmid} className="p-3 rounded-lg border border-pb-border dark:border-slate-700/50 bg-pb-surface2 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Loader size={12} className="animate-spin text-blue-500 dark:text-blue-400 shrink-0" />
                        <span className="text-sm font-medium text-pb-text dark:text-gray-100 truncate">{m.name}</span>
                        <span className="text-[10px] text-pb-text2 dark:text-gray-500 tabular-nums shrink-0">{m.type ? `${m.type} ` : ''}{m.vmid}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono text-pb-text2 dark:text-gray-400">
                        <span>{m.source || '?'}</span>
                        <ArrowRight size={12} />
                        <span>{m.target || 'starting…'}</span>
                        {m.initiatedBy && <span className="font-sans text-[10px] text-pb-text2 dark:text-gray-500">· {m.initiatedBy}</span>}
                      </div>
                    </div>
                    {canCancel(m) && (
                      <button type="button" onClick={() => handleCancel(m)} className={`${BTN_DANGER} !px-2.5 !py-1 !text-xs shrink-0`}>
                        Cancel
                      </button>
                    )}
                  </div>
                  {m.progress && (
                    <div className="mt-2">
                      {pct !== null && (
                        <div className={PROGRESS_BAR_BG}>
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                        </div>
                      )}
                      {m.progress.human_readable && (
                        <div className="text-[11px] text-pb-text2 dark:text-gray-500 mt-1 tabular-nums">{m.progress.human_readable}</div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
