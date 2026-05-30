#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
. "deploy/load-env.sh"
load_farm_chores_env

REMOTE="${REMOTE:-leo@hp2}"
HP2_ADDRESS="${HP2_ADDRESS:-192.168.20.22}"
APP_HOST_CIDR="${APP_HOST_CIDR:-192.168.20.21/32}"
APP_DB="${APP_DB:-farm_chores}"
APP_USER="${APP_USER:-farm_chores_app}"
APP_PASSWORD="${APP_PASSWORD:-}"
DEPLOY_OPERATOR="${DEPLOY_OPERATOR:-leo}"
APPLY="/usr/local/sbin/farm-chores-db-apply"
REMOTE_APPLY_TMP="/tmp/farm-chores-db-apply"
REMOTE_ENV_TMP="/tmp/farm-chores-db.env"

usage() {
  cat <<EOF
Usage:
  bash deploy/hp2-postgres.sh

Environment is loaded from .env by default.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_farm_chores_password

local_env="$(mktemp)"
cleanup() {
  rm -f "$local_env"
}
trap cleanup EXIT

cat > "$local_env" <<EOF
HP2_ADDRESS=$HP2_ADDRESS
APP_HOST_CIDR=$APP_HOST_CIDR
APP_DB=$APP_DB
APP_USER=$APP_USER
APP_PASSWORD=$APP_PASSWORD
DEPLOY_OPERATOR=$DEPLOY_OPERATOR
EOF

scp "$local_env" "$REMOTE:$REMOTE_ENV_TMP"

if [[ "${1:-}" == "--bootstrap" ]]; then
  scp "deploy/hp2-db-apply.sh" "$REMOTE:$REMOTE_APPLY_TMP"
  ssh -t "$REMOTE" "sudo install -m 0755 $REMOTE_APPLY_TMP $APPLY && rm -f $REMOTE_APPLY_TMP && sudo $APPLY"
elif ssh "$REMOTE" "test -x $APPLY && sudo -n -l $APPLY >/dev/null 2>&1"; then
  ssh "$REMOTE" "sudo -n $APPLY" || {
    echo "HP2 DB deploy sudo is not fully passwordless yet." >&2
    echo "Run: npm run bootstrap:db:hp2" >&2
    exit 1
  }
else
  echo "HP2 DB deploy helper is missing." >&2
  echo "Run: npm run bootstrap:db:hp2" >&2
  exit 1
fi
