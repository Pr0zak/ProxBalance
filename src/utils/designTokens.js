/**
 * Design tokens — single source of truth for all repeated UI class strings.
 * Import from here instead of copy-pasting Tailwind classes across components.
 *
 * v3: dark + light variants. Tailwind class-based dark mode (`darkMode: 'class'`
 * in tailwind.config.js). Default classes target light mode; `dark:` variants
 * apply when the `dark` class is on `<html>`.
 */

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/** Primary section card */
export const GLASS_CARD =
  'bg-white border border-gray-200 dark:bg-slate-800/80 dark:border-slate-700/50 rounded-lg p-4 sm:p-5 mb-4';

/** Secondary/subtle section card */
export const GLASS_CARD_SUBTLE =
  'bg-gray-50 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/40 rounded-lg p-4 sm:p-5 mb-4';

/** Nested card inside a section */
export const INNER_CARD =
  'bg-gray-50 border border-gray-200 dark:bg-slate-700/40 dark:border-slate-600/30 rounded-lg p-3 sm:p-4';

// ---------------------------------------------------------------------------
// Section header icon badge — colored bg tints work in both modes
// ---------------------------------------------------------------------------

const ICON_BADGE_MAP = {
  'blue,indigo':   'p-2 bg-blue-100 dark:bg-blue-600/20 rounded-lg shrink-0',
  'cyan,blue':     'p-2 bg-cyan-100 dark:bg-cyan-600/20 rounded-lg shrink-0',
  'teal,cyan':     'p-2 bg-teal-100 dark:bg-teal-600/20 rounded-lg shrink-0',
  'orange,red':    'p-2 bg-orange-100 dark:bg-orange-600/20 rounded-lg shrink-0',
  'purple,pink':   'p-2 bg-purple-100 dark:bg-purple-600/20 rounded-lg shrink-0',
  'violet,purple': 'p-2 bg-violet-100 dark:bg-violet-600/20 rounded-lg shrink-0',
  'green,emerald': 'p-2 bg-green-100 dark:bg-green-600/20 rounded-lg shrink-0',
  'gray':          'p-2 bg-gray-200 dark:bg-gray-600/20 rounded-lg shrink-0',
};
export const iconBadge = (from, to) => {
  const key = to ? `${from},${to}` : from;
  return ICON_BADGE_MAP[key] || `p-2 bg-${from}-100 dark:bg-${from}-600/20 rounded-lg shrink-0`;
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const BTN_PRIMARY =
  'px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_SECONDARY =
  'px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600/50 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_DANGER =
  'px-4 py-2 bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_ICON =
  'p-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 hover:text-gray-900 dark:bg-slate-700/60 dark:hover:bg-slate-600/80 dark:border-slate-600/30 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400/50';

// ---------------------------------------------------------------------------
// Form inputs
// ---------------------------------------------------------------------------

export const INPUT_FIELD =
  'w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 dark:bg-slate-700/60 dark:border-slate-600/50 dark:text-white dark:placeholder-gray-500 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';

export const SELECT_FIELD =
  'px-3 py-2 bg-white border border-gray-300 text-gray-900 dark:bg-slate-700/60 dark:border-slate-600/50 dark:text-white rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';

// ---------------------------------------------------------------------------
// Badge / pill
// ---------------------------------------------------------------------------

export const BADGE =
  'px-2.5 py-0.5 rounded-full text-xs font-semibold';

const STATUS_BADGE_MAP = {
  green:  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700/30',
  red:    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700/30',
  yellow: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-700/30',
  blue:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700/30',
  orange: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700/30',
  purple: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-700/30',
  gray:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-600/30',
};
export const statusBadge = (color) => STATUS_BADGE_MAP[color] || STATUS_BADGE_MAP.gray;

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const TABLE_HEADER =
  'text-left p-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider select-none';

export const TABLE_ROW =
  'border-b border-gray-200 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors';

export const TABLE_ROW_STRIPED =
  'even:bg-gray-50 dark:even:bg-slate-800/30';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EMPTY_STATE =
  'flex flex-col items-center justify-center py-8 sm:py-12 text-center';

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

export const MODAL_OVERLAY =
  'fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4';

export const MODAL_CONTAINER =
  'bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700/50 rounded-lg shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-enter';

// ---------------------------------------------------------------------------
// Text hierarchy
// ---------------------------------------------------------------------------

export const TEXT_HEADING =
  'text-lg sm:text-xl font-bold text-gray-900 dark:text-white';

export const TEXT_SUBHEADING =
  'text-sm text-gray-600 dark:text-gray-400';

// ---------------------------------------------------------------------------
// Standard icon sizes (px)
// ---------------------------------------------------------------------------

export const ICON = { section: 20, page: 24, action: 16, inline: 14 };

// ---------------------------------------------------------------------------
// Top navigation bar
// ---------------------------------------------------------------------------

export const TOP_NAV =
  'sticky top-0 z-40 bg-white/95 border-b border-gray-200 dark:bg-slate-900/95 dark:border-slate-700/50 backdrop-blur-sm';

export const NAV_TAB =
  'px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const NAV_TAB_ACTIVE =
  'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400';

export const NAV_TAB_INACTIVE =
  'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 border-transparent hover:border-gray-300 dark:hover:border-gray-600';

// ---------------------------------------------------------------------------
// Connection status badge
// ---------------------------------------------------------------------------

export const CONNECTION_BADGE_ONLINE =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700/30';

export const CONNECTION_BADGE_OFFLINE =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/30';

// ---------------------------------------------------------------------------
// KPI stat card
// ---------------------------------------------------------------------------

export const KPI_CARD =
  'bg-white border border-gray-200 dark:bg-slate-800/60 dark:border-slate-700/40 rounded-lg p-3 sm:p-4 flex items-center gap-3';

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

export const PROGRESS_BAR_BG =
  'h-2 rounded-full bg-gray-200 dark:bg-slate-700/60 overflow-hidden';

/** Returns Tailwind bg class based on metric percentage threshold (works in both modes) */
export const metricColor = (pct) => {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
};

/** Returns text color class for metric values — bumped intensity in light mode for contrast */
export const metricTextColor = (pct) => {
  if (pct >= 80) return 'text-red-700 dark:text-red-400';
  if (pct >= 60) return 'text-yellow-700 dark:text-yellow-400';
  return 'text-green-700 dark:text-green-400';
};

/** Returns text color for score values (lower = worse) */
export const scoreColor = (score) => {
  if (score >= 80) return 'text-green-700 dark:text-green-400';
  if (score >= 60) return 'text-yellow-700 dark:text-yellow-400';
  return 'text-red-700 dark:text-red-400';
};

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

export const FILTER_CHIP =
  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 whitespace-nowrap';

export const FILTER_CHIP_ACTIVE =
  'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-600/30 dark:text-blue-400 dark:border-blue-500/40';

export const FILTER_CHIP_INACTIVE =
  'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:bg-slate-800/40 dark:text-gray-400 dark:border-slate-600/40 dark:hover:bg-slate-700/40 dark:hover:text-gray-300';

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

export const SUB_TAB =
  'px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const SUB_TAB_ACTIVE =
  'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400';

export const SUB_TAB_INACTIVE =
  'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-600';

// ---------------------------------------------------------------------------
// Page background
// ---------------------------------------------------------------------------

export const PAGE_BG =
  'bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-gray-200 min-h-screen';
