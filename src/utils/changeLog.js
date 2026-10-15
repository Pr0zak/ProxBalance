// Change log (audit log) helpers: filter chips, query string, row formatting.
// Pure functions so tests/js/change-log.mjs can check them without React.

export const SOURCE_CHIPS = [
  { id: 'user', label: 'People' },
  { id: 'automation', label: 'Automation' },
  { id: 'system', label: 'System' },
];

// Each chip covers one or more action groups (the part before the dot).
export const TYPE_CHIPS = [
  { id: 'moves', label: 'Moves', groups: ['migration', 'evacuation', 'rules', 'approval'] },
  { id: 'modes', label: 'Modes', groups: ['automation', 'maintenance'] },
  { id: 'settings', label: 'Settings', groups: ['config', 'tag', 'silence'] },
  { id: 'updates', label: 'Updates', groups: ['update', 'service'] },
];

export const PAGE_SIZE = 50;

/** Query string for GET /api/audit-log. */
export function buildQuery({ source = null, type = null, before = null, limit = PAGE_SIZE } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (source) params.set('source', source);
  const chip = TYPE_CHIPS.find(c => c.id === type);
  if (chip) params.set('action', chip.groups.join(','));
  if (before) params.set('before', before);
  return params.toString();
}

const BAD = /\.(failed|error|rolled_back)$/;

/** 'bad' for failures and rollbacks, otherwise null. */
export function eventTone(action) {
  return BAD.test(String(action || '')) ? 'bad' : null;
}

function plain(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    // One line per object (batch moves), comma list for plain values (setting names).
    return value.map(plain).join(value.some(v => v && typeof v === 'object') ? '\n' : ', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${plain(v)}`).join(' · ');
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

/** [label, text] pairs for the expanded row: details, then who and the raw action. */
export function detailRows(event) {
  const out = [];
  Object.entries((event && event.details) || {}).forEach(([k, v]) => {
    const text = plain(v);
    if (text !== '') out.push([k.replace(/_/g, ' '), text]);
  });
  if (event && event.actor) out.push(['from', event.actor]);
  if (event && event.action) out.push(['action', event.action]);
  return out;
}

/** { day, time }: day is '' today, "Oct 3" this year, "Oct 3, 2025" before. */
export function formatWhen(ts, now = new Date()) {
  const d = ts ? new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(ts) ? ts : `${ts}Z`) : null;
  if (!d || isNaN(d)) return { day: ts || '', time: '' };
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return { day: '', time };
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return { day: d.toLocaleDateString(undefined, opts), time };
}
