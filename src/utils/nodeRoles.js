/**
 * Each node's role in balancing right now, shared by the Nodes table, the node
 * side panel and the Cluster Map so all three say the same thing.
 *
 * One role per node, first match wins:
 *   maintenance — the node is in maintenance (nothing is placed on it)
 *   giving      — the current suggestions move more guests off it than onto it
 *   receiving   — the current suggestions move more guests onto it
 *   null        — none of the above (normal nodes carry no label)
 *
 * A node that is both source and target of different moves takes the net
 * direction (a tie counts as giving: the moves off are what relieve it); the
 * tooltip keeps both counts. ProxBalance has no "excluded node" setting, so
 * there is no excluded role.
 */

const MAX_NAMES = 6;

const guestWord = (n) => `${n} guest${n === 1 ? '' : 's'}`;
const guestName = (r) => r.name || (r.vmid != null ? `guest ${r.vmid}` : 'guest');

/** Names grouped by the node on the other end, in first-seen order:
 *  "sonarr, prowlarr → pve6; grafana → pve4". Long lists end in "+N more". */
function groupedList(moves, otherKey, arrow) {
  const shown = moves.slice(0, MAX_NAMES);
  const groups = [];
  const byNode = {};
  for (const r of shown) {
    const other = r[otherKey] || '?';
    if (!byNode[other]) { byNode[other] = []; groups.push(other); }
    byNode[other].push(guestName(r));
  }
  const text = groups.map(n => `${byNode[n].join(', ')} ${arrow} ${n}`).join('; ');
  const more = moves.length - shown.length;
  return more > 0 ? `${text} +${more} more` : text;
}

function toSet(maintenanceNodes) {
  if (!maintenanceNodes) return new Set();
  if (maintenanceNodes instanceof Set) return maintenanceNodes;
  if (Array.isArray(maintenanceNodes)) return new Set(maintenanceNodes);
  if (typeof maintenanceNodes === 'object') return new Set(Object.keys(maintenanceNodes).filter(k => maintenanceNodes[k]));
  return new Set();
}

function nodeNameList(nodes) {
  if (!nodes) return [];
  const arr = Array.isArray(nodes) ? nodes : Object.values(nodes);
  return arr.map(n => (typeof n === 'string' ? n : n && n.name)).filter(Boolean);
}

/**
 * Role for one node.
 * @param {string} name
 * @param {{ out: object[], in: object[], maintenance: boolean }} facts
 * @returns {null | { kind, count, outCount, inCount, out, in, short, sentence, tooltip }}
 */
function describe(name, { out, in: inn, maintenance }) {
  const o = out.length, i = inn.length;
  const offText = o ? `Giving ${guestWord(o)}: ${groupedList(out, 'target_node', '→')}` : '';
  const inText = i ? `Receiving ${guestWord(i)}: ${groupedList(inn, 'source_node', 'from')}` : '';
  const base = { outCount: o, inCount: i, out, in: inn };

  if (maintenance) {
    const sentence = o
      ? `In maintenance — ${guestWord(o)} suggested to leave: ${groupedList(out, 'target_node', '→')}`
      : 'In maintenance — no guests are placed here';
    return {
      ...base, kind: 'maintenance', count: o, short: 'Maintenance',
      sentence,
      tooltip: `${name} is in maintenance: no guests are placed here.`
        + (o ? `\n${guestWord(o)} suggested to leave: ${groupedList(out, 'target_node', '→')}.` : ''),
    };
  }
  if (o === 0 && i === 0) return null;

  const giving = o >= i;
  const kind = giving ? 'giving' : 'receiving';
  const count = giving ? o : i;
  const lead = giving ? offText : inText;
  const other = giving ? inText : offText;
  const sentence = other ? `${lead}. Also ${other.charAt(0).toLowerCase()}${other.slice(1)}` : lead;
  const mixed = o > 0 && i > 0
    ? `\nBoth ways: ${o} off, ${i} on — shown as ${kind} (${giving ? (o === i ? 'equal counts count as giving' : 'more leave than arrive') : 'more arrive than leave'}).`
    : '';
  return {
    ...base, kind, count,
    short: `${giving ? 'Giving' : 'Receiving'} ${count}`,
    sentence,
    tooltip: `Current suggestions for ${name}:\n${[offText, inText].filter(Boolean).join('\n')}${mixed}`,
  };
}

/**
 * Roles for every node.
 * @param {{ nodes: object|array, recommendations: object[], maintenanceNodes: Set|string[] }} args
 * @returns {Object<string, object|null>} node name → role (null = no role)
 */
export function nodeRoles({ nodes, recommendations, maintenanceNodes } = {}) {
  const maint = toSet(maintenanceNodes);
  const facts = {};
  const ensure = (n) => (facts[n] = facts[n] || { out: [], in: [], maintenance: maint.has(n) });
  nodeNameList(nodes).forEach(ensure);
  maint.forEach(ensure);
  for (const r of Array.isArray(recommendations) ? recommendations : []) {
    if (!r) continue;
    if (r.source_node && r.target_node && r.source_node === r.target_node) continue;
    if (r.source_node) ensure(r.source_node).out.push(r);
    if (r.target_node) ensure(r.target_node).in.push(r);
  }
  const roles = {};
  for (const [name, f] of Object.entries(facts)) roles[name] = describe(name, f);
  return roles;
}

/** True when at least one node has a role (the legend shows only then). */
export function anyRole(roles) {
  return Object.values(roles || {}).some(Boolean);
}
