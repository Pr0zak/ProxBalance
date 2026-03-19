const { useState, useEffect, useRef } = React;

/**
 * Number input that uses local state during editing and commits on blur.
 * Prevents the snap-back issue where parseInt("") = NaN resets the value
 * before the user can type a new number.
 *
 * Props:
 *   value     – controlled numeric value from parent
 *   onCommit  – called with parsed number on blur (only if valid)
 *   isFloat   – use parseFloat instead of parseInt (default false)
 *   ...rest   – passed through to <input> (min, max, step, className, etc.)
 */
export default function NumberField({ value, onCommit, isFloat, className, ...props }) {
  const [localVal, setLocalVal] = useState(String(value ?? ''));
  const committedRef = useRef(value);

  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value;
      setLocalVal(String(value ?? ''));
    }
  }, [value]);

  return (
    <input
      {...props}
      type="number"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        const parsed = isFloat ? parseFloat(localVal) : parseInt(localVal, 10);
        if (!isNaN(parsed)) {
          committedRef.current = parsed;
          onCommit(parsed);
        } else {
          setLocalVal(String(value ?? ''));
        }
      }}
      className={className}
    />
  );
}
