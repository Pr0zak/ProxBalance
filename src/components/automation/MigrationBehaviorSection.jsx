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
                label="Check cluster health first"
                description="Needs quorum before each run"
                checked={automationConfig.safety_checks?.check_cluster_health !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, check_cluster_health: e.target.checked } })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberRow
                  label="Max target CPU"
                  description="Targets above this are skipped"
                  unit="%" min="50" max="100"
                  value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                  onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: val } })}
                />
                <NumberRow
                  label="Max target memory"
                  description="Targets above this are skipped"
                  unit="%" min="50" max="100"
                  value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                  onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: val } })}
                />
              </div>

              <ToggleRow
                label="Verify guest location first"
                description="Re-checks each guest's node"
                detail="Confirms each guest is still on the expected node right before its move, so stale cached data can't cause a failed migration."
                checked={automationConfig.safety_checks?.verify_before_migrate !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, verify_before_migrate: e.target.checked } })}
              />

              <ToggleRow
                label="Stop the batch on a failure"
                description="Skips the rest of this run's moves"
                checked={automationConfig.safety_checks?.abort_on_failure !== false}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, abort_on_failure: e.target.checked } })}
              />
              <ToggleRow
                label="Turn off automation on a failure"
                description="Stays off until you turn it back on"
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
              <p className="text-sm text-pb-text2 dark:text-gray-400 mb-2">Proxmox's own HA balancer, shown so the two don't fight.</p>
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
