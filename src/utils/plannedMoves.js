/**
 * Planned moves on the Cluster Map: groups pending suggestions (and moves
 * waiting for approval in semi-automatic mode) into one edge per
 * source → target node pair, and routes each edge around the node cards.
 *
 * Pure functions, no DOM: the map measures the node cards and passes their
 * rectangles in container coordinates ({ left, top, right, bottom }).
 */

/**
 * Group pending moves into one edge per source → target pair.
 *
 * @param {Object} args
 * @param {Array} args.recommendations  Current suggestions ({ vmid, name, source_node, target_node }).
 * @param {Array} [args.approvalQueue]  Approval-queue entries (same fields + status, expires_at).
 * @param {Object} [args.guests]        data.guests keyed by vmid; a guest no longer on its
 *                                      source node has already moved and is skipped.
 * @param {Object} [args.inFlight]      vmid → truthy for guests migrating or just migrated.
 * @param {Date}   [args.now]
 * @returns {Array<{key, from, to, kind, count, guests: Array<{vmid, name, approval}>}>}
 *          `kind` is 'approval' when every guest on the edge waits for approval,
 *          otherwise 'suggested'. Sorted by source, then target.
 */
export function groupPlannedMoves({ recommendations, approvalQueue = null, guests = null, inFlight = null, now = new Date() }) {
  const moves = new Map(); // vmid → move
  const add = (r, approval) => {
    if (!r || r.vmid == null || !r.source_node || !r.target_node || r.source_node === r.target_node) return;
    const id = String(r.vmid);
    if (inFlight && inFlight[r.vmid]) return;
    const g = guests ? guests[id] : null;
    if (guests && (!g || g.node !== r.source_node)) return;
    const prev = moves.get(id);
    // An approval entry wins over the suggestion it came from.
    if (prev && (prev.approval || !approval)) return;
    moves.set(id, {
      vmid: r.vmid,
      name: r.name || g?.name || `Guest ${r.vmid}`,
      from: r.source_node,
      to: r.target_node,
      approval,
    });
  };
  (Array.isArray(recommendations) ? recommendations : []).forEach(r => add(r, false));
  (Array.isArray(approvalQueue) ? approvalQueue : []).forEach(e => {
    if (!e || e.status === 'approved' || e.status === 'dismissed') return;
    if (e.expires_at && new Date(e.expires_at) <= now) return;
    add(e, true);
  });

  const edges = new Map();
  moves.forEach(m => {
    const key = `${m.from}->${m.to}`;
    if (!edges.has(key)) edges.set(key, { key, from: m.from, to: m.to, guests: [] });
    edges.get(key).guests.push({ vmid: m.vmid, name: m.name, approval: m.approval });
  });
  return [...edges.values()]
    .map(e => {
      e.guests.sort((a, b) => a.name.localeCompare(b.name) || a.vmid - b.vmid);
      return { ...e, count: e.guests.length, kind: e.guests.every(g => g.approval) ? 'approval' : 'suggested' };
    })
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** Hover / tap text for an edge: "orion → vega: loki, nextcloud (awaiting approval)". */
export function edgeTitle(edge) {
  const names = edge.guests.map(g => (g.approval && edge.kind !== 'approval' ? `${g.name} (awaiting approval)` : g.name));
  return `${edge.from} → ${edge.to}${edge.kind === 'approval' ? ' · awaiting approval' : ''}: ${names.join(', ')}`;
}

/** Stroke width: 1.5 for one guest, up to 3 for four or more. */
export const edgeWidth = (count) => 1.5 + Math.min(Math.max(count, 1) - 1, 3) * 0.5;

// Below the node card's top border, clear of the headroom badge on the
// top-right corner and above the node name.
const SIDE_Y = 30;
const ARC_LIFT = 44;
const LANE_GAP = 12;

const overlapsY = (a, b) => a.top < b.bottom && b.top < a.bottom;
const overlapsX = (a, b) => a.left < b.right && b.left < a.right;
const cx = (r) => (r.left + r.right) / 2;
const round = (v) => Math.round(v * 10) / 10;

/**
 * Route one edge between two node cards.
 *
 * - Same row, neighbours: a straight line between the facing sides.
 * - Same row with cards in between: an arc over the row, from and to the
 *   left part of each card's top border (the headroom badge sits top-right).
 * - Different rows: an elbow through the gap between the columns, or down
 *   the right-hand margin when the cards share a column (phone width).
 *
 * @param {Object} a        Source card rect.
 * @param {Object} b        Target card rect.
 * @param {Object} [opts]
 * @param {Array}  [opts.others]  Rects of the other node cards.
 * @param {number} [opts.lane]    Index among edges on the same route (spreads parallel edges).
 * @param {number} [opts.width]   Container width; elbows stay inside it.
 * @returns {{ d: string, mid: { x: number, y: number }, shape: 'line'|'arc'|'elbow' }}
 */
export function routeEdge(a, b, { others = [], lane = 0, width = Infinity } = {}) {
  if (overlapsY(a, b)) {
    const dir = cx(b) >= cx(a) ? 1 : -1;
    const lo = Math.min(cx(a), cx(b));
    const hi = Math.max(cx(a), cx(b));
    const blocked = others.some(o => overlapsY(o, a) && cx(o) > lo && cx(o) < hi);
    if (!blocked) {
      // A → B and B → A sit 8 px apart.
      const y = Math.max(a.top, b.top) + SIDE_Y + 12 + (dir > 0 ? -4 : 4) + lane * LANE_GAP;
      const x1 = dir > 0 ? a.right : a.left;
      const x2 = dir > 0 ? b.left : b.right;
      return { d: `M${round(x1)},${round(y)} L${round(x2)},${round(y)}`, mid: { x: round((x1 + x2) / 2), y: round(y) }, shape: 'line' };
    }
    const x1 = a.left + (a.right - a.left) * (dir > 0 ? 0.36 : 0.2);
    const x2 = b.left + (b.right - b.left) * (dir > 0 ? 0.2 : 0.36);
    const lift = ARC_LIFT + lane * 16 + (dir > 0 ? 0 : 8);
    const ctrlY = Math.min(a.top, b.top) - lift;
    const ctrlX = (x1 + x2) / 2;
    return {
      d: `M${round(x1)},${round(a.top)} Q${round(ctrlX)},${round(ctrlY)} ${round(x2)},${round(b.top)}`,
      // Point of the quadratic curve at t = 0.5.
      mid: { x: round((x1 + 2 * ctrlX + x2) / 4), y: round((a.top + 2 * ctrlY + b.top) / 4) },
      shape: 'arc',
    };
  }
  // Edges on separate lanes also leave and enter at separate heights, so two
  // edges from one card don't share a horizontal stub.
  const y1 = a.top + SIDE_Y + lane * 8;
  const y2 = b.top + SIDE_Y + lane * 8;
  let x1;
  let x2;
  let lx;
  if (overlapsX(a, b)) {
    // Same column: down (or up) the right-hand margin.
    x1 = a.right;
    x2 = b.right;
    lx = Math.min(Math.max(a.right, b.right) + 16 + lane * LANE_GAP, width - 4);
  } else {
    const dir = cx(b) > cx(a) ? 1 : -1;
    x1 = dir > 0 ? a.right : a.left;
    x2 = dir > 0 ? b.left : b.right;
    // Stay in the gap between the two columns.
    lx = Math.min(Math.max((x1 + x2) / 2 + lane * LANE_GAP * dir, Math.min(x1, x2) + 4), Math.max(x1, x2) - 4);
  }
  return {
    d: `M${round(x1)},${round(y1)} L${round(lx)},${round(y1)} L${round(lx)},${round(y2)} L${round(x2)},${round(y2)}`,
    // Count label near the source end of the vertical run, beside the source
    // card rather than among the guest bubbles further down; staggered by lane.
    mid: { x: round(lx), y: round(Math.abs(y2 - y1) > 120 ? y1 + Math.sign(y2 - y1) * (28 + lane * 18) : (y1 + y2) / 2) },
    shape: 'elbow',
  };
}

/**
 * Route every edge whose two nodes were measured. Elbows whose vertical
 * runs would coincide get separate lanes.
 *
 * @param {Array}  edges  From groupPlannedMoves().
 * @param {Object} rects  Node name → card rect.
 * @param {number} [width] Container width.
 * @returns {Array} edges with { d, mid, shape } added.
 */
export function layoutPlannedMoves(edges, rects, width = Infinity) {
  const runs = []; // x of every elbow's vertical run so far
  return edges.flatMap(e => {
    const a = rects[e.from];
    const b = rects[e.to];
    if (!a || !b) return [];
    const others = Object.entries(rects).filter(([n]) => n !== e.from && n !== e.to).map(([, r]) => r);
    // Lines and arcs only collide with the reverse edge, which the direction
    // offset separates. Elbows take the first lane whose vertical run is at
    // least 8 px from every earlier one (a margin and a column gap can sit
    // side by side).
    let r = routeEdge(a, b, { others, lane: 0, width });
    if (r.shape === 'elbow') {
      for (let lane = 1; lane < 6 && runs.some(x => Math.abs(x - r.mid.x) < 8); lane++) {
        r = routeEdge(a, b, { others, lane, width });
      }
      runs.push(r.mid.x);
    }
    return [{ ...e, ...r }];
  });
}
