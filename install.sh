#!/usr/bin/env bash

# Copyright (c) 2024 ProxBalance
# Author: Pr0zak
# License: MIT
# https://github.com/Pr0zak/ProxBalance
#
# ProxBalance - Proxmox Balance Manager
# Standalone Installer v2.0

set -euo pipefail
shopt -s inherit_errexit nullglob

# ═══════════════════════════════════════════════════════════════
# Debug Mode Configuration
# ═══════════════════════════════════════════════════════════════
DEBUG_MODE=false

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    -d|--debug)
      DEBUG_MODE=true
      echo "Debug mode enabled"
      set -x  # Enable command tracing
      shift
      ;;
    -h|--help)
      echo "ProxBalance Installer"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -d, --debug    Enable debug mode with verbose output"
      echo "  -h, --help     Show this help message"
      echo ""
      exit 0
      ;;
  esac
done

# ═══════════════════════════════════════════════════════════════
# Color Definitions
# ═══════════════════════════════════════════════════════════════
RD='\033[0;31m'
YW='\033[1;33m'
GN='\033[0;32m'
BL='\033[0;34m'
CY='\033[0;36m'
MG='\033[0;35m'
BFR='\033[1;97m'
BOLD='\033[1m'
DIM='\033[2m'
CL='\033[0m'
CM="${GN}✓${CL}"
CROSS="${RD}✗${CL}"
INFO="${CY}◆${CL}"
WARN="${YW}⚠${CL}"
STAR="${YW}★${CL}"

# Spinner frames for animations
SPINNER_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

# ═══════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════
msg_info() {
  echo -e "${INFO} ${BOLD}${BL}${1}${CL}"
}

msg_ok() {
  echo -e "${CM} ${GN}${1}${CL}"
}

msg_error() {
  echo -e "${CROSS} ${BOLD}${RD}${1}${CL}"
}

msg_warn() {
  echo -e "${WARN} ${YW}${1}${CL}"
}

debug_log() {
  if [ "$DEBUG_MODE" = true ]; then
    echo -e "${DIM}[DEBUG]${CL} ${1}"
  fi
}

debug_cmd() {
  if [ "$DEBUG_MODE" = true ]; then
    echo -e "${DIM}[CMD]${CL} ${1}"
    eval "$1" 2>&1 | sed 's/^/  /'
  else
    eval "$1" >/dev/null 2>&1
  fi
}

# Spinner for long-running operations
spinner() {
  local pid=$1
  local message=$2
  local i=0

  tput civis # Hide cursor
  while kill -0 "$pid" 2>/dev/null; do
    i=$(( (i+1) % ${#SPINNER_FRAMES[@]} ))
    printf "\r${CY}${SPINNER_FRAMES[$i]}${CL} ${DIM}${message}...${CL}"
    sleep 0.1
  done
  wait "$pid"
  local exit_code=$?
  tput cnorm # Show cursor
  printf "\r"
  return $exit_code
}

# Progress bar
show_progress() {
  local current=$1
  local total=$2
  local width=40
  local percentage=$((current * 100 / total))
  local completed=$((width * current / total))
  local remaining=$((width - completed))

  printf "\r${BL}["
  printf "%${completed}s" | tr ' ' '▓'
  printf "%${remaining}s" | tr ' ' '░'
  printf "]${CL} ${BOLD}${percentage}%%${CL}"
}

# Section divider
section_header() {
  local title=$1
  local step=$2
  local total=$3
  echo ""
  echo -e "${CY}╭─────────────────────────────────────────────────────────────────╮${CL}"
  if [ -n "$step" ] && [ -n "$total" ]; then
    echo -e "${CY}│${CL} ${BOLD}${MG}Step ${step}/${total}:${CL} ${BOLD}${title}${CL}"
  else
    echo -e "${CY}│${CL} ${BOLD}${title}${CL}"
  fi
  echo -e "${CY}╰─────────────────────────────────────────────────────────────────╯${CL}"
  echo ""
}

header_info() {
  clear
  echo -e "${CY}"
  cat <<"EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║        ██████╗ ██████╗  ██████╗ ██╗  ██╗                      ║
║        ██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝                      ║
║        ██████╔╝██████╔╝██║   ██║ ╚███╔╝                       ║
║        ██╔═══╝ ██╔══██╗██║   ██║ ██╔██╗                       ║
║        ██║     ██║  ██║╚██████╔╝██╔╝ ██╗                      ║
║        ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝                      ║
║                                                                ║
║     ██████╗  █████╗ ██╗      █████╗ ███╗   ██╗ ██████╗███████╗
║     ██╔══██╗██╔══██╗██║     ██╔══██╗████╗  ██║██╔════╝██╔════╝
║     ██████╔╝███████║██║     ███████║██╔██╗ ██║██║     █████╗  ║
║     ██╔══██╗██╔══██║██║     ██╔══██║██║╚██╗██║██║     ██╔══╝  ║
║     ██████╔╝██║  ██║███████╗██║  ██║██║ ╚████║╚██████╗███████╗║
║     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
  echo -e "${CL}"
  echo -e "  ${BOLD}${MG}Proxmox Balance Manager${CL} ${DIM}Installer v2.0${CL}"
  echo -e "  ${DIM}Intelligent VM/CT Load Balancing${CL}"
  echo ""
  echo -e "  ${STAR} ${YW}https://github.com/Pr0zak/ProxBalance${CL}"
  echo ""
  echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
  echo ""
}

# ═══════════════════════════════════════════════════════════════
# Validation Functions
# ═══════════════════════════════════════════════════════════════
check_root() {
  if [[ $EUID -ne 0 ]]; then
    msg_error "This script must be run as root"
    exit 1
  fi
}

check_proxmox() {
  if ! command -v pct &> /dev/null; then
    msg_error "This script must be run on a Proxmox VE host"
    exit 1
  fi
}

get_next_ctid() {
  local next_id=100
  while pct status "$next_id" &>/dev/null; do
    ((next_id++))
  done
  echo "$next_id"
}

select_container_id() {
  echo ""
  msg_info "Container ID Configuration"
  echo ""
  local next_ctid
  next_ctid=$(get_next_ctid)

  echo -e "  ${BOLD}${CY}1)${CL} ${GN}Automatic${CL} ${DIM}(Next available: ${next_ctid})${CL}"
  echo -e "  ${BOLD}${CY}2)${CL} ${YW}Manual${CL} ${DIM}(Enter custom ID)${CL}"
  echo ""

  echo -ne "${CY}▶${CL} Select option [1-2] (default: 1): "
  read choice
  choice=${choice:-1}
  
  case $choice in
    1)
      CTID=$next_ctid
      ;;
    2)
      read -p "Enter container ID (100-999999): " custom_id
      if [[ ! "$custom_id" =~ ^[0-9]+$ ]] || [ "$custom_id" -lt 100 ]; then
        msg_error "Invalid container ID. Must be >= 100"
        select_container_id
        return
      fi
      if pct status "$custom_id" &>/dev/null; then
        msg_error "Container ID $custom_id already exists"
        select_container_id
        return
      fi
      CTID=$custom_id
      ;;
    *)
      msg_error "Invalid selection"
      select_container_id
      return
      ;;
  esac
  
  msg_ok "Container ID: ${GN}${CTID}${CL}"
}

