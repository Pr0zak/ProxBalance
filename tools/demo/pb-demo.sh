#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# ProxBalance demo cluster
#
# Runs ProxBalance against a fake Proxmox API with an invented five-node
# cluster (orion, lyra, vega, draco, cygnus) and seeded history, for
# screenshots and trying features. Nothing reaches a real Proxmox host.
#
#   pb-demo.sh on      back up config + data, start the demo
#   pb-demo.sh off     stop the demo, restore config + data
#   pb-demo.sh reset   off, then on (fresh history)
#   pb-demo.sh status
#
# Meant for a test install (staging). It refuses to run on a host whose
# name is not proxbalance-staging unless PB_DEMO_ANY_HOST=1 is set.
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

APP="${PB_APP:-/opt/proxmox-balance-manager}"
DEMO="$APP/tools/demo"
PY="$APP/venv/bin/python3"
BACKUP="/root/pb-demo-backup"
STATE_DIR="/var/lib/pb-demo"
UNIT="pb-demo-api"
FILES=(config.json proxbalance.db proxbalance.db-wal proxbalance.db-shm cluster_cache.json
       recommendations_cache.json notification_status.json notification_status.json.lock evacuation_sessions)
TIMERS=(proxmox-collector.timer proxmox-balance-automigrate.timer proxmox-balance-recommendations.timer)

ok() { printf '\033[32m✓\033[0m %s\n' "$1"; }
info() { printf '\033[36m◆\033[0m %s\n' "$1"; }
die() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

guard() {
  [[ "$(id -u)" == "0" ]] || die "run as root"
  if [[ "$(hostname)" != "proxbalance-staging" && "${PB_DEMO_ANY_HOST:-0}" != "1" ]]; then
    die "host is $(hostname), not proxbalance-staging; set PB_DEMO_ANY_HOST=1 to run anyway"
  fi
  [[ -f "$DEMO/fake_pve.py" ]] || die "$DEMO/fake_pve.py not found (check out a branch that has tools/demo)"
}

stop_app() {
  systemctl stop "${TIMERS[@]}" proxmox-balance 2>/dev/null || true
  systemctl stop proxmox-collector.service proxmox-balance-automigrate.service \
    proxmox-balance-recommendations.service 2>/dev/null || true
}

start_app() {
  systemctl start proxmox-balance "${TIMERS[@]}"
}

wait_api() {
  for _ in $(seq 1 30); do
    if curl -sk -o /dev/null https://127.0.0.1:8006/api2/json/version; then return 0; fi
    sleep 1
  done
  die "fake Proxmox API did not start (journalctl -u $UNIT)"
}

demo_on() {
  [[ -d "$BACKUP" ]] && die "demo is already on ($BACKUP exists); use reset or off"
  info "stopping ProxBalance"
  stop_app
  mkdir -p "$BACKUP"
  for f in "${FILES[@]}"; do
    if [[ -e "$APP/$f" ]]; then mv "$APP/$f" "$BACKUP/"; fi
  done
  ok "config and data moved to $BACKUP"

  mkdir -p "$STATE_DIR"
  if [[ ! -f "$STATE_DIR/cert.pem" ]]; then
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj /CN=demo-pve \
      -keyout "$STATE_DIR/key.pem" -out "$STATE_DIR/cert.pem" 2>/dev/null
  fi
  PB_DEMO_STATE="$STATE_DIR/state.json" "$PY" "$DEMO/scenario.py" init >/dev/null
  "$PY" "$DEMO/make_config.py" > "$APP/config.json"
  ok "demo config written (fake API on 127.0.0.1:8006, semi-automatic, live moves)"

  cat > "/etc/systemd/system/$UNIT.service" <<EOF
[Unit]
Description=ProxBalance demo cluster (fake Proxmox API)
After=network.target

[Service]
Environment=PB_DEMO_STATE=$STATE_DIR/state.json
ExecStart=$PY $DEMO/fake_pve.py --cert $STATE_DIR/cert.pem --key $STATE_DIR/key.pem --port 8006
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now "$UNIT" >/dev/null 2>&1
  wait_api
  ok "fake Proxmox API running"

  info "seeding history (takes a minute)"
  (cd "$APP" && PB_DEMO_STATE="$STATE_DIR/state.json" "$PY" "$DEMO/seed.py")
  info "first collection"
  (cd "$APP" && "$PY" collector_api.py >/tmp/pb-demo-collect.log 2>&1) || die "collection failed, see /tmp/pb-demo-collect.log"
  (cd "$APP" && "$PY" update_timer.py >/dev/null 2>&1) || true
  start_app
  sleep 3
  (cd "$APP" && "$PY" generate_recommendations.py >/tmp/pb-demo-recs.log 2>&1) || true
  ok "demo is on: http://$(hostname -I | awk '{print $1}')/"
}

demo_off() {
  [[ -d "$BACKUP" ]] || die "demo is not on ($BACKUP missing)"
  info "stopping ProxBalance and the fake API"
  stop_app
  systemctl disable --now "$UNIT" >/dev/null 2>&1 || true
  rm -f "/etc/systemd/system/$UNIT.service"
  systemctl daemon-reload
  for f in "${FILES[@]}"; do rm -rf "${APP:?}/$f"; done
  for f in "${FILES[@]}"; do
    if [[ -e "$BACKUP/$f" ]]; then mv "$BACKUP/$f" "$APP/"; fi
  done
  rmdir "$BACKUP"
  rm -f "$STATE_DIR/state.json"
  ok "config and data restored"
  (cd "$APP" && "$PY" update_timer.py >/dev/null 2>&1) || true
  start_app
  systemctl start --no-block proxmox-collector.service
  ok "demo is off; a collection from the real cluster is running"
}

demo_status() {
  if [[ -d "$BACKUP" ]]; then
    echo "demo: on (backup in $BACKUP)"
    systemctl is-active "$UNIT" >/dev/null && echo "fake API: running" || echo "fake API: stopped"
  else
    echo "demo: off"
  fi
}

case "${1:-status}" in
  on) guard; demo_on ;;
  off) guard; demo_off ;;
  reset) guard; demo_off; demo_on ;;
  status) demo_status ;;
  *) die "usage: $0 on|off|reset|status" ;;
esac
