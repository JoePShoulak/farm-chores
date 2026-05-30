#!/usr/bin/env bash

load_farm_chores_env() {
  local env_file="${FARM_CHORES_ENV_FILE:-.env}"

  if [[ -f "$env_file" ]]; then
    set -a
    . "$env_file"
    set +a
  fi
}

require_farm_chores_password() {
  if [[ -z "${APP_PASSWORD:-}" || "$APP_PASSWORD" == replace-with-* ]]; then
    echo "Set a real APP_PASSWORD in ${FARM_CHORES_ENV_FILE:-.env} before deploying." >&2
    exit 64
  fi
}
