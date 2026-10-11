#!/usr/bin/env bash
# Package the built web bundle for a GitHub release.
#
# Usage: bash tools/package-web-bundle.sh <tag> <out-dir>
# Expects build.sh to have produced assets/js/app.js and assets/css/tailwind.css.
# Writes <out-dir>/proxbalance-web-<tag>.tar.gz and <out-dir>/SHA256SUMS, which
# release_updater.py downloads and verifies before installing.
set -euo pipefail

TAG="${1:?usage: package-web-bundle.sh <tag> <out-dir>}"
OUT="${2:?usage: package-web-bundle.sh <tag> <out-dir>}"
NAME="proxbalance-web-${TAG}.tar.gz"

for f in assets/js/app.js assets/css/tailwind.css; do
  [ -s "$f" ] || { echo "✗ $f missing or empty; run build.sh first" >&2; exit 1; }
done

mkdir -p "$OUT"
# Fixed owner and mtime so the same build gives the same archive.
tar --owner=0 --group=0 --numeric-owner --mtime='2000-01-01 00:00:00Z' --sort=name \
  -czf "${OUT}/${NAME}" assets/js/app.js assets/css/tailwind.css
(cd "$OUT" && sha256sum "$NAME" > SHA256SUMS)
echo "✓ ${OUT}/${NAME}"
cat "${OUT}/SHA256SUMS"
