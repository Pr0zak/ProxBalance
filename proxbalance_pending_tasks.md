# ProxBalance - Pending Tasks Summary

**Session Date:** 2025-10-26
**Status:** Bug fixed, feature enhancements pending

---

## ✅ Completed Tasks (Session 2025-10-26)

### 1. Fixed "Partial" Status Bug
- **Issue:** UI showed "1 / 2" and "Partial" status when only 1 migration was attempted and succeeded
- **Root Cause:** `migrations_attempted` counter was incremented twice (line 988 and 1049)
- **Fix:** Removed duplicate increment at automigrate.py:988
- **Result:** Now correctly shows "1 / 1" and "Success" status
- **File:** `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/automigrate.py`

### 2. Updated Container Mount Points
- **CT 111 (syncthing):** Added `shared=1` flag to bind mount
- **CT 112 (radarr):** Added `shared=1` flag to bind mounts
- **Result:** Containers can now be migrated automatically

### 3. Enhanced Last Run Summary UI
- **Added metadata badges:** VM/CT type, HA status, passthrough disks, bind mounts
- **Visual indicators:**
  - Purple badge: HA managed
  - Red badge: Passthrough disks (⚠ Passthrough)
  - Orange badge: Unshared bind mounts (⚠ Bind Mount)
  - Cyan badge: Shared bind mounts (📁 Shared)
- **Tags display:** Shows all tags for each VM/CT in decisions
- **File:** `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/src/app.jsx` (lines 6321-6397)

---

## 📋 Pending Tasks

### Priority 1: Min Score Improvement Configuration ✅ COMPLETED

#### Task 1: Add min_score_improvement to Penalty Configuration UI ✅
**Status:** COMPLETED
**Description:** Make the 15-point minimum score improvement threshold user-editable in the UI

**Location:** `src/app.jsx` - Penalty Configuration section (lines 2928-2952)

**Implementation:**
```javascript
// Add to Penalty Configuration UI (around line 5000-5500)
<div className="mt-4">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Minimum Score Improvement
    <span className="ml-2 text-xs text-gray-500">(points)</span>
  </label>
  <input
    type="number"
    min="0"
    max="100"
    value={config.penalty_scoring?.min_score_improvement || 15}
    onChange={(e) => handlePenaltyChange('min_score_improvement', parseInt(e.target.value))}
    className="w-full px-3 py-2 border rounded-md"
  />
  <p className="mt-1 text-xs text-gray-500">
    Minimum score improvement required to recommend a migration. Lower values = more sensitive to small improvements.
  </p>
</div>
```

**Testing:**
- Verify value saves to `config.json` under `penalty_scoring.min_score_improvement`
- Test with values: 5, 10, 15, 20
- Refresh page and verify persistence

---

#### Task 2: Update hardcoded min_score_improvement in app.py ✅
**Status:** ALREADY IMPLEMENTED - No changes needed
**Description:** Replace hardcoded `15` value with config-driven value

**Location:** `app.py` - `generate_recommendations()` function (line 1714)

**Finding:** The code already correctly reads from config:
```python
MIN_SCORE_IMPROVEMENT = penalty_cfg.get("min_score_improvement", 15)
```
This was already properly implemented.

**Current Code (search for):**
```python
# Hardcoded threshold of 15 points
if score_improvement < 15:
    continue
```

**Updated Code:**
```python
# Get threshold from config
min_score_improvement = config.get('penalty_scoring', {}).get('min_score_improvement', 15)
if score_improvement < min_score_improvement:
    continue
```

**Files to Check:**
- `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/app.py`
- Search for all instances of hardcoded `15` related to score improvement
- May appear in multiple locations within recommendation logic

**Testing:**
1. Set `min_score_improvement` to 5 in UI
2. Trigger recommendation generation
3. Verify more VMs are recommended (lower threshold = more recommendations)
4. Check logs to confirm threshold is being used

---

#### Task 3: Update Documentation
**Description:** Document the new min_score_improvement setting

**Files to Update:**

1. **AUTOMATION.md** (if exists)
   - Add section under "Penalty Scoring Configuration"
   - Explain what min_score_improvement does
   - Provide recommended values for different use cases

2. **FEATURES.md** (if exists)
   - Add to configuration features list

