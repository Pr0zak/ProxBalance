import { ChevronDown } from '../Icons.jsx';
import { GLASS_CARD, ICON, INPUT_FIELD } from '../../utils/designTokens.js';
import NumberField from '../NumberField.jsx';
import { ToggleRow } from '../Toggle.jsx';
import SmartMigrationsSection from './SmartMigrationsSection.jsx';
import PenaltyScoringSection from './PenaltyScoringSection.jsx';

export default function MigrationBehaviorSection({
  automationConfig, saveAutomationConfig, automationStatus,
  collapsedSections, setCollapsedSections,
  // Penalty scoring props
  penaltyConfig, setPenaltyConfig, penaltyDefaults,
  penaltyConfigSaved, savingPenaltyConfig,
  penaltyPresets, activePreset, applyPenaltyPreset,
  cpuThreshold, memThreshold, iowaitThreshold,
  savePenaltyConfig, resetPenaltyConfig,
  // Migration settings props
  migrationSettings, setMigrationSettings,
  migrationSettingsDefaults, migrationSettingsDescriptions,
  effectivePenaltyConfig, hasExpertOverrides,
  savingMigrationSettings, migrationSettingsSaved,
  saveMigrationSettingsAction, resetMigrationSettingsAction,
  fetchMigrationSettingsAction,
}) {
  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <button
        onClick={() => setCollapsedSections(prev => ({ ...prev, migrationBehaviorSection: !prev.migrationBehaviorSection }))}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">How to Migrate</h2>
        <ChevronDown
          size={ICON.section}
          className={`text-gray-600 dark:text-gray-400 transition-transform duration-200 ${!collapsedSections.migrationBehaviorSection ? 'rotate-180' : ''}`}
        />
      </button>

      {!collapsedSections.migrationBehaviorSection && (
        <div className="space-y-6">

          {/* ── Smart Migrations ── */}
          <SmartMigrationsSection
            embedded
            automationConfig={automationConfig}
            automationStatus={automationStatus}
            saveAutomationConfig={saveAutomationConfig}
            collapsedSections={collapsedSections}
            setCollapsedSections={setCollapsedSections}
          />

          {/* ── Safety Checks ── */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
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
                    className={INPUT_FIELD}
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
                    className={INPUT_FIELD}
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
                label="Stop Remaining Migrations on Failure"
                description="Stops remaining migrations in the batch if any single migration fails."
                checked={automationConfig.safety_checks?.abort_on_failure !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, abort_on_failure: e.target.checked } })}
              />
              <ToggleRow
                label="Auto-Disable on Failure (requires manual resume)"
                description="Automatically disables automated migrations if any migration fails. Requires manual review before resuming."
                checked={automationConfig.safety_checks?.pause_on_failure === true}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, pause_on_failure: e.target.checked } })}
              />
            </div>
          </div>

          {/* ── Scoring & Tuning ── */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <PenaltyScoringSection
              embedded
              hideSensitivity
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
              penaltyConfig={penaltyConfig}
              setPenaltyConfig={setPenaltyConfig}
              penaltyDefaults={penaltyDefaults}
              penaltyConfigSaved={penaltyConfigSaved}
              savingPenaltyConfig={savingPenaltyConfig}
              penaltyPresets={penaltyPresets}
              activePreset={activePreset}
              applyPenaltyPreset={applyPenaltyPreset}
              cpuThreshold={cpuThreshold}
              memThreshold={memThreshold}
              iowaitThreshold={iowaitThreshold}
              savePenaltyConfig={savePenaltyConfig}
              resetPenaltyConfig={resetPenaltyConfig}
              migrationSettings={migrationSettings}
              setMigrationSettings={setMigrationSettings}
              migrationSettingsDefaults={migrationSettingsDefaults}
              migrationSettingsDescriptions={migrationSettingsDescriptions}
              effectivePenaltyConfig={effectivePenaltyConfig}
              hasExpertOverrides={hasExpertOverrides}
              savingMigrationSettings={savingMigrationSettings}
              migrationSettingsSaved={migrationSettingsSaved}
              saveMigrationSettingsAction={saveMigrationSettingsAction}
              resetMigrationSettingsAction={resetMigrationSettingsAction}
              fetchMigrationSettingsAction={fetchMigrationSettingsAction}
            />
          </div>

        </div>
      )}
    </div>
  );
}
