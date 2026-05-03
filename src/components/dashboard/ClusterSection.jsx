import { GLASS_CARD, iconBadge, ICON } from '../../utils/designTokens.js';
import { Server, Settings } from '../Icons.jsx';
import NodeSummaryTable from './NodeSummaryTable.jsx';
import GuestsTable from './GuestsTable.jsx';
import ClusterMap from './ClusterMap.jsx';
import NodeStatusSection from './NodeStatusSection.jsx';
import MigrationRecommendationsSection from './MigrationRecommendationsSection.jsx';
import ClusterHealthChart from './ClusterHealthChart.jsx';

const { useState, useEffect, useRef } = React;

const ALL_TABS = [
  { id: 'table',           label: 'Nodes',   promoteKey: null   },
  { id: 'guests',          label: 'Guests',  promoteKey: null   },
  { id: 'map',             label: 'Map',     promoteKey: 'map'    },
  { id: 'charts',          label: 'Charts',  promoteKey: 'charts' },
  { id: 'recommendations', label: 'Recs',    promoteKey: 'recs'   },
];

const PROMOTABLE = [
  { key: 'recs',   label: 'Recommendations' },
  { key: 'map',    label: 'Map' },
  { key: 'charts', label: 'Charts' },
];

/**
 * Unified Cluster section — one card with three tabs (Table / Map / Charts).
 * Each tab renders the existing per-view component in embedded mode (no inner
 * header — its toolbar controls remain).
 */
