#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
. "deploy/load-env.sh"
load_farm_chores_env

require_farm_chores_password

bash deploy/hp2-postgres.sh

if [[ "${FARM_CHORES_HP1_BOOTSTRAP:-0}" == "1" ]]; then
  bash deploy/manage.sh bootstrap
else
  bash deploy/manage.sh deploy
fi
