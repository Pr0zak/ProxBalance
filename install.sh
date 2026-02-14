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
# Visual Design System
# ═══════════════════════════════════════════════════════════════

# Semantic color definitions (optimized for consistency)
HEADER_COLOR="${BL}"        # Blue - Main headers and titles
SECTION_COLOR="${CY}"       # Cyan - Section dividers and structure
ACCENT_COLOR="${MG}"        # Magenta - Important highlights
SUCCESS_COLOR="${GN}"       # Green - Success states
WARNING_COLOR="${YW}"       # Yellow - Warnings and cautions
ERROR_COLOR="${RD}"         # Red - Errors
INFO_COLOR="${CY}"          # Cyan - Informational items
PROMPT_COLOR="${CY}"        # Cyan - User input prompts
VALUE_COLOR="${GN}"         # Green - Values and selections
DIM_COLOR="${DIM}"          # Dim - Secondary text

# Pure ASCII status indicators
CHECK="[OK]"
CROSS="[X]"
INFO_ICON="[*]"
WARN_ICON="[!]"
ARROW=">"

# Spacing constants
SECTION_SPACING=2
SUBSECTION_SPACING=1

# Progress tracking
CURRENT_STEP=0
TOTAL_STEPS=0

# ═══════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════
msg_info() {
  echo -e "${INFO_COLOR}${INFO_ICON}${CL} ${BOLD}${HEADER_COLOR}${1}${CL}"
}

msg_ok() {
  echo -e "${SUCCESS_COLOR}${CHECK}${CL} ${SUCCESS_COLOR}${1}${CL}"
}

msg_error() {
  echo -e "${ERROR_COLOR}${CROSS}${CL} ${BOLD}${ERROR_COLOR}${1}${CL}"
}

msg_warn() {
  echo -e "${WARNING_COLOR}${WARN_ICON}${CL} ${WARNING_COLOR}${1}${CL}"
}

# Spinner for long-running operations
spinner() {
  local pid=$1
  local message=$2
  local i=0

  tput civis 2>/dev/null || true # Hide cursor
  while kill -0 "$pid" 2>/dev/null; do
    i=$(( (i+1) % ${#SPINNER_FRAMES[@]} ))
    printf "\r  ${CY}${SPINNER_FRAMES[$i]}${CL} ${DIM_COLOR}${message}...${CL}"
    sleep 0.1
  done
  wait "$pid"
  local exit_code=$?
  printf "\r\033[K"  # Clear line
  tput cnorm 2>/dev/null || true # Show cursor
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
  echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  if [ -n "$step" ] && [ -n "$total" ]; then
    echo -e "  ${BOLD}${HEADER_COLOR}Step ${step}/${total}:${CL} ${BOLD}${title}${CL}"
  else
    echo -e "  ${BOLD}${title}${CL}"
  fi
  echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo ""
}

# Subsection header with progress tracking
subsection_header() {
  local title=$1
  CURRENT_STEP=$((CURRENT_STEP + 1))
  echo ""
  echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo -e "  ${BOLD}${HEADER_COLOR}Step ${CURRENT_STEP}/${TOTAL_STEPS}:${CL} ${BOLD}${title}${CL}"
  echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo ""
}

# Display information in a panel with colored background
info_panel() {
  local title=$1
  shift
  local lines=("$@")

  echo ""
  echo -e "${INFO_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo -e "${BOLD}${HEADER_COLOR}${title}${CL}"
  echo -e "${INFO_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  for line in "${lines[@]}"; do
    echo -e "  ${line}"
  done
  echo ""
  echo -e "${INFO_COLOR}────────────────────────────────────────────────────────────────${CL}"
  echo ""
}

# Standardized user prompt
prompt_user() {
  local prompt_text=$1
  local default_value=$2
  local var_name=$3

  if [ -n "$default_value" ]; then
    echo -ne "${PROMPT_COLOR}${ARROW}${CL} ${prompt_text} ${DIM_COLOR}(default: ${default_value})${CL}: "
  else
    echo -ne "${PROMPT_COLOR}${ARROW}${CL} ${prompt_text}: "
  fi

  read user_input
  if [ -z "$user_input" ] && [ -n "$default_value" ]; then
    eval "$var_name='$default_value'"
  else
    eval "$var_name='$user_input'"
  fi
}

# Display menu option in boxed style
menu_option() {
  local number=$1
  local title=$2
  local description=$3

  echo -e "  ${BOLD}${PROMPT_COLOR}[${number}]${CL} ${BOLD}${title}${CL} ${DIM_COLOR}${description}${CL}"
}

# Smart divider with optional text
divider() {
  local text=$1
  if [ -n "$text" ]; then
    echo -e "${SECTION_COLOR}───── ${text} $(printf '─%.0s' {1..40})${CL}"
  else
    echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  fi
}

# Display key-value status line
status_line() {
  local key=$1
  local value=$2
  local color=${3:-$VALUE_COLOR}

  printf "  %-20s ${color}%s${CL}\n" "${key}:" "${value}"
}

# Progress step indicator
progress_step() {
  local step=$1
  local total=$2
  local action=$3

  echo ""
  echo -e "${DIM_COLOR}[${step}/${total}]${CL} ${INFO_COLOR}${INFO_ICON}${CL} ${action}..."
}

header_info() {
  clear 2>/dev/null || true
  echo ""
  echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "   ${BOLD}${HEADER_COLOR}____                 ____        _                   ${CL}"
  echo -e "  ${BOLD}${HEADER_COLOR}|  _ \ _ __ _____  __| __ )  __ _| | __ _ _ __   ___ ___${CL}"
  echo -e "  ${BOLD}${HEADER_COLOR}| |_) | '__/ _ \ \/ /|  _ \ / _\` | |/ _\` | '_ \ / __/ _ \ ${CL}"
  echo -e "  ${BOLD}${HEADER_COLOR}|  __/| | | (_) >  < | |_) | (_| | | (_| | | | | (_|  __/${CL}"
  echo -e "  ${BOLD}${HEADER_COLOR}|_|   |_|  \___/_/\_\|____/ \__,_|_|\__,_|_| |_|\___\___|${CL}"
  echo ""
  echo -e "           ${ACCENT_COLOR}Proxmox Cluster Balance Manager${CL}"
  echo -e "            ${DIM_COLOR}Intelligent VM/CT Load Balancing${CL}"
  echo ""
  echo -e "${SECTION_COLOR}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "  ${INFO_COLOR}[*]${CL} ${YW}https://github.com/Pr0zak/ProxBalance${CL}"
  echo ""
  echo -e "${SECTION_COLOR}────────────────────────────────────────────────────────────────${CL}"
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

  # Method 1: Check pct status
  # Method 2: Check config file existence
  # Method 3: Check pvesh API
  # Method 4: Check running/stopped containers list
  while true; do
    # Check if container exists via pct status
    if pct status "$next_id" &>/dev/null; then
      next_id=$((next_id + 1))
      continue
    fi

    # Check if config file exists
    if [ -f "/etc/pve/lxc/${next_id}.conf" ]; then
      next_id=$((next_id + 1))
      continue
    fi

    # Check if listed in pvesh (if available)
    if command -v pvesh &>/dev/null; then
      if pvesh get /cluster/resources --type vm --output-format json 2>/dev/null | grep -q "\"vmid\":$next_id"; then
        next_id=$((next_id + 1))
        continue
      fi
    fi

    # Check if in pct list output
    if pct list 2>/dev/null | awk '{print $1}' | grep -q "^${next_id}$"; then
      next_id=$((next_id + 1))
      continue
    fi

    # All checks passed, this ID is available
    break
  done

  echo "$next_id"
}

select_container_id() {
  subsection_header "Container ID Configuration"

  # Detect next available ID with spinner
  echo -ne "  ${INFO_COLOR}${INFO_ICON}${CL} Detecting next available container ID"
  local next_ctid
  get_next_ctid > /tmp/next_ctid.tmp &
  local pid=$!
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "."
    sleep 0.2
  done
  wait "$pid"
  next_ctid=$(cat /tmp/next_ctid.tmp)
  rm -f /tmp/next_ctid.tmp
  echo -e " ${SUCCESS_COLOR}${CHECK}${CL}"
  echo ""

  menu_option "1" "Automatic" "(Next available: ${next_ctid})"
  menu_option "2" "Manual" "(Enter custom ID)"
  echo ""

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Select option [1-2] ${DIM_COLOR}(default: 1)${CL}: "
  read choice
  choice=${choice:-1}

  case $choice in
    1)
      CTID=$next_ctid
      ;;
    2)
      echo ""
      echo -ne "${PROMPT_COLOR}${ARROW}${CL} Enter container ID (100-999999): "
      read custom_id
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

  echo ""
  msg_ok "Container ID: ${VALUE_COLOR}${CTID}${CL}"
}

select_hostname() {
  subsection_header "Hostname Configuration"

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Enter hostname ${DIM_COLOR}(default: ProxBalance)${CL}: "
  read hostname
  HOSTNAME=${hostname:-ProxBalance}

  echo ""
  msg_ok "Hostname set to: ${VALUE_COLOR}${HOSTNAME}${CL}"
}

select_network() {
  subsection_header "Network Configuration"

  menu_option "1" "DHCP" "(Automatic - Recommended)"
  menu_option "2" "Static IP" "(Manual configuration)"
  echo ""

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Select option [1-2] ${DIM_COLOR}(default: 1)${CL}: "
  read choice
  choice=${choice:-1}

  case $choice in
    1)
      NET_CONFIG="name=eth0,bridge=vmbr0,ip=dhcp"
      echo ""
      msg_ok "Network: ${VALUE_COLOR}DHCP (Automatic)${CL}"
      ;;
    2)
      echo ""
      echo -ne "${PROMPT_COLOR}${ARROW}${CL} Enter IP address (e.g., 10.0.0.131): "
      read ip_addr
      echo -ne "${PROMPT_COLOR}${ARROW}${CL} Enter CIDR (e.g., 24): "
      read cidr
      echo -ne "${PROMPT_COLOR}${ARROW}${CL} Enter gateway (e.g., 10.0.0.1): "
      read gateway

      if [[ ! "$ip_addr" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        msg_error "Invalid IP address format"
        select_network
        return
      fi

      NET_CONFIG="name=eth0,bridge=vmbr0,ip=${ip_addr}/${cidr},gw=${gateway}"
      echo ""
      msg_ok "Static IP: ${VALUE_COLOR}${ip_addr}/${cidr}${CL} via ${VALUE_COLOR}${gateway}${CL}"
      ;;
    *)
      msg_error "Invalid selection"
      select_network
      ;;
  esac
}

