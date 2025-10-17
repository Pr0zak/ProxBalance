#!/bin/bash
# ProxBalance Update Script
# Shows what's new before updating

set -e

CTID=${1:-336}

if [ -z "$CTID" ]; then
    echo "Usage: $0 <container-id>"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 ProxBalance Update Script                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Get current version
CURRENT_COMMIT=$(pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git rev-parse HEAD')
echo "Current version: ${CURRENT_COMMIT:0:7}"
echo ""

# Fetch latest
echo "Fetching latest updates..."
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git fetch origin main' > /dev/null 2>&1

# Get remote version
REMOTE_COMMIT=$(pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git rev-parse origin/main')
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
pct exec $CTID -- bash -c "cd /opt/proxmox-balance-manager && git log --oneline ${CURRENT_COMMIT}..origin/main" | while read line; do
    commit_hash=$(echo "$line" | awk '{print $1}')
    commit_msg=$(echo "$line" | cut -d' ' -f2-)

    echo "  ● $commit_msg"

    # Get full commit message (first paragraph only)
    full_msg=$(pct exec $CTID -- bash -c "cd /opt/proxmox-balance-manager && git log -1 --format=%B $commit_hash" | sed '/^$/q' | tail -n +2)

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
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git pull origin main'

# Copy index.html to web root
echo "Updating web interface..."
pct exec $CTID -- cp /opt/proxmox-balance-manager/index.html /var/www/html/

# Restart services
echo "Restarting services..."
pct exec $CTID -- systemctl restart proxmox-balance
pct exec $CTID -- systemctl restart nginx

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✓ UPDATE COMPLETE!                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Updated from ${CURRENT_COMMIT:0:7} to ${REMOTE_COMMIT:0:7}"
echo ""
echo "Access ProxBalance: http://$(pct exec $CTID -- hostname -I | awk '{print $1}')"
echo ""
