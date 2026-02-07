# Migration Recommendation & Scoring Improvements Plan

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
Score Breakdown for VM 100 → pve2
─────────────────────────────────────────────
Source Node (pve1)          Target Node (pve2)
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
  "summary": "VM 100 should move to pve2 because pve1 has high CPU usage (78%) with an upward trend, while pve2 has significant headroom (42% used)."
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
    migration_complexity,       # 15% — Guest size, storage complexity, bind mounts
)
```

Each factor maps to 0-100:
- **Score improvement**: 15pt → 30, 25pt → 50, 40pt → 75, 60pt+ → 100
- **Target headroom**: Maps remaining capacity after migration (more room = higher confidence)
- **Historical stability**: If the guest's current node was fine yesterday, maybe less urgent
- **Migration complexity**: Small VMs with simple storage = high confidence; large VMs with many disks = lower

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
      "detail": "Best target (pve3) would improve score by only 7 points (minimum: 15)",
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
│  pve1  ────────────────────────▶  pve2              │
│  CPU: 78%                         CPU: 42%          │
│  Mem: 65%                         Mem: 51%          │
│                                                     │
│  ┌─ Score Improvement ─────────────────────────┐    │
│  │  ████████████████████░░░░░  +55 pts (Great)  │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  Reason: High CPU on pve1 (78%, trending up).       │
│          pve2 has 58% CPU headroom.                 │
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
│  • VM 300 → pve3 (improvement: 18 pts, was 7 pts)     │
│  • VM 450 → pve2 (improvement: 22 pts, was 12 pts)    │
│  • CT 600 → pve4 (improvement: 16 pts, was 9 pts)     │
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
Migration VM 100: pve1 → pve2
────────────────────────────
Predicted improvement: +55 pts
Actual improvement:    +48 pts (87% accuracy)

pve1 CPU: 78% → 62% (-16%)  ✓ Improved
pve2 CPU: 42% → 49% (+7%)   ✓ Within expected range
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

### Phase 1 — Quick Wins (Low complexity, high impact)
| Item | Description | Effort |
|------|-------------|--------|
| A1 | Score breakdown panel | Medium — Backend data exists, needs exposure + UI |
| B1 | Structured reason strings | Low — Backend change only, UI rendering |
| C3 | Score legend & education panel | Low — Frontend only |
| D3 | Threshold suggestion integration | Low — Data exists, needs UI |
| E3 | Recommendation digest/summary | Medium — Aggregation logic + UI |

### Phase 2 — Core Improvements (Medium complexity)
| Item | Description | Effort |
|------|-------------|--------|
| B2 | Reworked confidence score | Medium — New formula, testing needed |
| B3 | "Why Not?" explanations | Medium — Collection during generation + new endpoint |
| C1 | Recommendation card redesign | Medium — Significant UI work |
| D1 | Penalty config presets + sliders | Medium — Preset mapping + UI redesign |

### Phase 3 — Advanced Features (Higher complexity)
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
- Rule interactions become complex with 10+ rules
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
