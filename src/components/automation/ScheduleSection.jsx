import { Clock } from '../Icons.jsx';
import { GLASS_CARD, INPUT_FIELD } from '../../utils/designTokens.js';
import NumberField from '../NumberField.jsx';
import TimeWindowsSection from './TimeWindowsSection.jsx';
import SectionHeader from './SectionHeader.jsx';

export default function ScheduleSection({
  automationConfig, saveAutomationConfig,
  collapsedSections, setCollapsedSections,
  setError,
}) {
  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <SectionHeader
        title="When to Migrate"
        icon={Clock}
        accent={['indigo', 'violet']}
        collapsed={collapsedSections.scheduleSection}
        onToggle={() => setCollapsedSections(prev => ({ ...prev, scheduleSection: !prev.scheduleSection }))}
      />

      {!collapsedSections.scheduleSection && (
        <div className="space-y-4">
          {/* Timing Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-pb-surface2 dark:bg-slate-700 rounded-lg">
              <label className="block font-semibold text-pb-text dark:text-white mb-2">
                Check Every (minutes)
              </label>
              <NumberField
                min="1"
                max="60"
                value={automationConfig.check_interval_minutes || 5}
                onCommit={(val) => saveAutomationConfig({ check_interval_minutes: val })}
                className={`${INPUT_FIELD} w-full`}
              />
              <div className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                How often to check for migrations
              </div>
            </div>

            <div className="p-4 bg-pb-surface2 dark:bg-slate-700 rounded-lg">
              <label className="block font-semibold text-pb-text dark:text-white mb-2">
                Per-VM Cooldown (minutes)
              </label>
              <NumberField
                min="0"
                max="1440"
                value={automationConfig.rules?.cooldown_minutes || 30}
                onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, cooldown_minutes: val } })}
                className={`${INPUT_FIELD} w-full`}
              />
              <div className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                Wait time between migrations of the same VM
              </div>
            </div>

            <div className="p-4 bg-pb-surface2 dark:bg-slate-700 rounded-lg">
              <label className="block font-semibold text-pb-text dark:text-white mb-2">
                Settle Time Between Migrations (seconds)
              </label>
              <NumberField
                min="0"
                max="300"
                value={automationConfig.rules?.grace_period_seconds !== undefined ? automationConfig.rules.grace_period_seconds : 30}
                onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, grace_period_seconds: val } })}
                className={`${INPUT_FIELD} w-full`}
              />
              <div className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                Wait for cluster to settle between migrations (0 = no wait)
              </div>
            </div>
          </div>

          {/* Time Windows (embedded) */}
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <TimeWindowsSection
              embedded
              automationConfig={automationConfig}
              saveAutomationConfig={saveAutomationConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
              setError={setError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
