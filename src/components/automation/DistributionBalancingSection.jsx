import { ChevronDown } from '../Icons.jsx';
import Toggle from '../Toggle.jsx';

export default function DistributionBalancingSection({
  config, automationConfig, collapsedSections, setCollapsedSections,
  setConfig, saveAutomationConfig
}) {
  return (<>
        {/* Distribution Balancing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancing: !prev.distributionBalancing }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Distribution Balancing</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.distributionBalancing ? '-rotate-180' : ''}`}
            />
          </button>

          {!collapsedSections.distributionBalancing && (
          <>
          {/* Collapsible detailed description */}
          <div className="mb-4">
            <button
              onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancingHelp: !prev.distributionBalancingHelp }))}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              {collapsedSections.distributionBalancingHelp ? (
                <>
                  <ChevronDown size={16} className="-rotate-90" />
                  Show detailed explanation
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Hide detailed explanation
                </>
              )}
            </button>

            {!collapsedSections.distributionBalancingHelp && (
              <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What is Distribution Balancing?</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Complements performance-based recommendations by focusing on <strong>evening out the number of VMs/CTs across nodes</strong>, rather than just CPU, memory, or I/O metrics.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">The Problem It Solves</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    A node with 19 small VMs (DNS, monitoring, utilities) may show low resource usage but still suffers from management overhead, slower operations (start/stop/backup), and uneven workload distribution. Distribution balancing addresses this by moving small guests to less populated nodes.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How It Works</h3>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                    <li>Counts running guests on each node (e.g., pve4: 19, pve6: 4)</li>
                    <li>If difference ≥ threshold (default: 2), finds small guests on overloaded node</li>
                    <li>Only considers guests ≤ max CPU cores (default: 2) and ≤ max memory (default: 4 GB)</li>
                    <li>Recommends migrating eligible small guests to underloaded nodes</li>
                    <li>Works alongside performance-based recommendations, respects tags and storage compatibility</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">When to Enable</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ✓ Many small utility VMs (DNS, monitoring, etc.)<br />
                    ✓ Nodes with very different guest counts (e.g., 19 vs 4)<br />
                    ✓ Performance metrics don't show the imbalance<br />
                    ✓ Want more even workload distribution for management simplicity
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Enable Distribution Balancing */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Enable Distribution Balancing</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Automatically balance small workloads across nodes to prevent guest count imbalance</div>
                </div>
                <Toggle
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
              </div>
            </div>

            {config.distribution_balancing?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {/* Guest Count Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guest Count Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.distribution_balancing?.guest_count_threshold ?? 2}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numVal = val === '' ? '' : parseInt(val);
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.guest_count_threshold = numVal;
                    setConfig(newConfig);
                    if (val !== '' && !isNaN(numVal)) {
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      const newConfig = { ...config };
                      if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                      newConfig.distribution_balancing.guest_count_threshold = 2;
                      setConfig(newConfig);
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum difference in guest counts to trigger balancing
                </p>
              </div>

              {/* Max CPU Cores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max CPU Cores
                </label>
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={config.distribution_balancing?.max_cpu_cores ?? 2}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numVal = val === '' ? '' : parseInt(val);
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.max_cpu_cores = numVal;
                    setConfig(newConfig);
                    if (val !== '' && !isNaN(numVal)) {
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      const newConfig = { ...config };
                      if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                      newConfig.distribution_balancing.max_cpu_cores = 2;
                      setConfig(newConfig);
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only migrate guests with ≤ this many CPU cores (0 = no limit)
                </p>
              </div>

              {/* Max Memory GB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Memory (GB)
                </label>
                <input
                  type="number"
                  min="0"
                  max="256"
                  value={config.distribution_balancing?.max_memory_gb ?? 4}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numVal = val === '' ? '' : parseInt(val);
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.max_memory_gb = numVal;
                    setConfig(newConfig);
                    if (val !== '' && !isNaN(numVal)) {
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      const newConfig = { ...config };
                      if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                      newConfig.distribution_balancing.max_memory_gb = 4;
                      setConfig(newConfig);
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only migrate guests with ≤ this much memory (0 = no limit)
                </p>
              </div>
            </div>
            )}
          </div>
          </>
          )}
        </div>

  </>);
}
