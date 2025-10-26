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

# Install/update Python dependencies
echo "Installing dependencies..."
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && source venv/bin/activate && pip install -q -r requirements.txt'

# Build and update web interface
echo "Building web interface..."
pct exec $CTID -- bash <<'BUILD_EOF'
cd /opt/proxmox-balance-manager

# Ensure curl is installed (needed for Node.js installation)
if ! command -v curl >/dev/null 2>&1; then
  echo "  → Installing curl..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null 2>&1
  apt-get install -y curl >/dev/null 2>&1
  echo "  ✓ curl installed"
fi

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "  ⚠  Node.js not found - installing Node.js 20 LTS..."
  export DEBIAN_FRONTEND=noninteractive
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
  echo "  ✓ Node.js installed"
fi

# Check if we need to build (detect if index.html has inline JSX)
if [ -f index.html ] && grep -q 'type="text/babel"' index.html; then
  echo "  ⚠  Legacy inline JSX detected - upgrading to pre-compiled architecture"
  NEEDS_BUILD=true
elif [ -f src/app.jsx ] || [ -f src/app_fixed.jsx ]; then
  echo "  ✓ Pre-compiled architecture detected - rebuilding"
  NEEDS_BUILD=true
else
  echo "  ℹ  No JSX source found - assuming pre-built"
  NEEDS_BUILD=false
fi

if [ "$NEEDS_BUILD" = "true" ]; then
  # Install Babel dependencies if not present
  if [ ! -d node_modules/@babel ]; then
    echo "  → Installing Babel dependencies..."
    npm install --save-dev @babel/core @babel/cli @babel/preset-react >/dev/null 2>&1
  fi

  # Create Babel configuration
  cat > .babelrc <<'BABEL_CONFIG'
{
  "presets": ["@babel/preset-react"]
}
BABEL_CONFIG

  # Extract JSX from index.html if needed (for upgrades from old versions)
  if [ ! -f src/app.jsx ] && [ ! -f src/app_fixed.jsx ]; then
    echo "  → Extracting JSX from index.html..."
    mkdir -p src
    sed -n '/<script type="text\/babel">/,/<\/script>/p' index.html | \
      sed '1d;$d' | sed '1,2d' > src/app.jsx
  fi

  # Compile JSX to JavaScript
  echo "  → Compiling JSX to JavaScript..."
  mkdir -p /var/www/html/assets/js
  mkdir -p assets/js

  # Use node_modules/.bin/babel directly with preset flag if npx is not available
  if command -v npx >/dev/null 2>&1; then
    npx babel src/app.jsx --out-file /tmp/app.js 2>/dev/null
  else
    node_modules/.bin/babel src/app.jsx --presets=@babel/preset-react --out-file /tmp/app.js 2>/dev/null
  fi

  # Copy compiled app.js to BOTH locations (source and nginx serving)
  cp /tmp/app.js /opt/proxmox-balance-manager/assets/js/app.js
  cp /tmp/app.js /var/www/html/assets/js/app.js

  # Download React libraries if not present
  if [ ! -f /var/www/html/assets/js/react.production.min.js ]; then
    echo "  → Downloading React libraries..."
    curl -sL https://unpkg.com/react@18/umd/react.production.min.js \
      -o /var/www/html/assets/js/react.production.min.js
    curl -sL https://unpkg.com/react-dom@18/umd/react-dom.production.min.js \
      -o /var/www/html/assets/js/react-dom.production.min.js
  fi

  # Copy index.html (already pre-compiled with correct structure)
  echo "  → Copying index.html..."
  cp index.html /var/www/html/index.html

  echo "  ✓ Web interface built and optimized"
else
  # Just copy pre-built files
  echo "  → Copying web interface files..."
  cp index.html /var/www/html/
  if [ -d assets ]; then
    cp -r assets/* /var/www/html/assets/ 2>/dev/null || true
  fi
  echo "  ✓ Web interface updated"
fi
BUILD_EOF

# Update systemd service files (for new services/timers)
echo "Updating system services..."
pct exec $CTID -- bash <<'SERVICES_EOF'
# Make Python scripts executable
chmod +x /opt/proxmox-balance-manager/*.py

# Copy systemd files
if [ -d /opt/proxmox-balance-manager/systemd ]; then
  cp /opt/proxmox-balance-manager/systemd/*.service /etc/systemd/system/
  cp /opt/proxmox-balance-manager/systemd/*.timer /etc/systemd/system/
  systemctl daemon-reload

  # Enable new services if they exist and aren't already enabled
  if [ -f /etc/systemd/system/proxmox-balance-recommendations.timer ]; then
    if ! systemctl is-enabled proxmox-balance-recommendations.timer >/dev/null 2>&1; then
      echo "  ✓ Enabling recommendations timer..."
      systemctl enable proxmox-balance-recommendations.timer
      systemctl start proxmox-balance-recommendations.timer
    fi
  fi

  # Enable automigrate timer if it exists and isn't already enabled
  if [ -f /etc/systemd/system/proxmox-balance-automigrate.timer ]; then
    if ! systemctl is-enabled proxmox-balance-automigrate.timer >/dev/null 2>&1; then
      echo "  ✓ Enabling automigrate timer..."
      systemctl enable proxmox-balance-automigrate.timer
      systemctl start proxmox-balance-automigrate.timer
    fi
  fi
fi
SERVICES_EOF

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
