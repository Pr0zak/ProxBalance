# Mobile-Friendly Redesign Plan

## Executive Summary

The ProxBalance web interface is currently desktop-optimized with minimal responsive design. Analysis reveals **zero** `sm:` breakpoint usage, only ~13 `md:` occurrences, and **30+** bare multi-column grid layouts without mobile fallbacks. Tables, the header, footer, modals, and the cluster map all assume wide viewports.

This plan defines a 6-phase implementation to make the interface fully usable on mobile devices (375px+) while preserving the existing desktop experience.

---

## Current State Assessment

### What Works
- Viewport meta tag is present and correct
- Tailwind CSS CDN includes all responsive breakpoints (just not used)
- Dark mode is fully implemented (1,558 dark-mode classes)
- Modals have `max-h-[90vh] overflow-y-auto` for vertical scrolling
- Tables have `overflow-x-auto` as a basic horizontal scroll fallback
- Some grids already use `md:` responsive variants (cluster summary cards, node grid)

### What's Broken on Mobile

| Issue | Severity | Count | Files Affected |
|-------|----------|-------|----------------|
| Bare `grid-cols-2` (no responsive fallback) | High | 19+ | All component files |
| Bare `grid-cols-3` (no responsive fallback) | Critical | 6+ | Settings, Automation, Dashboard |
| Bare `grid-cols-4` (no responsive fallback) | High | 3+ | Automation |
| Header bar overflows (logo + stats + buttons) | Critical | 1 | DashboardPage.jsx |
| Fixed footer overflows on narrow screens | High | 1 | index.jsx |
| Tables too wide (7-8 columns) | High | 3 | Dashboard, Automation |
| Fixed-size node cards (`w-32 h-40`) | Medium | 1 | DashboardPage.jsx |
| Modals exceeding viewport (`max-w-4xl`) | Medium | ~15 | All component files |
| No mobile navigation pattern | Medium | 1 | index.jsx |
| No touch-optimized targets | Low | Global | All interactive elements |

### Files in Scope

| File | Lines | Role |
|------|-------|------|
| `src/index.jsx` | ~658 | Root component, hook composition, page routing |
| `src/components/DashboardPage.jsx` | ~416 | Dashboard wrapper (delegates to 13 sub-components in `dashboard/`) |
| `src/components/AutomationPage.jsx` | ~223 | Automation wrapper (delegates to 6 sub-components in `automation/`) |
| `src/components/SettingsPage.jsx` | ~213 | Settings wrapper (delegates to 5 sub-components in `settings/`) |
| `src/hooks/` | 11 files | Custom React hooks (state management) |
| `index.html` | ~100 | SPA shell (Tailwind CDN config) |

> **Note**: `src/app.jsx` was deleted during the modular refactoring. All UI is now in the componentized files above.

---

## Foundational Decisions

### Tailwind CDN Is Sufficient

