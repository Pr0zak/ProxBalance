import { GLASS_CARD } from '../../utils/designTokens.js';
import NodeSummaryTable from './NodeSummaryTable.jsx';
import GuestsTable from './GuestsTable.jsx';
import ClusterMap from './ClusterMap.jsx';
import NodeStatusSection from './NodeStatusSection.jsx';
import MigrationRecommendationsSection from './MigrationRecommendationsSection.jsx';

const { useState, useEffect } = React;

const BASE_TABS = [
  { id: 'table', label: 'Nodes' },
  { id: 'guests', label: 'Guests' },
  { id: 'map', label: 'Map' },
  { id: 'charts', label: 'Charts' },
];

/**
 * Unified Cluster section — one card with three tabs (Table / Map / Charts).
 * Each tab renders the existing per-view component in embedded mode (no inner
 * header — its toolbar controls remain).
 */
export default function ClusterSection(props) {
  const recCount = Array.isArray(props.recommendations) ? props.recommendations.length : 0;
  const TABS = [...BASE_TABS, { id: 'recommendations', label: `Recs${recCount > 0 ? ` (${recCount})` : ''}`, accent: recCount > 0 }];

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('clusterSectionTab') || 'table';
  });
  // If user had 'recommendations' selected but the tab is no longer available, fall back.
  const effectiveTab = TABS.find(t => t.id === activeTab) ? activeTab : 'table';
  const setTab = (id) => {
    setActiveTab(id);
    localStorage.setItem('clusterSectionTab', id);
  };

  // Lazy-load Chart.js when Charts tab becomes active (mirrors index.jsx).
  useEffect(() => {
    if (effectiveTab === 'charts' && props.loadChartJs && !props.chartJsLoaded) {
      props.loadChartJs();
    }
  }, [effectiveTab, props.chartJsLoaded]);

  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h2 className="text-xl font-bold text-white">Cluster</h2>
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
          darkMode={props.darkMode}
        />
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
        />
      )}
    </div>
  );
}
