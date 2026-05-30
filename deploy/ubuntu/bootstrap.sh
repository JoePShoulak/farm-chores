#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/farm-chores/app}"

apt-get update
apt-get install -y ca-certificates curl nginx

if ! command -v node >/dev/null 2>&1; then
  apt-get install -y nodejs
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not available after installing nodejs. Install a Node.js package that includes npm." >&2
  exit 1
fi

bash "$APP_DIR/deploy/ubuntu/install-system-config.sh"