3. **README.md** (if exists)
   - Update configuration section

**Content to Add:**
```markdown
### Minimum Score Improvement (`min_score_improvement`)

**Location:** Configuration → Penalty Scoring → Minimum Score Improvement

**Description:** Sets the minimum score improvement (in points) required for a migration to be recommended. This threshold filters out migrations that would provide only marginal benefit.

**Default:** 15 points

**Recommended Values:**
- **Conservative (20-30):** Only migrate when there's significant benefit. Reduces unnecessary migrations.
- **Balanced (10-15):** Default setting. Good balance between optimization and stability.
- **Aggressive (5-10):** More sensitive to small imbalances. May result in more frequent migrations.
- **Very Aggressive (1-5):** Considers even minor improvements. Use only for testing or highly dynamic environments.

**Impact:**
- Lower values → More migration recommendations → More cluster balancing activity
- Higher values → Fewer migration recommendations → More stable (less movement)

**Example Use Cases:**
- **Production environments:** 15-20 (stability focus)
- **Development clusters:** 5-10 (optimization focus)
- **Testing/validation:** 1-5 (see all potential migrations)
```

---

### Priority 2: Distribution Balancing Feature

**User Request:** "Create a plan to add an option to allow small load VM/CT to balance over the cluster, based on number"

**Goal:** Migrate small workload VMs/CTs based on guest count imbalance, not just resource utilization

**Current Behavior:**
- System only migrates VMs when score improvement >= 15 points
- Small VMs (syncthing, radarr) don't generate enough score improvement
- Results in uneven guest distribution (pve3: 8 VMs, pve5: 3 VMs)

**Desired Behavior:**
- Option to balance guests by count across nodes
- Migrate small VMs from overloaded nodes to underutilized nodes
- Separate from penalty-based scoring system

---

#### Task 4: Add distribution_balancing Config Section

**Location:** `config.json`

**Schema to Add:**
```json
{
  "distribution_balancing": {
    "enabled": false,
    "min_guest_imbalance": 3,
    "max_migrations_per_run": 1,
    "only_small_guests": true,
    "small_guest_threshold": {
      "max_cpu_percent": 10,
      "max_memory_gb": 4
    },
    "exclude_ha_managed": true,
    "respect_affinity_rules": true
  }
}
```

**Field Descriptions:**
- `enabled`: Enable/disable distribution balancing
- `min_guest_imbalance`: Minimum guest count difference to trigger balancing (e.g., 3 = balance when node has 3+ more guests than another)
- `max_migrations_per_run`: Limit migrations per balancing run
- `only_small_guests`: Only migrate small workload VMs (recommended)
- `small_guest_threshold`: Define what constitutes a "small" guest
- `exclude_ha_managed`: Don't migrate HA-managed VMs
- `respect_affinity_rules`: Honor affinity/anti-affinity tags

---

#### Task 5: Implement calculate_node_guest_counts() Helper

**Location:** `app.py`

**Function:**
```python
def calculate_node_guest_counts(cache_data):
    """
    Calculate guest counts per node for distribution balancing.

    Returns:
        dict: {
            'pve3': {'total': 8, 'small': 5, 'large': 3},
            'pve4': {'total': 6, 'small': 4, 'large': 2},
            ...
        }
    """
    config = load_config()
    small_threshold = config.get('distribution_balancing', {}).get('small_guest_threshold', {})
    max_cpu = small_threshold.get('max_cpu_percent', 10)
    max_mem_gb = small_threshold.get('max_memory_gb', 4)

    node_counts = {}
    guests = cache_data.get('guests', {})

    for vmid, guest in guests.items():
        # Skip stopped VMs
        if guest.get('status') != 'running':
            continue

        node = guest.get('node')
        if not node:
            continue

        # Initialize node entry
        if node not in node_counts:
            node_counts[node] = {'total': 0, 'small': 0, 'large': 0}

        node_counts[node]['total'] += 1

        # Determine if guest is "small"
        cpu_percent = guest.get('cpu_usage_percent', 0)
        mem_gb = guest.get('mem_used', 0) / (1024**3) if guest.get('mem_used') else 0

        if cpu_percent <= max_cpu and mem_gb <= max_mem_gb:
            node_counts[node]['small'] += 1
        else:
            node_counts[node]['large'] += 1

    return node_counts
```

