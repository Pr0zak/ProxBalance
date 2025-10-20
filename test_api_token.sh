#!/bin/bash
# Test API token creation to debug the issue

TOKEN_USER="proxbalance@pam"
TOKEN_NAME="proxbalance"
TOKEN_COMMENT="ProxBalance automated monitoring"

echo "Testing API token creation..."
echo ""

# Try to create token and capture full output
echo "Running: pvesh create /access/users/${TOKEN_USER}/token/${TOKEN_NAME}"
token_result=$(pvesh create /access/users/${TOKEN_USER}/token/${TOKEN_NAME} \
  --comment "$TOKEN_COMMENT" \
  --privsep 0 2>&1)

echo "Raw output:"
echo "$token_result"
echo ""

# Try to extract with jq
echo "Trying jq extraction:"
TOKEN_SECRET=$(echo "$token_result" | jq -r '.value' 2>&1)
echo "jq result: $TOKEN_SECRET"
echo ""

# Try grep extraction
echo "Trying grep extraction:"
TOKEN_SECRET_GREP=$(echo "$token_result" | grep -oP '(?<=value: ).*' | tr -d '[:space:]')
echo "grep result: $TOKEN_SECRET_GREP"
echo ""

# Check if token exists
echo "Checking if token exists:"
pvesh get /access/users/${TOKEN_USER}/token/${TOKEN_NAME} 2>&1 || echo "Token does not exist"
