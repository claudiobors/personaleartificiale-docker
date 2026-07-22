#!/usr/bin/env bash
# Deploy coerente di sito pubblico, app, database e reverse proxy.
set -euo pipefail

REPO="${REPO:-https://github.com/claudiobors/personaleartificiale-docker.git}"
DIR="${DIR:-/opt/personale-artificiale}"
PUBLIC_URL="${PUBLIC_URL:-http://personaleartificiale.it}"
APP_URL="${APP_URL:-http://app.personaleartificiale.it}"
PA_HTTP_PORT="${PA_HTTP_PORT:-8081}"

for cmd in docker git curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Comando richiesto non trovato: $cmd"
    exit 1
  fi
done

if [ -d "$DIR/.git" ]; then
  cd "$DIR"
  git pull --ff-only
else
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

if [ ! -f ".env" ]; then
  echo "Manca $DIR/.env. Esegui: cp .env.example .env e compila tutti i placeholder."
  exit 1
fi

if grep -Eq 'replace_me|change_me|sk_live_replace|sk-proj_replace|whsec_replace' .env; then
  echo ".env contiene ancora placeholder: sostituiscili prima del deploy."
  exit 1
fi

echo "Valido la configurazione Docker Compose..."
docker compose config --quiet

echo "Creo/aggiorno immagini..."
docker compose build --pull app www nginx postgres redis qdrant

echo "Avvio stack completo..."
docker compose up -d --remove-orphans

echo "Controllo la configurazione Nginx..."
docker compose exec -T nginx nginx -t

echo "Attendo healthcheck app..."
for i in {1..30}; do
  if docker compose ps app --format '{{.Health}}' | grep -q healthy; then
    break
  fi
  sleep 4
  if [ "$i" -eq 30 ]; then
    docker compose logs --tail=120 app
    echo "App non healthy entro il timeout."
    exit 1
  fi
done

echo "Controllo routing locale su 127.0.0.1:${PA_HTTP_PORT}..."
PUBLIC_HEADER="$(curl -fsSI -H 'Host: personaleartificiale.it' "http://127.0.0.1:${PA_HTTP_PORT}/" | tr -d '\r' | grep -i '^X-Personale-Artificiale-Site:' || true)"
APP_HEADER="$(curl -fsSI -H 'Host: app.personaleartificiale.it' "http://127.0.0.1:${PA_HTTP_PORT}/api/health" | tr -d '\r' | grep -i '^X-Personale-Artificiale-Site:' || true)"

if [[ "$PUBLIC_HEADER" != *"public"* ]]; then
  echo "Errore: Personale Artificiale non sta servendo il sito pubblico su 127.0.0.1:${PA_HTTP_PORT}. Header: $PUBLIC_HEADER"
  exit 1
fi

if [[ "$APP_HEADER" != *"app"* ]]; then
  echo "Errore: Personale Artificiale non sta servendo l'app su 127.0.0.1:${PA_HTTP_PORT}. Header: $APP_HEADER"
  exit 1
fi

docker compose ps
echo "Deploy completato: stack online su 127.0.0.1:${PA_HTTP_PORT}. Configura il reverse proxy pubblico per ${PUBLIC_URL} e ${APP_URL}."
