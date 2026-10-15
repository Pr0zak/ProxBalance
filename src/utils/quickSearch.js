/**
 * Quick search ranking (command palette). Pure: no React, no DOM.
 *
 * buildSearchItems(data, pages) flattens the cluster snapshot into items;
 * rankSearch(items, query, limit) scores them against the query.
 *
 * Score per query token (lower is better; a token that matches nothing
 * drops the item, the item's score is its worst token):
 *   0 exact vmid
 *   1 exact name
 *   2 name prefix
 *   3 vmid prefix
 *   4 name word start (after - _ . or space)
 *   5 exact tag
 *   6 name substring
 *   7 tag prefix or substring
 *   8 name subsequence (letters in order, e.g. "pxb" → "proxbalance")
 * Ties: guests before nodes before pages, then by name.
 */

const TYPE_ORDER = { guest: 0, node: 1, page: 2 };

export const SEARCH_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'insights', label: 'Insights' },
  { id: 'automation', label: 'Automation' },
  { id: 'settings', label: 'Settings' },
];

export function buildSearchItems(data, pages = SEARCH_PAGES) {
  const items = [];
  const perNode = {};
  Object.values(data?.guests || {}).forEach((g) => {
    if (!g || g.vmid == null) return;
    if (g.node) perNode[g.node] = (perNode[g.node] || 0) + 1;
    items.push({
      kind: 'guest',
      key: `guest:${g.vmid}`,
      vmid: String(g.vmid),
      name: g.name || String(g.vmid),
      guestType: g.type || '',
      node: g.node || '',
      status: g.status || '',
      tags: (g.tags?.all_tags || []).map(t => String(t).toLowerCase()),
    });
  });
  Object.entries(data?.nodes || {}).forEach(([name, n]) => {
    items.push({
      kind: 'node',
      key: `node:${name}`,
      name: n?.name || name,
      status: n?.status || '',
      guestCount: perNode[n?.name || name] || 0,
      tags: [],
    });
  });
  pages.forEach((p) => {
    items.push({ kind: 'page', key: `page:${p.id}`, page: p.id, name: p.label, tags: [] });
  });
  return items;
}

const isSubsequence = (needle, hay) => {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) if (hay[j] === needle[i]) i++;
  return i === needle.length;
};

export function scoreToken(item, token) {
  const name = item.name.toLowerCase();
  const vmid = item.vmid || '';
  if (vmid && vmid === token) return 0;
  if (name === token) return 1;
  if (name.startsWith(token)) return 2;
  if (vmid && vmid.startsWith(token)) return 3;
  if (name.split(/[-_. ]+/).some(w => w.startsWith(token))) return 4;
  if (item.tags.includes(token)) return 5;
  if (name.includes(token)) return 6;
  if (item.tags.some(t => t.includes(token))) return 7;
  if (token.length >= 2 && isSubsequence(token, name)) return 8;
  return null;
}

export function rankSearch(items, query, limit = 20) {
  const tokens = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const scored = [];
  if (!tokens.length) {
    // Nothing typed: page jumps and nodes, a short list to arrow through.
    items.forEach(it => { if (it.kind !== 'guest') scored.push({ item: it, score: 0 }); });
  } else {
    items.forEach((it) => {
      let worst = -1;
      for (const t of tokens) {
        const s = scoreToken(it, t);
        if (s === null) return;
        if (s > worst) worst = s;
      }
      scored.push({ item: it, score: worst });
    });
  }
  scored.sort((a, b) => a.score - b.score
    || TYPE_ORDER[a.item.kind] - TYPE_ORDER[b.item.kind]
    || a.item.name.localeCompare(b.item.name, undefined, { numeric: true }));
  return scored.slice(0, limit).map(s => s.item);
}

/**
 * True when a keydown should open the palette: Ctrl+K / Cmd+K anywhere,
 * "/" only when focus is not in a text field.
 */
export function isOpenShortcut(e) {
  if (!e || e.altKey) return false;
  const key = String(e.key || '').toLowerCase();
  if (key === 'k' && (e.ctrlKey || e.metaKey) && !e.shiftKey) return true;
  if (key !== '/' || e.ctrlKey || e.metaKey) return false;
  const t = e.target;
  const tag = String(t?.tagName || '').toUpperCase();
  return !(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable);
}
