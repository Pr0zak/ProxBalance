#!/bin/bash
# Post-update script that runs after git pull
# This ensures the new code is used for file operations

set -e

echo "Running post-update tasks..."

# Ensure curl is installed (needed for Node.js installation)
if ! command -v curl >/dev/null 2>&1; then
  echo "  → Installing curl..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null 2>&1
  apt-get install -y curl >/dev/null 2>&1
  echo "  ✓ curl installed"
fi

# Build and update web interface
echo "Building web interface..."
cd /opt/proxmox-balance-manager

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
elif [ -f src/app.jsx ]; then
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
  if [ ! -f src/app.jsx ]; then
    echo "  → Extracting JSX from index.html..."
    mkdir -p src
    sed -n '/<script type="text\/babel">/,/<\/script>/p' index.html | \
      sed '1d;$d' | sed '1,2d' > src/app.jsx
  fi

  # Compile JSX to JavaScript
  echo "  → Compiling JSX to JavaScript..."
  mkdir -p /var/www/html/assets/js

  # Use node_modules/.bin/babel directly with preset flag if npx is not available
  if command -v npx >/dev/null 2>&1; then
    npx babel src/app.jsx --out-file /var/www/html/assets/js/app.js 2>/dev/null
  else
    node_modules/.bin/babel src/app.jsx --presets=@babel/preset-react --out-file /var/www/html/assets/js/app.js 2>/dev/null
  fi

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

# Update systemd service files (for new services/timers)
# NOTE: Service restarts are handled by the caller (app.py or update.sh)
# to avoid the API trying to restart itself
echo "Updating systemd services..."
if [ -d /opt/proxmox-balance-manager/systemd ]; then
    cp /opt/proxmox-balance-manager/systemd/*.service /etc/systemd/system/ 2>&1
    cp /opt/proxmox-balance-manager/systemd/*.timer /etc/systemd/system/ 2>&1
    systemctl daemon-reload 2>&1

    # Enable and start automigrate timer if it exists and isn't already enabled
    if [ -f /etc/systemd/system/proxmox-balance-automigrate.timer ]; then
        if ! systemctl is-enabled proxmox-balance-automigrate.timer >/dev/null 2>&1; then
            echo "  ✓ Enabling automigrate timer..."
            systemctl enable proxmox-balance-automigrate.timer 2>&1
            systemctl start proxmox-balance-automigrate.timer 2>&1
        fi
    fi

    # Enable and start recommendations timer if it exists and isn't already enabled
    if [ -f /etc/systemd/system/proxmox-balance-recommendations.timer ]; then
        if ! systemctl is-enabled proxmox-balance-recommendations.timer >/dev/null 2>&1; then
            echo "  ✓ Enabling recommendations timer..."
            systemctl enable proxmox-balance-recommendations.timer 2>&1
            systemctl start proxmox-balance-recommendations.timer 2>&1
        fi
    fi

    echo "✓ Systemd services updated"
fi

echo "Post-update tasks complete"
