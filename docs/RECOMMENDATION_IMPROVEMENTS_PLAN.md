# Migration Recommendation & Scoring Improvements Plan

> **Historical planning document.** It records a plan made before the features were built and is not kept up to date. For current behaviour see the [feature docs](README.md).

> **Note**: This plan references JSON file storage (`score_history.json`, `migration_history.json`, etc.). All of these have been migrated to SQLite (`proxbalance.db`). The features and logic described here remain accurate; only the storage backend has changed.

This document proposes improvements to ProxBalance's recommendation engine, scoring algorithm, and UI to make the system more transparent, intuitive, and user-friendly for Proxmox administrators.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Problem Areas](#problem-areas)
3. [Proposed Improvements](#proposed-improvements)
   - [A. Scoring Transparency](#a-scoring-transparency)
   - [B. Recommendation Quality](#b-recommendation-quality)
   - [C. UI/UX Improvements](#c-uiux-improvements)
   - [D. Configuration Experience](#d-configuration-experience)
   - [E. Feedback & Learning](#e-feedback--learning)
4. [Implementation Priority](#implementation-priority)
5. [Alternative Approaches Considered](#alternative-approaches-considered)
6. [Implementation Status](#implementation-status)
7. [Next-Phase Improvements](#next-phase-improvements)
   - [F. Predictive Analysis & Trend Forecasting](#f-predictive-analysis--trend-forecasting)
   - [G. Multi-Migration Optimization](#g-multi-migration-optimization)
   - [H. Risk Assessment & Migration Safety](#h-risk-assessment--migration-safety)
   - [I. Observability & Diagnostics](#i-observability--diagnostics)
   - [J. API & Integration Enhancements](#j-api--integration-enhancements)
8. [Next-Phase Implementation Priority](#next-phase-implementation-priority)
9. [Technical Architecture Notes](#technical-architecture-notes)
   - [Feature Dependency Graph](#feature-dependency-graph)
   - [Frontend/Backend Parity Tracking](#frontendbackend-parity-tracking)
   - [Testing Strategy for New Features](#testing-strategy-for-new-features)
10. [Success Metrics](#success-metrics)

---

## Current State Analysis

### What Works Well
- The penalty-based scoring system is fundamentally sound — cumulative penalties with configurable weights provide flexibility without hard cutoffs.
- Three time-period weighting (current/24h/7d) gives stability against transient spikes.
- Storage compatibility and affinity/anti-affinity checks prevent unsafe migrations.
- The `min_score_improvement` threshold prevents marginal churn.

### What Users Struggle With
- The scoring system is a **black box** — users see a suitability percentage but can't trace how it was derived.
- Penalty weights are **unitless numbers** (e.g., `cpu_high_penalty: 20`) with no intuitive meaning.
- The relationship between **thresholds, penalties, and recommendations** is unclear.
- Users can't answer: *"Why was this migration recommended?"* or *"Why wasn't VM X recommended for migration?"*
- The confidence score formula (`improvement × 2, capped at 100`) is simplistic and doesn't map to actual confidence.
- There's no way to **simulate** config changes before applying them.

---

## Problem Areas

### P1: Score Opacity
Users see `Suitability: 72%` but have no idea what drove that number. The tooltip shows weight categories (CPU 30%, Memory 30%, etc.) but not the actual penalty breakdown for that specific node. There's no way to compare two nodes side-by-side to understand why one scored better.

### P2: Disconnected Metrics
The dashboard shows node metrics (CPU %, memory %, IOWait) and separately shows recommendation scores, but there's no visual connection between them. A user looking at a node running at 45% CPU can't understand why it received a penalty.

### P3: Penalty Config UX
The Settings page presents 30+ penalty values as raw number inputs with minimal context. Users don't know what `cpu_very_high_penalty: 50` means in practice. There are no visual aids showing how changing a value affects recommendations.

### P4: Confidence Score Misleading
`confidence_score = min(100, improvement × 2)` means a 50-point improvement gets 100% confidence, but a 15-point improvement (the minimum threshold) gets only 30%. This linear scaling doesn't reflect actual migration risk or likelihood of success.

### P5: No "Why Not?" Explanations
When a user expects a migration recommendation that doesn't appear, there's no way to understand why. Guests are silently skipped for many reasons (HA-managed, ignore tag, storage incompatibility, insufficient improvement) with no visibility.

### P6: AI Integration Unclear
Users can't tell when AI insights are adding value vs. restating what the penalty engine already determined. The relationship between penalty-based recommendations and AI recommendations is ambiguous.

---

## Proposed Improvements

### A. Scoring Transparency

#### A1. Score Breakdown Panel
Add an expandable "Score Breakdown" to each recommendation card showing exactly how the score was calculated.

**Current:** A single suitability percentage with a static tooltip.

**Proposed:** An expandable panel per recommendation showing:

```
Score Breakdown for VM 100 → lyra
─────────────────────────────────────────────
Source Node (orion)          Target Node (lyra)
  Current load:    +45        Current load:    +18
  Sustained load:  +20        Sustained load:  +5
  IOWait:          +10        IOWait:          +0
  Trend penalties: +15        Trend penalties: +0
  Post-migration:  N/A        Post-migration:  +12
                   ───                         ───
  Total penalty:   90         Total penalty:   35
  Suitability:     10%        Suitability:     65%
─────────────────────────────────────────────
  Score improvement: 55 points
  Min required:      15 points  ✓
```

**Implementation:** Add a `score_details` object to each recommendation in `recommendations.py` containing the individual penalty components from `calculate_target_node_score()`. The frontend renders this as a collapsible detail section.

**Files affected:**
- `proxbalance/scoring.py` — Return penalty breakdown from `calculate_target_node_score()`
- `proxbalance/recommendations.py` — Include breakdown in recommendation output
- `src/components/DashboardPage.jsx` — Render breakdown panel

#### A2. Node Score Comparison View
Add a view where users can select any guest and see scored suitability across all nodes as a horizontal bar chart.

**Concept:** Click any guest on the cluster map → slide-out panel showing:
- Current node score (highlighted)
- All other node scores as bars
- Disqualified nodes shown grayed with reason (offline, storage incompatible, anti-affinity conflict)

**Files affected:**
- `proxbalance/routes/recommendations.py` — New endpoint `GET /api/guest/{vmid}/migration-options`
- `src/components/DashboardPage.jsx` — Guest detail panel with bar chart

#### A3. Penalty Contribution Visualization
On the node cards in the cluster map, show a small stacked bar or ring chart breaking down the penalty sources (CPU / Memory / IOWait / Trends / Storage).

**Current:** Nodes show CPU and Memory bars separately. Penalty score is a single number.

**Proposed:** Add a small "health ring" to each node card with segments colored by penalty source. Hovering shows the breakdown. This creates a visual bridge between raw metrics and the scoring system.

**Files affected:**
- `src/components/DashboardPage.jsx` — Node card enhancement
- `proxbalance/routes/recommendations.py` — Extend `/api/node-scores` response with breakdown

---

### B. Recommendation Quality

#### B1. Structured Reason Strings
Replace the current reason strings with structured, multi-factor reasons.

**Current:** `"Balance CPU load (src: 78%, target: 42%)"`

**Proposed:**
```json
{
  "primary_reason": "cpu_overload",
  "primary_label": "High CPU on source node",
  "contributing_factors": [
    {"factor": "source_cpu", "value": 78, "weight": "high", "label": "Source CPU at 78%"},
    {"factor": "target_headroom", "value": 58, "weight": "medium", "label": "Target has 58% CPU headroom"},
    {"factor": "rising_trend", "value": true, "label": "Source CPU trending upward over 24h"}
  ],
  "summary": "VM 100 should move to lyra because orion has high CPU usage (78%) with an upward trend, while lyra has significant headroom (42% used)."
}
```

The frontend can render this as a readable sentence with highlighted metrics, or as a compact factor list depending on space.

**Files affected:**
- `proxbalance/recommendations.py` — Generate structured reasons
- `src/components/DashboardPage.jsx` — Render structured reasons

#### B2. Reworked Confidence Score
Replace the simplistic `improvement × 2` formula with a multi-factor confidence score.

**Proposed formula:**
```python
confidence = weighted_average(
    score_improvement_factor,   # 40% — How much the score improves
    target_headroom_factor,     # 25% — How much capacity the target has after migration
    historical_stability,       # 20% — Has this guest been stable on its current node historically
    migration_comjellyfinity,       # 15% — Guest size, storage comjellyfinity, bind mounts
)
```

Each factor maps to 0-100:
- **Score improvement**: 15pt → 30, 25pt → 50, 40pt → 75, 60pt+ → 100
- **Target headroom**: Maps remaining capacity after migration (more room = higher confidence)
- **Historical stability**: If the guest's current node was fine yesterday, maybe less urgent
- **Migration comjellyfinity**: Small VMs with simple storage = high confidence; large VMs with many disks = lower

This gives users a confidence score that actually reflects "how sure are we this migration is a good idea" rather than just "how big is the score delta."

**Files affected:**
- `proxbalance/scoring.py` — New `calculate_confidence()` function
- `proxbalance/recommendations.py` — Use new confidence calculation

#### B3. "Why Not?" Explanations
Add a new API endpoint and UI element showing guests that were evaluated but NOT recommended, with explanations.

**Proposed endpoint:** `GET /api/recommendations/skipped`

**Response:**
```json
{
  "skipped_guests": [
    {
      "vmid": 300,
      "name": "database-1",
      "reason": "insufficient_improvement",
      "detail": "Best target (vega) would improve score by only 7 points (minimum: 15)",
      "current_score": 62,
      "best_target_score": 55
    },
    {
      "vmid": 400,
      "name": "ha-web",
      "reason": "ha_managed",
      "detail": "Guest is HA-managed and cannot be manually migrated"
    },
    {
      "vmid": 500,
      "name": "gpu-vm",
      "reason": "storage_incompatible",
      "detail": "Requires storage 'local-lvm' which is not available on any other node"
    }
  ]
}
```

The UI shows this as a collapsible "Not Recommended" section below the recommendation list, helping users understand the full picture.

**Files affected:**
- `proxbalance/recommendations.py` — Collect skip reasons during generation
- `proxbalance/routes/recommendations.py` — New endpoint
- `src/components/DashboardPage.jsx` — Skipped guests section

#### B4. Predicted Impact Preview
Show what the cluster would look like after all recommended migrations are applied.

**Concept:** A "Preview" toggle that switches the cluster map to show predicted post-migration metrics. Nodes that would receive guests show their predicted CPU/memory. Nodes that would lose guests show their reduced load.

**Implementation:** `predict_post_migration_load()` already exists in `scoring.py`. Extend it to produce a full cluster snapshot and render it as an overlay on the cluster map.

**Files affected:**
- `proxbalance/routes/recommendations.py` — New endpoint `GET /api/recommendations/preview`
- `proxbalance/scoring.py` — Extend `predict_post_migration_load()` for full cluster prediction
- `src/components/DashboardPage.jsx` — Toggle overlay on cluster map

---

### C. UI/UX Improvements

#### C1. Recommendation Card Redesign
Restructure recommendation cards for scannability and clarity.

**Current layout:** Dense card with VMID, source/target, score, reason, command, and action button all in a flat layout with small text (10px in places).

**Proposed layout:**

```
┌─────────────────────────────────────────────────────┐
│  [VM icon] VM 100 — web-app-1          [Migrate ▶]  │
│                                                     │
│  orion  ────────────────────────▶  lyra              │
│  CPU: 78%                         CPU: 42%          │
│  Mem: 65%                         Mem: 51%          │
│                                                     │
│  ┌─ Score Improvement ─────────────────────────┐    │
│  │  ████████████████████░░░░░  +55 pts (Great)  │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  Reason: High CPU on orion (78%, trending up).       │
│          lyra has 58% CPU headroom.                 │
│                                                     │
│  Confidence: 82%  ●●●●●●●●○○                       │
│                                                     │
│  ▸ Score Breakdown    ▸ Migration Command            │
└─────────────────────────────────────────────────────┘
```

Key changes:
- **Larger, clearer source → target flow** with inline metrics
- **Visual progress bar** for score improvement instead of just a number
- **Human-readable reason** as a sentence, not a code string
- **Confidence as dots/bar** instead of a raw percentage
- **Collapsible details** (breakdown, command) to reduce initial density

**Files affected:**
- `src/components/DashboardPage.jsx` — Redesigned recommendation cards

#### C2. Interactive Cluster Map Migration Arrows
When viewing recommendations, draw animated arrows on the cluster map showing proposed migrations.

**Current:** The cluster map shows nodes and guests but recommendations are displayed separately below.

**Proposed:** When recommendations exist, draw SVG path arrows from source node to target node with:
- Arrow thickness proportional to number of migrations
- Color indicating confidence (green = high, yellow = medium)
- Hover to highlight the specific guests being moved
- Click arrow to scroll to the recommendation card

This creates an immediate visual understanding of the proposed migration plan.

**Files affected:**
- `src/components/DashboardPage.jsx` — SVG overlay for cluster map

#### C3. Score Legend & Education Panel
Add a persistent, accessible explanation of the scoring system directly in the dashboard.

**Current:** A small expandable info box with static text about the penalty system.

**Proposed:** A "How Scoring Works" panel accessible via a help button, containing:
1. **Visual scale** showing what suitability percentages mean (0-30 Poor, 30-50 Fair, 50-70 Good, 70-100 Excellent) with color coding
2. **Interactive example** — a simplified penalty calculation walkthrough using the user's actual cluster data
3. **Current configuration summary** — "Your system weights CPU at 30%, Memory at 30%, IOWait at 20%. Current period counts for 50% of the score."
4. **Link to Settings** for tuning penalties

**Files affected:**
- `src/components/DashboardPage.jsx` — New education panel/modal

#### C4. Recommendation History Timeline
Show a timeline of past recommendation cycles, which were acted on, and their outcomes.

**Current:** No historical view. Users can't see if past migrations improved things.

**Proposed:** A timeline view showing:
- Recommendation cycles with timestamps
- Which recommendations were executed vs. skipped
- Before/after node scores for executed migrations
- Trend line showing cluster health score over time

This helps users build trust in the system — they can see that past recommendations led to improvements.

**Files affected:**
- `proxbalance/recommendations.py` — Store historical recommendations with outcomes
- `proxbalance/routes/recommendations.py` — New `GET /api/recommendations/history`
- `src/components/DashboardPage.jsx` or new component — Timeline view

---

### D. Configuration Experience

#### D1. Penalty Config Presets with Visual Preview
Replace raw number inputs with preset-based configuration plus a visual preview.

**Current:** 30+ raw number inputs with `(default: X)` labels.

**Proposed:** Three-tier configuration approach:

**Tier 1 — Presets (for most users):**
```
┌───────────────────────────────────────────────────────┐
│  Scoring Profile                                      │
│                                                       │
│  [Conservative]  [Balanced ✓]  [Aggressive]  [Custom] │
│                                                       │
│  Balanced: Moderate sensitivity to load. Recommends   │
│  migrations when there's a clear benefit. Suitable    │
│  for most production clusters.                        │
│                                                       │
│  Key behaviors:                                       │
│  • Requires 15-point score improvement                │
│  • Weights: 50% current, 30% 24h, 20% 7-day          │
│  • Moderate penalties for high CPU/Memory             │
│  • IOWait considered but not dominant                 │
│                                                       │
│  [▸ Customize individual weights]                     │
└───────────────────────────────────────────────────────┘
```

**Tier 2 — Sliders with descriptions (for tuning):**
Replace number inputs with labeled sliders:
```
CPU Sensitivity     [──────●────────]  Medium
                    Low              High
                    "Tolerates higher CPU before recommending migration"

Memory Sensitivity  [────────────●──]  High
                    Low              High
                    "Aggressively migrates guests off memory-heavy nodes"

Time Horizon        [────●──────────]  Recent-focused
                    Long-term        Recent
                    "Weighs current metrics more heavily than historical averages"
```

Each slider controls a group of related penalties (e.g., "CPU Sensitivity" maps to `cpu_high_penalty`, `cpu_very_high_penalty`, `cpu_extreme_penalty` proportionally).

**Tier 3 — Advanced (for experts):**
The current raw number inputs, hidden behind an "Advanced" toggle.

**Files affected:**
- `proxbalance/routes/penalty.py` — Preset definitions and slider-to-penalty mapping
- `src/components/SettingsPage.jsx` — Redesigned penalty configuration UI

#### D2. Configuration Simulator
Add a "What If" simulator that shows how configuration changes would affect current recommendations.

**Concept:** When editing penalty config, show a live preview:
```
┌─ Preview with proposed settings ──────────────────────┐
│                                                       │
│  Current settings: 5 recommendations                  │
│  Proposed settings: 8 recommendations                 │
│                                                       │
│  New recommendations that would appear:               │
│  • VM 300 → vega (improvement: 18 pts, was 7 pts)     │
│  • VM 450 → lyra (improvement: 22 pts, was 12 pts)    │
│  • CT 600 → draco (improvement: 16 pts, was 9 pts)     │
│                                                       │
│  Recommendations that would disappear:                │
│  (none)                                               │
│                                                       │
│  [Apply Settings]  [Cancel]                           │
└───────────────────────────────────────────────────────┘
```

**Implementation:** The simulator calls the recommendation engine with the proposed settings in a dry-run mode and diffs the results against current recommendations.

**Files affected:**
- `proxbalance/routes/penalty.py` — New `POST /api/penalty-config/simulate` endpoint
- `proxbalance/recommendations.py` — Support passing custom penalty config
- `src/components/SettingsPage.jsx` — Simulator preview panel

#### D3. Threshold Suggestion Integration
Make the intelligent threshold suggestions more prominent and actionable.

**Current:** Threshold suggestions are returned by the API but not prominently displayed.

**Proposed:** Show threshold suggestions as an actionable banner:
```
┌─ Cluster Analysis ──────────────────────────────────────┐
│  ℹ Based on your cluster (4 nodes, moderate load):      │
│                                                         │
│  Suggested CPU threshold:  65% (yours: 60%)  [Apply]    │
│  Suggested Mem threshold:  72% (yours: 70%)  [Apply]    │
│  Suggested IOWait:         28% (yours: 30%)  [Apply]    │
│                                                         │
│  Confidence: High                                       │
│  Reasoning: Small cluster with balanced load. Slightly  │
│  conservative thresholds recommended to avoid migration │
│  storms.                                                │
│                                                         │
│  [Apply All Suggestions]           [Dismiss]            │
└─────────────────────────────────────────────────────────┘
```

**Files affected:**
- `src/components/DashboardPage.jsx` — Suggestion banner
- `src/components/SettingsPage.jsx` — Inline suggestion badges next to threshold inputs

---

### E. Feedback & Learning

#### E1. Migration Outcome Tracking
After a migration is executed, track the outcome and display it.

**Current:** Migration history exists but doesn't track whether the migration actually improved things.

**Proposed:** After each migration completes, capture:
- Source node metrics before and after (at +5min, +30min, +2h)
- Target node metrics before and after
- Whether the score improvement materialized as predicted

Display this as a report:
```
Migration VM 100: orion → lyra
────────────────────────────
Predicted improvement: +55 pts
Actual improvement:    +48 pts (87% accuracy)

orion CPU: 78% → 62% (-16%)  ✓ Improved
lyra CPU: 42% → 49% (+7%)   ✓ Within expected range
```

This builds user trust and provides data to validate the scoring algorithm.

**Files affected:**
- `proxbalance/migrations.py` — Capture pre-migration metrics
- New background task or collector hook — Capture post-migration metrics
- `proxbalance/routes/migrations.py` — Outcome reporting endpoint
- `src/components/DashboardPage.jsx` — Outcome display in migration history

#### E2. User Feedback on Recommendations
Allow users to rate recommendations (helpful / not helpful) and provide reasons.

**Concept:** Each recommendation card gets a discreet feedback widget:
```
Was this recommendation helpful?  [👍]  [👎]
```

If thumbs down, prompt for reason:
- "Migration wasn't needed — node was fine"
- "Wrong target node"
- "Guest shouldn't be migrated (special requirements)"
- "Other: ___"

Store this feedback to surface patterns (e.g., "Users consistently reject IOWait-based recommendations → maybe IOWait penalties are too aggressive").

**Files affected:**
- `proxbalance/routes/recommendations.py` — `POST /api/recommendations/{id}/feedback`
- `src/components/DashboardPage.jsx` — Feedback widget
- New data file — `recommendation_feedback.json`

#### E3. Recommendation Digest / Summary
Replace the raw recommendation list with a summary-first approach.

**Current:** Users see a flat list of recommendation cards.

**Proposed:** Lead with a cluster health summary:
```
┌─ Cluster Health Summary ───────────────────────────────┐
│                                                        │
│  Overall Health: Good (73/100)                         │
│  ████████████████████████████░░░░░░░░                  │
│                                                        │
│  3 migrations recommended:                             │
│  • 2 to balance CPU across cluster                     │
│  • 1 maintenance evacuation                            │
│                                                        │
│  Expected improvement: +42 points aggregate            │
│  Predicted cluster health after migrations: 85/100     │
│                                                        │
│  No urgent issues detected.                            │
│                                                        │
└────────────────────────────────────────────────────────┘

[▾ Show individual recommendations]
```

This gives administrators a quick executive summary without having to parse individual cards.

**Files affected:**
- `proxbalance/recommendations.py` — Generate summary statistics
- `src/components/DashboardPage.jsx` — Summary panel above recommendation list

---

## Implementation Priority

### Phase 1 — Quick Wins (Low comjellyfinity, high impact)
| Item | Description | Effort |
|------|-------------|--------|
| A1 | Score breakdown panel | Medium — Backend data exists, needs exposure + UI |
| B1 | Structured reason strings | Low — Backend change only, UI rendering |
| C3 | Score legend & education panel | Low — Frontend only |
| D3 | Threshold suggestion integration | Low — Data exists, needs UI |
| E3 | Recommendation digest/summary | Medium — Aggregation logic + UI |

### Phase 2 — Core Improvements (Medium comjellyfinity)
| Item | Description | Effort |
|------|-------------|--------|
| B2 | Reworked confidence score | Medium — New formula, testing needed |
| B3 | "Why Not?" explanations | Medium — Collection during generation + new endpoint |
| C1 | Recommendation card redesign | Medium — Significant UI work |
| D1 | Penalty config presets + sliders | Medium — Preset mapping + UI redesign |

### Phase 3 — Advanced Features (Higher comjellyfinity)
| Item | Description | Effort |
|------|-------------|--------|
| A2 | Node score comparison view | Medium — New endpoint + chart component |
| A3 | Penalty contribution visualization | Medium — Data aggregation + chart |
| B4 | Predicted impact preview | High — Full cluster simulation |
| C2 | Interactive cluster map arrows | High — SVG rendering, interaction |
| D2 | Configuration simulator | High — Dry-run recommendation engine |
| C4 | Recommendation history timeline | High — Historical data collection |
| E1 | Migration outcome tracking | High — Background tracking + UI |
| E2 | User feedback on recommendations | Low-Medium — Storage + simple UI |

---

## Alternative Approaches Considered

### Alternative 1: Replace Penalty System with Machine Learning
**Concept:** Train a model on past migrations and outcomes to predict optimal placements.

**Pros:**
- Could discover non-obvious patterns
- Adapts to specific cluster behavior over time
- Eliminates manual weight tuning

**Cons:**
- Requires significant historical data (cold start problem)
- Black box — even harder to explain to users than penalties
- ProxBalance targets small-to-medium clusters where data volume is low
- Adds ML infrastructure dependency

**Verdict:** Not recommended as a replacement. Could be explored as an optional enhancement for large clusters with extensive history.

### Alternative 2: Rule-Based Expert System
**Concept:** Replace penalties with explicit if/then rules (e.g., "IF source CPU > 80% AND target CPU < 50% THEN recommend migration").

**Pros:**
- Extremely transparent — users can read and modify rules directly
- Easy to debug
- Familiar to sysadmins (similar to firewall rules)

**Cons:**
- Doesn't handle nuance well — hard cutoffs cause flip-flopping
- Rule interactions become comjellyfin with 10+ rules
- Current penalty system already handles gray areas better

**Verdict:** Could be offered as a "Simple Mode" for users who want deterministic behavior, while keeping penalties as the default. Worth considering as a UI abstraction layer over the penalty engine (rules map to penalty configs).

### Alternative 3: Simulation-First Approach
**Concept:** Instead of scoring nodes, simulate every possible migration and rank by predicted cluster health.

**Pros:**
- Most accurate — directly measures what matters (overall cluster health)
- Naturally considers multi-migration interactions
- Results are easy to explain ("this set of moves gives the healthiest cluster")

**Cons:**
- Computationally expensive — O(guests × nodes) simulations per cycle
- Combinatorial explosion for multi-migration planning
- Current system already uses prediction via `predict_post_migration_load()`

**Verdict:** The current system partially does this (predicted health is 40% of the score). Could be enhanced by running a full cluster simulation for the top-N candidates rather than evaluating each migration independently. This would catch cases where two recommendations conflict.

### Alternative 4: A/B Scoring Display
**Concept:** Show two scoring views — a simple "traffic light" view for casual users and a detailed breakdown for power users.

**Pros:**
- Accommodates different user skill levels
- Simple view reduces cognitive load
- Detailed view satisfies power users

**Cons:**
- Two views to maintain
- Users might not find the detailed view when they need it

**Verdict:** Strongly recommended. Aligns with the Tier 1/2/3 config approach in D1. Default to simple, progressive disclosure to detail.

### Alternative 5: Natural Language Recommendations
**Concept:** Use the existing AI provider integration to generate all recommendation text in natural language instead of structured fields.

**Pros:**
- Most user-friendly — reads like advice from a colleague
- Can contextualize recommendations ("It's Monday morning, your workload typically increases — consider migrating before the rush")
- Leverages existing AI infrastructure

**Cons:**
- AI latency and cost per recommendation cycle
- Hallucination risk in technical context
- Not available when AI is disabled or Ollama is offline
- Hard to parse programmatically for automation

**Verdict:** Good as an enhancement layer (which it already partially is via `ai_insight`), not as a replacement. The structured data should remain the source of truth, with AI providing optional narrative context.

---

## Summary of Top Recommendations

1. **Make scores explainable** — Users must be able to trace any score back to specific metrics and penalties (A1, A2, A3).

2. **Restructure recommendations as stories** — Lead with "why" in human-readable language, put technical details behind progressive disclosure (B1, C1, E3).

3. **Simplify configuration with presets** — Most users should never touch individual penalty weights. Offer Conservative/Balanced/Aggressive presets with slider-based tuning (D1).

4. **Add "Why Not?" transparency** — Showing what was considered and rejected builds trust as much as showing what was recommended (B3).

5. **Preview before you commit** — Let users see predicted outcomes (B4) and simulate config changes (D2) before applying them.

6. **Track outcomes to build trust** — Close the feedback loop by showing whether past migrations actually improved things (E1, C4).

---

## Implementation Status

This section tracks the implementation progress of each proposed improvement against the current codebase. Last updated: 2026-02-08 (Phase 4 + Phase 5 + Phase 6 + Phase 7 complete).

### Completed (Backend + Frontend)

| Item | Description | Backend | Frontend |
|------|-------------|---------|----------|
| **A1** | Score Breakdown Panel | `calculate_target_node_score()` in `scoring.py` supports `return_details=True`, returning 12 individual penalty components, total penalties, component scores (health, predicted health, headroom, storage), and detailed metrics. Each recommendation includes a `score_details` object with `source` and `target` breakdowns. | Expandable score breakdown section per recommendation card (`DashboardPage.jsx:4209-4278`). Shows source/target penalty breakdown, predicted post-migration metrics (CPU%, Mem%, headroom). |
| **A2** | Node Score Comparison View | `POST /api/guest/{vmid}/migration-options` endpoint calculates per-node suitability for any guest, including anti-affinity checks, storage compatibility, penalty categories, and score improvement deltas. Returns sorted target list with disqualification reasons. | `fetchGuestMigrationOptions()` in `client.js:321-334`. State management in `useClusterData` hook with `guestMigrationOptions` state. |
| **B1** | Structured Reason Strings | `_build_structured_reason()` in `recommendations.py:456-585` builds `primary_reason`, `primary_label`, `contributing_factors` (each with factor, value, severity, label), and `summary` sentence. Reason types: `maintenance_evacuation`, `cpu_imbalance`, `mem_imbalance`, `combined`, `distribution_balancing`. | Recommendation cards render `primary_label` and up to 3 contributing factors (`DashboardPage.jsx:4169-4206`). |
| **B2** | Reworked Confidence Score | `_calculate_confidence()` in `recommendations.py:381-453`. Four weighted factors: score improvement (40%), target headroom (25%), migration comjellyfinity (20%), stability signal (15%). Maps each to 0-100 with meaningful thresholds. | Color-coded confidence display: green >= 70%, yellow >= 40%, orange < 40% (`DashboardPage.jsx:4193-4199`). AI confidence adjustments shown when present. |
| **B3** | "Why Not?" Explanations | Full `skipped_guests` tracking during generation. Seven skip reasons: `has_ignore_tag`, `ha_managed`, `stopped`, `passthrough_disk`, `unshared_bind_mount`, `insufficient_improvement`, `no_suitable_target`. Each entry includes `vmid`, `name`, `type`, `node`, `reason`, `detail`, and where applicable `best_target`, `score_improvement`, `current_score`, `best_target_score`. | Collapsible "Not Recommended" section (`DashboardPage.jsx:4463-4520`). Shows up to 20 guests with reason-specific icons (`~` insufficient, `H` HA, `!` no target, `S` stopped, `P` passthrough, `I` ignore tag, `B` bind mount). Score improvement vs. minimum threshold displayed. |
| **E2** | User Feedback | `POST /api/recommendations/feedback` accepts helpful/not_helpful with optional reasons. `GET /api/recommendations/feedback` returns aggregated stats. Stored in `recommendation_feedback.json` with 500-entry cap. | Thumbs up/down buttons per recommendation card (`DashboardPage.jsx:4304-4378`). Status badge after submission ("Thanks!" / "Noted"). `feedbackGiven` state tracks per-recommendation. |
| **E3** | Recommendation Digest | `_build_summary()` in `recommendations.py:588-656` generates `cluster_health` (0-100), `predicted_health`, `urgency` (high/medium/low/none) with `urgency_label`, `reasons_breakdown`, and `skip_reasons` counts by category. Now includes `batch_impact` with per-node before/after snapshots and variance metrics. | Summary data rendered in recommendation header with health bar, urgency badge, reason breakdown. Batch impact shown in collapsible "Batch Migration Impact" panel with per-node CPU/Mem/Guest before→after. |
| **D1** | Penalty Config Presets + Sliders | Backend has `POST /api/penalty-config/presets/{presetName}` endpoint. `applyPenaltyPreset()` exists in `client.js:99-110`. Three presets (Conservative/Balanced/Aggressive) with full penalty configs. | Preset buttons in `SettingsPage.jsx` penalty section. **Slider-based tuning** in SettingsPage: CPU Sensitivity, Memory Sensitivity, IOWait Sensitivity sliders that scale related penalty groups proportionally. Migration Threshold slider for `min_score_improvement`. Raw inputs preserved under "Advanced" toggle. |
| **D2** | Configuration Simulator | `POST /api/penalty-config/simulate` compares current vs. proposed penalty config. Returns recommendation count changes, per-guest additions/removals with improvement deltas, and per-node score comparisons. | "What-If Simulator" panel in SettingsPage penalty section. Shows current vs. proposed recommendation counts, per-guest additions/removals with source→target details, and per-node score deltas. Live simulation on demand via "Simulate" button. |
| **D3** | Threshold Suggestions | `GET /api/recommendations/threshold-suggestions` returns suggestions with confidence, reasoning, cluster stats, and adjustment factors. Also included in recommendation POST response as `threshold_suggestions`. | Actionable banner in Dashboard recommendations section showing suggested CPU/Memory/IOWait thresholds with current→suggested comparison. Confidence badge. "Apply All" button updates thresholds in state. Only shown when suggestions differ by ≥3% from current values. |
| **C3** | Score Legend & Education Panel | Scoring system documented in static info section. Penalty weights configurable. | Enhanced "Penalty-Based Scoring System" collapsible panel in Dashboard with: color-coded suitability scale (0-30 Poor, 30-50 Fair, 50-70 Good, 70-100 Excellent), live "Your Configuration" summary showing time weights and min improvement, link to Settings for tuning. |
| **A3** | Penalty Contribution Visualization | `/api/node-scores` returns `penalty_categories` per node. | Stacked bar on collapsed node cards showing CPU/Memory/IOWait/Trends/Spikes penalty breakdown with color-coded segments and legend. Total penalty points displayed. |
| **C1** | Recommendation Card Enhancements | Cards include structured reasons, confidence scores, expandable score details, AI insights, feedback buttons, migration commands. | Visual score improvement progress bar (0-80pt scale), confidence as 5-dot indicator with color coding, inline source/target CPU% metrics in FROM/TO badges. |
| **B4** | Predicted Impact Preview | `batch_impact` summary with per-node before/after data from `_build_summary()`. | "Show Predicted" toggle on Node Status section. When active, overlays predicted CPU/Memory values on collapsed node cards with strikethrough current values, color-coded deltas, and guest count changes. |
| **H1** | Migration Risk Scoring | `calculate_migration_risk()` in `scoring.py`. Five weighted risk factors: guest size (30%), I/O activity (25%), storage comjellyfinity (20%), network sensitivity (15%), cluster health (10%). Returns `risk_score` (0-100), `risk_level` (low/moderate/high/very_high), and `risk_factors` array with per-factor detail. Each recommendation includes `risk_score`, `risk_level`, `risk_factors`. | Risk badge on each recommendation card showing risk level and score. Color-coded (green/yellow/orange/red). Tooltip shows all risk factor details. |
| **H2** | Pre-Migration Validation | `validate_migration()` in `migrations.py` runs 6 checks: staleness (cache age), guest state (running on expected node), resource availability (target headroom), storage re-verification, lock/snapshot check, affinity validation. `POST /api/migrate/validate` endpoint. Returns `passed` bool, `checks` list, `warnings` list. | `validateMigration()` in `client.js`. Backend endpoint ready for frontend integration on migrate button. |
| **G1** | Migration Conflict Detection | `_detect_migration_conflicts()` post-generation pass in `recommendations.py`. Groups recommendations by target node, simulates combined post-migration load, flags when combined load exceeds thresholds. Suggests resolution (defer weakest or re-route to alternative target). Tags conflicting recommendations with `has_conflict` and `conflict_target`. | Conflict warning banner in Dashboard showing target node, incoming guests, combined predicted load vs. threshold, and resolution suggestion. Per-recommendation "Target Conflict" badge when `has_conflict` is set. |
| **F3** | Capacity Planning Insights | `_generate_capacity_advisories()` in `recommendations.py`. Generates advisory messages for: cluster-wide saturation (avg CPU >70% or mem >80%), limited CPU/memory headroom (most nodes above threshold), single-node bottlenecks (CPU >90% or mem >95%), and small clusters (1-2 nodes). Returns severity (critical/warning/info), message, metrics, and suggestions. Included in recommendation response as `capacity_advisories`. | Capacity advisory banners in Dashboard before recommendation list. Color-coded by severity (red=critical, yellow=warning, blue=info). Shows advisory message with actionable suggestions list. |

### Partially Implemented

| Item | Description | Current State | Remaining Work |
|------|-------------|---------------|----------------|
| (none) | All original plan items are now at least partially complete | — | — |

### Not Started

| Item | Description | Notes |
|------|-------------|-------|
| **C2** | Interactive Cluster Map Arrows | Cluster map renders nodes and guests as visual elements (`DashboardPage.jsx:2136-2500+`) but no SVG arrows, animation, or migration flow visualization between nodes. |
| **C4** | Recommendation History Timeline | No historical recommendation storage beyond current cache cycle. `recommendations_cache.json` is overwritten each generation. No before/after tracking for executed migrations. |
| **E1** | Migration Outcome Tracking | Migration history (`migration_history.json`) records events with status (completed/failed/timeout) and duration. Does **not** capture pre/post node metrics or compare predicted vs. actual score improvement. |

---

## Next-Phase Improvements

The following improvements go beyond the original plan, addressing gaps discovered during implementation and informed by patterns in the codebase.

### F. Predictive Analysis & Trend Forecasting

#### F1. Proactive Recommendation Alerts

Generate recommendations before thresholds are crossed based on trend analysis.

**Current:** Recommendations only trigger when a node currently exceeds thresholds or when the penalty score is high enough to justify migration. Rising trends add a modest penalty (+15 points) but don't trigger recommendations on their own.

**Proposed:** Add a "Forecast" category of recommendations that triggers when:
- CPU or memory has been rising steadily for 3+ days and will cross the threshold within the next 24-48 hours at current trajectory
- IOWait is trending upward, suggesting emerging disk contention
- Guest resource consumption is growing faster than node headroom

```json
{
  "type": "forecast",
  "urgency": "low",
  "primary_reason": "trend_crossing",
  "primary_label": "CPU approaching threshold",
  "summary": "orion CPU has risen from 42% to 57% over the past 5 days. At this rate, it will exceed the 60% threshold in approximately 2 days. Consider migrating VM 100 (web-app-1) to vega preemptively.",
  "forecast": {
    "metric": "cpu",
    "current_value": 57.2,
    "threshold": 60.0,
    "trend_direction": "rising",
    "trend_rate_per_day": 3.0,
    "estimated_crossing": "2026-02-10T14:00:00Z",
    "confidence": "medium"
  }
}
```

**Implementation:** Extend `calculate_target_node_score()` to perform linear regression on 7-day RRD data points and project future values. Add a `forecast_penalties` section to the penalty breakdown.

**Files affected:**
- `proxbalance/scoring.py` — Trend projection using 7-day data points
- `proxbalance/recommendations.py` — New forecast recommendation type
- `src/components/DashboardPage.jsx` — Forecast cards with distinct styling

#### F2. Workload Pattern Recognition

Identify recurring load patterns (daily cycles, weekly cycles) and use them to time migration recommendations.

**Current:** The scoring system blends current, 24-hour, and 7-day metrics but treats them as flat averages. A node that spikes to 90% CPU every night at 2 AM but sits at 30% during the day gets averaged to ~45%, masking the pattern.

**Proposed:** Analyze RRD data to detect periodic patterns:
- **Daily cycles** — Business-hours vs. off-hours load
- **Weekly cycles** — Weekday vs. weekend patterns
- **Burst detection** — Regular, predictable spikes vs. random noise

Use these patterns to:
1. Time recommendations for when they'll have maximum impact (e.g., "migrate before the nightly batch job")
2. Reduce false positives from predictable spikes (don't recommend migration for a VM that spikes every night but recovers)
3. Identify guests whose patterns conflict with their current node (e.g., two guests that both spike at the same time on the same node)

```json
{
  "workload_pattern": {
    "cycle_type": "daily",
    "peak_hours": [2, 3, 4],
    "peak_avg_cpu": 87.5,
    "trough_avg_cpu": 28.3,
    "pattern_confidence": "high",
    "recommendation_timing": "Migrate during 10:00-16:00 window when load is minimal"
  }
}
```

**Files affected:**
- `proxbalance/scoring.py` — New `analyze_workload_patterns()` function
- `collector_api.py` — Store hourly RRD data points with timestamps (not just averages)
- `proxbalance/recommendations.py` — Factor patterns into recommendation urgency and timing
- `src/components/DashboardPage.jsx` — Pattern visualization (mini heatmap or sparkline)

#### F3. Capacity Planning Insights

Extend recommendations beyond "move this guest" to include capacity planning advice.

**Current:** Recommendations focus exclusively on migration actions. There's no guidance on when the cluster itself is approaching saturation.

**Proposed:** Add cluster-level recommendations:
- "Your cluster is 78% utilized. Consider adding a node before deploying additional workloads."
- "lyra has 85% memory used with no viable migration targets. All other nodes are similarly loaded. Consider adding RAM to lyra or adding a new node."
- "3 of your 4 nodes are above 70% CPU. Migration can redistribute but won't reduce total load."

These are advisory only — no migration action — but help administrators plan infrastructure changes.

```json
{
  "type": "capacity_advisory",
  "severity": "warning",
  "message": "Cluster-wide CPU utilization is 72% with limited headroom for migration. Rebalancing can improve individual node health but overall capacity is constrained.",
  "metrics": {
    "cluster_cpu_avg": 72.1,
    "cluster_mem_avg": 64.8,
    "nodes_above_cpu_threshold": 3,
    "nodes_above_mem_threshold": 1,
    "migration_headroom": "limited"
  },
  "suggestions": [
    "Add a new node to increase cluster capacity",
    "Review guest resource allocations for over-provisioning",
    "Consider offloading low-priority workloads"
  ]
}
```

**Files affected:**
- `proxbalance/recommendations.py` — New `generate_capacity_advisories()` function
- `proxbalance/routes/recommendations.py` — Include advisories in recommendation response
- `src/components/DashboardPage.jsx` — Advisory banner above recommendations

---

### G. Multi-Migration Optimization

#### G1. Migration Conflict Detection

Detect when two or more recommended migrations conflict with each other.

**Current:** Each migration is evaluated independently. If VM A and VM B are both recommended to move to vega, the system doesn't account for the combined load impact. The `pending_target_guests` parameter exists in `calculate_target_node_score()` but is only used within a single recommendation cycle's iteration — it doesn't fully simulate the combined effect of all recommendations.

**Proposed:** After generating individual recommendations, run a validation pass:
1. Group recommendations by target node
2. For each target, simulate the combined post-migration load of all incoming guests
3. If the combined load would push the target above thresholds, flag the conflict
4. Suggest resolution: re-route one guest to an alternative target, or defer lower-priority migrations

```json
{
  "conflicts": [
    {
      "target_node": "vega",
      "incoming_guests": [
        {"vmid": 100, "name": "web-app-1", "predicted_cpu_impact": 12.5},
        {"vmid": 200, "name": "api-server", "predicted_cpu_impact": 18.3}
      ],
      "combined_predicted_cpu": 78.8,
      "threshold": 60.0,
      "resolution": "Consider moving VM 200 to draco instead (score: 72 vs. 68 on vega)"
    }
  ]
}
```

**Files affected:**
- `proxbalance/recommendations.py` — Post-generation conflict validation pass
- `proxbalance/scoring.py` — Multi-guest prediction function
- `src/components/DashboardPage.jsx` — Conflict warnings on recommendation cards

#### G2. Migration Ordering & Dependencies

Determine the optimal order for executing multiple migrations.

**Current:** Batch migrations execute in the order they appear in the recommendation list. There's no analysis of whether order matters.

**Proposed:** Analyze migration dependencies:
- **Resource sequencing** — If orion is overloaded and lyra needs to send a guest to orion's current target (vega), the orion migration should execute first to free capacity
- **Affinity chain ordering** — When affinity companions need to move together, determine which should go first to maintain service availability
- **Risk minimization** — Execute highest-confidence migrations first so that if the process is interrupted, the most impactful changes are already complete

```json
{
  "execution_plan": {
    "ordered_migrations": [
      {"step": 1, "vmid": 100, "source": "orion", "target": "vega", "reason": "Frees capacity on orion for step 3"},
      {"step": 2, "vmid": 300, "source": "lyra", "target": "draco", "reason": "Independent, high confidence"},
      {"step": 3, "vmid": 200, "source": "vega", "target": "orion", "reason": "Depends on step 1 completing"}
    ],
    "parallel_groups": [[1, 2], [3]],
    "estimated_total_downtime": "minimal (online migrations)"
  }
}
```

**Files affected:**
- `proxbalance/recommendations.py` — Migration ordering algorithm
- `automigrate.py` — Respect execution order during automated runs
- `src/components/DashboardPage.jsx` — Display execution plan with step numbers

#### G3. Batch Migration Impact Assessment

Show the cumulative impact of executing all recommendations as a batch.

**Current:** Each recommendation shows its individual score improvement. There's no view of the aggregate cluster impact.

**Proposed:** Extend the summary with a full before/after cluster snapshot:

```json
{
  "batch_impact": {
    "before": {
      "cluster_health": 62,
      "node_scores": {"orion": 45, "lyra": 78, "vega": 32, "draco": 55},
      "score_variance": 18.7,
      "worst_node": "lyra"
    },
    "after": {
      "cluster_health": 81,
      "node_scores": {"orion": 38, "lyra": 42, "vega": 45, "draco": 48},
      "score_variance": 4.1,
      "worst_node": "draco"
    },
    "improvement": {
      "health_delta": "+19 points",
      "variance_reduction": "78%",
      "all_nodes_below_threshold": true
    }
  }
}
```

This ties into the **B4 (Predicted Impact Preview)** item from Phase 1 but focuses on the aggregate rather than individual predictions.

**Files affected:**
- `proxbalance/recommendations.py` — `calculate_batch_impact()` function
- `proxbalance/scoring.py` — Multi-migration cluster simulation
- `src/components/DashboardPage.jsx` — Before/after comparison visualization

---

### H. Risk Assessment & Migration Safety

#### H1. Migration Risk Scoring

Assign a risk level to each migration based on guest characteristics and cluster state.

**Current:** Confidence score captures "how beneficial is this migration?" but doesn't explicitly model "what could go wrong?" Large VMs with many disks, high I/O, or network-sensitive workloads carry more migration risk than small, idle containers — but this isn't surfaced.

**Proposed:** Add a `risk_score` (0-100, lower is safer) to each recommendation:

```python
risk_score = weighted_average(
    guest_size_risk,        # 30% — Larger memory = longer migration, more downtime risk
    io_activity_risk,       # 25% — High disk I/O during migration increases failure chance
    storage_comjellyfinity,     # 20% — Multi-disk, mixed storage types, snapshots
    network_sensitivity,    # 15% — High network I/O suggests latency-sensitive workload
    cluster_health_risk,    # 10% — If cluster is already stressed, migration adds load
)
```

Risk levels:
- **0-25: Low risk** — Small guest, low activity, simple storage. Safe for automated migration.
- **26-50: Moderate risk** — Medium guest or moderate activity. Suitable for scheduled windows.
- **51-75: High risk** — Large guest, high I/O, or comjellyfin storage. Recommend manual oversight.
- **76-100: Very high risk** — Very large guest, extreme I/O, or cluster under stress. Recommend manual migration with monitoring.

```json
{
  "risk_score": 42,
  "risk_level": "moderate",
  "risk_factors": [
    {"factor": "guest_memory", "value": "16 GB", "risk": "medium", "detail": "Migration will transfer 16 GB of memory"},
    {"factor": "disk_io", "value": "45 MB/s", "risk": "medium", "detail": "Active disk I/O may extend migration time"},
    {"factor": "storage", "value": "2 disks (ceph-rbd)", "risk": "low", "detail": "Shared storage, no data copy needed"}
  ]
}
```

**Files affected:**
- `proxbalance/scoring.py` — New `calculate_migration_risk()` function
- `proxbalance/recommendations.py` — Include risk in recommendation output
- `automigrate.py` — Respect risk thresholds (skip high-risk in automated mode)
- `src/components/DashboardPage.jsx` — Risk badge on recommendation cards

#### H2. Pre-Migration Validation Checks

Run automated checks before migration execution to catch issues early.

**Current:** The automation system runs safety checks (cluster health, quorum, node resource limits) before a batch, but doesn't validate individual migrations. A guest might have acquired a new passthrough device, new snapshot, or changed storage since the recommendation was generated.

**Proposed:** Before executing any migration (manual or automated), run a validation suite:

1. **Staleness check** — Is the recommendation still valid? (re-score with current data)
2. **Storage re-verification** — Does the target still have the required storage volumes?
3. **Resource availability** — Does the target node still have sufficient CPU/memory headroom?
4. **Guest state check** — Is the guest still running? Has it moved since the recommendation?
5. **Lock/snapshot check** — Does the guest have active snapshots or locks that would block migration?
6. **Affinity validation** — Would this migration violate any affinity or anti-affinity rules?

```json
{
  "validation": {
    "passed": true,
    "checks": [
      {"check": "staleness", "passed": true, "detail": "Recommendation generated 4 minutes ago"},
      {"check": "storage", "passed": true, "detail": "Target has ceph-rbd storage available"},
      {"check": "resources", "passed": true, "detail": "Target has 45% CPU and 52% memory headroom"},
      {"check": "guest_state", "passed": true, "detail": "Guest is running on orion"},
      {"check": "locks", "passed": true, "detail": "No active locks or running snapshots"},
      {"check": "affinity", "passed": true, "detail": "No affinity conflicts on target"}
    ],
    "warnings": [
      {"check": "score_drift", "detail": "Score improvement dropped from 55 to 48 since generation (still above minimum)"}
    ]
  }
}
```

**Files affected:**
- `proxbalance/migrations.py` — `validate_migration()` function
- `proxbalance/routes/migrations.py` — Validation endpoint `POST /api/migrate/validate`
- `automigrate.py` — Call validation before each migration in automated runs
- `src/components/DashboardPage.jsx` — Validation status on migrate button

#### H3. Rollback Awareness

Surface information about migration reversibility.

**Current:** Users can manually migrate a guest back to its original node, but there's no tracking or UI support for rollbacks.

**Proposed:** After a migration completes, track the "return path" and make it easy to reverse:

- Store the source node in the migration history entry
- Add a "Rollback" button to recently migrated guests (within a configurable window, e.g., 2 hours)
- Before rollback, validate that the original node still has capacity
- Show whether conditions have changed since the migration (e.g., "orion load has decreased since this guest left — rollback is safe")

```json
{
  "rollback_info": {
    "original_node": "orion",
    "migration_timestamp": "2026-02-08T10:30:00Z",
    "time_since_migration": "45 minutes",
    "rollback_available": true,
    "original_node_current_load": {"cpu": 52.1, "mem": 48.3},
    "rollback_safe": true,
    "detail": "orion has sufficient capacity for this guest"
  }
}
```

**Files affected:**
- `proxbalance/migrations.py` — Track source node in history, add rollback function
- `proxbalance/routes/migrations.py` — `POST /api/migrate/rollback` endpoint
- `src/components/DashboardPage.jsx` — Rollback button in migration history

---

### I. Observability & Diagnostics

#### I1. Recommendation Engine Diagnostics

Provide a diagnostic view showing the recommendation engine's internal state.

**Current:** Debugging recommendation behavior requires reading server logs or manually calling API endpoints. Users can't see why the engine is making its decisions at a systemic level.

**Proposed:** A diagnostics panel (accessible from Settings or a debug menu) showing:

```
┌─ Recommendation Engine Diagnostics ──────────────────────────┐
│                                                               │
│  Last generation:  2026-02-08 10:30:00 UTC (5 min ago)       │
│  Generation time:  1.2 seconds                               │
│  Guests evaluated: 47                                        │
│  Guests recommended: 3                                       │
│  Guests skipped: 44                                          │
│                                                               │
│  Skip reason breakdown:                                      │
│    insufficient_improvement: 28 (64%)                        │
│    stopped:                  8  (18%)                        │
│    ha_managed:               4  (9%)                         │
│    has_ignore_tag:           2  (5%)                         │
│    no_suitable_target:       1  (2%)                         │
│    passthrough_disk:         1  (2%)                         │
│                                                               │
│  Scoring config:                                             │
│    Min score improvement: 15                                  │
│    CPU threshold: 60% | Mem threshold: 70%                   │
│    Time weights: 50% current, 30% 24h, 20% 7d               │
│                                                               │
│  AI enhancement: Enabled (Anthropic Claude)                  │
│    Last AI call: 2026-02-08 10:30:01 UTC                     │
│    AI response time: 2.3 seconds                             │
│    Insights added: 3/3                                       │
│                                                               │
│  Cache status:                                               │
│    cluster_cache.json: 2026-02-08 10:15:00 UTC (20 min old)  │
│    recommendations_cache.json: 2026-02-08 10:30:02 UTC       │
│                                                               │
│  [Regenerate Now]  [Export Debug Log]                         │
└───────────────────────────────────────────────────────────────┘
```

**Files affected:**
- `proxbalance/routes/recommendations.py` — `GET /api/recommendations/diagnostics` endpoint
- `proxbalance/recommendations.py` — Timing and diagnostic metadata collection
- `src/components/SettingsPage.jsx` — Diagnostics panel

#### I2. Score History & Trend Tracking

Track node scores over time to show scoring trends.

**Current:** Node scores are computed fresh on each recommendation cycle. There's no historical record, so users can't see whether a node's health is improving or degrading over time.

**Proposed:** After each recommendation generation, persist a snapshot of all node scores:

```json
{
  "score_history": [
    {
      "timestamp": "2026-02-08T10:30:00Z",
      "nodes": {
        "orion": {"score": 45.2, "suitability": 54.8, "cpu": 62.1, "mem": 48.3},
        "lyra": {"score": 78.1, "suitability": 21.9, "cpu": 81.5, "mem": 72.0},
        "vega": {"score": 32.4, "suitability": 67.6, "cpu": 38.2, "mem": 45.1}
      },
      "cluster_health": 62
    }
  ]
}
```

Retain data for up to 30 days with hourly granularity (720 entries per node). Display as a line chart on the dashboard showing node health over time, making trends visible at a glance.

**Files affected:**
- `proxbalance/recommendations.py` — Append score snapshot after generation
- New data file — `score_history.json`
- `proxbalance/routes/recommendations.py` — `GET /api/score-history` endpoint with time range filtering
- `src/components/DashboardPage.jsx` — Score history chart (Chart.js line chart)

#### I3. Recommendation Change Log

Track what changed between recommendation cycles.

**Current:** Each recommendation generation replaces the cache entirely. If a recommendation appears or disappears, users have no way to know what changed or why.

**Proposed:** Before overwriting the cache, diff the new recommendations against the old:

```json
{
  "changes_since_last": {
    "timestamp": "2026-02-08T10:30:00Z",
    "previous_timestamp": "2026-02-08T10:20:00Z",
    "new_recommendations": [
      {"vmid": 400, "reason": "lyra CPU rose from 58% to 67%, crossing threshold"}
    ],
    "removed_recommendations": [
      {"vmid": 100, "reason": "orion CPU dropped from 72% to 55% after load decrease"}
    ],
    "changed_targets": [
      {"vmid": 200, "old_target": "vega", "new_target": "draco", "reason": "vega load increased"}
    ],
    "unchanged": 2
  }
}
```

**Files affected:**
- `proxbalance/recommendations.py` — Diff logic before cache overwrite
- `proxbalance/routes/recommendations.py` — Include `changes_since_last` in response
- `src/components/DashboardPage.jsx` — Change indicators on recommendation cards (new/changed badges)

---

### J. API & Integration Enhancements

#### J1. Webhook Events for Recommendation Lifecycle

Emit webhook events for recommendation-related actions.

**Current:** The notification system supports migration events, but there's no notification for recommendation changes. Users relying on external monitoring (Slack, Discord, etc.) only learn about migrations after they happen.

**Proposed:** New webhook event types:

| Event | Trigger | Payload |
|-------|---------|---------|
| `recommendations.generated` | New recommendations generated | Count, summary, urgency |
| `recommendations.urgent` | High-urgency recommendation detected | Recommendation details, node metrics |
| `recommendations.cleared` | All recommendations resolved | Previous count, resolution method |
| `recommendation.feedback` | User submitted feedback | VMID, rating, reason |
| `capacity.warning` | Cluster approaching saturation | Cluster metrics, advisory |

```json
{
  "event": "recommendations.urgent",
  "timestamp": "2026-02-08T10:30:00Z",
  "data": {
    "count": 1,
    "urgency": "high",
    "recommendation": {
      "vmid": 200,
      "name": "database-primary",
      "source_node": "lyra",
      "target_node": "vega",
      "score_improvement": 62,
      "reason": "lyra CPU at 92% with rising trend"
    },
    "cluster_health": 45
  }
}
```

**Files affected:**
- `notifications.py` — New event type handlers
- `proxbalance/recommendations.py` — Emit events after generation
- `proxbalance/routes/config.py` — Webhook event type configuration

#### J2. Recommendation API Filtering & Pagination

Add filtering and pagination to the recommendation API for larger clusters.

**Current:** The API returns all recommendations and all skipped guests in a single response. For clusters with hundreds of guests, this can be a large payload.

**Proposed:** Add query parameters to the GET endpoint:

```
GET /api/recommendations?filter=urgent&limit=10&offset=0
GET /api/recommendations?min_confidence=80&target_node=vega
GET /api/recommendations?type=forecast&sort=score_improvement
GET /api/recommendations/skipped?reason=insufficient_improvement&limit=20
```

**Files affected:**
- `proxbalance/routes/recommendations.py` — Filtering and pagination logic
- `src/api/client.js` — Updated API calls with filter support
- `src/components/DashboardPage.jsx` — Filter controls in the recommendation UI

#### J3. Export & Reporting

Allow users to export recommendations and migration history in standard formats.

**Current:** Data is only viewable in the web UI. Administrators who need to report to management or audit migrations have no export capability.

**Proposed:** Export endpoints:

```
GET /api/recommendations/export?format=csv
GET /api/recommendations/export?format=json
GET /api/automigrate/history/export?format=csv&from=2026-01-01&to=2026-02-08
```

CSV format for recommendations:
```csv
VMID,Name,Type,Source,Target,Score Improvement,Confidence,Risk,Reason
100,web-app-1,VM,orion,vega,55,82,low,High CPU on source (78% trending up)
200,api-server,VM,lyra,draco,38,71,moderate,Memory pressure on source (85%)
```

**Files affected:**
- `proxbalance/routes/recommendations.py` — Export endpoint with format selection
- `proxbalance/routes/automation.py` — History export endpoint
- `src/components/DashboardPage.jsx` — Export button in recommendation header
- `src/components/AutomationPage.jsx` — Export button in history section

---

## Next-Phase Implementation Priority

### Implementation Status of Next-Phase Items

Before prioritizing, here is the current implementation status of next-phase items. Several are further along than initially expected due to existing infrastructure:

| Item | Description | Backend | Frontend | Overall Status |
|------|-------------|---------|----------|----------------|
| **G1** | Migration conflict detection | **Complete** — `_detect_migration_conflicts()` post-generation pass groups by target node, simulates combined load, flags threshold exceedances, suggests resolution. Tags recs with `has_conflict`. | **Complete** — Conflict warning banner + per-rec "Target Conflict" badge. | Complete. |
| **G2** | Migration ordering | **Complete** — `_compute_execution_order()` builds dependency graph, detects cycles, performs topological sort with Kahn's algorithm, groups independent migrations for parallel execution. | **Complete** — Execution Plan panel in Dashboard showing step numbers, parallel groups, and ordering reasons. | Complete. |
| **G3** | Batch impact assessment | **Complete** — `_build_summary()` includes `batch_impact` with per-node before/after CPU%, Mem%, guest count, variance calculation, and improvement metrics (health_delta, variance_reduction_pct, all_nodes_improved). | **Complete** — Collapsible "Batch Migration Impact" panel in DashboardPage showing per-node before→after metrics with color-coded deltas and aggregate stats. | Complete. |
| **H2** | Pre-migration validation | **Complete** — `validate_migration()` in `migrations.py` runs 6 checks (staleness, guest state, resources, storage, locks, affinity). `POST /api/migrate/validate` endpoint. | **Complete** — `validateMigration()` in `client.js`. | Complete. |
| **H3** | Rollback awareness | **Complete** — `get_rollback_info()` checks history for recent migrations, validates original node capacity. `POST /api/migrate/rollback` endpoint executes reverse migration with history recording. | **Complete** — Rollback button on completed migration cards with safety confirmation dialogs. | Complete. |
| **J1** | Webhook events | **Complete** — `notifications.py` supports four event types: `recommendations` (standard), `recommendations_urgent` (high-urgency with priority=high), `recommendations_cleared` (when all resolved), `capacity_warning` (cluster health <50). `generate_recommendations.py` sends all four event types conditionally based on urgency, count transitions, and cluster health. Default notification toggles added. | N/A | Complete. |
| **F1** | Proactive alerts | **Complete** — `_generate_forecast_recommendations()` uses `project_trend()` linear regression on 7-day score history. Projects CPU/memory 48h ahead, estimates hours until threshold crossing, assigns severity. | **Complete** — Forecast alert cards in Dashboard with severity badges, current/threshold/projected values, ETA, trend rate, and R² confidence. | Complete. |
| **F2** | Workload patterns | **Complete** — `analyze_workload_patterns()` in `scoring.py` analyzes score history by hour-of-day and day-of-week. Detects daily cycles (business vs off-hours), weekly patterns (weekday vs weekend), and recurring bursts. `GET /api/workload-patterns` endpoint. | **Complete** — Collapsible "Workload Patterns" panel in Dashboard diagnostics showing daily/weekly cycles, burst detection, and recommended migration timing. | Complete. |
| **F3** | Capacity planning | **Complete** — `_generate_capacity_advisories()` detects saturation, limited headroom, bottlenecks, small clusters. Returns severity, message, metrics, suggestions. | **Complete** — Capacity advisory banners in Dashboard with severity-coded styling and suggestion lists. | Complete. |
| **H1** | Migration risk scoring | **Complete** — `calculate_migration_risk()` in `scoring.py` with 5 weighted factors. Integrated into recommendation generation. | **Complete** — Risk badge per recommendation card. | Complete. |
| **I1** | Engine diagnostics | **Complete** — `GET /api/recommendations/diagnostics` endpoint returns generation timing, guest counts, skip reasons, scoring config, AI status, cache ages, conflict/advisory counts. | **Complete** — Collapsible "Engine Diagnostics" panel in Dashboard showing generation time, guest counts, AI status, conflicts/advisories, thresholds, skip reason breakdown. | Complete. |
| **I2** | Score history | **Complete** — `_save_score_snapshot()` in `recommendations.py` persists per-node scores to `score_history.json` (max 720 entries). `GET /api/score-history` endpoint with `hours` and `node` query params. | **Complete** — `fetchScoreHistory()` in `client.js`. | Complete. |
| **I3** | Recommendation change log | **Complete** — POST handler in `routes/recommendations.py` compares new vs old recommendations by vmid before overwriting cache. Computes `new_recommendations`, `removed_recommendations`, `changed_targets`, `unchanged`. | **Complete** — "Changes Since Last Generation" collapsible banner with +new/-removed/changed badges. Per-card "NEW" and "TARGET CHANGED" badges. | Complete. |
| **J2** | API filtering | **Complete** — `GET /api/recommendations` supports `limit`, `offset`, `min_confidence`, `target_node`, `source_node`, `sort`, `sort_dir` query params. `GET /api/recommendations/skipped` with reason filtering. Pagination metadata in response. | **Complete** — Filter bar in Dashboard with confidence, source/target node, sort controls, and clear-all button. Client-side filtering. | Complete. |
| **J3** | Export & reporting | **Complete** — `GET /api/recommendations/export` (CSV/JSON) and `GET /api/automigrate/history/export` (CSV/JSON with date range filtering). | **Complete** — Export dropdown in Dashboard with CSV/JSON options for recommendations and migration history. | Complete. |
| **C2** | Cluster map arrows | N/A (frontend only) | **Complete** — Migration flow visualization above cluster map showing source→target node pairs with guest counts, color-coded improvement arrows, and hover popover with guest details. | Complete. |
| **C4** | History timeline | **Complete** — Leverages `score_history.json` (I2) and `GET /api/score-history` endpoint with configurable time range. | **Complete** — Score trend sparkline timeline in Dashboard with health + recommendation count overlay, configurable from 6h to 7d. | Complete. |
| **E1** | Outcome tracking | **Complete** — `capture_pre_migration_snapshot()`, `record_migration_outcome()`, `update_post_migration_metrics()` in `migrations.py`. `GET /api/migrate/outcomes` and `POST /api/migrate/outcomes/refresh` endpoints. | **Complete** — Migration Outcomes panel in Dashboard showing pre/post CPU/memory deltas, accuracy percentage, and pending status. | Complete. |

### Revised Phasing

Based on the updated status assessment, phases are re-ordered to maximize leverage from existing infrastructure:

### Phase 4 — Complete Partial Implementations (finish what's started) ✓ COMPLETED
| Item | Description | Effort | Status |
|------|-------------|--------|--------|
| D1 | Penalty config presets: move preset buttons to SettingsPage, add slider groups | Medium | ✓ Preset buttons + slider groups + advanced toggle in SettingsPage |
| D2 | Simulator UI integration | Low | ✓ "What-If Simulator" panel in SettingsPage with live preview |
| D3 | Threshold suggestion UI | Low | ✓ Actionable banner with "Apply All" button in Dashboard |
| G3 | Batch impact: add full before/after cluster snapshot | Low-Medium | ✓ Per-node before/after in summary + Dashboard visualization |
| J1 | Expand recommendation webhook events | Low | ✓ Four event types: standard, urgent, cleared, capacity_warning |

### Phase 5 — Core Remaining Items (from original plan) ✓ COMPLETED
| Item | Description | Effort | Status |
|------|-------------|--------|--------|
| A3 | Penalty contribution visualization | Medium | ✓ Stacked penalty bar on node cards with color-coded segments |
| C3 | Score legend & education panel | Low | ✓ Color-coded suitability scale, live config summary, link to Settings |
| B4 | Predicted impact preview | Medium | ✓ "Show Predicted" toggle overlaying predicted metrics on node cards |
| C1 | Recommendation card enhancements | Medium | ✓ Progress bar, confidence dots, inline source/target CPU metrics |

### Phase 6 — Safety & Validation ✓ COMPLETED
| Item | Description | Effort | Status |
|------|-------------|--------|--------|
| H1 | Migration risk scoring | Medium | ✓ `calculate_migration_risk()` in `scoring.py` with 5 weighted factors. Risk badges on rec cards. |
| H2 | Pre-migration validation | Medium | ✓ `validate_migration()` in `migrations.py` with 6 checks. `POST /api/migrate/validate` endpoint. |
| G1 | Migration conflict detection | Medium | ✓ `_detect_migration_conflicts()` post-generation pass. Conflict banners + per-rec badges. |
| F3 | Capacity planning insights | Low-Medium | ✓ `_generate_capacity_advisories()` with 4 advisory types. Severity-coded banners in Dashboard. |

### Phase 7 — Observability & Trends ✓ COMPLETED
| Item | Description | Effort | Status |
|------|-------------|--------|--------|
| I2 | Score history & trend tracking | Medium | ✓ `_save_score_snapshot()` in `recommendations.py` + `GET /api/score-history` endpoint. `fetchScoreHistory()` in `client.js`. |
| I3 | Recommendation change log | Low | ✓ Diff computation in POST handler. "Changes Since Last Generation" banner + per-card NEW/TARGET CHANGED badges. |
| I1 | Recommendation engine diagnostics | Low-Medium | ✓ `GET /api/recommendations/diagnostics` endpoint. Collapsible "Engine Diagnostics" panel in Dashboard. |
| J3 | Export & reporting (CSV/JSON) | Low-Medium | ✓ `GET /api/recommendations/export` + `GET /api/automigrate/history/export`. Export dropdown in Dashboard. |

### Phase 8 — Advanced Features ✓ COMPLETED
| Item | Description | Effort | Status |
|------|-------------|--------|--------|
| J2 | API filtering & pagination | Low | ✓ Query params for limit, offset, min_confidence, target_node, source_node, sort, sort_dir. Frontend filter controls. Skipped guests endpoint with reason filtering. |
| H3 | Rollback awareness: UI + capacity check | Medium | ✓ `get_rollback_info()` with capacity check + `POST /api/migrate/rollback` endpoint. Rollback button on completed migration cards in Dashboard. |
| G2 | Migration ordering & dependencies | High | ✓ `_compute_execution_order()` with dependency graph, cycle breaking, topological sort, parallel grouping. Execution Plan panel in Dashboard. |
| F1 | Proactive recommendation alerts | High | ✓ `_generate_forecast_recommendations()` with linear regression via `project_trend()`. Forecast cards with severity, ETA, trend rate, R² confidence in Dashboard. |
| E1 | Migration outcome tracking | High | ✓ `capture_pre_migration_snapshot()` + `record_migration_outcome()` + `update_post_migration_metrics()`. Outcomes panel in Dashboard with predicted vs actual comparison. |
| C4 | Recommendation history timeline | High | ✓ Score history sparkline timeline with configurable time range (6h-7d). Health trend + recommendation count overlay. |
| F2 | Workload pattern recognition | High | ✓ `analyze_workload_patterns()` with daily cycle, weekly cycle, and burst detection. `GET /api/workload-patterns` endpoint. Patterns panel in Dashboard diagnostics. |
| C2 | Interactive cluster map arrows | High | ✓ Migration flow visualization above cluster map showing source→target flows grouped by node pair with guest counts and hover details. |

---

## Technical Architecture Notes

### Data Flow for New Features

Several proposed features share data dependencies. This section maps those dependencies to avoid redundant implementation.

#### Score History as Foundation

Many features depend on historical score data. Implementing **I2 (Score History)** first unlocks:
- **F1 (Proactive Alerts)** — Needs historical scores to compute trend projections
- **C4 (Recommendation History)** — Needs historical snapshots to show timeline
- **E1 (Outcome Tracking)** — Needs pre-migration scores to compare against post-migration
- **I3 (Change Log)** — Needs previous recommendation state for diffing

**Recommended data structure:**

```python
# score_history.json — append-only, pruned to 30 days
{
    "snapshots": [
        {
            "timestamp": "ISO8601",
            "nodes": {
                "node_name": {
                    "score": float,
                    "suitability": float,
                    "cpu": float,
                    "mem": float,
                    "iowait": float,
                    "guest_count": int
                }
            },
            "cluster_health": float,
            "recommendation_count": int,
            "recommendation_vmids": [int]
        }
    ]
}
```

**Pruning strategy:** Keep all snapshots from the last 24 hours, then one per hour for 7 days, then one per 6 hours for 30 days. This gives fine-grained recent data and coarser long-term trends without unbounded growth.

#### Penalty Config Presets (D1) — Mapping Strategy

Presets should map to penalty config values using a multiplier approach rather than hardcoded values, so they scale with any future penalty additions:

```python
PRESET_MULTIPLIERS = {
    "conservative": {
        "penalty_multiplier": 0.6,       # Lower penalties = fewer recommendations
        "min_score_improvement": 25,      # Higher bar for recommending
        "weight_current": 0.3,            # Less reactive to current spikes
        "weight_7d": 0.4,                 # Heavier long-term weighting
    },
    "balanced": {
        "penalty_multiplier": 1.0,        # Default penalties
        "min_score_improvement": 15,
        "weight_current": 0.5,
        "weight_7d": 0.2,
    },
    "aggressive": {
        "penalty_multiplier": 1.5,        # Higher penalties = more recommendations
        "min_score_improvement": 10,       # Lower bar
        "weight_current": 0.7,            # Very reactive to current state
        "weight_7d": 0.1,                 # Less historical consideration
    }
}
```

Slider groups then adjust the multiplier within a range. "CPU Sensitivity" controls all CPU-related penalties proportionally. This avoids the problem of individual slider → individual penalty mappings becoming brittle.

#### Risk Scoring (H1) — Integration with Automation

Risk scores should feed directly into the automation system's decision-making:

```python
# In automigrate.py
def should_execute_migration(recommendation, config):
    risk = recommendation.get("risk_score", 50)
    confidence = recommendation.get("confidence_score", 0)

    # High risk migrations require higher confidence
    if risk > 75:
        return False  # Never auto-migrate very high risk
    if risk > 50:
        return confidence >= 90  # High risk needs very high confidence
    if risk > 25:
        return confidence >= config["min_confidence_score"]  # Normal threshold
    return confidence >= max(50, config["min_confidence_score"] - 10)  # Low risk, lower bar
```

This creates a 2D decision matrix (risk × confidence) that's more nuanced than a single confidence threshold.

### Storage Considerations

All new data files should follow existing patterns:
- JSON format, stored in `BASE_PATH`
- File-level atomic writes (write to temp file, then rename)
- Size caps with pruning (e.g., score_history: 30 days, feedback: 500 entries)
- Graceful degradation if files are missing or corrupt

**Estimated storage impact of new features:**

| Feature | Data File | Estimated Size | Growth Rate |
|---------|-----------|----------------|-------------|
| I2 Score History | `score_history.json` | ~500 KB | ~15 KB/day (4 nodes, 10-min intervals) |
| I3 Change Log | embedded in `recommendations_cache.json` | ~5 KB | Per generation, overwritten |
| E1 Outcome Tracking | embedded in `migration_history.json` | ~2 KB per migration | Per migration event |
| H3 Rollback | embedded in `migration_history.json` | ~0.5 KB per migration | Per migration event |

Total additional storage is negligible (< 1 MB/month for a typical cluster).

### Feature Dependency Graph

Features have interconnected dependencies. This graph identifies the critical path and parallelizable work:

```
                    ┌─────────────────────────────────────────────────┐
                    │           Foundation Layer                      │
                    │                                                 │
                    │   I2 (Score History) ◄──── Unlocks 5 features   │
                    │          │                                      │
                    │          ├──► F1 (Proactive Alerts)             │
                    │          ├──► C4 (History Timeline)             │
                    │          ├──► E1 (Outcome Tracking)             │
                    │          ├──► I3 (Change Log)                   │
                    │          └──► Success Metrics collection        │
                    │                                                 │
                    └─────────────────────────────────────────────────┘

    ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
    │ Independent      │     │ Builds on A1/B1   │     │ Builds on G1     │
    │ (can parallelize)│     │ (score details)   │     │ (conflict detect)│
    │                  │     │                   │     │                  │
    │ H1 Risk Scoring  │     │ A3 Penalty Viz    │     │ G2 Ordering      │
    │ F3 Capacity      │     │ B4 Impact Preview │     │ G3 Batch Impact  │
    │ I1 Diagnostics   │     │ C1 Card Redesign  │     │                  │
    │ J2 API Filtering │     │ C3 Score Legend    │     │                  │
    │ J3 Export        │     │                   │     │                  │
    └─────────────────┘     └──────────────────┘     └──────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │ Frontend-only completions (no new backend needed)              │
    │                                                                │
    │ D2 UI: Wire simulatePenaltyConfig() into SettingsPage          │
    │ D3 UI: Render threshold suggestions as actionable banner       │
    │ D1 UI: Move preset buttons into SettingsPage, add sliders      │
    │ C3 UI: Score legend panel with live data                       │
    │                                                                │
    └─────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │ Backend exists, needs frontend integration                     │
    │                                                                │
    │ D2: POST /api/penalty-config/simulate ──► SettingsPage panel   │
    │ D3: threshold_suggestions in response ──► Dashboard banner     │
    │ A3: penalty_categories in node-scores ──► Chart.js component   │
    │ J1: notifications.py event type ──► expand event variants      │
    │                                                                │
    └─────────────────────────────────────────────────────────────────┘
```

**Critical path for maximum feature unlock:** I2 → {F1, C4, E1, I3} in parallel.

**Quickest wins (frontend-only wiring):** D2, D3, D1 slider integration.

### Frontend/Backend Parity Tracking

A key pattern in the current codebase: several backend APIs exist with no corresponding frontend integration. This table tracks parity:

| API Endpoint | Backend Status | `client.js` Function | Frontend UI |
|---|---|---|---|
| `POST /api/recommendations` | Complete | `generateRecommendations()` | Complete |
| `GET /api/recommendations` | Complete | `fetchCachedRecommendations()` | Complete |
| `POST /api/node-scores` | Complete | `fetchNodeScores()` | Partial (data fetched, no chart) |
| `POST /api/guest/{vmid}/migration-options` | Complete | `fetchGuestMigrationOptions()` | Partial (data fetched, panel exists) |
| `POST /api/penalty-config/simulate` | Complete | `simulatePenaltyConfig()` | ✓ Complete — "What-If Simulator" panel in SettingsPage penalty section |
| `GET /api/recommendations/threshold-suggestions` | Complete | Included in POST response | ✓ Complete — Actionable banner with "Apply All" in Dashboard |
| `POST /api/recommendations/feedback` | Complete | `submitRecommendationFeedback()` | Complete |
| `GET /api/recommendations/feedback` | Complete | Not in `client.js` | **Not available** — no way to view feedback analytics |
| `POST /api/penalty-config/presets/{name}` | Complete | `applyPenaltyPreset()` | ✓ Complete — Buttons in `SettingsPage.jsx` |
| `POST /api/penalty-config/reset` | Complete | `resetPenaltyConfig()` | Complete (in SettingsPage) |

**Remaining integration gaps** (sorted by impact):
1. **Feedback analytics** — Low effort. Add `client.js` function + summary display somewhere in Settings.

### Testing Strategy for New Features

ProxBalance currently has limited formal testing. As the recommendation engine grows more comjellyfin, the risk of regressions increases. This section proposes testing approaches for each improvement area.

#### Unit Testing Priorities

| Module | Test Focus | Priority |
|--------|-----------|----------|
| `proxbalance/scoring.py` | Penalty calculation determinism — given specific node metrics, verify exact penalty scores | **Critical** |
| `proxbalance/recommendations.py` | Recommendation generation — verify skip reasons, confidence calculation, structured reasons | **Critical** |
| `proxbalance/scoring.py` | `predict_post_migration_load()` accuracy — verify CPU/memory predictions | High |
| `proxbalance/recommendations.py` | Distribution balancing — verify guest count thresholds and candidate selection | Medium |
| `proxbalance/recommendations.py` | Affinity companion generation — verify group tracking and conflict detection | Medium |

**Recommended approach:** Create a `tests/` directory with pytest fixtures that provide deterministic cluster data (nodes with known metrics, guests with known resource usage). Assert exact penalty values and recommendation outcomes.

```python
# Example test structure
def test_high_cpu_penalty():
    """Node at 75% CPU with 60% threshold should receive cpu_high_penalty."""
    node = make_node(cpu=75, mem=40, iowait=5)
    guest = make_guest(cores=1, mem_gb=1)
    score, details = calculate_target_node_score(
        node, guest, {}, cpu_threshold=60, mem_threshold=70, return_details=True
    )
    assert details["penalties"]["current_cpu"] == 20  # cpu_high_penalty default

def test_skipped_guest_ha_managed():
    """HA-managed guests should be skipped with 'ha_managed' reason."""
    result = generate_recommendations(nodes, guests_with_ha, 60, 70, 30, set())
    skipped = {g["vmid"]: g for g in result["skipped_guests"]}
    assert 100 in skipped
    assert skipped[100]["reason"] == "ha_managed"
```

#### Integration Testing

For features that span backend + frontend:

| Feature | Test Approach |
|---------|--------------|
| Penalty simulator (D2) | API test: POST proposed config, verify diff output matches expected changes |
| Feedback system (E2) | API test: POST feedback, GET analytics, verify aggregation |
| Score history (I2) | Integration test: generate recommendations twice, verify snapshot appended |
| Export (J3) | API test: GET CSV export, parse and verify column headers and row counts |

#### Frontend Testing

Extend the existing `test-page-load.js` Puppeteer test to cover recommendation-specific scenarios:

| Test | What to Verify |
|------|----------------|
| Recommendation card render | Cards appear with structured reason, confidence, score breakdown toggle |
| Skipped guests expand | Clicking "Not Recommended" header expands section, shows skip reasons |
| Feedback submission | Clicking thumbs up/down changes button state, shows confirmation |
| Score breakdown toggle | Expanding breakdown shows source/target penalty tables |
| Preset buttons | Clicking preset changes active state and reloads penalty config |

#### Regression Testing for Scoring Changes

Any change to `scoring.py` or penalty weights carries risk of shifting all recommendations. Before deploying scoring changes:

1. **Snapshot current recommendations** — Save the full recommendation output for a reference cluster dataset
2. **Apply the change** — Run recommendation generation with the same input data
3. **Diff the output** — Compare recommendation counts, VMIDs, score improvements, skip reasons
4. **Review the diff** — Verify changes are intentional (e.g., "3 new recommendations appeared because IOWait penalty increased")

This can be automated as a CI check if a reference dataset is committed to the repository.

---

## Success Metrics

How to measure whether these improvements are effective.

### User Experience Metrics

| Metric | Measurement | Target |
|--------|-------------|--------|
| **Recommendation acceptance rate** | Migrations executed / recommendations generated | > 40% (up from unmeasured) |
| **Feedback positivity** | Helpful ratings / total ratings | > 75% |
| **Time to action** | Time from recommendation generation to user decision | < 5 minutes for urgent items |
| **Configuration confidence** | Users who change penalty settings from default | > 30% (indicates understanding) |
| **"Why Not?" usage** | Expansion rate of skipped guests section | > 20% of sessions |

### System Quality Metrics

| Metric | Measurement | Target |
|--------|-------------|--------|
| **Prediction accuracy** | Actual post-migration score vs. predicted score | > 80% within ±10 points |
| **False positive rate** | Recommendations rated "not helpful" / total | < 15% |
| **Conflict rate** | Migrations that fail or cause target overload | < 5% |
| **Stale recommendation rate** | Recommendations invalid by execution time | < 10% |
| **Score improvement realization** | Actual improvement / predicted improvement | > 70% |

### Cluster Health Metrics

| Metric | Measurement | Target |
|--------|-------------|--------|
| **Score variance reduction** | Std. dev. of node scores after migrations | < 15 points across nodes |
| **Threshold violations** | Nodes above CPU/memory thresholds | 0 sustained (transient spikes acceptable) |
| **Migration churn** | Guests migrated back within 24 hours | < 5% of migrations |
| **Cluster health trend** | 7-day moving average of cluster health score | Stable or improving |

### How to Collect

Most of these can be derived from data that will exist once **I2 (Score History)** and **E1 (Outcome Tracking)** are implemented:
- Acceptance rate: compare recommendation cache timestamps with migration history
- Prediction accuracy: compare score_details at generation time with score at generation + 30 minutes
- Score variance: calculated from score history snapshots
- Migration churn: check migration history for same VMID migrating back within 24h

A monthly health report could aggregate these metrics and surface them in the dashboard or via webhook notification.
