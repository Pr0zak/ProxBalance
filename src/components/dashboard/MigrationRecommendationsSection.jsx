import {
  Activity, RefreshCw, CheckCircle, ChevronDown, Moon, Play, X
} from '../Icons.jsx';
import { GLASS_CARD, iconBadge, BTN_PRIMARY, ICON, statusBadge } from '../../utils/designTokens.js';

import { formatLocalTime } from '../../utils/formatters.js';

import RecommendationSummaryBar from './recommendations/RecommendationSummaryBar.jsx';
import AlertsBanner from './recommendations/AlertsBanner.jsx';
import RecommendationFilters from './recommendations/RecommendationFilters.jsx';
import RecommendationCard from './recommendations/RecommendationCard.jsx';
import SkippedGuests from './recommendations/SkippedGuests.jsx';
import ImpactStrip from './recommendations/ImpactStrip.jsx';
import ConflictResolver from './recommendations/ConflictResolver.jsx';
import { SelectionToolbar, SelectionActionBar } from './recommendations/SelectionControls.jsx';
import { vkey, subsetPlan, planWaves, simulateImpact, conflictState } from './recommendations/planMath.js';
import EngineDiagnostics from './recommendations/insights/EngineDiagnostics.jsx';
import { Info } from '../Icons.jsx';

const { useState, useEffect, useCallback } = React;

// Clipboard write that also works on plain-HTTP origins, where
// navigator.clipboard is unavailable. Returns a Promise<boolean>.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// Drop entries whose suggestion disappeared after a regenerate.
const pruneTo = (live) => (prev) => {
  const next = new Set([...prev].filter(v => live.has(v)));
  return next.size === prev.size ? prev : next;
};

