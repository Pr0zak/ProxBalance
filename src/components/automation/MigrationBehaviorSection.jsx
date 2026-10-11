import { Settings } from '../Icons.jsx';
import { GLASS_CARD } from '../../utils/designTokens.js';
import { ToggleRow } from '../Toggle.jsx';
import NumberRow from './NumberRow.jsx';
import CrsStatusBanner from '../dashboard/CrsStatusBanner.jsx';
import CrsEditorModal from '../dashboard/CrsEditorModal.jsx';
import { API_BASE } from '../../utils/constants.js';

const { useState } = React;
import SmartMigrationsSection from './SmartMigrationsSection.jsx';
import PenaltyScoringSection from './PenaltyScoringSection.jsx';
import SectionHeader from '../SectionHeader.jsx';

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
  savedMigrationSettings, savedPenaltyConfig,
  pveCrs,
}) {
  // PVE CRS config as last read from the cluster; an edit here updates it
  // locally until the next data refresh brings the same value back.
  const [crsOverride, setCrsOverride] = useState(null);
  const [showCrsEditor, setShowCrsEditor] = useState(false);
  const crs = crsOverride || pveCrs;

  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <SectionHeader
        title="How to Migrate"
        icon={Settings}
        accent={['violet', 'purple']}
      />

      {(
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
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <h3 className="text-base font-bold text-pb-text dark:text-white mb-3">Safety Checks</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Check Cluster Health Before Migrating"
                description="Checks the cluster has quorum before each run."
                checked={automationConfig.safety_checks?.check_cluster_health !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, check_cluster_health: e.target.checked } })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberRow
                  label="Max target CPU"
                  description="Never move a guest onto a node above this"
                  unit="%" min="50" max="100"
                  value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                  onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: val } })}
                />
                <NumberRow
                  label="Max target memory"
                  description="Never move a guest onto a node above this"
                  unit="%" min="50" max="100"
                  value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                  onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: val } })}
                />
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
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <PenaltyScoringSection
              embedded
              savedMigrationSettings={savedMigrationSettings}
              savedPenaltyConfig={savedPenaltyConfig}
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

          {/* ── Proxmox's own balancer (moved here from the dashboard) ── */}
          {crs && typeof crs === 'object' && (
            <div className="border-t border-pb-border dark:border-slate-700 pt-4">
              <h3 className="text-base font-bold text-pb-text dark:text-white">Proxmox balancer (CRS)</h3>
              <p className="text-sm text-pb-text2 dark:text-gray-400 mb-2">What Proxmox's built-in scheduler does with HA guests, so the two don't fight over them.</p>
              <CrsStatusBanner
                pveCrs={crs}
                automationEnabled={automationStatus?.enabled ?? automationConfig.enabled}
                onEdit={() => setShowCrsEditor(true)}
              />
              {showCrsEditor && (
                <CrsEditorModal
                  pveCrs={crs}
                  automationEnabled={automationStatus?.enabled ?? automationConfig.enabled}
                  API_BASE={API_BASE}
                  onClose={() => setShowCrsEditor(false)}
                  onSaved={(normalized) => setCrsOverride(normalized)}
                />
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
