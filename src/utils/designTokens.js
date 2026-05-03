/**
 * Design tokens — single source of truth for all repeated UI class strings.
 * Import from here instead of copy-pasting Tailwind classes across components.
 *
 * v4: Claude-inspired palette. Light = cream page bg with white cards and
 * warm stone borders; dark = warm dark gray (#262624 family) — NOT cool slate.
 * Accent is coral (#CC785C) in both modes. Text contrasts are tuned to feel
 * like reading a document rather than a data terminal.
 */

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/** Primary section card — clean white in light, warm dark in dark */
export const GLASS_CARD =
  'bg-claude-surface border border-claude-border shadow-sm dark:bg-claude-dark2 dark:border-claude-darkBorder dark:shadow-none rounded-lg p-4 sm:p-5 mb-4';

/** Secondary/subtle section card */
export const GLASS_CARD_SUBTLE =
  'bg-claude-surface2 border border-claude-border dark:bg-claude-dark2/60 dark:border-claude-darkBorder rounded-lg p-4 sm:p-5 mb-4';

/** Nested card inside a section */
export const INNER_CARD =
  'bg-claude-surface2 border border-claude-border dark:bg-claude-dark3 dark:border-claude-darkBorder rounded-lg p-3 sm:p-4';

// ---------------------------------------------------------------------------
// Section header icon badge
// ---------------------------------------------------------------------------

const ICON_BADGE_MAP = {
  'blue,indigo':   'p-2 bg-blue-100 dark:bg-blue-600/20 rounded-lg shrink-0',
  'cyan,blue':     'p-2 bg-cyan-100 dark:bg-cyan-600/20 rounded-lg shrink-0',
  'teal,cyan':     'p-2 bg-teal-100 dark:bg-teal-600/20 rounded-lg shrink-0',
  'orange,red':    'p-2 bg-claude-coralSoft dark:bg-claude-coral/20 rounded-lg shrink-0',
  'purple,pink':   'p-2 bg-purple-100 dark:bg-purple-600/20 rounded-lg shrink-0',
  'violet,purple': 'p-2 bg-violet-100 dark:bg-violet-600/20 rounded-lg shrink-0',
  'green,emerald': 'p-2 bg-green-100 dark:bg-green-600/20 rounded-lg shrink-0',
  'gray':          'p-2 bg-stone-200 dark:bg-claude-dark3 rounded-lg shrink-0',
};
export const iconBadge = (from, to) => {
  const key = to ? `${from},${to}` : from;
  return ICON_BADGE_MAP[key] || `p-2 bg-${from}-100 dark:bg-${from}-600/20 rounded-lg shrink-0`;
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

/** Primary action — Claude coral */
export const BTN_PRIMARY =
  'px-4 py-2 bg-claude-coral hover:brightness-95 dark:hover:brightness-110 text-white text-sm font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-claude-coral/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_SECONDARY =
  'px-4 py-2 bg-claude-surface hover:bg-claude-surface2 border border-claude-border text-claude-text dark:bg-claude-dark3 dark:hover:bg-claude-darkBorder dark:border-claude-darkBorder dark:text-claude-darkText text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-claude-coral/30 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_DANGER =
  'px-4 py-2 bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_ICON =
  'p-2 rounded-lg bg-claude-surface hover:bg-claude-surface2 border border-claude-border text-claude-muted hover:text-claude-text dark:bg-claude-dark3 dark:hover:bg-claude-darkBorder dark:border-claude-darkBorder dark:text-claude-darkMuted dark:hover:text-claude-darkText transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-claude-coral/30';

// ---------------------------------------------------------------------------
// Form inputs
// ---------------------------------------------------------------------------

export const INPUT_FIELD =
  'w-full px-3 py-2 bg-claude-surface border border-claude-border text-claude-text placeholder-claude-muted/70 dark:bg-claude-dark3 dark:border-claude-darkBorder dark:text-claude-darkText dark:placeholder-claude-darkMuted/70 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-claude-coral/40 focus:border-claude-coral/50';

export const SELECT_FIELD =
  'px-3 py-2 bg-claude-surface border border-claude-border text-claude-text dark:bg-claude-dark3 dark:border-claude-darkBorder dark:text-claude-darkText rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-claude-coral/40 focus:border-claude-coral/50';

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
  orange: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-claude-coralSoft text-claude-coral border border-claude-coral/30 dark:bg-claude-coral/20 dark:text-claude-coral dark:border-claude-coral/30',
  purple: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-700/30',
  gray:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-claude-muted border border-claude-border dark:bg-claude-dark3 dark:text-claude-darkMuted dark:border-claude-darkBorder',
};
export const statusBadge = (color) => STATUS_BADGE_MAP[color] || STATUS_BADGE_MAP.gray;

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const TABLE_HEADER =
  'text-left p-3 text-xs font-semibold text-claude-muted dark:text-claude-darkMuted uppercase tracking-wider select-none';