The current Tailwind CDN config (`darkMode: 'class'`) already includes all responsive breakpoints (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`). No config changes are needed -- the breakpoint utilities simply need to be used in the class strings.

### `useIsMobile()` Hook

A custom React hook is needed for cases where CSS-only responsive design is insufficient (conditional component rendering, dynamic sizing props). This hook uses `window.matchMedia` and is React 17 compatible.

```jsx
// src/utils/useIsMobile.js
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(
    window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
};
```

**Used in**: Table card-view rendering, cluster map card sizing, mobile navigation state.

### Componentized Architecture

The frontend was fully componentized during the modular refactoring. `src/app.jsx` has been deleted. All UI lives in the page wrapper components (`DashboardPage.jsx`, `SettingsPage.jsx`, `AutomationPage.jsx`) which delegate to 24 sub-components. State is managed by 11 custom hooks in `src/hooks/`. Changes only need to be applied to the relevant component file.

---

## Phase 1: Footer, Modal Safety, and Quick Wins

**Complexity**: Small
**Risk**: Zero impact on desktop layout
**Goal**: Fix elements that are literally broken on small screens

### 1A. Fixed Footer Overflow Fix

**File**: `src/index.jsx`

The footer is `fixed bottom-0` with a single-row flex layout containing timestamps, branch info, commit hash, and update status. On mobile, this overflows.

**Changes**:
- Add `flex-wrap` to the inner flex container
- Hide non-essential items on small screens: add `hidden sm:inline` on branch/commit info
- Reduce gap: `gap-4` -> `gap-2 sm:gap-4`
- Add `gap-y-1` for wrapped lines

### 1B. Modal Max-Width Safety

**Files**: All component files

Ensure every modal overlay container has `p-4` padding so modal content never touches screen edges. Most already do -- audit and fix any that don't.

**Additional changes**:
- Modal internal `p-6` -> `p-4 sm:p-6` for tighter mobile spacing
- Evacuation modal (`max-w-4xl`): verify it stays within viewport on 375px screens

**Estimated scope**: ~20 class modifications across 3-4 files.

---

## Phase 2: Header and Navigation

**Complexity**: Medium
**Risk**: Low -- adds new elements, minimal changes to existing
**Goal**: Make navigation discoverable and header usable on mobile

### 2A. Dashboard Header Responsive Layout

**File**: `src/components/DashboardPage.jsx` ~lines 123-202

Current: logo + title + stats + buttons all on one `flex` row.

**Changes**:
- Wrap header: `flex items-center justify-between` -> `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
- Logo size: 64px -> 40px on mobile (via `useIsMobile` hook or responsive class)
- Title: `text-3xl` -> `text-2xl sm:text-3xl`
- Inline cluster stats: add `flex-wrap` and `gap-2 sm:gap-4`
- Button group: naturally wraps to new line when header stacks

### 2B. Mobile Bottom Navigation Bar

**File**: `src/index.jsx`

Currently, navigation relies on page-specific buttons (Settings gear icon, Automation link, back arrows). This is not discoverable on mobile.

**Implementation**:
- Create a fixed-bottom tab bar with 3 tabs: Dashboard, Settings, Automation
- Only visible on mobile: `fixed bottom-0 left-0 right-0 sm:hidden`
- Add `pb-14 sm:pb-0` to page content to account for tab bar height
- Hide the fixed footer on mobile (`hidden sm:block`) since it conflicts with the tab bar
- Standard icons for each tab (grid/cog/clock)

### 2C. Settings & Automation Page Headers

**Files**: `SettingsPage.jsx` ~line 57, `AutomationPage.jsx` ~line 64

**Changes**:
- Title: `text-3xl` -> `text-xl sm:text-3xl`
- Keep back buttons (still useful on mobile even with tab bar)

---

## Phase 3: Grid Responsiveness

**Complexity**: Medium
**Risk**: Very low -- purely additive (prepending `sm:` or `md:` prefixes)
**Goal**: Make all grid layouts collapse to fewer columns on small screens

This is the highest-volume phase -- mechanical find-and-replace of Tailwind grid classes.

### 3A. Bare `grid-cols-2` -> Responsive

**~20 instances** across all files need the treatment:

| Current | Change To | Where |
|---------|-----------|-------|
| `grid grid-cols-2 gap-X` | `grid grid-cols-1 sm:grid-cols-2 gap-X` | Data display grids, settings forms, notification configs |

**Applies to**: SettingsPage notification provider grids (lines 610, 634, 710, 734, 758, 816), AutomationPage config fields, DashboardPage modal info grids.

**Exception**: Small inline grids where two items (label + value) always fit on 320px screens can remain `grid-cols-2`.

### 3B. Bare `grid-cols-3` -> Responsive

| Current | Change To | Where |
|---------|-----------|-------|
| `grid grid-cols-3 gap-X` | `grid grid-cols-1 sm:grid-cols-3 gap-X` | Preset cards, notification events, AI model grid |

**Key locations**:
- AutomationPage.jsx line 350: Preset selector cards
- SettingsPage.jsx line 567: Notification event checkboxes
- AutomationPage.jsx line 1283: Distribution balancing settings

### 3C. Bare `grid-cols-4` -> Responsive

| Current | Change To | Where |
|---------|-----------|-------|
| `grid grid-cols-4 gap-X` | `grid grid-cols-2 sm:grid-cols-4 gap-X` | Day-of-week selectors, time windows |

**Key locations**:
- AutomationPage.jsx lines 1738, 2033: Day checkbox grids

### 3D. `grid-cols-3 md:grid-cols-5` -> Add `sm:` step

| Current | Change To | Where |
|---------|-----------|-------|
| `grid-cols-3 md:grid-cols-5` | `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` | Node status quick-view |

**Estimated scope**: ~40 class string modifications across all files.

---

## Phase 4: Tables and Data-Dense Components

**Complexity**: Large
**Risk**: Medium -- introduces conditional rendering
**Goal**: Make tables usable on mobile with card-based layouts
**Prerequisite**: `useIsMobile()` hook (Phase 4A)

### 4A. Create `useIsMobile` Hook

**New file**: `src/utils/useIsMobile.js` (~20 lines)

Export for use in all component files.

### 4B. Guest Listing Table (7 columns)

**File**: `DashboardPage.jsx` ~lines 1587-1800

Columns: Type Icon, VMID, Name, Node, CPU/Memory, Status, Actions

**Mobile strategy**: Conditionally render stacked cards instead of table rows.

```
Card layout per guest:
+----------------------------------+
| [VM icon] Guest Name             |
| ID: 100 | Node: pve1 | running  |
| Tags: [tag1] [tag2]             |
| [Migrate] [Manage Tags]         |
+----------------------------------+
```

**Implementation**:
- Wrap existing `<table>` in `{!isMobile && (...)}`
- Add `{isMobile && (...)}` card view with the same data
- Keep search/filter bar and pagination unchanged

### 4C. Migration History Table (7 columns)

**File**: `AutomationPage.jsx` ~lines 2311-2450

Columns: Time, VM, Migration path, Score, Reason, Status, Duration

**Mobile card layout**:
```
+----------------------------------+
| [Status] VM Name (ID: 100)      |
| pve1 -> pve2 | 2m 15s           |
| Score: 85 | CPU overload         |
| Jan 15, 2025 2:30 PM            |
+----------------------------------+
```

Read-only data, simpler than the guest table.

### 4D. Evacuation Plan Table (8 columns)

**File**: `DashboardPage.jsx` ~lines 3163-3220

Columns: VM/CT, Name, Type, Storage, Status, Target, Will Restart?, Action

**Mobile card layout** with interactive elements (target dropdown, skip toggle).

### Fallback Note

All tables already have `overflow-x-auto` wrappers. This provides a functional (if not ideal) mobile experience even before card views are implemented. Phase 4 can be deferred without catastrophic UX failure.

---

## Phase 5: Cluster Map and Node Cards

**Complexity**: Medium
**Risk**: Low-medium -- modifies visual sizing
**Goal**: Make the cluster visualization readable on mobile

### 5A. Responsive Node Cards

**File**: `DashboardPage.jsx` ~line 2082

Current: Fixed `w-32 h-40` (128px x 160px).

**Changes**:
- Card size: `w-32 h-40` -> `w-24 h-32 sm:w-32 sm:h-40`
- At 96px x 128px, three cards fit on a 375px screen with gaps
- Inner padding: `p-2` -> `p-1.5 sm:p-2`
- Server icon: Use responsive Tailwind sizing (`w-5 h-5 sm:w-7 sm:h-7`) instead of fixed `size` prop

### 5B. Cluster Map View Mode Buttons

**File**: `DashboardPage.jsx` ~lines 1980-2033

Row of 5 buttons (CPU/Memory/Allocated/Disk I/O/Network) that overflow on mobile.

**Changes**:
- Add `flex-wrap` to button container
- Reduce padding: `px-3 py-1` -> `px-2 py-1 sm:px-3`

### 5C. Cluster Map Container

**File**: `DashboardPage.jsx` ~line 2038

- `minHeight: '400px'` -> `minHeight: '300px'` on mobile (via `useIsMobile` or inline style)
- Reduce gap: `gap-8` -> `gap-4 sm:gap-8`

---

## Phase 6: Touch Targets and Polish

**Complexity**: Small
**Risk**: Very low
**Goal**: Final refinements for a native-feeling mobile experience

### 6A. Minimum Touch Target Sizes

Apple HIG recommends 44x44px touch targets. Currently, icon buttons use `p-2` (~36px total).

**Changes**:
- Icon buttons (Dark mode, Settings, GitHub): `p-2` -> `p-2.5 sm:p-2` or add `min-h-[44px] min-w-[44px]` on mobile
- Low priority -- functional as-is, just slightly undersized

### 6B. Typography Adjustments

No major changes needed. Tailwind's default scale works well across viewports. Minor tweaks:
- Section headers that use `text-xl` or `text-lg` are fine
- Stats `text-2xl font-bold` are fine
- Table text `text-sm` / `text-xs` are readable on mobile

### 6C. Spacing Polish

- Page containers `p-4`: appropriate for mobile
- `max-w-7xl mx-auto` / `max-w-5xl mx-auto`: constrains on desktop, fills on mobile
- Cluster map `gap-8` -> `gap-4 sm:gap-8`

---

## Implementation Order and Dependencies

```
Phase 1 (Footer + Modals) ──────────────────> can deploy independently
Phase 2 (Header + Navigation) ──────────────> can deploy independently
Phase 3 (Grid Responsiveness) ──────────────> can deploy independently
Phase 4A (useIsMobile hook) ────┐
Phase 4B-D (Table card views) ──┘───────────> depends on 4A
Phase 5 (Cluster Map) ─────────────────────> partially depends on 4A
Phase 6 (Polish) ──────────────────────────> deploy last
```

Phases 1, 2, and 3 are fully independent and could be done in any order or in parallel. Phase 4 requires the `useIsMobile` hook. Phase 5 partially depends on the hook. Phase 6 is final polish.

---

## Changes by File Summary

| File | Phases | Estimated Edits | Complexity |
|------|--------|----------------|------------|
| `src/components/DashboardPage.jsx` + `dashboard/` | 1,2,3,4,5 | ~50 class edits + card view | High |
| `src/index.jsx` | 1,2 | Footer fix + mobile nav bar | Medium |
| `src/components/AutomationPage.jsx` | 3,4 | ~15 class edits + card view | Medium |
| `src/components/SettingsPage.jsx` | 2,3 | ~12 class edits | Low |
| `src/utils/useIsMobile.js` (new) | 4 | New file, ~20 lines | Low |
| `index.html` | -- | No changes needed | None |

---

## Testing Strategy

### Viewports to Test
- **iPhone SE**: 375px (smallest common phone)
- **iPhone 12/13/14**: 390px (most common phone)
- **iPad Mini**: 768px (tablet, `md:` breakpoint boundary)
- **iPad**: 1024px (`lg:` breakpoint boundary)
- All in both portrait and landscape orientation

### Testing Method
- Chrome DevTools responsive mode (primary)
- Actual device testing for touch target validation
- Run `./build.sh` after each phase to rebundle with esbuild

### Acceptance Criteria per Phase
1. **Phase 1**: Footer doesn't overflow on 375px. Modals have margin from screen edges.
2. **Phase 2**: Header stacks cleanly. Tab bar appears on mobile. Page navigation works.
3. **Phase 3**: No horizontal overflow from grids on 375px. All grids collapse to 1-2 columns.
4. **Phase 4**: Tables render as readable cards on mobile. All data accessible without horizontal scroll.
5. **Phase 5**: Cluster map cards fit on screen. View mode buttons don't overflow.
6. **Phase 6**: Buttons are easy to tap. Spacing feels comfortable on touch devices.
