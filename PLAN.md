# Plan: Memory & Scoring Improvements

## Context

Memory and CPU were historically weighted identically. The previous commit reduced
memory penalties to ~25-50% of CPU. These 5 improvements build on that by adding
structural changes to how memory, CPU variance, and IOWait drive migration decisions.

---

## Phase 1: Hard Memory Capacity Gate (can-it-fit)

**Problem**: Currently there is no hard check preventing the system from recommending
a target node that physically cannot fit a guest's memory allocation. It relies on
predicted memory percentage penalties, which can still allow recommendations where
the guest won't fit.

**What changes**:

- **`proxbalance/recommendations.py`** — In the target node loop (line ~499-540),
  add a capacity check **before** calling `calculate_target_node_score()`:
  ```python
  # Hard memory capacity gate: skip targets that can't physically fit this guest
  guest_mem_max_gb = guest.get("mem_max_gb", guest.get("mem_used_gb", 0))
  target_committed_mem_gb = sum(
      guests.get(str(gid), guests.get(gid, {})).get("mem_max_gb", 0)
      for gid in tgt_node.get("guests", [])
  )
  target_total_mem_gb = tgt_node.get("total_mem_gb", 1)
  # Leave 5% headroom for host OS overhead
  if (target_committed_mem_gb + guest_mem_max_gb) > (target_total_mem_gb * 0.95):
      skip_reasons_per_target.append(f"{tgt_name}: insufficient memory capacity")
      continue
  ```
- This is a **hard gate** — the guest physically can't fit, so no scoring needed.
- The 5% host OS headroom is conservative and protects against OOM.

**Files**: `proxbalance/recommendations.py`
**Risk**: Low — adds a filter before existing scoring, doesn't change scoring math.

---

## Phase 2: Track Committed Memory per Node

**Problem**: The system tracks *used* memory (which fluctuates with ballooning) but
not *committed/allocated* memory (which is the real constraint). A node might show
60% used memory but have 95% committed — it can't accept more guests.

**What changes**:

- **`collector_api.py`** — In `_process_single_node()`, calculate and store
  `committed_mem_gb` as the sum of all guest `mem_max_gb` values on that node.
  Add to the node data dict returned by the collector.
  ```python
  # Calculate committed (allocated) memory across all guests
  committed_mem_gb = sum(g.get("maxmem", 0) for g in node_guests) / (1024**3)
  node_data["committed_mem_gb"] = round(committed_mem_gb, 2)
  node_data["mem_overcommit_ratio"] = round(
      committed_mem_gb / total_mem_gb, 2
  ) if total_mem_gb > 0 else 0
  ```

- **`proxbalance/scoring.py`** — In `calculate_target_node_score()`, add an
  overcommit penalty when ratio > 1.0 (more committed than physical):
  ```python
  overcommit = node.get("mem_overcommit_ratio", 0)
  if overcommit > 1.2:
      penalty_breakdown["mem_overcommit"] = 40
  elif overcommit > 1.0:
      penalty_breakdown["mem_overcommit"] = 15
  ```

- **`proxbalance/scoring.py`** `DEFAULT_PENALTY_CONFIG` — Add new penalty keys:
  ```python
  "mem_overcommit_penalty": 15,       # Penalty when overcommit ratio > 1.0
  "mem_overcommit_high_penalty": 40,  # Penalty when overcommit ratio > 1.2
  ```

**Files**: `collector_api.py`, `proxbalance/scoring.py`
**Risk**: Medium — changes collector output format. Older cached data won't have the
new fields, so all reads must use `.get()` with safe defaults (already the pattern).

---

## Phase 3: CPU Variance-Weighted Scoring

**Problem**: The stability bonus is currently capped at -10 points, which barely
affects a total score that can reach 300+. A node with wild CPU swings gets almost
the same treatment as a steady node.

**What changes**:

- **`proxbalance/scoring.py`** — In `calculate_target_node_score()`, replace the
  flat stability bonus (`-10/-5/0`) with a **multiplicative CPU penalty factor**:
  ```python
  # Stability factor: stable nodes get CPU penalties reduced, volatile nodes inflated
  # stability 0-40 (volatile): multiply CPU penalties by 1.3
  # stability 40-60 (moderate): no change (1.0)
  # stability 60-80 (good): multiply CPU penalties by 0.85
  # stability 80-100 (excellent): multiply CPU penalties by 0.7
  if node_stability >= 80:
      cpu_stability_factor = 0.7
  elif node_stability >= 60:
      cpu_stability_factor = 0.85
  elif node_stability < 40:
      cpu_stability_factor = 1.3
  else:
      cpu_stability_factor = 1.0

  # Apply to all CPU-related penalties
  for cpu_key in ["current_cpu", "sustained_cpu", "cpu_trend", "cpu_spikes",
                   "predicted_cpu"]:
      if cpu_key in penalty_breakdown:
          penalty_breakdown[cpu_key] = int(
              round(penalty_breakdown[cpu_key] * cpu_stability_factor)
          )
  ```
  This means a volatile node (stability < 40) has its CPU penalties inflated by 30%,
  while a rock-steady node gets 30% reduction. Much more impactful than -10 flat.