---

#### Task 6: Implement find_distribution_candidates() Helper

**Location:** `app.py`

**Function:**
```python
def find_distribution_candidates(cache_data, node_counts):
    """
    Find candidate VMs for distribution balancing.

    Returns:
        list: [
            {
                'vmid': 111,
                'name': 'syncthing',
                'source_node': 'pve3',
                'target_node': 'pve5',
                'reason': 'Distribution balancing: pve3 (8 guests) → pve5 (3 guests)',
                'confidence_score': 80
            },
            ...
        ]
    """
    config = load_config()
    dist_config = config.get('distribution_balancing', {})

    if not dist_config.get('enabled', False):
        return []

    min_imbalance = dist_config.get('min_guest_imbalance', 3)
    only_small = dist_config.get('only_small_guests', True)
    exclude_ha = dist_config.get('exclude_ha_managed', True)
    respect_affinity = dist_config.get('respect_affinity_rules', True)

    # Find most overloaded and underloaded nodes
    nodes_by_count = sorted(node_counts.items(), key=lambda x: x[1]['total'], reverse=True)

    if len(nodes_by_count) < 2:
        return []

    source_node, source_counts = nodes_by_count[0]
    target_node, target_counts = nodes_by_count[-1]

    imbalance = source_counts['total'] - target_counts['total']

    if imbalance < min_imbalance:
        return []

    # Find candidate VMs on source node
    candidates = []
    guests = cache_data.get('guests', {})

    for vmid, guest in guests.items():
        if guest.get('node') != source_node:
            continue
        if guest.get('status') != 'running':
            continue

        # Check if HA managed
        if exclude_ha and guest.get('ha_managed', False):
            continue

        # Check if small guest
        if only_small:
            small_threshold = dist_config.get('small_guest_threshold', {})
            max_cpu = small_threshold.get('max_cpu_percent', 10)
            max_mem_gb = small_threshold.get('max_memory_gb', 4)

            cpu_percent = guest.get('cpu_usage_percent', 0)
            mem_gb = guest.get('mem_used', 0) / (1024**3) if guest.get('mem_used') else 0

            if cpu_percent > max_cpu or mem_gb > max_mem_gb:
                continue

        # Check affinity rules
        if respect_affinity:
            tags = guest.get('tags', {}).get('all_tags', [])
            if any(tag.startswith('affinity:') or tag.startswith('exclude-affinity:') for tag in tags):
                # TODO: Implement proper affinity checking
                continue

        # Check for unshared bind mounts
        if guest.get('mount_points', {}).get('has_unshared_bind_mount', False):
            continue

        # Check for passthrough disks
        if guest.get('local_disks', {}).get('has_passthrough', False):
            continue

        candidates.append({
            'vmid': int(vmid),
            'name': guest.get('name', f'VM-{vmid}'),
            'type': guest.get('type', 'VM'),
            'source_node': source_node,
            'target_node': target_node,
            'reason': f'Distribution balancing: {source_node} ({source_counts["total"]} guests) → {target_node} ({target_counts["total"]} guests)',
            'confidence_score': 80,  # Fixed confidence for distribution balancing
            'distribution_balancing': True  # Flag to identify this type of recommendation
        })

    return candidates
```

---

#### Task 7: Add Distribution Balancing to generate_recommendations()

**Location:** `app.py` - End of `generate_recommendations()` function

**Code to Add:**
```python
# After penalty-based recommendations are generated...

# Add distribution balancing recommendations if enabled
config = load_config()
if config.get('distribution_balancing', {}).get('enabled', False):
    node_counts = calculate_node_guest_counts(cache_data)
    dist_candidates = find_distribution_candidates(cache_data, node_counts)

    # Add to recommendations list
    recommendations.extend(dist_candidates)

    logger.info(f"Distribution balancing: added {len(dist_candidates)} candidates")
```

**Integration Strategy:**
- Distribution recommendations run AFTER penalty-based recommendations
- Both types can coexist in the same recommendation list
- Automigrate will process them in order
- Use `max_migrations_per_run` to limit total migrations

---