select_hostname() {
  echo ""
  msg_info "Hostname Configuration"
  echo ""
  echo -ne "${CY}▶${CL} Enter hostname (default: ProxBalance): "
  read hostname
  HOSTNAME=${hostname:-ProxBalance}
  msg_ok "Hostname set to: ${BOLD}${HOSTNAME}${CL}"
}

select_network() {
  echo ""
  msg_info "Network Configuration"
  echo ""
  echo -e "  ${BOLD}${CY}1)${CL} ${GN}DHCP${CL} ${DIM}(Automatic - Recommended)${CL}"
  echo -e "  ${BOLD}${CY}2)${CL} ${YW}Static IP${CL} ${DIM}(Manual configuration)${CL}"
  echo ""

  echo -ne "${CY}▶${CL} Select option [1-2] (default: 1): "
  read choice
  choice=${choice:-1}
  
  case $choice in
    1)
      NET_CONFIG="name=eth0,bridge=vmbr0,ip=dhcp"
      msg_ok "Network: ${GN}DHCP (Automatic)${CL}"
      ;;
    2)
      read -p "Enter IP address (e.g., 10.0.0.131): " ip_addr
      read -p "Enter CIDR (e.g., 24): " cidr
      read -p "Enter gateway (e.g., 10.0.0.1): " gateway
      
      if [[ ! "$ip_addr" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        msg_error "Invalid IP address format"
        select_network
        return
      fi
      
      NET_CONFIG="name=eth0,bridge=vmbr0,ip=${ip_addr}/${cidr},gw=${gateway}"
      msg_ok "Static IP: ${GN}${ip_addr}/${cidr}${CL} via ${GN}${gateway}${CL}"
      ;;
    *)
      msg_error "Invalid selection"
      select_network
      ;;
  esac
}

