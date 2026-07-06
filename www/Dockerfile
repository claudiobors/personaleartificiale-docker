# Personale Artificiale — www SSR server
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

COPY . .
RUN npm run build

# ─── Production server ───────────────────────────
FROM node:22-alpine

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.mjs ./

USER app
EXPOSE 3000

CMD ["node", "server.mjs"]