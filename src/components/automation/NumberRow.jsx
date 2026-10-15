import { INPUT_FIELD } from '../../utils/designTokens.js';
import NumberField from '../NumberField.jsx';
import { SettingRow } from '../Toggle.jsx';

/**
 * A numeric setting as a SettingRow: label and help on the left, a narrow
 * number box (with an optional unit) on the right.
 */
export default function NumberRow({ label, description, detail, value, onCommit, unit, min, max, step, isFloat, children }) {
  return (
    <SettingRow
      label={label}
      description={description}
      detail={detail}
      control={(
        <div className="flex items-center gap-1.5 shrink-0">
          <NumberField
            min={min}
            max={max}
            step={step}
            isFloat={isFloat}
            value={value}
            onCommit={onCommit}
            className={`${INPUT_FIELD} !w-20 text-right tabular-nums`}
          />
          {unit && <span className="text-xs text-pb-text2 dark:text-gray-400 w-8">{unit}</span>}
        </div>
      )}
    >
      {children}
    </SettingRow>
  );
}
