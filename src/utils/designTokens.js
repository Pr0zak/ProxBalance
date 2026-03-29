/**
 * Design tokens — single source of truth for all repeated UI class strings.
 * Import from here instead of copy-pasting Tailwind classes across components.
 *
 * v2: Pulse-inspired flat dark data-dense aesthetic.
 */

// ---------------------------------------------------------------------------
// Cards — flat dark surfaces, minimal blur
// ---------------------------------------------------------------------------

/** Primary section card — dark elevated surface */
export const GLASS_CARD =
  'bg-slate-800/80 rounded-lg border border-slate-700/50 p-4 sm:p-5 mb-4';

/** Secondary/subtle section card */
export const GLASS_CARD_SUBTLE =
  'bg-slate-800/50 rounded-lg border border-slate-700/40 p-4 sm:p-5 mb-4';

/** Nested card inside a section */
export const INNER_CARD =
  'bg-slate-700/40 rounded-lg border border-slate-600/30 p-3 sm:p-4';

// ---------------------------------------------------------------------------
// Section header icon badge
// ---------------------------------------------------------------------------

const ICON_BADGE_MAP = {
  'blue,indigo':   'p-2 bg-blue-600/20 rounded-lg shrink-0',
  'cyan,blue':     'p-2 bg-cyan-600/20 rounded-lg shrink-0',
  'teal,cyan':     'p-2 bg-teal-600/20 rounded-lg shrink-0',
  'orange,red':    'p-2 bg-orange-600/20 rounded-lg shrink-0',
  'purple,pink':   'p-2 bg-purple-600/20 rounded-lg shrink-0',
  'violet,purple': 'p-2 bg-violet-600/20 rounded-lg shrink-0',
  'green,emerald': 'p-2 bg-green-600/20 rounded-lg shrink-0',
  'gray':          'p-2 bg-gray-600/20 rounded-lg shrink-0',
};
export const iconBadge = (from, to) => {
  const key = to ? `${from},${to}` : from;
  return ICON_BADGE_MAP[key] || `p-2 bg-${from}-600/20 rounded-lg shrink-0`;
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const BTN_PRIMARY =
  'px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_SECONDARY =
  'px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600/50 text-gray-300 text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_DANGER =
  'px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_ICON =
  'p-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/30 text-gray-400 hover:text-gray-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400/50';

// ---------------------------------------------------------------------------
// Form inputs
// ---------------------------------------------------------------------------

export const INPUT_FIELD =
  'w-full px-3 py-2 bg-slate-700/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-gray-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';

export const SELECT_FIELD =
  'px-3 py-2 bg-slate-700/60 border border-slate-600/50 rounded-lg text-sm text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';

// ---------------------------------------------------------------------------
// Badge / pill
// ---------------------------------------------------------------------------

export const BADGE =
  'px-2.5 py-0.5 rounded-full text-xs font-semibold';

const STATUS_BADGE_MAP = {
  green:  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-900/40 text-green-400 border border-green-700/30',
  red:    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-400 border border-red-700/30',
  yellow: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/40 text-yellow-400 border border-yellow-700/30',
  blue:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-400 border border-blue-700/30',
  orange: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-900/40 text-orange-400 border border-orange-700/30',
  purple: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/40 text-purple-400 border border-purple-700/30',
  gray:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800/40 text-gray-400 border border-gray-600/30',
};
export const statusBadge = (color) => STATUS_BADGE_MAP[color] || STATUS_BADGE_MAP.gray;

// ---------------------------------------------------------------------------
// Table — data-dense Pulse-inspired
// ---------------------------------------------------------------------------

export const TABLE_HEADER =
  'text-left p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider select-none';

export const TABLE_ROW =
  'border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors';

export const TABLE_ROW_STRIPED =
  'even:bg-slate-800/30';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EMPTY_STATE =
  'flex flex-col items-center justify-center py-8 sm:py-12 text-center';

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

export const MODAL_OVERLAY =
  'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4';

export const MODAL_CONTAINER =
  'bg-slate-800 rounded-lg border border-slate-700/50 shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-enter';

// ---------------------------------------------------------------------------
// Text hierarchy
// ---------------------------------------------------------------------------

export const TEXT_HEADING =
  'text-lg sm:text-xl font-bold text-white';

export const TEXT_SUBHEADING =
  'text-sm text-gray-400';

// ---------------------------------------------------------------------------
// Standard icon sizes (px)
// ---------------------------------------------------------------------------

export const ICON = { section: 20, page: 24, action: 16, inline: 14 };

// ---------------------------------------------------------------------------
// NEW: Top navigation bar
// ---------------------------------------------------------------------------

export const TOP_NAV =
  'sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50';

export const NAV_TAB =
  'px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const NAV_TAB_ACTIVE =
  'text-blue-400 border-blue-400';

export const NAV_TAB_INACTIVE =
  'text-gray-400 hover:text-gray-200 border-transparent hover:border-gray-600';

// ---------------------------------------------------------------------------
// NEW: Connection status badge
// ---------------------------------------------------------------------------

export const CONNECTION_BADGE_ONLINE =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700/30';

export const CONNECTION_BADGE_OFFLINE =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700/30';

// ---------------------------------------------------------------------------
// NEW: KPI stat card
// ---------------------------------------------------------------------------

export const KPI_CARD =
  'bg-slate-800/60 rounded-lg border border-slate-700/40 p-3 sm:p-4 flex items-center gap-3';

// ---------------------------------------------------------------------------
// NEW: Progress bar (for node metrics)
// ---------------------------------------------------------------------------

export const PROGRESS_BAR_BG =
  'h-2 rounded-full bg-slate-700/60 overflow-hidden';

/** Returns Tailwind bg class based on metric percentage threshold */
export const metricColor = (pct) => {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
};

/** Returns text color class for metric values */
export const metricTextColor = (pct) => {
  if (pct >= 80) return 'text-red-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-green-400';
};

/** Returns text color class for score values (inverted — lower score = worse) */
export const scoreColor = (score) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

// ---------------------------------------------------------------------------
// NEW: Filter chip
// ---------------------------------------------------------------------------

export const FILTER_CHIP =
  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 whitespace-nowrap';

export const FILTER_CHIP_ACTIVE =
  'bg-blue-600/30 text-blue-400 border-blue-500/40';

export const FILTER_CHIP_INACTIVE =
  'bg-slate-800/40 text-gray-400 border-slate-600/40 hover:bg-slate-700/40 hover:text-gray-300';

// ---------------------------------------------------------------------------
// NEW: Sub-tabs (horizontal tabs within a page)
// ---------------------------------------------------------------------------

export const SUB_TAB =
  'px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const SUB_TAB_ACTIVE =
  'text-blue-400 border-blue-400';

export const SUB_TAB_INACTIVE =
  'text-gray-500 hover:text-gray-300 border-transparent hover:border-gray-600';

// ---------------------------------------------------------------------------
// Page background
// ---------------------------------------------------------------------------

export const PAGE_BG = 'bg-slate-900 min-h-screen text-gray-200';
