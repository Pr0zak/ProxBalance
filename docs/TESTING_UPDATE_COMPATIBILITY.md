# Testing Update Compatibility

This document explains how to test that older ProxBalance installations can successfully update to newer versions.

## The Challenge

When users run updates from the **Web UI**, they're executing the update code from their *current* installation, not the new version. This means:

- **Old buggy code** (before commit `e927ca4`) will try to update to the new version
- The old code has service restart conflicts that cause SIGTERM errors
- We need to ensure the update still works despite these issues

## Testing Methods

### Method 1: Web UI Update (Recommended)

This simulates a real user updating from an old version:

```bash
# 1. Roll back to a commit BEFORE the fix (e.g., 51805eb)
ssh root@<proxmox-host> "pct exec <ctid> -- bash -c 'cd /opt/proxmox-balance-manager && git reset --hard 51805eb'"
ssh root@<proxmox-host> "pct exec <ctid> -- systemctl restart proxmox-balance"

# 2. Open the Web UI and click "Update ProxBalance"
# URL: http://<proxbalance-ip>/

# 3. Verify the update completes (even with warnings)
ssh root@<proxmox-host> "pct exec <ctid> -- bash -c 'cd /opt/proxmox-balance-manager && git log --oneline -3'"

# 4. Check services are running
ssh root@<proxmox-host> "pct exec <ctid> -- systemctl is-active proxmox-balance nginx"

# 5. Verify the web interface loads properly
curl -s http://<proxbalance-ip>/ | grep -q "ProxBalance" && echo "Web UI working"
```

### Method 2: Manual Update via SSH (Bypasses Web UI)

This uses the shell script that handles updates from Proxmox host:

```bash
# From the Proxmox host:
cd /opt/proxmox-balance-manager
bash update.sh <container-id>
```

**Note:** This method doesn't test Web UI compatibility because it uses `update.sh` instead of `app.py`.

### Method 3: Simulate Old Web UI Update

Test the old buggy update process manually:

```bash
# 1. Roll back to old version
ssh root@<proxmox-host> "pct exec <ctid> -- bash -c 'cd /opt/proxmox-balance-manager && git reset --hard 51805eb'"

# 2. Manually trigger what the old Web UI does
ssh root@<proxmox-host> "pct exec <ctid> -- bash -c '
cd /opt/proxmox-balance-manager

# Fetch and pull (what app.py does)
git fetch origin dev
git pull --ff-only origin dev

# Run the old post_update.sh (with buggy service restarts)
timeout 300 bash post_update.sh

# Check exit code
if [ \$? -eq 0 ]; then
    echo "Update completed successfully"
else
    echo "Update had issues (exit code: \$?)"
fi
'"

# 3. Verify the update worked despite any errors
ssh root@<proxmox-host> "pct exec <ctid> -- bash -c 'cd /opt/proxmox-balance-manager && git log --oneline -1'"
ssh root@<proxmox-host> "pct exec <ctid> -- systemctl restart proxmox-balance"
ssh root@<proxmox-host> "pct exec <ctid> -- systemctl is-active proxmox-balance"
```

## What to Look For

### In Old Versions (Before Fix)

When testing from an old installation, you may see these **expected** warnings:

- `Build failed with exit code -15` (SIGTERM from service restart conflict)
- `Command timed out after 5 seconds` (API service restart timeout)

**These are cosmetic errors.** The update should still succeed because:

1. The build completes before the service restart is attempted
2. The code is already updated via git pull
3. The service will restart anyway (either automatically or on next manual restart)

### After the Fix

Once updated to `e927ca4` or later, subsequent updates should show:

- No SIGTERM errors
- No timeout errors
- Clean message: "API service will restart automatically in 2 seconds..."

## Backward Compatibility Verification Checklist

- [ ] Roll back to commit before fix (`51805eb` or earlier)
- [ ] Update via Web UI to latest version
- [ ] Verify update completes (git commit updated)
- [ ] Verify services are active after update
- [ ] Verify web interface loads and works
- [ ] Run another update (should now be clean, no errors)

## Quick Test Commands

```bash
# Quick compatibility test
CTID=<container-id>
PVE_HOST="<proxmox-host>"

# Roll back
ssh root@$PVE_HOST "pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git reset --hard 51805eb && systemctl restart proxmox-balance'"

echo "Now run update from Web UI at http://<proxbalance-ip>/"
echo "Press Enter when update completes..."
read

# Verify
ssh root@$PVE_HOST "pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git log --oneline -1 && systemctl is-active proxmox-balance'"
```

## Expected Results

**Old installations updating to fixed version:**
- Update completes successfully
- May show cosmetic warnings (expected)
- Services running after update
- Web UI functional

**Fixed installations updating to newer versions:**
- Clean update with no errors
- Clear status messages
- Services restart properly
