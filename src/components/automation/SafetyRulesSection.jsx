import {
  AlertTriangle, ChevronDown, X
} from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import { ToggleRow } from '../Toggle.jsx';

const { useState } = React;

export default function SafetyRulesSection({ automationConfig, saveAutomationConfig, collapsedSections, setCollapsedSections }) {
  const [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState(false);

  return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, safetyRules: !prev.safetyRules }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Safety & Guardrails</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.safetyRules ? '' : '-rotate-180'}`}
            />
          </button>

          {!collapsedSections.safetyRules && (
          <div className="space-y-6">

          {/* ── Tag & Affinity Rules ── */}
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Tag & Affinity Rules</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Respect 'ignore' Tags"
                description="Skip VMs tagged with 'pb-ignore' or 'ignore' during automated migrations."
                checked={automationConfig.rules?.respect_ignore_tags !== false}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_ignore_tags: e.target.checked } })}
              />
              <ToggleRow
                label="Require 'auto_migrate_ok' Tag"
                description="Only migrate VMs with 'auto-migrate-ok' or 'auto_migrate_ok' tag (opt-in mode)."
                checked={automationConfig.rules?.require_auto_migrate_ok_tag || false}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, require_auto_migrate_ok_tag: e.target.checked } })}
              />
              <ToggleRow
                label="Respect Affinity (affinity_* tags)"
                description="Keeps VMs with the same affinity tag together on the same node. Companion VMs follow when one is migrated."
                checked={automationConfig.rules?.respect_affinity_rules !== false}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_affinity_rules: e.target.checked } })}
              />
              <ToggleRow
                label="Respect Anti-Affinity (exclude_* tags)"
                description="Prevents VMs with the same exclude tag from clustering on one node."
                checked={automationConfig.rules?.respect_exclude_affinity !== false}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_exclude_affinity: e.target.checked } })}
              />
              <ToggleRow
                label="Allow Container Restarts for Migration"
                description="Enables automated migrations to restart containers that cannot be live-migrated. Containers will experience brief downtime."
                checked={automationConfig.rules?.allow_container_restarts === true}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfirmAllowContainerRestarts(true);
                  } else {
                    saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: false } });
                  }
                }}
              >
                {confirmAllowContainerRestarts && (
                  <div className="px-4 pb-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1">ALLOW CONTAINER RESTARTS?</div>
                          <div className="text-xs text-orange-800 dark:text-orange-300 space-y-1 mb-2">
                            <p>This will allow automated migrations to restart containers that cannot be live-migrated.</p>
                            <p className="font-semibold">Containers will experience brief downtime during migration.</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: true } });
                                setConfirmAllowContainerRestarts(false);
                              }}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
                            >
                              <AlertTriangle size={14} />
                              Yes, Allow Restarts
                            </button>
                            <button
                              onClick={() => setConfirmAllowContainerRestarts(false)}
                              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ToggleRow>
            </div>
          </div>

          {/* ── Safety Checks ── */}
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Safety Checks</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Check Cluster Health Before Migrating"
                description="Verifies cluster has quorum and node resources are within limits before migrating."
                checked={automationConfig.safety_checks?.check_cluster_health !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, check_cluster_health: e.target.checked } })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Node CPU %
                  </label>
                  <NumberField
                    min="50"
                    max="100"
                    value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                    onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Node Memory %
                  </label>
                  <NumberField
                    min="50"
                    max="100"
                    value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                    onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <ToggleRow
                label="Verify Guest Location Before Migrating"
                description="Queries Proxmox directly to confirm each VM is on the expected node before migrating. Prevents failures from stale cache data."
                checked={automationConfig.safety_checks?.verify_before_migrate !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, verify_before_migrate: e.target.checked } })}
              />

              <ToggleRow
                label="Abort Batch if a Migration Fails"
                description="Stops remaining migrations in the batch if any single migration fails."
                checked={automationConfig.safety_checks?.abort_on_failure !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, abort_on_failure: e.target.checked } })}
              />
              <ToggleRow
                label="Pause Automation After Migration Failure"
                description="Automatically disables automated migrations if any migration fails. Requires manual review before resuming."
                checked={automationConfig.safety_checks?.pause_on_failure === true}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, pause_on_failure: e.target.checked } })}
              />
            </div>
          </div>

          </div>
          )}
        </div>
  );
}
