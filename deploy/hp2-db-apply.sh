#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${1:-/tmp/farm-chores-db.env}"

if [[ "$ENV_FILE" != "/tmp/farm-chores-db.env" ]]; then
  echo "Refusing unexpected env source: $ENV_FILE" >&2
  exit 64
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  . "$ENV_FILE"
  set +a
  rm -f "$ENV_FILE"
fi

HP2_ADDRESS="${HP2_ADDRESS:-192.168.20.22}"
APP_HOST_CIDR="${APP_HOST_CIDR:-192.168.20.21/32}"
APP_DB="${APP_DB:-farm_chores}"
APP_USER="${APP_USER:-farm_chores_app}"
APP_PASSWORD="${APP_PASSWORD:-}"
DEPLOY_OPERATOR="${DEPLOY_OPERATOR:-leo}"

if [[ -z "$APP_PASSWORD" || "$APP_PASSWORD" == replace-with-* ]]; then
  echo "APP_PASSWORD is required." >&2
  exit 64
fi

if [[ "${FARM_CHORES_AUTH_CHECK_ONLY:-0}" == "1" ]]; then
  echo "db deploy sudo ok"
  exit 0
fi

apt-get update
apt-get install -y postgresql postgresql-client

pg_version="$(ls /etc/postgresql | sort -V | tail -n 1)"
pg_conf="/etc/postgresql/${pg_version}/main/postgresql.conf"
pg_hba="/etc/postgresql/${pg_version}/main/pg_hba.conf"

if grep -Eq "^#?listen_addresses =" "$pg_conf"; then
  sed -i "s/^#\?listen_addresses = .*/listen_addresses = '127.0.0.1,${HP2_ADDRESS}'/" "$pg_conf"
else
  echo "listen_addresses = '127.0.0.1,${HP2_ADDRESS}'" >> "$pg_conf"
fi

if ! grep -q "^host ${APP_DB} ${APP_USER} ${APP_HOST_CIDR} scram-sha-256" "$pg_hba"; then
  echo "host ${APP_DB} ${APP_USER} ${APP_HOST_CIDR} scram-sha-256" >> "$pg_hba"
fi

systemctl enable postgresql
systemctl restart postgresql

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow from "$APP_HOST_CIDR" to any port 5432 proto tcp
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 \
  -v app_db="$APP_DB" \
  -v app_user="$APP_USER" \
  -v app_password="$APP_PASSWORD" <<'SQL'
select format('create role %I login password %L', :'app_user', :'app_password')
where not exists (select from pg_roles where rolname = :'app_user') \gexec

select format('alter role %I with password %L', :'app_user', :'app_password') \gexec

select format('create database %I owner %I', :'app_db', :'app_user')
where not exists (select from pg_database where datname = :'app_db') \gexec
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 \
  -v app_db="$APP_DB" \
  -v app_user="$APP_USER" \
  -d "$APP_DB" <<'SQL'
grant all privileges on database :"app_db" to :"app_user";
grant all on schema public to :"app_user";
SQL

cat >/etc/sudoers.d/farm-chores-db-deploy <<EOF
$DEPLOY_OPERATOR ALL=(root) NOPASSWD: /usr/local/sbin/farm-chores-db-apply, /usr/local/sbin/farm-chores-db-apply /tmp/farm-chores-db.env
EOF
chmod 0440 /etc/sudoers.d/farm-chores-db-deploy
visudo -cf /etc/sudoers.d/farm-chores-db-deploy

systemctl --no-pager --full status postgresql

cat <<EOF

PostgreSQL is ready on ${HP2_ADDRESS}:5432.
Farm Chores DB: ${APP_DB}
Farm Chores user: ${APP_USER}
EOF
