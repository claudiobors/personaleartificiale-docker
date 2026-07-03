#!/usr/bin/env bash
# Personale Artificiale — Deploy script per VPS
# Usa: bash scripts/deploy.sh
set -euo pipefail

REPO="https://github.com/claudiobors/personaleartificiale-docker.git"
DIR="/opt/personale-artificiale"

echo "🚀 Personale Artificiale — Deploy"

# Check prerequisites
for cmd in docker docker compose git; do
  if ! command -v $cmd &>/dev/null; then
    echo "❌ $cmd non trovato. Installa prima."
    exit 1
  fi
done

# Clone or pull
if [ -d "$DIR" ]; then
  echo "📦 Aggiorno repo..."
  cd "$DIR" && git pull
else
  echo "📦 Clono repo..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

# Check .env
if [ ! -f ".env" ]; then
  echo "⚠️  Crea il file .env da .env.example prima di continuare!"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

# Ensure SSL certs
SSL_DIR="./nginx/ssl"
if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
  echo "🔐 Genero certificato self-signed (placeholder)..."
  mkdir -p "$SSL_DIR"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/CN=personaleartificiale.it" 2>/dev/null || true
  echo "⚠️  Sostituisci con certificati Let's Encrypt per produzione!"
fi

# Pull latest images
echo "📥 Scarico immagini Docker..."
docker compose pull

# Build
echo "🔨 Build dei container..."
docker compose build --no-cache app

# Deploy
echo "🐳 Avvio stack..."
docker compose up -d

# Check
echo "✅ Stack avviato! Verifica:"
docker compose ps
echo ""
echo "🌐 Siti:"
echo "   https://www.personaleartificiale.it"
echo "   https://app.personaleartificiale.it"
echo ""
echo "📋 Log: docker compose logs -f"
