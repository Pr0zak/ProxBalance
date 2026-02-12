# Performance Trend-Based Migration Refactoring Plan

## Problem Statement

ProxBalance currently makes migration decisions based primarily on **point-in-time snapshots** with some 24h/7d averages. While the scoring system includes trend/spike penalties, the core decision-making is still snapshot-driven. Key issues:

1. **Metrics history is volatile** — `cluster_cache.json` overwrites on every collector run; only RRD summaries are persisted per-guest (168 samples max), and node-level time-series only lives in `score_history.json` (720 entries, only captures score/cpu/mem — no IOWait, no per-guest detail)
2. **Trend analysis is shallow** — simple linear regression on sparse data, "rising/falling/stable" labels from comparing first/last 20% of week data
3. **Settings are overwhelming** — 46 penalty config keys, though the UI only exposes ~15. The relationship between settings and migration behavior is opaque
4. **UI doesn't explain decisions** — recommendation cards show structured reasons, but don't show the historical data that drove the decision or let users see performance trends *in the context of* the migration recommendation

## Design Decisions

- **Metrics retention**: 90 days with tiered compression (~1500 entries/node)
- **Expert mode**: Hidden toggle at bottom of simplified settings, revealing full 46-value config
- **Trend evidence display**: Expandable section on recommendation cards (one-line summary visible, click to expand)
- **Scope**: All 6 phases implemented

---

## Phase 1: Persistent Performance Metrics Store

**Goal**: Create a dedicated time-series metrics store that accumulates node and guest performance data, never losing historical context.

### 1a. New Module: `proxbalance/metrics_store.py`

**Node Metrics Store** (`node_metrics_history.json`):
- Append-only with tiered compression:
  - **Recent** (0-48h): Full resolution — one sample per collector run
  - **Short-term** (2-14 days): Hourly aggregates (min/max/avg/p95 per metric)
  - **Long-term** (14-90 days): 6-hour aggregates
- **Per-node, per-sample**: cpu, memory, iowait, load_avg, guest_count, storage_usage_pct
- Auto-compresses on write (compact recent→hourly when >48h old, etc.)
- Atomic writes via temp file + rename

**Guest Metrics Store** (`guest_metrics_history.json`):
- Same tiered compression strategy
- **Per-guest, per-sample**: cpu, memory, disk_read_bps, disk_write_bps, net_in_bps, net_out_bps, node
- Tracks which host the guest was on (node field changes = implicit migration tracking)
- Same 90-day max retention

**Key functions:**
- `append_node_sample(node_name, metrics)` — Add a raw sample
- `append_guest_sample(vmid, metrics)` — Add a raw sample
- `get_node_history(node_name, hours=168)` → List of samples within lookback period
- `get_guest_history(vmid, hours=168)` → List of samples within lookback period
- `compress_old_samples()` — Run tiered compression pass
- `get_data_quality(node_name)` → Dict with total_samples, oldest_sample_age, coverage info

### 1b. Collector Integration

Modify `collector_api.py`:
- After each collection, call `metrics_store.append_node_sample()` for each online node
- Call `metrics_store.append_guest_sample()` for each running guest
- Call `compress_old_samples()` once per collection run

### 1c. Constants

Add to `proxbalance/constants.py`:
- `NODE_METRICS_FILE = os.path.join(BASE_PATH, 'node_metrics_history.json')`
- `GUEST_METRICS_FILE = os.path.join(BASE_PATH, 'guest_metrics_history.json')`
- `METRICS_RETENTION_DAYS = 90`
- `METRICS_RECENT_HOURS = 48`
- `METRICS_SHORT_TERM_DAYS = 14`

**Files created:** `proxbalance/metrics_store.py`
**Files modified:** `collector_api.py`, `proxbalance/constants.py`

---

## Phase 2: Trend Analysis Engine

**Goal**: Replace simple "rising/falling/stable" labels with meaningful statistical trend analysis.

### 2a. New Module: `proxbalance/trend_analysis.py`