select_storage() {
  subsection_header "Storage Configuration"

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

  echo -e "  ${DIM_COLOR}Available container storage locations:${CL}"
  echo ""
  for i in "${!STORAGES[@]}"; do
    menu_option "$((i+1))" "${STORAGES[$i]}" "(${STORAGE_TYPES[$i]})"
  done
  echo ""

  while true; do
    echo -ne "${PROMPT_COLOR}${ARROW}${CL} Select storage [1-${#STORAGES[@]}] ${DIM_COLOR}(default: 1)${CL}: "
    read choice
    choice=${choice:-1}
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#STORAGES[@]} ]; then
      STORAGE="${STORAGES[$((choice-1))]}"
      echo ""
      msg_ok "Using storage: ${VALUE_COLOR}${STORAGE}${CL}"
      break
    else
      msg_error "Invalid selection"
    fi
  done
}

select_template() {
  subsection_header "Template Configuration"

  local template_name="debian-12-standard_12.2-1_amd64.tar.zst"
  local template_path="local:vztmpl/${template_name}"

  if pveam list local | grep -q "$template_name"; then
    TEMPLATE="$template_path"
    msg_ok "Using template: ${VALUE_COLOR}${template_name}${CL}"
    return
  fi

  mapfile -t TEMPLATES < <(pveam available | grep "debian-12-standard" | awk '{print $2}')

  if [ ${#TEMPLATES[@]} -eq 0 ]; then
    msg_warn "No Debian 12 templates available"
    echo -ne "${PROMPT_COLOR}${ARROW}${CL} Enter template path manually: "
    read TEMPLATE
    return
  fi

  echo -e "  ${DIM_COLOR}Available Debian 12 templates:${CL}"
  echo ""
  for i in "${!TEMPLATES[@]}"; do
    menu_option "$((i+1))" "${TEMPLATES[$i]}" ""
  done
  echo ""

  local default_choice=1
  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Select template [1-${#TEMPLATES[@]}] ${DIM_COLOR}(default: 1)${CL}: "
  read choice
  choice=${choice:-$default_choice}

  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#TEMPLATES[@]} ]; then
    local selected_template="${TEMPLATES[$((choice-1))]}"

    if ! pveam list local | grep -q "$selected_template"; then
      echo ""
      msg_info "Downloading template..."
      if pveam download local "$selected_template"; then
        msg_ok "Template downloaded"
      else
        msg_error "Failed to download template"
        exit 1
      fi
    fi

    TEMPLATE="local:vztmpl/${selected_template}"
    echo ""
    msg_ok "Using template: ${VALUE_COLOR}${selected_template}${CL}"
  else
    msg_error "Invalid selection"
    select_template
  fi
}

select_resources() {
  subsection_header "Resource Configuration"

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Memory (MB) ${DIM_COLOR}(default: 2048)${CL}: "
  read memory
  MEMORY=${memory:-2048}

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} CPU cores ${DIM_COLOR}(default: 2)${CL}: "
  read cores
  CORES=${cores:-2}

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Disk size (GB) ${DIM_COLOR}(default: 8)${CL}: "
  read disk
  DISK=${disk:-8}

  echo ""
  msg_ok "Resources: ${VALUE_COLOR}${MEMORY}${CL}MB RAM, ${VALUE_COLOR}${CORES}${CL} cores, ${VALUE_COLOR}${DISK}${CL}GB disk"
}

select_password() {
  subsection_header "Root Password Configuration"

  menu_option "1" "Set a custom password" "(Secure for production)"
  menu_option "2" "No password (auto-login)" "(Recommended for homelab)"
  menu_option "3" "Random password" "(Will be displayed after creation)"
  echo ""

  echo -ne "${PROMPT_COLOR}${ARROW}${CL} Select option [1-3] ${DIM_COLOR}(default: 2)${CL}: "
  read choice
  choice=${choice:-2}

  case $choice in
    1)
      while true; do
        echo ""
        echo -ne "  Enter password for root user: "
        read -s password1
        echo ""
        echo -ne "  Confirm password: "
        read -s password2
        echo ""

        if [ "$password1" = "$password2" ]; then
          if [ -n "$password1" ]; then
            ROOT_PASSWORD="$password1"
            PASSWORD_TYPE="custom"
            msg_ok "Custom password set"
            break
          else
            msg_error "Password cannot be empty"
          fi
        else
          msg_error "Passwords do not match. Please try again."
        fi
      done
      ;;
    2)
      ROOT_PASSWORD=""
      PASSWORD_TYPE="none"
      msg_ok "No password (auto-login enabled)"
      ;;
    3)
      ROOT_PASSWORD=$(openssl rand -base64 12)
      PASSWORD_TYPE="random"
      msg_ok "Random password generated"
      ;;
    *)
      msg_error "Invalid selection"
      select_password
      return
      ;;
  esac
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

    attempt=$((attempt + 1))
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

  # Build password argument
  local password_arg=""
  if [ "$PASSWORD_TYPE" = "custom" ] || [ "$PASSWORD_TYPE" = "random" ]; then
    password_arg="--password $ROOT_PASSWORD"
  fi

  # Create container and capture output
  local error_log="/tmp/proxbalance_create_error_$$.log"
  local output_log="/tmp/proxbalance_create_output_$$.log"

  (
    if [ -n "$password_arg" ]; then
      pct create "$CTID" "$TEMPLATE" \
        --hostname "$HOSTNAME" \
        --memory "$MEMORY" \
        --cores "$CORES" \
        --rootfs "${STORAGE}:${DISK}" \
        --net0 "${NET_CONFIG}" \
        --unprivileged 1 \
        --features nesting=1 \
        --onboot 1 \
        --start 1 \
        $password_arg >"$output_log" 2>"$error_log"
    else
      pct create "$CTID" "$TEMPLATE" \
        --hostname "$HOSTNAME" \
        --memory "$MEMORY" \
        --cores "$CORES" \
        --rootfs "${STORAGE}:${DISK}" \
        --net0 "${NET_CONFIG}" \
        --unprivileged 1 \
        --features nesting=1 \
        --onboot 1 \
        --start 1 >"$output_log" 2>"$error_log"
    fi
  ) &

  if spinner $! "Creating container ${CTID}"; then
    msg_ok "Container ${CTID} created"
    rm -f "$error_log" "$output_log"
  else
    msg_error "Failed to create container"
    echo ""
    if [ -f "$error_log" ] && [ -s "$error_log" ]; then
      echo -e "${YW}Error details:${CL}"
      cat "$error_log" | head -10
    elif [ -f "$output_log" ] && [ -s "$output_log" ]; then
      echo -e "${YW}Output:${CL}"
      cat "$output_log" | head -10
    else
      echo -e "${YW}No additional error information available${CL}"
    fi
    rm -f "$error_log" "$output_log"
    echo ""
    exit 1
  fi

  sleep 10 &
  spinner $! "Waiting for container to start"
  msg_ok "Container started"

  # Add 'ignore' tag to prevent ProxBalance from migrating itself
  msg_info "Adding 'ignore' tag to ProxBalance container"
  pct set "$CTID" --tags "ignore" >/dev/null 2>&1
  msg_ok "Container tagged with 'ignore'"
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

        attempt=$((attempt + 1))
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

  # Update package lists
  (
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      apt-get update >> '$INSTALL_LOG_VERBOSE' 2>&1
    "
  ) &
  spinner $! "Updating package lists"
  echo ""

  # Configure locales to prevent Perl warnings
  (
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      echo '=== Installing locales ===' >> '$INSTALL_LOG_VERBOSE'
      apt-get install -y locales >> '$INSTALL_LOG_VERBOSE' 2>&1
      sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen
      locale-gen >> '$INSTALL_LOG_VERBOSE' 2>&1
      update-locale LANG=en_US.UTF-8 >> '$INSTALL_LOG_VERBOSE' 2>&1
    "
  ) &
  spinner $! "Configuring locales"
  echo ""

  # Install Python and related tools
  (
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      echo '=== Installing Python ===' >> '$INSTALL_LOG_VERBOSE'
      apt-get install -y python3 python3-venv python3-pip >> '$INSTALL_LOG_VERBOSE' 2>&1
    "
  ) &
  spinner $! "Installing Python 3, venv, and pip"
  echo ""

  # Install utilities (curl needed for Node.js installation)
  (
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      echo '=== Installing utilities ===' >> '$INSTALL_LOG_VERBOSE'
      apt-get install -y curl jq git >> '$INSTALL_LOG_VERBOSE' 2>&1
    "
  ) &
  spinner $! "Installing utilities (curl, jq, git)"
  echo ""

  # Install Node.js (for Babel compilation)
  (
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      echo '=== Installing Node.js ===' >> '$INSTALL_LOG_VERBOSE'
      # Install Node.js from NodeSource (LTS version)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> '$INSTALL_LOG_VERBOSE' 2>&1
      apt-get install -y nodejs >> '$INSTALL_LOG_VERBOSE' 2>&1
    "
  ) &
  spinner $! "Installing Node.js 20 LTS (for frontend build)"
  echo ""

  # Install web server
  (
    pct exec "$CTID" -- bash -c "
      export DEBIAN_FRONTEND=noninteractive
      echo '=== Installing Nginx ===' >> '$INSTALL_LOG_VERBOSE'
      apt-get install -y nginx >> '$INSTALL_LOG_VERBOSE' 2>&1
    "
  ) &
  spinner $! "Installing Nginx web server"
  echo ""

  msg_ok "All dependencies installed successfully"
}

