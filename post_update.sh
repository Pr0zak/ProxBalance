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
  # Ensure tailwindcss is installed for CSS build
  if [ ! -f "node_modules/.bin/tailwindcss" ]; then
    echo "  → Installing tailwindcss..."
    npm install tailwindcss@3 >/dev/null 2>&1
  fi

  # Bundle the frontend using build.sh (Tailwind CSS + esbuild)
  echo "  → Building frontend (Tailwind CSS + esbuild)..."
  mkdir -p assets/js assets/css
  if [ -f build.sh ]; then
    bash build.sh
  else
    # Fallback: direct build commands matching build.sh
    if [ -f "node_modules/.bin/tailwindcss" ]; then
      TAILWIND="node_modules/.bin/tailwindcss"
    else
      TAILWIND="npx tailwindcss"
    fi
    if [ -f "node_modules/.bin/esbuild" ]; then
      ESBUILD="node_modules/.bin/esbuild"
    else
      ESBUILD="npx esbuild"
    fi
    $TAILWIND -i src/input.css -o assets/css/tailwind.css --minify
    $ESBUILD src/index.jsx \
      --bundle \
      --outfile=assets/js/app.js \
      --format=iife \
      --jsx=transform \
      --target=es2020 \
      --minify-syntax
  fi

  # Deploy built files to web root
  echo "  → Deploying to web root..."
  mkdir -p /var/www/html/assets/js /var/www/html/assets/css
  cp assets/js/app.js /var/www/html/assets/js/app.js
  cp assets/css/tailwind.css /var/www/html/assets/css/tailwind.css

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

    # Enable new timers and restart existing ones so they re-anchor after daemon-reload
    for timer in proxmox-balance-automigrate proxmox-balance-recommendations; do
        if [ -f "/etc/systemd/system/${timer}.timer" ]; then
            if ! systemctl is-enabled "${timer}.timer" >/dev/null 2>&1; then
                echo "  ✓ Enabling ${timer} timer..."
                systemctl enable "${timer}.timer" 2>&1
            fi
            echo "  ✓ Restarting ${timer} timer..."
            systemctl restart "${timer}.timer" 2>&1
        fi
    done

    echo "✓ Systemd services updated"
fi

echo "Post-update tasks complete"
