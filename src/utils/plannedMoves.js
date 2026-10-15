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

/** Hover / tap text for an edge: "pve4 → pve6: grafana, sonarr (awaiting approval)". */
export function edgeTitle(edge) {
  const names = edge.guests.map(g => (g.approval && edge.kind !== 'approval' ? `${g.name} (awaiting approval)` : g.name));
  return `${edge.from} → ${edge.to}${edge.kind === 'approval' ? ' · awaiting approval' : ''}: ${names.join(', ')}`;
}

/** Stroke width: 1.5 for one guest, up to 3 for four or more. */
export const edgeWidth = (count) => 1.5 + Math.min(Math.max(count, 1) - 1, 3) * 0.5;

// Below the node card's top border, clear of the headroom badge on the
// top-right corner and above the node name.
const SIDE_Y = 30;
const LANE_GAP = 12;
// Arcs over a row: the lowest level rides ARC_BASE px above the cards, each
// further level ARC_STEP px higher (more than a count badge's height, so
// badges on different levels never touch).
const ARC_BASE = 26;
const ARC_STEP = 20;
const ARC_RADIUS = 14;
// Arc endpoints share the left part of a card's top border; the headroom
// badge sits on the right part.
const SLOT_FROM = 0.06;
const SLOT_TO = 0.52;
const BADGE_HALF_W = 11;
const BADGE_HALF_H = 8;

const overlapsY = (a, b) => a.top < b.bottom && b.top < a.bottom;
const overlapsX = (a, b) => a.left < b.right && b.left < a.right;
const cx = (r) => (r.left + r.right) / 2;
const round = (v) => Math.round(v * 10) / 10;

/**
 * Path for an arc over a row: straight up from the source card, across at
 * `peak`, straight down onto the target card, with rounded corners. Arcs on
 * different levels never share a horizontal run.
 */
function arcPath(x1, y1, x2, y2, peak) {
  const dir = x2 >= x1 ? 1 : -1;
  const r = Math.max(0, Math.min(ARC_RADIUS, Math.abs(x2 - x1) / 2, Math.min(y1, y2) - peak));
  return `M${round(x1)},${round(y1)} L${round(x1)},${round(peak + r)} `
    + `Q${round(x1)},${round(peak)} ${round(x1 + dir * r)},${round(peak)} `
    + `L${round(x2 - dir * r)},${round(peak)} `
    + `Q${round(x2)},${round(peak)} ${round(x2)},${round(peak + r)} L${round(x2)},${round(y2)}`;
}

/**
 * Route one edge between two node cards.
 *
 * - Same row, neighbours: a straight line between the facing sides.
 * - Same row with cards in between: an arc over the row, from and to the
 *   left part of each card's top border (the headroom badge sits top-right).
 *   `level` sets its height; `x1`/`x2` pick the endpoints (layoutPlannedMoves
 *   spreads the arcs on one card so their arrowheads don't meet).
 * - Different rows: an elbow through the gap between the columns, or down
 *   the right-hand margin when the cards share a column (phone width).
 *
 * @param {Object} a        Source card rect.
 * @param {Object} b        Target card rect.
 * @param {Object} [opts]
 * @param {Array}  [opts.others]  Rects of the other node cards.
 * @param {number} [opts.lane]    Index among edges on the same route (spreads parallel edges).
 * @param {number} [opts.width]   Container width; elbows stay inside it.
 * @param {number} [opts.level]   Arc height level (0 = lowest).
 * @param {number} [opts.x1]      Arc start x on the source card.
 * @param {number} [opts.x2]      Arc end x on the target card.
 * @returns {{ d: string, mid: { x: number, y: number }, shape: 'line'|'arc'|'elbow', top: number }}
 *          `top` is the highest y the edge or its count badge reaches.
 */
