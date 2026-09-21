// Catalogo dei connettori: unica fonte di verità per nome, descrizione, icona e stato,
// usata dal marketplace in dashboard (Integrations.tsx) e — in forma di semplice copia
// testuale — dalla vetrina sul sito pubblico (i due progetti sono build separate e non
// condividono moduli, quindi il sito ha una propria lista scritta a mano).
//
// Come aggiungere un connettore:
// 1. LIVE (funzionante subito): aggiungi una voce qui con status "live", implementa un
//    modulo dedicato (es. `nuovo-servizio.mjs`) con le funzioni status/connect/disconnect
//    seguendo lo schema di `google-calendar.mjs` o `telegram.mjs`, poi collega le sue rotte
//    in `api.mjs` e una card dedicata in `Integrations.tsx` (icona e id coerenti con qui).
// 2. IN ARRIVO (solo annuncio, nessun backend ancora): aggiungi una voce con status
//    "coming_soon" — comparirà da sola nella sezione "Presto disponibili" del marketplace,
//    nessun altro file da toccare.
export const CONNECTORS = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Agenda",
    tagline: "Propone orari liberi e crea appuntamenti solo dopo la tua conferma esplicita.",
    icon: "Calendar",
    kind: "oauth",
    countsTowardQuota: true,
    status: "live",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    tagline: "Legge le email in arrivo e prepara bozze di risposta, senza inviare nulla da solo.",
    icon: "Mail",
    kind: "oauth",
    countsTowardQuota: true,
    status: "live",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    category: "Documenti",
    tagline: "Cerca e legge file su richiesta; crea o modifica solo dopo un'anteprima confermata.",
    icon: "FolderOpen",
    kind: "oauth",
    countsTowardQuota: true,
    status: "live",
  },
  {
    id: "email_imap",
    name: "Un'altra casella email",
    category: "Email",
    tagline: "Libero, Virgilio, TIM, Yahoo, Outlook, Aruba o qualsiasi altro provider IMAP/SMTP.",
    icon: "Inbox",
    kind: "manual",
    countsTowardQuota: true,
    status: "live",
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "Canali",
    tagline: "Un canale in più verso lo stesso assistente, senza bisogno di un numero di telefono.",
    icon: "Send",
    kind: "token",
    countsTowardQuota: false,
    status: "live",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    category: "Documenti",
    tagline: "Usa un foglio come listino, orari o magazzino sempre aggiornato per l'assistente.",
    icon: "Sheet",
    kind: "oauth",
    countsTowardQuota: true,
    status: "coming_soon",
  },
  {
    id: "webhook",
    name: "Webhook personalizzato",
    category: "Automazioni",
    tagline: "Invia eventi (nuovo lead, nuovo messaggio) a Zapier, Make o un URL a tua scelta.",
    icon: "Webhook",
    kind: "manual",
    countsTowardQuota: true,
    status: "coming_soon",
  },
  {
    id: "fatturazione",
    name: "Fatturazione",
    category: "Amministrazione",
    tagline: "Crea preventivi e controlla lo stato delle fatture direttamente dalla chat.",
    icon: "Receipt",
    kind: "oauth",
    countsTowardQuota: true,
    status: "coming_soon",
  },
  {
    id: "notion",
    name: "Notion",
    category: "Documenti",
    tagline: "Legge e aggiorna pagine Notion come base di conoscenza viva per l'assistente.",
    icon: "NotebookText",
    kind: "oauth",
    countsTowardQuota: true,
    status: "coming_soon",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Canali",
    tagline: "Un altro canale per il team, oltre a WhatsApp e Telegram.",
    icon: "MessageSquare",
    kind: "oauth",
    countsTowardQuota: true,
    status: "coming_soon",
  },
  {
    id: "trello",
    name: "Trello",
    category: "Attività",
    tagline: "Crea e aggiorna schede su una bacheca condivisa a partire dai messaggi in chat.",
    icon: "KanbanSquare",
    kind: "oauth",
    countsTowardQuota: true,
    status: "coming_soon",
  },
];

export function publicConnectors() {
  return CONNECTORS;
}

export function getConnector(id) {
  return CONNECTORS.find((connector) => connector.id === id) ?? null;
}
