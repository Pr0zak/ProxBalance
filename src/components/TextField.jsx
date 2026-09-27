import { INPUT_FIELD } from '../utils/designTokens.js';

const { useState, useEffect, useRef } = React;

/**
 * Text input that edits locally and commits on blur or Enter.
 * Use for fields that persist to the backend so each keystroke doesn't
 * fire a save request (and out-of-order responses can't eat characters).
 *
 * Props:
 *   value    – controlled string value from parent
 *   onCommit – called with the new string when it differs from `value`
 *   ...rest  – passed through to <input> (type, placeholder, className, etc.)
 */
export default function TextField({ value, onCommit, className = INPUT_FIELD, type = 'text', ...props }) {
  const [localVal, setLocalVal] = useState(value ?? '');
  const committedRef = useRef(value ?? '');

  useEffect(() => {
    if ((value ?? '') !== committedRef.current) {
      committedRef.current = value ?? '';
      setLocalVal(value ?? '');
    }
  }, [value]);

  const commit = () => {
    if (localVal === committedRef.current) return;
    committedRef.current = localVal;
    onCommit(localVal);
  };

  return (
    <input
      {...props}
      type={type}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      className={className}
    />
  );
}