**`analyze_node_trends(node_name, lookback_hours=168)`** → Returns:
- **Trend direction** per metric (cpu/mem/iowait): `sustained_increase`, `sustained_decrease`, `stable`, `volatile`, `cyclical`
- **Trend magnitude**: rate of change per day (e.g., +2.3% CPU/day)
- **Trend confidence**: based on R², number of data points, consistency
- **Baseline**: what's "normal" for this node at this time of day/week (from seasonal patterns)
- **Anomaly detection**: current load vs baseline (sigma deviation)
- **Projected threshold crossing**: hours until this node exceeds thresholds if trend continues
- **Stability score** (0-100): how predictable is this node? (based on coefficient of variation)

**`analyze_guest_trends(vmid, lookback_hours=168)`** → Returns:
- Same per-metric analysis as nodes
- **Resource growth rate**: is this guest consuming more over time?
- **Migration impact history**: how did this guest perform before/after previous migrations?

**`compare_node_stability(node_a, node_b)`** → Which node is more stable/predictable?

### 2b. Scoring Integration

Modify `proxbalance/scoring.py`:
- In `calculate_target_node_score()`: use quantified trend magnitude instead of boolean trend checks
  - A node trending up by 5%/day gets much more penalty than one at 0.5%/day
- Add stability bonus: nodes with low volatility get reduced penalties
- Factor baseline deviation: penalize nodes above their own historical normal, not just above static thresholds
- New trend-aware penalty calculation replaces flat `cpu_trend_rising_penalty` / `mem_trend_rising_penalty`

**Files created:** `proxbalance/trend_analysis.py`
**Files modified:** `proxbalance/scoring.py`

---

## Phase 3: Simplified Settings

**Goal**: Reduce 46 penalty config keys to 5 user-facing settings with an expert toggle.

### 3a. New Settings Model

Five user-facing settings:

1. **Migration Sensitivity** (slider: Conservative ↔ Balanced ↔ Aggressive)
   - Conservative: Only migrate for sustained, clear problems. Prefers stability.
   - Balanced: Migrate when trends show growing problems. Default.
   - Aggressive: Migrate proactively to maintain optimal balance.
   - Internally maps to: min_score_improvement, trend weight multiplier, threshold margins

2. **Trend Weight** (slider: 0-100%, default 60%)
   - How much historical trends matter vs current snapshot
   - 0% = pure snapshot (legacy behavior), 100% = pure trend-based
   - Internally maps to: weight_current / weight_24h / weight_7d ratios

3. **Analysis Lookback** (dropdown: 1 day / 3 days / 7 days / 14 days / 30 days — default 7 days)
   - How much history to consider when analyzing trends

4. **Minimum Confidence** (slider: 50-95%, default 75%)
   - How confident the system must be before recommending a migration

5. **Protect Running Workloads** (toggle, default ON)
   - When ON: avoids migrating guests during their detected peak usage periods

### 3b. New Module: `proxbalance/settings_mapper.py`

- `map_simplified_to_penalty_config(settings)` → Converts 5 settings into full 46-value penalty config
- `detect_legacy_config(config)` → Returns True if old-style penalty_scoring keys exist
- `migrate_legacy_config(config)` → Auto-maps old config to new simplified settings (best-fit)
- `get_effective_penalty_config(config)` → Returns the resolved penalty config (from simplified or expert)

### 3c. API Changes

New endpoint in `proxbalance/routes/config.py` or new route file:
- `GET /api/migration-settings` → Returns simplified settings + effective penalty config
- `PUT /api/migration-settings` → Saves simplified settings, auto-maps to internal config
- Existing `GET/PUT /api/penalty-config` remains for backward compatibility + expert mode

### 3d. Config Migration

On first load after update:
- If `config.json` has old-style `penalty_scoring` but no `migration_settings`, auto-create `migration_settings` from best-fit mapping
- Preserve old values as expert overrides

**Files created:** `proxbalance/settings_mapper.py`
**Files modified:** `proxbalance/routes/penalty.py` (or `config.py`), `proxbalance/config_manager.py`

---

## Phase 4: Trend-Aware Recommendation Engine

**Goal**: Make the recommendation engine fundamentally trend-driven.

### 4a. Modify Recommendation Flow in `proxbalance/recommendations.py`