export function routeEdge(a, b, { others = [], lane = 0, width = Infinity, level, x1: ax1, x2: ax2 } = {}) {
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
      return { d: `M${round(x1)},${round(y)} L${round(x2)},${round(y)}`, mid: { x: round((x1 + x2) / 2), y: round(y) }, shape: 'line', top: round(y - BADGE_HALF_H) };
    }
    // Alone, the reverse arc rides one level higher than the forward one.
    const lvl = level ?? (dir > 0 ? 0 : 1);
    const x1 = ax1 ?? a.left + (a.right - a.left) * (dir > 0 ? 0.36 : 0.2);
    const x2 = ax2 ?? b.left + (b.right - b.left) * (dir > 0 ? 0.2 : 0.36);
    const peak = Math.min(a.top, b.top) - ARC_BASE - lvl * ARC_STEP;
    return {
      d: arcPath(x1, a.top, x2, b.top, peak),
      mid: { x: round((x1 + x2) / 2), y: round(peak) },
      shape: 'arc',
      level: lvl,
      top: round(peak - BADGE_HALF_H),
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
    run: [round(y1), round(y2)],
    top: round(Math.min(y1, y2) - BADGE_HALF_H),
  };
}

/**
 * Lay out the arcs over one row so they don't share a path:
 *
 * - Levels: shortest spans first, each arc takes the lowest level not used
 *   by an arc whose span overlaps its own. Longer arcs end up above the
 *   shorter ones they cover; arcs over separate stretches share a level.
 * - Endpoints: every arc end on a card gets its own spot on the left part of
 *   the top border. Ends heading left sit left of ends heading right, and
 *   lower arcs sit on the outside, so nested arcs don't cross.
 * - Count badges: on the arc's top run, nudged sideways off the legs of
 *   higher arcs and off other badges.
 *
 * @param {Array}  arcs   [{ e, a, b, others }]: edge, source and target rects, the other cards.
 * @param {Object} rects  Node name → card rect.
 * @returns {Array} routes, in the order of `arcs`.
 */
function layoutRowArcs(arcs, rects) {
  const span = ({ a, b }) => [Math.min(cx(a), cx(b)), Math.max(cx(a), cx(b))];
  const level = arcs.map(() => 0);
  const order = arcs.map((_, i) => i).sort((i, j) => {
    const [l1, h1] = span(arcs[i]);
    const [l2, h2] = span(arcs[j]);
    return (h1 - l1) - (h2 - l2) || l1 - l2 || arcs[i].e.key.localeCompare(arcs[j].e.key);
  });
  const placed = [];
  order.forEach(i => {
    const [lo, hi] = span(arcs[i]);
    const used = new Set(placed.filter(j => {
      const [l2, h2] = span(arcs[j]);
      return lo < h2 && l2 < hi;
    }).map(j => level[j]));
    let lvl = 0;
    while (used.has(lvl)) lvl++;
    level[i] = lvl;
    placed.push(i);
  });

  // Endpoint spots per card.
  const ends = {}; // node → [{ i, end, left, level }]
  arcs.forEach(({ e, a, b }, i) => {
    (ends[e.from] = ends[e.from] || []).push({ i, end: 'x1', left: cx(b) < cx(a), level: level[i] });
    (ends[e.to] = ends[e.to] || []).push({ i, end: 'x2', left: cx(a) < cx(b), level: level[i] });
  });
  const xs = arcs.map(() => ({}));
  Object.entries(ends).forEach(([node, list]) => {
    const r = rects[node];
    const w = r.right - r.left;
    const sorted = [
      ...list.filter(p => p.left).sort((p, q) => p.level - q.level),
      ...list.filter(p => !p.left).sort((p, q) => q.level - p.level),
    ];
    sorted.forEach((p, k) => {
      const f = sorted.length === 1
        ? (p.left ? 0.2 : 0.36)
        : SLOT_FROM + (SLOT_TO - SLOT_FROM) * (k + 0.5) / sorted.length;
      xs[p.i][p.end] = r.left + w * f;
    });
  });

  const routes = arcs.map(({ a, b, others }, i) => routeEdge(a, b, { others, level: level[i], x1: xs[i].x1, x2: xs[i].x2 }));

  // Badges: try the middle of the top run, then step outwards.
  const boxes = [];
  const clear = (i, x) => {
    const y = routes[i].mid.y;
    const legHit = routes.some((r, j) => j !== i && r.level > level[i]
      && [xs[j].x1, xs[j].x2].some(lx => Math.abs(lx - x) < BADGE_HALF_W + 3));
    const boxHit = boxes.some(bx => Math.abs(bx.x - x) < 2 * BADGE_HALF_W + 4 && Math.abs(bx.y - y) < 2 * BADGE_HALF_H + 2);
    return !legHit && !boxHit;
  };
  // Higher arcs first: their badges have fewer legs to dodge.
  [...routes.keys()].sort((i, j) => level[j] - level[i]).forEach(i => {
    const lo = Math.min(xs[i].x1, xs[i].x2) + ARC_RADIUS + BADGE_HALF_W;
    const hi = Math.max(xs[i].x1, xs[i].x2) - ARC_RADIUS - BADGE_HALF_W;
    const mid = routes[i].mid.x;
    let best = mid;
    for (let k = 0; k < 60; k++) {
      const x = mid + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8;
      if (x < lo || x > hi) continue;
      if (clear(i, x)) { best = x; break; }
    }
    routes[i] = { ...routes[i], mid: { x: round(best), y: routes[i].mid.y } };
    boxes.push(routes[i].mid);
  });
  return routes;
}

