#!/bin/bash
# Hotfix for 502 error after upgrade
# Installs missing flask-compress package and updates to latest version

set -euo pipefail

CTID=${1:-}

if [ -z "$CTID" ]; then
    echo "Usage: $0 <container-id>"
    echo ""
    echo "This script fixes 502 errors caused by missing flask-compress package."
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         ProxBalance 502 Error Hotfix                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Install missing flask-compress package
echo "Installing missing flask-compress package..."
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && source venv/bin/activate && pip install -q flask-compress>=1.13'

# Update to latest version (which includes the fix in update.sh for future updates)
echo "Updating to latest ProxBalance version..."
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git pull origin main'

# Install all dependencies from requirements.txt
echo "Installing all dependencies..."
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && source venv/bin/activate && pip install -q -r requirements.txt'

# Copy index.html to web root
echo "Updating web interface..."
pct exec $CTID -- cp /opt/proxmox-balance-manager/index.html /var/www/html/

# Restart services
echo "Restarting services..."
pct exec $CTID -- systemctl restart proxmox-balance
pct exec $CTID -- systemctl restart nginx

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✓ HOTFIX COMPLETE!                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "The 502 error should now be resolved."
echo "Access ProxBalance: http://$(pct exec $CTID -- hostname -I | awk '{print $1}')"
echo ""
echo "Future updates can use the regular update.sh script."
echo ""
