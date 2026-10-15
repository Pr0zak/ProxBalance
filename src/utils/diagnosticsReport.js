/**
 * Helpers for the Settings → Diagnostics view: summary wording and the
 * plain-text report for bug reports. Pure functions, no React.
 */

export const STATUS_ORDER = { fail: 0, warn: 1, pass: 2, skip: 3 };
export const STATUS_LABEL = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', skip: 'SKIP' };

/** "2 failed · 1 warning · 9 passed" (only the non-zero parts). */
export function summaryText(summary) {
  if (!summary) return '';
  const parts = [];
  if (summary.fail) parts.push(`${summary.fail} failed`);
  if (summary.warn) parts.push(`${summary.warn} warning${summary.warn !== 1 ? 's' : ''}`);
  if (summary.pass) parts.push(`${summary.pass} passed`);
  return parts.join(' · ');
}

/** Worst status in a run: 'fail' | 'warn' | 'pass' (null when empty). */
export function overallStatus(results) {
  if (!results?.length) return null;
  if (results.some(r => r.status === 'fail')) return 'fail';
  if (results.some(r => r.status === 'warn')) return 'warn';
  return 'pass';
}

// Belt and braces: the backend already scrubs configured secrets. These catch
// anything secret-shaped that slipped into an error message anyway.
const SECRET_PATTERNS = [
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '***'], // PVE token secret (UUID)
  [/(PVEAPIToken=[^=\s]+=)[^\s"']+/g, '$1***'],
  [/(PVEAuthCookie=)[^\s;"']+/g, '$1***'],
  [/\b((?:[a-z]+_)?(?:password|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1***'],
  [/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/g, '$1***@'],
];

export function redactText(text) {
  let out = String(text ?? '');
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}

/**
 * Plain-text report: one line per check, then the raw details as JSON.
 * @param {object} run  /api/diagnostics response
 * @param {object} meta optional { version, host }
 */
export function formatReport(run, meta = {}) {
  if (!run?.results) return '';
  const lines = [
    'ProxBalance diagnostics',
    `Ran: ${run.ran_at || 'unknown'} (${run.duration_ms ?? '?'} ms)`,
  ];
  if (meta.version) lines.push(`Version: ${meta.version}`);
  lines.push(`Summary: ${summaryText(run.summary) || 'no checks'}`, '');
  let group = null;
  for (const r of run.results) {
    if (r.group !== group) {
      group = r.group;
      lines.push(`[${group}]`);
    }
    lines.push(`${STATUS_LABEL[r.status] || r.status}  ${r.name}: ${r.fact}`);
  }
  lines.push('', 'Details:');
  for (const r of run.results) {
    if (r.details && Object.keys(r.details).length) lines.push(`${r.id}: ${JSON.stringify(r.details)}`);
  }
  return redactText(lines.join('\n'));
}
