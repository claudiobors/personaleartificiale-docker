#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f .env ]]; then
  echo "ERRORE: .env mancante. Crealo prima." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ "${COMPOSE_PROJECT_NAME:-}" != "pa-local" ]]; then
  echo "ERRORE: questo script è solo per locale e richiede COMPOSE_PROJECT_NAME=pa-local in .env" >&2
  echo "Valore attuale: ${COMPOSE_PROJECT_NAME:-<vuoto>}" >&2
  exit 1
fi

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD mancante in .env}"
: "${EVOLUTION_API_KEY:?EVOLUTION_API_KEY mancante in .env}"
: "${PA_HTTP_PORT:=8081}"

echo "Reset stack locale pa-local su porta ${PA_HTTP_PORT}..."
docker compose down -v --remove-orphans

echo "Build e avvio..."
docker compose up -d --build

echo "Attendo healthcheck app/www/nginx..."
for i in {1..60}; do
  status="$(docker compose ps --format json 2>/dev/null || true)"
  if docker compose ps | grep -q 'app-1.*healthy' \
    && docker compose ps | grep -q 'www-1.*healthy' \
    && docker compose ps | grep -q 'nginx-1.*healthy'; then
    break
  fi
  sleep 2
done

docker compose ps

echo
echo "Smoke test locali:"
curl -fsSI "http://personaleartificiale.localhost:${PA_HTTP_PORT}/" | sed -n '1,12p'
echo "---"
curl -fsSI "http://app.personaleartificiale.localhost:${PA_HTTP_PORT}/dashboard" | sed -n '1,16p'
echo "---"
curl -fsS "http://app.personaleartificiale.localhost:${PA_HTTP_PORT}/api/health"
echo
echo "OK. Apri:"
echo "  http://personaleartificiale.localhost:${PA_HTTP_PORT}/"
echo "  http://app.personaleartificiale.localhost:${PA_HTTP_PORT}/dashboard"
