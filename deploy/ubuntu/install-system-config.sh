#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/farm-chores/app}"
DEPLOY_USER="${DEPLOY_USER:-farmchores}"
DEPLOY_OPERATOR="${DEPLOY_OPERATOR:-leo}"

install -d -m 0750 -o root -g root /etc/farm-chores
if [[ ! -f /etc/farm-chores/farm-chores.env ]]; then
  install -m 0640 -o root -g root /dev/null /etc/farm-chores/farm-chores.env
fi

install -m 0644 "$APP_DIR/deploy/ubuntu/farm-chores-api.service" /etc/systemd/system/farm-chores-api.service
install -m 0644 "$APP_DIR/deploy/ubuntu/farm-chores.nginx" /etc/nginx/sites-available/farm-chores
ln -sfn /etc/nginx/sites-available/farm-chores /etc/nginx/sites-enabled/farm-chores

install -m 0755 "$APP_DIR/deploy/apply-deploy.sh" /usr/local/sbin/farm-chores-apply-deploy
install -m 0755 "$APP_DIR/deploy/ubuntu/install-env.sh" /usr/local/sbin/farm-chores-install-env
install -m 0755 "$APP_DIR/deploy/ubuntu/install-system-config.sh" /usr/local/sbin/farm-chores-install-system-config
install -m 0755 "$APP_DIR/deploy/ubuntu/farm-chores-disable" /usr/local/sbin/farm-chores-disable

cat >/etc/sudoers.d/farm-chores-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/local/sbin/farm-chores-install-system-config, /bin/systemctl restart farm-chores-api.service, /usr/bin/systemctl restart farm-chores-api.service, /bin/systemctl reload nginx, /usr/bin/systemctl reload nginx, /usr/sbin/nginx -t
$DEPLOY_OPERATOR ALL=(root) NOPASSWD: /usr/local/sbin/farm-chores-apply-deploy /tmp/farm-chores.tar.gz
$DEPLOY_OPERATOR ALL=(root) NOPASSWD: /usr/local/sbin/farm-chores-install-env /tmp/farm-chores.env, /usr/local/sbin/farm-chores-install-system-config, /usr/local/sbin/farm-chores-disable, /bin/systemctl enable --now farm-chores-api.service, /usr/bin/systemctl enable --now farm-chores-api.service, /bin/systemctl restart farm-chores-api.service, /usr/bin/systemctl restart farm-chores-api.service, /bin/systemctl reload nginx, /usr/bin/systemctl reload nginx, /usr/sbin/nginx -t
EOF
chmod 0440 /etc/sudoers.d/farm-chores-deploy
visudo -cf /etc/sudoers.d/farm-chores-deploy

systemctl daemon-reload
systemctl enable farm-chores-api.service
nginx -t
systemctl reload nginx || systemctl restart nginx
