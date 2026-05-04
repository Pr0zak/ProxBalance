#!/bin/bash
# Post-update script that runs after git pull
# This ensures the new code is used for file operations

set -euo pipefail

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
elif [ -f src/index.jsx ] || [ -f src/app.jsx ]; then
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

  # Sync brand assets (favicon, logos, etc.) — these aren't built artifacts
  # but they live in assets/ alongside the bundled JS/CSS.
  echo "  → Syncing brand SVGs..."
  cp assets/*.svg /var/www/html/assets/ 2>/dev/null || true

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

    # Migrate legacy automigrate timer drop-in: OnUnitActiveSec re-anchors to
    # the last service activation, so a single crashing run silently breaks
    # the schedule until somebody notices. Replace with wall-clock OnCalendar.
    # Only rewrite if the existing drop-in still uses the legacy form.
    AUTOMIGRATE_OVERRIDE_DIR="/etc/systemd/system/proxmox-balance-automigrate.timer.d"
    AUTOMIGRATE_OVERRIDE="$AUTOMIGRATE_OVERRIDE_DIR/interval.conf"
    if [ -f "$AUTOMIGRATE_OVERRIDE" ] && \
       grep -q '^OnUnitActiveSec=' "$AUTOMIGRATE_OVERRIDE" && \
       ! grep -q '^OnCalendar=' "$AUTOMIGRATE_OVERRIDE"; then
        # Pull the configured interval from config.json (default 30 if absent)
        INTERVAL=$(jq -r '.automated_migrations.check_interval_minutes // 30' \
                       /opt/proxmox-balance-manager/config.json 2>/dev/null)
        case "$INTERVAL" in ''|*[!0-9]*) INTERVAL=30 ;; esac
        if [ "$INTERVAL" -ge 1 ] && [ "$INTERVAL" -le 59 ]; then
            ON_CAL="*:0/$INTERVAL"
        elif [ "$INTERVAL" -eq 60 ]; then
            ON_CAL="*:00"
        elif [ "$INTERVAL" -gt 60 ] && [ $((INTERVAL % 60)) -eq 0 ]; then
            HOURS=$((INTERVAL / 60))
            ON_CAL="*-*-* 0/${HOURS}:00:00"
        else
            ON_CAL=""
        fi
        if [ -n "$ON_CAL" ]; then
            echo "  ✓ Migrating automigrate timer drop-in to OnCalendar=$ON_CAL..."
            cat > "$AUTOMIGRATE_OVERRIDE" <<EOF
[Timer]
OnUnitActiveSec=
OnCalendar=
OnCalendar=$ON_CAL
EOF
        fi
    fi

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