/**
 * Route every edge whose two nodes were measured. Arcs over the same row get
 * separate heights, endpoints and badge spots; elbows whose vertical runs
 * would coincide get separate lanes.
 *
 * @param {Array}  edges  From groupPlannedMoves().
 * @param {Object} rects  Node name → card rect.
 * @param {number} [width] Container width.
 * @returns {Array} edges with { d, mid, shape, top } added (arcs also `level`).
 */
export function layoutPlannedMoves(edges, rects, width = Infinity) {
  const runs = []; // x of every elbow's vertical run so far
  const out = edges.map(e => {
    const a = rects[e.from];
    const b = rects[e.to];
    if (!a || !b) return null;
    const others = Object.entries(rects).filter(([n]) => n !== e.from && n !== e.to).map(([, r]) => r);
    // Lines only collide with the reverse edge, which the direction offset
    // separates. Elbows take the first lane whose vertical run is at least
    // 8 px from every earlier one (a margin and a column gap can sit side by
    // side). Arcs are laid out per row below.
    let r = routeEdge(a, b, { others, lane: 0, width });
    if (r.shape === 'elbow') {
      for (let lane = 1; lane < 6 && runs.some(x => Math.abs(x - r.mid.x) < 8); lane++) {
        r = routeEdge(a, b, { others, lane, width });
      }
      runs.push(r.mid.x);
    }
    return { edge: { ...e, ...r }, a, b, others };
  });

  const rows = new Map(); // row top → indexes of its arcs
  out.forEach((o, i) => {
    if (!o || o.edge.shape !== 'arc') return;
    const key = Math.round(Math.min(o.a.top, o.b.top));
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(i);
  });
  rows.forEach(idx => {
    const routes = layoutRowArcs(idx.map(i => ({ e: out[i].edge, a: out[i].a, b: out[i].b, others: out[i].others })), rects);
    idx.forEach((i, k) => { out[i].edge = { ...out[i].edge, ...routes[k] }; });
  });

  // An elbow's badge can land on a badge in the same column gap (the line
  // between two neighbours, say); slide it along its vertical run until clear.
  const laid = out.filter(Boolean).map(o => o.edge);
  const hits = (p, q) => Math.abs(p.x - q.x) < 2 * BADGE_HALF_W + 2 && Math.abs(p.y - q.y) < 2 * BADGE_HALF_H + 2;
  const fixed = laid.filter(e => e.shape !== 'elbow').map(e => e.mid);
  return laid.map(e => {
    if (e.shape !== 'elbow') return e;
    const [y1, y2] = e.run;
    const step = (y2 >= y1 ? 1 : -1) * (2 * BADGE_HALF_H + 4);
    let mid = e.mid;
    for (let k = 0; k < 8 && fixed.some(f => hits(f, mid)); k++) {
      const y = mid.y + step;
      if ((y - y1) * (y - y2) > 0) break; // off the vertical run
      mid = { x: mid.x, y: round(y) };
    }
    fixed.push(mid);
    return mid === e.mid ? e : { ...e, mid };
  });
}

/** Highest y any laid-out edge or count badge reaches (Infinity when there are none). */
export const plannedMovesTop = (arrows) => arrows.reduce((m, a) => Math.min(m, a.top ?? Infinity), Infinity);
