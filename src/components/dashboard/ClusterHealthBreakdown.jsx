import { MODAL_OVERLAY, MODAL_CONTAINER, scoreColor } from '../../utils/designTokens.js';
import { X } from '../Icons.jsx';

const PENALTY_SEGMENTS = [
  { key: 'cpu',     label: 'CPU',     color: 'bg-red-500',    text: 'text-red-300' },
  { key: 'memory',  label: 'Memory',  color: 'bg-blue-500',   text: 'text-blue-300' },
  { key: 'iowait',  label: 'IOWait',  color: 'bg-orange-500', text: 'text-orange-300' },
  { key: 'trends',  label: 'Trends',  color: 'bg-yellow-500', text: 'text-yellow-300' },
  { key: 'spikes',  label: 'Spikes',  color: 'bg-purple-500', text: 'text-purple-300' },
];

function StabilityLabel(score) {
  if (score == null) return null;
  if (score >= 80) return { label: 'Stable',   cls: 'bg-green-900/30 text-green-300' };
  if (score >= 60) return { label: 'Moderate', cls: 'bg-blue-900/30 text-blue-300' };
  if (score >= 40) return { label: 'Variable', cls: 'bg-yellow-900/30 text-yellow-300' };
  return { label: 'Volatile', cls: 'bg-red-900/30 text-red-300' };
}

function PenaltyBar({ cats }) {
  if (!cats) return null;
  const total = PENALTY_SEGMENTS.reduce((s, p) => s + (cats[p.key] || 0), 0);
  if (total === 0) return <div className="text-xs text-green-400">no penalties</div>;
  const segs = PENALTY_SEGMENTS.filter(p => (cats[p.key] || 0) > 0);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span>Penalty sources</span>
        <span className="tabular-nums">{total} pts</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-700/60 mb-1.5">
        {segs.map(s => (
          <div key={s.key} className={s.color} style={{ width: `${(cats[s.key] / total * 100)}%` }} title={`${s.label}: ${cats[s.key]}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
        {segs.map(s => (
          <span key={s.key} className={`${s.text} flex items-center gap-1`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color}`} />
            {s.label}<span className="text-gray-500 tabular-nums">{cats[s.key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NodeCard({ name, rating, score, isWorst }) {
  const stab = StabilityLabel(score?.trend_analysis?.stability_score);
  const oc = score?.overcommit_ratio;
  const ocColor = oc > 1.2 ? 'text-red-400' : oc > 1.0 ? 'text-orange-400' : oc > 0.85 ? 'text-yellow-400' : 'text-gray-400';
  return (
    <div className={`p-3 rounded-lg border ${isWorst ? 'border-red-700/50 bg-red-900/10' : 'border-slate-700/50 bg-slate-800/40'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{name}</span>
          {isWorst && <span className="text-[9px] uppercase tracking-wider text-red-300 bg-red-900/50 px-1.5 py-0.5 rounded">drag</span>}
        </div>
        <span className={`text-lg font-bold tabular-nums ${scoreColor(rating)}`}>{rating.toFixed(0)}<span className="text-xs text-gray-500">/100</span></span>
      </div>
      <PenaltyBar cats={score?.penalty_categories} />
      <div className="flex items-center gap-3 mt-2 text-[11px]">
        {stab && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${stab.cls}`} title={`Stability: ${score.trend_analysis.stability_score}/100`}>
            {stab.label}
          </span>
        )}
        {typeof oc === 'number' && oc > 0 && (
          <span className={`tabular-nums ${ocColor}`} title="Memory overcommit ratio">
            OC {(oc * 100).toFixed(0)}%
          </span>
        )}
      </div>
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
  const drag = entries.filter(e => e.rating < (avgScore ?? 0));

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div
        className={`${MODAL_CONTAINER} w-full sm:max-w-2xl max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-3xl font-bold tabular-nums shrink-0" style={{ lineHeight: 1 }}>
              <span className={scoreColor(avgScore ?? 0)}>{avgScore ?? '—'}</span>
              <span className="text-base text-gray-500">/100</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">Cluster Health</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {healthSource === 'backend' ? 'Backend-computed value' : 'Average of per-node ratings'} · lower = more pressure
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-200 shrink-0 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-3">
          {/* Why */}
          {entries.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-gray-300 space-y-1">
              <div className="font-semibold text-gray-200">Why {avgScore ?? '—'}?</div>
              {worst && (
                <div>
                  Lowest: <span className={`font-semibold ${scoreColor(worst.rating)}`}>{worst.name}</span> at {worst.rating.toFixed(0)} — drags the average down most.
                </div>
              )}
              {drag.length > 0 && drag.length !== entries.length && (
                <div className="text-gray-400">
                  {drag.length} of {entries.length} nodes below the average ({drag.map(d => d.name).join(', ')}).
                </div>
              )}
              {drag.length === 0 && (
                <div className="text-gray-400">All nodes at or above the average — cluster is well-balanced.</div>
              )}
            </div>
          )}

          {entries.length === 0 && (
            <div className="text-sm text-gray-500 italic p-4 text-center">No node ratings available yet.</div>
          )}

          {/* Per-node cards */}
          {entries.map((e, i) => (
            <NodeCard
              key={e.name}
              name={e.name}
              rating={e.rating}
              score={e.score}
              isWorst={i === 0 && entries.length > 1 && e.rating < (avgScore ?? 0)}
            />
          ))}

          <div className="text-[11px] text-gray-500 px-1 pt-1">
            Click a node row in the Cluster section's Nodes tab for full metric detail.
          </div>
        </div>
      </div>
    </div>
  );
}
