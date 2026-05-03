import { GLASS_CARD } from '../../utils/designTokens.js';
import NodeSummaryTable from './NodeSummaryTable.jsx';
import ClusterMap from './ClusterMap.jsx';
import NodeStatusSection from './NodeStatusSection.jsx';

const { useState, useEffect } = React;

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'map', label: 'Map' },
  { id: 'charts', label: 'Charts' },
];

/**
 * Unified Cluster section — one card with three tabs (Table / Map / Charts).
 * Each tab renders the existing per-view component in embedded mode (no inner
 * header — its toolbar controls remain).
 */
export default function ClusterSection(props) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('clusterSectionTab') || 'table';
  });
  const setTab = (id) => {
    setActiveTab(id);
    localStorage.setItem('clusterSectionTab', id);
  };

  // Lazy-load Chart.js when Charts tab becomes active (mirrors index.jsx).
  useEffect(() => {
    if (activeTab === 'charts' && props.loadChartJs && !props.chartJsLoaded) {
      props.loadChartJs();
    }
  }, [activeTab, props.chartJsLoaded]);

  return (
    <div className={GLASS_CARD}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h2 className="text-xl font-bold text-white">Cluster</h2>
        <div className="flex items-center gap-1 rounded-lg bg-slate-800/60 border border-slate-700/50 p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'table' && (
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
        />
      )}
      {activeTab === 'map' && (
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
      {activeTab === 'charts' && (
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
    </div>
  );
}