#### Task 8: Update automigrate.py for Distribution Balancing

**Location:** `automigrate.py`

**Changes Needed:**

1. **Handle distribution_balancing flag in recommendations:**
   - Recommendations may have `distribution_balancing: true` flag
   - These should be logged differently for clarity

2. **Update decision tracking:**
   - Include distribution balancing info in last_run_summary

3. **Logging updates:**
```python
# Around line 1044 where migration is logged
if rec.get('distribution_balancing', False):
    logger.info(f"Distribution balancing: Migrating {guest_type} {vmid} ({rec['name']}) from {source} to {target} - {rec['reason']}")
else:
    logger.info(f"Migrating {guest_type} {vmid} ({rec['name']}) from {source} to {target} (score: {target_score}) - {rec['reason']}")
```

**No major logic changes needed** - automigrate.py should handle distribution recommendations the same as penalty-based ones.

---

#### Task 9: Add Distribution Balancing UI Controls

**Location:** `src/app.jsx` - Automated Migrations panel

**UI Section to Add:**
```javascript
{/* Add after existing Automated Migrations configuration */}

{/* Distribution Balancing Section */}
<div className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
        Distribution Balancing
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Automatically balance small workload VMs/CTs by guest count across nodes
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={config.distribution_balancing?.enabled || false}
        onChange={(e) => handleConfigChange('distribution_balancing.enabled', e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
    </label>
  </div>

  {config.distribution_balancing?.enabled && (
    <div className="space-y-4 mt-4">
      {/* Minimum Guest Imbalance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Minimum Guest Imbalance
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={config.distribution_balancing?.min_guest_imbalance || 3}
          onChange={(e) => handleConfigChange('distribution_balancing.min_guest_imbalance', parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded-md"
        />
        <p className="mt-1 text-xs text-gray-500">
          Trigger balancing when node has this many more guests than another node
        </p>
      </div>

      {/* Only Small Guests */}
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={config.distribution_balancing?.only_small_guests !== false}
          onChange={(e) => handleConfigChange('distribution_balancing.only_small_guests', e.target.checked)}
          className="mr-2"
        />
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Only migrate small workload VMs/CTs (recommended)
        </label>
      </div>

      {/* Small Guest Thresholds */}
      {config.distribution_balancing?.only_small_guests !== false && (
        <div className="ml-6 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Small Guest Thresholds
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Max CPU %
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.distribution_balancing?.small_guest_threshold?.max_cpu_percent || 10}
                onChange={(e) => handleConfigChange('distribution_balancing.small_guest_threshold.max_cpu_percent', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Max Memory (GB)
              </label>
              <input
                type="number"
                min="1"
                max="32"
                value={config.distribution_balancing?.small_guest_threshold?.max_memory_gb || 4}
                onChange={(e) => handleConfigChange('distribution_balancing.small_guest_threshold.max_memory_gb', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Safety Options */}
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.distribution_balancing?.exclude_ha_managed !== false}
            onChange={(e) => handleConfigChange('distribution_balancing.exclude_ha_managed', e.target.checked)}
            className="mr-2"
          />
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Exclude HA-managed VMs
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.distribution_balancing?.respect_affinity_rules !== false}
            onChange={(e) => handleConfigChange('distribution_balancing.respect_affinity_rules', e.target.checked)}
            className="mr-2"
          />
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Respect affinity/anti-affinity rules
          </label>
        </div>
      </div>
    </div>
  )}
</div>
```

**Styling Notes:**
- Use existing ProxBalance color scheme (blues/grays)
- Match toggle switch styling from Automated Migrations section
- Use consistent spacing and typography

---

#### Task 10: Update AUTOMATION.md Documentation

