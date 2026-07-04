#!/usr/bin/env bash
# Deploy coerente di sito pubblico, app e reverse proxy.
set -euo pipefail

REPO="https://github.com/claudiobors/personaleartificiale-docker.git"
DIR="/opt/personale-artificiale"

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
  echo "Manca $DIR/.env. Crealo prima del deploy."
  exit 1
fi

SSL_DIR="./nginx/ssl"
if [ ! -s "$SSL_DIR/fullchain.pem" ] || [ ! -s "$SSL_DIR/privkey.pem" ]; then
  echo "Mancano certificati TLS validi in $SSL_DIR."
  echo "Installa un certificato reale per personaleartificiale.it, www e app prima del deploy."
  exit 1
fi

echo "Valido la configurazione Docker Compose..."
docker compose config --quiet

echo "Ricostruisco separatamente sito pubblico e app..."
docker compose build --no-cache --pull www app

echo "Ricreo i due frontend e Nginx per evitare container o proxy obsoleti..."
docker compose up -d --force-recreate www app nginx

echo "Controllo la configurazione Nginx..."
docker compose exec -T nginx nginx -t

echo "Controllo i due domini..."
PUBLIC_HEADER="$(curl -ksSI https://personaleartificiale.it | tr -d '\r' | grep -i '^X-Personale-Artificiale-Site:' || true)"
APP_HEADER="$(curl -ksSI https://app.personaleartificiale.it | tr -d '\r' | grep -i '^X-Personale-Artificiale-Site:' || true)"

if [[ "$PUBLIC_HEADER" != *"public"* ]]; then
  echo "Errore: personaleartificiale.it non sta servendo il sito pubblico."
  exit 1
fi

if [[ "$APP_HEADER" != *"app"* ]]; then
  echo "Errore: app.personaleartificiale.it non sta servendo l'app."
  exit 1
fi

docker compose ps
echo "Deploy completato: domini e container sono associati correttamente."
