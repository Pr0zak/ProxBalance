import { BTN_SECONDARY, INNER_CARD, TAP_TARGET } from '../../utils/designTokens.js';
import { ChevronDown } from '../Icons.jsx';

const { useState, useCallback } = React;

// Open/closed per panel for this page session only (module state, no storage):
// switching tabs keeps it, a reload starts closed.
const sessionOpen = {};

/** [open, toggle] for one phone options panel, remembered for the session. */
export function usePhoneOptions(key) {
  const [open, setOpen] = useState(() => !!sessionOpen[key]);
  const toggle = useCallback(() => setOpen(o => { sessionOpen[key] = !o; return !o; }), [key]);
  return [open, toggle];
}

/**
 * Phone-only "Options" button (hidden from sm up, where the controls show
 * inline). Pair it with <PhoneOptionsPanel> holding the same controls.
 */
export function PhoneOptionsButton({ open, onToggle, controls }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={`${BTN_SECONDARY} ${TAP_TARGET} sm:hidden !px-3 !py-1.5 text-xs`}
    >
      Options
      <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

/** The panel the Options button opens; renders nothing when closed or from sm up. */
export function PhoneOptionsPanel({ open, id, children }) {
  if (!open) return null;
  return (
    <div id={id} className={`${INNER_CARD} sm:hidden flex flex-col items-start gap-3 mb-3 text-sm`}>
      {children}
    </div>
  );
}
