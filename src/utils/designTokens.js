/**
 * Design tokens — single source of truth for all repeated UI class strings.
 * Import from here instead of copy-pasting Tailwind classes across components.
 */

// ---------------------------------------------------------------------------
// Glass cards
// ---------------------------------------------------------------------------

/** Primary section card — frosted glass with depth */
export const GLASS_CARD =
  'backdrop-blur-xl bg-white/70 dark:bg-gray-800/60 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/20 dark:border-gray-700/50 p-4 sm:p-6 mb-6';

/** Secondary/subtle section card */
export const GLASS_CARD_SUBTLE =
  'backdrop-blur-lg bg-white/50 dark:bg-gray-800/40 rounded-xl shadow-md border border-white/15 dark:border-gray-700/40 p-4 sm:p-6 mb-6';

/** Nested card inside a glass card */
export const INNER_CARD =
  'bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-gray-600/30 p-3 sm:p-4';

// ---------------------------------------------------------------------------
// Section header icon badge
// ---------------------------------------------------------------------------

/**
 * Gradient icon badge for section headers.
 * Uses a static lookup so Tailwind JIT can detect all class strings.
 * Call: iconBadge('blue', 'indigo') or iconBadge('gray')
 */
const ICON_BADGE_MAP = {
  'blue,indigo':   'p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 shrink-0',
  'cyan,blue':     'p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/25 shrink-0',
  'teal,cyan':     'p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/25 shrink-0',
  'orange,red':    'p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/25 shrink-0',
  'purple,pink':   'p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/25 shrink-0',
  'violet,purple': 'p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/25 shrink-0',
  'green,emerald': 'p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25 shrink-0',
  'gray':          'p-2.5 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg shadow-gray-500/25 shrink-0',
};
export const iconBadge = (from, to) => {
  const key = to ? `${from},${to}` : from;
  return ICON_BADGE_MAP[key] || `p-2.5 bg-gradient-to-br from-${from}-500 to-${(to || from)}-600 rounded-xl shadow-lg shadow-${from}-500/25 shrink-0`;
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const BTN_PRIMARY =
  'px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/25 hover:shadow-blue-500/30 transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_SECONDARY =
  'px-4 py-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur border border-gray-200/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_DANGER =
  'px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md shadow-red-600/25 transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_ICON =
  'p-2 rounded-xl bg-white/60 dark:bg-gray-700/50 backdrop-blur border border-gray-200/30 dark:border-gray-600/30 hover:bg-white/80 dark:hover:bg-gray-600/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900';

// ---------------------------------------------------------------------------
// Form inputs
// ---------------------------------------------------------------------------

export const INPUT_FIELD =
  'w-full px-3 py-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';

export const SELECT_FIELD =
  'px-3 py-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-sm text-gray-900 dark:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';

// ---------------------------------------------------------------------------
// Badge / pill
// ---------------------------------------------------------------------------

export const BADGE =
  'px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm';

/** Status badge with icon — pass color name. Static map for Tailwind JIT. */
const STATUS_BADGE_MAP = {
  green:  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  red:    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  yellow: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100/80 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  blue:   'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  orange: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  purple: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  gray:   'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100/80 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
};
export const statusBadge = (color) => STATUS_BADGE_MAP[color] || STATUS_BADGE_MAP.gray;

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const TABLE_HEADER =
  'text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 select-none';

export const TABLE_ROW =
  'border-b border-gray-100/50 dark:border-gray-700/50 hover:bg-white/40 dark:hover:bg-gray-700/30 transition-colors';

export const TABLE_ROW_STRIPED =
  'even:bg-gray-50/30 dark:even:bg-gray-800/20';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EMPTY_STATE =
  'flex flex-col items-center justify-center py-8 sm:py-12 text-center';

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

export const MODAL_OVERLAY =
  'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';

export const MODAL_CONTAINER =
  'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-white/20 dark:border-gray-700/50 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-enter';

// ---------------------------------------------------------------------------
// Text hierarchy
// ---------------------------------------------------------------------------

export const TEXT_HEADING =
  'text-lg sm:text-xl font-bold text-gray-900 dark:text-white';

export const TEXT_SUBHEADING =
  'text-sm text-gray-500 dark:text-gray-400';

// ---------------------------------------------------------------------------
// Standard icon sizes (px)
// ---------------------------------------------------------------------------

export const ICON = { section: 22, page: 26, action: 16, inline: 14 };
