# Features

---

## Monitoring

### Real-Time Metrics

- Live CPU, memory, IOWait, and load metrics for all cluster nodes
- Sparkline visualizations with 40-point historical trends
- Color-coded health indicators (green/yellow/red)
- Per-guest metrics including CPU, memory, disk I/O, and network I/O

### Multi-Timeframe Charts

- Historical data from 1 hour to 1 year
- Automatic resolution optimization per time range
- Interactive Chart.js visualizations

### Cluster Map

Five interactive view modes:

1. **CPU Usage** - Real-time CPU utilization with health indicators
2. **Memory Usage** - Memory consumption per node
3. **Allocated Resources** - Provisioned CPU cores and memory
4. **Disk I/O** - Read/write rates and IOWait metrics
5. **Network** - Inbound/outbound traffic rates

Click nodes to view detailed metrics, manage maintenance mode, and plan evacuations. Click guests to view live sparkline graphs and initiate migrations.

**Visual indicators on guests:**
- Cyan dot: Container with shared mount points (safe to migrate)
- Orange dot: Container with unshared bind mounts (may require manual migration)
- Red dot: VM with passthrough disks (cannot migrate, excluded from recommendations)

### Dark Mode

Automatic theme detection with manual light/dark toggle. Persistent preference across sessions.

---

## Migration

### One-Click Migrations

- Execute VM and CT migrations from the web interface
- Real-time progress tracking with MB/s transfer rates
- Multi-disk progress tracking for VMs with multiple disks
- Container migration with percentage and transfer rate display

### Penalty-Based Scoring

Nodes are scored using a penalty system rather than hard disqualifications. Each target node receives penalties for high CPU, memory, IOWait, guest density, maintenance mode, storage incompatibility, and anti-affinity violations. Scores are converted to suitability ratings (0-100%).

See [Scoring Algorithm](SCORING_ALGORITHM.md) for the full specification.

### Node Maintenance Mode

- Mark nodes for maintenance from the cluster map
- Automatic evacuation planning with storage validation
- Priority evacuation in automated migrations (bypasses tag restrictions)
- Visual indicators across the UI

### Anti-Affinity Rules

Tag-based system to enforce workload separation:

```bash
pvesh set /nodes/pve1/qemu/101/config --tags "exclude_database"
pvesh set /nodes/pve2/qemu/102/config --tags "exclude_database"
```

Guests with matching `exclude_*` tags are penalized when placed on the same node. Violations are flagged in the dashboard.

### Affinity Rules

Tag-based system to keep related workloads together:

```bash
pvesh set /nodes/pve1/qemu/200/config --tags "affinity_webstack"
pvesh set /nodes/pve1/qemu/201/config --tags "affinity_webstack"
```

Guests with matching `affinity_*` tags are kept on the same node. When one member is migrated, companion migrations are automatically generated for the rest of the group. Split groups (members on different nodes) are flagged in the dashboard.

### Storage Compatibility

Pre-migration validation ensures all required storage volumes exist on the target node. Incompatible targets are heavily penalized in scoring but not completely excluded, allowing emergency evacuations.

### Migration History

7-day timeline with pagination, success/failure tracking, and CSV export. Configurable page size (5-100 entries).

---

## Automation

### Scheduled Migrations

- Configurable check interval (1-60 minutes)
- Migration windows and blackout periods with timezone support
- Dry-run mode for testing (enabled by default)

### Safety Features

- Cluster health and quorum verification
- Duplicate migration prevention via Proxmox task API
- Rollback detection to prevent migration loops
- Rate limiting (max migrations per run, cooldown periods)
- Automatic pause after failure

### Distribution Balancing

Balances guest counts across nodes by migrating small VMs/CTs. Addresses uneven guest distribution that performance metrics alone may not reveal.

### Tag Controls

- `ignore` and `no-auto-migrate` tags exclude guests from automation
- `exclude_*` tags enforce anti-affinity (keep guests apart)
- `affinity_*` tags enforce pro-affinity (keep guests together) with automatic companion migrations
- `auto-migrate-ok` enables whitelist mode
- Tags are bypassed for maintenance evacuations

See [Automated Migrations Guide](AUTOMATION.md) for configuration.

---

## AI Analysis

Optional AI-powered recommendations using:

- **OpenAI** (GPT-4o, GPT-3.5-turbo)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Ollama** (Qwen2.5, Llama3.1, Mistral - self-hosted)

Capabilities:
- Multi-dimensional analysis of CPU, memory, load, and historical trends
- Configurable analysis periods (1h, 6h, 24h, 7d)
- Predictive workload analysis and trend detection
- Natural language reasoning for each recommendation
- Risk assessment and timing suggestions
- Smart filtering to prevent hallucinated node names

See [AI Features](AI_FEATURES.md) for setup.

---

## Notifications

Multi-provider notification system for automated migration events:

- **Pushover** - Push notifications to mobile and desktop
- **Email** - SMTP-based email alerts
- **Telegram** - Bot messages to chats and groups
- **Discord** - Channel webhooks
- **Slack** - Incoming webhooks
- **Custom Webhooks** - HTTP POST with JSON to any URL

Configurable triggers: migration start, completion, and failure.

See [Notifications](NOTIFICATIONS.md) for setup.

---

## Performance

- Pre-compiled React frontend (93% faster page load, LCP from 6.5s to 0.48s)
- In-memory caching with 60-second TTL (85% faster API responses)
- gzip compression (70-80% bandwidth reduction)
- Parallel data collection with configurable workers
- Memoized React components
- Lazy-loaded Chart.js (300KB+ saved on initial load)
- Self-hosted React libraries (no CDN dependency)

---

## Security

- API token authentication (no stored passwords)
- Unprivileged LXC container isolation
- Local network design (no external exposure required)
- Optional SSL/TLS with Let's Encrypt
- Fine-grained Proxmox permissions (PVEAuditor for read-only, PVEVMAdmin for full access)
- Audit trail via migration history and service logs

---

## User Interface

- Single-page React application
- Responsive design for desktop, tablet, and mobile
- Collapsible dashboard sections with persistent state
- Modal dialogs for detailed views
- Keyboard navigation support
- Settings panel for all configuration without SSH

---

[Back to Documentation](README.md)
