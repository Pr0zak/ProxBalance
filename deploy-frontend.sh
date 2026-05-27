#!/usr/bin/env bash
# Build the frontend (esbuild + Tailwind via build.sh) and deploy it to the nginx web
# root. SINGLE SOURCE OF TRUTH for both install.sh (fresh install) and post_update.sh
# (updates), so the build/deploy path can't drift between them again (cf. issues
# #105 and #107, where install.sh still used a stale Babel build).
#
# Runs inside the ProxBalance LXC. Usage: bash deploy-frontend.sh [REPO_DIR] [WEBROOT]
set -euo pipefail

REPO_DIR="${1:-/opt/proxmox-balance-manager}"
WEBROOT="${2:-/var/www/html}"
cd "$REPO_DIR"

# esbuild needs Node >= 18 — install LTS if Node is missing entirely.
if ! command -v node >/dev/null 2>&1; then
  echo "  → Node.js not found — installing Node.js 20 LTS..."
  export DEBIAN_FRONTEND=noninteractive
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
fi

# Build from source when JSX is present; otherwise fall back to a committed pre-built
# bundle (the pre-compiled distribution model).
if { [ -f index.html ] && grep -q 'type="text/babel"' index.html; } \
   || [ -f src/index.jsx ] || [ -f src/app.jsx ]; then
  echo "  → Building frontend (esbuild + Tailwind)..."
  [ -f package.json ] || npm init -y >/dev/null 2>&1
  if [ ! -x node_modules/.bin/esbuild ] || [ ! -x node_modules/.bin/tailwindcss ]; then
    npm install --no-audit --no-fund esbuild tailwindcss@3 >/dev/null 2>&1 || true
  fi
  mkdir -p assets/js assets/css
  [ -f build.sh ] || { echo "  ✗ build.sh missing in ${REPO_DIR}" >&2; exit 1; }
  bash build.sh
elif [ -f assets/js/app.js ]; then
  echo "  → No JSX source found; using pre-built bundle."
else
  echo "  ✗ No src/index.jsx and no prebuilt assets/js/app.js — nothing to deploy." >&2
  exit 1
fi

echo "  → Deploying to ${WEBROOT}..."
mkdir -p "$WEBROOT/assets/js" "$WEBROOT/assets/css"
cp index.html "$WEBROOT/index.html"
cp assets/js/app.js "$WEBROOT/assets/js/app.js"
cp assets/css/tailwind.css "$WEBROOT/assets/css/tailwind.css" 2>/dev/null || true
cp assets/*.svg "$WEBROOT/assets/" 2>/dev/null || true

# React/ReactDOM are referenced locally by index.html — fetch if missing.
for lib in react react-dom; do
  dest="$WEBROOT/assets/js/${lib}.production.min.js"
  [ -f "$dest" ] || curl -sL "https://unpkg.com/${lib}@18/umd/${lib}.production.min.js" -o "$dest"
done

# Cache-bust: source index.html pins a fixed ?v=, so stamp a unique id per deploy —
# otherwise browsers serve a stale bundle and UI changes don't appear without a manual
# hard-refresh.
BUILD_ID="$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)-$(date +%s)"
sed -i -E "s#(app\.js\?v=)[^\"'\\)]*#\\1${BUILD_ID}#g; s#(tailwind\.css\?v=)[^\"'\\)]*#\\1${BUILD_ID}#g" "$WEBROOT/index.html"

# Verify the bundle actually deployed — otherwise nginx's SPA fallback serves index.html
# for /assets/js/app.js (Content-Type text/html), the browser blocks it on nosniff, and
# the UI silently fails to load (issue #107). Fail loudly instead.
APP_SIZE=$(stat -c%s "$WEBROOT/assets/js/app.js" 2>/dev/null || echo 0)
if [ "$APP_SIZE" -lt 10000 ]; then
  echo "  ✗ app.js missing or too small (${APP_SIZE} bytes) — frontend build/deploy failed." >&2
  echo "    Check: node --version (need >= 18) and that npm/npx can reach the registry." >&2
  exit 1
fi
echo "  ✓ Frontend deployed: app.js ${APP_SIZE} bytes (build ${BUILD_ID})"
