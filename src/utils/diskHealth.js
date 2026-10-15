// Disk health (SMART) lines for the node side panel and the node table.
// Input is node.disks from the collector (proxbalance/disk_health.py):
// null/undefined when the list could not be read (no Sys.Audit, node
// offline), otherwise { count, failed, unknown, notable, disks: [...] }.

export const WEAROUT_LOW_PCT = 20;

const DASH = '—';

// Decimal units, as on the disk label.
export function fmtDiskSize(bytes) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return DASH;
  const tb = bytes / 1e12;
  if (tb >= 1) return `${tb >= 10 ? tb.toFixed(0) : tb.toFixed(1)} TB`;
  return `${Math.round(bytes / 1e9)} GB`;
}

export function fmtWearout(wearout) {
  return wearout == null ? DASH : `${wearout}%`;
}

export function isNotableDisk(d) {
  if (d.health !== 'PASSED') return true;
  return d.wearout != null && d.wearout <= WEAROUT_LOW_PCT;
}

function diskTone(d) {
  if (d.health === 'FAILED') return 'bad';
  return 'warn';
}

function diskLine(d) {
  const dev = (d.devpath || DASH).replace(/^\/dev\//, '');
  const parts = [dev];
  if (d.model) parts.push(d.model);
  parts.push(fmtDiskSize(d.size_bytes));
  const smart = d.health === 'FAILED' ? 'SMART failed'
    : d.health === 'PASSED' ? 'SMART passed' : 'SMART unknown';
  return {
    key: d.devpath || `${d.model}-${d.size_bytes}`,
    tone: diskTone(d),
    text: `${parts.join(' · ')}: ${smart}, life left ${fmtWearout(d.wearout)}`,
  };
}

// Returns null when there is nothing to show, otherwise
// { summary, tone: 'ok'|'warn'|'bad', lines: [{ key, tone, text }] }.
export function diskHealthView(disks) {
  if (!disks || !Array.isArray(disks.disks) || disks.disks.length === 0) return null;
  const list = disks.disks;
  const count = list.length;
  const notable = list.filter(isNotableDisk);
  if (notable.length === 0) {
    return { summary: `Disks: ${count}, all passed SMART`, tone: 'ok', lines: [] };
  }
  const failed = list.filter(d => d.health === 'FAILED').length;
  const passed = list.filter(d => d.health === 'PASSED').length;
  return {
    summary: `Disks: ${count}, ${passed} passed SMART`,
    tone: failed > 0 ? 'bad' : 'warn',
    lines: notable.map(diskLine),
  };
}

// Number of disks with a FAILED SMART verdict (0 when unknown/unread).
export function failedDiskCount(disks) {
  if (!disks || !Array.isArray(disks.disks)) return 0;
  return disks.disks.filter(d => d.health === 'FAILED').length;
}
