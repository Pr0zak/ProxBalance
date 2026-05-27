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

# Build + deploy the web interface. Shared with install.sh via deploy-frontend.sh so the
# build path (esbuild + Tailwind), web-root deploy, React fetch, and cache-bust stay
# identical between fresh installs and updates (cf. issues #105, #107).
echo "Building web interface..."
bash /opt/proxmox-balance-manager/deploy-frontend.sh

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
