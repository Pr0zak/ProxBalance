import {
  AlertTriangle, Activity, ChevronDown, Settings, Shield, X, Power
} from '../Icons.jsx';

const { useState } = React;

export default function MainSettingsSection({ automationConfig, saveAutomationConfig, collapsedSections, setCollapsedSections }) {
  const [confirmEnableAutomation, setConfirmEnableAutomation] = useState(false);
  const [confirmDisableDryRun, setConfirmDisableDryRun] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [confirmApplyPreset, setConfirmApplyPreset] = useState(null);

  return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, mainSettings: !prev.mainSettings }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Main Settings</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.mainSettings ? '-rotate-180' : ''}`}
            />
          </button>

          {!collapsedSections.mainSettings && (<div className="space-y-4">
            {/* Enable/Disable */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Enable Automated Migrations</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Turn automation on or off</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.enabled || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Show confirmation for enabling
                        setConfirmEnableAutomation(true);
                      } else {
                        // Disabling doesn't need confirmation
                        saveAutomationConfig({ enabled: false });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
              {confirmEnableAutomation && (
                <div className="px-4 pb-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-orange-900 dark:text-orange-200 mb-2">Enable Automated Migrations?</div>
                        <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                          The system will automatically migrate VMs based on your configured rules.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              saveAutomationConfig({ enabled: true });
                              setConfirmEnableAutomation(false);
                            }}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium flex items-center justify-center gap-1.5"
                          >
                            <Power size={14} />
                            Enable Automation
                          </button>
                          <button
                            onClick={() => setConfirmEnableAutomation(false)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1.5"
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
            </div>

            {/* Dry Run */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Dry Run Mode</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Test without actual migrations (recommended)</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.dry_run !== false}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        // Show CRITICAL warning for disabling dry run
                        setConfirmDisableDryRun(true);
                      } else {
                        // Enabling dry run is safe, no confirmation needed
                        saveAutomationConfig({ dry_run: true });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600"></div>
                </label>
              </div>
              {confirmDisableDryRun && (
                <div className="px-4 pb-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-red-900 dark:text-red-200 mb-2 text-lg">DISABLE DRY RUN MODE?</div>
                        <div className="text-sm text-red-800 dark:text-red-300 space-y-2 mb-4">
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
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle size={14} />
                            Yes, Disable Dry Run
                          </button>
                          <button
                            onClick={() => setConfirmDisableDryRun(false)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-1.5"
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
            </div>

            {/* Check Interval */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                Check Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={automationConfig.check_interval_minutes || 5}
                onChange={(e) => saveAutomationConfig({ check_interval_minutes: parseInt(e.target.value) })}
                className="w-32 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                How often to check for migrations
              </div>
            </div>

            {/* Schedule Presets */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="block font-semibold text-gray-900 dark:text-white">
                  Quick Configuration Presets
                </label>
                <button
                  onClick={() => setEditingPreset(editingPreset ? null : 'info')}
                  className="text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 flex items-center gap-1"
                >
                  <Settings size={14} />
                  {editingPreset ? 'Done Editing' : 'Customize Presets'}
                </button>
              </div>

              {(() => {
                const presets = automationConfig.presets || {
                  conservative: { min_confidence_score: 80, max_migrations_per_run: 1, cooldown_minutes: 120, check_interval_minutes: 30 },
                  balanced: { min_confidence_score: 70, max_migrations_per_run: 3, cooldown_minutes: 60, check_interval_minutes: 15 },
                  aggressive: { min_confidence_score: 60, max_migrations_per_run: 5, cooldown_minutes: 30, check_interval_minutes: 5 }
                };

                const presetInfo = {
                  conservative: { icon: Shield, color: 'blue', label: 'Conservative', desc: 'High confidence, low frequency, safest option' },
                  balanced: { icon: Activity, color: 'green', label: 'Balanced', desc: 'Medium confidence and frequency, recommended' },
                  aggressive: { icon: AlertTriangle, color: 'orange', label: 'Aggressive', desc: 'Lower confidence, high frequency, use with care' }
                };

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(presets).map(([key, preset]) => {
                      const info = presetInfo[key];
                      const Icon = info.icon;
                      const editing = editingPreset === key;

                      return (
                        <div key={key} className={`p-3 bg-white dark:bg-gray-700 border-2 border-${info.color}-300 dark:border-${info.color}-600 rounded-lg ${!editing && 'hover:bg-' + info.color + '-50 dark:hover:bg-' + info.color + '-900/30'} transition-colors`}>
                          {editing ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon size={16} className={`text-${info.color}-600 dark:text-${info.color}-400`} />
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{info.label}</span>
                                </div>
                                <button
                                  onClick={() => setEditingPreset(null)}
                                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Min Confidence</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={preset.min_confidence_score}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, min_confidence_score: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Max Migrations</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={preset.max_migrations_per_run}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, max_migrations_per_run: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Cooldown (min)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="1440"
                                  value={preset.cooldown_minutes}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, cooldown_minutes: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Check Interval (min)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="1440"
                                  value={preset.check_interval_minutes}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, check_interval_minutes: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (editingPreset) {
                                  setEditingPreset(key);
                                } else if (confirmApplyPreset === key) {
                                  // Second click - execute the preset application
                                  saveAutomationConfig({
                                    check_interval_minutes: preset.check_interval_minutes,
                                    rules: {
                                      ...automationConfig.rules,
                                      min_confidence_score: preset.min_confidence_score,
                                      max_migrations_per_run: preset.max_migrations_per_run,
                                      cooldown_minutes: preset.cooldown_minutes
                                    }
                                  });
                                  setConfirmApplyPreset(null);
                                } else {
                                  // First click - set confirm state
                                  setConfirmApplyPreset(key);
                                }
                              }}
                              className={`w-full text-left ${
                                confirmApplyPreset === key
                                  ? 'ring-2 ring-orange-500 dark:ring-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon size={18} className={`text-${info.color}-600 dark:text-${info.color}-400`} />
                                <span className="font-semibold text-gray-900 dark:text-white">{info.label}</span>
                                {editingPreset && (
                                  <Settings size={14} className="ml-auto text-gray-500" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {info.desc}
                              </div>
                              {editingPreset && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Click to edit
                                </div>
                              )}
                              {confirmApplyPreset === key && (
                                <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 font-semibold">
                                  Click again to apply preset
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="text-xs text-purple-700 dark:text-purple-300 mt-3 italic">
                💡 {editingPreset ? 'Edit preset values above, then click "Done Editing" to apply them.' : 'These presets configure multiple settings at once. Click "Customize Presets" to edit their values.'}
              </div>
            </div>
          </div>)}
        </div>
  );
}
