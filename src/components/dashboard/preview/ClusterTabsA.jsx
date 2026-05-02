import { GLASS_CARD } from '../../../utils/designTokens.js';
import NodeSummaryTable from '../NodeSummaryTable.jsx';
import ClusterMap from '../ClusterMap.jsx';
import NodeStatusSection from '../NodeStatusSection.jsx';

const { useState } = React;

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'map', label: 'Map' },
  { id: 'charts', label: 'Charts' },
];

/**
 * Variant A — single "Cluster" section with 3 tabs.
 * Each tab renders the existing component as-is.
 */
export default function ClusterTabsA(props) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('previewClusterTabsA') || 'table';
  });
  const setTab = (id) => {
    setActiveTab(id);
    localStorage.setItem('previewClusterTabsA', id);
  };

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
          data={props.data}
          nodeScores={props.nodeScores}
          onNodeClick={props.setSelectedNode}
          onGuestClick={props.setSelectedGuestDetails}
          collapsedSections={{ ...props.collapsedSections, nodeOverview: false }}
          setCollapsedSections={() => {}}
        />
      )}
      {activeTab === 'map' && (
        <ClusterMap
          data={props.data}
          collapsedSections={{ ...props.collapsedSections, clusterMap: false }}
          toggleSection={() => {}}
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
          data={props.data}
          collapsedSections={{ ...props.collapsedSections, nodeStatus: false }}
          toggleSection={() => {}}
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
