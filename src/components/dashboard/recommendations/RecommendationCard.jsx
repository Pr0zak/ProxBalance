import {
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
  Terminal, Folder, RotateCcw, Play, Lock, RefreshCw,
  TrendingUp, TrendingDown, Minus, Zap, Activity
} from '../../Icons.jsx';

export default function RecommendationCard({
  rec, idx, penaltyConfig, recommendationData,
  migrationStatus, setMigrationStatus, completedMigrations, guestsMigrating, migrationProgress,
  cancelMigration, setConfirmMigration, canMigrate,
  collapsedSections, setCollapsedSections
}) {
  const key = `${rec.vmid}-${rec.target_node}`;
  const status = migrationStatus[key];
  const completed = completedMigrations[rec.vmid];
  const isCompleted = completed !== undefined;
  const isMaintenance = rec.reason && rec.reason.toLowerCase().includes('maintenance');
  const changeLog = recommendationData?.changes_since_last;
  const isNewRec = changeLog?.new_recommendations?.some(r => String(r.vmid) === String(rec.vmid));
  const changedTarget = changeLog?.changed_targets?.find(r => String(r.vmid) === String(rec.vmid));

  return (
    <div className={`border rounded p-4 transition-all duration-300 ${
      isCompleted
        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
        : isMaintenance
        ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
              [{rec.type} {rec.vmid}] {rec.name}
            </span>
            {rec.mount_point_info?.has_mount_points && (
              <span className={`flex items-center gap-1 px-2 py-0.5 ${
                rec.mount_point_info.has_unshared_bind_mount ? 'bg-orange-500' : 'bg-green-500'
              } text-white text-[10px] font-bold rounded`}
              title={`${rec.mount_point_info.mount_count} mount point(s)${rec.mount_point_info.has_shared_mount ? ' (shared - can migrate)' : ' (requires manual migration)'}`}>
                <Folder size={10} />
                {rec.mount_point_info.mount_count} MP
              </span>
            )}
            {isMaintenance && !isCompleted && (
              <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">MAINTENANCE</span>
            )}
            {isNewRec && !isCompleted && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">NEW</span>
            )}
            {changedTarget && !isCompleted && (
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded"
                title={`Target changed from ${changedTarget.old_target} → ${changedTarget.new_target}`}>
                TARGET CHANGED
              </span>
            )}
            {isCompleted && <CheckCircle size={18} className="text-green-600 dark:text-green-400" />}
            {status === 'failed' && <XCircle size={18} className="text-red-600 dark:text-red-400" />}
          </div>
          <div className={`text-sm mt-1 flex items-center gap-2 flex-wrap ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}`}>
            {isCompleted ? (
              <>
                <span className="font-medium">MIGRATED:</span> {rec.source_node} → {completed.newNode} ✓
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-semibold">
                  <span className="text-xs">FROM:</span>
                  <span>{rec.source_node}</span>
                  {rec.score_details?.source?.metrics && (
                    <span className="text-[10px] font-normal opacity-75 ml-0.5">
                      ({rec.score_details.source.metrics.current_cpu?.toFixed(0) || '?'}% CPU)
                    </span>
                  )}
                  {rec.trend_evidence?.available && (() => {
                    const dir = rec.trend_evidence.source_node_trend?.cpu_direction;
                    if (dir === 'sustained_increase') return <TrendingUp size={10} className="text-red-600 ml-0.5" title="CPU rising fast" />;
                    if (dir === 'rising') return <TrendingUp size={10} className="text-orange-500 ml-0.5" title="CPU rising" />;
                    if (dir === 'falling' || dir === 'sustained_decrease') return <TrendingDown size={10} className="text-green-500 ml-0.5" title="CPU falling" />;
                    return null;
                  })()}
                </span>
                <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                  <span className="text-xs">TO:</span>
                  <span>{rec.target_node}</span>
                  {rec.score_details?.target?.metrics && (
                    <span className="text-[10px] font-normal opacity-75 ml-0.5">
                      ({rec.score_details.target.metrics.predicted_cpu?.toFixed(0) || '?'}% CPU)
                    </span>
                  )}
                  {rec.trend_evidence?.available && (() => {
                    const dir = rec.trend_evidence.target_node_trend?.cpu_direction;
                    if (dir === 'sustained_increase') return <TrendingUp size={10} className="text-orange-500 ml-0.5" title="CPU rising" />;
                    if (dir === 'rising') return <TrendingUp size={10} className="text-yellow-500 ml-0.5" title="CPU rising slightly" />;
                    if (dir === 'falling' || dir === 'sustained_decrease') return <TrendingDown size={10} className="text-green-500 ml-0.5" title="CPU falling" />;
                    return <Minus size={10} className="text-gray-400 ml-0.5" title="CPU stable" />;
                  })()}
                </span>
                {rec.score_improvement !== undefined && (() => {
                  const maxImprovement = 80;
                  const pct = Math.min(100, (rec.score_improvement / maxImprovement) * 100);
                  const barColor = rec.score_improvement >= 50 ? 'bg-green-500' :
                    rec.score_improvement >= 30 ? 'bg-yellow-500' :
                    rec.score_improvement >= (penaltyConfig?.min_score_improvement || 15) ? 'bg-orange-500' :
                    'bg-red-500';
                  return (
                    <span className="inline-flex items-center gap-1.5 min-w-[120px]" title={`Score improvement: +${rec.score_improvement.toFixed(1)} penalty points`}>
                      <span className="text-xs text-gray-500 dark:text-gray-400">+{rec.score_improvement.toFixed(0)}</span>
                      <span className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-[60px]">
                        <span className={`block h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  );
                })()}
              </>
            )}
          </div>
          <div className={`text-xs mt-1 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {rec.structured_reason ? (
              <div>
                <span className={`font-medium ${isMaintenance ? 'text-yellow-600 dark:text-yellow-400' : rec.structured_reason.primary_reason === 'iowait_relief' ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                  {rec.structured_reason.primary_label}
                </span>
                {rec.structured_reason.primary_reason === 'iowait_relief' && (
                  <span className="ml-1 px-1.5 py-0 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded" title="Migration triggered by sustained high I/O wait on source node">I/O</span>
                )}
                {rec.structured_reason.contributing_factors?.length > 0 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-500">
                    — {rec.structured_reason.contributing_factors.slice(0, 3).map(f => f.label).join('; ')}
                  </span>
                )}
                <span className="ml-2">| <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB</span>
                {rec.confidence_score !== undefined && (
                  <span className="ml-2 inline-flex items-center gap-1" title={`Confidence: ${rec.confidence_score}%`}>
                    <span className="text-gray-500 dark:text-gray-400">|</span>
                    <span className="inline-flex gap-0.5">
                      {[20, 40, 60, 80, 100].map((threshold) => (
                        <span key={threshold} className={`w-1.5 h-1.5 rounded-full ${
                          rec.confidence_score >= threshold
                            ? rec.confidence_score >= 70 ? 'bg-green-500' : rec.confidence_score >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                      ))}
                    </span>
                    <span className={`font-semibold text-[10px] ${
                      rec.confidence_score >= 70 ? 'text-green-600 dark:text-green-400' :
                      rec.confidence_score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`}>{rec.confidence_score}%</span>
                  </span>
                )}
              </div>
            ) : (
              <div>
                <span className="font-medium">Reason:</span> <span className={isMaintenance ? 'font-bold text-yellow-600 dark:text-yellow-400' : ''}>{rec.reason}</span> | <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB
              </div>
            )}
            {rec.ai_confidence_adjustment && rec.ai_confidence_adjustment !== 0 && (
              <span className="ml-2" title="AI-adjusted confidence modification">
                | <span className="font-medium">AI Adjustment:</span>{' '}
                <span className={`font-semibold ${
                  rec.ai_confidence_adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {rec.ai_confidence_adjustment > 0 ? '+' : ''}{rec.ai_confidence_adjustment}
                </span>
              </span>
            )}
          </div>

          {/* Risk Badge + Conflict Warning */}
          {!isCompleted && (rec.risk_level || rec.has_conflict) && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {rec.risk_level && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                  rec.risk_level === 'very_high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                  rec.risk_level === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                  rec.risk_level === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`} title={rec.risk_factors?.map(f => f.detail).join('\n') || ''}>
                  <AlertTriangle size={10} />
                  Risk: {rec.risk_level === 'very_high' ? 'Very High' : rec.risk_level.charAt(0).toUpperCase() + rec.risk_level.slice(1)}
                  ({rec.risk_score}/100)
                </span>
              )}
              {rec.has_conflict && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  title={`Multiple migrations targeting ${rec.conflict_target} — combined load may exceed thresholds`}>
                  <XCircle size={10} />
                  Target Conflict
                </span>
              )}
              {rec.cost_benefit && rec.cost_benefit.ratio != null && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                  rec.cost_benefit.ratio >= 2.0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  rec.cost_benefit.ratio >= 1.0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`} title={`Cost-benefit ratio: ${rec.cost_benefit.ratio.toFixed(1)}x — Score improvement: +${rec.cost_benefit.score_improvement?.toFixed(0) || '?'} pts, Est. duration: ${rec.cost_benefit.estimated_duration_minutes?.toFixed(0) || '?'} min`}>
                  ROI: {rec.cost_benefit.ratio.toFixed(1)}x
                </span>
              )}
            </div>
          )}

          {rec.ai_insight && (
            <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs">
              <div className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 font-semibold shrink-0">AI:</span>
                <span className="text-gray-700 dark:text-gray-300">{rec.ai_insight}</span>
              </div>
            </div>
          )}
          {rec.bind_mount_warning && (
            <div className={`mt-2 p-2 ${
              rec.mount_point_info?.has_unshared_bind_mount
                ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-300 dark:border-orange-700'
                : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-300 dark:border-green-700'
            } rounded text-xs`}>
              <div className="flex items-start gap-2">
                <Folder size={14} className={`shrink-0 ${
                  rec.mount_point_info?.has_unshared_bind_mount
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                }`} />
                <span className="text-gray-700 dark:text-gray-300">{rec.bind_mount_warning}</span>
              </div>
            </div>
          )}

          {/* Decision Explanation (one-liner, always visible when trend data available) */}
          {rec.decision_explanation && (
            <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 italic">
              {rec.decision_explanation}
            </div>
          )}

          {/* "Why This Migration?" Combined Expandable Section */}
          {(rec.score_details || rec.trend_evidence?.available) && !isCompleted && (
            <div className="mt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const detailsKey = `details-${idx}`;
                  setCollapsedSections(prev => ({ ...prev, [detailsKey]: !prev[detailsKey] }));
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Activity size={12} />
                {collapsedSections[`details-${idx}`] ? 'Hide details' : 'Why this migration?'}
              </button>
              {collapsedSections[`details-${idx}`] && (
                <div className="mt-2 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-700 rounded text-xs space-y-3">
                  {/* Source vs Target — Scores, Penalties & Trends */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                        Source: {rec.source_node}
                        {rec.trend_evidence?.available && (() => {
                          const dir = rec.trend_evidence.source_node_trend?.cpu_direction;
                          if (dir === 'sustained_increase' || dir === 'rising')
                            return <TrendingUp size={12} className="text-red-500" />;
                          if (dir === 'sustained_decrease' || dir === 'falling')
                            return <TrendingDown size={12} className="text-green-500" />;
                          return <Minus size={12} className="text-gray-400" />;
                        })()}
                      </div>
                      <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                        {rec.score_details && (
                          <>
                            <div>Score: {rec.score_details.source?.total_score?.toFixed(1) || 'N/A'}</div>
                            <div className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500">Penalties:</div>
                            {Object.entries(rec.score_details.source?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                              <div key={key} className="flex justify-between">
                                <span>{key.replace(/_/g, ' ')}</span>
                                <span className="text-red-500 dark:text-red-400 font-mono">+{val}</span>
                              </div>
                            ))}
                            {Object.values(rec.score_details.source?.penalties || {}).every(v => v === 0) && (
                              <div className="text-green-600 dark:text-green-400">No penalties</div>
                            )}
                          </>
                        )}
                        {rec.trend_evidence?.available && (
                          <div className={rec.score_details ? 'mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-700/50' : ''}>
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-0.5">Trends:</div>
                            <div>CPU: {rec.trend_evidence.source_node_trend?.cpu_trend || 'N/A'}</div>
                            <div>Memory: {rec.trend_evidence.source_node_trend?.mem_trend || 'N/A'}</div>
                            <div>Stability: {rec.trend_evidence.source_node_trend?.stability_score || '?'}/100</div>
                            {rec.trend_evidence.source_node_trend?.above_baseline && (
                              <div className="text-orange-600 dark:text-orange-400 font-medium">
                                Above baseline ({rec.trend_evidence.source_node_trend.baseline_deviation_sigma?.toFixed(1) || '?'}σ)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                        Target: {rec.target_node}
                        {rec.trend_evidence?.available && (() => {
                          const dir = rec.trend_evidence.target_node_trend?.cpu_direction;
                          if (dir === 'sustained_increase' || dir === 'rising')
                            return <TrendingUp size={12} className="text-orange-500" />;
                          if (dir === 'sustained_decrease' || dir === 'falling')
                            return <TrendingDown size={12} className="text-green-500" />;
                          return <Minus size={12} className="text-gray-400" />;
                        })()}
                      </div>
                      <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                        {rec.score_details && (
                          <>
                            <div>Score: {rec.score_details.target?.total_score?.toFixed(1) || 'N/A'}</div>
                            <div className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500">Penalties:</div>
                            {Object.entries(rec.score_details.target?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                              <div key={key} className="flex justify-between">
                                <span>{key.replace(/_/g, ' ')}</span>
                                <span className="text-red-500 dark:text-red-400 font-mono">+{val}</span>
                              </div>
                            ))}
                            {Object.values(rec.score_details.target?.penalties || {}).every(v => v === 0) && (
                              <div className="text-green-600 dark:text-green-400">No penalties</div>
                            )}
                          </>
                        )}
                        {rec.trend_evidence?.available && (
                          <div className={rec.score_details ? 'mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-700/50' : ''}>
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-0.5">Trends:</div>
                            <div>CPU: {rec.trend_evidence.target_node_trend?.cpu_trend || 'N/A'}</div>
                            <div>Memory: {rec.trend_evidence.target_node_trend?.mem_trend || 'N/A'}</div>
                            <div>Stability: {rec.trend_evidence.target_node_trend?.stability_score || '?'}/100</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* After Migration Predictions */}
                  {rec.score_details?.target?.metrics && (
                    <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-1">After migration on {rec.target_node}:</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600 dark:text-gray-400">
                        <span>CPU: {rec.score_details.target.metrics.predicted_cpu}%</span>
                        <span>Memory: {rec.score_details.target.metrics.predicted_mem}%</span>
                        <span>Headroom: {rec.score_details.target.metrics.cpu_headroom}% CPU, {rec.score_details.target.metrics.mem_headroom}% mem</span>
                      </div>
                    </div>
                  )}

                  {/* Stability Factors */}
                  {rec.score_details && (rec.score_details.target?.trend_analysis || rec.score_details.source?.trend_analysis) && (
                    <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700 flex flex-wrap gap-2">
                      {rec.score_details.source?.trend_analysis?.cpu_stability_factor != null && rec.score_details.source.trend_analysis.cpu_stability_factor !== 1.0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded text-gray-600 dark:text-gray-400"
                          title={`Source CPU penalties scaled by ${rec.score_details.source.trend_analysis.cpu_stability_factor}x based on stability score ${rec.score_details.source.trend_analysis.stability_score}`}>
                          Source CPU factor: {rec.score_details.source.trend_analysis.cpu_stability_factor}x
                        </span>
                      )}
                      {rec.score_details.target?.trend_analysis?.cpu_stability_factor != null && rec.score_details.target.trend_analysis.cpu_stability_factor !== 1.0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded text-gray-600 dark:text-gray-400"
                          title={`Target CPU penalties scaled by ${rec.score_details.target.trend_analysis.cpu_stability_factor}x based on stability score ${rec.score_details.target.trend_analysis.stability_score}`}>
                          Target CPU factor: {rec.score_details.target.trend_analysis.cpu_stability_factor}x
                        </span>
                      )}
                    </div>
                  )}

                  {/* Guest Behavior */}
                  {rec.trend_evidence?.guest_trend && (
                    <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Guest Behavior</div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.trend_evidence.guest_trend.behavior === 'growing' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                          rec.trend_evidence.guest_trend.behavior === 'bursty' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          rec.trend_evidence.guest_trend.behavior === 'steady' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>{rec.trend_evidence.guest_trend.behavior || 'unknown'}</span>
                        <span className="text-gray-500 dark:text-gray-400">CPU: {rec.trend_evidence.guest_trend.cpu_growth_rate || 'N/A'}</span>
                        {rec.trend_evidence.guest_trend.previous_migrations > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            | Migrated {rec.trend_evidence.guest_trend.previous_migrations}x before
                          </span>
                        )}
                        {rec.trend_evidence.guest_trend.peak_hours?.length > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            | Peak hours: {rec.trend_evidence.guest_trend.peak_hours.map(h => `${h}:00`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Decision Factors */}
                  {rec.trend_evidence?.decision_factors?.length > 0 && (
                    <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Decision Factors</div>
                      <div className="space-y-1">
                        {rec.trend_evidence.decision_factors.map((f, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                              f.type === 'problem' ? 'bg-red-500' :
                              f.type === 'positive' ? 'bg-green-500' :
                              f.type === 'concern' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="text-gray-600 dark:text-gray-400">
                              {f.factor}
                              {f.weight === 'high' && <span className="ml-1 text-[9px] font-bold text-gray-400 dark:text-gray-500">(HIGH)</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Quality */}
                  {rec.trend_evidence?.data_quality && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                      Based on {rec.trend_evidence.data_quality.node_history_days || 0} days of node history,{' '}
                      {rec.trend_evidence.data_quality.guest_history_days || 0} days of guest history.{' '}
                      {rec.trend_evidence.data_quality.confidence_note}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-1">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const commandKey = `command-${idx}`;
                  setCollapsedSections(prev => ({ ...prev, [commandKey]: !prev[commandKey] }));
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Terminal size={12} />
                {collapsedSections[`command-${idx}`] ? 'Hide command' : 'Show command'}
              </button>
            </div>
            {collapsedSections[`command-${idx}`] && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(rec.command);
                  const btn = e.currentTarget;
                  const originalText = btn.textContent;
                  btn.textContent = 'Copied!';
                  btn.classList.add('bg-green-100', 'dark:bg-green-900');
                  setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                  }, 1000);
                }}
                className={`text-xs font-mono p-2 rounded mt-1 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                  isCompleted
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                }`}
                title="Click to copy"
              >
                {rec.command}
              </div>
            )}
          </div>
        </div>
        <div className="sm:ml-4 flex items-center gap-2 shrink-0">
          {(() => {
            if (isCompleted) {
              return (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                    <CheckCircle size={16} />
                    Migrated
                  </div>
                  {canMigrate && (
                    <button
                      onClick={async () => {
                        try {
                          const { fetchRollbackInfo, executeRollback } = await import('../../api/client.js');
                          const infoRes = await fetchRollbackInfo(rec.vmid);
                          if (infoRes.error || !infoRes.success) {
                            setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'unavailable' }));
                            return;
                          }
                          const info = infoRes.rollback_info;
                          if (!info.available) { alert(`Rollback unavailable: ${info.detail}`); return; }
                          if (!info.rollback_safe) {
                            if (!confirm(`Rollback may be risky: ${info.detail}\n\nProceed anyway?`)) return;
                          }
                          if (!confirm(`Rollback ${rec.type} ${rec.vmid} (${rec.name}) back to ${info.original_node}?`)) return;
                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'running' }));
                          const result = await executeRollback(rec.vmid);
                          if (result.success) {
                            setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'done' }));
                          } else {
                            alert(`Rollback failed: ${result.error || 'Unknown error'}`);
                            setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'failed' }));
                          }
                        } catch (err) { alert(`Rollback error: ${err.message}`); }
                      }}
                      disabled={migrationStatus[`rollback-${rec.vmid}`] === 'running'}
                      className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      title="Rollback: migrate back to original node"
                    >
                      {migrationStatus[`rollback-${rec.vmid}`] === 'running' ? (
                        <><RefreshCw size={12} className="animate-spin" /> Rolling back...</>
                      ) : migrationStatus[`rollback-${rec.vmid}`] === 'done' ? (
                        <><CheckCircle size={12} /> Rolled back</>
                      ) : (
                        <><RotateCcw size={12} /> Rollback</>
                      )}
                    </button>
                  )}
                </div>
              );
            }

            const isMigrating = guestsMigrating[rec.vmid] === true;
            if (isMigrating && canMigrate) {
              const progress = migrationProgress[rec.vmid];
              let progressText = '';
              let tooltipText = 'Cancel migration in progress';
              if (progress) {
                if (progress.percentage) {
                  progressText = ` ${progress.percentage}%`;
                  if (progress.total_human_readable) tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                } else {
                  progressText = ` (${progress.human_readable})`;
                }
              }
              return (
                <button
                  onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                  title={tooltipText}
                >
                  <RefreshCw size={16} className="animate-spin" />
                  Cancel{progressText}
                </button>
              );
            }

            return (
              <button
                onClick={() => setConfirmMigration(rec)}
                disabled={!canMigrate || status === 'running' || isMigrating}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
              >
                {!canMigrate ? (
                  <><Lock size={16} /> Read-Only</>
                ) : isMigrating ? (
                  <><RefreshCw size={16} className="animate-spin" /> Migrating...</>
                ) : status === 'running' ? (
                  <><RefreshCw size={16} className="animate-spin" /> Starting...</>
                ) : (
                  <><Play size={16} /> Migrate</>
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