install_proxbalance() {
  msg_info "Installing ProxBalance"

  # Allow override via environment variable, otherwise use main branch
  if [ -z "${PROXBALANCE_BRANCH:-}" ]; then
    PROXBALANCE_BRANCH="main"
  fi

  msg_info "════════════════════════════════════════════════════════════════"
  msg_ok "Installing from branch: $PROXBALANCE_BRANCH"
  msg_info "════════════════════════════════════════════════════════════════"
  echo ""

  if ! pct exec "$CTID" -- bash <<EOF
set +u  # Disable unbound variable check for this heredoc
cd /opt

# Clone the specific branch
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Git clone starting..."
echo "Repository: https://github.com/Pr0zak/ProxBalance.git"
echo "Branch: ${PROXBALANCE_BRANCH}"
echo "════════════════════════════════════════════════════════════════"
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
echo "════════════════════════════════════════════════════════════════"
echo "✓ Git clone completed"
echo "Current branch: \${CLONED_BRANCH}"
echo "════════════════════════════════════════════════════════════════"
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

# Upgrade pip with timeout and retries
echo "  Upgrading pip..."
pip install --timeout=120 --retries=5 --quiet --upgrade pip || {
  echo "  WARNING: pip upgrade failed, continuing with system pip"
}

# Install Python packages with timeout and retries
if [ -f requirements.txt ]; then
  echo "  Installing Python packages from requirements.txt..."
  pip install --timeout=120 --retries=5 --quiet -r requirements.txt || {
    echo "  ERROR: Failed to install Python packages"
    exit 1
  }
else
  echo "  Installing Python packages..."
  pip install --timeout=120 --retries=5 --quiet flask flask-cors flask-compress gunicorn requests proxmoxer || {
    echo "  ERROR: Failed to install Python packages"
    exit 1
  }
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
echo "════════════════════════════════════════════════════════════════"
echo "Branch verification: PASSED"
echo "════════════════════════════════════════════════════════════════"
echo ""
EOF
  then
    msg_error "Failed to install ProxBalance"
    echo ""
    echo -e "${YW}Common causes:${CL}"
    echo -e "  ${INFO_ICON} Network connectivity issues (GitHub or PyPI)"
    echo -e "  ${INFO_ICON} Firewall blocking outbound connections"
    echo -e "  ${INFO_ICON} Insufficient disk space"
    echo -e "  ${INFO_ICON} Missing branch: $PROXBALANCE_BRANCH"
    echo ""
    echo -e "${YW}Troubleshooting:${CL}"
    echo -e "  1. Check container logs: ${BL}pct exec $CTID -- journalctl -xe${CL}"
    echo -e "  2. Verify network: ${BL}pct exec $CTID -- curl -I https://pypi.org${CL}"
    echo -e "  3. Check disk space: ${BL}pct exec $CTID -- df -h${CL}"
    echo ""
    exit 1
  fi

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
  "proxmox_username": "proxbalance@pam",
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
systemctl enable proxmox-balance-recommendations.timer
systemctl enable proxmox-balance-automigrate.timer

# Sync collector timer interval with config.json (prevents desync on update)
if [ -f /opt/proxmox-balance-manager/update_timer.py ] && [ -f /opt/proxmox-balance-manager/config.json ]; then
  /opt/proxmox-balance-manager/venv/bin/python3 /opt/proxmox-balance-manager/update_timer.py || true
fi
EOF
  
  msg_ok "Services configured"
}

