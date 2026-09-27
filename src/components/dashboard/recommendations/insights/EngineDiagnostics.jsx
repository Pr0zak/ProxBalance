/**
 * One-line engine summary shown under the "Cluster is balanced" empty state:
 * how many guests were looked at, how long it took, and the active thresholds.
 * Conflicts / advisories / AI only appear when they carry information.
 */
export default function EngineDiagnostics({ recommendationData, recommendations }) {
  if (!recommendationData?.generated_at) return null;

  const suggested = recommendationData.count ?? recommendations.length;
  const evaluated = suggested + (recommendationData.skipped_guests?.length || 0);
  const ms = recommendationData.generation_time_ms;
  const p = recommendationData.parameters;
  const conflicts = recommendationData.conflicts?.length || 0;
  const advisories = recommendationData.capacity_advisories?.length || 0;

  const parts = [
    `${evaluated} guests evaluated`,
    ms ? `generated in ${(ms / 1000).toFixed(1)} s` : null,
    p ? `thresholds CPU ${p.cpu_threshold}% · Mem ${p.mem_threshold}% · IOWait ${p.iowait_threshold}%` : null,
    conflicts ? `${conflicts} conflict${conflicts !== 1 ? 's' : ''}` : null,
    advisories ? `${advisories} capacity advisor${advisories !== 1 ? 'ies' : 'y'}` : null,
    recommendationData.ai_enhanced ? 'AI-enhanced' : null,
    p?.maintenance_nodes?.length ? `maintenance: ${p.maintenance_nodes.join(', ')}` : null,
  ].filter(Boolean);

  return (
    <div className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5">
      {parts.join(' · ')}
      {recommendationData.summary?.convergence_message && (
        <div className="mt-1 text-green-700 dark:text-green-400">{recommendationData.summary.convergence_message}</div>
      )}
    </div>
  );
}
