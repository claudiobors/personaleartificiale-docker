#!/usr/bin/env bash
# Production build & start for Node.js (Hostinger).
set -euo pipefail
cd "$(dirname "$0")"

echo "→ Installing dependencies..."
npm install --omit=dev

echo "→ Building..."
npm run build

echo "→ Starting server on port ${PORT:-3000}..."
exec node server.mjs
