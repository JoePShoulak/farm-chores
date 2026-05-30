#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

. "$ROOT_DIR/deploy/load-env.sh"
load_farm_chores_env

REMOTE="${FARM_CHORES_REMOTE:-hp1}"
SSH_CONFIG="$ROOT_DIR/deploy/dist/farm-chores-ssh-config"
SSH_OPTS=(-F "$SSH_CONFIG")
ARCHIVE_LOCAL="$ROOT_DIR/deploy/dist/farm-chores.tar.gz"
ARCHIVE_REMOTE="${FARM_CHORES_ARCHIVE:-/tmp/farm-chores.tar.gz}"
APPLY="/usr/local/sbin/farm-chores-apply-deploy"
ENABLE="/usr/local/sbin/farm-chores-install-system-config"
DISABLE="/usr/local/sbin/farm-chores-disable"
REMOTE_ENV_TMP="/tmp/farm-chores.env"

usage() {
  cat <<EOF
Usage: bash deploy/manage.sh <command>

Commands:
  deploy      Package, copy, configure env if provided, and apply on HP1
  bootstrap   First-time HP1 install path
  config      Upload production env to HP1 only
  auth-check  Check passwordless SSH and deploy sudo access
  up          Enable/start Farm Chores services
  down        Stop/disable Farm Chores services
  restart     Restart API and reload Nginx
  package     Build the deploy archive only
  send        Build and copy the deploy archive only

Production env:
  Set FARM_CHORES_DATABASE_URL directly, or set APP_PASSWORD and the URL will be
  built for HP2's farm_chores_app user. These are loaded from .env by default.
EOF
}

ensure_ssh_config() {
  mkdir -p "$(dirname "$SSH_CONFIG")"
  cat > "$SSH_CONFIG" <<EOF
Host hp1
  HostName 192.168.20.21
  User leo
  StrictHostKeyChecking accept-new

Host hp2
  HostName 192.168.20.22
  User leo
  StrictHostKeyChecking accept-new

Host *
  StrictHostKeyChecking accept-new
EOF
}

production_database_url() {
  if [[ -n "${FARM_CHORES_DATABASE_URL:-}" ]]; then
    echo "$FARM_CHORES_DATABASE_URL"
    return
  fi

  if [[ -n "${APP_PASSWORD:-}" ]]; then
    require_farm_chores_password
    local encoded_password
    encoded_password="$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$APP_PASSWORD")"
    echo "postgres://farm_chores_app:${encoded_password}@192.168.20.22:5432/farm_chores"
    return
  fi

  return 1
}

package_app() {
  (cd "$ROOT_DIR" && bash deploy/package.sh)
}

send_app() {
  package_app
  ensure_ssh_config
  scp "${SSH_OPTS[@]}" "$ARCHIVE_LOCAL" "$REMOTE:$ARCHIVE_REMOTE"
}

config_app() {
  local database_url
  local local_env
  database_url="$(production_database_url)" || {
    echo "Set FARM_CHORES_DATABASE_URL or APP_PASSWORD before configuring HP1." >&2
    exit 64
  }
  local_env="$(mktemp)"

  cat > "$local_env" <<EOF
DATABASE_URL=$database_url
PORT=3001
NODE_ENV=production
EOF

  ensure_ssh_config
  scp "${SSH_OPTS[@]}" "$local_env" "$REMOTE:$REMOTE_ENV_TMP"
  ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n /usr/local/sbin/farm-chores-install-env $REMOTE_ENV_TMP"
  rm -f "$local_env"
}

deploy_app() {
  send_app
  ensure_ssh_config
  ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n $APPLY $ARCHIVE_REMOTE"
  if production_database_url >/dev/null; then
    config_app
    restart_app
  fi
}

bootstrap_app() {
  local remote_apply="/tmp/farm-chores-apply-deploy.sh"

  send_app
  ensure_ssh_config
  scp "${SSH_OPTS[@]}" "$ROOT_DIR/deploy/apply-deploy.sh" "$REMOTE:$remote_apply"
  ssh "${SSH_OPTS[@]}" -t "$REMOTE" "sudo bash $remote_apply '$ARCHIVE_REMOTE'; status=\$?; rm -f $remote_apply; exit \$status"
  config_app
}

up_app() {
  ensure_ssh_config
  ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n $ENABLE && sudo -n systemctl enable --now farm-chores-api.service"
}

down_app() {
  ensure_ssh_config
  ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n $DISABLE"
}

restart_app() {
  ensure_ssh_config
  ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n systemctl restart farm-chores-api.service && sudo -n nginx -t && sudo -n systemctl reload nginx"
}

auth_check() {
  ensure_ssh_config
  local auth_env
  auth_env="$(mktemp)"

  cat > "$auth_env" <<EOF
APP_PASSWORD=auth-check
FARM_CHORES_AUTH_CHECK_ONLY=1
EOF

  echo "HP1:"
  ssh "${SSH_OPTS[@]}" "$REMOTE" "set -e; echo 'ssh ok'; sudo -n -l $APPLY $ARCHIVE_REMOTE >/dev/null; echo 'app deploy sudo ok'; sudo -n -l /usr/local/sbin/farm-chores-install-env $REMOTE_ENV_TMP >/dev/null; echo 'env deploy sudo ok'"

  echo "HP2:"
  scp "${SSH_OPTS[@]}" "$auth_env" "${REMOTE_HP2:-hp2}:/tmp/farm-chores-db.env"
  ssh "${SSH_OPTS[@]}" "${REMOTE_HP2:-hp2}" "set -e; echo 'ssh ok'; test -x /usr/local/sbin/farm-chores-db-apply; sudo -n /usr/local/sbin/farm-chores-db-apply"
  rm -f "$auth_env"
}

case "${1:-}" in
  deploy)
    deploy_app
    ;;
  bootstrap)
    bootstrap_app
    ;;
  config)
    config_app
    ;;
  up)
    up_app
    ;;
  down)
    down_app
    ;;
  restart)
    restart_app
    ;;
  auth-check)
    auth_check
    ;;
  package)
    package_app
    ;;
  send)
    send_app
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Unknown command: $1" >&2
    usage >&2
    exit 64
    ;;
esac
