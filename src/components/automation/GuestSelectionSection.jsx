import {
  AlertTriangle, ChevronDown, X
} from '../Icons.jsx';
import { GLASS_CARD, ICON, INPUT_FIELD } from '../../utils/designTokens.js';
import NumberField from '../NumberField.jsx';
import { ToggleRow } from '../Toggle.jsx';
import RecommendationThresholdsSection from '../settings/RecommendationThresholdsSection.jsx';
import DistributionBalancingSection from './DistributionBalancingSection.jsx';

const { useState } = React;

export default function GuestSelectionSection({
  automationConfig, saveAutomationConfig,
  config, fetchConfig, setConfig,
  collapsedSections, setCollapsedSections,
}) {
  const [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState(false);

  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <button
        onClick={() => setCollapsedSections(prev => ({ ...prev, guestSelectionSection: !prev.guestSelectionSection }))}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      >
        <h2 className="text-xl font-bold text-white">What to Migrate</h2>
        <ChevronDown
          size={ICON.section}
          className={`text-gray-400 transition-transform duration-200 ${!collapsedSections.guestSelectionSection ? 'rotate-180' : ''}`}
        />
      </button>

      {!collapsedSections.guestSelectionSection && (
        <div className="space-y-6">

          {/* ── Triggers ── */}
          <div>
            <h3 className="text-base font-bold text-white mb-3">Triggers</h3>
            <RecommendationThresholdsSection
              embedded
              config={config}
              fetchConfig={fetchConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
            />
          </div>

          {/* ── Limits ── */}
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-base font-bold text-white mb-3">Limits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Confidence Score
                </label>
                <NumberField
                  min="0"
                  max="100"
                  value={automationConfig.rules?.min_confidence_score || 75}
                  onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, min_confidence_score: val } })}
                  className={INPUT_FIELD}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Migrations Per Run
                </label>
                <NumberField
                  min="1"
                  max="20"
                  value={automationConfig.rules?.max_migrations_per_run || 3}
                  onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_migrations_per_run: val } })}
                  className={INPUT_FIELD}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Concurrent Migrations
                </label>
                <NumberField
                  min="1"
                  max="10"
                  value={automationConfig.rules?.max_concurrent_migrations || 1}
                  onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_concurrent_migrations: val } })}
                  className={INPUT_FIELD}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Maximum simultaneous migrations
                </p>
              </div>
            </div>
          </div>

          {/* ── Guest Rules ── */}
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-base font-bold text-white mb-3">Guest Rules</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Skip Ignored Guests (pb-ignore tag)"
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
                    <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-orange-200 text-sm mb-1">ALLOW CONTAINER RESTARTS?</div>
                          <div className="text-xs text-orange-300 space-y-1 mb-2">
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
                              className="px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs hover:bg-gray-600 flex items-center justify-center gap-1"
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
          <div className="border-t border-slate-700 pt-4">
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
