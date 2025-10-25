# Automated Migrations Guide

Complete guide for configuring and using ProxBalance's automated migration system.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
  - [Basic Settings](#basic-settings)
  - [Schedule Presets](#schedule-presets)
  - [Time Windows](#time-windows)
  - [Safety Checks](#safety-checks)
  - [Advanced Rules](#advanced-rules)
- [Monitoring](#-monitoring)
- [Dashboard Features](#-dashboard-features)
- [Troubleshooting](#-troubleshooting)
- [Best Practices](#-best-practices)

---

## 🎯 Overview

ProxBalance's Automated Migrations feature continuously monitors your cluster and automatically executes migrations based on AI-powered recommendations. The system includes comprehensive safety checks, flexible scheduling, and detailed monitoring capabilities.

### Key Features

- **AI-Powered Decisions**: Uses AI recommendations to determine optimal migration targets
- **Flexible Scheduling**: Define migration windows and blackout periods
- **Safety First**: Multiple safety checks prevent problematic migrations
- **Activity Logging**: Track all decisions, including why VMs were skipped
- **Visual Monitoring**: Real-time dashboards with charts and statistics
- **Dry Run Mode**: Test automation without executing migrations

---

## 🚀 Quick Start

### 1. Enable Automated Migrations

1. Navigate to **Dashboard** → **Automated Migrations** section
2. Click **Configure** button
3. Toggle **Enable Automated Migrations**
4. Configure your preferred settings (or use a preset)
5. Click **Save Configuration**

### 2. Choose a Schedule Preset

ProxBalance includes three pre-configured schedules:

**Conservative** (Recommended for Production)
- Runs every 30 minutes
- Only during night hours (10 PM - 6 AM)
- Requires 85% confidence score
- Maximum 2 migrations per run
- 120-minute cooldown between migrations

**Balanced** (Good for Most Environments)
- Runs every 15 minutes
- Daytime and nighttime windows
- Requires 75% confidence score
- Maximum 3 migrations per run
- 60-minute cooldown

**Aggressive** (Development/Testing)
- Runs every 5 minutes
- 24/7 migration window
- Requires 65% confidence score
- Maximum 5 migrations per run
- 30-minute cooldown

### 3. Test with Dry Run Mode

Before enabling live migrations:

1. Enable **Dry Run Mode**
2. Monitor the **Activity Log** and **Migration History**
3. Verify migrations would happen as expected
4. Disable **Dry Run Mode** when ready

---

## ⚙️ Configuration

### Basic Settings

#### Check Interval
How often the automation system evaluates the cluster for migrations.

```
Default: 5 minutes
Range: 1-60 minutes
```

**Recommendation**: Start with 15-30 minutes and adjust based on cluster dynamics.

#### Dry Run Mode
When enabled, automation evaluates and logs decisions but doesn't execute migrations.

```
Use Cases:
- Testing new configurations
- Monitoring automation behavior
- Validating time windows
```

---

### Schedule Presets

#### Using Presets

1. Click **Load Preset** dropdown
2. Select **Conservative**, **Balanced**, or **Aggressive**
3. Review auto-populated settings
4. Customize if needed
5. Click **Save Configuration**

#### Customizing Presets

All preset values are editable after loading:
- Modify check intervals
- Adjust confidence thresholds
- Change migration limits
- Update time windows

---

### Time Windows

Control **when** migrations can occur using Migration Windows and Blackout Windows.

**Timezone Support**: All time windows support configurable timezone selection (e.g., America/Chicago, UTC, Europe/London). The system displays the current time in your selected timezone and evaluates windows accordingly.

#### Migration Windows

Define specific times when migrations ARE allowed.

**Example: Business Hours Only**
```
Window: "Business Hours"
Days: Monday-Friday
Time: 09:00 - 17:00
Type: Migration
```

**Example: Weekend Maintenance**
```
Window: "Weekend Maintenance"
Days: Saturday, Sunday
Time: 00:00 - 23:59
Type: Migration
```

#### Blackout Windows

Define specific times when migrations are BLOCKED.

**Example: Backup Windows**
```
Window: "Nightly Backups"
Days: All Days
Time: 02:00 - 04:00
Type: Blackout
```

**Example: Business Critical Hours**
```
Window: "Peak Business"
Days: Monday-Friday
Time: 08:00 - 18:00
Type: Blackout
```

#### Visual Timeline

The unified Time Windows interface includes a 7-day visual timeline showing:
- **Green bars**: Migration windows (migrations allowed)
- **Red bars**: Blackout windows (migrations blocked)
- **Hour markers**: Time labels at 6-hour intervals
- **Click-to-edit**: Click any window bar to edit it

#### Quick Presets

When creating time windows, use quick preset buttons:
- **All Day**: 00:00 - 23:59
- **Business Hours**: 09:00 - 17:00
- **Night**: 22:00 - 06:00

#### Window Priority

When windows overlap:
1. **Blackout Windows always take priority** over Migration Windows
2. If no windows are defined, migrations are allowed 24/7
3. If only Migration Windows exist, migrations are ONLY allowed during those windows

---

### Safety Checks

#### Required Safety Checks

**Prevent Migrations During Cluster Issues**
- ✓ Cluster quorum must be healthy
- ✓ Target node must be online and responsive
- ✓ Source node must not be in maintenance mode (unless evacuation)
- ✓ VM/CT must be running and not locked

#### Confidence Score Threshold

Minimum AI confidence score required to execute a migration.

```
Conservative: 85%
Balanced: 75%
Aggressive: 65%
Custom: 1-100%
```

Higher scores = more conservative migrations with stronger justification.

#### Cooldown Period

Prevents the same VM from being migrated too frequently.

```
Conservative: 120 minutes
Balanced: 60 minutes
Aggressive: 30 minutes
Custom: 1-1440 minutes
```

#### Maximum Migrations Per Run

Limits how many VMs can be migrated in a single automation cycle.

```
Conservative: 2 migrations
Balanced: 3 migrations
Aggressive: 5 migrations
Custom: 1-10 migrations
```

**Why limit?**
- Prevents cluster thrashing
- Reduces network congestion
- Allows monitoring between batches

#### Pause After Failure

Automatically disables automation if any migration fails.

```
✓ Enabled (Recommended)
- Requires manual review before resuming
- Prevents cascading failures
- Protects cluster stability

✗ Disabled
- Continues automation despite failures
- Use only in dev/test environments
```

---

### Advanced Rules

#### Guest Tags

Control which VMs can be automatically migrated using tags.

**Ignore Tag**
```
Tag: pb-ignore
Effect: VM is never migrated by automation
Use: Critical VMs, databases, specific workloads
```

**Exclude Groups**
```
Tag: pb-exclude-group:production
Effect: VMs in same group stay on different nodes
Use: HA configurations, redundancy requirements
```

See [Guest Tag Management](../README.md#tagging-guests) for details.

#### Maintenance Mode Evacuation

When a node is placed in maintenance mode:
- VMs are automatically evacuated to other nodes
- **Bypasses** most automation filters (tags, affinity)
- **Still requires** minimum confidence score
- **Respects** time windows and blackout periods

---

## 📊 Monitoring

### Dashboard Overview

The Automated Migrations dashboard provides comprehensive monitoring.

#### Status Card

Shows current automation state:
- **Active/Disabled**: Current status
- **DRY RUN MODE**: Warning if dry run enabled
- **Next Check**: Countdown to next automation cycle
- **Last Run**: Timestamp of last check

#### Migration Statistics

**Last 24 Hours**
- Total migrations
- Success count
- Failed count
- Success rate (color-coded)

**Last 7 Days**
- Total migrations
- Success rate
- Trend visualization

**VMs in Cooldown**
- Count of VMs currently in cooldown period
- Prevents migration churn

#### Migration History Chart

7-day bar chart showing daily migration activity:
- **Green**: Successful migrations
- **Red**: Failed migrations
- **Yellow**: Skipped migrations
- Hover for details

#### Recent Auto-Migrations

Latest migration events with:
- VM name and target node
- Migration reason
- Confidence score
- Duration
- Status indicator
- Dry run indicator

**Rollback Detection**: Warns if VM was migrated back to original node within 24 hours (possible issue indicator).

#### Activity Log

Shows why VMs were skipped during last check:
- VM name and ID
- Skip reason (cooldown, low confidence, tags, affinity)
- Timestamp
- Hover for full details

---

## 🎨 Dashboard Features

### Collapsed View

When collapsed, the Automated Migrations section shows at-a-glance stats:

- **Migration Counts**: 24h and 7d totals in blue card
- **Success Rate**: Color-coded percentage (green/yellow/red)
- **Next Check**: Live countdown timer in purple card
- **Dry Run**: Yellow indicator if enabled
- **Status Badge**: Active/Disabled state

### Export to CSV

Export complete migration history for analysis:

1. Click **Export CSV** button (next to Recent Auto-Migrations)
2. CSV file downloads automatically
3. Filename: `proxbalance-migrations-YYYY-MM-DD.csv`

**Includes**:
- Timestamp, VM ID, VM Name
- Source/Target nodes
- Migration reason
- Confidence score
- Status, duration, dry run flag
- Migration window name

---

## 🔧 Troubleshooting

### Migrations Not Happening

**Check 1: Automation Enabled?**
```
Dashboard → Automated Migrations → Status should show "Active"
```

**Check 2: Dry Run Mode?**
```
Look for yellow "DRY RUN MODE" indicator
If enabled, migrations are simulated only
```

**Check 3: Time Windows**
```
Verify current time is within Migration Window
Check for overlapping Blackout Windows
Review visual timeline
```

**Check 4: Activity Log**
```
Check "Activity Log (Last Check)" section
Shows why VMs are being skipped:
- Cooldown period
- Low confidence score
- Tag restrictions
- Affinity violations
```

**Check 5: Recommendations Available?**
```
Dashboard → Recommendations section
If empty, automation has nothing to execute
```

### Too Many Migrations

**Solution 1: Increase Cooldown**
```
Configuration → Rules → Cooldown Period
Increase to 120+ minutes
```

**Solution 2: Increase Confidence Threshold**
```
Configuration → Rules → Min Confidence Score
Raise to 85%+ for more selective migrations
```

**Solution 3: Reduce Max Migrations Per Run**
```
Configuration → Rules → Max Migrations Per Run
Lower to 1-2 migrations
```

**Solution 4: Narrow Migration Windows**
```
Configuration → Time Windows
Restrict to specific hours (e.g., night only)
```

### Failed Migrations

**Automatic Pause**
```
If "Pause After Failure" is enabled:
- Automation automatically disables
- Review failure reason
- Fix underlying issue
- Re-enable automation
```

**Common Causes**:
- Insufficient resources on target node
- Storage not available on target
- Network connectivity issues
- VM locked during backup

**Resolution**:
1. Check Recent Auto-Migrations for error details
2. Verify target node health
3. Check storage replication
4. Review VM state
5. Test manual migration first
6. Re-enable automation when ready

---

## ✅ Best Practices

### 1. Start Conservative

Begin with Conservative preset:
- Fewer migrations
- Higher confidence threshold
- Limited time windows
- Monitor for 1-2 weeks

### 2. Enable Dry Run First

Always test configuration changes:
```
1. Enable Dry Run Mode
2. Monitor Activity Log
3. Verify expected behavior
4. Disable Dry Run
```

### 3. Use Time Windows

Protect critical business hours:
```
Migrations: Nights and weekends
Blackouts: Business hours, backup windows
```

### 4. Monitor Regularly

Check dashboard weekly:
- Success rates
- Migration patterns
- Skip reasons
- Rollback warnings

### 5. Tune Based on Cluster

Adjust settings based on your workload:
- **Stable clusters**: More aggressive
- **Dynamic workloads**: More conservative
- **Critical production**: Minimal automation

### 6. Tag Critical VMs

Use `pb-ignore` tag for:
- Database servers
- Domain controllers
- Storage nodes
- Any VM that requires manual migration planning

### 7. Respect Cooldowns

Don't set cooldown too low:
- Minimum recommended: 60 minutes
- Prevents migration thrashing
- Allows cluster to stabilize

### 8. Review Rollback Warnings

Orange rollback warnings indicate:
- Possible target node issues
- Incorrect migration decisions
- Need to investigate further

### 9. Export History Regularly

Monthly CSV exports for:
- Trend analysis
- Capacity planning
- Audit trails
- Performance reporting

### 10. Enable Pause After Failure

Always enable in production:
- Prevents cascading failures
- Requires manual review
- Protects cluster stability

---

## 🔗 Related Documentation

- [Main README](../README.md) - ProxBalance overview
- [AI Features Guide](AI_FEATURES.md) - AI recommendation setup
- [Installation Guide](INSTALL.md) - Setup instructions
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

---

## 💡 Example Configurations

### Production Environment

```json
{
  "enabled": true,
  "dry_run": false,
  "check_interval_minutes": 30,
  "rules": {
    "min_confidence_score": 85,
    "max_migrations_per_run": 2,
    "cooldown_minutes": 120
  },
  "safety_checks": {
    "pause_on_failure": true
  },
  "migration_windows": [
    {
      "name": "Night Hours",
      "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "start_time": "22:00",
      "end_time": "06:00"
    }
  ],
  "blackout_windows": [
    {
      "name": "Backup Window",
      "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "start_time": "02:00",
      "end_time": "04:00"
    }
  ]
}
```

### Development Environment

```json
{
  "enabled": true,
  "dry_run": false,
  "check_interval_minutes": 10,
  "rules": {
    "min_confidence_score": 65,
    "max_migrations_per_run": 5,
    "cooldown_minutes": 30
  },
  "safety_checks": {
    "pause_on_failure": false
  },
  "migration_windows": [],
  "blackout_windows": []
}
```

### Testing Configuration

```json
{
  "enabled": true,
  "dry_run": true,
  "check_interval_minutes": 5,
  "rules": {
    "min_confidence_score": 50,
    "max_migrations_per_run": 10,
    "cooldown_minutes": 15
  },
  "safety_checks": {
    "pause_on_failure": false
  },
  "migration_windows": [],
  "blackout_windows": []
}
```

---

## 📈 Success Metrics

Track automation effectiveness:

**Key Metrics**:
- Success rate > 90%
- Rollback rate < 5%
- Average migrations per day
- Most common skip reasons
- Peak migration times

**Health Indicators**:
- ✅ Green: Success rate ≥ 90%
- ⚠️ Yellow: Success rate 70-89%
- ❌ Red: Success rate < 70%

**When to Adjust**:
- Success rate drops below 85%
- Frequent rollback warnings
- Too many cooldown skips
- Unexpected migration patterns

---

[⬆ Back to Documentation](README.md) | [📖 Main README](../README.md)
