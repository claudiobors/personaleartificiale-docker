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
| `speech` | trascrizione vocale locale (faster-whisper) e sintesi vocale (edge-tts), nessun servizio esterno a pagamento |
| `office` | genera/legge documenti Excel, PowerPoint, Word e PDF (openpyxl, python-pptx, python-docx, reportlab, pdfplumber) |

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
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`: risposte AI via OpenRouter. `OPENROUTER_EMBEDDING_MODEL` gestisce gli embeddings RAG se supportato dal provider/modello scelto. Se manca la chiave, il chatbot non va in crash: risponde con fallback locale sulle fonti disponibili.
- `EVOLUTION_API_KEY`: bridge WhatsApp.
- `PA_HTTP_PORT`: porta locale loopback per Personale Artificiale, default `8081`; non usare `3000` se `occhioesperto.it` la usa già.
- `INTEGRATIONS_ENCRYPTION_KEY`: obbligatoria per usare le integrazioni Google Calendar/email (cifra le credenziali salvate per cliente).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: opzionali, richieste solo per abilitare il collegamento a Google Calendar, Gmail e Google Drive (vedi `.env.example` per come crearle).
- Portale clienti Stripe: se vuoi che i cambi di piano dal portale (upgrade/downgrade Assistente Digitale ↔ Ufficio Digitale) aggiornino le quote integrazioni/numeri, la configurazione del portale in Stripe Dashboard deve includere entrambi i Price come piani tra cui il cliente può passare ("Update subscription"). Il cambio di ciclo di fatturazione (1/3/6/12 mesi) invece non è self-service dal portale in questa versione: va gestito manualmente lato Stripe se un cliente lo richiede.

## Flusso business coperto

Il bot è un **dipendente artificiale personale**: risponde solo al titolare dell'account e ai numeri WhatsApp che lui stesso autorizza. Non è un canale di assistenza per i clienti esterni dell'azienda.

1. Registrazione utente con password sicura e accettazione termini — il sito pubblico (`www`) porta direttamente qui, con CTA "Registrati" al posto di una semplice richiesta info via email.
2. Scelta piano (**Assistente Digitale** 78,90€/mese o **Ufficio Digitale** 148,90€/mese, nessun costo di attivazione) e ciclo di fatturazione (mensile, oppure 3/6/12 mesi pagati in anticipo con sconto 5/10/15%), poi checkout Stripe. Il piano **Su misura** non passa da Stripe: l'utente si registra e lascia una richiesta di preventivo dalla dashboard (tabella `custom_quote_requests`, notifica email interna), viene poi ricontattato manualmente.
3. Conferma checkout/webhook e attivazione account.
4. Onboarding aziendale con bozza salvabile e completamento validato.
5. Upload documenti PDF/DOCX/TXT/MD/immagini con validazione dimensione, estensione, MIME e firma file; le immagini vengono lette con un modello vision e poi eliminate (non restano mai salvate).
6. Indicizzazione Qdrant per tenant/utente.
7. Test assistente dalla dashboard con salvataggio messaggi in `agent_messages`; l'assistente conosce anche token residui, piano e stato abbonamento dell'account.
8. **Provisioning WhatsApp Evolution — un'istanza per account**: ogni cliente collega il proprio numero WhatsApp dalla propria dashboard, scansionando un QR generato al momento (`app/runtime/evolution.mjs`, un'istanza Evolution per `user_id`). Il numero effettivamente connesso viene letto da Evolution stessa dopo la scansione (mai chiesto o digitato dal cliente) e salvato come riferimento, sia per mostrarlo in dashboard sia per riconoscere la chat WhatsApp "Messaggi a te stesso" su quel numero come una richiesta all'assistente, invece di ignorarla come un normale messaggio "in uscita" (un identificatore di messaggio inviato dal bot viene tenuto a mente per pochi minuti per escludere l'eco della propria risposta in quella stessa chat ed evitare cicli infiniti). Ogni altro messaggio scritto manualmente dal titolare in una chat con terzi resta ignorato, per non intromettersi in conversazioni personali. Oltre al proprio numero, il titolare può autorizzare altri **numeri WhatsApp** (socio, familiare, collega) a scrivere al bot, con una verifica di proprietà tramite codice inviato via WhatsApp sul numero appena aggiunto (piano Assistente Digitale: 1 numero autorizzato incluso; piano Ufficio Digitale: 2 inclusi; extra a 5€/mese ciascuno). Il pannello admin mostra solo una panoramica di stato per assistenza (connesso/non connesso, per account), mai il QR o i messaggi di un cliente.
9. Portale Stripe per gestione fatturazione.
10. **Marketplace integrazioni** (dashboard → Integrazioni): il cliente sceglie e attiva quelle che vuole nel limite degli slot del piano.
    - Google Calendar (OAuth): propone orari liberi via WhatsApp e crea l'evento solo dopo conferma esplicita — mai una prenotazione autonoma.
    - Gmail (OAuth diretto, senza password): legge le email in arrivo e prepara bozze di risposta via Gmail API.
    - Qualsiasi altra casella email (IMAP/SMTP): preset pronti per Gmail (manuale), Outlook, Aruba, Libero, Virgilio, TIM/Alice, Yahoo, oltre a configurazione manuale; il provider viene anche rilevato automaticamente dal dominio dell'indirizzo digitato.
    - In entrambi i casi email, il titolare rivede e invia le bozze dalla dashboard: l'assistente non invia mai email in autonomia.
    - Google Drive (OAuth): l'assistente può cercare e leggere file su richiesta via WhatsApp senza bisogno di conferma (operazioni di sola lettura); per creare un nuovo file o aggiungere testo a uno esistente invia sempre un'anteprima e agisce solo dopo una conferma esplicita del titolare.
11. **Quote integrazioni**: piano Assistente Digitale 1 integrazione inclusa (qualunque tra Calendar/Gmail/Drive/altra email/Telegram), piano Ufficio Digitale 3 incluse; extra a 9€/mese ciascuna. Se un account passa a un piano con quote più basse mentre ha più risorse attive di quante ne includa il nuovo piano, l'eccedenza viene fatturata automaticamente come extra dal webhook Stripe.
12. **Accesso a internet** (dashboard → Assistente, disattivato di default): se attivato, l'assistente può integrare la knowledge base con ricerche web in tempo reale (via plugin web di OpenRouter) — il titolare può anche descrivere limiti in linguaggio naturale (es. "solo orari ed eventi pubblici, mai concorrenti") rispettati dal prompt. Le fonti web citate vengono riportate in fondo alla risposta.
13. **Messaggi vocali WhatsApp**: i messaggi vocali in arrivo vengono trascritti in locale (faster-whisper, modello `small`, quantizzazione int8, italiano — nessun servizio esterno) e trattati come testo normale in tutta la pipeline (RAG, prenotazioni, Drive). L'assistente risponde con una nota vocale (edge-tts, voce `it-IT-IsabellaNeural`) solo se il cliente lo chiede esplicitamente nel messaggio (es. "rispondimi con un audio"); se sintesi o invio falliscono, la risposta arriva comunque in testo. Messaggi di errore, avvisi di sistema e il messaggio di ricarica crediti non vengono mai convertiti in audio.
14. **Modulo Coach obiettivi** (via WhatsApp): intervista adattiva a 3 fasi ispirata al metodo MCII (mental contrasting + implementation intentions) — fase 1 desiderio/motivazione, fase 2 risultato immaginato/ostacolo personale + reality check matematico sulla scadenza (ritmo richiesto vs sostenibile, con proposta di aggiustamento se irrealistico), fase 3 process goal + piano "se-allora". Ogni obiettivo attivo viene ricontattato periodicamente (di default ogni 7 giorni, alla prossima interazione dell'utente — non esiste ancora uno scheduler che scrive per primo) per una review, e ogni tappa (creazione, review, completamento, abbandono) viene registrata in un documento Google Drive permanente ("Assistente - Storico Obiettivi") con tono da diario personale, che collega automaticamente le voci passate correlate per tema quando pertinente. La scrittura su questo documento è automatica, senza richiesta di conferma (a differenza delle altre scritture Drive generiche, che restano sempre approvate esplicitamente).
15. **Modulo Triage Backlog** (via WhatsApp): il "backlog" sono le bozze di risposta email già preparate automaticamente (Gmail o altra casella) e non ancora gestite dal titolare. Se superano una soglia (di default 15) l'assistente propone spontaneamente di riordinarle, oppure il titolare può chiederlo esplicitamente; le raggruppa per tema via LLM (non un elenco tecnico) e suggerisce un'azione per gruppo (rispondere, inviare così come sono, delegare, scartare). Per delegare, l'assistente verifica l'indirizzo email reale della persona cercando nella cronologia Gmail effettiva (mai un indirizzo inventato) prima di inoltrare; la delega via email funziona oggi solo per l'account Gmail collegato. Ogni sessione chiusa viene registrata in un documento Google Drive permanente ("Assistente - Storia dei Triage") in formato narrativo, scritto automaticamente senza richiesta di conferma.
16. **Modulo Travel Planner** (via WhatsApp): intervista adattiva su partenza/destinazione/date/viaggiatori, poi propone un link Google Flights precompilato (query testuale stabile, non il blob `tfs` non documentato e fragile), un link di ricerca hotel su TripAdvisor e un link Google Maps della destinazione — nessuna chiave API richiesta. Calcola un buffer di trasferimento aeroportuale consigliato in base ad area Schengen/extra-Schengen e dimensione dell'aeroporto (stima di buon senso, non un dato verificabile via API). Su conferma crea promemoria di massima in Google Calendar; quando il cliente invia una foto/screenshot della conferma di prenotazione, l'assistente estrae i dettagli reali via modello vision, aggiorna gli eventi calendario con gli orari veri, genera un recap pratico (documento, valuta, prese elettriche, fuso orario) e registra il viaggio in un documento Google Drive permanente ("Assistente - I tuoi viaggi") in formato narrativo, scritto automaticamente. Nota: la ricerca prezzi voli/hotel in tempo reale nella chat non è inclusa — richiederebbe rispettivamente un sidecar Python per la libreria `fli` (il cui meccanismo di deep-link è risultato non verificato/fragile) e un piano RapidAPI a pagamento per Xotelo (l'unico endpoint gratuito richiede un identificativo hotel che si ottiene solo tramite un endpoint di ricerca a pagamento).
17. **Motore di function-calling** (`app/runtime/skills.mjs`): oltre ai moduli sopra (attivati da parole chiave), l'assistente può richiamare "skill" via function-calling nativo di OpenRouter durante una normale conversazione. Ogni skill che scrive/crea qualcosa mostra sempre un'anteprima e aspetta una conferma esplicita prima di eseguire (stesso principio delle altre scritture); le skill di sola lettura eseguono subito. Ogni skill può dichiarare `requiresIntegration` (es. `google_drive`): il motore la nasconde automaticamente al modello per gli utenti che non hanno quel connettore attivo, così un nuovo connettore aggiunto in futuro resta invisibile finché il cliente non lo collega, senza logica su misura. Skill già disponibili:
    - Office (`office-skills.mjs`): `crea_excel` (mai dati inventati nelle celle, chiede se mancano informazioni), `leggi_excel`, `crea_presentazione`, `crea_documento_word`, `crea_pdf`, `estrai_testo_pdf` — i file generati vengono salvati in una cartella Drive auto-creata ("Assistente - File Generati") e inviati anche come documento WhatsApp, tramite il servizio `office` (openpyxl/python-pptx/python-docx/reportlab/pdfplumber).
    - Google Drive (`drive-skills.mjs`, richiede il connettore Drive): `drive_cerca_file` e `drive_leggi_file` (sola lettura, eseguono subito), `drive_crea_file` e `drive_aggiungi_testo` (creano/modificano solo dopo conferma esplicita).
    - Google Calendar (`calendar-skills.mjs`, richiede il connettore Calendar): `calendario_orari_disponibili` (sola lettura) e `calendario_crea_appuntamento` (crea l'evento solo dopo aver verificato che l'orario sia davvero libero e dopo conferma esplicita) — complementare al flusso a parole chiave di `booking.mjs`, che resta la via preferita per "trovami un orario libero e fammi scegliere dalla lista".
    - Gmail (`gmail-skills.mjs`): `gmail_cerca_contatto` (richiede il connettore Gmail, non inventa mai un indirizzo: cerca solo nella cronologia reale) e `email_bozze_in_sospeso` (nessun connettore specifico richiesto, riassume le bozze già preparate in attesa di revisione dal titolare).
18. **Modulo Recap Video** (via WhatsApp): riconosce link YouTube/Vimeo/TikTok/Facebook oppure un file video inviato direttamente in chat, poi chiede sempre prima le preferenze (pattern intake-first): lunghezza del recap (veloce/medio/completo), obiettivo (farsi un'idea/decidere se guardarlo/studiarlo), dove riceverlo (qui in chat o come documento Drive) ed eventuale mini-recap audio. La trascrizione usa prima i sottotitoli reali del video (via `yt-dlp`, integrato nel servizio `speech`); se non disponibili, ripiega sulla trascrizione Whisper locale già usata per i vocali. Per i file video inviati in chat la trascrizione passa direttamente per Whisper. L'output "documento Drive" chiede comunque conferma prima di essere salvato in una cartella auto-creata ("Assistente - Recap Video"); l'output in chat invece arriva subito, coerente con come rispondono già gli altri moduli.
19. **Skill di generazione immagini** (`genera_immagine`, via function-calling): genera un'immagine da una descrizione testuale con Cloudflare Workers AI (piano gratuito, 10.000 neuroni/giorno) — FLUX.1-schnell per il formato quadrato, Stable Diffusion XL per orizzontale/verticale (le due famiglie di modelli hanno formati di risposta diversi, gestiti separatamente nel codice). Come le altre skill che creano qualcosa, mostra sempre un'anteprima e aspetta conferma prima di generare; il risultato viene inviato come immagine su WhatsApp e salvato nella stessa cartella Drive auto-creata delle skill Office ("Assistente - File Generati").
20. **Canale Telegram** (`app/runtime/telegram.mjs`, dashboard → Integrazioni): un canale aggiuntivo verso lo stesso assistente, senza bisogno di un numero di telefono. Il cliente crea gratuitamente un proprio bot su Telegram parlando con `@BotFather` (comando `/newbot`) e incolla il token ottenuto in dashboard; il token viene validato (`getMe`) e salvato cifrato come le altre credenziali di integrazioni terze. Registriamo un webhook Telegram con un `secret_token` generato da noi, verificato ad ogni chiamata in arrivo (header `X-Telegram-Bot-Api-Secret-Token`) — nessuno può spacciarsi per Telegram anche conoscendo l'URL del webhook. Come per i numeri WhatsApp, nessuna chat è autorizzata di default: un codice a 6 cifre generato in dashboard va rimandato al bot in chat privata per rivendicarlo (la prima volta si diventa il titolare, le volte successive si autorizza chiunque altro). Le chat autorizzate passano dalla stessa pipeline di risposta (RAG + skill via function-calling) di WhatsApp; i moduli specifici via parola chiave (Coach, Triage, Travel Planner, recap video, trascrizione vocale) restano per ora solo su WhatsApp, così come la consegna diretta in chat dei file generati dalle skill Office/immagini (quei file arrivano comunque su Google Drive se collegato). Un solo bot per account in questa prima versione.
21. **Tunnel sito → app e pagina garanzie**: le card piano e gli header del sito pubblico (`www`) linkano direttamente a `app.personaleartificiale.it/?plan=<id>` invece di un `mailto:`, con piano e ciclo di fatturazione preselezionati al primo accesso a `PlansView`. La pagina pubblica `/garanzie` e i `Termini di servizio` aggiornati coprono in modo esplicito: nessun costo di attivazione, natura sperimentale/in evoluzione del sistema, limiti di garanzia sul rischio di sospensione WhatsApp (mitigazioni adottate, nessuna garanzia assoluta su decisioni di terze parti), continuità del servizio "best effort" e diritto di recesso.

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
- Sessioni utente: cookie `HttpOnly`, `SameSite=Lax`, `Secure` in produzione; token hashati in PostgreSQL (sha256), mai salvati in chiaro.
- Password: scrypt con costo N=2^17 (parametro incorporato nell'hash salvato, così le password già registrate con il costo precedente restano valide). Cambio password autenticato e recupero via codice email disattivano tutte le altre sessioni attive.
- `JWT_SECRET` e `INTEGRATIONS_ENCRYPTION_KEY` sono obbligatorie in produzione (`NODE_ENV=production`, sempre vero anche in locale con questo `docker-compose.yml`): l'avvio si blocca se `JWT_SECRET` manca o è troppo corta, ed emette un avviso se manca `INTEGRATIONS_ENCRYPTION_KEY` (le integrazioni restano solo disattivate, non è un errore bloccante). Nessuna delle due usa più un valore fisso di riserva scritto nel codice.
- API: rate limit su login/register/recupero password e limite generale, basato sull'IP reale del client (mai un header che il client stesso può falsificare); richieste browser con `Origin` non autorizzata rifiutate.
- Numeri WhatsApp autorizzati: un numero appena aggiunto resta "in attesa" finché non si conferma un codice ricevuto via WhatsApp su quel numero — impedisce di registrare (e far rispondere l'assistente a) un numero che non si controlla davvero.
- L'apikey del webhook Evolution e il `secret_token` del webhook Telegram sono confrontati a tempo costante (mai una `!==` diretta su una stringa segreta); il token del bot Telegram è cifrato allo stesso modo dei token OAuth/password IMAP.
- Gli upload sono isolati per user ID sotto il volume `app-uploads` e validati per dimensione, estensione, MIME e firma reale PDF/DOCX.
- La connessione IMAP/SMTP di "Qualsiasi altra casella email" rifiuta host che risolvono a indirizzi di rete privati/locali (incluso il metadata endpoint cloud), per impedire che il server venga usato per raggiungere servizi interni.
- Le query DB runtime usano parametri PostgreSQL.
- GDPR/diritti interessato: dalla dashboard il cliente può esportare i propri dati (tutte le tabelle collegate al proprio account, mai segreti/token cifrati) o eliminare account, sessioni, profilo, messaggi, file e vettori Qdrant; l'eliminazione annulla anche l'abbonamento Stripe (e gli eventuali extra attivi), così da non continuare ad addebitare un account già cancellato.
- Il chatbot riceve istruzioni anti-hallucination: usa solo contesto aziendale e passa a un umano quando non ha fonti.
- Log: non inserire payload cliente, token, password, API key o documenti nei log applicativi.