**Location:** `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/AUTOMATION.md` (or create if doesn't exist)

**Section to Add:**

```markdown
## Distribution Balancing

**Feature:** Automatically migrate small workload VMs/CTs to balance guest count across nodes.

**Why?** Traditional penalty-based scoring focuses on resource utilization (CPU/RAM). Small VMs (like syncthing, radarr, etc.) may not generate enough penalty score to trigger migration, even when guest distribution is very uneven (e.g., pve3: 8 guests, pve5: 3 guests).

Distribution balancing solves this by considering **guest count** in addition to resource utilization.

### Configuration

Enable in: **Configuration → Automated Migrations → Distribution Balancing**

```json
{
  "distribution_balancing": {
    "enabled": false,
    "min_guest_imbalance": 3,
    "max_migrations_per_run": 1,
    "only_small_guests": true,
    "small_guest_threshold": {
      "max_cpu_percent": 10,
      "max_memory_gb": 4
    },
    "exclude_ha_managed": true,
    "respect_affinity_rules": true
  }
}
```

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `false` | Enable/disable distribution balancing |
| `min_guest_imbalance` | `3` | Minimum guest count difference to trigger balancing |
| `max_migrations_per_run` | `1` | Limit migrations per balancing run |
| `only_small_guests` | `true` | Only migrate small workload VMs (recommended) |
| `small_guest_threshold.max_cpu_percent` | `10` | Max CPU % for a guest to be considered "small" |
| `small_guest_threshold.max_memory_gb` | `4` | Max memory (GB) for a guest to be considered "small" |
| `exclude_ha_managed` | `true` | Don't migrate HA-managed VMs |
| `respect_affinity_rules` | `true` | Honor affinity/anti-affinity tags |

### How It Works

1. **Calculate Node Counts:** Count total guests per node, categorize as "small" or "large"
2. **Find Imbalance:** Compare most loaded node vs. least loaded node
3. **Generate Recommendations:** If imbalance >= `min_guest_imbalance`, recommend migrating small guests
4. **Filter Candidates:**
   - Must be on most-loaded node
   - Must be "small" (if `only_small_guests` enabled)
   - Cannot have HA management (if `exclude_ha_managed` enabled)
   - Cannot have unshared bind mounts or passthrough disks
   - Must respect affinity rules (if `respect_affinity_rules` enabled)
5. **Execute Migration:** Same as penalty-based migrations

### Example Scenario

**Before:**
- pve3: 8 guests (syncthing, radarr, prowlarr, grafana, pialert, Firewall999, SS, LXC)
- pve4: 6 guests
- pve5: 3 guests (underutilized)
- pve6: 5 guests

**Problem:** Penalty scoring doesn't recommend moving syncthing/radarr because they're too small (score improvement < 15 points)

**With Distribution Balancing:**
- Imbalance: pve3 (8) - pve5 (3) = 5 guests
- Since 5 >= `min_guest_imbalance` (3), system recommends migrating small guest from pve3 → pve5
- Candidates: syncthing, radarr (both under 10% CPU and 4GB RAM)
- Result: Better guest distribution, improved node balance

### Best Practices

**Recommended Settings:**
- **Production clusters:** `min_guest_imbalance: 3-5`, `only_small_guests: true`
- **Development clusters:** `min_guest_imbalance: 2-3`, `only_small_guests: false`

**When to Enable:**
- Cluster has many small workload VMs/CTs
- Guest distribution is uneven despite low resource usage
- You want to maximize node utilization by count, not just CPU/RAM

**When to Disable:**
- All guests are large/resource-intensive
- You prefer resource-based balancing only
- Guest placement is intentional (e.g., dedicated node for specific workload types)

### Interaction with Penalty Scoring

Distribution balancing runs **after** penalty-based recommendations:

1. Penalty scoring generates recommendations based on CPU/RAM/IOWait
2. Distribution balancing adds additional recommendations based on guest count
3. Both types are combined and filtered (cooldown, confidence, tags)
4. Migrations execute in order, respecting `max_migrations_per_run`

**Priority:** If both systems recommend the same VM, penalty-based recommendation takes precedence (it appears first in list).

### Monitoring

Distribution balancing migrations are logged with special prefix:
```
Distribution balancing: Migrating CT 111 (syncthing) from pve3 to pve5 - Distribution balancing: pve3 (8 guests) → pve5 (3 guests)
```

In the UI, these appear in Last Run Summary with the same metadata as penalty-based migrations.
```

---

#### Task 11: Update FEATURES.md

**Location:** `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/FEATURES.md` (or create if doesn't exist)

**Section to Add:**

```markdown
### Distribution Balancing (New)

Automatically balance small workload VMs/CTs by guest count across cluster nodes.

**Features:**
- ✅ Separate from penalty-based scoring
- ✅ Configurable thresholds for "small" guests
- ✅ Respects cooldown periods and safety checks
- ✅ Works alongside penalty-based recommendations
- ✅ Excludes HA-managed VMs (optional)
- ✅ Honors affinity rules (optional)

**Use Case:** Ideal for clusters with many lightweight VMs (containers, small services) where resource-based scoring alone doesn't provide balanced guest distribution.

**Configuration:** See AUTOMATION.md for detailed setup.
```

---

#### Task 12: Test Distribution Balancing

**Test Scenario 1: Basic Functionality**

1. Enable distribution balancing in UI
2. Set `min_guest_imbalance: 2`
3. Set `only_small_guests: true`
4. Set cooldown to 1 minute for testing
5. Trigger automation run
6. Expected: Migrates syncthing or radarr from pve3 to pve5

**Test Scenario 2: Threshold Testing**

1. Test with different `min_guest_imbalance` values (1, 3, 5)
2. Verify migrations only trigger when threshold is met
3. Check logs for distribution balancing messages

**Test Scenario 3: Small Guest Filtering**

1. Set `max_cpu_percent: 5` (very low)
2. Expected: Only VMs under 5% CPU are candidates
3. Set `max_memory_gb: 2` (very low)
4. Expected: Only VMs under 2GB RAM are candidates

**Test Scenario 4: Safety Checks**

1. Test with HA-managed VM
2. Expected: Excluded if `exclude_ha_managed: true`
3. Test with affinity tags
4. Expected: Respected if `respect_affinity_rules: true`

**Test Scenario 5: Interaction with Penalty Scoring**

1. Enable both distribution balancing and penalty scoring
2. Trigger automation run
3. Expected: Both types of recommendations appear
4. Verify `max_migrations_per_run` limit is honored

**Validation:**
- Check `/opt/proxmox-balance-manager/migration_history.json` for results
- Verify guest counts rebalance over time
- Ensure no unintended migrations (HA VMs, large VMs, etc.)

---

### Priority 1.5: Rollback Detection Toggle

#### Task: Add Rollback Detection Enable/Disable Toggle

**Description:** Add a user-configurable toggle in the Automated Migrations UI to enable/disable the rollback detection feature.

**Background:** Rollback detection prevents migration loops by detecting when a VM/CT is being migrated back to a node it was recently migrated from. This is a safety feature but users may want to disable it in certain scenarios.

**Location:** `src/app.jsx` - Automated Migrations configuration panel

**Config Schema:**
```json
{
  "automated_migrations": {
    "rules": {
      "rollback_detection_enabled": true,  // Default: true
      "rollback_window_hours": 24         // Optional: How far back to check for rollbacks
    }
  }
}
```

**UI Implementation:**
```javascript
{/* Add after existing Automated Migrations rules */}
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      Rollback Detection
    </label>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Prevent migration loops by detecting rollbacks (migrating VM back to previous node)
    </p>
  </div>
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={config.automated_migrations?.rules?.rollback_detection_enabled !== false}
      onChange={(e) => handleConfigChange('automated_migrations.rules.rollback_detection_enabled', e.target.checked)}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
  </label>
</div>

{/* Optional: Rollback window configuration (only if enabled) */}
{config.automated_migrations?.rules?.rollback_detection_enabled !== false && (
  <div className="ml-6 mt-2">
    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
      Rollback Detection Window (hours)
    </label>
    <input
      type="number"
      min="1"
      max="168"
      value={config.automated_migrations?.rules?.rollback_window_hours || 24}
      onChange={(e) => handleConfigChange('automated_migrations.rules.rollback_window_hours', parseInt(e.target.value))}
      className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
    />
    <p className="text-xs text-gray-500 mt-1">
      How far back to check for previous migrations (default: 24 hours)
    </p>
  </div>
)}
```

**Backend Changes Needed:**
- Check if rollback detection is currently hardcoded in `automigrate.py`
- If yes, update to read from config: `config.get('automated_migrations', {}).get('rules', {}).get('rollback_detection_enabled', True)`
- Implement `rollback_window_hours` if not already present

**Testing:**
1. Enable rollback detection, migrate a VM
2. Try to migrate it back immediately - should be prevented
3. Disable rollback detection
4. Try to migrate back - should be allowed
5. Test rollback window: set to 1 hour, wait 1 hour, verify migration is allowed

---

## 🔧 Testing Checklist

- [ ] Task 1: min_score_improvement UI control saves to config
- [ ] Task 2: app.py uses config value instead of hardcoded 15
- [ ] Task 3: Documentation updated
- [ ] Task 4: config.json schema added and validates
- [ ] Task 5: calculate_node_guest_counts() returns correct counts
- [ ] Task 6: find_distribution_candidates() identifies correct VMs
- [ ] Task 7: Distribution recommendations appear in output
- [ ] Task 8: automigrate.py logs distribution migrations correctly
- [ ] Task 9: UI controls work and save properly
- [ ] Task 10-11: Documentation is clear and accurate
- [ ] Task 12: All test scenarios pass

---

## 📁 Files Modified/Created

**Modified:**
- `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/automigrate.py` (bug fix - line 988)
- `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/src/app.jsx` (UI enhancements)
- `/mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance/index.html` (cache-busting update)

**To Modify:**
- `app.py` (tasks 2, 5, 6, 7)
- `automigrate.py` (task 8)
- `src/app.jsx` (tasks 1, 9)
- `config.json` (task 4 - schema reference)

**To Create/Update:**
- `AUTOMATION.md` (tasks 3, 10)
- `FEATURES.md` (tasks 3, 11)
- `README.md` (task 3)

---

## 💡 Implementation Tips

1. **Start with config schema (Task 4)** - Ensures other components have data structure to work with

2. **Build helpers first (Tasks 5-6)** - Test independently before integration

3. **Test incrementally** - Don't implement all tasks before testing. Verify each component works.

4. **Use logging extensively** - Add debug logs to track guest counts, candidates, decisions

5. **Start conservative** - Use high thresholds during development/testing to avoid unintended migrations

6. **Consider edge cases:**
   - What if all nodes have equal guest counts?
   - What if all guests are large?
   - What if target node becomes overloaded during migration?
   - What if no guests meet criteria?

---

## 🚀 Deployment Notes

**After completing all tasks:**

1. **Compile frontend:**
   ```bash
   cd /mnt/c/Users/zakfo/OneDrive/Documents/GitHub/ProxBalance
   node node_modules/@babel/cli/bin/babel.js src/app.jsx --out-file assets/js/app.js --presets=@babel/preset-react
   ```

2. **Deploy to CT 100:**
   ```bash
   scp automigrate.py app.py root@pve3:/tmp/
   scp assets/js/app.js root@pve3:/tmp/
   ssh root@pve3 "pct push 100 /tmp/automigrate.py /opt/proxmox-balance-manager/automigrate.py"
   ssh root@pve3 "pct push 100 /tmp/app.py /opt/proxmox-balance-manager/app.py"
   ssh root@pve3 "pct push 100 /tmp/app.js /opt/proxmox-balance-manager/assets/js/app.js"
   ```

3. **Restart service:**
   ```bash
   ssh root@pve3 "pct exec 100 -- systemctl restart proxmox-balance.service"
   ```

4. **Verify:**
   ```bash
   ssh root@pve3 "pct exec 100 -- systemctl status proxmox-balance.service"
   ```

5. **Update cache-busting in index.html:**
   - Change `?v=20251026-1313` to current timestamp

---

## 📞 Support / Questions

- **Bug found during migration bug fix:** migrations_attempted was incremented twice
- **Solution:** Removed duplicate increment at automigrate.py:988
- **Current config:** cooldown_minutes=300, min_score_improvement=15

**Current Cluster State (as of 2025-10-26):**
- pve3: 8 guests (83% CPU) - overloaded
- pve4: 6 guests (59% CPU)
- pve5: 3 guests (23% CPU) - underutilized
- pve6: 5 guests (49% CPU)

**Identified Issues:**
- SS VM (86% CPU) has `ignore` tag - won't migrate
- Small VMs (syncthing, radarr) don't meet 15-point threshold
- Distribution balancing will help spread small VMs more evenly

---

**Last Updated:** 2025-10-26 18:57 UTC
**Status:** Ready for implementation
