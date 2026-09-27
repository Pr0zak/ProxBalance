#!/bin/bash
# Proxmox Balance Manager Settings Manager

CONFIG_FILE="/opt/proxmox-balance-manager/config.json"

show_current() {
    echo "Current Configuration:"
    echo "===================="
    if [ -f "$CONFIG_FILE" ]; then
        python3 -m json.tool "$CONFIG_FILE"
    else
        echo "No config file found. Using defaults:"
        echo '{'
        echo '  "collection_interval_minutes": 60,'
        echo '  "ui_refresh_interval_minutes": 60,'
        echo '  "proxmox_host": "192.168.1.10"'
        echo '}'
    fi
}

set_collection_interval() {
    local minutes=$1
    if [ -z "$minutes" ]; then
        echo "Error: Please provide interval in minutes"
        exit 1
    fi
    
    curl -s -X POST http://localhost:5000/api/config \
        -H "Content-Type: application/json" \
        -d "{\"collection_interval_minutes\": $minutes}"
    
    echo ""
    echo "Backend collection interval set to $minutes minutes"
    echo "Timer will be updated and restarted automatically"
}

set_ui_interval() {
    local minutes=$1
    if [ -z "$minutes" ]; then
        echo "Error: Please provide interval in minutes"
        exit 1
    fi
    
    curl -s -X POST http://localhost:5000/api/config \
        -H "Content-Type: application/json" \
        -d "{\"ui_refresh_interval_minutes\": $minutes}"
    
    echo ""
    echo "UI refresh interval set to $minutes minutes"
    echo "Users will need to refresh their browser to see the change"
}

case "$1" in
    show)
        show_current
        ;;
    set-backend)
        set_collection_interval "$2"
        ;;
    set-ui)
        set_ui_interval "$2"
        ;;
    set-both)
        if [ -z "$2" ]; then
            echo "Error: Please provide interval in minutes"
            exit 1
        fi
        set_collection_interval "$2"
        set_ui_interval "$2"
        ;;
    *)
        echo "Proxmox Balance Manager Settings"
        echo "================================="
        echo ""
        echo "Usage: $0 {show|set-backend|set-ui|set-both} [minutes]"
        echo ""
        echo "Commands:"
        echo "  show              - Show current settings"
        echo "  set-backend N     - Set backend collection interval to N minutes"
        echo "  set-ui N          - Set UI refresh interval to N minutes"
        echo "  set-both N        - Set both intervals to N minutes"
        echo ""
        echo "Examples:"
        echo "  $0 show"
        echo "  $0 set-backend 30     # Collect data every 30 minutes"
        echo "  $0 set-ui 15          # UI refreshes every 15 minutes"
        echo "  $0 set-both 45        # Both every 45 minutes"
        exit 1
        ;;
esac
