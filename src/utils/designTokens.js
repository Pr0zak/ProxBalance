/**
 * Design tokens — single source of truth for all repeated UI class strings.
 * Import from here instead of copy-pasting Tailwind classes across components.
 *
 * v3: Theme-aware. Every token is `light defaults` + `dark:` overrides.
 *     Requires Tailwind `darkMode: 'class'` and the custom colors block in
 *     tailwind.config.js (see project README).
 *
 * Naming convention: short, role-based — `surface`, `surface-2`, `border`,
 * `text`, `text-2`, `accent`, `success`, `warn`, `danger`. The custom palette
 * `pb.*` defined in tailwind.config.js maps these to actual hex values.
 */

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const PAGE_BG =
  'bg-pb-bg dark:bg-pb-bg-dark min-h-screen text-pb-text dark:text-pb-text-dark';

// ---------------------------------------------------------------------------
// Cards / surfaces
// ---------------------------------------------------------------------------

/** Primary section card */
export const GLASS_CARD =
  'bg-white dark:bg-pb-surface-dark rounded-xl border border-slate-200 dark:border-pb-border-dark p-4 sm:p-5 mb-4 shadow-sm dark:shadow-none';

/** Subtle / nested section card */
export const GLASS_CARD_SUBTLE =
  'bg-slate-50 dark:bg-pb-surface2-dark rounded-xl border border-slate-200/70 dark:border-pb-border-dark p-4 sm:p-5 mb-4';

/** Card nested inside another section */
export const INNER_CARD =
  'bg-slate-50 dark:bg-pb-surface2-dark rounded-lg border border-slate-200/70 dark:border-pb-border-dark/70 p-3 sm:p-4';

// ---------------------------------------------------------------------------
// Section header icon badge
// ---------------------------------------------------------------------------
// Soft tinted square containing a section icon.
// Light mode uses 8% tints, dark uses 18%. Keys map to old (from,to) calls so
// existing call sites need no changes.

