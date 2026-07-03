# Personale Artificiale — Docker Stack

Infrastruttura completa Docker per Personale Artificiale.

## Prerequisiti

- Docker e Docker Compose v2
- Un VPS (Hetzner, Hostinger, DigitalOcean)
- Dominio: personaleartificiale.it + app.personaleartificiale.it
- API Keys: Stripe, OpenAI, Evolution API

## Setup rapido

```bash
# 1. Clona
git clone https://github.com/claudiobors/personaleartificiale-docker.git
cd personaleartificiale-docker

# 2. Configura
cp .env.example .env
nano .env   # Inserisci le tue API keys

# 3. Avvia
docker compose up -d

# 4. Controlla
docker compose logs -f
```

## Servizi

| Servizio | Porta | Ruolo |
|---|---|---|
| Nginx | 80/443 | Reverse proxy + HTTPS |
| App | 3000 | Dashboard, API, Agenti LangChain |
| PostgreSQL | 5432 | Database clienti |
| Redis | 6379 | Coda messaggi/pub-sub |
| Qdrant | 6333 | Vector DB per RAG |
| Evolution API | 8080 | Bridge WhatsApp |

## Comandi utili

```bash
# Log
docker compose logs -f app

# Backend PostgreSQL
docker compose exec postgres psql -U pa -d personale_artificiale

# Riavvia un servizio
docker compose restart app

# Backup database
docker compose exec postgres pg_dump -U pa personale_artificiale > backup.sql

# Aggiorna tutto
git pull
docker compose build --no-cache app
docker compose up -d
```
