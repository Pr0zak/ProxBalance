#!/bin/bash
# ProxBalance Update Script
# Shows what's new before updating
# Runs from the Proxmox host and reaches into the LXC container via pct exec

set -e

CTID=${1:-336}

if [ -z "$CTID" ]; then
    echo "Usage: $0 <container-id>"
    exit 1
fi

REPO_PATH="/opt/proxmox-balance-manager"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 ProxBalance Update Script                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

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
