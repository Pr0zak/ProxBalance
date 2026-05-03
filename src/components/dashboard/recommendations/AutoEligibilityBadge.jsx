import { Pause, Eye, AlertTriangle, CheckCircle, XCircle } from '../../Icons.jsx';

/**
 * Small badge per rec card indicating whether auto-migration would execute it.
 *  ✅ would auto-run   — auto enabled, timer active, not dry-run, no blocking flags
 *  ⏸  paused           — auto enabled but timer paused
 *  ⊘  dry-run only     — would only simulate, no actual move
 *  ⚠  blocked          — has flags that prevent auto-execution (mount points, pinned disks, ignore tag)
 *  —  off              — automation disabled
 */
export default function AutoEligibilityBadge({ rec, automationStatus }) {
  if (!rec || !automationStatus) return null;

  // Off: auto-migration disabled entirely.
  if (!automationStatus.enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pb-surface2 dark:bg-slate-700/60 text-pb-text2 dark:text-gray-400" title="Automation is disabled">
        Auto: off
      </span>
    );
  }

  // Blocked checks first: per-rec flags that prevent automation regardless of timer state.
  const blockReasons = [];
  if (rec.tags?.has_ignore) blockReasons.push('has ignore tag');
  if (rec.mount_point_info?.has_unshared_bind_mount) blockReasons.push('unshared bind-mount requires manual');
  if (rec.local_disks?.is_pinned) blockReasons.push(rec.local_disks?.pinned_reason || 'pinned local disk');

  if (blockReasons.length > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40"
        title={`Auto would skip: ${blockReasons.join('; ')}`}
      >
        <AlertTriangle size={10} /> Auto: blocked
      </span>
    );
  }

  if (automationStatus.dry_run) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40" title="Auto-migration is in dry-run mode — would simulate only">
        <Eye size={10} /> Auto: dry-run
      </span>
    );
  }

  if (!automationStatus.timer_active) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40" title="Auto-migration timer is paused — resume to allow execution">
        <Pause size={10} /> Auto: paused
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40"
      title="Auto-migration would execute this on the next run unless safety checks intervene"
    >
      <CheckCircle size={10} /> Auto-eligible
    </span>
  );
}