export default function MigrationRecommendationsSection({
  // Data
  data,
  recommendations, loadingRecommendations, generateRecommendations, recommendationData, penaltyConfig,
  // Section collapse
  collapsedSections, setCollapsedSections, toggleSection,
  // Migrations
  canMigrate, migrationStatus, setMigrationStatus, completedMigrations, guestsMigrating, migrationProgress,
  cancelMigration, trackMigration, setConfirmMigration,
  // Navigation
  setCurrentPage, setOpenPenaltyConfigOnAutomation,
  // Node scores (for predicted view)
  nodeScores,
  // API
  API_BASE,
  // For per-rec auto-eligibility badges
  automationStatus,
  automationConfig,
  // Run Plan orchestration — opens the root-level run modal (state lives in useMigrations).
  openRunPlan,
  // When embedded (e.g. inside a tab), suppress the section title block.
  embedded = false,
}) {
  const expanded = embedded ? true : !collapsedSections.recommendations;
  // Local state for filters
  const [recFilterConfidence, setRecFilterConfidence] = useState('');
  const [recFilterTargetNode, setRecFilterTargetNode] = useState('');
  const [recFilterSourceNode, setRecFilterSourceNode] = useState('');
  const [recSortBy, setRecSortBy] = useState('');
  const [recSortDir, setRecSortDir] = useState('desc');
  const [showRecFilters, setShowRecFilters] = useState(false);
  // Suggestions picked for "run / copy just these" (vmid strings).
  const [selectedVmids, setSelectedVmids] = useState(() => new Set());
  // Suggestions left out of this run, e.g. to resolve a target conflict.
  // Page-local on purpose: the next generation re-evaluates them.
  const [deferred, setDeferred] = useState(() => new Set());
  const [copyState, setCopyState] = useState('idle');
  // Height the floating selection bar covers, so the list can pad for it.
  const [barCover, setBarCover] = useState(0);

  useEffect(() => {
    const live = new Set(recommendations.map(r => vkey(r.vmid)));
    setSelectedVmids(pruneTo(live));
    setDeferred(pruneTo(live));
  }, [recommendations]);

  const summary = recommendationData?.summary;
  const conflicts = recommendationData?.conflicts || [];
  const isDone = (r) => completedMigrations[r.vmid] !== undefined;

  const activeRecs = recommendations.filter(r => !deferred.has(vkey(r.vmid)));
  const deferredRecs = recommendations.filter(r => deferred.has(vkey(r.vmid)));
  const runnableRecs = activeRecs.filter(r => !isDone(r));
  const selectedRecs = runnableRecs.filter(r => selectedVmids.has(vkey(r.vmid)));

  // The engine's plan minus deferred / finished moves, renumbered.
  const enginePlan = recommendationData?.execution_plan;
  const activePlan = subsetPlan(enginePlan, runnableRecs);
  const stepOf = {};
  for (const s of activePlan.ordered_recommendations) stepOf[vkey(s.vmid)] = s;

  // Conflicts that the current deferrals have not resolved yet.
  const unresolvedTargets = new Set(
    conflicts.filter(c => !conflictState(c, summary, deferred).fits).map(c => c.target_node),
  );
  const isConflicting = (r) => !!r.has_conflict && unresolvedTargets.has(r.conflict_target || r.target_node);

  // Impact strip scope: the selection, else what is left after deferrals, else everything.
  const fallbackLimits = conflicts[0]
    ? { cpu: conflicts[0].cpu_threshold, mem: conflicts[0].mem_threshold }
    : automationConfig?.safety_checks
      ? {
        cpu: automationConfig.safety_checks.max_node_cpu_percent || 85,
        mem: automationConfig.safety_checks.max_node_memory_percent || 90,
      }
      : null;
  let impactScope = null;
  let scopeLabel = `If all ${recommendations.length} run`;
  if (selectedRecs.length) {
    impactScope = new Set(selectedRecs.map(r => vkey(r.vmid)));
    scopeLabel = `If the ${selectedRecs.length} selected run`;
  } else if (deferred.size) {
    impactScope = new Set(activeRecs.map(r => vkey(r.vmid)));
    scopeLabel = `If the ${activeRecs.length} remaining run (${deferredRecs.length} left out)`;
  }
  const impact = simulateImpact(summary, impactScope, fallbackLimits);
  const overTargets = new Set((impact?.nodes || []).filter(n => n.overCpu || n.overMem).map(n => n.name));

  // --- Selection ---
  const toggleSelect = (vmid) => setSelectedVmids(prev => {
    const next = new Set(prev);
    const k = vkey(vmid);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const selectWhere = (pred) => setSelectedVmids(new Set(runnableRecs.filter(pred).map(r => vkey(r.vmid))));
  const clearSelection = () => setSelectedVmids(new Set());

  // --- Deferral ---
  const setDeferredMany = (vmids, on = true) => {
    const keys = vmids.map(vkey);
    setDeferred(prev => {
      const next = new Set(prev);
      keys.forEach(k => (on ? next.add(k) : next.delete(k)));
      return next;
    });
    if (on) {
      setSelectedVmids(prev => {
        if (!keys.some(k => prev.has(k))) return prev;
        const next = new Set(prev);
        keys.forEach(k => next.delete(k));
        return next;
      });
    }
  };
  const toggleDefer = (vmid) => setDeferredMany([vmid], !deferred.has(vkey(vmid)));

  // Engine's alternative target for a conflicting guest: the normal migrate dialog.
  const handleSendElsewhere = (rec, target) => {
    setConfirmMigration({
      ...rec,
      target_node: target,
      command: (rec.command || '').replace(` ${rec.target_node} `, ` ${target} `),
      score_improvement: undefined,
      reason: `Resolves the ${rec.target_node} conflict: the engine's alternative target for ${rec.name}.`,
    });
  };

  // --- Running ---
  const outsideWindow = automationStatus?.enabled
    && (automationStatus.state?.current_window || '').toLowerCase().startsWith('outside');

  const openPlanFor = (recs) => {
    if (!openRunPlan || !recs.length) return;
    openRunPlan({
      plan: subsetPlan(enginePlan, recs),
      recommendations: recs,
      maxConcurrent: automationConfig?.rules?.max_concurrent_migrations || 1,
      outsideWindow,
    });
  };

  const handleCopyCommands = async () => {
    const byVmid = Object.fromEntries(selectedRecs.map(r => [vkey(r.vmid), r]));
    const lines = [`# ProxBalance: ${selectedRecs.length} migration${selectedRecs.length !== 1 ? 's' : ''} in plan order. Run each on its source node; finish a wave before starting the next.`];
    for (const { wave, steps } of planWaves(subsetPlan(enginePlan, selectedRecs))) {
      lines.push(`# Wave ${wave}`);
      for (const s of steps) {
        const r = byVmid[vkey(s.vmid)];
        lines.push(`${r?.command || `# no command for ${s.vmid}`}   # on ${s.source_node}: ${s.name} -> ${s.target_node}`);
      }
    }
    const ok = await copyText(lines.join('\n'));
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 1800);
  };

  const handleBarCover = useCallback((h) => setBarCover(h), []);

  // Apply client-side filters and sorting
  const getFilteredRecs = () => {
    let filtered = [...activeRecs];
    if (recFilterConfidence) {
      const minConf = parseInt(recFilterConfidence);
      filtered = filtered.filter(r => (r.confidence_score || 0) >= minConf);
    }
    if (recFilterSourceNode) {
      filtered = filtered.filter(r => r.source_node === recFilterSourceNode);
    }
    if (recFilterTargetNode) {
      filtered = filtered.filter(r => r.target_node === recFilterTargetNode);
    }
    if (recSortBy) {
      filtered.sort((a, b) => {
        const getValue = (rec) => {
          if (recSortBy === 'cost_benefit_ratio') return rec.cost_benefit?.ratio || 0;
          return rec[recSortBy] || 0;
        };
        const va = getValue(a);
        const vb = getValue(b);
        return recSortDir === 'asc' ? va - vb : vb - va;
      });
    }
    return filtered;
  };

  // Cards grouped into the active plan's waves, in step order. A user-chosen
  // sort shows a flat list instead; finished moves go last.
  const getWaves = (recs) => {
    if (recSortBy || activePlan.total_steps < 2) return null;
    const inList = new Set(recs.map(r => vkey(r.vmid)));
    const recBy = Object.fromEntries(recs.map(r => [vkey(r.vmid), r]));
    const waves = planWaves(activePlan).map(({ wave, steps }) => {
      const items = steps.filter(s => inList.has(vkey(s.vmid))).map(s => ({ rec: recBy[vkey(s.vmid)], step: s.step }));
      const reasons = {};
      for (const s of steps) if (s.reason_for_order) reasons[s.reason_for_order] = (reasons[s.reason_for_order] || 0) + 1;
      const reason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0];
      return { key: `w${wave}`, label: `Wave ${wave}`, wave, items, reason, total: steps.length };
    }).filter(w => w.items.length);
    const done = recs.filter(isDone);
    if (done.length) waves.push({ key: 'done', label: 'Done', items: done.map(rec => ({ rec })), done: true });
    return waves;
  };

  const renderCard = (rec, idx, step) => (
    <RecommendationCard
      key={`${rec.vmid}-${rec.target_node}`}
      rec={rec}
      idx={idx}
      step={step}
      penaltyConfig={penaltyConfig}
      recommendationData={recommendationData}
      migrationStatus={migrationStatus}
      setMigrationStatus={setMigrationStatus}
      completedMigrations={completedMigrations}
      guestsMigrating={guestsMigrating}
      migrationProgress={migrationProgress}
      cancelMigration={cancelMigration}
      setConfirmMigration={setConfirmMigration}
      canMigrate={canMigrate}
      collapsedSections={collapsedSections}
      setCollapsedSections={setCollapsedSections}
      automationStatus={automationStatus}
      selectable
      selected={selectedVmids.has(vkey(rec.vmid))}
      onToggleSelect={toggleSelect}
      conflictActive={isConflicting(rec)}
    />
  );

  const Wrapper = embedded ? React.Fragment : 'div';
  const wrapperProps = embedded ? {} : { className: GLASS_CARD.replace('mb-6', 'mb-24') + ' overflow-hidden' };


  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-y-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={iconBadge('orange', 'red')}>
                <Activity size={ICON.section} className="text-pb-text dark:text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-pb-text dark:text-white">Migration Suggestions</h2>
                  <button
                    onClick={() => toggleSection('recommendations')}
                    className="p-1 hover:bg-pb-surface2 dark:hover:bg-slate-700 rounded transition-all duration-200"
                    title={collapsedSections.recommendations ? "Expand section" : "Collapse section"}
                  >
                    <ChevronDown size={ICON.section} className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${!collapsedSections.recommendations ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-pb-text2 dark:text-gray-400">Suggested optimizations</p>
                  {recommendationData?.ai_enhanced && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-600 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">
                      AI Enhanced
                    </span>
                  )}
                  {recommendationData?.generated_at && (
                    <span className="text-xs text-pb-text2 dark:text-gray-500">
                      • Generated: {(() => {
                        const genTime = new Date(recommendationData.generated_at);
                        return formatLocalTime(genTime);
                      })()} (backend auto-generates every 10-60min based on cluster size)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/Pr0zak/ProxBalance/blob/main/docs/SCORING_ALGORITHM.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-2 text-sm text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 rounded-lg hover:bg-pb-surface2/60 dark:hover:bg-slate-700/40 transition-colors"
                title="How is the score calculated? — opens the scoring algorithm docs"
              >
                <Info size={16} />
                <span className="hidden sm:inline">How scoring works</span>
              </a>
              <button
                onClick={generateRecommendations}
                disabled={loadingRecommendations || !data}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                title="Manually generate new recommendations now"
              >
                {loadingRecommendations ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Generate Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* When embedded, render a slim toolbar with just the action buttons */}
      {embedded && (
        <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
          {recommendationData?.ai_enhanced && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-600 rounded text-xs font-semibold text-purple-700 dark:text-purple-300 mr-auto">
              AI Enhanced
            </span>
          )}
          {recommendationData?.generated_at && (
            <span className="text-xs text-pb-text2 dark:text-gray-500 mr-auto">
              Generated: {formatLocalTime(new Date(recommendationData.generated_at))}
            </span>
          )}
          <a
            href="https://github.com/Pr0zak/ProxBalance/blob/main/docs/SCORING_ALGORITHM.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 rounded-lg hover:bg-pb-surface2/60 dark:hover:bg-slate-700/40 transition-colors"
            title="How is the score calculated? — opens the scoring algorithm docs"
          >
            <Info size={14} />
            <span className="hidden sm:inline">How scoring works</span>
          </a>
          <button
            onClick={generateRecommendations}
            disabled={loadingRecommendations || !data}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            title="Generate now"
          >
            {loadingRecommendations ? (
              <><RefreshCw size={14} className="animate-spin" />Generating...</>
            ) : (
              <><RefreshCw size={14} />Generate Now</>
            )}
          </button>
        </div>
      )}

      {expanded && (
        <div className="transition-all duration-300 ease-in-out">

          {/* Outside-window notice — auto-migration is paused; manual still works */}
          {outsideWindow && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg border bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600/60 text-slate-700 dark:text-slate-300">
              <Moon size={14} className="shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold">Outside migration window</span> — auto-migration is paused and will not pick these up until the next window opens. Manual migrations from the cards below still work.
              </div>
            </div>
          )}

          {/* Health digest + predicted impact for the current scope (one strip) */}
          {!loadingRecommendations && recommendations.length > 0 && (
            impact
              ? <ImpactStrip impact={impact} summary={summary} scopeLabel={scopeLabel} />
              : <RecommendationSummaryBar recommendationData={recommendationData} />
          )}

          {/* Target-node conflicts as what-if panels (defer / send elsewhere) */}
          {!loadingRecommendations && recommendations.length > 0 && conflicts.map((c, i) => (
            <ConflictResolver
              key={`${c.target_node}-${i}`}
              conflict={c}
              summary={summary}
              recommendations={recommendations}
              deferred={deferred}
              onToggleDefer={toggleDefer}
              onDeferMany={setDeferredMany}
              onSendElsewhere={handleSendElsewhere}
              canMigrate={canMigrate}
            />
          ))}

          {/* Alerts: capacity advisories + trend forecasts */}
          {!loadingRecommendations && (
            <AlertsBanner
              recommendationData={recommendationData}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
            />
          )}

          {/* Filter & Sort Controls */}
          {!loadingRecommendations && (
            <RecommendationFilters
              recommendations={activeRecs}
              showRecFilters={showRecFilters}
              setShowRecFilters={setShowRecFilters}
              recFilterConfidence={recFilterConfidence}
              setRecFilterConfidence={setRecFilterConfidence}
              recFilterSourceNode={recFilterSourceNode}
              setRecFilterSourceNode={setRecFilterSourceNode}
              recFilterTargetNode={recFilterTargetNode}
              setRecFilterTargetNode={setRecFilterTargetNode}
              recSortBy={recSortBy}
              setRecSortBy={setRecSortBy}
              recSortDir={recSortDir}
              setRecSortDir={setRecSortDir}
            />
          )}

          {/* Main Content: Loading / Empty / Recommendation Cards */}
          {loadingRecommendations ? (
            <div className="text-center py-8">
              <RefreshCw size={48} className="mx-auto mb-3 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="font-medium text-pb-text dark:text-gray-300">Generating recommendations...</p>
              {recommendationData?.ai_enhanced && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">AI enhancement in progress</p>
              )}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle size={28} className="shrink-0 text-green-600 dark:text-green-400" />
              <div className="min-w-0">
                <p className="font-medium text-pb-text dark:text-gray-200">Cluster is balanced — no migrations recommended right now</p>
                <EngineDiagnostics recommendationData={recommendationData} recommendations={recommendations} />
              </div>
            </div>
          ) : (() => {
            const filtered = getFilteredRecs();
            const waves = getWaves(filtered);
            const plannedWaves = waves ? waves.filter(w => !w.done).length : 0;
            const canRunAll = canMigrate && !!openRunPlan && runnableRecs.length > 1;
            return (
              <div style={barCover ? { paddingBottom: barCover } : undefined}>
                {/* List header: run order + run everything */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="text-sm text-pb-text dark:text-gray-200">
                    <span className="font-semibold">{waves ? 'Run order' : 'Suggestions'}</span>
                    <span className="text-pb-text2 dark:text-gray-400">
                      {' '}· {filtered.length} migration{filtered.length !== 1 ? 's' : ''}
                      {plannedWaves > 1 ? ` in ${plannedWaves} waves; each wave waits for the one before` : ''}
                    </span>
                  </div>
                  {canRunAll && (
                    <button
                      onClick={() => openPlanFor(runnableRecs)}
                      className={BTN_PRIMARY}
                      title="Review, then run every suggestion wave by wave; halts on the first failure"
                    >
                      <Play size={14} /> Run all {runnableRecs.length} in order
                    </button>
                  )}
                </div>

                <SelectionToolbar
                  recommendations={runnableRecs}
                  selected={selectedVmids}
                  isConflicting={isConflicting}
                  onSelectWhere={selectWhere}
                  onClear={clearSelection}
                />

                {deferredRecs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-pb-text2 dark:text-gray-400" data-deferred-row>
                    <span>Left out of this run:</span>
                    {deferredRecs.map(r => (
                      <button
                        key={r.vmid}
                        onClick={() => toggleDefer(r.vmid)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-pb-text dark:hover:text-gray-200"
                        title="Put this migration back into the run"
                      >
                        {r.name} <span className="opacity-60">{r.source_node} → {r.target_node}</span> <X size={10} />
                      </button>
                    ))}
                    {deferredRecs.length > 1 && (
                      <button onClick={() => setDeferred(new Set())} className="underline hover:text-pb-text dark:hover:text-gray-200">Restore all</button>
                    )}
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="text-center py-6 text-sm text-pb-text2 dark:text-gray-400">
                    {activeRecs.length === 0
                      ? <>Every suggestion is left out of this run. <button onClick={() => setDeferred(new Set())} className="underline">Restore all</button></>
                      : <>No suggestions match the current filters ({activeRecs.length} hidden).</>}
                  </div>
                ) : waves ? waves.map((w, wi) => (
                  <div key={w.key}>
                    <div className="flex items-center gap-2 mt-4 mb-2 text-xs">
                      <span className={`${statusBadge(w.done ? 'green' : 'blue')} shrink-0 whitespace-nowrap`}>{w.label}</span>
                      <span className="text-pb-text2 dark:text-gray-400 min-w-0">
                        {w.items.length} migration{w.items.length !== 1 ? 's' : ''}
                        {!w.done && w.items.length < w.total ? ` of ${w.total} shown` : ''}
                        {!w.done && w.total > 1 ? ' · can run in parallel' : ''}
                        {!w.done && wi > 0 ? ` · starts after wave ${w.wave - 1}` : ''}
                        {w.reason && !w.done ? ` · ${w.reason}` : ''}
                      </span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                    </div>
                    <div className="space-y-3">
                      {w.items.map(({ rec, step }, i) => renderCard(rec, i, step))}
                    </div>
                  </div>
                )) : (
                  <div className="space-y-3 mt-3">
                    {filtered.map((rec, idx) => renderCard(rec, idx, stepOf[vkey(rec.vmid)]?.step))}
                  </div>
                )}

                <SelectionActionBar
                  selectedRecs={selectedRecs}
                  overTargets={overTargets}
                  canRun={canMigrate && !!openRunPlan}
                  onRun={() => openPlanFor(selectedRecs)}
                  onCopy={handleCopyCommands}
                  copyState={copyState}
                  onClear={clearSelection}
                  onCoverChange={handleBarCover}
                />
              </div>
            );
          })()}

          {/* Skipped Guests */}
          {!loadingRecommendations && (
            <SkippedGuests
              recommendationData={recommendationData}
              penaltyConfig={penaltyConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
            />
          )}
        </div>
      )}

    </Wrapper>
  );
}