select_storage() {
  msg_info "Storage Configuration"

  # Call pvesm status only once and filter for CT-compatible storage types
  # Valid types: dir, nfs, cifs, lvm, lvmthin, zfspool, btrfs
  local storage_data
  storage_data=$(pvesm status | awk 'NR>1 {print $1":"$2}')

  # Build arrays of storage names and types, filtering for CT-compatible types
  local STORAGES=()
  local STORAGE_TYPES=()
  while IFS=: read -r name type; do
    # Filter for container-compatible storage types
    case "$type" in
      dir|nfs|cifs|lvm|lvmthin|zfspool|btrfs)
        STORAGES+=("$name")
        STORAGE_TYPES+=("$type")
        ;;
    esac
  done <<< "$storage_data"

  if [ ${#STORAGES[@]} -eq 0 ]; then
    msg_error "No container-compatible storage found"
    exit 1
  fi

  echo "Available container storage locations:"
  for i in "${!STORAGES[@]}"; do
    echo -e "  ${BL}$((i+1)))${CL} ${STORAGES[$i]} ${YW}(${STORAGE_TYPES[$i]})${CL}"
  done
  echo ""

  while true; do
    read -p "Select storage [1-${#STORAGES[@]}]: " choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#STORAGES[@]} ]; then
      STORAGE="${STORAGES[$((choice-1))]}"
      msg_ok "Using storage: ${GN}${STORAGE}${CL}"
      break
    else
      msg_error "Invalid selection"
    fi
  done
}

select_template() {
  msg_info "Template Configuration"
  
  local template_name="debian-12-standard_12.2-1_amd64.tar.zst"
  local template_path="local:vztmpl/${template_name}"
  
  if pveam list local | grep -q "$template_name"; then
    TEMPLATE="$template_path"
    msg_ok "Using template: ${GN}${template_name}${CL}"
    return
  fi
  
  mapfile -t TEMPLATES < <(pveam available | grep "debian-12-standard" | awk '{print $2}')
  
  if [ ${#TEMPLATES[@]} -eq 0 ]; then
    msg_warn "No Debian 12 templates available"
    read -p "Enter template path manually: " TEMPLATE
    return
  fi
  
  echo "Available Debian 12 templates:"
  for i in "${!TEMPLATES[@]}"; do
    echo -e "  ${BL}$((i+1)))${CL} ${TEMPLATES[$i]}"
  done
  echo ""
  
  local default_choice=1
  read -p "Select template [1-${#TEMPLATES[@]}] (default: 1): " choice
  choice=${choice:-$default_choice}
  
  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#TEMPLATES[@]} ]; then
    local selected_template="${TEMPLATES[$((choice-1))]}"
    
    if ! pveam list local | grep -q "$selected_template"; then
      msg_info "Downloading template..."
      if pveam download local "$selected_template"; then
        msg_ok "Template downloaded"
      else
        msg_error "Failed to download template"
        exit 1
      fi
    fi
    
    TEMPLATE="local:vztmpl/${selected_template}"
    msg_ok "Using template: ${GN}${selected_template}${CL}"
  else
    msg_error "Invalid selection"
    select_template
  fi
}

select_resources() {
  msg_info "Resource Configuration"
  
  read -p "Memory (MB) [default: 2048]: " memory
  MEMORY=${memory:-2048}
  
  read -p "CPU cores [default: 2]: " cores
  CORES=${cores:-2}
  
  read -p "Disk size (GB) [default: 8]: " disk
  DISK=${disk:-8}
  
  msg_ok "Resources: ${GN}${MEMORY}${CL}MB RAM, ${GN}${CORES}${CL} cores, ${GN}${DISK}${CL}GB disk"
}

detect_proxmox_nodes() {
  msg_info "Detecting Proxmox Cluster"
  
  local nodes=""
  local detection_method=""
  
  # Method 1: corosync.conf - Parse nodelist section for actual nodes
  if [ -f /etc/pve/corosync.conf ]; then
    # Extract nodes from nodelist section only, using ring0_addr (IP) or name field
    # First try to get ring0_addr (most reliable - actual IPs)
    nodes=$(awk '/nodelist {/,/^}/ {if ($1 == "ring0_addr:") print $2}' /etc/pve/corosync.conf 2>/dev/null | tr -d '"' | sort -u | xargs)

    # If no ring0_addr found, try to get node names from nodelist section only
    if [ -z "$nodes" ]; then
      nodes=$(awk '/nodelist {/,/^}/ {
        if (in_node && $1 == "name:") {
          print $2
        }
        if ($1 == "node" && $2 == "{") in_node=1
        if (in_node && $1 == "}") in_node=0
      }' /etc/pve/corosync.conf 2>/dev/null | tr -d '"' | sort -u | xargs)
    fi

    if [ -n "$nodes" ]; then
      detection_method="corosync.conf (nodelist)"
    fi
  fi
  
  # Method 2: /etc/pve/nodes/
  if [ -z "$nodes" ] && [ -d /etc/pve/nodes ]; then
    nodes=$(ls /etc/pve/nodes/ 2>/dev/null | grep -E '^[a-zA-Z0-9]' | sort -u | xargs)
    if [ -n "$nodes" ]; then
      detection_method="/etc/pve/nodes/"
    fi
  fi
  
  # Method 3: pvesh (if available)
  if [ -z "$nodes" ] && command -v pvesh &>/dev/null; then
    nodes=$(pvesh get /nodes --output-format json 2>/dev/null | jq -r '.[].node' 2>/dev/null | sort -u | xargs)
    if [ -n "$nodes" ]; then
      detection_method="pvesh API"
    fi
  fi
  
  # Method 4: hostname (last resort for single-node)
  if [ -z "$nodes" ]; then
    nodes=$(hostname -s)
    detection_method="hostname (single-node)"
    msg_warn "Could not detect cluster, assuming single-node setup"
  fi
  
  if [ -n "$nodes" ]; then
    DETECTED_NODES=$(echo "$nodes" | tr ' ' ',')
    msg_ok "Detected nodes via ${YW}${detection_method}${CL}: ${GN}${DETECTED_NODES}${CL}"

    # Try to identify the local node (the node running this script)
    local local_hostname=$(hostname -s)
    local local_fqdn=$(hostname -f 2>/dev/null)
    local local_ip=$(hostname -I 2>/dev/null | awk '{print $1}')

    # Check if local hostname, fqdn, or IP matches any detected node
    PROXMOX_HOST=""
    for node in $nodes; do
      if [ "$node" = "$local_hostname" ] || [ "$node" = "$local_fqdn" ] || [ "$node" = "$local_ip" ]; then
        PROXMOX_HOST="$node"
        msg_ok "Using local node as primary host: ${GN}${PROXMOX_HOST}${CL}"
        break
      fi
    done

    # If local node not found in list, use first detected node
    if [ -z "$PROXMOX_HOST" ]; then
      PROXMOX_HOST=$(echo "$nodes" | awk '{print $1}')
      msg_ok "Primary host: ${GN}${PROXMOX_HOST}${CL}"
    fi
    
    # Try to get IP if hostname was detected
    if [[ ! "$PROXMOX_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      # It's a hostname, try to get IP
      local host_ip=$(getent hosts "$PROXMOX_HOST" 2>/dev/null | awk '{print $1}' | head -n1)
      if [ -n "$host_ip" ]; then
        msg_info "Resolved ${PROXMOX_HOST} to IP: ${GN}${host_ip}${CL}"
        echo ""
        read -p "Use IP (${host_ip}) or hostname (${PROXMOX_HOST})? [i/H]: " choice
        choice=${choice:-H}
        if [[ "$choice" =~ ^[Ii]$ ]]; then
          PROXMOX_HOST="$host_ip"
          msg_ok "Using IP: ${GN}${PROXMOX_HOST}${CL}"
        else
          msg_ok "Using hostname: ${GN}${PROXMOX_HOST}${CL}"
        fi
      fi
    fi
  else
    msg_warn "Could not auto-detect cluster"
    echo ""
    read -p "Enter primary Proxmox host IP/hostname: " PROXMOX_HOST
    
    if [ -z "$PROXMOX_HOST" ]; then
      msg_error "Proxmox host is required. Installation cannot continue."
      exit 1
    fi
    
    msg_ok "Using manually entered host: ${GN}${PROXMOX_HOST}${CL}"
  fi

  # Verify connectivity to Proxmox host
  verify_proxmox_connectivity
}

verify_proxmox_connectivity() {
  msg_info "Verifying connectivity to Proxmox host: ${PROXMOX_HOST}"

  # Try to reach the Proxmox API
  local max_attempts=3
  local attempt=1
  local connected=false

  while [ $attempt -le $max_attempts ]; do
    if curl -k -s -m 5 "https://${PROXMOX_HOST}:8006/api2/json/version" >/dev/null 2>&1; then
      connected=true
      break
    fi

    if [ $attempt -lt $max_attempts ]; then
      msg_warn "Attempt $attempt/$max_attempts failed, retrying..."
      sleep 2
    fi

    ((attempt++))
  done

  if [ "$connected" = true ]; then
    msg_ok "Successfully connected to Proxmox API at ${GN}${PROXMOX_HOST}:8006${CL}"
  else
    msg_error "Cannot reach Proxmox API at ${PROXMOX_HOST}:8006"
    echo ""
    echo -e "${YW}Please verify:${CL}"
    echo -e "  1. The host ${PROXMOX_HOST} is correct"
    echo -e "  2. The Proxmox host is online and reachable"
    echo -e "  3. Port 8006 is accessible"
    echo -e "  4. No firewall is blocking the connection"
    echo ""
    read -p "Do you want to enter a different host? [y/N]: " retry

    if [[ "$retry" =~ ^[Yy]$ ]]; then
      read -p "Enter Proxmox host IP/hostname: " PROXMOX_HOST

      if [ -z "$PROXMOX_HOST" ]; then
        msg_error "Proxmox host is required. Installation cannot continue."
        exit 1
      fi

      # Recursively verify the new host
      verify_proxmox_connectivity
    else
      msg_error "Installation cannot continue without connectivity to Proxmox host"
      exit 1
    fi
  fi
}

show_summary() {
  msg_info "Configuration Summary"
  echo ""
  echo -e "  Container ID:     ${GN}${CTID}${CL}"
  echo -e "  Hostname:         ${GN}${HOSTNAME}${CL}"
  echo -e "  Network:          ${GN}${NET_CONFIG}${CL}"
  echo -e "  Storage:          ${GN}${STORAGE}${CL}"
  echo -e "  Template:         ${GN}${TEMPLATE}${CL}"
  echo -e "  Memory:           ${GN}${MEMORY}${CL} MB"
  echo -e "  CPU Cores:        ${GN}${CORES}${CL}"
  echo -e "  Disk:             ${GN}${DISK}${CL} GB"
  echo -e "  Proxmox Host:     ${GN}${PROXMOX_HOST}${CL}"
  echo ""
  
  read -p "Proceed with installation? [Y/n]: " proceed
  proceed=${proceed:-Y}
  
  if [[ ! "$proceed" =~ ^[Yy]$ ]]; then
    msg_info "Installation cancelled"
    exit 0
  fi
}

create_container() {
  msg_info "Creating Container"

  debug_log "Container ID: $CTID"
  debug_log "Template: $TEMPLATE"
  debug_log "Hostname: $HOSTNAME"
  debug_log "Memory: $MEMORY MB"
  debug_log "Cores: $CORES"
  debug_log "Storage: $STORAGE"
  debug_log "Disk: $DISK GB"
  debug_log "Network: $NET_CONFIG"

  if [ "$DEBUG_MODE" = true ]; then
    pct create "$CTID" "$TEMPLATE" \
      --hostname "$HOSTNAME" \
      --memory "$MEMORY" \
      --cores "$CORES" \
      --rootfs "${STORAGE}:${DISK}" \
      --net0 "${NET_CONFIG}" \
      --unprivileged 1 \
      --features nesting=1 \
      --onboot 1 \
      --start 1 2>&1 | sed 's/^/  /'
    msg_ok "Container ${CTID} created"
  else
    (
      pct create "$CTID" "$TEMPLATE" \
        --hostname "$HOSTNAME" \
        --memory "$MEMORY" \
        --cores "$CORES" \
        --rootfs "${STORAGE}:${DISK}" \
        --net0 "${NET_CONFIG}" \
        --unprivileged 1 \
        --features nesting=1 \
        --onboot 1 \
        --start 1 >/dev/null 2>&1
    ) &

    if spinner $! "Creating container ${CTID}"; then
      msg_ok "Container ${CTID} created"
    else
      msg_error "Failed to create container"
      exit 1
    fi
  fi

  if [ "$DEBUG_MODE" = true ]; then
    sleep 10
    debug_log "Container startup complete"
  else
    sleep 10 &
    spinner $! "Waiting for container to start"
  fi
  msg_ok "Container started"
}

get_container_ip() {
  msg_info "Getting Container IP"

  if [[ "$NET_CONFIG" == *"ip=dhcp"* ]]; then
    (
      local max_attempts=30
      local attempt=0

      while [ $attempt -lt $max_attempts ]; do
        CONTAINER_IP=$(pct exec "$CTID" -- ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "")

        if [ -n "$CONTAINER_IP" ]; then
          echo "$CONTAINER_IP" > /tmp/proxbalance_ip_$$.txt
          exit 0
        fi

        ((attempt++))
        sleep 2
      done
      exit 1
    ) &

    if spinner $! "Waiting for DHCP assignment"; then
      CONTAINER_IP=$(cat /tmp/proxbalance_ip_$$.txt 2>/dev/null)
      rm -f /tmp/proxbalance_ip_$$.txt
      msg_ok "Container IP (DHCP): ${GN}${CONTAINER_IP}${CL}"
    else
      msg_warn "Could not detect DHCP IP"
      CONTAINER_IP="<DHCP-assigned>"
    fi
  else
    CONTAINER_IP=$(echo "$NET_CONFIG" | grep -oP '(?<=ip=)[^/]+')
    msg_ok "Container IP (Static): ${GN}${CONTAINER_IP}${CL}"
  fi
}

install_dependencies() {
  msg_info "Installing Dependencies"
  echo ""

  debug_log "Updating package lists in container $CTID"
  # Update package lists
  if [ "$DEBUG_MODE" = true ]; then
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      apt-get update
    " 2>&1 | sed 's/^/  /'
  else
    (
      pct exec "$CTID" -- bash -c "
        export DEBIAN_FRONTEND=noninteractive
        apt-get update >/dev/null 2>&1
      "
    ) &
    spinner $! "Updating package lists"
  fi
  echo ""

  debug_log "Installing Python 3, venv, and pip"
  # Install Python and related tools
  if [ "$DEBUG_MODE" = true ]; then
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      apt-get install -y python3 python3-venv python3-pip
    " 2>&1 | sed 's/^/  /'
  else
    (
      pct exec "$CTID" -- bash -c "
        export DEBIAN_FRONTEND=noninteractive
        apt-get install -y python3 python3-venv python3-pip >/dev/null 2>&1
      "
    ) &
    spinner $! "Installing Python 3, venv, and pip"
  fi
  echo ""

  debug_log "Installing Nginx web server"
  # Install web server
  if [ "$DEBUG_MODE" = true ]; then
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      apt-get install -y nginx
    " 2>&1 | sed 's/^/  /'
  else
    (
      pct exec "$CTID" -- bash -c "
        export DEBIAN_FRONTEND=noninteractive
        apt-get install -y nginx >/dev/null 2>&1
      "
    ) &
    spinner $! "Installing Nginx web server"
  fi
  echo ""

  debug_log "Installing utilities (curl, jq, git)"
  # Install utilities
  if [ "$DEBUG_MODE" = true ]; then
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      apt-get install -y curl jq git
    " 2>&1 | sed 's/^/  /'
  else
    (
      pct exec "$CTID" -- bash -c "
        export DEBIAN_FRONTEND=noninteractive
        apt-get install -y curl jq git >/dev/null 2>&1
      "
    ) &
    spinner $! "Installing utilities (curl, jq, git)"
  fi
  echo ""

  msg_ok "All dependencies installed successfully"
}

install_proxbalance() {
  msg_info "Installing ProxBalance"

  # Allow override via environment variable, otherwise use main branch
  if [ -z "${PROXBALANCE_BRANCH:-}" ]; then
    PROXBALANCE_BRANCH="main"
  fi

  msg_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  msg_ok "Installing from branch: $PROXBALANCE_BRANCH"
  msg_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  pct exec "$CTID" -- bash <<EOF
set +u  # Disable unbound variable check for this heredoc
cd /opt

# Clone the specific branch
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Git clone starting..."
echo "Repository: https://github.com/Pr0zak/ProxBalance.git"
echo "Branch: ${PROXBALANCE_BRANCH}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! git clone -b "${PROXBALANCE_BRANCH}" https://github.com/Pr0zak/ProxBalance.git proxmox-balance-manager 2>&1; then
  echo ""
  echo "ERROR: git clone failed for branch ${PROXBALANCE_BRANCH}"
  echo "This might mean:"
  echo "  1. Branch does not exist in repository"
  echo "  2. Network connectivity issues"
  echo "  3. GitHub rate limiting"
  echo ""
  exit 1
fi

cd proxmox-balance-manager

# Verify correct branch was cloned
CLONED_BRANCH=\$(git branch --show-current)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Git clone completed"
echo "Current branch: \${CLONED_BRANCH}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify AI features if feature branch
if [ "${PROXBALANCE_BRANCH}" = "feature/ai-migration-recommendations" ]; then
  echo "Verifying AI feature files..."
  if [ -f "ai_provider.py" ]; then
    echo "  ✓ ai_provider.py found"
  else
    echo "  ✗ ERROR: ai_provider.py NOT found"
    echo ""
    echo "Branch verification FAILED!"
    echo "Expected feature/ai-migration-recommendations but files are missing"
    echo "Actual branch: \${CLONED_BRANCH}"
    echo ""
    exit 1
  fi
fi

python3 -m venv venv
source venv/bin/activate
pip install -q --upgrade pip
if [ -f requirements.txt ]; then
  pip install -q -r requirements.txt
else
  pip install -q flask flask-cors gunicorn requests proxmoxer
fi
deactivate

chmod +x /opt/proxmox-balance-manager/*.py 2>/dev/null || true
chmod +x /opt/proxmox-balance-manager/*.sh 2>/dev/null || true

# Verify index.html size (AI version should be larger)
INDEX_SIZE=\$(stat -f%z /opt/proxmox-balance-manager/index.html 2>/dev/null || stat -c%s /opt/proxmox-balance-manager/index.html 2>/dev/null)
echo "  index.html size: \${INDEX_SIZE} bytes"

if [ "${PROXBALANCE_BRANCH}" = "feature/ai-migration-recommendations" ]; then
  if [ "\${INDEX_SIZE}" -lt 60000 ]; then
    echo "  ✗ ERROR: index.html size is \${INDEX_SIZE} bytes (expected >= 60000)"
    echo ""
    echo "Branch verification FAILED!"
    echo "The files don't match the AI feature branch characteristics"
    echo ""
    exit 1
  else
    echo "  ✓ index.html size verified for AI feature branch"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Branch verification: PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
EOF

  msg_ok "ProxBalance installed from branch: $PROXBALANCE_BRANCH"
}

configure_application() {
  msg_info "Configuring Application"
  
  # Validate PROXMOX_HOST is set
  if [ -z "$PROXMOX_HOST" ] || [ "$PROXMOX_HOST" = "CHANGE_ME" ]; then
    msg_error "PROXMOX_HOST not properly detected"
    echo ""
    read -p "Enter Proxmox host IP/hostname manually: " PROXMOX_HOST
    
    if [ -z "$PROXMOX_HOST" ]; then
      msg_error "Proxmox host is required. Installation cannot continue."
      exit 1
    fi
  fi
  
  msg_ok "Using Proxmox host: ${GN}${PROXMOX_HOST}${CL}"

  # Get API token credentials
  local auth_method="api_token"
  local api_token_id="${API_TOKEN_ID:-}"
  local api_token_secret=""

  if [ -f /tmp/proxbalance_token_secret.txt ]; then
    api_token_secret=$(cat /tmp/proxbalance_token_secret.txt)
    rm -f /tmp/proxbalance_token_secret.txt
  fi

  # Create config.json with actual PROXMOX_HOST value and API credentials
  pct exec "$CTID" -- bash <<EOF
cat > /opt/proxmox-balance-manager/config.json <<CONFIGEOF
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "${PROXMOX_HOST}",
  "proxmox_port": 8006,
  "proxmox_auth_method": "${auth_method}",
  "proxmox_api_token_id": "${api_token_id}",
  "proxmox_api_token_secret": "${api_token_secret}",
  "proxmox_username": "root@pam",
  "proxmox_password": "",
  "proxmox_verify_ssl": false,
  "ai_provider": "none",
  "ai_recommendations_enabled": false,
  "ai_config": {
    "openai": {
      "api_key": "",
      "model": "gpt-4",
      "base_url": "https://api.openai.com/v1"
    },
    "anthropic": {
      "api_key": "",
      "model": "claude-3-5-sonnet-20241022",
      "base_url": "https://api.anthropic.com/v1"
    },
    "local": {
      "base_url": "http://localhost:11434",
      "model": "llama2"
    }
  }
}
CONFIGEOF
EOF
  
  # Verify the config was written correctly
  WRITTEN_HOST=$(pct exec "$CTID" -- jq -r '.proxmox_host' /opt/proxmox-balance-manager/config.json 2>/dev/null)

  if [ "$WRITTEN_HOST" = "$PROXMOX_HOST" ] && [ "$WRITTEN_HOST" != "CHANGE_ME" ] && [ -n "$WRITTEN_HOST" ]; then
    msg_ok "Configuration file created successfully"
    msg_info "Proxmox host in config: ${GN}${WRITTEN_HOST}${CL}"
  else
    msg_warn "Configuration may not have been written correctly"
    msg_info "Expected: ${PROXMOX_HOST}, Got: ${WRITTEN_HOST}"
    msg_info "Please verify: pct exec $CTID -- cat /opt/proxmox-balance-manager/config.json"
  fi

  # Verify JSON is valid
  if pct exec "$CTID" -- jq empty /opt/proxmox-balance-manager/config.json 2>/dev/null; then
    msg_ok "Configuration JSON is valid"
  else
    msg_error "Configuration JSON is invalid - this will cause API errors"
    msg_info "Please check: pct exec $CTID -- cat /opt/proxmox-balance-manager/config.json"
  fi
}

setup_services() {
  msg_info "Setting Up System Services"
  
  pct exec "$CTID" -- bash <<'EOF'
if [ -f /opt/proxmox-balance-manager/systemd/proxmox-balance.service ]; then
  cp /opt/proxmox-balance-manager/systemd/*.service /etc/systemd/system/
  cp /opt/proxmox-balance-manager/systemd/*.timer /etc/systemd/system/
fi

systemctl daemon-reload
systemctl enable proxmox-balance.service
systemctl enable proxmox-collector.timer
EOF
  
  msg_ok "Services configured"
}

setup_nginx() {
  msg_info "Configuring Web Server"

  pct exec "$CTID" -- bash <<'EOF'
# Copy index.html and assets from repository to web root
if [ -f /opt/proxmox-balance-manager/index.html ]; then
  echo "Copying index.html to /var/www/html/"
  cp -f /opt/proxmox-balance-manager/index.html /var/www/html/

  # Copy assets folder
  if [ -d /opt/proxmox-balance-manager/assets ]; then
    echo "Copying assets folder to /var/www/html/"
    mkdir -p /var/www/html/assets
    cp -rf /opt/proxmox-balance-manager/assets/* /var/www/html/assets/
    echo "✓ Assets copied successfully"
  fi

  # Verify the copy
  SRC_SIZE=$(stat -f%z /opt/proxmox-balance-manager/index.html 2>/dev/null || stat -c%s /opt/proxmox-balance-manager/index.html 2>/dev/null)
  DST_SIZE=$(stat -f%z /var/www/html/index.html 2>/dev/null || stat -c%s /var/www/html/index.html 2>/dev/null)

  echo "Source index.html: ${SRC_SIZE} bytes"
  echo "Destination index.html: ${DST_SIZE} bytes"

  if [ "$SRC_SIZE" = "$DST_SIZE" ]; then
    echo "✓ index.html copied successfully"
  else
    echo "⚠ Warning: File sizes don't match"
  fi

  # Check for AI features in the copied file
  if grep -q "AI-Enhanced Recommendations" /var/www/html/index.html; then
    echo "✓ AI features detected in web UI"
  else
    echo "ℹ Standard UI (no AI features)"
  fi
else
  echo "⚠ Warning: index.html not found in repository"
fi

# Copy Nginx configuration
if [ -f /opt/proxmox-balance-manager/nginx/proxmox-balance ]; then
  cp /opt/proxmox-balance-manager/nginx/proxmox-balance /etc/nginx/sites-available/
fi

ln -sf /etc/nginx/sites-available/proxmox-balance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx && systemctl enable nginx
EOF

  msg_ok "Web server configured"
}

setup_api_tokens() {
  msg_info "Setting Up Proxmox API Authentication"
  echo ""

  msg_info "ProxBalance uses Proxmox API Tokens for authentication"
  echo ""

  if setup_api_token_auth; then
    msg_ok "API authentication configured successfully"
    return 0
  else
    msg_error "API authentication setup failed"
    msg_info "Please check the error message above and try again"
    return 1
  fi
}

setup_api_token_auth() {
  msg_info "Creating Proxmox API Token"
  echo ""

  # Display token information
  echo -e "${BL}═══════════════════════════════════════════════════════════════${CL}"
  echo -e "${BL}Token Configuration${CL}"
  echo -e "${BL}═══════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "  ${GN}Token User:${CL}  ${YW}root@pam${CL}"
  echo -e "  ${GN}Token Name:${CL}  ${YW}proxbalance${CL}"
  echo -e "  ${GN}Token ID:${CL}    ${YW}root@pam!proxbalance${CL}"
  echo ""
  echo -e "${BL}─────────────────────────────────────────────────────────────${CL}"
  echo -e "${BL}Permission Options${CL}"
  echo -e "${BL}─────────────────────────────────────────────────────────────${CL}"
  echo ""
  echo -e "  ${BL}1)${CL} ${GN}Minimal (Read-Only)${CL} - Monitoring only"
  echo -e "     ${YW}Recommended for:${CL} Data collection and recommendations"
  echo -e "     ${GN}Permissions:${CL}"
  echo -e "       • ${CL}VM.Audit${CL}     - View VM/CT configurations"
  echo -e "       • ${CL}Sys.Audit${CL}    - View node/cluster status"
  echo -e "       • ${CL}Datastore.Audit${CL} - View storage information"
  echo ""
  echo -e "  ${BL}2)${CL} ${YW}Full (Read + Migrate)${CL} - Monitoring + automated migrations"
  echo -e "     ${YW}Recommended for:${CL} Automated load balancing"
  echo -e "     ${GN}Permissions:${CL} All minimal permissions plus:"
  echo -e "       • ${CL}VM.Migrate${CL}   - Perform live migrations"
  echo ""
  read -p "Select permission level [1-2] (default: 1): " permission_choice
  permission_choice=${permission_choice:-1}
  echo ""

  local TOKEN_USER="root@pam"
  local TOKEN_NAME="proxbalance"

  case $permission_choice in
    1)
      local TOKEN_COMMENT="ProxBalance monitoring (read-only)"
      local TOKEN_PERMS="minimal"
      msg_info "Using minimal (read-only) permissions"
      ;;
    2)
      local TOKEN_COMMENT="ProxBalance monitoring and migration"
      local TOKEN_PERMS="full"
      msg_info "Using full permissions (with migration)"
      ;;
    *)
      msg_warn "Invalid selection, using minimal permissions"
      local TOKEN_COMMENT="ProxBalance monitoring (read-only)"
      local TOKEN_PERMS="minimal"
      ;;
  esac
  echo ""

  # Create the token
  local token_result
  if command -v pvesh &>/dev/null; then
    # Check if token already exists
    if pvesh get /access/users/${TOKEN_USER}/token/${TOKEN_NAME} &>/dev/null; then
      msg_warn "API token 'proxbalance' already exists"
      echo ""
      echo -e "  ${BL}1)${CL} Delete and create new token"
      echo -e "  ${BL}2)${CL} Keep existing token (you'll need to enter it manually)"
      echo ""
      read -p "Select option [1-2] (default: 1): " token_choice
      token_choice=${token_choice:-1}

      case $token_choice in
        1)
          msg_info "Deleting existing token..."
          pvesh delete /access/users/${TOKEN_USER}/token/${TOKEN_NAME} 2>/dev/null || true
          ;;
        2)
          msg_info "Keeping existing token"
          echo ""
          msg_warn "You will need to manually configure the token in config.json"
          echo "Token ID: ${GN}${TOKEN_USER}!${TOKEN_NAME}${CL}"
          echo ""
          msg_error "Cannot continue without token secret. Exiting."
          exit 1
          ;;
        *)
          msg_warn "Invalid selection, deleting existing token"
          pvesh delete /access/users/${TOKEN_USER}/token/${TOKEN_NAME} 2>/dev/null || true
          ;;
      esac
    fi

    # Create new token
    msg_info "Creating new API token..."
    token_result=$(pvesh create /access/users/${TOKEN_USER}/token/${TOKEN_NAME} \
      --comment "$TOKEN_COMMENT" \
      --privsep 0 2>&1)

    local create_status=$?

    # Debug: Show what we got
    if [ $create_status -ne 0 ]; then
      msg_warn "Token creation returned non-zero status: $create_status"
      echo "Output: $token_result"
    fi

    # Try multiple extraction methods
    API_TOKEN_SECRET=""

    # Method 1: Table format (most common) - look for "| value | <uuid> |"
    if [ -z "$API_TOKEN_SECRET" ]; then
      API_TOKEN_SECRET=$(echo "$token_result" | grep -E '^\|\s*value\s*\|' | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' 2>/dev/null | head -n1)
    fi

    # Method 2: Look for UUID pattern anywhere in output
    if [ -z "$API_TOKEN_SECRET" ]; then
      API_TOKEN_SECRET=$(echo "$token_result" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' 2>/dev/null | head -n1)
    fi

    # Method 3: jq (for JSON format)
    if [ -z "$API_TOKEN_SECRET" ] && command -v jq &>/dev/null; then
      API_TOKEN_SECRET=$(echo "$token_result" | jq -r '.value' 2>/dev/null)
      if [ "$API_TOKEN_SECRET" = "null" ] || [ -z "$API_TOKEN_SECRET" ]; then
        API_TOKEN_SECRET=""
      fi
    fi

    # Method 4: grep for json format
    if [ -z "$API_TOKEN_SECRET" ]; then
      API_TOKEN_SECRET=$(echo "$token_result" | grep -oP '"value"\s*:\s*"\K[^"]+' 2>/dev/null)
    fi

    if [ -n "$API_TOKEN_SECRET" ]; then
      API_TOKEN_ID="${TOKEN_USER}!${TOKEN_NAME}"
      msg_ok "API token created successfully"
      msg_info "Token ID: ${GN}${API_TOKEN_ID}${CL}"
      echo ""

      # Configure permissions based on choice
      msg_info "Configuring API permissions..."

      if [ "$TOKEN_PERMS" = "minimal" ]; then
        # Minimal (read-only) permissions
        # VM.Audit on all VMs/CTs
        pvesh set /access/acl --path / --roles PVEAuditor --tokens "${API_TOKEN_ID}" 2>/dev/null || true
        msg_ok "Minimal permissions applied (VM.Audit, Sys.Audit, Datastore.Audit)"
        echo -e "     ${YW}Note:${CL} This token can only read data. Migration buttons will not work."
      else
        # Full permissions (read + migrate)
        # PVEVMAdmin gives VM.* including VM.Migrate
        pvesh set /access/acl --path / --roles PVEVMAdmin --tokens "${API_TOKEN_ID}" 2>/dev/null || true
        msg_ok "Full permissions applied (includes VM.Migrate for automated migrations)"
        echo -e "     ${GN}✓${CL} This token can perform live migrations"
      fi
      echo ""

      AUTH_METHOD="api_token"

      # Save token info for later use
      echo "$API_TOKEN_SECRET" > /tmp/proxbalance_token_secret.txt
      chmod 600 /tmp/proxbalance_token_secret.txt

      # Test API access
      msg_info "Testing API access..."
      (
        timeout 5 curl -k -s -f \
          -H "Authorization: PVEAPIToken=${API_TOKEN_ID}=${API_TOKEN_SECRET}" \
          "https://${PROXMOX_HOST}:8006/api2/json/version" >/dev/null 2>&1
      ) &

      if spinner $! "Verifying API token connectivity"; then
        msg_ok "API access verified"
        return 0
      else
        msg_warn "Could not verify API access (may be normal)"
        return 0
      fi
    else
      msg_error "Failed to extract API token from response"
      msg_warn "Raw output: $token_result"
      return 1
    fi
  else
    msg_error "pvesh command not found"
    return 1
  fi
}


start_services() {
  msg_info "Starting Services"

  (
    pct exec "$CTID" -- bash <<'EOF'
systemctl start proxmox-balance.service
systemctl start proxmox-collector.timer
EOF
    sleep 3
  ) &

  spinner $! "Starting ProxBalance services"

  if pct exec "$CTID" -- systemctl is-active proxmox-balance.service &>/dev/null; then
    msg_ok "API service running"
  else
    msg_warn "API service may have issues"
  fi

  if pct exec "$CTID" -- systemctl is-active proxmox-collector.timer &>/dev/null; then
    msg_ok "Collector timer running"
  else
    msg_warn "Collector timer may have issues"
  fi
}

initial_collection() {
  msg_info "Triggering Initial Data Collection"
  echo ""
  echo -e "  ${DIM}This connects to Proxmox and collects cluster information...${CL}"
  echo ""

  # Give services a moment to stabilize
  sleep 2 &
  spinner $! "Waiting for services to stabilize"
  echo ""

  # Try to trigger initial collection with retries
  local max_attempts=3
  local attempt=1
  local success=false

  while [ $attempt -le $max_attempts ]; do
    if [ $attempt -eq 1 ]; then
      echo -e "  ${BOLD}${CY}Attempt ${attempt}/${max_attempts}${CL}"
    else
      echo ""
      echo -e "  ${BOLD}${YW}Retry attempt ${attempt}/${max_attempts}${CL}"
      sleep 3 &
      spinner $! "Waiting before retry"
      echo ""
    fi

    # Start the collection service
    pct exec "$CTID" -- systemctl start proxmox-collector.service 2>/dev/null

    # Wait for collection to complete (up to 60 seconds)
    (
      local waited=0
      while [ $waited -lt 60 ]; do
        # Check if service completed successfully
        if pct exec "$CTID" -- systemctl status proxmox-collector.service 2>/dev/null | grep -q "Deactivated successfully"; then
          exit 0
        fi
        # Check if cache file was created/updated recently
        if pct exec "$CTID" -- test -f /opt/proxmox-balance-manager/cluster_cache.json 2>/dev/null; then
          local cache_age=$(pct exec "$CTID" -- stat -c %Y /opt/proxmox-balance-manager/cluster_cache.json 2>/dev/null || echo "0")
          local now=$(date +%s)
          local age=$((now - cache_age))
          if [ $age -lt 30 ]; then
            exit 0
          fi
        fi
        sleep 2
        waited=$((waited + 2))
      done
      exit 1
    ) &

    if spinner $! "Collecting data from Proxmox cluster (may take up to 60 seconds)"; then
      success=true
      break
    fi

    ((attempt++))
  done

  echo ""
  if [ "$success" = true ]; then
    msg_ok "Initial data collection completed successfully!"
    echo ""
    echo -e "  ${GN}✓${CL} Cluster information gathered"
    echo -e "  ${GN}✓${CL} Data cached and ready"
    echo -e "  ${GN}✓${CL} ProxBalance is fully operational"
  else
    msg_warn "Initial collection did not complete immediately"
    echo ""
    echo -e "  ${BOLD}${YW}This is normal and not a problem!${CL}"
    echo ""
    echo -e "  ${INFO} The collector timer is running in the background"
    echo -e "  ${INFO} Data will be collected automatically within 60 minutes"
    echo -e "  ${INFO} You can access the UI now - it will populate when ready"
    echo ""
    echo -e "  ${DIM}Manual trigger command:${CL}"
    echo -e "  ${BL}pct exec $CTID -- systemctl start proxmox-collector.service${CL}"
  fi
}

show_completion() {
  echo ""
  echo ""
  echo -e "${GN}╔════════════════════════════════════════════════════════════════╗${CL}"
  echo -e "${GN}║                                                                ║${CL}"
  echo -e "${GN}║${CL}        ${BOLD}${GN}✓  INSTALLATION COMPLETE!  ✓${CL}                      ${GN}║${CL}"
  echo -e "${GN}║                                                                ║${CL}"
  echo -e "${GN}╚════════════════════════════════════════════════════════════════╝${CL}"
  echo ""

  if [ "$CONTAINER_IP" != "<DHCP-assigned>" ]; then
    echo -e "${CY}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${CL}"
    echo -e "${CY}┃${CL} ${BOLD}${BFR}📡 Access Information${CL}                                       ${CY}┃${CL}"
    echo -e "${CY}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${CL}"
    echo ""
    echo -e "  ${BOLD}${CY}🌐 Web Interface:${CL}  ${BOLD}${GN}http://${CONTAINER_IP}${CL}"
    echo -e "  ${BOLD}${CY}⚡ API Endpoint:${CL}   ${BOLD}${GN}http://${CONTAINER_IP}/api${CL}"
    echo -e "  ${BOLD}${CY}📦 Container ID:${CL}   ${BOLD}${GN}${CTID}${CL}"
    echo ""
  fi

  echo -e "${MG}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${CL}"
  echo -e "${MG}┃${CL} ${BOLD}${BFR}🛠️  Useful Commands${CL}                                          ${MG}┃${CL}"
  echo -e "${MG}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}📊 Check detailed status:${CL}"
  echo -e "     ${DIM}bash -c \"\$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)\" _ ${CTID}${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}📈 Monitor data collection:${CL}"
  echo -e "     ${DIM}pct exec ${CTID} -- journalctl -u proxmox-collector -f${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}📝 View API logs:${CL}"
  echo -e "     ${DIM}pct exec ${CTID} -- journalctl -u proxmox-balance -f${CL}"
  echo ""
  echo -e "${GN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL}"
  echo ""
  echo -e "  ${BOLD}${GN}🎉 ProxBalance is ready!${CL} ${BOLD}${CY}→${CL} ${BOLD}${GN}http://${CONTAINER_IP}${CL}"
  echo ""
  echo -e "${DIM}  Need help? Visit: https://github.com/Pr0zak/ProxBalance${CL}"
  echo ""
}

main() {
  header_info
  check_root
  check_proxmox

  msg_ok "Running on Proxmox VE"
  msg_ok "Running as root"
  echo ""

  section_header "Configuration" "1" "3"
  select_container_id
  select_hostname
  select_network
  select_storage
  select_template
  select_resources
  detect_proxmox_nodes
  show_summary

  section_header "Installation" "2" "3"
  create_container
  get_container_ip
  install_dependencies
  install_proxbalance
  setup_api_tokens
  configure_application
  setup_services
  setup_nginx

  section_header "Finalization" "3" "3"
  start_services
  initial_collection
  show_completion
}

trap '' INT
main "$@"
