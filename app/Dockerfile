# Personale Artificiale — App Dashboard SPA
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
