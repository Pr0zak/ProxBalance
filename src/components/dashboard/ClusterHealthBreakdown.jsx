import { MODAL_OVERLAY, MODAL_CONTAINER, scoreColor } from '../../utils/designTokens.js';
import { X } from '../Icons.jsx';

const PENALTY_SEGMENTS = [
  { key: 'cpu',     label: 'CPU',     color: 'bg-red-500' },
  { key: 'memory',  label: 'Memory',  color: 'bg-blue-500' },
  { key: 'iowait',  label: 'IOWait',  color: 'bg-orange-500' },
  { key: 'trends',  label: 'Trends',  color: 'bg-yellow-500' },
  { key: 'spikes',  label: 'Spikes',  color: 'bg-purple-500' },
];

function StabilityLabel(score) {
  if (score == null) return null;
  if (score >= 80) return { label: 'Stable',   cls: 'bg-green-900/30 text-green-300' };
  if (score >= 60) return { label: 'Moderate', cls: 'bg-blue-900/30 text-blue-300' };
  if (score >= 40) return { label: 'Variable', cls: 'bg-yellow-900/30 text-yellow-300' };
  return { label: 'Volatile', cls: 'bg-red-900/30 text-red-300' };
}

function PenaltyBar({ cats }) {
  if (!cats) return <span className="text-[10px] text-gray-600">—</span>;
  const total = PENALTY_SEGMENTS.reduce((s, p) => s + (cats[p.key] || 0), 0);
  if (total === 0) return <span className="text-[10px] text-green-400">no penalties</span>;
  const segs = PENALTY_SEGMENTS.filter(p => (cats[p.key] || 0) > 0);
  return (
    <div className="min-w-[140px]">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-700" title={segs.map(s => `${s.label}: ${cats[s.key]}`).join(', ')}>
        {segs.map(s => (
          <div key={s.key} className={s.color} style={{ width: `${(cats[s.key] / total * 100)}%` }} />
        ))}
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">{total} penalty pts · {segs.map(s => `${s.label} ${cats[s.key]}`).join(' · ')}</div>
    </div>
  );
}

export default function ClusterHealthBreakdown({ open, onClose, avgScore, nodeScores, healthSource }) {
  if (!open) return null;
  const entries = Object.entries(nodeScores || {})
    .filter(([_, v]) => typeof v?.suitability_rating === 'number')
    .map(([name, v]) => ({ name, rating: v.suitability_rating, score: v }))
    .sort((a, b) => a.rating - b.rating); // worst first

  const worst = entries[0];
  const best = entries[entries.length - 1];
  const drag = entries.filter(e => e.rating < (avgScore ?? 0));

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} max-w-3xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Cluster Health: <span className={scoreColor(avgScore ?? 0)}>{avgScore ?? '—'}</span><span className="text-sm text-gray-500">/100</span></h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {healthSource === 'backend'
                ? 'Backend-computed cluster health (matches Recommendations summary) · lower = more pressure / risk'
                : 'Average of per-node suitability ratings · lower = more pressure / risk'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-200"><X size={18} /></button>
        </div>

        {/* Why this number */}
        <div className="mb-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm text-gray-300">
          <div className="font-semibold text-gray-200 mb-1">Why {avgScore ?? '—'}?</div>
          <div className="text-xs text-gray-400 space-y-1">
            {entries.length === 0 && <div>No node ratings available yet.</div>}
            {entries.length > 0 && (
              <>
                <div>
                  Average across {entries.length} node{entries.length !== 1 ? 's' : ''}: <span className="font-mono tabular-nums">{entries.map(e => e.rating.toFixed(1)).join(' · ')}</span> = <span className="font-mono tabular-nums">{avgScore}</span>
                </div>
                {worst && (
                  <div>
                    Lowest-rated node: <span className={`font-semibold ${scoreColor(worst.rating)}`}>{worst.name}</span> at {worst.rating.toFixed(1)} — pulls the average down.
                  </div>
                )}
                {best && (
                  <div>
                    Highest-rated: <span className={`font-semibold ${scoreColor(best.rating)}`}>{best.name}</span> at {best.rating.toFixed(1)}.
                  </div>
                )}
                {drag.length > 0 && (
                  <div>
                    {drag.length} node{drag.length !== 1 ? 's' : ''} below the average ({drag.map(d => d.name).join(', ')}) — improving these would lift the cluster health most.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Per-node breakdown */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-left">
                <th className="p-2 font-semibold text-gray-400">Node</th>
                <th className="p-2 font-semibold text-gray-400">Rating</th>
                <th className="p-2 font-semibold text-gray-400">Penalty sources</th>
                <th className="p-2 font-semibold text-gray-400">Stability</th>
                <th className="p-2 font-semibold text-gray-400">Overcommit</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(({ name, rating, score }) => {
                const stab = StabilityLabel(score?.trend_analysis?.stability_score);
                const oc = score?.overcommit_ratio;
                const ocColor = oc > 1.2 ? 'text-red-400' : oc > 1.0 ? 'text-orange-400' : oc > 0.85 ? 'text-yellow-400' : 'text-gray-400';
                return (
                  <tr key={name} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="p-2 font-semibold text-white">{name}</td>
                    <td className="p-2">
                      <span className={`font-bold tabular-nums ${scoreColor(rating)}`}>{rating.toFixed(1)}</span>
                    </td>
                    <td className="p-2"><PenaltyBar cats={score?.penalty_categories} /></td>
                    <td className="p-2">
                      {stab ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${stab.cls}`} title={`Stability: ${score.trend_analysis.stability_score}/100`}>
                          {stab.label}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-2">
                      {typeof oc === 'number' && oc > 0 ? (
                        <span className={`tabular-nums ${ocColor}`} title={`Memory overcommit ratio (${(oc * 100).toFixed(0)}%)`}>
                          {(oc * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] text-gray-500 mt-4">
          Penalty categories add up to a deduction from each node's rating. Bigger bars = more pressure.
          Click a node row in the Cluster section's Nodes tab to see its full metric detail.
        </div>
      </div>
    </div>
  );
}
