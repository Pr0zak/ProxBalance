#!/bin/bash
# Build the ProxBalance frontend
# 1. Builds Tailwind CSS from src/input.css → assets/css/tailwind.css
# 2. Bundles src/index.jsx and all imported components into assets/js/app.js
#
# React and ReactDOM are loaded as global scripts in index.html,
# so they are NOT bundled - components reference them directly.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Use local binaries if available, otherwise npx
if [ -f "node_modules/.bin/tailwindcss" ]; then
    TAILWIND="node_modules/.bin/tailwindcss"
else
    TAILWIND="npx tailwindcss"
fi

if [ -f "node_modules/.bin/esbuild" ]; then
    ESBUILD="node_modules/.bin/esbuild"
else
    ESBUILD="npx esbuild"
fi

# Ensure output directories exist
mkdir -p assets/css assets/js

echo "Building Tailwind CSS..."
$TAILWIND -i src/input.css -o assets/css/tailwind.css --minify 2>&1

echo "Building ProxBalance frontend..."
$ESBUILD src/index.jsx \
    --bundle \
    --outfile=assets/js/app.js \
    --format=iife \
    --jsx=transform \
    --target=es2020 \
    --minify-syntax \
    2>&1

echo "Build complete: assets/css/tailwind.css, assets/js/app.js"
