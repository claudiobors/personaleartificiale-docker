# Personale Artificiale — www static build
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

COPY . .
RUN npm run build

# ─── Copia static files nella cartella del volume ─
FROM alpine:latest
COPY --from=builder /app/dist/client /usr/share/nginx/html
CMD ["true"]
