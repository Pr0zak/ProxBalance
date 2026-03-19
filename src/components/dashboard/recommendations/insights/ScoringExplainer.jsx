import { Info } from '../../../Icons.jsx';

export default function ScoringExplainer({ penaltyConfig, setCurrentPage, setOpenPenaltyConfigOnAutomation }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        ProxBalance uses a penalty-based scoring system to evaluate every guest on every node. Migrations are recommended when moving a guest would improve its suitability rating by <span className="font-bold">{penaltyConfig?.min_score_improvement || 15}+ points</span>.
      </p>

      {/* Score Legend */}
      <div>
        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Suitability Rating Scale</h5>
        <div className="flex rounded overflow-hidden h-5 mb-1">
          <div className="bg-red-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">0-30</div>
          <div className="bg-orange-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">30-50</div>
          <div className="bg-yellow-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">50-70</div>
          <div className="bg-green-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">70-100</div>
        </div>
        <div className="flex text-[10px] text-gray-500 dark:text-gray-400">
          <div className="flex-1 text-center">Poor</div>
          <div className="flex-1 text-center">Fair</div>
          <div className="flex-1 text-center">Good</div>
          <div className="flex-1 text-center">Excellent</div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="p-2.5 bg-gray-100 dark:bg-gray-700/50 rounded">
        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Configuration</h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
          <span>CPU weight: <span className="font-mono font-semibold">30%</span></span>
          <span>Memory weight: <span className="font-mono font-semibold">30%</span></span>
          <span>IOWait weight: <span className="font-mono font-semibold">20%</span></span>
          <span>Other factors: <span className="font-mono font-semibold">20%</span></span>
          <span>Current period: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_current * 100).toFixed(0) : '50'}%</span></span>
          <span>24h average: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_24h * 100).toFixed(0) : '30'}%</span></span>
          <span>7-day average: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_7d * 100).toFixed(0) : '20'}%</span></span>
          <span>Min improvement: <span className="font-mono font-semibold">{penaltyConfig?.min_score_improvement || 15} pts</span></span>
        </div>
      </div>

      <ul className="ml-4 space-y-1 text-gray-600 dark:text-gray-400 text-xs list-disc">
        <li><span className="font-semibold">Penalties applied for:</span> High CPU/memory/IOWait, rising trends, historical spikes, predicted post-migration overload</li>
        <li><span className="font-semibold">Smart decisions:</span> Balances immediate needs with long-term stability and capacity planning</li>
      </ul>
      <div className="text-xs">
        <button
          onClick={() => {
            setCurrentPage('automation');
            setOpenPenaltyConfigOnAutomation(true);
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
        >
          Configure penalty scoring weights in Automation →
        </button>
      </div>
    </div>
  );
}
