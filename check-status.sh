#!/usr/bin/env bash

# ProxBalance Status Checker
# Usage: ./check-status.sh [container-id]

set -euo pipefail

# Colors
RD='\033[0;31m'
YW='\033[1;33m'
GN='\033[0;32m'
BL='\033[0;34m'
CL='\033[0m'
CM="${GN}✓${CL}"
CROSS="${RD}✗${CL}"

CTID="${1:-334}"

echo -e "${BL}╔════════════════════════════════════════════════════════════════╗${CL}"
echo -e "${BL}║${CL}  ${GN}ProxBalance Status Check${CL} - Container ${YW}${CTID}${CL}                     ${BL}║${CL}"
echo -e "${BL}╚════════════════════════════════════════════════════════════════╝${CL}"
echo ""

# Check if container exists
if ! pct status "$CTID" &>/dev/null; then
    echo -e "${CROSS} Container ${CTID} not found"
    exit 1
fi

# Check container status
CT_STATUS=$(pct status "$CTID" | awk '{print $2}')
if [ "$CT_STATUS" = "running" ]; then
    echo -e "${CM} Container Status: ${GN}running${CL}"
else
    echo -e "${CROSS} Container Status: ${RD}${CT_STATUS}${CL}"
    exit 1
fi

# Get container IP
CONTAINER_IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
if [ -n "$CONTAINER_IP" ]; then
    echo -e "${CM} Container IP: ${GN}${CONTAINER_IP}${CL}"
else
    echo -e "${CROSS} Could not determine container IP"
    CONTAINER_IP="localhost"
fi

echo ""
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo -e "${BL}Service Status${CL}"
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"

# Check API service
if pct exec "$CTID" -- systemctl is-active proxmox-balance.service &>/dev/null; then
    echo -e "${CM} API Service: ${GN}active${CL}"
else
    echo -e "${CROSS} API Service: ${RD}inactive${CL}"
fi

# Check collector timer
if pct exec "$CTID" -- systemctl is-active proxmox-collector.timer &>/dev/null; then
    echo -e "${CM} Collector Timer: ${GN}active${CL}"
    
    # Get next run time
    NEXT_RUN=$(pct exec "$CTID" -- systemctl list-timers proxmox-collector.timer 2>/dev/null | grep proxmox-collector | awk '{print $1, $2}')
    if [ -n "$NEXT_RUN" ]; then
        echo -e "   ${BL}Next collection: ${YW}${NEXT_RUN}${CL}"
    fi
else
    echo -e "${CROSS} Collector Timer: ${RD}inactive${CL}"
fi

# Check nginx
if pct exec "$CTID" -- systemctl is-active nginx.service &>/dev/null; then
    echo -e "${CM} Web Server: ${GN}active${CL}"
else
    echo -e "${CROSS} Web Server: ${RD}inactive${CL}"
fi

echo ""
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo -e "${BL}Data Collection Status${CL}"
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"

