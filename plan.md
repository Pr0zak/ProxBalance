# Plan: Simplify Migration Recommendations UI

## Problem
The Migration Recommendations section is a 1631-line component with 16 subsections stacked vertically. Many analytical/secondary sections create visual noise and distract from the primary workflow: reviewing and executing migrations.

## Solution: Two-Zone Layout with Insights Drawer

### Zone 1 — Main Flow (Always Visible)
These stay in the primary view, in this order:

1. **Section Header** — Title, AI Enhanced badge, generation time, Export, **new "Insights" button**, Generate Now, threshold suggestion chip
2. **Recommendation Summary Digest** — Cluster health score, urgency, recommendation count, improvement delta (always visible, compact)
3. **Capacity Planning Advisories** — Severity-colored warnings (conditional, only when present)
4. **Migration Conflicts Detected** — Orange warning cards (conditional, only when present)
5. **Trend Forecasts** — Proactive threshold warnings (collapsed by default)
6. **Filter & Sort Controls** — Dropdowns (collapsed by default)
7. **Main Recommendations List** — The actual migration cards with migrate buttons
8. **Skipped Guests** — Collapsed at the bottom

### Zone 2 — Insights Drawer (Slide-Over Panel)
Triggered by an "Insights" button in the header. Right-anchored slide-over panel with internal tabs. Zero visual footprint when closed.

**4 Tabs:**
- **Impact** — Batch Migration Impact + Execution Plan + Recommendation Change Log
- **Diagnostics** — Engine Diagnostics + Penalty-Based Scoring Explainer
- **Patterns** — Workload Patterns + Migration Outcomes
- **History** — Recommendation History Timeline

### Threshold Suggestions
Converted from a full-width banner to a compact inline chip next to the "Generate Now" button with a click-to-expand popover showing current vs suggested values and "Apply All" button.

## Implementation Phases

### Phase 1: Extract Sub-Components (no visual change)
Create `src/components/dashboard/recommendations/` directory and extract:
1. `RecommendationCard.jsx` — Single recommendation card (extracted from the .map() body)
2. `RecommendationFilters.jsx` — Filter & sort controls
3. `SkippedGuests.jsx` — Skipped guests list
4. `RecommendationSummaryBar.jsx` — Summary digest
5. `AlertsBanner.jsx` — Capacity advisories + conflicts + trend forecasts combined

Verify no visual regression via `./build.sh`.

### Phase 2: Extract Insight Components
Create `src/components/dashboard/recommendations/insights/` and extract:
6. `ScoringExplainer.jsx` — Penalty scoring info
7. `EngineDiagnostics.jsx` — Diagnostics panel
8. `WorkloadPatterns.jsx` — Patterns panel (with lazy-load state)
9. `BatchImpact.jsx` — Batch impact assessment
10. `ChangeLog.jsx` — Recommendation changes
11. `ExecutionPlan.jsx` — Execution ordering
12. `MigrationOutcomes.jsx` — Outcomes tracking (with lazy-load state)
13. `RecommendationHistory.jsx` — History timeline (with lazy-load state)

### Phase 3: Build the Insights Drawer
14. Create `InsightsDrawer.jsx` — Right-anchored slide-over panel following existing modal patterns (fixed positioning, backdrop, z-index, overflow-y-auto)
15. Internal tab navigation (Impact / Diagnostics / Patterns / History)
16. Wire up lazy-loading: workload patterns, outcomes, and history fetch on tab activation
17. Add `showInsights` state + "Insights" button to section header
18. Remove the 8 inline subsections from main flow, render via drawer instead

### Phase 4: Threshold Suggestions Inline Chip
19. Convert full-width threshold suggestions banner to compact chip/badge near "Generate Now" button
20. Click opens small popover with current vs suggested values + "Apply All" action

### Phase 5: Polish
21. Dark mode styling on all new components
22. Mobile responsiveness — drawer becomes full-width overlay on mobile (useIsMobile)
23. Add drawer state to useUIState.js (localStorage persistence)
24. Build verification via `./build.sh`

## File Changes Summary

### New Files (~13)
```
src/components/dashboard/recommendations/
  RecommendationCard.jsx
  RecommendationFilters.jsx
  SkippedGuests.jsx
  RecommendationSummaryBar.jsx
  AlertsBanner.jsx
  InsightsDrawer.jsx
  insights/
    ScoringExplainer.jsx
    EngineDiagnostics.jsx
    WorkloadPatterns.jsx
    BatchImpact.jsx
    ChangeLog.jsx
    ExecutionPlan.jsx
    MigrationOutcomes.jsx
    RecommendationHistory.jsx
```

### Modified Files (~2)
```
src/components/dashboard/MigrationRecommendationsSection.jsx  (1631 → ~450 lines)
src/hooks/useUIState.js  (add insightsDrawer state)
```

## Result
- The main view shows **only** the summary, warnings, and recommendation cards
- 8 analytical sections move into a tabbed Insights drawer
- Threshold suggestions become a compact inline chip
- All functionality preserved, dramatically less visual noise
- Familiar pattern (matches existing modal/drawer UI in the codebase)
