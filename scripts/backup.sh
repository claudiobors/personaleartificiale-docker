#!/usr/bin/env bash
# Backup database
set -euo pipefail

BACKUP_DIR="/opt/backups/personale-artificiale"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

echo "📦 Backup database..."
docker compose exec -T postgres pg_dump -U pa personale_artificiale \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

echo "📦 Backup uploads..."
tar czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C ./app/uploads . 2>/dev/null || true

echo "✅ Backup completato: $BACKUP_DIR"
echo "   db_$DATE.sql.gz"
echo "   uploads_$DATE.tar.gz"

# Keep last 7 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +7 -delete