# Check if cache file exists
if pct exec "$CTID" -- test -f /opt/proxmox-balance-manager/cluster_cache.json; then
    echo -e "${CM} Cache File: ${GN}exists${CL}"
    
    # Get cache timestamp
    CACHE_TIME=$(pct exec "$CTID" -- jq -r '.collected_at // "unknown"' /opt/proxmox-balance-manager/cluster_cache.json 2>/dev/null)
    if [ "$CACHE_TIME" != "unknown" ] && [ -n "$CACHE_TIME" ]; then
        echo -e "   ${BL}Last collection: ${YW}${CACHE_TIME}${CL}"
        
        # Calculate age
        CACHE_EPOCH=$(date -d "$CACHE_TIME" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        AGE_SECONDS=$((NOW_EPOCH - CACHE_EPOCH))
        AGE_MINUTES=$((AGE_SECONDS / 60))
        
        if [ $AGE_MINUTES -lt 1 ]; then
            echo -e "   ${BL}Age: ${GN}< 1 minute${CL}"
        elif [ $AGE_MINUTES -lt 60 ]; then
            echo -e "   ${BL}Age: ${YW}${AGE_MINUTES} minutes${CL}"
        else
            AGE_HOURS=$((AGE_MINUTES / 60))
            echo -e "   ${BL}Age: ${YW}${AGE_HOURS} hours${CL}"
        fi
    fi
    
    # Get cluster summary
    NODE_COUNT=$(pct exec "$CTID" -- jq -r '.summary.total_nodes // 0' /opt/proxmox-balance-manager/cluster_cache.json 2>/dev/null)
    GUEST_COUNT=$(pct exec "$CTID" -- jq -r '.summary.total_guests // 0' /opt/proxmox-balance-manager/cluster_cache.json 2>/dev/null)
    
    if [ "$NODE_COUNT" != "0" ]; then
        echo -e "   ${BL}Nodes: ${GN}${NODE_COUNT}${CL}"
        echo -e "   ${BL}Guests: ${GN}${GUEST_COUNT}${CL}"
    fi
else
    echo -e "${CROSS} Cache File: ${RD}missing${CL}"
    echo -e "   ${YW}Data collection may still be in progress${CL}"
fi

echo ""
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo -e "${BL}API Health Check${CL}"
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"

# Test API endpoint
API_RESPONSE=$(curl -s -w "\n%{http_code}" "http://${CONTAINER_IP}/api/health" 2>/dev/null || echo "error\n000")
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
API_BODY=$(echo "$API_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${CM} API Status: ${GN}healthy${CL} (HTTP ${HTTP_CODE})"
    
    # Parse API response
    if command -v jq &>/dev/null; then
        API_STATUS=$(echo "$API_BODY" | jq -r '.status // "unknown"' 2>/dev/null)
        CACHE_AVAILABLE=$(echo "$API_BODY" | jq -r '.cache_available // false' 2>/dev/null)
        
        if [ "$CACHE_AVAILABLE" = "true" ]; then
            echo -e "   ${BL}Cache: ${GN}available${CL}"
        else
            echo -e "   ${BL}Cache: ${YW}not ready${CL}"
        fi
    fi
else
    echo -e "${CROSS} API Status: ${RD}unhealthy${CL} (HTTP ${HTTP_CODE})"
fi

# Test analyze endpoint
ANALYZE_RESPONSE=$(curl -s -w "\n%{http_code}" "http://${CONTAINER_IP}/api/analyze" 2>/dev/null || echo "error\n000")
ANALYZE_HTTP_CODE=$(echo "$ANALYZE_RESPONSE" | tail -n1)

if [ "$ANALYZE_HTTP_CODE" = "200" ]; then
    echo -e "${CM} Data Endpoint: ${GN}ready${CL}"
elif [ "$ANALYZE_HTTP_CODE" = "503" ]; then
    echo -e "${YW}⚠${CL} Data Endpoint: ${YW}collection in progress${CL}"
else
    echo -e "${CROSS} Data Endpoint: ${RD}error${CL} (HTTP ${ANALYZE_HTTP_CODE})"
fi

echo ""
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo -e "${BL}Frontend Build Status${CL}"
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"

# Check Node.js — only needed to *rebuild* the frontend; the running site serves
# prebuilt assets. esbuild (the bundler) requires Node 18+, so flag older versions:
# a too-old Node is the usual reason app.js/index.html never got built (see issue #105).
NODE_VERSION=$(pct exec "$CTID" -- node --version 2>/dev/null || echo "not installed")
if [ "$NODE_VERSION" != "not installed" ]; then
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/^v//; s/\..*//')
    if [ "${NODE_MAJOR:-0}" -ge 18 ] 2>/dev/null; then
        echo -e "${CM} Node.js: ${GN}${NODE_VERSION}${CL}"
    else
        echo -e "${YW}⚠${CL} Node.js: ${YW}${NODE_VERSION} — too old to build the frontend (need v18+; install via NodeSource)${CL}"
    fi
else
    echo -e "${CROSS} Node.js: ${RD}not installed${CL} (only required to rebuild)"
fi

# NOTE: the frontend builds with esbuild + tailwindcss (fetched via npx) — there is no
# Babel and no committed package.json. The real runtime health signal is the deployed
# assets below (app.js / React / index.html in /var/www/html), not the build toolchain.

# Check compiled app.js
if pct exec "$CTID" -- test -f /var/www/html/assets/js/app.js 2>/dev/null; then
    APP_SIZE=$(pct exec "$CTID" -- stat -c%s /var/www/html/assets/js/app.js 2>/dev/null)
    APP_SIZE_KB=$((APP_SIZE / 1024))
    echo -e "${CM} Compiled app.js: ${GN}${APP_SIZE_KB} KB${CL}"
else
    echo -e "${CROSS} Compiled app.js: ${RD}missing${CL}"
fi

# Check React libraries
if pct exec "$CTID" -- test -f /var/www/html/assets/js/react.production.min.js 2>/dev/null; then
    REACT_SIZE=$(pct exec "$CTID" -- stat -c%s /var/www/html/assets/js/react.production.min.js 2>/dev/null)
    REACT_SIZE_KB=$((REACT_SIZE / 1024))
    echo -e "${CM} React: ${GN}${REACT_SIZE_KB} KB${CL}"
else
    echo -e "${CROSS} React: ${RD}missing${CL}"
fi

if pct exec "$CTID" -- test -f /var/www/html/assets/js/react-dom.production.min.js 2>/dev/null; then
    REACT_DOM_SIZE=$(pct exec "$CTID" -- stat -c%s /var/www/html/assets/js/react-dom.production.min.js 2>/dev/null)
    REACT_DOM_SIZE_KB=$((REACT_DOM_SIZE / 1024))
    echo -e "${CM} React-DOM: ${GN}${REACT_DOM_SIZE_KB} KB${CL}"
else
    echo -e "${CROSS} React-DOM: ${RD}missing${CL}"
fi

# Check index.html
if pct exec "$CTID" -- test -f /var/www/html/index.html 2>/dev/null; then
    INDEX_SIZE=$(pct exec "$CTID" -- stat -c%s /var/www/html/index.html 2>/dev/null)
    # Check if it references local React (good) or CDN (bad)
    if pct exec "$CTID" -- grep -q 'assets/js/react.production.min.js' /var/www/html/index.html 2>/dev/null; then
        echo -e "${CM} index.html: ${GN}optimized (${INDEX_SIZE} bytes)${CL}"
    else
        echo -e "${YW}⚠${CL} index.html: ${YW}not optimized (using CDN)${CL}"
    fi
else
    echo -e "${CROSS} index.html: ${RD}missing${CL}"
fi

echo ""
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo -e "${BL}Proxmox API Token Status${CL}"
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"

# Check API token configuration
TOKEN_ID=$(pct exec "$CTID" -- jq -r '.proxmox_api_token_id // ""' /opt/proxmox-balance-manager/config.json 2>/dev/null)
TOKEN_SECRET=$(pct exec "$CTID" -- jq -r '.proxmox_api_token_secret // ""' /opt/proxmox-balance-manager/config.json 2>/dev/null)
PROXMOX_HOST=$(pct exec "$CTID" -- jq -r '.proxmox_host // "localhost"' /opt/proxmox-balance-manager/config.json 2>/dev/null)
PROXMOX_PORT=$(pct exec "$CTID" -- jq -r '.proxmox_port // 8006' /opt/proxmox-balance-manager/config.json 2>/dev/null)

if [ -n "$TOKEN_ID" ] && [ "$TOKEN_ID" != "null" ]; then
    echo -e "${CM} Token ID: ${GN}${TOKEN_ID}${CL}"
else
    echo -e "${CROSS} Token ID: ${RD}not configured${CL}"
fi

if [ -n "$TOKEN_SECRET" ] && [ "$TOKEN_SECRET" != "null" ]; then
    SECRET_LEN=${#TOKEN_SECRET}
    echo -e "${CM} Token Secret: ${GN}configured${CL} (${SECRET_LEN} characters)"
else
    echo -e "${CROSS} Token Secret: ${RD}not configured${CL}"
fi

echo -e "   ${BL}Proxmox Host: ${YW}${PROXMOX_HOST}:${PROXMOX_PORT}${CL}"

# Test API token connectivity
if [ -n "$TOKEN_ID" ] && [ -n "$TOKEN_SECRET" ] && [ "$TOKEN_SECRET" != "null" ]; then
    echo ""
    echo -e "   ${BL}Testing Proxmox API connectivity...${CL}"

    # Test API call using the token
    API_TEST=$(pct exec "$CTID" -- curl -s -k -w "\n%{http_code}" \
        -H "Authorization: PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}" \
        "https://${PROXMOX_HOST}:${PROXMOX_PORT}/api2/json/version" 2>/dev/null || echo "error\n000")

    API_HTTP_CODE=$(echo "$API_TEST" | tail -n1)

    if [ "$API_HTTP_CODE" = "200" ]; then
        echo -e "${CM} Proxmox API: ${GN}connected${CL}"

        # Get Proxmox version from response
        PVE_VERSION=$(echo "$API_TEST" | head -n-1 | jq -r '.data.version // "unknown"' 2>/dev/null)
        if [ -n "$PVE_VERSION" ] && [ "$PVE_VERSION" != "unknown" ]; then
            echo -e "   ${BL}Proxmox Version: ${GN}${PVE_VERSION}${CL}"
        fi
    elif [ "$API_HTTP_CODE" = "401" ]; then
        echo -e "${CROSS} Proxmox API: ${RD}authentication failed${CL}"
        echo -e "   ${YW}Token may be invalid or expired${CL}"
    elif [ "$API_HTTP_CODE" = "000" ]; then
        echo -e "${CROSS} Proxmox API: ${RD}connection failed${CL}"
        echo -e "   ${YW}Cannot reach Proxmox host at ${PROXMOX_HOST}:${PROXMOX_PORT}${CL}"
    else
        echo -e "${CROSS} Proxmox API: ${RD}error${CL} (HTTP ${API_HTTP_CODE})"
    fi
else
    echo -e "${YW}⚠${CL} API token not fully configured"
    echo -e "   ${YW}Run the installer to configure Proxmox API access${CL}"
fi

echo ""
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo -e "${BL}Quick Actions${CL}"
echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
echo ""
echo -e "  ${YW}# Access web interface${CL}"
echo -e "  ${BL}http://${CONTAINER_IP}${CL}"
echo ""
echo -e "  ${YW}# Trigger manual collection${CL}"
echo -e "  ${BL}curl -X POST http://${CONTAINER_IP}/api/refresh${CL}"
echo -e "  ${BL}pct exec ${CTID} -- systemctl start proxmox-collector.service${CL}"
echo ""
echo -e "  ${YW}# View logs${CL}"
echo -e "  ${BL}pct exec ${CTID} -- journalctl -u proxmox-balance -f${CL}"
echo -e "  ${BL}pct exec ${CTID} -- journalctl -u proxmox-collector -f${CL}"
echo ""
echo -e "  ${YW}# Restart services${CL}"
echo -e "  ${BL}pct exec ${CTID} -- systemctl restart proxmox-balance${CL}"
echo ""
