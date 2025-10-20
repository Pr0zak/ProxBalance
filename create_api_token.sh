#!/bin/bash
# ProxBalance API Token Creation Script
# This script creates a Proxmox API token for ProxBalance with appropriate permissions

set -e

echo "========================================="
echo "ProxBalance API Token Creation"
echo "========================================="
echo ""

# Check if running on Proxmox
if ! command -v pvesh &> /dev/null; then
    echo "Error: This script must be run on a Proxmox VE server"
    echo "pvesh command not found"
    exit 1
fi

# Default values
TOKEN_USER="proxbalance@pam"
TOKEN_NAME="proxbalance"
TOKEN_COMMENT="ProxBalance automated monitoring and balancing"

# Create dedicated user if it doesn't exist
if ! pveum user list | grep -q "^proxbalance@pam"; then
    echo "Creating dedicated 'proxbalance' user..."
    pveum user add proxbalance@pam --comment "ProxBalance service account" --enable 1
    echo "✓ User 'proxbalance@pam' created"
else
    echo "✓ User 'proxbalance@pam' already exists"
fi
echo ""

echo "This script will create an API token with the following details:"
echo "  User: $TOKEN_USER"
echo "  Token Name: $TOKEN_NAME"
echo "  Token ID: ${TOKEN_USER}!${TOKEN_NAME}"
echo ""
echo "The token will have read-only permissions for cluster monitoring."
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
fi

echo ""
echo "Creating API token..."

# Create the API token
# Note: --privsep 0 means no privilege separation (token has same privileges as user)
# For security, you might want --privsep 1 and then assign specific permissions
TOKEN_OUTPUT=$(pvesh create /access/users/${TOKEN_USER}/token/${TOKEN_NAME} \
    --comment "$TOKEN_COMMENT" \
    --privsep 0 2>&1)

# Extract the token secret from output (handles both table and JSON formats)
# Method 1: Table format (most common)
TOKEN_SECRET=$(echo "$TOKEN_OUTPUT" | grep -E '^\|\s*value\s*\|' | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' 2>/dev/null | head -n1)

# Method 2: Look for UUID anywhere
if [ -z "$TOKEN_SECRET" ]; then
    TOKEN_SECRET=$(echo "$TOKEN_OUTPUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' 2>/dev/null | head -n1)
fi

# Method 3: JSON format
if [ -z "$TOKEN_SECRET" ] && command -v jq &>/dev/null; then
    TOKEN_SECRET=$(echo "$TOKEN_OUTPUT" | jq -r '.value' 2>/dev/null)
fi

if [ -z "$TOKEN_SECRET" ] || [ "$TOKEN_SECRET" = "null" ]; then
    echo "Error: Failed to extract API token from output"
    echo "Output: $TOKEN_OUTPUT"
    exit 1
fi

echo ""
echo "========================================="
echo "API Token Created Successfully!"
echo "========================================="
echo ""
echo "Token ID: ${TOKEN_USER}!${TOKEN_NAME}"
echo "Token Secret: $TOKEN_SECRET"
echo ""
echo "IMPORTANT: Save the token secret securely!"
echo "It will only be shown once and cannot be retrieved again."
echo ""
echo "Add these to your ProxBalance config.json:"
echo ""
echo "  \"proxmox_auth_method\": \"api_token\","
echo "  \"proxmox_api_token_id\": \"${TOKEN_USER}!${TOKEN_NAME}\","
echo "  \"proxmox_api_token_secret\": \"$TOKEN_SECRET\","
echo ""
echo "========================================="

# Optionally save to a file
read -p "Save credentials to proxbalance_token.txt? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > proxbalance_token.txt << TOKENEOF
ProxBalance API Token Credentials
==================================

Token ID: ${TOKEN_USER}!${TOKEN_NAME}
Token Secret: $TOKEN_SECRET

Add to config.json:
{
  "proxmox_auth_method": "api_token",
  "proxmox_api_token_id": "${TOKEN_USER}!${TOKEN_NAME}",
  "proxmox_api_token_secret": "$TOKEN_SECRET"
}
TOKENEOF
    chmod 600 proxbalance_token.txt
    echo "Credentials saved to proxbalance_token.txt (chmod 600)"
fi

echo ""
echo "Done!"
