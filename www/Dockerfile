# Personale Artificiale — www SSR server
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

# Patch vinxi: add import condition to ./routes export
RUN cat node_modules/vinxi/package.json | node -e "
const j = require('fs').readFileSync('/dev/stdin','utf-8');
const p = JSON.parse(j);
const routes = p.exports?.['./routes'] || {};
routes.import = './types/routes.d.ts';
p.exports['./routes'] = routes;
require('fs').writeFileSync('node_modules/vinxi/package.json', JSON.stringify(p, null, 2));
"

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