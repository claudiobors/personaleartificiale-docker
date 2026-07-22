# Personale Artificiale — www static server
FROM node:22-alpine

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY package.json ./
COPY server.mjs ./
COPY dist ./dist

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.mjs"]