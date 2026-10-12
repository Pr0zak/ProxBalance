import { INNER_CARD } from '../utils/designTokens.js';

export default function Toggle({ checked, onChange, color = 'green', className = 'ml-4' }) {
  const colorClass = color === 'yellow' ? 'peer-checked:bg-yellow-600' : 'peer-checked:bg-green-600';

  return (
    <label className={`relative inline-flex items-center cursor-pointer shrink-0 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className={`w-11 h-6 bg-slate-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-pb-border dark:border-gray-600 ${colorClass}`}></div>
    </label>
  );
}

/**
 * One setting: label and help text on the left, its control on the right.
 * Built on INNER_CARD so settings read like the rest of the glass UI. Pass
 * `control` for a non-toggle control (number input, select, button).
 */
export function SettingRow({ label, description, control, children }) {
  return (
    <div className={INNER_CARD}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium text-pb-text dark:text-white">{label}</div>
          {description && <div className="text-sm text-pb-text2 dark:text-gray-400">{description}</div>}
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

export function ToggleRow({ label, description, checked, onChange, color, children }) {
  return (
    <SettingRow
      label={label}
      description={description}
      control={<Toggle checked={checked} onChange={onChange} color={color} />}
    >
      {children}
    </SettingRow>
  );
}
