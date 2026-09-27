import { ArrowRight, RefreshCw } from '../../../Icons.jsx';
import { fetchMigrationOutcomes } from '../../../../api/client.js';
import { parseTimestamp } from '../../../../utils/formatters.js';

const { useState, useEffect } = React;

const MAX_GAP_MS = 2 * 3600 * 1000;

/**
 * A post snapshot only measures the migration if it was taken near its
 * window. Older records were back-filled weeks later; newer ones carry a
 * `late` flag from the backend.
 */
export function isReliableOutcome(o) {
  const pre = parseTimestamp(o.pre_migration?.timestamp);
  const post5 = o.post_5min || o.post_migration;
  const post = parseTimestamp(post5?.timestamp);
  if (!pre || !post) return false;
  if (post5?.late) return false;
  return post - pre < MAX_GAP_MS;
}

const VERDICT_CLASS = {
  beneficial: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  harmful: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  neutral: 'bg-pb-surface2 dark:bg-slate-700/60 text-pb-text2 dark:text-gray-300',
};

function Delta({ label, before, after }) {
  if (before == null || after == null) return null;
  const better = after < before;
  return (
    <div>
      <div className="text-[10px] text-pb-text2 dark:text-gray-500">{label}</div>
      <div className="flex items-center gap-1 tabular-nums">
        <span className="text-pb-text2 dark:text-gray-400">{Math.round(before)}%</span>
        <ArrowRight size={8} className="text-pb-text2 dark:text-gray-400" />
        <span className={`font-medium ${better ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{Math.round(after)}%</span>
      </div>
    </div>
  );
}

/**
 * Predicted-vs-actual outcomes for recent migrations: source-node load right
 * before the move vs. 5 minutes and 24 hours after. Records whose post
 * snapshots weren't taken near their window are counted but not shown.
 */
export default function MigrationOutcomes({ active, limit = 10 }) {
  const [outcomes, setOutcomes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || outcomes || loading) return;
    setLoading(true);
    (async () => {
      const res = await fetchMigrationOutcomes(null, 50);
      setOutcomes(res.success ? (res.outcomes || []) : []);
      setLoading(false);
    })();
  }, [active]);

  if (loading || !outcomes) {
    return (
      <div className="text-xs text-pb-text2 dark:text-gray-400 py-4 flex items-center gap-2">
        <RefreshCw size={12} className="animate-spin" /> Loading outcomes…
      </div>
    );
  }

  // A pending record past its first window must still have a timely 5-min snapshot.
  const pending = outcomes.filter(o => o.status?.startsWith('pending_') && (o.status === 'pending_5min' || isReliableOutcome(o)));
  const reliable = outcomes.filter(o => !o.status?.startsWith('pending_') && isReliableOutcome(o));
  const excluded = outcomes.length - pending.length - reliable.length;
  const shown = [...pending, ...reliable].slice(0, limit);

  return (
    <div className="space-y-2">
      {shown.length === 0 && (
        <div className="text-xs text-pb-text2 dark:text-gray-500 py-2">
          No measured outcomes yet. Each live migration is snapshotted before the move and compared at 5 minutes and 24 hours after.
        </div>
      )}
      {shown.map(o => {
        const pre = o.pre_migration || {};
        const p5 = o.post_5min || o.post_migration || {};
        const p24 = o.post_24h;
        const isPending = o.status?.startsWith('pending_');
        const when = parseTimestamp(pre.timestamp);
        return (
          <div key={o.key} className="text-xs p-2.5 rounded-lg border border-pb-border dark:border-slate-700 bg-pb-surface2/60 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-medium text-pb-text dark:text-gray-300">
                [{o.guest_type} {o.vmid}] {o.source_node} → {o.target_node}
                {when && <span className="ml-2 font-normal text-pb-text3 dark:text-gray-500">{when.toLocaleDateString()}</span>}
              </span>
              {isPending ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  measuring · {o.status.replace('pending_', '')} next
                </span>
              ) : o.verdict ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${VERDICT_CLASS[o.verdict] || VERDICT_CLASS.neutral}`}>{o.verdict}</span>
              ) : null}
            </div>
            {!isPending || p5.source_node ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Delta label="Source CPU · 5 min" before={pre.source_node?.cpu} after={p5.source_node?.cpu} />
                <Delta label="Source mem · 5 min" before={pre.source_node?.mem} after={p5.source_node?.mem} />
                {p24 && !p24.late && <Delta label="Source CPU · 24 h" before={pre.source_node?.cpu} after={p24.source_node?.cpu} />}
                {p24 && !p24.late && <Delta label="Source mem · 24 h" before={pre.source_node?.mem} after={p24.source_node?.mem} />}
              </div>
            ) : (
              <div className="text-[10px] text-amber-600 dark:text-amber-400">First post-migration snapshot is taken 5 minutes after the move.</div>
            )}
          </div>
        );
      })}
      {excluded > 0 && (
        <p className="text-[11px] text-pb-text3 dark:text-gray-500">
          {excluded} older record{excluded !== 1 ? 's' : ''} hidden: their post-migration metrics were captured long after the move, so they don't measure it.
        </p>
      )}
    </div>
  );
}
