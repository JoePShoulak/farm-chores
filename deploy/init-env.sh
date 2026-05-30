#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  if grep -q "^APP_PASSWORD=replace-with-" .env || ! grep -q "^APP_PASSWORD=" .env; then
    password="$(openssl rand -hex 32)"
    if grep -q "^APP_PASSWORD=" .env; then
      sed -i "s/^APP_PASSWORD=.*/APP_PASSWORD=$password/" .env
    else
      printf "\nAPP_PASSWORD=%s\n" "$password" >> .env
    fi
    echo "Updated APP_PASSWORD in .env"
  else
    echo ".env already exists with an APP_PASSWORD"
  fi
  exit 0
fi

password="$(openssl rand -hex 32)"

cat > .env <<EOF
DATABASE_URL=postgres://farm_chores_dev:farm_chores_dev@127.0.0.1:55432/farm_chores_dev
PORT=3001

APP_PASSWORD=$password
FARM_CHORES_REMOTE=hp1
REMOTE=leo@hp2
HP2_ADDRESS=192.168.20.22
APP_HOST_CIDR=192.168.20.21/32
EOF

chmod 600 .env 2>/dev/null || true
echo "Created .env"