const ICON_BADGE_MAP = {
  'blue,indigo':
    'p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 rounded-lg shrink-0',
  'cyan,blue':
    'p-2 bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300 rounded-lg shrink-0',
  'teal,cyan':
    'p-2 bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300 rounded-lg shrink-0',
  'orange,red':
    'p-2 bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300 rounded-lg shrink-0',
  'purple,pink':
    'p-2 bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300 rounded-lg shrink-0',
  'violet,purple':
    'p-2 bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300 rounded-lg shrink-0',
  'green,emerald':
    'p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 rounded-lg shrink-0',
  'gray':
    'p-2 bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 rounded-lg shrink-0',
};
export const iconBadge = (from, to) => {
  const key = to ? `${from},${to}` : from;
  return (
    ICON_BADGE_MAP[key] ||
    `p-2 bg-${from}-50 text-${from}-600 dark:bg-${from}-500/15 dark:text-${from}-300 rounded-lg shrink-0`
  );
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const BTN_PRIMARY =
  'inline-flex items-center gap-2 px-4 py-2 bg-pb-accent hover:bg-pb-accent-hover text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-pb-accent/40 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_SECONDARY =
  'inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-pb-surface2-dark hover:bg-slate-50 dark:hover:bg-pb-hover-dark border border-slate-300 dark:border-pb-border-dark text-slate-700 dark:text-pb-text-dark text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-pb-accent/30 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_DANGER =
  'inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed';

export const BTN_ICON =
  'inline-flex items-center justify-center p-2 rounded-lg bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-pb-hover-dark border border-slate-200 dark:border-pb-border-dark text-slate-600 dark:text-pb-text2-dark hover:text-slate-900 dark:hover:text-pb-text-dark transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-pb-accent/30';

// ---------------------------------------------------------------------------
// Form inputs
// ---------------------------------------------------------------------------

export const INPUT_FIELD =
  'w-full px-3 py-2 bg-slate-50 dark:bg-pb-surface2-dark border border-slate-200 dark:border-pb-border-dark rounded-lg text-sm text-slate-900 dark:text-pb-text-dark placeholder-slate-400 dark:placeholder-pb-text3-dark transition-colors duration-150 focus:outline-none focus:bg-white dark:focus:bg-pb-surface-dark focus:ring-2 focus:ring-pb-accent/30 focus:border-pb-accent/50';

export const SELECT_FIELD =
  'px-3 py-2 bg-slate-50 dark:bg-pb-surface2-dark border border-slate-200 dark:border-pb-border-dark rounded-lg text-sm text-slate-900 dark:text-pb-text-dark transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-pb-accent/30 focus:border-pb-accent/50';

// ---------------------------------------------------------------------------
// Badge / pill
// ---------------------------------------------------------------------------

export const BADGE = 'px-2.5 py-0.5 rounded-full text-xs font-semibold';

const STATUS_BADGE_MAP = {
  green:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  red:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
  yellow:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  blue:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  orange:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
  purple:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
  gray:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
};
export const statusBadge = (color) => STATUS_BADGE_MAP[color] || STATUS_BADGE_MAP.gray;

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const TABLE_HEADER =
  'text-left p-3 text-[11px] font-semibold uppercase tracking-wider select-none bg-slate-50 dark:bg-pb-surface2-dark text-slate-500 dark:text-pb-text3-dark';

export const TABLE_ROW =
  'border-b border-slate-100 dark:border-pb-border-dark/70 hover:bg-slate-50 dark:hover:bg-pb-hover-dark transition-colors';

export const TABLE_ROW_STRIPED =
  'even:bg-slate-50/60 dark:even:bg-pb-surface2-dark/40';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const EMPTY_STATE =
  'flex flex-col items-center justify-center py-8 sm:py-12 text-center text-slate-500 dark:text-pb-text3-dark';

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

export const MODAL_OVERLAY =
  'fixed inset-0 bg-slate-900/45 dark:bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4';

export const MODAL_CONTAINER =
  'bg-white dark:bg-pb-surface-dark rounded-xl border border-slate-200 dark:border-pb-border-dark shadow-xl dark:shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-enter';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export const TEXT_HEADING =
  'text-lg sm:text-xl font-bold text-slate-900 dark:text-pb-text-dark';

export const TEXT_SUBHEADING =
  'text-sm text-slate-500 dark:text-pb-text2-dark';

// ---------------------------------------------------------------------------
// Icon sizes (px)
// ---------------------------------------------------------------------------

export const ICON = { section: 20, page: 24, action: 16, inline: 14 };

// ---------------------------------------------------------------------------
// Top nav
// ---------------------------------------------------------------------------

export const TOP_NAV =
  'sticky top-0 z-40 bg-white/85 dark:bg-pb-bg-dark/85 backdrop-blur-md border-b border-slate-200 dark:border-pb-border-dark';

export const NAV_TAB =
  'px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const NAV_TAB_ACTIVE =
  'text-pb-accent dark:text-pb-accent-dark border-pb-accent dark:border-pb-accent-dark';

export const NAV_TAB_INACTIVE =
  'text-slate-500 dark:text-pb-text2-dark hover:text-slate-900 dark:hover:text-pb-text-dark border-transparent hover:border-slate-300 dark:hover:border-pb-border-dark';

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export const CONNECTION_BADGE_ONLINE =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';

export const CONNECTION_BADGE_OFFLINE =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30';

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

export const KPI_CARD =
  'bg-white dark:bg-pb-surface-dark rounded-xl border border-slate-200 dark:border-pb-border-dark p-3 sm:p-4 flex items-center gap-3 transition-colors hover:border-slate-300 dark:hover:border-pb-border-strong-dark';

// ---------------------------------------------------------------------------
// Progress bars
// ---------------------------------------------------------------------------

export const PROGRESS_BAR_BG =
  'h-1.5 rounded-full bg-slate-200 dark:bg-pb-track-dark overflow-hidden';

export const metricColor = (pct) => {
  if (pct >= 80) return 'bg-red-500 dark:bg-red-400';
  if (pct >= 60) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-emerald-500 dark:bg-emerald-400';
};

export const metricTextColor = (pct) => {
  if (pct >= 80) return 'text-red-600 dark:text-red-400';
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
};

export const scoreColor = (score) => {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

export const FILTER_CHIP =
  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 whitespace-nowrap';

export const FILTER_CHIP_ACTIVE =
  'bg-pb-accent/10 text-pb-accent border-pb-accent/30 dark:bg-pb-accent-dark/15 dark:text-pb-accent-dark dark:border-pb-accent-dark/35';

export const FILTER_CHIP_INACTIVE =
  'bg-transparent text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-pb-text2-dark dark:border-pb-border-dark dark:hover:bg-pb-hover-dark dark:hover:text-pb-text-dark';

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

export const SUB_TAB =
  'px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap';

export const SUB_TAB_ACTIVE =
  'text-pb-accent dark:text-pb-accent-dark border-pb-accent dark:border-pb-accent-dark';

export const SUB_TAB_INACTIVE =
  'text-slate-500 dark:text-pb-text3-dark hover:text-slate-900 dark:hover:text-pb-text-dark border-transparent hover:border-slate-300 dark:hover:border-pb-border-dark';

// ---------------------------------------------------------------------------
// Auto-migration banner
// ---------------------------------------------------------------------------

export const BANNER_SUCCESS =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300';

export const BANNER_INFO =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pb-accent/8 border border-pb-accent/25 text-pb-accent dark:bg-pb-accent-dark/12 dark:border-pb-accent-dark/30 dark:text-pb-accent-dark';

export const BANNER_WARN =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300';
