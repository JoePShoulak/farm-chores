#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-.postgres-data}"
DB_NAME="${DB_NAME:-farm_chores_dev}"
DB_USER="${DB_USER:-farm_chores_dev}"
DB_PASSWORD="${DB_PASSWORD:-farm_chores_dev}"
PORT="${POSTGRES_PORT:-55432}"

if ! command -v initdb >/dev/null 2>&1 || ! command -v postgres >/dev/null 2>&1; then
  cat >&2 <<EOF
PostgreSQL tools are not on PATH.

Install PostgreSQL locally, then rerun:
  npm run dev:db

The app expects:
  postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}
EOF
  exit 127
fi

if [[ ! -d "$DATA_DIR/base" ]]; then
  password_file="$(mktemp)"
  printf '%s\n' "$DB_PASSWORD" > "$password_file"
  mkdir -p "$DATA_DIR"
  initdb -D "$DATA_DIR" --username="$DB_USER" --pwfile="$password_file"
  rm -f "$password_file"
  {
    echo "listen_addresses = '127.0.0.1'"
    echo "port = $PORT"
  } >> "$DATA_DIR/postgresql.conf"
fi

postgres -D "$DATA_DIR" &
postgres_pid="$!"

cleanup() {
  kill "$postgres_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for attempt in {1..20}; do
  if pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
  echo "PostgreSQL did not start on 127.0.0.1:$PORT." >&2
  exit 1
fi

PGPASSWORD="$DB_PASSWORD" createdb -h 127.0.0.1 -p "$PORT" -U "$DB_USER" "$DB_NAME" >/dev/null 2>&1 || true
echo "PostgreSQL dev DB running on 127.0.0.1:$PORT"
wait "$postgres_pid"
