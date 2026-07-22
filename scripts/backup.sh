#!/usr/bin/env bash
# Backup database PostgreSQL e volume uploads.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/personale-artificiale}"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-')
UPLOAD_VOLUME="${PROJECT_NAME}_app-uploads"

echo "📦 Backup database..."
docker compose exec -T postgres pg_dump -U pa personale_artificiale \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

echo "📦 Backup uploads ($UPLOAD_VOLUME)..."
docker run --rm \
  -v "$UPLOAD_VOLUME:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.20 \
  tar czf "/backup/uploads_$DATE.tar.gz" -C /data .

echo "✅ Backup completato: $BACKUP_DIR"
echo "   db_$DATE.sql.gz"
echo "   uploads_$DATE.tar.gz"

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +7 -delete
