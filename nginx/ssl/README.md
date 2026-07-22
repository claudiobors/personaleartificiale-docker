# Certificati TLS

La configurazione Nginx del container espone HTTP solo su loopback host (`127.0.0.1:${PA_HTTP_PORT:-8081}`) ed è pensata per convivere con altri siti sulla stessa VM, ad esempio `occhioesperto.it` su porta 3000. Usa Cloudflare, un load balancer o un reverse proxy VPS centrale su 80/443 per terminare HTTPS e inoltrare a questa porta locale.

Per HTTPS direttamente nel container:
1. monta certificato e chiave in questa cartella;
2. aggiungi un blocco `listen 443 ssl;` in `nginx/conf.d/personaleartificiale.conf`;
3. riattiva il mapping `443:443` in `docker-compose.yml`.

Non committare mai chiavi private reali.
