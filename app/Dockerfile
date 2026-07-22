# Personale Artificiale — App Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

# Patch vinxi: add import condition to ./routes export (types-only in v0.5.x)
RUN node -e "const fs=require('fs'); const file='node_modules/vinxi/package.json'; const p=JSON.parse(fs.readFileSync(file,'utf8')); const routes=p.exports?.['./routes'] || {}; routes.import='./types/routes.d.ts'; p.exports['./routes']=routes; fs.writeFileSync(file, JSON.stringify(p,null,2));"

COPY . .
RUN npm run build && npm prune --omit=dev --legacy-peer-deps

# ─── Production image ────────────────────────────
FROM node:22-alpine

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/uploads /app/.run && \
    chown -R app:app /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server-v2.mjs ./
COPY --from=builder /app/runtime ./runtime

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server-v2.mjs"]
