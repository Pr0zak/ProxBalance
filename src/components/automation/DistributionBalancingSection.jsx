import { ChevronDown } from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import Toggle, { ToggleRow } from '../Toggle.jsx';

export default function DistributionBalancingSection({
  config, automationConfig, collapsedSections, setCollapsedSections,
  setConfig, saveAutomationConfig, embedded
}) {
  const outerClass = embedded
    ? ''
    : 'bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden';

  return (
        <div className={outerClass}>
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancing: !prev.distributionBalancing }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            {embedded
              ? <h3 className="text-base font-bold text-gray-900 dark:text-white">Distribution Balancing</h3>
              : <h2 className="text-xl font-bold text-gray-900 dark:text-white">Distribution Balancing</h2>
            }
            <ChevronDown
              size={embedded ? 20 : 24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.distributionBalancing ? '' : '-rotate-180'}`}
            />
          </button>

          {!collapsedSections.distributionBalancing && (
          <div className="space-y-4">
            {/* Enable Distribution Balancing */}
            <ToggleRow
              label="Enable Distribution Balancing"
              description="Automatically balance small workloads across nodes to prevent guest count imbalance"
              checked={config.distribution_balancing?.enabled || false}
              onChange={(e) => {
                const enabled = e.target.checked;
                const newConfig = { ...config };
                if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                newConfig.distribution_balancing.enabled = enabled;
                setConfig(newConfig);
                saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
              }}
            />

            {/* Help section */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 list-none">
                <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                How does this work?
              </summary>
              <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  Complements performance-based recommendations by focusing on <strong>evening out the number of VMs/CTs across nodes</strong>.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  A node with many small VMs (DNS, monitoring, utilities) may show low resource usage but still suffer from management overhead and uneven workload distribution.
                </p>
                <ol className="text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                  <li>Counts running guests on each node</li>
                  <li>If difference exceeds the threshold, finds small eligible guests on the overloaded node</li>
                  <li>Recommends migrating them to underloaded nodes</li>
                  <li>Respects tags, affinity rules, and storage compatibility</li>
                </ol>
              </div>
            </details>

            {config.distribution_balancing?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Guest Count Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guest Count Threshold
                </label>
                <NumberField
                  min="1"
                  max="10"
                  value={config.distribution_balancing?.guest_count_threshold ?? 2}
                  onCommit={(val) => {
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.guest_count_threshold = val;
                    setConfig(newConfig);
                    saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum difference in guest counts to trigger balancing
                </p>
              </div>

              {/* Max CPU Cores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max CPU Cores
                </label>
                <NumberField
                  min="0"
                  max="32"
                  value={config.distribution_balancing?.max_cpu_cores ?? 2}
                  onCommit={(val) => {
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.max_cpu_cores = val;
                    setConfig(newConfig);
                    saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only migrate guests with this many CPU cores or less (0 = no limit)
                </p>
              </div>

              {/* Max Memory GB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Memory (GB)
                </label>
                <NumberField
                  min="0"
                  max="256"
                  value={config.distribution_balancing?.max_memory_gb ?? 4}
                  onCommit={(val) => {
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.max_memory_gb = val;
                    setConfig(newConfig);
                    saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only migrate guests with this much memory or less (0 = no limit)
                </p>
              </div>
            </div>
            )}
          </div>
          )}
        </div>
  );
}
