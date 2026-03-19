import {
  X, BarChart2, Terminal, Activity, Calendar, List, RefreshCw, Info
} from '../../Icons.jsx';

import ScoringExplainer from './insights/ScoringExplainer.jsx';
import EngineDiagnostics from './insights/EngineDiagnostics.jsx';
import WorkloadPatterns from './insights/WorkloadPatterns.jsx';
import BatchImpact from './insights/BatchImpact.jsx';
import ChangeLog from './insights/ChangeLog.jsx';
import ExecutionPlan from './insights/ExecutionPlan.jsx';
import MigrationOutcomes from './insights/MigrationOutcomes.jsx';
import RecommendationHistory from './insights/RecommendationHistory.jsx';

const { useState, useEffect, useRef } = React;

const TABS = [
  { id: 'impact', label: 'Impact', icon: BarChart2 },
  { id: 'diagnostics', label: 'Diagnostics', icon: Terminal },
  { id: 'patterns', label: 'Patterns', icon: Activity },
  { id: 'history', label: 'History', icon: Calendar }
];

export default function InsightsDrawer({
  open, onClose,
  recommendationData, recommendations, penaltyConfig,
  setCurrentPage, setOpenPenaltyConfigOnAutomation,
  API_BASE, isMobile
}) {
  const [activeTab, setActiveTab] = useState('impact');
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const drawerWidth = isMobile ? 'w-full' : 'w-[520px]';

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`absolute top-0 right-0 h-full ${drawerWidth} bg-white dark:bg-gray-800 shadow-2xl flex flex-col transform transition-transform duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <BarChart2 size={18} className="text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Insights & Analytics</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Deep-dive into recommendation data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0 px-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'impact' && (
            <div className="space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <BarChart2 size={14} className="text-blue-500 dark:text-blue-400" />
                  Batch Migration Impact
                </h4>
                <BatchImpact recommendationData={recommendationData} />
              </section>
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <List size={14} className="text-blue-500 dark:text-blue-400" />
                  Execution Plan
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">— Optimal migration ordering</span>
                </h4>
                <ExecutionPlan recommendationData={recommendationData} />
              </section>
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <RefreshCw size={14} className="text-blue-500 dark:text-blue-400" />
                  Changes Since Last Generation
                </h4>
                <ChangeLog recommendationData={recommendationData} />
              </section>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Terminal size={14} className="text-gray-500 dark:text-gray-400" />
                  Engine Diagnostics
                  {recommendationData?.generation_time_ms && (
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Generated in {recommendationData.generation_time_ms}ms
                    </span>
                  )}
                </h4>
                <EngineDiagnostics recommendationData={recommendationData} recommendations={recommendations} />
              </section>
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Info size={14} className="text-blue-500 dark:text-blue-400" />
                  How Scoring Works
                </h4>
                <ScoringExplainer
                  penaltyConfig={penaltyConfig}
                  setCurrentPage={setCurrentPage}
                  setOpenPenaltyConfigOnAutomation={setOpenPenaltyConfigOnAutomation}
                />
              </section>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-blue-500 dark:text-blue-400" />
                  Workload Patterns
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">— Daily/weekly cycle analysis</span>
                </h4>
                <WorkloadPatterns API_BASE={API_BASE} active={activeTab === 'patterns'} />
              </section>
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <BarChart2 size={14} className="text-green-500 dark:text-green-400" />
                  Migration Outcomes
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">— Predicted vs. actual results</span>
                </h4>
                <MigrationOutcomes API_BASE={API_BASE} active={activeTab === 'patterns'} />
              </section>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-purple-500 dark:text-purple-400" />
                  Recommendation History
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">— Score trends over time</span>
                </h4>
                <RecommendationHistory API_BASE={API_BASE} active={activeTab === 'history'} />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
