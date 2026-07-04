# Personale Artificiale — www static build
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

COPY . .
RUN npm run build

# ─── Copia static files con permessi corretti ────
FROM alpine:latest
COPY --from=builder /app/dist/client /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R 101:101 /usr/share/nginx/html
CMD ["true"]
