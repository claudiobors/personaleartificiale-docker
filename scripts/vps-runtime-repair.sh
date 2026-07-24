#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f .env ]]; then
  echo "ERRORE: .env mancante. Crea .env da .env.example con POSTGRES_PASSWORD ed EVOLUTION_API_KEY reali." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD mancante in .env}"
: "${EVOLUTION_API_KEY:?EVOLUTION_API_KEY mancante in .env}"
: "${PA_HTTP_PORT:=8081}"

if [[ "${COMPOSE_PROJECT_NAME:-}" == "pa-local" ]]; then
  echo "ERRORE: .env sembra locale (COMPOSE_PROJECT_NAME=pa-local). Non usarlo in VPS produzione." >&2
  exit 1
fi

echo "== Compose config =="
docker compose config --quiet

echo "== Pull Evolution ufficiale =="
docker compose pull evolution

echo "== Avvio database base =="
docker compose up -d postgres redis qdrant

echo "== Attendo Postgres healthy =="
for i in {1..60}; do
  if docker compose ps | grep -q 'postgres-1.*healthy'; then break; fi
  sleep 2
done

echo "== Allineo password ruolo Postgres pa a .env =="
docker compose exec -T postgres psql -U pa -d personale_artificiale -v pw="$POSTGRES_PASSWORD" -c "ALTER USER pa WITH PASSWORD :'pw';"

echo "== Verifico/creo database evolution =="
docker compose exec -T postgres psql -U pa -d personale_artificiale -tc "SELECT 1 FROM pg_database WHERE datname = 'evolution'" | grep -q 1 \
  || docker compose exec -T postgres psql -U pa -d personale_artificiale -c "CREATE DATABASE evolution OWNER pa;"

echo "== Rebuild app/www e riavvio stack =="
docker compose build --no-cache app www
docker compose rm -sf app evolution nginx || true
docker compose up -d app www evolution nginx

echo "== Stato dopo avvio =="
sleep 8
docker compose ps

echo "== Smoke loopback =="
set +e
curl -sSI --max-time 15 -H 'Host: personaleartificiale.it' "http://127.0.0.1:${PA_HTTP_PORT}/" | sed -n '1,20p'
echo "---"
curl -sSI --max-time 15 -H 'Host: www.personaleartificiale.it' "http://127.0.0.1:${PA_HTTP_PORT}/" | sed -n '1,20p'
echo "---"
curl -sSI --max-time 15 -H 'Host: app.personaleartificiale.it' "http://127.0.0.1:${PA_HTTP_PORT}/dashboard" | sed -n '1,25p'
echo "---"
curl -sS --max-time 15 -H 'Host: app.personaleartificiale.it' "http://127.0.0.1:${PA_HTTP_PORT}/api/health"
echo
set -e

if docker compose ps | grep -E 'Restarting|unhealthy|Exit'; then
  echo "== Log app =="
  docker compose logs --tail=160 app || true
  echo "== Log evolution =="
  docker compose logs --tail=200 evolution || true
  echo "== Log postgres =="
  docker compose logs --tail=100 postgres || true
  exit 1
fi

echo "OK: stack VPS allineato."
