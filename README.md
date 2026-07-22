# Personale Artificiale — Docker Stack

Stack Docker per vendere, configurare e fornire assistenti AI ai clienti: sito pubblico, area app, registrazione, checkout Stripe, onboarding aziendale, knowledge base RAG, chatbot di test e persistenza su PostgreSQL/Qdrant. È pensato per convivere sulla stessa VM con altri siti, ad esempio `occhioesperto.it` su porta `3000`: Personale Artificiale espone solo `127.0.0.1:${PA_HTTP_PORT:-8081}`.

## Servizi

| Servizio | Ruolo |
|---|---|
| `nginx` | reverse proxy interno: `personaleartificiale.it` → sito pubblico, `app.personaleartificiale.it` → dashboard/API, pubblicato su loopback `127.0.0.1:${PA_HTTP_PORT:-8081}` |
| `www` | sito vetrina SSR |
| `app` | dashboard, API, auth, Stripe, onboarding, RAG e test assistente |
| `postgres` | utenti, sessioni, configurazioni, messaggi e webhook Stripe |
| `redis` | cache/coda per servizi collegati |
| `qdrant` | vector DB per knowledge base |
| `evolution` | bridge WhatsApp Evolution API |

## Setup rapido VPS

```bash
git clone https://github.com/claudiobors/personaleartificiale-docker.git
cd personaleartificiale-docker
cp .env.example .env
nano .env   # sostituisci tutti i placeholder

docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Di default lo stack **non occupa la porta 3000 dell'host** e **non occupa direttamente 80/443**: Nginx viene pubblicato su `127.0.0.1:8081`. Questo evita collisioni con `occhioesperto.it` se gira su `3000` o con un reverse proxy VPS centrale.

Poi configura DNS:

- `personaleartificiale.it` e `www.personaleartificiale.it` verso l'IP del VPS;
- `app.personaleartificiale.it` verso lo stesso IP.

La configurazione inclusa espone HTTP solo su loopback (`127.0.0.1:${PA_HTTP_PORT:-8081}`). Per HTTPS usa Cloudflare/Load Balancer o un reverse proxy VPS centrale che ascolta su 80/443 e inoltra ai servizi locali.

Esempio Nginx host per più siti sulla stessa VM:

```nginx
server {
  listen 80;
  server_name occhioesperto.it www.occhioesperto.it;
  location / { proxy_pass http://127.0.0.1:3000; }
}

server {
  listen 80;
  server_name personaleartificiale.it www.personaleartificiale.it app.personaleartificiale.it;
  location / { proxy_pass http://127.0.0.1:8081; }
}
```

## Variabili indispensabili

- `POSTGRES_PASSWORD`, `JWT_SECRET`: valori casuali lunghi.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`: checkout e abbonamenti.
- `OPENAI_API_KEY`: embeddings + risposte AI. Se manca, il chatbot non va in crash: risponde con fallback locale sulle fonti disponibili.
- `EVOLUTION_API_KEY`: bridge WhatsApp.
- `PA_HTTP_PORT`: porta locale loopback per Personale Artificiale, default `8081`; non usare `3000` se `occhioesperto.it` la usa già.

## Flusso business coperto

1. Registrazione utente con password sicura e accettazione termini.
2. Scelta piano e checkout Stripe.
3. Conferma checkout/webhook e attivazione account.
4. Onboarding aziendale con bozza salvabile e completamento validato.
5. Upload documenti PDF/DOCX/TXT/MD con validazione dimensione, estensione, MIME e firma file.
6. Indicizzazione Qdrant per tenant/utente.
7. Test assistente dalla dashboard con salvataggio messaggi in `agent_messages`.
8. Provisioning WhatsApp Evolution, QR, webhook autenticato e risposta automatica usando profilo + knowledge base.
9. Portale Stripe per gestione fatturazione.

## Comandi operativi

```bash
# Log applicazione
docker compose logs -f app

# Controllo API health
docker compose exec app wget -qO- http://localhost:3000/api/health

# Shell PostgreSQL
docker compose exec postgres psql -U pa -d personale_artificiale

# Backup database + uploads
bash scripts/backup.sh

# Deploy/aggiornamento controllato
bash scripts/deploy.sh
```

## Verifiche locali

```bash
cd app
npm run verify   # typecheck + build

cd ../www
npm run build

cd ..
docker compose config --quiet
docker compose build app www nginx postgres redis qdrant
```

Verifica routing locale senza occupare la 3000:

```bash
curl -fsSI -H 'Host: personaleartificiale.it' http://127.0.0.1:${PA_HTTP_PORT:-8081}/
curl -fsSI -H 'Host: app.personaleartificiale.it' http://127.0.0.1:${PA_HTTP_PORT:-8081}/api/health
```

## Note sicurezza e privacy

- Non committare mai `.env`, certificati privati o backup.
- Sessioni utente: cookie `HttpOnly`, `SameSite=Lax`, `Secure` in produzione; token hashati in PostgreSQL.
- API: rate limit su login/register e limite generale; richieste browser con `Origin` non autorizzata rifiutate.
- Gli upload sono isolati per user ID sotto il volume `app-uploads` e validati per dimensione, estensione, MIME e firma reale PDF/DOCX.
- Le query DB runtime usano parametri PostgreSQL.
- GDPR/diritti interessato: dalla dashboard il cliente può esportare i propri dati o eliminare account, sessioni, profilo, messaggi, file e vettori Qdrant best-effort.
- Il chatbot riceve istruzioni anti-hallucination: usa solo contesto aziendale e passa a un umano quando non ha fonti.
- Log: non inserire payload cliente, token, password, API key o documenti nei log applicativi.
