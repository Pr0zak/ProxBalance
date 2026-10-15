#!/bin/bash
# ProxBalance Update Script
# Runs from the Proxmox host and reaches into the LXC container via pct exec.
#
# Usage: update.sh <container-id> [-y]
#
# Installs on the stable or beta channel update to the newest published
# release through release_updater.py, the same runner the in-app updater
# uses: it backs up the database and settings, installs the tested web
# bundle, restarts the services and rolls back if ProxBalance doesn't come
# back healthy. Installs on the dev channel move to the latest commit on
# their branch. Older installs without release_updater.py use the legacy
# git pull path below.

set -euo pipefail

CTID=${1:-}
ASSUME_YES=0
[ "${2:-}" = "-y" ] && ASSUME_YES=1

if [ -z "$CTID" ]; then
    echo "Usage: $0 <container-id> [-y]  (the ProxBalance LXC ID, see pct list)"
    exit 1
fi

REPO_PATH="/opt/proxmox-balance-manager"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 ProxBalance Update Script                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PY="$REPO_PATH/venv/bin/python3"

if pct exec "$CTID" -- test -f "$REPO_PATH/release_updater.py"; then
    CHANNEL=$(pct exec "$CTID" -- bash -c "jq -r '.updates.channel // \"stable\"' $REPO_PATH/config.json 2>/dev/null || echo stable")
    case "$CHANNEL" in stable|beta|dev) ;; *) CHANNEL=stable ;; esac
    CURRENT=$(pct exec "$CTID" -- git -C "$REPO_PATH" describe --tags --always)
    echo "Update channel: $CHANNEL"
    echo "Running:        $CURRENT"

    if [ "$CHANNEL" = "dev" ]; then
        BRANCH=$(pct exec "$CTID" -- git -C "$REPO_PATH" rev-parse --abbrev-ref HEAD)
        if [ "$BRANCH" = "HEAD" ]; then
            echo "✗ The dev channel needs a checked-out branch, but this install is on a release tag."
            echo "  Switch the channel to stable in the web UI, or check out a branch first."
            exit 1
        fi
        TARGET_ARGS=(--branch "$BRANCH")
        echo "Target:         latest commit on $BRANCH"
    else
        CHECK=$(pct exec "$CTID" -- "$PY" "$REPO_PATH/release_updater.py" check --channel "$CHANNEL" --force)
        LATEST=$(echo "$CHECK" | jq -r '.latest.tag // empty')
        if [ -z "$LATEST" ]; then
            echo "✗ No $CHANNEL release found. $(echo "$CHECK" | jq -r '.error // empty')"
            exit 1
        fi
        echo "Latest release: $LATEST — $(echo "$CHECK" | jq -r '.latest.name')"
        if [ "$LATEST" = "$CURRENT" ]; then
            echo ""
            echo "✓ Already up to date."
            exit 0
        fi
        echo ""
        echo "$CHECK" | jq -r '.latest.notes' | head -40
        echo ""
        TARGET_ARGS=(--tag "$LATEST")
    fi

    if [ "$ASSUME_YES" != "1" ]; then
        read -r -p "Update now? [y/N] " answer
        case "$answer" in y|Y|yes|YES) ;; *) echo "Cancelled."; exit 0 ;; esac
    fi

    echo ""
    echo "Updating (backup, install, restart, health check; rolls back on failure)..."
    if pct exec "$CTID" -- "$PY" "$REPO_PATH/release_updater.py" apply "${TARGET_ARGS[@]}"; then
        echo ""
        echo "✓ Update complete: now running $(pct exec "$CTID" -- git -C "$REPO_PATH" describe --tags --always)"
    else
        echo ""
        echo "✗ Update failed. Details:"
        pct exec "$CTID" -- "$PY" "$REPO_PATH/release_updater.py" status | jq -r '.steps[] | "  \(if .ok then "✓" else "✗" end) \(.name) \(.detail)"'
        exit 1
    fi
    echo ""
    echo "Access ProxBalance: http://$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"
    exit 0
fi

# ── Legacy path: installs from before release_updater.py ──────────────────
# Detect current branch inside the container
BRANCH=$(pct exec $CTID -- bash -c "cd $REPO_PATH && git rev-parse --abbrev-ref HEAD")
echo "Branch: $BRANCH"

# Get current version
CURRENT_COMMIT=$(pct exec $CTID -- bash -c "cd $REPO_PATH && git rev-parse HEAD")
echo "Current version: ${CURRENT_COMMIT:0:7}"
echo ""

# Fetch latest
echo "Fetching latest updates..."
pct exec $CTID -- bash -c "cd $REPO_PATH && git fetch origin $BRANCH" > /dev/null 2>&1

# Get remote version
REMOTE_COMMIT=$(pct exec $CTID -- bash -c "cd $REPO_PATH && git rev-parse origin/$BRANCH")
echo "Latest version:  ${REMOTE_COMMIT:0:7}"
echo ""

# Check if update needed
if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "✓ ProxBalance is already up to date!"
    exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 WHAT'S NEW:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show commit summaries
pct exec $CTID -- bash -c "cd $REPO_PATH && git log --oneline ${CURRENT_COMMIT}..origin/$BRANCH" | while read line; do
    commit_hash=$(echo "$line" | awk '{print $1}')
    commit_msg=$(echo "$line" | cut -d' ' -f2-)

    echo "  ● $commit_msg"

    # Get full commit message (first paragraph only)
    full_msg=$(pct exec $CTID -- bash -c "cd $REPO_PATH && git log -1 --format=%B $commit_hash" | sed '/^$/q' | tail -n +2)

    if [ -n "$full_msg" ]; then
        echo "$full_msg" | sed 's/^/    /'
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prompt for confirmation
read -p "Do you want to update now? [Y/n]: " confirm
confirm=${confirm:-Y}

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    exit 0
fi

echo ""
echo "Updating ProxBalance..."

# Pull updates
pct exec $CTID -- bash -c "cd $REPO_PATH && git pull origin $BRANCH"

# Install/update Python dependencies
echo "Installing dependencies..."
pct exec $CTID -- bash -c "cd $REPO_PATH && venv/bin/pip install -q --upgrade -r requirements.txt"

# Build web interface and update systemd services via post_update.sh
echo "Running post-update build..."
pct exec $CTID -- bash $REPO_PATH/post_update.sh

# Make Python scripts executable
pct exec $CTID -- chmod +x $REPO_PATH/*.py

# Restart services
echo "Restarting services..."
pct exec $CTID -- systemctl restart proxmox-balance
pct exec $CTID -- systemctl restart nginx
# Restart timers so they re-anchor after daemon-reload
for timer in proxmox-collector proxmox-balance-automigrate proxmox-balance-recommendations; do
    if pct exec $CTID -- systemctl is-enabled "${timer}.timer" >/dev/null 2>&1; then
        pct exec $CTID -- systemctl restart "${timer}.timer"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✓ UPDATE COMPLETE!                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Updated from ${CURRENT_COMMIT:0:7} to ${REMOTE_COMMIT:0:7}"
echo ""
echo "Access ProxBalance: http://$(pct exec $CTID -- hostname -I | awk '{print $1}')"
echo ""
