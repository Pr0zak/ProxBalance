import { Clock } from '../Icons.jsx';
import { GLASS_CARD } from '../../utils/designTokens.js';
import NumberRow from './NumberRow.jsx';
import TimeWindowsSection from './TimeWindowsSection.jsx';
import SectionHeader from '../SectionHeader.jsx';

export default function ScheduleSection({
  automationConfig, savedConfig, saveAutomationConfig, automationStatus,
  collapsedSections, setCollapsedSections,
  setError,
}) {
  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <SectionHeader
        title="When to Migrate"
        icon={Clock}
        accent={['indigo', 'violet']}
      />

      {(
        <div className="space-y-4">
          {/* Timing Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <NumberRow
              label="Check every"
              description="How often to look for moves"
              unit="min" min="1" max="60"
              value={automationConfig.check_interval_minutes || 5}
              onCommit={(val) => saveAutomationConfig({ check_interval_minutes: val })}
            />
            <NumberRow
              label="Per-guest cooldown"
              description="Before a guest can move again"
              unit="min" min="0" max="1440"
              value={automationConfig.rules?.cooldown_minutes || 30}
              onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, cooldown_minutes: val } })}
            />
            <NumberRow
              label="Settle time"
              description="Pause between moves (0 = none)"
              unit="sec" min="0" max="300"
              value={automationConfig.rules?.grace_period_seconds !== undefined ? automationConfig.rules.grace_period_seconds : 30}
              onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, grace_period_seconds: val } })}
            />
          </div>

          {/* Time Windows (embedded) */}
          <div className="border-t border-pb-border dark:border-slate-700 pt-4">
            <TimeWindowsSection
              embedded
              automationConfig={automationConfig}
              savedConfig={savedConfig}
              automationStatus={automationStatus}
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
