import {
  AlertTriangle, ChevronDown, X, Filter
} from '../Icons.jsx';
import { GLASS_CARD, BTN_SECONDARY, TAP_TARGET } from '../../utils/designTokens.js';
import { ToggleRow } from '../Toggle.jsx';
import NumberRow from './NumberRow.jsx';
import TriggerThresholds from './TriggerThresholds.jsx';
import DistributionBalancingSection from './DistributionBalancingSection.jsx';
import SectionHeader from '../SectionHeader.jsx';

const { useState } = React;

export default function GuestSelectionSection({
  automationConfig, saveAutomationConfig,
  config, fetchConfig, setConfig,
  collapsedSections, setCollapsedSections,
  nodes, memFloor,
}) {
  const [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState(false);

  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <SectionHeader
        title="What to Migrate"
        icon={Filter}
        accent={['teal', 'cyan']}
      />

      {(
        <div className="space-y-6">

          {/* ── Triggers ── */}
          <div>
            <h3 className="text-base font-bold text-pb-text dark:text-white">Triggers</h3>
            <p className="text-sm text-pb-text2 dark:text-gray-400 mb-3">A node that stays above a line becomes a source; lower lines mean earlier moves.</p>
            <TriggerThresholds nodes={nodes} fetchConfig={fetchConfig} memFloor={memFloor} />
          </div>

          {/* ── Limits ── */}
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <h3 className="text-base font-bold text-pb-text dark:text-white mb-3">Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NumberRow
                label="Minimum confidence"
                description="Skip moves the engine is less sure of"
                unit="%" min="0" max="100"
                value={automationConfig.rules?.min_confidence_score || 75}
                onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, min_confidence_score: val } })}
              />
              <NumberRow
                label="Max migrations per run"
                description="Moves started in one check"
                min="1" max="20"
                value={automationConfig.rules?.max_migrations_per_run || 3}
                onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_migrations_per_run: val } })}
              />
              <NumberRow
                label="Max at the same time"
                description="Migrations running at once, cluster-wide"
                min="1" max="10"
                value={automationConfig.rules?.max_concurrent_migrations ?? 3}
                onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_concurrent_migrations: val } })}
              />
              <NumberRow
                label="Max into one node per run"
                description="Max migrations into one node per run (0 = no limit)"
                min="0" max="5"
                value={automationConfig.rules?.max_target_inflow_per_cycle ?? 0}
                onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_target_inflow_per_cycle: Math.max(0, Math.min(5, val)) } })}
              />
            </div>
          </div>

          {/* ── Guest Rules ── */}
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <h3 className="text-base font-bold text-pb-text dark:text-white mb-3">Guest Rules</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Skip Ignored Guests ('ignore' tag)"
                description="Skip guests tagged 'ignore' during automated migrations."
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
                label="Keep Affinity Groups Together"
                description="Keeps VMs with the same affinity tag together on the same node. Companion VMs follow when one is migrated."
                checked={automationConfig.rules?.respect_affinity_rules !== false}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_affinity_rules: e.target.checked } })}
              />
              <ToggleRow
                label="Keep Anti-Affinity Groups Apart"
                description="Prevents VMs with the same exclude tag from clustering on one node."
                checked={automationConfig.rules?.respect_exclude_affinity !== false}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_exclude_affinity: e.target.checked } })}
              />
              <ToggleRow
                label="Allow Container Restarts (causes downtime)"
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
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-orange-800 dark:text-orange-200 text-sm mb-1">ALLOW CONTAINER RESTARTS?</div>
                          <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1 mb-2">
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
                              className={`${TAP_TARGET} ${BTN_SECONDARY} !px-2 !py-1 !text-xs`}
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

          {/* ── Distribution Balancing ── */}
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <DistributionBalancingSection
              embedded
              config={config}
              automationConfig={automationConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
              setConfig={setConfig}
              saveAutomationConfig={saveAutomationConfig}
            />
          </div>

        </div>
      )}
    </div>
  );
}