export default function ClusterSection(props) {
  const promoted = props.promotedSections || {};
  const setPromoted = props.setPromotedSections || (() => {});
  const recCount = Array.isArray(props.recommendations) ? props.recommendations.length : 0;

  // Filter out tabs whose content was promoted to a standalone section
  const TABS = ALL_TABS
    .filter(t => !t.promoteKey || !promoted[t.promoteKey])
    .map(t => t.id === 'recommendations'
      ? { ...t, label: `Recs${recCount > 0 ? ` (${recCount})` : ''}`, accent: recCount > 0 }
      : t);

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('clusterSectionTab') || 'table';
  });
  const effectiveTab = TABS.find(t => t.id === activeTab) ? activeTab : 'table';
  const setTab = (id) => {
    setActiveTab(id);
    localStorage.setItem('clusterSectionTab', id);
  };

  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!layoutMenuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setLayoutMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [layoutMenuOpen]);

  // Lazy-load Chart.js when Charts tab becomes active (mirrors index.jsx).
  useEffect(() => {
    if (effectiveTab === 'charts' && props.loadChartJs && !props.chartJsLoaded) {
      props.loadChartJs();
    }
  }, [effectiveTab, props.chartJsLoaded]);

  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={iconBadge('teal', 'cyan')}>
            <Server size={ICON.section} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Cluster</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-slate-800/60 border border-slate-700/50 p-1 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  effectiveTab === t.id
                    ? 'bg-blue-600 text-white shadow'
                    : t.accent
                      ? 'text-orange-300 hover:text-orange-200'
                      : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setLayoutMenuOpen(o => !o)}
              className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-gray-400 hover:text-gray-200 hover:bg-slate-700/40"
              title="Layout — promote tabs to standalone sections"
              aria-label="Section layout"
            >
              <Settings size={14} />
            </button>
            {layoutMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 p-3">
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Show as standalone section</div>
                {PROMOTABLE.map(p => (
                  <label key={p.key} className="flex items-center gap-2 py-1.5 text-sm text-gray-200 cursor-pointer hover:bg-slate-700/40 rounded px-2 -mx-2">
                    <input
                      type="checkbox"
                      checked={!!promoted[p.key]}
                      onChange={(e) => setPromoted({ ...promoted, [p.key]: e.target.checked })}
                      className="w-4 h-4"
                    />
                    {p.label}
                  </label>
                ))}
                <div className="text-[10px] text-gray-500 mt-2">When checked, the tab moves to its own collapsible section below.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {effectiveTab === 'table' && (
        <NodeSummaryTable
          embedded
          data={props.data}
          nodeScores={props.nodeScores}
          onNodeClick={props.setSelectedNode}
          onGuestClick={props.setSelectedGuestDetails}
          canMigrate={props.canMigrate}
          guestProfiles={props.guestProfiles}
          handleRemoveTag={props.handleRemoveTag}
          setTagModalGuest={props.setTagModalGuest}
          setShowTagModal={props.setShowTagModal}
          nodeRecCounts={props.nodeRecCounts}
          guestRecMap={props.guestRecMap}
          setConfirmMigration={props.setConfirmMigration}
        />
      )}
      {effectiveTab === 'guests' && (
        <GuestsTable
          data={props.data}
          onGuestClick={props.setSelectedGuestDetails}
          canMigrate={props.canMigrate}
          guestProfiles={props.guestProfiles}
          handleRemoveTag={props.handleRemoveTag}
          setTagModalGuest={props.setTagModalGuest}
          setShowTagModal={props.setShowTagModal}
          guestRecMap={props.guestRecMap}
          setConfirmMigration={props.setConfirmMigration}
        />
      )}
      {effectiveTab === 'map' && (
        <ClusterMap
          embedded
          data={props.data}
          showPoweredOffGuests={props.showPoweredOffGuests}
          setShowPoweredOffGuests={props.setShowPoweredOffGuests}
          clusterMapViewMode={props.clusterMapViewMode}
          setClusterMapViewMode={props.setClusterMapViewMode}
          maintenanceNodes={props.maintenanceNodes}
          setSelectedNode={props.setSelectedNode}
          setSelectedGuestDetails={props.setSelectedGuestDetails}
          guestsMigrating={props.guestsMigrating}
          migrationProgress={props.migrationProgress}
          completedMigrations={props.completedMigrations}
        />
      )}
      {effectiveTab === 'charts' && (
        <>
          <ClusterHealthChart scoreHistory={props.scoreHistory} migrationHistory={props.migrationHistory} />
          <NodeStatusSection
          embedded
          data={props.data}
          showPredicted={props.showPredicted}
          setShowPredicted={props.setShowPredicted}
          recommendationData={props.recommendationData}
          recommendations={props.recommendations}
          nodeGridColumns={props.nodeGridColumns}
          setNodeGridColumns={props.setNodeGridColumns}
          chartPeriod={props.chartPeriod}
          setChartPeriod={props.setChartPeriod}
          nodeScores={props.nodeScores}
          generateSparkline={props.generateSparkline}
        />
        </>
      )}
      {effectiveTab === 'recommendations' && (
          <MigrationRecommendationsSection
            embedded
            data={props.data}
            recommendations={props.recommendations}
            loadingRecommendations={props.loadingRecommendations}
            generateRecommendations={props.generateRecommendations}
            recommendationData={props.recommendationData}
            penaltyConfig={props.penaltyConfig}
            collapsedSections={props.collapsedSections}
            setCollapsedSections={props.setCollapsedSections}
            toggleSection={props.toggleSection}
            canMigrate={props.canMigrate}
            migrationStatus={props.migrationStatus}
            setMigrationStatus={props.setMigrationStatus}
            completedMigrations={props.completedMigrations}
            guestsMigrating={props.guestsMigrating}
            migrationProgress={props.migrationProgress}
            cancelMigration={props.cancelMigration}
            trackMigration={props.trackMigration}
            setConfirmMigration={props.setConfirmMigration}
            setCurrentPage={props.setCurrentPage}
            setOpenPenaltyConfigOnAutomation={props.setOpenPenaltyConfigOnAutomation}
            nodeScores={props.nodeScores}
            API_BASE={props.API_BASE}
            automationStatus={props.automationStatus}
          />
      )}
    </div>
  );
}
