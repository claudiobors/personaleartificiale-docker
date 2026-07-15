# Personale Artificiale — App Dashboard SPA
FROM node:22-alpine

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/uploads /app/.run && \
    chown -R app:app /app

COPY package.json ./
COPY server.mjs ./
COPY dist ./dist

USER app
EXPOSE 3000

CMD ["node", "server.mjs"]