import NodeSummaryTable from '../NodeSummaryTable.jsx';
import NodeDeepDive from '../NodeDeepDive.jsx';

const { useState } = React;

const TABS = [
  { id: 'guests', label: 'Guests' },
  { id: 'trends', label: 'Trends' },
  { id: 'chart', label: 'Chart' },
  { id: 'predicted', label: 'Predicted' },
];

/**
 * Wraps NodeSummaryTable, replacing the default GuestList drawer with a
 * tabbed drawer (Guests / Trends / Chart / Predicted). Used by variants C and D.
 */
export default function NodesWithTabbedDrawer({
  data, nodeScores, recommendationData,
  chartPeriod, darkMode, generateSparkline,
  setSelectedNode, setSelectedGuestDetails,
  collapsedSections, setCollapsedSections,
  headerOverride,
}) {
  return (
    <NodeSummaryTable
      data={data}
      nodeScores={nodeScores}
      onNodeClick={setSelectedNode}
      onGuestClick={setSelectedGuestDetails}
      collapsedSections={collapsedSections}
      setCollapsedSections={setCollapsedSections}
      headerOverride={headerOverride}
      renderDrawer={({ node, nodeName, guests }) => (
        <TabbedDrawer
          node={node}
          nodeScore={nodeScores?.[nodeName]}
          guests={guests}
          recommendationData={recommendationData}
          chartPeriod={chartPeriod}
          darkMode={darkMode}
          generateSparkline={generateSparkline}
          onGuestClick={setSelectedGuestDetails}
        />
      )}
    />
  );
}

function TabbedDrawer({ node, nodeScore, guests, recommendationData, chartPeriod, darkMode, generateSparkline, onGuestClick }) {
  const [tab, setTab] = useState('guests');
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              tab === t.id
                ? 'bg-blue-600/80 border-blue-500 text-white'
                : 'bg-slate-800/60 border-slate-700/50 text-gray-300 hover:bg-slate-700/40'
            }`}
          >
            {t.label}{t.id === 'guests' ? ` (${guests.length})` : ''}
          </button>
        ))}
      </div>
      <NodeDeepDive
        mode={tab}
        node={node}
        nodeScore={nodeScore}
        guests={guests}
        onGuestClick={onGuestClick}
        chartPeriod={chartPeriod}
        darkMode={darkMode}
        generateSparkline={generateSparkline}
        recommendationData={recommendationData}
      />
    </div>
  );
}
