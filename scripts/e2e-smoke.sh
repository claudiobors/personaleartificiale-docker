#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://app.personaleartificiale.localhost:8081}"
PLAN_ID="${PLAN_ID:-assistente-esecutivo}"
EMAIL="${E2E_EMAIL:-test+$(date +%s)@personaleartificiale.localhost}"
PASSWORD="${E2E_PASSWORD:-Test12345!}"
NAME="${E2E_NAME:-Cliente Test}"
TMP_ROOT="${TMP_ROOT:-.tmp}"
mkdir -p "$TMP_ROOT"
TMP_DIR="$(mktemp -d "$TMP_ROOT/e2e-smoke.XXXXXX")"
COOKIE_JAR="$TMP_DIR/cookies.txt"
TOKEN=""
trap 'rm -rf "$TMP_DIR"' EXIT

json_file_get() {
  python -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))[sys.argv[2]])' "$1" "$2"
}

api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-fsS -X "$method" "$BASE_URL$path" -b "$COOKIE_JAR" -c "$COOKIE_JAR")
  if [[ -n "${TOKEN:-}" ]]; then args+=(-H "Authorization: Bearer $TOKEN"); fi
  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' --data "$body")
  fi
  curl "${args[@]}"
}

echo "== Health =="
api GET /api/health | tee "$TMP_DIR/health.json"
echo

echo "== Piani =="
api GET /api/plans | tee "$TMP_DIR/plans.json" >/dev/null
python -c '
import json,sys
payload=json.load(open(sys.argv[1], encoding="utf-8"))
plans=payload.get("plans", [])
print("\n".join("- {}: {}".format(p["id"], p["name"]) for p in plans))
assert plans, "nessun piano restituito"
' "$TMP_DIR/plans.json"

echo "== Registrazione test: $EMAIL =="
REGISTER_BODY=$(NAME="$NAME" EMAIL="$EMAIL" PASSWORD="$PASSWORD" python -c 'import json,os; print(json.dumps({"name":os.environ["NAME"],"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"],"termsAccepted":True}))')
api POST /api/auth/register "$REGISTER_BODY" | tee "$TMP_DIR/register.json" >/dev/null
TOKEN="$(json_file_get "$TMP_DIR/register.json" token)"
api GET /api/auth/me | tee "$TMP_DIR/me-pending.json" >/dev/null
python -c '
import json,sys
u=json.load(open(sys.argv[1], encoding="utf-8"))["user"]
print("utente={} status={} plan={}".format(u["email"], u["status"], u["planId"]))
' "$TMP_DIR/me-pending.json"

echo "== Checkout piano $PLAN_ID =="
CHECKOUT_BODY=$(PLAN_ID="$PLAN_ID" python -c 'import json,os; print(json.dumps({"planId":os.environ["PLAN_ID"]}))')
api POST /api/stripe/checkout "$CHECKOUT_BODY" | tee "$TMP_DIR/checkout.json" >/dev/null
CHECKOUT_URL="$(json_file_get "$TMP_DIR/checkout.json" url)"
echo "checkout_url=$CHECKOUT_URL"

if [[ "$CHECKOUT_URL" == *"checkout.stripe.com"* ]]; then
  echo "Stripe reale/test OK: checkout URL generata. Lo smoke si ferma prima del pagamento reale."
  exit 0
fi

# Dev/local bypass: il checkout ha attivato l'utente senza Stripe.
api GET /api/auth/me | tee "$TMP_DIR/me-active.json" >/dev/null
python -c '
import json,sys
u=json.load(open(sys.argv[1], encoding="utf-8"))["user"]
print("post-checkout status={} plan={}".format(u["status"], u["planId"]))
assert u["status"] == "active", "utente non active dopo checkout/bypass"
' "$TMP_DIR/me-active.json"

echo "== Onboarding completo =="
ONBOARDING_BODY=$(python -c 'import json
fields = {
  "companyName":"Azienda Smoke Test",
  "website":"https://example.com",
  "industry":"Servizi professionali",
  "vatNumber":"IT00000000000",
  "address":"Italia",
  "businessDescription":"Azienda di test che vende servizi ad alto valore e assistenza ai clienti.",
  "productsServices":"Consulenza, supporto clienti, preventivi e automazioni WhatsApp.",
  "targetAudience":"PMI, professionisti e studi che ricevono richieste ripetitive.",
  "competitors":"Soluzioni generiche non configurate sui dati aziendali.",
  "differentiators":"Configurazione su misura, knowledge base e tono coerente.",
  "commonQuestions":"Prezzi, tempi di attivazione, canali disponibili, dati necessari.",
  "policies":"Non promettere risultati garantiti. Escalare richieste sensibili.",
  "mainGoals":"Rispondere ai clienti, qualificare lead e proporre il passo successivo.",
  "forbiddenTopics":"Consulenza legale/fiscale vincolante, promesse non approvate.",
  "escalationRules":"Passare a una persona per reclami, pagamenti o richieste complesse.",
  "contactEmail":"assistenza@example.com",
  "contactPhone":"+390000000000",
  "openingHours":"Lun-Ven 9-18",
  "toneOfVoice":"Professionale, chiaro, utile e rassicurante",
  "preferredLanguage":"Italiano",
  "agentName":"Arianna",
  "roleDescription":"Assistente AI commerciale e operativo per clienti in ingresso."
}
print(json.dumps({"data": fields, "complete": True}))')
api PUT /api/onboarding "$ONBOARDING_BODY" | tee "$TMP_DIR/onboarding.json" >/dev/null
python -c '
import json,sys
p=json.load(open(sys.argv[1], encoding="utf-8"))
print("onboarding success={} complete={} rag={}".format(p.get("success"), p.get("complete"), p.get("rag")))
assert p.get("success") and p.get("complete")
' "$TMP_DIR/onboarding.json"

echo "== Dashboard stats =="
api GET /api/dashboard/stats

echo
echo "== WhatsApp status/provision =="
api GET /api/whatsapp/status | tee "$TMP_DIR/wa-status.json" >/dev/null
python -c '
import json,sys
s=json.load(open(sys.argv[1], encoding="utf-8"))["session"]
print("whatsapp status iniziale={} instance={}".format(s.get("status"), s.get("instanceName")))
' "$TMP_DIR/wa-status.json"
api POST /api/whatsapp/provision | tee "$TMP_DIR/wa-provision.json" >/dev/null
python -c '
import json,sys
s=json.load(open(sys.argv[1], encoding="utf-8"))["session"]
print("whatsapp status={} instance={} qr={} error={}".format(s.get("status"), s.get("instanceName"), "yes" if s.get("qrCode") else "no", s.get("lastError")))
assert s.get("status") in {"provisioned","qr_ready","connecting","connected","disconnected","error"}
' "$TMP_DIR/wa-provision.json"

echo "== E2E smoke completato =="