- Remove the old `penalty_breakdown["stability_bonus"]` field.
- Store `cpu_stability_factor` in score details for UI transparency.

**Files**: `proxbalance/scoring.py`
**Risk**: Low — changes how stability modifies penalties but stays within existing
penalty framework. More volatile nodes become worse targets (correct behavior).

---

## Phase 4: IOWait as Migration Trigger

**Problem**: IOWait is only a penalty — it makes a node score worse, but it never
*triggers* a migration. A node at 40% IOWait (severe storage contention) won't get
guests moved away unless its CPU or memory also cross thresholds. IOWait directly
indicates "this node's workloads are suffering from I/O starvation."

**What changes**:

- **`proxbalance/recommendations.py`** — In `select_guests_to_migrate()`, add
  IOWait as a recognized overload reason. For IOWait overload, select guests by
  disk I/O contribution (highest `disk_read_bps + disk_write_bps` first):
  ```python
  if overload_reason == "iowait":
      # Target: reduce I/O pressure by migrating I/O-heavy guests
      iowait_reduction_needed = max(0, current_iowait - (iowait_threshold - 5))
      # Efficiency scored by disk I/O impact rather than CPU/memory
  ```

- **`proxbalance/recommendations.py`** — In `generate_recommendations()`, before
  the per-guest loop, identify nodes with sustained high IOWait and flag their
  guests for migration consideration:
  ```python
  # Identify IOWait-stressed nodes (separate from CPU/memory overload)
  iowait_stressed_nodes = set()
  for node_name, node in nodes.items():
      if node.get("status") != "online" or node_name in maintenance_nodes:
          continue
      node_iowait = node.get("metrics", {}).get("current_iowait", 0)
      avg_iowait = node.get("metrics", {}).get("avg_iowait", 0)
      # Only trigger for sustained IOWait (current > threshold AND avg confirms)
      if node_iowait > iowait_threshold and avg_iowait > (iowait_threshold * 0.7):
          iowait_stressed_nodes.add(node_name)
  ```

- **Guest efficiency for IOWait**: New efficiency heuristic that uses
  `disk_read_bps + disk_write_bps` as the "impact" metric (instead of CPU/memory
  impact used for other overload reasons). Moving the highest-I/O guest gives the
  most IOWait relief.

- IOWait migrations still go through the same `min_score_improvement` gate, so
  they won't over-recommend. They just make IOWait-heavy nodes *eligible* for
  migration even if CPU/memory are fine.

**Files**: `proxbalance/recommendations.py`
**Risk**: Medium — introduces a new migration trigger. Gated behind existing score
improvement check. Requires `avg_iowait` confirmation to avoid reacting to transient
spikes.

---

## Phase 5: Wire Together + Test

- Add new `mem_overcommit` penalty keys to `DEFAULT_PENALTY_CONFIG` and
  `settings_mapper.py` (not sensitive to sensitivity scaling — it's a hard fact)
- Update penalty presets in `routes/penalty.py`
- Frontend `PenaltyScoringSection.jsx` Expert Mode already renders all penalty keys
  dynamically, so new keys appear automatically
- Verify with sample scenarios:
  - Node at 90% committed / 60% used → rejected as target (Phase 1)
  - Node with overcommit ratio 1.3 → gets overcommit penalty (Phase 2)
  - Volatile node (CV > 35%) → CPU penalties inflated 30% (Phase 3)
  - Node at 35% IOWait sustained → guests selected for migration (Phase 4)
- Build frontend, commit, push

**Files**: All files from Phases 1-4, plus `proxbalance/settings_mapper.py`,
`proxbalance/routes/penalty.py`

---

## Execution Order

1. **Phase 1** (hard capacity gate) — Independent, low risk, immediate value
2. **Phase 3** (CPU variance) — Independent, low risk, improves scoring quality
3. **Phase 2** (committed memory tracking) — Requires collector change, medium risk
4. **Phase 4** (IOWait trigger) — Most impactful change, depends on good scoring
5. **Phase 5** (wire together) — Integration and verification
