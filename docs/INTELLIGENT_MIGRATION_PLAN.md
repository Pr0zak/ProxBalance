# Intelligent Migration System

ProxBalance's intelligent migration system adds learning capabilities to the automigrate engine. Instead of treating each migration decision as independent, it tracks patterns, outcomes, and trends to make progressively better decisions over time.

All features are opt-in with individual toggles under `intelligent_migrations` in `config.json`, defaulting to disabled. This ensures zero behavioral change for existing deployments until administrators explicitly enable each capability.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Phase 1: Recommendation Persistence Filter](#phase-1-recommendation-persistence-filter)
3. [Phase 2: Close the Feedback Loops](#phase-2-close-the-feedback-loops)
4. [Phase 3: Guest-Level Intelligence](#phase-3-guest-level-intelligence)
5. [Phase 4: Scoring Intelligence](#phase-4-scoring-intelligence)
6. [Configuration Reference](#configuration-reference)
7. [Data Files](#data-files)
8. [Decision Action Types](#decision-action-types)
9. [Filter Pipeline Order](#filter-pipeline-order)
10. [Implementation Status](#implementation-status)

---

## Architecture

The intelligent migration system extends the existing automigrate pipeline with feedback loops that connect outcomes back to scoring and filtering decisions.

```
                          +-------------------+
                          |   Collector API   |
                          | (collector_api.py)|
                          +--------+----------+
                                   |
                          RRD metrics, guest stats
                                   |
                                   v
                          +-------------------+
                          | Guest Profiles    |
                          | (guest_profiles.py)|
                          +--------+----------+
                                   |
                     behavioral classification
                     (steady/bursty/growing/cyclical)
                                   |
                                   v
+------------------+      +-------------------+
| Seasonal         |----->|   Scoring Engine  |
| Baselines        |      |   (scoring.py)    |
| (score_history)  |      +--------+----------+
+------------------+               |
                          penalty scores, suitability
                                   |
                                   v
                          +-------------------+
                          | Recommendations   |
                          | (recommendations.py)|
                          +--------+----------+
                                   |
                          candidates with confidence,
                          risk, conflict flags
                                   |
                                   v
                          +-------------------+
                          | Automigrate       |
                          | Filter Pipeline   |
                          | (automigrate.py)  |
                          +--------+----------+
                                   |
                     persistence, risk gating,
                     trend awareness, outcome learning,
                     pattern suppression, cycle detection,
                     cost-benefit, guest success tracking
                                   |
                                   v
                          +-------------------+
                          | Migration         |
                          | Execution         |
                          | (migrations.py)   |
                          +--------+----------+
                                   |
                          pre/post metrics captured
                                   |
                                   v
                          +-------------------+
                          | Outcome Tracking  |
                          | (outcomes.py)     |
                          +---+--------+------+
                              |        |
               success rates  |        |  trend data
               per node pair  |        |  per guest
                              v        v
                     [Feeds back into Scoring
                      and Filter Pipeline on
                      subsequent runs]
```

---

## Phase 1: Recommendation Persistence Filter

### Problem

Transient metric spikes (e.g., a brief backup job) can trigger one-time recommendations that the automigrate engine acts on immediately. By the time the migration completes, the spike has passed and the migration was unnecessary.

### Solution

Track recommendations across consecutive automigrate runs. Only execute a migration after the same recommendation has been observed N consecutive times within a configurable time window.

### Behavior

1. Each automigrate run generates fresh recommendations from the scoring engine.
2. The persistence filter compares current recommendations against `recommendation_tracking.json`.
3. A recommendation that matches a tracked entry (same guest, same source node, same or better target) increments its observation count.
4. New recommendations start at observation count 1 with status `observing`.
5. Only recommendations reaching `observation_periods` consecutive observations within `observation_window_hours` are promoted to candidates for execution.
6. Stale entries (not seen in the current run, or older than the observation window) are pruned.

### Configuration

```json
{
  "intelligent_migrations": {
    "enabled": true,
    "observation_periods": 3,
    "observation_window_hours": 1,
    "minimum_data_collection_hours": 0
  }
}
```

- **`enabled`** -- Master toggle for the persistence filter.
- **`observation_periods`** -- How many consecutive runs must recommend the same migration (default: 3).
- **`observation_window_hours`** -- Maximum age for observations to count as consecutive (default: 1 hour).
- **`minimum_data_collection_hours`** -- Minimum time the system must have been tracking before any migration is allowed (default: 0, no delay).

---

## Phase 2: Close the Feedback Loops

Phase 2 adds six sub-features that connect existing data sources (conflicts, trends, outcomes, patterns) into the automigrate filtering pipeline.

### 2a: Conflict Detection

Skips recommendations where `has_conflict` is `true` in the recommendation data. Conflicts are detected by `recommendation_analysis.py` when multiple recommendations target the same guest or would overload a target node.

**Always active** -- no configuration toggle. Conflict detection is a safety mechanism.

### 2b: Risk-Adjusted Confidence

Standard migrations require confidence >= the configured threshold (e.g., 75). High-risk migrations (large VMs, high-memory guests, guests with many disks) require confidence >= threshold * `risk_confidence_multiplier`.

```json
{
  "intelligent_migrations": {
    "risk_gating_enabled": true,
    "risk_confidence_multiplier": 1.2
  }
}
```

A migration flagged as high-risk with a multiplier of 1.2 and a threshold of 75 would require confidence >= 90.

### 2c: Trend-Aware Filtering

Consults the source node's CPU trend data from `forecasting.py`. If the source node's CPU load trend is falling (improving on its own), the migration is deferred with action type `deferred` rather than executed.

```json
{
  "intelligent_migrations": {
    "trend_awareness_enabled": true
  }
}
```

### 2d: Outcome-Based Learning

Consults `migration_outcomes.json` for historical success rates between specific node pairs. If a source-target node pair has a poor track record (repeated failures or regressions), the migration is filtered.

```json
{
  "intelligent_migrations": {
    "outcome_learning_enabled": true
  }
}
```

### 2e: Workload Pattern Suppression

Uses `patterns.py` workload pattern detection to identify known daily peak periods. Migrations are deferred during detected peak windows to avoid compounding load during high-utilization periods.

```json
{
  "intelligent_migrations": {
    "pattern_suppression_enabled": true
  }
}
```

### 2f: In-Flight Migration Awareness

When a batch of migrations executes, subsequent recommendation regeneration within the same run accounts for guests that have already been migrated. This prevents stale source-node data from producing contradictory recommendations.

**Always active** -- no configuration toggle. This is a correctness fix for batch execution.

---

## Phase 3: Guest-Level Intelligence

Phase 3 extends the data collector to build per-guest behavioral profiles, enabling smarter load predictions.

### 3a: Per-Guest RRD History

The collector (`collector_api.py`) persists per-guest RRD history with computed statistics: min, max, average, and p95 for both CPU and memory over the collection window. This data feeds into guest profiling.

### 3b: Guest Behavioral Profiling

A dedicated module (`guest_profiles.py`) classifies each guest into one of four behavioral categories based on historical metrics:

| Profile | Characteristics | Migration Implication |
|---------|----------------|----------------------|
| **Steady** | Low variance, consistent utilization | Safe to migrate; use average load for predictions |
| **Bursty** | High variance, frequent spikes | Use p95 load for target node capacity checks |
| **Growing** | Upward trend over time | Project 48h growth for target node headroom |
| **Cyclical** | Regular daily/weekly patterns | Time migrations to off-peak periods |

Profiles are stored in `guest_profiles.json` and updated on each collection run.

### 3c: Profile-Aware Load Prediction

The recommendation engine uses guest profiles to improve target node load predictions:

- **Steady** guests: predicted load = average utilization
- **Bursty** guests: predicted load = p95 utilization (prevents target overload from spikes)
- **Growing** guests: predicted load = current + projected 48-hour growth
- **Cyclical** guests: predicted load = peak-period utilization

---

## Phase 4: Scoring Intelligence

Phase 4 adds intelligence directly into the scoring and filtering layers to prevent unnecessary migrations and detect systemic patterns.

### 4a: Cluster Convergence

When all node scores are within a tight band (spread <= `cluster_convergence_threshold`) and no individual threshold is exceeded, the system suppresses recommendations entirely. A well-balanced cluster should not generate migration churn.

```json
{
  "penalty_config": {
    "cluster_convergence_threshold": 8.0
  }
}
```

### 4b: Cost-Benefit Ratio

Weighs the expected score improvement against the estimated migration duration (based on guest disk size and network bandwidth). Migrations where the benefit does not justify the cost are filtered.

```json
{
  "intelligent_migrations": {
    "cost_benefit_enabled": true,
    "min_cost_benefit_ratio": 1.0
  }
}
```

A ratio of 1.0 means the score improvement must at least equal the normalized migration cost. Higher values require proportionally greater benefit.

### 4c: Multi-Node Cycle Detection

Extends the existing 2-node rollback detection to detect cycles across 3+ nodes (e.g., guest migrated A->B->C->A). Cycles indicate the scoring engine is oscillating and the migration provides no lasting benefit.

```json
{
  "intelligent_migrations": {
    "cycle_detection_enabled": true,
    "cycle_window_hours": 48
  }
}
```

### 4d: Seasonal Baseline Learning

Compares current node metrics against learned per-node, per-hour-of-day baselines derived from `score_history.json`. Deviations beyond `sigma_threshold` standard deviations trigger recommendations; metrics within the seasonal norm are treated as expected behavior.

```json
{
  "penalty_config": {
    "seasonal_baseline": {
      "enabled": true,
      "sigma_threshold": 2.0
    }
  }
}
```

### 4e: Per-Guest Success Rate

Tracks migration success/failure rates per guest across all historical migrations. Guests with poor migration track records (repeated failures, post-migration regressions) are deprioritized in recommendation ranking.

```json
{
  "intelligent_migrations": {
    "guest_success_tracking_enabled": true
  }
}
```

---

## Configuration Reference

### `intelligent_migrations` Options

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `enabled` | bool | `false` | -- | Master toggle for persistence filter |
| `observation_periods` | int | `3` | 2-10 | Consecutive runs a recommendation must appear |
| `observation_window_hours` | float | `1` | 1-48 | Maximum age for observations to count |
| `minimum_data_collection_hours` | float | `0` | 0-48 | Minimum tracking time before acting |
| `risk_gating_enabled` | bool | `false` | -- | Enable risk-adjusted confidence gating |
| `risk_confidence_multiplier` | float | `1.2` | 1.0-2.0 | Confidence multiplier for high-risk migrations |
| `trend_awareness_enabled` | bool | `false` | -- | Enable trend-aware filtering |
| `outcome_learning_enabled` | bool | `false` | -- | Enable outcome-based node pair learning |
| `pattern_suppression_enabled` | bool | `false` | -- | Enable workload pattern suppression |
| `cost_benefit_enabled` | bool | `false` | -- | Enable cost-benefit ratio check |
| `min_cost_benefit_ratio` | float | `1.0` | 0.5-5.0 | Minimum ratio for migration to proceed |
| `cycle_detection_enabled` | bool | `true` | -- | Enable multi-node cycle detection |
| `cycle_window_hours` | int | `48` | 12-168 | Time window for cycle detection (hours) |
| `guest_success_tracking_enabled` | bool | `false` | -- | Enable per-guest success rate tracking |

### `penalty_config` Options

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `cluster_convergence_threshold` | float | `8.0` | 1.0-20.0 | Max score spread before suppressing recommendations |
| `seasonal_baseline.enabled` | bool | `false` | -- | Enable seasonal baseline comparisons |
| `seasonal_baseline.sigma_threshold` | float | `2.0` | 1.0-5.0 | Standard deviations before flagging anomaly |

---

## Data Files

| File | Created By | Purpose |
|------|-----------|---------|
| `recommendation_tracking.json` | `automigrate.py` | Phase 1 persistence tracking -- observation counts, timestamps, and status per recommendation |
| `guest_profiles.json` | `collector_api.py` | Per-guest behavioral profiles (steady/bursty/growing/cyclical) with RRD statistics |
| `migration_outcomes.json` | `outcomes.py` (existing) | Pre/post migration metrics for outcome-based learning |
| `score_history.json` | `forecasting.py` (existing) | Node score snapshots used for trend analysis and seasonal baselines |

All files are stored in the application data directory alongside `cluster_cache.json` and `config.json`. Files are created on first use and tolerate missing or empty states gracefully.

---

## Decision Action Types

The `last_run_summary` in automigrate results reports a decision action for each evaluated recommendation. The intelligent migration system introduces two new action types (`observing` and `deferred`) alongside the existing ones.

| Action | Source | Color | Meaning |
|--------|--------|-------|---------|
| `executed` | Existing | Green | Migration completed successfully |
| `pending` | Existing | Blue | Migration is in progress |
| `failed` | Existing | Red | Migration failed during execution |
| `filtered` | Existing + Phase 2 | Red | Blocked by a safety or filtering rule |
| `skipped` | Existing | Gray | Lower priority, not selected for this run |
| `observing` | Phase 1 | Cyan | Tracking recommendation, not yet at threshold |
| `deferred` | Phase 2c/2e | Amber | Problem may resolve naturally; check next run |

The `reason` field in each decision provides specifics (e.g., `"observing: 2/3 periods"`, `"deferred: source CPU trend falling"`, `"filtered: cycle detected A->B->C->A"`).

---

## Filter Pipeline Order

The automigrate engine evaluates each recommendation through the following filter pipeline in order. A recommendation that fails any step is assigned the corresponding action type and does not proceed further.

| Order | Filter | Phase | Action on Fail |
|-------|--------|-------|----------------|
| 1 | Cooldown check | Existing | `filtered` |
| 2 | Rollback detection (2-node) | Existing | `filtered` |
| 3 | Multi-node cycle detection | Phase 4c | `filtered` |
| 4 | Confidence threshold | Existing | `filtered` |
| 5 | Conflict detection | Phase 2a | `filtered` |
| 6 | Risk-adjusted confidence | Phase 2b | `filtered` |
| 7 | Trend-aware filtering | Phase 2c | `deferred` |
| 8 | Outcome-based learning | Phase 2d | `filtered` |
| 9 | Workload pattern suppression | Phase 2e | `deferred` |
| 10 | Tag and affinity checks | Existing | `filtered` |
| 11 | Cost-benefit ratio | Phase 4b | `filtered` |
| 12 | Per-guest success rate | Phase 4e | `filtered` |
| 13 | Resource improvement validation | Existing | `filtered` |

Recommendations that pass all filters proceed to execution (subject to `max_migrations_per_run` and `max_concurrent_migrations` limits).

---

## Implementation Status

### Phase 1: Recommendation Persistence Filter

- [x] Recommendation tracking data structure and storage (`recommendation_tracking.json`)
- [x] Observation counting with consecutive run matching
- [x] Configurable observation periods and time window
- [x] Stale entry pruning
- [x] `observing` action type in decision reporting
- [x] `minimum_data_collection_hours` grace period

### Phase 2: Close the Feedback Loops

- [x] 2a: Conflict detection integration (always active)
- [x] 2b: Risk-adjusted confidence gating with configurable multiplier
- [x] 2c: Trend-aware filtering with `deferred` action type
- [x] 2d: Outcome-based learning from `migration_outcomes.json`
- [x] 2e: Workload pattern suppression during detected peak periods
- [x] 2f: In-flight migration awareness for batch execution

### Phase 3: Guest-Level Intelligence

- [x] 3a: Per-guest RRD history persistence (min/max/avg/p95)
- [x] 3b: Guest behavioral profiling module (`guest_profiles.py`)
- [x] 3c: Profile-aware load prediction in recommendation engine

### Phase 4: Scoring Intelligence

- [x] 4a: Cluster convergence suppression with configurable threshold
- [x] 4b: Cost-benefit ratio calculation and filtering
- [x] 4c: Multi-node cycle detection (A->B->C->A patterns)
- [x] 4d: Seasonal baseline learning from score history
- [x] 4e: Per-guest success rate tracking and deprioritization

---

## Related Documentation

- [Automated Migrations](AUTOMATION.md) -- Core automigrate configuration and scheduling
- [Scoring Algorithm](SCORING_ALGORITHM.md) -- Penalty-based scoring system details
- [Recommendation Improvements Plan](RECOMMENDATION_IMPROVEMENTS_PLAN.md) -- Scoring transparency and UX improvements
- [Configuration](CONFIGURATION.md) -- Full configuration reference
