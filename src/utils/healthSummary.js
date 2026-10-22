/**
 * Plain-words cluster health for the dashboard KPI tile, the phone status
 * line and the health breakdown modal. Instead of a vague word ("Tight")
 * it states the fact: either every node has room, or which node is short
 * and why (its largest penalty from /api/node-scores `penalty_items`).
 */
import { headroomLevel } from './designTokens.js';

// penalty key → short plain phrase. Keys match proxbalance/scoring.py.
const PHRASE_BY_KEY = {
  iowait_current: 'disk wait high now',
  iowait_sustained: 'disk wait high this week',
  io_pressure_sustained: 'tasks waited on disk all week',
  current_cpu: 'CPU busy now',
  sustained_cpu: 'CPU busy all week',
  cpu_spikes: 'CPU peaks this week',
  cpu_trend: 'CPU rising',
  current_mem: 'memory nearly full',
  sustained_mem: 'memory nearly full',
  mem_spikes: 'memory nearly full',
  mem_overcommit: 'memory over-allocated',
  mem_trend: 'memory rising',
  predicted_cpu: 'load forecast to rise',
  predicted_mem: 'load forecast to rise',
};

// Label patterns for items whose key is unknown (newer/older backends).
const PHRASE_BY_LABEL = [
  [/iowait.*(7-day|week|sustained)/i, 'disk wait high this week'],
  [/iowait/i, 'disk wait high now'],
  [/forecast/i, 'load forecast to rise'],
  [/cpu.*(peak|spike)/i, 'CPU peaks this week'],
  [/spike/i, 'CPU spikes'],
  [/cpu.*trend/i, 'CPU rising'],
  [/mem.*trend/i, 'memory rising'],
  [/cpu.*(7-day|24h|sustained|week)/i, 'CPU busy all week'],
  [/cpu/i, 'CPU busy now'],
  [/mem/i, 'memory nearly full'],
];

/**
 * Short plain phrase for one penalty item ({key, label}).
 * Unmapped items fall back to their own label, lower-cased.
 */
export function problemPhrase(item) {
  if (!item) return null;
  if (item.key && PHRASE_BY_KEY[item.key]) return PHRASE_BY_KEY[item.key];
  const label = String(item.label || item.key || '').trim();
  for (const [re, phrase] of PHRASE_BY_LABEL) if (re.test(label)) return phrase;
  return label ? label.replace(/_/g, ' ').toLowerCase() : null;
}

/** Largest penalty item for one node-scores entry (penalty_items, else penalty_breakdown). */
export function biggestProblem(score) {
  const items = Array.isArray(score?.penalty_items) ? score.penalty_items : null;
  if (items && items.length) {
    const top = items.reduce((a, b) => ((b.points || 0) > (a.points || 0) ? b : a));
    if ((top.points || 0) > 0) return top;
  }
  const bd = score?.penalty_breakdown;
  if (bd && typeof bd === 'object') {
    const top = Object.entries(bd)
      .filter(([, p]) => typeof p === 'number' && p > 0)
      .sort((a, b) => b[1] - a[1])[0];
    if (top) return { key: top[0], label: top[0], points: top[1] };
  }
  return null;
}

/**
 * Headline + sub line for the cluster health tile.
 *
 * @param {object} p
 * @param {string|null} p.node    busiest node name (null when unknown)
 * @param {number|null} p.headroom busiest node headroom, 0-100
 * @param {object|null} p.score   that node's /api/node-scores entry
 * @returns {{ level: 'ok'|'warn'|'crit'|null, headline: string, sub: string|null, phrase: string|null }}
 */
export function healthSummary({ node = null, headroom = null, score = null } = {}) {
  const level = headroomLevel(headroom);
  if (level === null) return { level: null, headline: '—', sub: null, phrase: null };
  const n = Math.round(headroom);
  if (level === 'ok') {
    return {
      level,
      headline: 'All nodes have capacity',
      sub: node ? `Busiest: ${node} · capacity ${n}/100` : `headroom ${n}/100`,
      phrase: null,
    };
  }
  const phrase = problemPhrase(biggestProblem(score)) || 'high base load';
  return {
    level,
    headline: node ? `${node}: ${phrase}` : `Low headroom: ${phrase}`,
    sub: node ? `Busiest node · headroom ${n}/100` : `headroom ${n}/100`,
    phrase,
  };
}

/**
 * Balance figure for the dashboard tile, from /api/analyze `cluster_balance`
 * (the engine's own balance check: CPU and memory gap between the busiest and
 * quietest node, and whether any node is over its limit).
 *
 * Level: 'crit' when a node is over a limit or moves are suggested, 'ok' when
 * the engine calls the cluster balanced, 'warn' otherwise (uneven, but no
 * move worth making).
 *
 * @param {object|null} balance  cluster_balance from /api/analyze
 * @param {number|null} moves    number of suggested moves (null when unknown)
 * @returns {{ level: 'ok'|'warn'|'crit'|null, value: number|null, sub: string|null }}
 */
export function balanceSummary(balance, moves = null) {
  if (!balance || typeof balance.score !== 'number') return { level: null, value: null, sub: null };
  const over = Array.isArray(balance.over) ? balance.over : [];
  const cpuGap = balance.cpu?.spread ?? 0;
  const memGap = balance.memory?.spread ?? 0;
  const worst = cpuGap >= memGap
    ? { label: 'CPU', gap: cpuGap, node: balance.cpu?.max_node }
    : { label: 'mem', gap: memGap, node: balance.memory?.max_node };
  let level = 'warn';
  let sub = `${worst.label} gap ${Math.round(worst.gap)}${worst.node ? ` · ${worst.node}` : ''}`;
  if (over.length > 0) {
    level = 'crit';
    const o = over[0];
    sub = `${o.node} over ${o.metric === 'cpu' ? 'CPU' : 'mem'} limit`;
  } else if (moves > 0) {
    level = 'crit';
    sub = `${moves} move${moves !== 1 ? 's' : ''} suggested`;
  } else if (balance.balanced) {
    level = 'ok';
    sub = 'even';
  }
  return { level, value: balance.score, sub };
}
