# Scoring Algorithm

This document describes ProxBalance's penalty-based scoring system for evaluating migration targets.

---

## Overview

ProxBalance uses cumulative penalties instead of hard disqualifications. Every online node remains a potential migration target, but undesirable conditions increase a node's penalty score. Nodes are ranked by penalty (lowest = best), then scores are converted to suitability ratings (0-100%) for display.

### Design Principles

1. **No hard disqualifications** -- every online node is always a candidate
2. **Cumulative penalties** -- multiple factors add up
3. **Relative comparison** -- nodes are ranked against each other, not against absolute thresholds
4. **Flexible** -- overloaded nodes can always be evacuated
5. **Configurable** -- penalty weights can be tuned through the web UI

---

## Suitability Rating

The suitability rating converts raw penalty scores into a percentage:

```
Suitability = 100 - ((node_penalty - best_penalty) / (worst_penalty - best_penalty) * 100)
```

- **100%** = best available target (lowest penalty)
- **75-99%** = good target
- **50-74%** = acceptable target
- **25-49%** = poor target
- **0%** = worst available target (highest penalty)

The best node always gets 100% and the worst gets 0%. Other nodes are distributed proportionally.

---

## Penalty Factors

### CPU usage

Nodes with CPU above 70% receive 10 penalty points per percentage point over the threshold.

```
if cpu > 70%: penalty += (cpu - 70) * 10
```

Example: 85% CPU = 150 points.

### Memory usage

Same formula as CPU, triggered above 70%.

```
if memory > 70%: penalty += (memory - 70) * 10
```

### IOWait

Higher weight (20x) because I/O bottlenecks severely impact VM performance.

```
if iowait > 5%: penalty += iowait * 20
```

Example: 15% IOWait = 300 points.

### Guest count

Discourages concentrating too many guests on one node.

```
penalty += guest_count * 5
```

### Maintenance mode

Massive penalty to effectively exclude maintenance nodes unless no alternatives exist.

```
if maintenance: penalty += 10000
```

### Storage incompatibility

High penalty when the target node lacks required storage, but not infinite -- emergency evacuations can still use incompatible nodes.

```
if missing_storage: penalty += 5000
```

### Anti-affinity violation

Strong discouragement when the target already hosts a guest with the same `exclude_*` tag.

```
if affinity_conflict: penalty += 1000
```

### Source node

Prevents recommending migration to the node the guest is already on.

```
if target == source: penalty += 999999
```

---

## Recommendation Generation

### Process

1. **Identify guests needing migration**: Source node overloaded (CPU > 80% or memory > 80%), node in maintenance, or anti-affinity violations
2. **Score all targets**: For each candidate guest, calculate penalties for every online node
3. **Rank by penalty**: Sort targets lowest-first
4. **Convert to suitability ratings**: Normalize to 0-100%
5. **Generate recommendations**: Create migration suggestions for guests where the best target meets the minimum threshold

### Execution priority

When multiple migrations are recommended:

1. Maintenance evacuations (highest)
2. Anti-affinity violations
3. Overloaded node evacuations
4. Load balancing optimizations (lowest)

---

## Time Period Weights

The algorithm blends current metrics with historical data:

```
weighted_value = current * weight_current + avg_24h * weight_24h + avg_7d * weight_7d
```

Default weights:
- Current: 0.5
- 24-hour average: 0.3
- 7-day average: 0.2

Weights must sum to 1.0. Configurable through Settings > Penalty Scoring Configuration.

**Presets:**
- Balanced (default): `0.5 / 0.3 / 0.2`
- Short-term focus: `0.6 / 0.4 / 0.0`
- Historical focus: `0.2 / 0.5 / 0.3`

---

## Configuration

### Web UI

1. Open Settings
2. Expand "Penalty Scoring Configuration"
3. Adjust time period weights and penalty values
4. Click "Save Penalty Config"

### Minimum suitability threshold

Controls the minimum rating for automated migrations to execute. Set in the automation rules:

| Setting | Threshold | Behavior |
|---------|-----------|----------|
| Conservative | 80-90% | Fewer migrations, only excellent targets |
| Balanced | 75% (default) | Standard operation |
| Aggressive | 50-60% | More migrations, accepts suboptimal targets |

---

## Examples

### Simple load balancing

VM 101 on node1 (CPU 85%, memory 70%). Two targets available:

| Node | CPU penalty | Memory penalty | Guest count penalty | Total |
|------|------------|----------------|-------------------|-------|
| node2 (CPU 40%, 12 guests) | 0 | 0 | 60 | 60 |
| node3 (CPU 60%, 8 guests) | 0 | 0 | 40 | **40** |

Result: node3 = 100% suitability, node2 = 0%. Migrate to node3.

### IOWait impact

VM 102 needs migration. Two targets:

| Node | CPU penalty | IOWait penalty | Guest count penalty | Total |
|------|------------|----------------|-------------------|-------|
| node2 (CPU 50%, IOWait 15%) | 0 | 300 | 50 | 350 |
| node3 (CPU 65%, IOWait 3%) | 0 | 0 | 45 | **45** |

Result: node3 = 100% despite higher CPU, because IOWait penalties dominate. Migrate to node3.

### Anti-affinity

VM 201 tagged `exclude_firewall`. VM 202 (same tag) already on node2:

| Node | Resource penalties | Affinity penalty | Total |
|------|-------------------|-----------------|-------|
| node2 (CPU 40%) | 50 | 1000 | 1050 |
| node3 (CPU 60%) | 60 | 0 | **60** |

Result: node3 = 100%. The affinity violation makes node2 unsuitable.

### Maintenance evacuation

Node1 in maintenance. Both remaining nodes are loaded:

| Node | CPU penalty | Memory penalty | IOWait penalty | Total |
|------|------------|----------------|----------------|-------|
| node2 (CPU 75%, mem 80%, IOWait 8%) | 50 | 100 | 160 | **310** |
| node3 (CPU 85%, mem 90%, IOWait 12%) | 150 | 200 | 240 | 590 |

Result: node2 = 100%, node3 = 0%. No hard disqualification means evacuation always succeeds -- guests migrate to node2 first, and to node3 once node2 penalties increase.

---

[Back to Documentation](README.md)