export const TABLE_ROW =
  'border-b border-claude-border dark:border-claude-darkBorder hover:bg-claude-surface2 dark:hover:bg-claude-dark3 transition-colors';

export const TABLE_ROW_STRIPED =
  'even:bg-claude-surface2 dark:even:bg-claude-dark3/50';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EMPTY_STATE =
  'flex flex-col items-center justify-center py-8 sm:py-12 text-center';

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

export const MODAL_OVERLAY =
  'fixed inset-0 bg-claude-text/30 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4';

export const MODAL_CONTAINER =
  'bg-claude-surface border border-claude-border dark:bg-claude-dark2 dark:border-claude-darkBorder rounded-lg shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-enter';

// ---------------------------------------------------------------------------
// Text hierarchy
// ---------------------------------------------------------------------------

export const TEXT_HEADING =
  'text-lg sm:text-xl font-bold text-claude-text dark:text-claude-darkText';

export const TEXT_SUBHEADING =
  'text-sm text-claude-muted dark:text-claude-darkMuted';

// ---------------------------------------------------------------------------
// Standard icon sizes (px)
// ---------------------------------------------------------------------------

export const ICON = { section: 20, page: 24, action: 16, inline: 14 };

// ---------------------------------------------------------------------------
// Top navigation bar
// ---------------------------------------------------------------------------

export const TOP_NAV =
  'sticky top-0 z-40 bg-claude-cream/95 border-b border-claude-border dark:bg-claude-dark/95 dark:border-claude-darkBorder backdrop-blur-sm';

export const NAV_TAB =
  'px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const NAV_TAB_ACTIVE =
  'text-claude-coral border-claude-coral';

export const NAV_TAB_INACTIVE =
  'text-claude-muted hover:text-claude-text dark:text-claude-darkMuted dark:hover:text-claude-darkText border-transparent hover:border-claude-border dark:hover:border-claude-darkBorder';

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
  'bg-claude-surface border border-claude-border shadow-sm dark:bg-claude-dark2 dark:border-claude-darkBorder dark:shadow-none rounded-lg p-3 sm:p-4 flex items-center gap-3';

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

export const PROGRESS_BAR_BG =
  'h-2 rounded-full bg-stone-200 dark:bg-claude-dark3 overflow-hidden';

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
  'bg-claude-coralSoft text-claude-coral border-claude-coral/40 dark:bg-claude-coral/20 dark:text-claude-coral dark:border-claude-coral/40';

export const FILTER_CHIP_INACTIVE =
  'bg-claude-surface text-claude-muted border-claude-border hover:bg-claude-surface2 hover:text-claude-text dark:bg-claude-dark3/40 dark:text-claude-darkMuted dark:border-claude-darkBorder dark:hover:bg-claude-dark3 dark:hover:text-claude-darkText';

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

export const SUB_TAB =
  'px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const SUB_TAB_ACTIVE =
  'text-claude-coral border-claude-coral';

export const SUB_TAB_INACTIVE =
  'text-claude-muted hover:text-claude-text dark:text-claude-darkMuted dark:hover:text-claude-darkText border-transparent hover:border-claude-border dark:hover:border-claude-darkBorder';

// ---------------------------------------------------------------------------
// Page background — cream (light) / warm dark (dark)
// ---------------------------------------------------------------------------

export const PAGE_BG =
  'bg-claude-cream text-claude-text dark:bg-claude-dark dark:text-claude-darkText min-h-screen';
