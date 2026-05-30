#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/farm-chores/app}"

cd "$APP_DIR"

if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

if [[ ! -f dist/index.html ]]; then
  echo "Built frontend is missing. Run the package step before deploying." >&2
  exit 1
fi

if [[ -x /usr/local/sbin/farm-chores-install-system-config ]]; then
  sudo -n /usr/local/sbin/farm-chores-install-system-config
fi

sudo -n systemctl restart farm-chores-api.service
sudo -n nginx -t
sudo -n systemctl reload nginx
