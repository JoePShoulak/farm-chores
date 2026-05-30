#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE="${1:-/tmp/farm-chores.env}"
TARGET="/etc/farm-chores/farm-chores.env"

if [[ "$SOURCE" != "/tmp/farm-chores.env" ]]; then
  echo "Refusing unexpected env source: $SOURCE" >&2
  exit 64
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "Env file not found: $SOURCE" >&2
  exit 1
fi

install -d -m 0750 -o root -g root /etc/farm-chores
install -m 0640 -o root -g root "$SOURCE" "$TARGET"
rm -f "$SOURCE"
