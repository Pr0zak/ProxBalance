#!/bin/bash
# Build the ProxBalance frontend
# Bundles src/index.jsx and all imported components into assets/js/app.js
#
# React and ReactDOM are loaded as global scripts in index.html,
# so they are NOT bundled - components reference them directly.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Use local esbuild if available, otherwise npx
if [ -f "node_modules/.bin/esbuild" ]; then
    ESBUILD="node_modules/.bin/esbuild"
else
    ESBUILD="npx esbuild"
fi

echo "Building ProxBalance frontend..."
$ESBUILD src/index.jsx \
    --bundle \
    --outfile=assets/js/app.js \
    --format=iife \
    --jsx=transform \
    --target=es2020 \
    --minify-syntax \
    2>&1

echo "Build complete: assets/js/app.js"
