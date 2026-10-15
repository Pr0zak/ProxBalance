import { GLASS_CARD, INNER_CARD, iconBadge, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, BTN_ICON, ICON, INPUT_FIELD } from '../../utils/designTokens.js';
import NumberField from '../NumberField.jsx';
import Toggle, { ToggleRow } from '../Toggle.jsx';

export default function DistributionBalancingSection({
  config, automationConfig, collapsedSections, setCollapsedSections,
  setConfig, saveAutomationConfig, embedded
}) {
  if (!config) return null;
  const outerClass = embedded
    ? ''
    : GLASS_CARD + ' overflow-hidden';

  return (
        <div className={outerClass}>
          <div className="w-full flex items-center justify-between mb-4 flex-wrap gap-y-3">
            {embedded
              ? <h3 className="text-base font-bold text-pb-text dark:text-white">Distribution Balancing</h3>
              : <h2 className="text-xl font-bold text-pb-text dark:text-white">Distribution Balancing</h2>
            }
          </div>

          {(
          <div className="space-y-4">
            {/* Enable Distribution Balancing */}
            <ToggleRow
              label="Enable distribution balancing"
              description="Evens out guest counts"
              detail="A node can hold far more guests than the others while its CPU and memory look fine. When the gap in running guests reaches the threshold, small guests (within the core and memory limits) move from the fullest node to the emptiest. Tags, affinity rules and storage are respected."
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

            {config.distribution_balancing?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Guest Count Threshold */}
              <div>
                <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">
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
                  className={INPUT_FIELD}
                />
                <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                  Gap in guest counts that starts a move
                </p>
              </div>

              {/* Max CPU Cores */}
              <div>
                <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">
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
                  className={INPUT_FIELD}
                />
                <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                  Only guests with this many cores or fewer (0 = any)
                </p>
              </div>

              {/* Max Memory GB */}
              <div>
                <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">
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
                  className={INPUT_FIELD}
                />
                <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                  Only guests with this much memory or less (0 = any)
                </p>
              </div>
            </div>
            )}
          </div>
          )}
        </div>
  );
}
