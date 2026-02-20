import { ArrowRight, RefreshCw } from '../../../Icons.jsx';

const { useState, useEffect } = React;

export default function MigrationOutcomes({ API_BASE, active }) {
  const [outcomes, setOutcomes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || outcomes || loading) return;
    setLoading(true);
    (async () => {
      try {
        const { fetchMigrationOutcomes, refreshMigrationOutcomes } = await import('../../../api/client.js');
        await refreshMigrationOutcomes();
        const res = await fetchMigrationOutcomes(null, 10);
        if (res.success) setOutcomes(res.outcomes || []);
      } catch (e) { console.error('Error loading outcomes:', e); }
      setLoading(false);
    })();
  }, [active]);

  if (loading) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2">
        <RefreshCw size={12} className="animate-spin" /> Loading outcomes...
      </div>
    );
  }

  if (!outcomes || outcomes.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4">
        No migration outcomes tracked yet. Outcomes are recorded automatically when migrations are executed, comparing predicted vs. actual resource changes.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {outcomes.map((outcome, idx) => {
        const pre = outcome.pre_migration || {};
        const post = outcome.post_migration || {};
        const isPending = outcome.status && outcome.status.startsWith('pending_');
        return (
          <div key={idx} className={`text-xs p-2.5 rounded border ${isPending ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                [{outcome.guest_type} {outcome.vmid}] {outcome.source_node} → {outcome.target_node}
              </span>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isPending ? 'bg-amber-500 text-white' : outcome.accuracy_pct >= 70 ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                {isPending ? 'PENDING' : outcome.accuracy_pct != null ? `${outcome.accuracy_pct}% accurate` : 'COMPLETED'}
              </span>
            </div>
            {!isPending && post && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Source CPU</div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-gray-400">{pre.source_node?.cpu}%</span>
                    <ArrowRight size={8} className="text-gray-400" />
                    <span className={`font-medium ${(pre.source_node?.cpu || 0) > (post.source_node?.cpu || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{post.source_node?.cpu}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Source Memory</div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-gray-400">{pre.source_node?.mem}%</span>
                    <ArrowRight size={8} className="text-gray-400" />
                    <span className={`font-medium ${(pre.source_node?.mem || 0) > (post.source_node?.mem || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{post.source_node?.mem}%</span>
                  </div>
                </div>
              </div>
            )}
            {isPending && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400">Post-migration metrics pending (captured after 5 minute cooldown)</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
