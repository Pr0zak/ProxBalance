import {
  AlertTriangle, ChevronDown, X, Power, Save, CheckCircle, RotateCcw
} from '../Icons.jsx';
import { GLASS_CARD, ICON, INPUT_FIELD } from '../../utils/designTokens.js';
import { ToggleRow } from '../Toggle.jsx';
import SectionHeader from './SectionHeader.jsx';

const { useState, useEffect } = React;

const SENSITIVITY_LABELS = { 1: 'Conservative', 2: 'Balanced', 3: 'Aggressive' };
const SENSITIVITY_DESCRIPTIONS = {
  1: 'High bar for migrations. Only recommends moves with clear, sustained problems. Best for production clusters where stability is paramount.',
  2: 'Moderate sensitivity. Recommends migrations when trends show growing problems. Suitable for most clusters.',
  3: 'Low bar for migrations. Recommends moves proactively for even modest improvements. Best for clusters that benefit from frequent rebalancing.',
};

export default function QuickSetupSection({
  automationConfig, saveAutomationConfig,
  migrationSettings, setMigrationSettings,
  savingMigrationSettings, migrationSettingsSaved,
  saveMigrationSettingsAction, resetMigrationSettingsAction,
  fetchMigrationSettingsAction,
}) {
  const [confirmEnableAutomation, setConfirmEnableAutomation] = useState(false);
  const [confirmDisableDryRun, setConfirmDisableDryRun] = useState(false);

  useEffect(() => {
    if (!migrationSettings && fetchMigrationSettingsAction) {
      fetchMigrationSettingsAction();
    }
  }, []);

  const settings = migrationSettings || { sensitivity: 2 };

  const updateSetting = (key, value) => {
    if (setMigrationSettings) {
      setMigrationSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className={GLASS_CARD}>
      <SectionHeader title="Quick Setup" icon={Power} accent={['blue', 'cyan']} />

      <div className="space-y-4">
        {/* Enable/Disable */}
        <ToggleRow
          label="Enable Automated Migrations"
          description="Turn automation on or off"
          checked={automationConfig.enabled || false}
          onChange={(e) => {
            if (e.target.checked) {
              setConfirmEnableAutomation(true);
            } else {
              saveAutomationConfig({ enabled: false });
            }
          }}
        >
          {confirmEnableAutomation && (
            <div className="px-4 pb-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Enable Automated Migrations?</div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                      The system will automatically migrate VMs based on your configured rules.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          saveAutomationConfig({ enabled: true });
                          setConfirmEnableAutomation(false);
                        }}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-100 dark:hover:bg-orange-700 text-white rounded text-sm font-medium flex items-center justify-center gap-1.5"
                      >
                        <Power size={14} />
                        Enable Automation
                      </button>
                      <button
                        onClick={() => setConfirmEnableAutomation(false)}
                        className="px-3 py-1.5 bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-200 rounded text-sm hover:bg-gray-600 flex items-center justify-center gap-1.5"
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

        {/* Dry Run */}
        <ToggleRow
          label="Dry Run Mode"
          description="Test without actual migrations (recommended)"
          checked={automationConfig.dry_run !== false}
          onChange={(e) => {
            if (!e.target.checked) {
              setConfirmDisableDryRun(true);
            } else {
              saveAutomationConfig({ dry_run: true });
            }
          }}
          color="yellow"
        >
          {confirmDisableDryRun && (
            <div className="px-4 pb-4">
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-red-800 dark:text-red-200 mb-2 text-lg">DISABLE DRY RUN MODE?</div>
                    <div className="text-sm text-red-700 dark:text-red-300 space-y-2 mb-4">
                      <p className="font-semibold">This will enable REAL automated migrations!</p>
                      <p>VMs will actually be migrated automatically based on your configured rules.</p>
                      <p className="font-semibold">Are you absolutely sure?</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          saveAutomationConfig({ dry_run: false });
                          setConfirmDisableDryRun(false);
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-100 dark:hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle size={14} />
                        Yes, Disable Dry Run
                      </button>
                      <button
                        onClick={() => setConfirmDisableDryRun(false)}
                        className="px-3 py-1.5 bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-200 rounded text-sm hover:bg-gray-600 font-medium flex items-center justify-center gap-1.5"
                      >
                        <X size={14} />
                        Cancel (Keep Dry Run On)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ToggleRow>

        {/* Migration Sensitivity */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">Migration Sensitivity</label>
          <p className="text-xs text-pb-text2 dark:text-gray-400 mb-3">
            Controls how aggressively ProxBalance recommends migrations. {SENSITIVITY_DESCRIPTIONS[settings.sensitivity]}
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((level) => {
              const isActive = settings.sensitivity === level;
              const colors = {
                1: isActive ? 'bg-green-600 text-white ring-2 ring-green-700' : 'bg-pb-surface2 dark:bg-slate-700 text-pb-text dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-600',
                2: isActive ? 'bg-blue-600 text-white ring-2 ring-blue-700' : 'bg-pb-surface2 dark:bg-slate-700 text-pb-text dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-600',
                3: isActive ? 'bg-orange-600 text-white ring-2 ring-orange-700' : 'bg-pb-surface2 dark:bg-slate-700 text-pb-text dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-600',
              };
              return (
                <button
                  key={level}
                  onClick={() => updateSetting('sensitivity', level)}
                  disabled={savingMigrationSettings}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${colors[level]}`}
                >
                  {SENSITIVITY_LABELS[level]}
                  {isActive && <span className="ml-1.5 text-xs opacity-80">(active)</span>}
                </button>
              );
            })}
          </div>

          {/* Save/Reset for sensitivity */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveMigrationSettingsAction}
              disabled={savingMigrationSettings}
              className={`px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 text-sm ${
                migrationSettingsSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-pb-accent hover:bg-pb-accent-hover'
              }`}
            >
              {savingMigrationSettings ? 'Saving...' : migrationSettingsSaved ? (<><CheckCircle size={14} /> Saved!</>) : (<><Save size={14} /> Save Sensitivity</>)}
            </button>
            <button
              onClick={resetMigrationSettingsAction}
              disabled={savingMigrationSettings}
              className="px-4 py-2 bg-white dark:bg-pb-surface2-dark hover:bg-slate-50 dark:hover:bg-pb-hover-dark border border-slate-300 dark:border-pb-border-dark text-slate-700 dark:text-pb-text-dark rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