**New overload detection** (replaces pure threshold checks):
- `overloaded`: sustained trend above threshold AND current value confirms
- `trending_toward_overload`: projection shows threshold crossing within lookback period
- `stable_but_hot`: consistently high but not trending worse
- Each state → different urgency: high / medium / low

**New guest selection** (in `select_guests_to_migrate()`):
- Prefer migrating guests whose resource usage is *growing* on the source node
- Deprioritize guests that are *stable* (not contributing to the upward trend)
- Factor behavioral profile (bursty guests may self-resolve)

**New target selection**:
- Prefer targets with stable, predictable performance (high stability score)
- Prefer targets where trends show flat or decreasing usage
- Avoid targets trending up, even if they currently have headroom
- Use projected state at lookback horizon, not just current

### 4b. Decision Evidence Package

Each recommendation includes a new `trend_evidence` object:
```json
{
  "source_node_trend": {
    "cpu_trend": "+3.2%/day",
    "mem_trend": "+1.1%/day",
    "stability_score": 35,
    "above_baseline": true,
    "baseline_deviation_sigma": 2.4
  },
  "target_node_trend": {
    "cpu_trend": "-0.5%/day",
    "mem_trend": "+0.2%/day",
    "stability_score": 82,
    "above_baseline": false
  },
  "guest_trend": {
    "cpu_growth_rate": "+1.5%/day",
    "behavior": "growing",
    "peak_hours": [9, 10, 11, 14, 15],
    "previous_migrations": 2,
    "last_outcome": "improved"
  },
  "decision_factors": [
    {"factor": "Source node CPU trending up +3.2%/day for 7 days", "weight": "high", "type": "problem"},
    {"factor": "Guest CPU growing +1.5%/day, contributing to source overload", "weight": "high", "type": "problem"},
    {"factor": "Target node stable (score 82/100), trending slightly down", "weight": "high", "type": "positive"},
    {"factor": "Guest migrated successfully 2 times before", "weight": "medium", "type": "positive"}
  ],
  "data_quality": {
    "node_history_days": 14,
    "guest_history_days": 7,
    "confidence_note": "High data availability"
  }
}
```

### 4c. Decision Explanation

Add `decision_explanation` field — a human-readable 1-2 sentence summary:
> "Source node 'pve1' CPU has been rising +3.2%/day over the last 7 days and is now at 72%. VM 'web-server' (growing +1.5%/day) is a key contributor. Target node 'pve3' is stable at 28% CPU with strong headroom."

**Files modified:** `proxbalance/recommendations.py`, `proxbalance/recommendation_analysis.py`

---

## Phase 5: UI Updates

**Goal**: Show users what drives migration decisions with simple, progressive disclosure.

### 5a. Recommendation Card Enhancement

Modify `src/components/dashboard/recommendations/RecommendationCard.jsx`:

**Always visible (on card):**
- Source → Target with small trend arrows (↑↗→↘↓) next to node names
- One-line decision explanation (from `decision_explanation`)
- Confidence badge (existing)

**Expandable "Why This Migration?" section (collapsed by default):**
- Mini trend sparklines: source vs target CPU/memory over lookback period
- Decision factors list with high/medium/low weight badges
- Guest behavior summary (growing, bursty, stable + previous migration outcomes)
- Data quality note: "Based on 14 days of node history"

### 5b. Node Status Card Enhancement

Modify `src/components/dashboard/NodeStatusSection.jsx`:
- Add trend arrows next to CPU/Memory/IOWait values (↑ orange, → gray, ↓ green, ↑↑ red)
- Tooltip on trend arrow: "CPU: +2.1%/day over 7 days, projected to reach 80% in 5 days"
- Stability score badge (small pill: "Stable" / "Volatile" / "Trending")

### 5c. Enhanced Insights Drawer Tab

Replace/enhance Patterns tab in `src/components/dashboard/recommendations/insights/`:
- **Trends Tab**: Per-node trend summary, cluster trend direction, data quality overview, top movers
- Show which nodes are improving/degrading over time

### 5d. Simplified Settings UI

Rewrite `src/components/automation/PenaltyScoringSection.jsx`:

**Main panel (always visible):**
- Migration Sensitivity slider (labeled: Conservative / Balanced / Aggressive)
- Trend Weight slider (with brief tooltip explanation)
- Analysis Lookback dropdown
- Clear explanation text under each control

