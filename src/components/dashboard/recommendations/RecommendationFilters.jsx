import { Filter } from '../../Icons.jsx';

export default function RecommendationFilters({
  recommendations,
  showRecFilters, setShowRecFilters,
  recFilterConfidence, setRecFilterConfidence,
  recFilterSourceNode, setRecFilterSourceNode,
  recFilterTargetNode, setRecFilterTargetNode,
  recSortBy, setRecSortBy,
  recSortDir, setRecSortDir
}) {
  if (!recommendations.length) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setShowRecFilters(prev => !prev)}
        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2"
      >
        <Filter size={12} />
        {showRecFilters ? 'Hide Filters' : 'Filter & Sort'}
        {(recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && (
          <span className="ml-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded text-[10px] font-medium">Active</span>
        )}
      </button>
      {showRecFilters && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-2">
          <select
            value={recFilterConfidence}
            onChange={e => setRecFilterConfidence(e.target.value)}
            className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="">Min Confidence: Any</option>
            <option value="80">&ge; 80%</option>
            <option value="60">&ge; 60%</option>
            <option value="40">&ge; 40%</option>
            <option value="20">&ge; 20%</option>
          </select>
          <select
            value={recFilterSourceNode}
            onChange={e => setRecFilterSourceNode(e.target.value)}
            className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="">Source: All Nodes</option>
            {[...new Set(recommendations.map(r => r.source_node))].sort().map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={recFilterTargetNode}
            onChange={e => setRecFilterTargetNode(e.target.value)}
            className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="">Target: All Nodes</option>
            {[...new Set(recommendations.map(r => r.target_node))].sort().map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={recSortBy}
            onChange={e => setRecSortBy(e.target.value)}
            className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="">Sort: Default</option>
            <option value="score_improvement">Score Improvement</option>
            <option value="confidence_score">Confidence</option>
            <option value="risk_score">Risk Score</option>
          </select>
          <button
            onClick={() => setRecSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
            title={`Sort direction: ${recSortDir}`}
          >
            {recSortDir === 'desc' ? '\u2193 Desc' : '\u2191 Asc'}
          </button>
          {(recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && (
            <button
              onClick={() => { setRecFilterConfidence(''); setRecFilterTargetNode(''); setRecFilterSourceNode(''); setRecSortBy(''); }}
              className="text-xs px-2 py-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
