#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$SCRIPT_DIR/dist"
ARCHIVE="$OUT_DIR/farm-chores.tar.gz"

mkdir -p "$OUT_DIR"
rm -f "$ARCHIVE"

npm install
npm run build

tar -czf "$ARCHIVE" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.npm-cache' \
  --exclude='.postgres-data' \
  --exclude='.mongo-data' \
  --exclude='.secrets' \
  --exclude='deploy/dist' \
  --exclude='.env' \
  -C "$REPO_DIR" .

echo "$ARCHIVE"
