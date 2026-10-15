import { Lock, Folder, Link, HardDrive } from '../Icons.jsx';

// Migration-relevant flags on a guest, shown on Cluster Map bubbles.
//
// Each flag gets a recognisable icon on a coloured disc, so it reads without a
// legend, and a text label wherever there's room (tooltip, tap sheet, legend).
// Hover-only explanations never reach phones, which is why the labels also
// appear in the tap sheet.

const FLAG_META = {
  pinned: {
    icon: Lock,
    chip: 'bg-red-500 text-white',
    text: 'text-red-600 dark:text-red-400',
    label: "Pinned: can't migrate",
  },
  localMount: {
    icon: Folder,
    chip: 'bg-orange-500 text-white',
    text: 'text-orange-600 dark:text-orange-400',
    label: 'Local bind mount: manual move',
  },
  sharedMount: {
    icon: Link,
    chip: 'bg-sky-500 text-white',
    text: 'text-sky-700 dark:text-sky-300',
    label: 'Shared mount: safe to move',
  },
  ioExempt: {
    icon: HardDrive,
    chip: 'bg-amber-400 text-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'IOWait-exempt',
  },
};

// Order is severity: the flag that blocks a move comes first.
export function getGuestFlags(guest) {
  const flags = [];
  const disks = guest.local_disks || {};
  const mounts = guest.mount_points || {};
  if (disks.is_pinned) {
    // The disk count only fits a disk-only reason; PCI/USB reasons name their devices.
    const n = disks.pinned_devices?.length ? 0 : disks.total_pinned_disks;
    flags.push({
      key: 'pinned',
      detail: `${disks.pinned_reason || 'Pinned to its host'}${n ? ` (${n} disk${n > 1 ? 's' : ''})` : ''}`,
    });
  }
  if (mounts.has_unshared_bind_mount) {
    flags.push({ key: 'localMount', detail: `${mounts.mount_count || 1} mount point(s); paths must exist on the target` });
  } else if (mounts.has_mount_points) {
    flags.push({ key: 'sharedMount', detail: `${mounts.mount_count || 1} mount point(s), shared storage` });
  }
  if (guest.io_exempt) {
    flags.push({
      key: 'ioExempt',
      detail: `${guest.io_exempt_reason === 'passthrough' ? 'Passthrough disks' : "Tagged 'io_exempt'"}; its IOWait isn't counted against the node`,
    });
  }
  return flags.map(f => ({ ...f, ...FLAG_META[f.key] }));
}

function FlagChip({ flag, size = 16, ringed = true }) {
  const Icon = flag.icon;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${flag.chip} ${
        ringed ? 'ring-2 ring-pb-surface dark:ring-pb-surface-dark' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.62)} />
    </span>
  );
}

/**
 * Overlapping chip stack centred on the bottom edge of a guest bubble. Sized
 * by the flags, not the bubble, so it stays legible on the smallest circles.
 * Clicks pass through to the bubble.
 */
export function GuestFlagTray({ guest }) {
  const flags = getGuestFlags(guest);
  if (!flags.length) return null;
  return (
    <span
      className="absolute left-1/2 -bottom-2 -translate-x-1/2 flex -space-x-1 pointer-events-none"
      aria-label={flags.map(f => f.label).join(', ')}
      role="img"
    >
      {flags.map(f => <FlagChip key={f.key} flag={f} />)}
    </span>
  );
}

/** Labelled rows for the hover tooltip and the touch "Move to" sheet. */
export function GuestFlagList({ guest, className = '' }) {
  const flags = getGuestFlags(guest);
  if (!flags.length) return null;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {flags.map(f => (
        <div key={f.key} className="flex items-start gap-2">
          <FlagChip flag={f} size={18} ringed={false} />
          <div className="min-w-0 leading-tight">
            <div className={`text-xs font-semibold ${f.text}`}>{f.label}</div>
            <div className="text-[11px] text-pb-text2 dark:text-gray-400 whitespace-normal">{f.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Legend entries, one per flag type. */
export function GuestFlagLegend() {
  return Object.entries(FLAG_META).map(([key, f]) => (
    <span key={key} className="flex items-center gap-1.5">
      <FlagChip flag={f} size={16} ringed={false} />
      {f.label}
    </span>
  ));
}
