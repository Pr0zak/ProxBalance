/**
 * Age of the cluster snapshot, measured from the backend collection time
 * (data.collected_at) rather than when the browser last fetched it.
 */
const { useState, useEffect } = React;

/** Re-render every `ms` so relative times stay current. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const relative = (seconds) => {
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60 ? `${minutes % 60}m ` : ''}ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/**
 * @param {Date|string|null} collectedAt  backend collection time
 * @param {number|undefined} intervalMin  configured collection interval (minutes)
 * @param {number} now                    epoch ms
 * @returns {{label: string, tone: 'ok'|'stale'|'old', title: string} | null}
 *   tone is 'stale' past 2x the interval and 'old' past 3x.
 */
export function describeDataAge(collectedAt, intervalMin, now = Date.now()) {
  if (!collectedAt) return null;
  const t = new Date(collectedAt).getTime();
  if (Number.isNaN(t)) return null;
  const seconds = Math.max(0, Math.floor((now - t) / 1000));
  const interval = Number(intervalMin) > 0 ? Number(intervalMin) : null;
  let tone = 'ok';
  if (interval) {
    const ratio = seconds / 60 / interval;
    if (ratio > 3) tone = 'old';
    else if (ratio > 2) tone = 'stale';
  }
  const when = new Date(t).toLocaleString();
  let title = `Cluster data collected ${when}`;
  if (interval) title += ` — collector runs every ${interval} min`;
  if (tone === 'stale') title += '. Older than 2 collection intervals: the collector may be falling behind.';
  if (tone === 'old') title += '. Older than 3 collection intervals: check the collector service.';
  return { label: `collected ${relative(seconds)}`, tone, title };
}

/** Text colour classes for a data-age tone. */
export const DATA_AGE_TONE = {
  ok: 'text-pb-text2 dark:text-gray-500',
  stale: 'text-amber-600 dark:text-amber-400',
  old: 'text-red-600 dark:text-red-400',
};
