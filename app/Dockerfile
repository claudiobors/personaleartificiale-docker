# Personale Artificiale — App Dashboard/API
# Build completamente autonoma: Vite e dipendenze vengono compilati dentro Docker.
FROM node:22-alpine AS builder

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/uploads /app/.run && \
    chown -R app:app /app

COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/server-v2.mjs ./server-v2.mjs
COPY --from=builder --chown=app:app /app/runtime ./runtime

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server-v2.mjs"]
