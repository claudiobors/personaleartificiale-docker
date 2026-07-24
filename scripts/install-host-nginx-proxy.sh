#!/usr/bin/env bash
# Installa/aggiorna il reverse proxy host per far convivere:
# - occhioesperto.it su 127.0.0.1:3000
# - personaleartificiale.it/app.personaleartificiale.it su 127.0.0.1:8081
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Esegui con sudo: sudo bash scripts/install-host-nginx-proxy.sh"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update
  apt-get install -y nginx
fi

if [[ "${SKIP_CERTBOT:-false}" != "true" ]] && ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/deploy/nginx/multi-site.conf"
DEST="/etc/nginx/sites-available/personaleartificiale-multisite"
LINK="/etc/nginx/sites-enabled/personaleartificiale-multisite"

install -m 0644 "$SRC" "$DEST"
ln -sfn "$DEST" "$LINK"

# Evita che il sito default intercetti i domini se ancora presente.
if [ -L /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx || systemctl restart nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null || true
  ufw allow 443/tcp >/dev/null || true
fi

if [[ "${SKIP_CERTBOT:-false}" != "true" ]]; then
  : "${CERTBOT_EMAIL:?Imposta CERTBOT_EMAIL, es: sudo CERTBOT_EMAIL=info@personaleartificiale.it bash scripts/install-host-nginx-proxy.sh}"
  certbot --nginx --non-interactive --agree-tos --redirect \
    --email "$CERTBOT_EMAIL" \
    -d personaleartificiale.it -d www.personaleartificiale.it -d app.personaleartificiale.it
  nginx -t
  systemctl reload nginx || systemctl restart nginx
fi

ss -ltnp | grep -E ':80|:443|:8081|:3000' || true

echo "Reverse proxy installato. Testa:"
echo "curl -I http://personaleartificiale.it"
echo "curl -I http://app.personaleartificiale.it/api/health"
echo "curl -I https://personaleartificiale.it"
echo "curl -I https://app.personaleartificiale.it/dashboard"
echo "curl -I http://occhioesperto.it"
