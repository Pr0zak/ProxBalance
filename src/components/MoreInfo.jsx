import React, { useState } from 'react';
import { Info } from './Icons.jsx';

/**
 * A short line with its detail one tap away.
 *
 * Shows `children` (the short version) followed by a small info button.
 * Tapping it reveals `detail` underneath in smaller, muted text; tapping
 * again hides it. Desktop also gets the detail as a hover title. Use it
 * wherever the full explanation would wrap to three or more lines on a
 * phone: say the fact in a few words, put the why and how behind the tap.
 *
 * Props:
 *   detail     string or node with the full explanation (required)
 *   className  classes for the wrapper (inherits text size/colour)
 *   label      accessible name for the button (default "More about this")
 *   as         wrapper element, 'div' (default) or 'span' for use inside a line
 */
export default function MoreInfo({ children, detail, className = '', label = 'More about this', as = 'div' }) {
  const [open, setOpen] = useState(false);
  const Wrap = as;
  const title = typeof detail === 'string' ? detail : undefined;
  return (
    <Wrap className={className}>
      {children}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-expanded={open}
        aria-label={label}
        title={title}
        className={`inline-flex align-middle ml-1 p-1 -m-1 rounded-full transition-colors ${open ? 'text-blue-600 dark:text-blue-400' : 'text-pb-text2 dark:text-gray-500 hover:text-pb-text dark:hover:text-gray-300'}`}
      >
        <Info size={13} />
      </button>
      {open && (
        <span className="block mt-1 text-[11px] leading-snug font-normal text-pb-text2 dark:text-gray-400 whitespace-pre-line">
          {detail}
        </span>
      )}
    </Wrap>
  );
}