build_frontend() {
  msg_info "Building Frontend (Pre-compiling JSX)"
  echo ""

  pct exec "$CTID" -- bash <<'BUILD_EOF'
cd /opt/proxmox-balance-manager

echo "════════════════════════════════════════════════════════════════"
echo "Frontend Build Process"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if we need to build
# Build is required if: (1) legacy inline JSX exists, (2) JSX source exists, or (3) app.js doesn't exist
if [ -f index.html ] && grep -q 'type="text/babel"' index.html; then
  echo "⚠  Legacy inline JSX detected - build required"
  NEEDS_BUILD=true
elif [ -f src/app.jsx ]; then
  echo "✓ Pre-compiled architecture detected - building"
  NEEDS_BUILD=true
elif [ ! -f assets/js/app.js ]; then
  echo "⚠  app.js not found - build required"
  NEEDS_BUILD=true
else
  echo "✓ Pre-built app.js found - skipping build"
  NEEDS_BUILD=false
fi

if [ "$NEEDS_BUILD" = "true" ]; then
  # Create directory structure
  echo "Creating build directories..."
  mkdir -p /var/www/html/assets/js
  mkdir -p /opt/proxmox-balance-manager/assets/js
  mkdir -p src

  # Step 1: Install Babel dependencies
  echo ""
  echo "Step 1/5: Installing Babel dependencies..."
  if [ ! -f package.json ]; then
    npm init -y >/dev/null 2>&1
  fi
  npm install --save-dev @babel/core @babel/cli @babel/preset-react >/dev/null 2>&1
  echo "  ✓ Babel installed"

  # Step 2: Create Babel config
  echo ""
  echo "Step 2/5: Creating Babel configuration..."
  cat > .babelrc <<'BABEL_CONFIG'
{
  "presets": ["@babel/preset-react"]
}
BABEL_CONFIG
  echo "  ✓ .babelrc created"

  # Step 3: Extract JSX from index.html if needed
  echo ""
  echo "Step 3/5: Preparing JSX source..."
  if [ ! -f src/app.jsx ]; then
    # Extract JSX from index.html
    if grep -q 'type="text/babel"' index.html; then
      echo "  ⚙  Extracting JSX from index.html..."
      sed -n '/<script type="text\/babel">/,/<\/script>/p' index.html | \
        sed '1d;$d' | \
        sed '1,2d' > src/app.jsx
      echo "  ✓ JSX extracted"
    fi
  else
    echo "  ✓ JSX source already exists"
  fi

  # Step 4: Compile JSX to JavaScript
  echo ""
  echo "Step 4/5: Compiling JSX to JavaScript..."
  if [ -f src/app.jsx ]; then
    # Use node_modules/.bin/babel directly with preset flag if npx is not available
    if command -v npx >/dev/null 2>&1; then
      npx babel src/app.jsx --out-file /tmp/app.js 2>&1 | grep -v "deoptimised" || true
    else
      node_modules/.bin/babel src/app.jsx --presets=@babel/preset-react --out-file /tmp/app.js 2>&1 | grep -v "deoptimised" || true
    fi

    # Copy compiled app.js to BOTH locations (source and nginx serving)
    cp /tmp/app.js /opt/proxmox-balance-manager/assets/js/app.js
    cp /tmp/app.js /var/www/html/assets/js/app.js
    COMPILED_SIZE=$(stat -c%s /var/www/html/assets/js/app.js 2>/dev/null)
    echo "  ✓ Compiled to app.js (${COMPILED_SIZE} bytes)"
  fi

  # Step 5: Download React libraries locally
  echo ""
  echo "Step 5/5: Downloading React libraries..."
  cd /var/www/html/assets/js

  curl -sL https://unpkg.com/react@18/umd/react.production.min.js -o react.production.min.js
  REACT_SIZE=$(stat -c%s react.production.min.js 2>/dev/null)
  echo "  ✓ React downloaded (${REACT_SIZE} bytes)"

  curl -sL https://unpkg.com/react-dom@18/umd/react-dom.production.min.js -o react-dom.production.min.js
  REACT_DOM_SIZE=$(stat -c%s react-dom.production.min.js 2>/dev/null)
  echo "  ✓ React-DOM downloaded (${REACT_DOM_SIZE} bytes)"

  cd /opt/proxmox-balance-manager

  # Copy index.html (already pre-compiled with correct structure)
  echo ""
  echo "Copying index.html..."
  cp index.html /var/www/html/index.html

  INDEX_SIZE=$(stat -c%s /var/www/html/index.html 2>/dev/null)
  echo "  ✓ Optimized index.html created (${INDEX_SIZE} bytes)"

  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "✓ Frontend build complete!"
  echo "════════════════════════════════════════════════════════════════"
else
  echo "ℹ  Skipping build - copying pre-built files..."
  cp -f index.html /var/www/html/
  if [ -d assets ]; then
    echo "  → Copying assets directory..."
    mkdir -p /var/www/html/assets
    cp -r assets/* /var/www/html/assets/ 2>/dev/null || true
    echo "  ✓ Assets copied"
  fi
fi
BUILD_EOF

  msg_ok "Frontend built and optimized"
}

setup_nginx() {
  msg_info "Configuring Web Server"

  pct exec "$CTID" -- bash <<'EOF'
# Copy assets folder (logos, images, etc.)
if [ -d /opt/proxmox-balance-manager/assets ]; then
  echo "Copying assets folder to /var/www/html/"
  cp -rf /opt/proxmox-balance-manager/assets /var/www/html/

  # Count files copied (excluding js files which are handled by build)
  ASSET_COUNT=$(find /var/www/html/assets -type f ! -path "*/js/*" 2>/dev/null | wc -l)
  echo "✓ Copied ${ASSET_COUNT} asset files"

  # Verify logo files exist
  if [ -f /var/www/html/assets/logo_icon_v2.svg ]; then
    echo "✓ Logo files copied successfully"
  else
    echo "⚠ Warning: Logo files may be missing"
  fi
else
  echo "⚠ Warning: assets folder not found in repository"
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

  # Clean up old root@pam token references if they exist (from previous versions)
  if pveum user token list root@pam 2>/dev/null | grep -q "proxbalance"; then
    msg_info "Cleaning up old root@pam!proxbalance token"
    # Delete old token
    pvesh delete /access/users/root@pam/token/proxbalance 2>/dev/null || true
    # Remove old ACL entries to prevent "ignore invalid acl token" warnings
    pveum acl delete / --tokens root@pam!proxbalance 2>/dev/null || true
    msg_ok "Old token cleaned up"
    echo ""
  fi

  # Create dedicated proxbalance user if it doesn't exist
  local TOKEN_USER="proxbalance@pam"
  local TOKEN_NAME="proxbalance"

  if ! pveum user list | grep -q "^proxbalance@pam"; then
    msg_info "Creating dedicated 'proxbalance' user"
    pveum user add proxbalance@pam --comment "ProxBalance service account" --enable 1
    msg_ok "User 'proxbalance@pam' created"
  else
    msg_ok "User 'proxbalance@pam' already exists"
  fi
  echo ""

  # Display token information
  echo -e "${BL}════════════════════════════════════════════════════════════════${CL}"
  echo -e "${BL}Token Configuration${CL}"
  echo -e "${BL}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "  ${GN}Token User:${CL}  ${YW}proxbalance@pam${CL}"
  echo -e "  ${GN}Token Name:${CL}  ${YW}proxbalance${CL}"
  echo -e "  ${GN}Token ID:${CL}    ${YW}proxbalance@pam!proxbalance${CL}"
  echo ""
  echo -e "${BL}────────────────────────────────────────────────────────────────${CL}"
  echo -e "${BL}Permission Options${CL}"
  echo -e "${BL}────────────────────────────────────────────────────────────────${CL}"
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

  case $permission_choice in
    1)
      local TOKEN_COMMENT="ProxBalance monitoring (read-only)"
      TOKEN_PERMS="minimal"  # Make this global so set_container_notes can see it
      msg_info "Using minimal (read-only) permissions"
      ;;
    2)
      local TOKEN_COMMENT="ProxBalance monitoring and migration"
      TOKEN_PERMS="full"  # Make this global so set_container_notes can see it
      msg_info "Using full permissions (with migration)"
      ;;
    *)
      msg_warn "Invalid selection, using minimal permissions"
      local TOKEN_COMMENT="ProxBalance monitoring (read-only)"
      TOKEN_PERMS="minimal"  # Make this global so set_container_notes can see it
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
          echo -e "${YW}════════════════════════════════════════════════════════════════${CL}"
          echo -e "  ${BOLD}${YW}Please enter the existing token secret${CL}"
          echo -e "${YW}════════════════════════════════════════════════════════════════${CL}"
          echo ""
          echo -e "  ${INFO} ${DIM}You can find this in Proxmox:${CL}"
          echo -e "  ${DIM}  Datacenter → Permissions → API Tokens${CL}"
          echo -e "  ${DIM}  Or if you saved it previously${CL}"
          echo ""

          local existing_token_secret=""
          while true; do
            echo -ne "  ${CY}▶${CL} Enter token secret: "
            read -s existing_token_secret
            echo ""

            if [ -z "$existing_token_secret" ]; then
              msg_error "Token secret cannot be empty"
              echo ""
              echo -e "  ${BL}1)${CL} Try again"
              echo -e "  ${BL}2)${CL} Delete and create new token"
              echo -e "  ${BL}3)${CL} Exit installation"
              echo ""
              read -p "Select option [1-3]: " retry_choice

              case $retry_choice in
                1)
                  continue
                  ;;
                2)
                  msg_info "Deleting existing token..."
                  pvesh delete /access/users/${TOKEN_USER}/token/${TOKEN_NAME} 2>/dev/null || true
                  break
                  ;;
                3)
                  msg_error "Installation cancelled"
                  exit 1
                  ;;
                *)
                  msg_error "Invalid selection. Exiting."
                  exit 1
                  ;;
              esac
            else
              # Store the manually entered token
              API_TOKEN_ID="${TOKEN_USER}!${TOKEN_NAME}"
              API_TOKEN_SECRET="$existing_token_secret"
              msg_ok "Existing token secret received"
              echo ""

              # Test the manually entered token
              msg_info "Validating token..."
              if timeout 10 curl -k -s -f \
                -H "Authorization: PVEAPIToken=${API_TOKEN_ID}=${API_TOKEN_SECRET}" \
                "https://${PROXMOX_HOST}:8006/api2/json/version" >/dev/null 2>&1; then
                msg_ok "Token validated successfully"

                # Save for config file
                echo "$API_TOKEN_SECRET" > /tmp/proxbalance_token_secret.txt
                chmod 600 /tmp/proxbalance_token_secret.txt
                AUTH_METHOD="api_token"

                # Configure permissions based on choice
                msg_info "Configuring API permissions..."
                if [ "$TOKEN_PERMS" = "minimal" ]; then
                  pvesh set /access/acl --path / --roles PVEAuditor --users "${TOKEN_USER}" --propagate 1 2>/dev/null || true
                  pvesh set /access/acl --path / --roles PVEAuditor --tokens "${API_TOKEN_ID}" --propagate 1 2>/dev/null || true
                  msg_ok "Minimal permissions applied"
                else
                  pvesh set /access/acl --path / --roles PVEAuditor --users "${TOKEN_USER}" --propagate 1 2>/dev/null || true
                  pvesh set /access/acl --path / --roles PVEVMAdmin --users "${TOKEN_USER}" --propagate 1 2>/dev/null || true
                  pvesh set /access/acl --path / --roles PVEAuditor --tokens "${API_TOKEN_ID}" --propagate 1 2>/dev/null || true
                  pvesh set /access/acl --path / --roles PVEVMAdmin --tokens "${API_TOKEN_ID}" --propagate 1 2>/dev/null || true
                  msg_ok "Full permissions applied"
                fi
                return 0
              else
                msg_error "Token validation failed - incorrect token or insufficient permissions"
                echo ""
                echo -e "  ${BL}1)${CL} Try entering token again"
                echo -e "  ${BL}2)${CL} Delete and create new token"
                echo -e "  ${BL}3)${CL} Continue anyway (fix in UI later)"
                echo ""
                read -p "Select option [1-3]: " validation_choice

                case $validation_choice in
                  1)
                    continue
                    ;;
                  2)
                    msg_info "Deleting existing token..."
                    pvesh delete /access/users/${TOKEN_USER}/token/${TOKEN_NAME} 2>/dev/null || true
                    break
                    ;;
                  3)
                    msg_warn "Continuing with unvalidated token"
                    echo ""
                    echo -e "${YW}⚠ WARNING: Token may not work correctly${CL}"
                    echo -e "  You will need to update the token in the UI:"
                    echo -e "  ${BL}Settings → API Configuration → Update Token${CL}"
                    echo ""

                    # Save for config file anyway
                    echo "$API_TOKEN_SECRET" > /tmp/proxbalance_token_secret.txt
                    chmod 600 /tmp/proxbalance_token_secret.txt
                    AUTH_METHOD="api_token"
                    return 0
                    ;;
                  *)
                    msg_error "Invalid selection"
                    continue
                    ;;
                esac
              fi
            fi
          done
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
        # IMPORTANT: Both USER and TOKEN need permissions (even with privsep=0)
        # Add to USER account
        pvesh set /access/acl --path / --roles PVEAuditor --users "${TOKEN_USER}" --propagate 1 2>/dev/null || true
        # Add to TOKEN
        pvesh set /access/acl --path / --roles PVEAuditor --tokens "${API_TOKEN_ID}" --propagate 1 2>/dev/null || true
        msg_ok "Minimal permissions applied (VM.Audit, Sys.Audit, Datastore.Audit)"
        echo -e "     ${YW}Note:${CL} This token can only read data. Migration buttons will not work."
      else
        # Full permissions (read + migrate)
        # IMPORTANT: Both USER and TOKEN need permissions (even with privsep=0)
        # IMPORTANT: Both PVEAuditor and PVEVMAdmin roles are required
        #            PVEVMAdmin alone doesn't include all Sys.Audit permissions
        # Add to USER account
        pvesh set /access/acl --path / --roles PVEAuditor --users "${TOKEN_USER}" --propagate 1 2>/dev/null || true
        pvesh set /access/acl --path / --roles PVEVMAdmin --users "${TOKEN_USER}" --propagate 1 2>/dev/null || true
        # Add to TOKEN
        pvesh set /access/acl --path / --roles PVEAuditor --tokens "${API_TOKEN_ID}" --propagate 1 2>/dev/null || true
        pvesh set /access/acl --path / --roles PVEVMAdmin --tokens "${API_TOKEN_ID}" --propagate 1 2>/dev/null || true
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
        msg_ok "API access verified - token is working correctly"
        return 0
      else
        msg_warn "Could not verify API access immediately"
        echo ""
        echo -e "${YW}This may be normal if:${CL}"
        echo -e "  • Services are still starting up"
        echo -e "  • Network configuration is pending"
        echo -e "  • Firewall rules need adjustment"
        echo ""
        echo -e "${INFO} The token has been created and configured."
        echo -e "${INFO} If data collection fails, check token in the UI later."
        echo ""
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

setup_motd() {
  msg_info "Configuring Console Message"

  # Create MOTD with useful information
  pct exec "$CTID" -- bash <<EOF
cat > /etc/motd <<'MOTD'

╔════════════════════════════════════════════════════════════════╗
║                  ProxBalance v2.0                              ║
║         Proxmox Cluster Balance Manager                        ║
╚════════════════════════════════════════════════════════════════╝

📡 Web Interface:  http://${CONTAINER_IP}
📊 API Endpoint:   http://${CONTAINER_IP}/api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Common Commands:

  📊 Check service status:
     systemctl status proxmox-balance proxmox-collector.timer nginx

  📈 Monitor data collection:
     journalctl -u proxmox-collector -f

  📝 View API logs:
     journalctl -u proxmox-balance -f

  🔄 Restart services:
     systemctl restart proxmox-balance
     systemctl restart proxmox-collector.timer

  ⚙️  Edit configuration:
     nano /opt/proxmox-balance-manager/config.json
     # Then restart services to apply changes

  🔍 Run manual collection:
     systemctl start proxmox-collector.service

  📊 View cluster cache:
     jq '.' /opt/proxmox-balance-manager/cluster_cache.json | less

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Documentation: https://github.com/Pr0zak/ProxBalance
🐛 Report issues:  https://github.com/Pr0zak/ProxBalance/issues

MOTD
EOF

  # Configure auto-login for console if no password was set
  if [ "$PASSWORD_TYPE" = "none" ]; then
    pct exec "$CTID" -- bash <<'AUTOLOGIN_EOF'
mkdir -p /etc/systemd/system/container-getty@1.service.d
cat > /etc/systemd/system/container-getty@1.service.d/override.conf <<'AUTOLOGIN_CONF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear --keep-baud pts/%I 115200,38400,9600 $TERM
AUTOLOGIN_CONF
systemctl daemon-reload
systemctl restart container-getty@1.service 2>/dev/null || true
AUTOLOGIN_EOF
  fi

  # Add MOTD display to shell profiles
  pct exec "$CTID" -- bash <<'PROFILE_EOF'
# Add to .bashrc
if ! grep -q "cat /etc/motd" /root/.bashrc 2>/dev/null; then
  echo "" >> /root/.bashrc
  echo "# Display ProxBalance MOTD" >> /root/.bashrc
  echo '[ -f /etc/motd ] && cat /etc/motd' >> /root/.bashrc
fi

# Add to .profile
if ! grep -q "cat /etc/motd" /root/.profile 2>/dev/null; then
  echo "" >> /root/.profile
  echo "# Display ProxBalance MOTD" >> /root/.profile
  echo '[ -f /etc/motd ] && cat /etc/motd' >> /root/.profile
fi
PROFILE_EOF

  msg_ok "Console message configured"
}

set_container_notes() {
  msg_info "Setting Container Notes"

  # Determine permission level for notes
  local perm_description="PVEAuditor (Read-Only)"
  local perm_note="Read-only monitoring. Migration buttons will not work."

  # Check if we set full permissions (this variable should be available from setup_api_tokens)
  if [ "${TOKEN_PERMS:-minimal}" = "full" ]; then
    perm_description="PVEVMAdmin (Read + Migrate)"
    perm_note="Full permissions including live migrations."
  fi

  # Create comprehensive notes for Proxmox UI using Markdown
  local notes="# ProxBalance v2.0

**Cluster Balance Manager**

---

## Access Information

* **Web Interface:** <http://${CONTAINER_IP}>
* **API Endpoint:** <http://${CONTAINER_IP}/api>
* **Container ID:** ${CTID}
* **Hostname:** ${HOSTNAME}

---

## Quick Commands

### Check Status

\`\`\`
bash -c \"\$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)\" _ ${CTID}
\`\`\`

### Access Console

\`\`\`
pct enter ${CTID}
\`\`\`

### View Logs

\`\`\`
# API Logs
pct exec ${CTID} -- journalctl -u proxmox-balance -f

# Collector Logs
pct exec ${CTID} -- journalctl -u proxmox-collector -f
\`\`\`

### Restart Services

\`\`\`
# Restart API
pct exec ${CTID} -- systemctl restart proxmox-balance

# Restart Collector
pct exec ${CTID} -- systemctl restart proxmox-collector.timer
\`\`\`

### Edit Configuration

\`\`\`
pct exec ${CTID} -- nano /opt/proxmox-balance-manager/config.json
\`\`\`

---

## Services

| Service | Description | Port |
|---------|-------------|------|
| proxmox-balance.service | Flask API Server | 5000 |
| proxmox-collector.timer | Data Collection Timer | - |
| nginx.service | Web Server | 80 |

---

## Key Files

| Purpose | Path |
|---------|------|
| Config | \`/opt/proxmox-balance-manager/config.json\` |
| Cache | \`/opt/proxmox-balance-manager/cluster_cache.json\` |
| API App | \`/opt/proxmox-balance-manager/app.py\` |
| Collector | \`/opt/proxmox-balance-manager/collector_api.py\` |
| Web UI | \`/var/www/html/index.html\` |

---

## Authentication

* **Method:** API Token Authentication (v2.0)
* **Token ID:** \`proxbalance@pam!proxbalance\`
* **Permissions:** ${perm_description}
* **Note:** ${perm_note}

---

## Resources

* [Documentation](https://github.com/Pr0zak/ProxBalance)
* [Installation Guide](https://github.com/Pr0zak/ProxBalance/blob/main/docs/INSTALL.md)
* [Troubleshooting](https://github.com/Pr0zak/ProxBalance/blob/main/docs/TROUBLESHOOTING.md)
* [Report Issues](https://github.com/Pr0zak/ProxBalance/issues)

---

*Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')*
"

  # Set notes using pct set
  if pct set "$CTID" --description "$notes" 2>/dev/null; then
    msg_ok "Container notes set (Markdown formatted)"
  else
    msg_warn "Could not set container notes (non-critical)"
  fi
}

start_services() {
  msg_info "Starting Services"

  (
    pct exec "$CTID" -- bash <<'EOF'
systemctl start proxmox-balance.service
systemctl start proxmox-collector.timer
systemctl start proxmox-balance-automigrate.timer
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

  # Try to trigger initial collection (single attempt)
  local success=false
  local timeout_seconds=15

  # Start the collection service
  pct exec "$CTID" -- systemctl start proxmox-collector.service 2>/dev/null || true

  # Wait for collection to complete (up to 15 seconds)
  (
    set +e  # Disable exit on error for this subshell
    local waited=0
    while [ $waited -lt $timeout_seconds ]; do
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

  if spinner $! "Collecting data from Proxmox cluster (up to ${timeout_seconds} seconds)"; then
    success=true
  fi

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
    echo -e "  ${BOLD}${YW}This may be normal, or there could be an issue:${CL}"
    echo ""
    echo -e "  ${DIM}Common causes:${CL}"
    echo -e "  • Services still starting up (wait a few minutes)"
    echo -e "  • Invalid or insufficient API token permissions"
    echo -e "  • Network connectivity issues"
    echo -e "  • Proxmox host not reachable from container"
    echo ""
    echo -e "  ${INFO} The collector timer is running in the background"
    echo -e "  ${INFO} Data will be collected automatically within 60 minutes"
    echo -e "  ${INFO} You can access the UI now - it will populate when ready"
    echo ""
    echo -e "  ${BOLD}${CY}Troubleshooting:${CL}"
    echo -e "  ${DIM}Check logs:${CL}"
    echo -e "    ${BL}pct exec $CTID -- journalctl -u proxmox-collector.service -n 50${CL}"
    echo ""
    echo -e "  ${DIM}Manual trigger:${CL}"
    echo -e "    ${BL}pct exec $CTID -- systemctl start proxmox-collector.service${CL}"
    echo ""
    echo -e "  ${DIM}Fix token in UI:${CL}"
    echo -e "    ${BL}http://${CONTAINER_IP}${CL} → Settings → API Configuration"
    echo ""
  fi
}

show_completion() {
  echo ""
  echo ""
  echo -e "${GN}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "        ${BOLD}${GN}✓  INSTALLATION COMPLETE!  ✓${CL}"
  echo ""
  echo -e "${GN}════════════════════════════════════════════════════════════════${CL}"
  echo ""

  if [ "$CONTAINER_IP" != "<DHCP-assigned>" ]; then
    echo -e "${CY}════════════════════════════════════════════════════════════════${CL}"
    echo -e "  ${BOLD}${BFR}📡 Access Information${CL}"
    echo -e "${CY}════════════════════════════════════════════════════════════════${CL}"
    echo ""
    echo -e "  ${BOLD}${CY}🌐 Web Interface:${CL}  ${BOLD}${GN}http://${CONTAINER_IP}${CL}"
    echo -e "  ${BOLD}${CY}⚡ API Endpoint:${CL}   ${BOLD}${GN}http://${CONTAINER_IP}/api${CL}"
    echo -e "  ${BOLD}${CY}📦 Container ID:${CL}   ${BOLD}${GN}${CTID}${CL}"
    echo -e "  ${BOLD}${CY}🏷️  Hostname:${CL}      ${BOLD}${GN}${HOSTNAME}${CL}"
    echo ""
  fi

  # Display password information if random password was generated
  if [ "$PASSWORD_TYPE" = "random" ]; then
    echo -e "${YW}════════════════════════════════════════════════════════════════${CL}"
    echo -e "  ${BOLD}${BFR}🔐 Container Root Password (Save This!)${CL}"
    echo -e "${YW}════════════════════════════════════════════════════════════════${CL}"
    echo ""
    echo -e "  ${BOLD}${YW}Password:${CL} ${BOLD}${GN}${ROOT_PASSWORD}${CL}"
    echo ""
    echo -e "  ${WARN} ${YW}Save this password - it won't be shown again!${CL}"
    echo -e "  ${INFO} ${DIM}Access container console: ${BL}pct enter ${CTID}${CL}"
    echo ""
  elif [ "$PASSWORD_TYPE" = "none" ]; then
    echo -e "${GN}════════════════════════════════════════════════════════════════${CL}"
    echo -e "  ${BOLD}${BFR}🔐 Container Access${CL}"
    echo -e "${GN}════════════════════════════════════════════════════════════════${CL}"
    echo ""
    echo -e "  ${CM} ${GN}Auto-login enabled${CL} ${DIM}(No password required)${CL}"
    echo -e "  ${INFO} ${DIM}Access container console: ${BL}pct enter ${CTID}${CL}"
    echo ""
  fi

  echo -e "${MG}════════════════════════════════════════════════════════════════${CL}"
  echo -e "  ${BOLD}${BFR}🛠️  Quick Commands${CL}"
  echo -e "${MG}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}📊 Check detailed status:${CL}"
  echo -e "     ${BL}bash -c \"\$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)\" _ ${CTID}${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}🖥️  Access container console:${CL}"
  echo -e "     ${BL}pct enter ${CTID}${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}📈 Monitor data collection:${CL}"
  echo -e "     ${BL}pct exec ${CTID} -- journalctl -u proxmox-collector -f${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}📝 View API logs:${CL}"
  echo -e "     ${BL}pct exec ${CTID} -- journalctl -u proxmox-balance -f${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}🔄 Restart services:${CL}"
  echo -e "     ${BL}pct exec ${CTID} -- systemctl restart proxmox-balance${CL}"
  echo ""
  echo -e "  ${BOLD}${YW}⚙️  Edit configuration:${CL}"
  echo -e "     ${BL}pct exec ${CTID} -- nano /opt/proxmox-balance-manager/config.json${CL}"
  echo ""
  echo -e "${GN}════════════════════════════════════════════════════════════════${CL}"
  echo ""
  echo -e "  ${BOLD}${GN}🎉 ProxBalance is ready!${CL} ${BOLD}${CY}→${CL} ${BOLD}${GN}http://${CONTAINER_IP}${CL}"
  echo ""
  echo -e "${DIM}  📚 Documentation: https://github.com/Pr0zak/ProxBalance${CL}"
  echo -e "${DIM}  🐛 Report issues:  https://github.com/Pr0zak/ProxBalance/issues${CL}"
  echo ""
  echo -e "${DIM}  📋 Logs:${CL}"
  echo -e "${DIM}     Screen output: ${INSTALL_LOG}${CL}"
  echo -e "${DIM}     Verbose:       ${INSTALL_LOG_VERBOSE}${CL}"
  echo ""
  echo -e "${DIM}Installation completed: $(date)${CL}"
  echo ""
}

main() {
  # Set total steps for progress tracking (8 config steps + 1 detect nodes)
  TOTAL_STEPS=9

  # Setup installation log
  INSTALL_LOG="/var/log/proxbalance-install-$(date +%Y%m%d-%H%M%S).log"
  INSTALL_LOG_VERBOSE="/var/log/proxbalance-install-$(date +%Y%m%d-%H%M%S)-verbose.log"

  # User-facing log (what they see on screen)
  exec > >(tee -a "$INSTALL_LOG") 2>&1

  # Verbose log header
  echo "ProxBalance Installation - Verbose Log" > "$INSTALL_LOG_VERBOSE"
  echo "Started: $(date)" >> "$INSTALL_LOG_VERBOSE"
  echo "========================================" >> "$INSTALL_LOG_VERBOSE"
  echo "" >> "$INSTALL_LOG_VERBOSE"

  echo "ProxBalance Installation Log"
  echo "Started: $(date)"
  echo "Log file: $INSTALL_LOG"
  echo "Verbose log: $INSTALL_LOG_VERBOSE"
  echo ""

  header_info
  check_root
  check_proxmox

  msg_ok "Running on Proxmox VE"
  msg_ok "Running as root"
  echo ""

  select_container_id
  select_hostname
  select_network
  select_storage
  select_template
  select_resources
  select_password
  detect_proxmox_nodes
  show_summary

  create_container
  get_container_ip
  install_dependencies
  install_proxbalance
  setup_api_tokens
  configure_application
  setup_services
  build_frontend
  setup_nginx
  setup_motd
  set_container_notes

  start_services
  initial_collection
  show_completion
}

main "$@"