**"Advanced" expandable section:**
- Minimum Confidence slider
- Protect Running Workloads toggle

**"Expert Mode" toggle at bottom (collapsed by default):**
- Reveals full 46-value penalty config as before
- Warning text: "These values are automatically managed by the settings above. Manual changes override automatic mapping."

### 5e. New API Endpoints for UI

- `GET /api/trends/nodes` → All node trends summary (for insights drawer)
- `GET /api/trends/node/<name>` → Single node trend detail (for tooltip popups)
- `GET /api/trends/guest/<vmid>` → Guest trend detail (for recommendation cards)

**Files modified:** `RecommendationCard.jsx`, `NodeStatusSection.jsx`, `PenaltyScoringSection.jsx`, insights drawer components, `src/api/client.js`
**Files created:** New route file or extend existing routes for `/api/trends/*`

---

## Phase 6: Migration Outcome Feedback Loop

**Goal**: Use historical outcomes to improve future recommendation confidence.

### 6a. Enhanced Outcome Tracking

Modify `proxbalance/outcomes.py`:
- Track post-migration metrics at 1-hour and 24-hour marks (in addition to 5-minute)
- Store the `trend_evidence` that was used when the migration was recommended
- Increase `MAX_OUTCOME_ENTRIES` to 500
- Add `calculate_outcome_accuracy()` that compares predicted improvement vs actual at 1h/24h

### 6b. Outcome-Informed Confidence

Modify `proxbalance/recommendation_analysis.py`:
- In `calculate_confidence()`: add new factor (10-15% weight) for historical outcome data
- Look up: has this guest been migrated before? What were the outcomes?
- Boost confidence if past migrations succeeded; reduce if they failed
- Add to `trend_evidence.guest_trend`: `previous_migrations`, `success_rate`, `last_outcome`

### 6c. UI: Outcome Badge on Cards

On recommendation cards, if the guest has migration history:
- Small badge: "Migrated 3x, 2 successful" with color coding
- In expanded section: brief outcome history timeline

**Files modified:** `proxbalance/outcomes.py`, `proxbalance/recommendation_analysis.py`, `RecommendationCard.jsx`

---

## Implementation Order & Dependencies

```
Phase 1 (Metrics Store)
    ↓
Phase 2 (Trend Analysis) ← depends on Phase 1 data
    ↓
Phase 3 (Simplified Settings) ← independent, can parallel with Phase 2
    ↓
Phase 4 (Trend-Aware Recommendations) ← depends on Phase 2
    ↓
Phase 5 (UI Updates) ← depends on Phases 3 & 4
    ↓
Phase 6 (Outcome Feedback) ← depends on Phase 4
```

## File Summary

| Action | File |
|--------|------|
| **Create** | `proxbalance/metrics_store.py` |
| **Create** | `proxbalance/trend_analysis.py` |
| **Create** | `proxbalance/settings_mapper.py` |
| **Modify** | `proxbalance/constants.py` — new file paths and retention constants |
| **Modify** | `collector_api.py` — append to metrics store after collection |
| **Modify** | `proxbalance/scoring.py` — trend-magnitude penalties, stability bonus |
| **Modify** | `proxbalance/recommendations.py` — trend-aware overload detection, guest/target selection |
| **Modify** | `proxbalance/recommendation_analysis.py` — outcome-informed confidence |
| **Modify** | `proxbalance/outcomes.py` — multi-window tracking, increased retention |
| **Modify** | `proxbalance/routes/penalty.py` — new migration-settings endpoints |
| **Modify** | `proxbalance/config_manager.py` — migration settings support |
| **Modify** | `src/components/dashboard/recommendations/RecommendationCard.jsx` — trend evidence section |
| **Modify** | `src/components/dashboard/NodeStatusSection.jsx` — trend arrows, tooltips |
| **Modify** | `src/components/automation/PenaltyScoringSection.jsx` — simplified settings UI |
| **Modify** | `src/components/dashboard/recommendations/insights/*` — enhanced trends tab |
| **Modify** | `src/api/client.js` — new API calls for trends and migration-settings |
| **Create** | New route for `/api/trends/*` endpoints (or add to existing routes) |
