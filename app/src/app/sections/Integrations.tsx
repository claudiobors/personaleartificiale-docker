import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FolderOpen,
  Inbox,
  KanbanSquare,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  NotebookText,
  Plug,
  Plus,
  PowerOff,
  Receipt,
  RefreshCw,
  Send,
  Sheet,
  Trash2,
  Unplug,
  Webhook,
} from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { CalendarStatus, Connector, DriveStatus, EmailStatus, Quota, TelegramAuthorization, TelegramStatus } from "../types";

const CONNECTOR_ICONS: Record<string, typeof Plug> = {
  Calendar, Mail, FolderOpen, Inbox, Send, Sheet, Webhook, Receipt, NotebookText, MessageSquare, KanbanSquare,
};

interface EmailPreset {
  label: string;
  domains: string[];
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  note?: string;
}

const EMAIL_PRESETS: Record<string, EmailPreset> = {
  outlook: {
    label: "Outlook / Microsoft 365",
    domains: ["outlook.com", "outlook.it", "hotmail.com", "hotmail.it", "live.com", "live.it"],
    imapHost: "outlook.office365.com", imapPort: 993, imapSecure: true,
    smtpHost: "smtp.office365.com", smtpPort: 587, smtpSecure: false,
  },
  aruba: {
    label: "Aruba",
    domains: ["aruba.it", "pec.it"],
    imapHost: "imaps.aruba.it", imapPort: 993, imapSecure: true,
    smtpHost: "smtps.aruba.it", smtpPort: 465, smtpSecure: true,
  },
  libero: {
    label: "Libero",
    domains: ["libero.it"],
    imapHost: "imapmail.libero.it", imapPort: 993, imapSecure: true,
    smtpHost: "smtp.libero.it", smtpPort: 465, smtpSecure: true,
  },
  virgilio: {
    label: "Virgilio",
    domains: ["virgilio.it"],
    imapHost: "in.virgilio.it", imapPort: 993, imapSecure: true,
    smtpHost: "out.virgilio.it", smtpPort: 465, smtpSecure: true,
  },
  tim: {
    label: "TIM / Alice",
    domains: ["tim.it", "alice.it", "tin.it"],
    imapHost: "in.alice.it", imapPort: 143, imapSecure: false,
    smtpHost: "out.alice.it", smtpPort: 587, smtpSecure: false,
  },
  yahoo: {
    label: "Yahoo",
    domains: ["yahoo.com", "yahoo.it"],
    imapHost: "imap.mail.yahoo.com", imapPort: 993, imapSecure: true,
    smtpHost: "smtp.mail.yahoo.com", smtpPort: 465, smtpSecure: true,
  },
  custom: {
    label: "Altro (configurazione manuale)",
    domains: [],
    imapHost: "", imapPort: 993, imapSecure: true,
    smtpHost: "", smtpPort: 465, smtpSecure: true,
  },
};

function detectPresetFromEmail(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;
  const match = Object.entries(EMAIL_PRESETS).find(([, preset]) => preset.domains.includes(domain));
  return match ? match[0] : null;
}

export function Integrations() {
  const [callbackNotice, setCallbackNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [buyingAddon, setBuyingAddon] = useState(false);
  const [addonError, setAddonError] = useState("");
  const [catalog, setCatalog] = useState<Connector[]>([]);

  const loadQuota = async () => {
    try {
      const result = await backend.integrationQuota();
      setQuota(result.quota);
    } catch {
      setQuota(null);
    }
  };

  useEffect(() => {
    backend.integrationsCatalog().then((result) => setCatalog(result.connectors)).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const integration = params.get("integration");
    if (integration === "google" || integration === "gmail" || integration === "drive") {
      const status = params.get("status");
      const label = integration === "google" ? "Google Calendar" : integration === "gmail" ? "Gmail" : "Google Drive";
      setCallbackNotice(
        status === "connected"
          ? { ok: true, message: `${label} collegato correttamente.` }
          : { ok: false, message: params.get("message") || `Collegamento ${label} non riuscito.` },
      );
      window.history.replaceState({}, document.title, "/dashboard");
    } else if (params.get("addon") === "extra_integration" && params.get("status") === "success") {
      setCallbackNotice({ ok: true, message: "Slot integrazione extra attivato. Potrebbero volerci alcuni secondi prima che risulti disponibile." });
      window.history.replaceState({}, document.title, "/dashboard");
    }
  }, []);

  useEffect(() => { void loadQuota(); }, []);

  const buyExtraSlot = async () => {
    setBuyingAddon(true);
    setAddonError("");
    try {
      const result = await backend.addonCheckout("extra_integration");
      window.location.assign(result.url);
    } catch (cause) {
      setAddonError(cause instanceof Error ? cause.message : "Impossibile avviare il pagamento.");
      setBuyingAddon(false);
    }
  };

  const atLimit = quota ? quota.used >= quota.total : false;
  const liveConnectors = catalog.filter((connector) => connector.status === "live");
  const comingSoonConnectors = catalog.filter((connector) => connector.status === "coming_soon");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Connettori"
        description="Scegli, attiva e configura i connettori che vuoi usare, nel limite degli slot inclusi nel tuo piano. Telegram è un canale sempre incluso e non consuma slot."
      />
      {callbackNotice && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${
            callbackNotice.ok ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-red-400/25 bg-red-500/10 text-red-200"
          }`}
        >
          {callbackNotice.message}
        </div>
      )}

      {quota && (
        <div className="pa-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Slot usati</p>
              <p className="mt-1 text-lg font-black">{quota.used} / {quota.total} <span className="text-xs font-bold text-zinc-500">({quota.included} inclusi nel piano{quota.extra ? ` + ${quota.extra} extra` : ""})</span></p>
            </div>
            <button onClick={() => void buyExtraSlot()} disabled={buyingAddon} className="pa-button flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
              {buyingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Acquista slot connettore extra (9€/mese)
            </button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${quota.total ? Math.min(100, (quota.used / quota.total) * 100) : 0}%` }} />
          </div>
          {addonError && <p className="mt-3 text-sm text-red-300">{addonError}</p>}
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-black uppercase tracking-widest text-zinc-500">Marketplace connettori</p>
        <p className="mb-3 text-xs text-zinc-500">Sfoglia tutti i connettori: clicca su uno disponibile per configurarlo qui sotto.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liveConnectors.map((connector) => (
            <ConnectorTile key={connector.id} connector={connector} locked={atLimit && connector.countsTowardQuota} />
          ))}
          {comingSoonConnectors.map((connector) => (
            <ConnectorTile key={connector.id} connector={connector} locked={false} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Configurazione</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <div id="connector-telegram"><TelegramCard /></div>
          <div id="connector-google_calendar"><GoogleCalendarCard atLimit={atLimit} onQuotaChange={loadQuota} /></div>
          <div id="connector-gmail"><GmailCard atLimit={atLimit} onQuotaChange={loadQuota} /></div>
          <div id="connector-google_drive"><GoogleDriveCard atLimit={atLimit} onQuotaChange={loadQuota} /></div>
          <div id="connector-email_imap"><EmailCard atLimit={atLimit} onQuotaChange={loadQuota} /></div>
        </div>
      </div>
    </div>
  );
}

function ConnectorTile({ connector, locked }: { connector: Connector; locked: boolean }) {
  const Icon = CONNECTOR_ICONS[connector.icon] ?? Plug;
  const comingSoon = connector.status === "coming_soon";
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-300">
          <Icon className="h-5 w-5" />
        </span>
        {comingSoon ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <Clock className="h-3 w-3" /> Presto
          </span>
        ) : locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
            <Lock className="h-3 w-3" /> Slot pieno
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
            Disponibile
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-zinc-500">{connector.category}</p>
      <h3 className="mt-1 text-sm font-extrabold">{connector.name}</h3>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{connector.tagline}</p>
    </>
  );

  if (comingSoon) {
    return <article className="pa-panel-tight flex flex-col p-5 opacity-70">{content}</article>;
  }

  return (
    <a href={`#connector-${connector.id}`} className="pa-panel-tight flex flex-col p-5 transition hover:border-white/20">
      {content}
    </a>
  );
}

function TelegramCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [claim, setClaim] = useState<TelegramAuthorization | null>(null);
  const [requestingAuth, setRequestingAuth] = useState(false);
  const [authLabel, setAuthLabel] = useState("");
  const [removingChatId, setRemovingChatId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setStatus(await backend.telegramStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato Telegram non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      const result = await backend.telegramConnect(token);
      setToken("");
      if (result.claim) setClaim(result.claim);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Collegamento bot non riuscito.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Scollegare il bot Telegram? Smetterà di rispondere e tutte le chat autorizzate andranno rifatte se lo ricolleghi.")) return;
    setLoading(true);
    setError("");
    try {
      setStatus(await backend.telegramDisconnect());
      setClaim(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  const requestAuth = async () => {
    setRequestingAuth(true);
    setError("");
    try {
      const result = await backend.telegramAuthorize(authLabel || undefined);
      setClaim(result);
      setAuthLabel("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generazione codice non riuscita.");
    } finally {
      setRequestingAuth(false);
    }
  };

  const removeChat = async (chatId: string) => {
    if (!window.confirm("Rimuovere questa chat? Smetterà di poter scrivere al bot.")) return;
    setRemovingChatId(chatId);
    setError("");
    try {
      setStatus(await backend.telegramRemoveChat(chatId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Rimozione non riuscita.");
    } finally {
      setRemovingChatId(null);
    }
  };

  const connected = status?.status === "connected";
  const hasOwner = status?.chats.some((chat) => chat.isOwner) ?? false;

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Telegram</h2>
            <p className="text-xs text-zinc-500">Un canale in più con lo stesso assistente, senza numero di telefono</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-60" aria-label="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          {connected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Unplug className="h-4 w-4 text-zinc-500" />}
          {connected ? `Collegato · @${status?.botUsername}` : status?.status === "error" ? "Errore" : "Non collegato"}
        </p>
        {status?.lastError && <p className="mt-2 text-xs text-red-300">{status.lastError}</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {!connected ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs leading-5 text-zinc-500">
            Crea un bot gratuito su Telegram parlando con <strong className="text-zinc-300">@BotFather</strong> (comando <code>/newbot</code>), poi incolla qui il token che ti dà.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Token del bot</span>
            <input value={token} onChange={(event) => setToken(event.target.value)} className="pa-input font-mono text-xs" placeholder="123456789:AAExampleTokenFromBotFather" />
          </label>
          <button onClick={() => void connect()} disabled={connecting || !token.trim()} className="pa-button flex w-full items-center justify-center gap-2 px-5 py-3">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Collega bot
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {!hasOwner && !claim && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100/80">
              Il bot è collegato ma nessuno l'ha ancora rivendicato: genera un codice qui sotto e mandalo tu stesso al bot su Telegram per diventarne il titolare.
            </div>
          )}

          {claim && (
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
              <p className="text-sm font-bold text-blue-100">
                {hasOwner ? "Codice di autorizzazione pronto" : "Rivendica il tuo bot"}
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-100/80">
                Apri Telegram, cerca <strong>@{claim.botUsername || status?.botUsername}</strong>, avvia la chat (/start) e mandagli questo codice come messaggio:
              </p>
              <p className="mt-3 text-center font-mono text-2xl font-black tracking-[0.3em] text-emerald-300">{claim.code}</p>
              <p className="mt-2 text-center text-[11px] text-zinc-500">Scade tra {claim.expiresInMinutes} minuti.</p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Chat autorizzate</p>
            <div className="mt-3 space-y-2">
              {!status?.chats.length ? (
                <p className="text-xs text-zinc-500">Nessuna chat ha ancora rivendicato il bot.</p>
              ) : (
                status.chats.map((chat) => (
                  <div key={chat.chatId} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-bold">
                        {chat.username ? `@${chat.username}` : chat.chatId}
                        {chat.isOwner && (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">
                            Titolare
                          </span>
                        )}
                      </p>
                      {chat.label && <p className="truncate text-xs text-zinc-500">{chat.label}</p>}
                    </div>
                    <button onClick={() => void removeChat(chat.chatId)} disabled={removingChatId === chat.chatId} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60" aria-label="Rimuovi chat">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={authLabel} onChange={(event) => setAuthLabel(event.target.value)} className="pa-input flex-1" placeholder="Etichetta (facoltativa, es. Socio)" />
            <button onClick={() => void requestAuth()} disabled={requestingAuth} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold hover:bg-white/10 disabled:opacity-60 sm:w-auto">
              {requestingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Genera codice
            </button>
          </div>

          <button onClick={() => void disconnect()} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            <PowerOff className="h-4 w-4" /> Scollega bot
          </button>
        </div>
      )}
    </section>
  );
}

function QuotaLockedNotice({ label }: { label: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-200"><Lock className="h-4 w-4" /> Slot integrazioni esaurito</p>
      <p className="mt-1 text-xs text-amber-100/80">Attiva uno slot extra qui sopra per collegare {label}.</p>
    </div>
  );
}

function GoogleCalendarCard({ atLimit, onQuotaChange }: { atLimit: boolean; onQuotaChange: () => void }) {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.googleCalendarStatus();
      setStatus(result.status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato Google Calendar non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const connect = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.googleCalendarConnectUrl();
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile avviare il collegamento Google.");
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Scollegare Google Calendar? L'assistente smetterà di poter proporre appuntamenti.")) return;
    setLoading(true);
    setError("");
    try {
      const result = await backend.googleCalendarDisconnect();
      setStatus(result.status);
      onQuotaChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  const connected = status?.status === "connected";

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
            <Calendar className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Google Calendar</h2>
            <p className="text-xs text-zinc-500">Prenotazione appuntamenti via WhatsApp</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-60" aria-label="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          {connected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Unplug className="h-4 w-4 text-zinc-500" />}
          {connected ? "Collegato" : status?.status === "error" ? "Errore" : "Non collegato"}
        </p>
        {connected && status?.connectedAt && <p className="mt-1 text-xs text-zinc-500">Collegato il {formatDate(status.connectedAt)}</p>}
        {status?.lastError && <p className="mt-2 text-xs text-red-300">{status.lastError}</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Quando chiedi un appuntamento via WhatsApp, il tuo assistente propone gli orari liberi e crea l'evento solo dopo la tua conferma esplicita — non prenota mai in autonomia.
      </p>

      <div className="mt-5">
        {connected ? (
          <button onClick={() => void disconnect()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            <PowerOff className="h-4 w-4" /> Scollega
          </button>
        ) : atLimit ? (
          <QuotaLockedNotice label="Google Calendar" />
        ) : (
          <button onClick={() => void connect()} disabled={loading} className="pa-button flex items-center justify-center gap-2 px-5 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} Un clic per collegare
          </button>
        )}
      </div>
    </section>
  );
}

function GmailCard({ atLimit, onQuotaChange }: { atLimit: boolean; onQuotaChange: () => void }) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.gmailStatus();
      setStatus(result.status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato Gmail non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const connect = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.gmailConnectUrl();
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile avviare il collegamento Gmail.");
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Scollegare Gmail? L'assistente smetterà di leggere i nuovi messaggi e preparare bozze.")) return;
    setLoading(true);
    setError("");
    try {
      const result = await backend.gmailDisconnect();
      setStatus(result.status);
      onQuotaChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  const connected = status?.status === "connected";

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Gmail</h2>
            <p className="text-xs text-zinc-500">Accesso diretto Google, nessuna password da inserire</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-60" aria-label="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          {connected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Unplug className="h-4 w-4 text-zinc-500" />}
          {connected ? `Collegato · ${status?.emailAddress}` : status?.status === "error" ? "Errore" : "Non collegato"}
        </p>
        {status?.lastSyncedAt && <p className="mt-1 text-xs text-zinc-500">Ultima sincronizzazione: {formatDate(status.lastSyncedAt, true)}</p>}
        {status?.lastError && <p className="mt-2 text-xs text-red-300">{status.lastError}</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        L'assistente prepara una bozza per ogni email in arrivo: la invii solo tu, dopo averla controllata, dalla sezione "Bozze email".
      </p>

      <div className="mt-5">
        {connected ? (
          <button onClick={() => void disconnect()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            <PowerOff className="h-4 w-4" /> Scollega
          </button>
        ) : atLimit ? (
          <QuotaLockedNotice label="Gmail" />
        ) : (
          <button onClick={() => void connect()} disabled={loading} className="pa-button flex items-center justify-center gap-2 px-5 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Un clic per collegare
          </button>
        )}
      </div>
    </section>
  );
}

function GoogleDriveCard({ atLimit, onQuotaChange }: { atLimit: boolean; onQuotaChange: () => void }) {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.driveStatus();
      setStatus(result.status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato Google Drive non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const connect = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.driveConnectUrl();
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile avviare il collegamento a Google Drive.");
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Scollegare Google Drive? L'assistente smetterà di poter cercare, leggere o creare file.")) return;
    setLoading(true);
    setError("");
    try {
      const result = await backend.driveDisconnect();
      setStatus(result.status);
      onQuotaChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  const connected = status?.status === "connected";

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Google Drive</h2>
            <p className="text-xs text-zinc-500">Cerca, legge e crea file su richiesta via WhatsApp</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-60" aria-label="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          {connected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Unplug className="h-4 w-4 text-zinc-500" />}
          {connected ? "Collegato" : status?.status === "error" ? "Errore" : "Non collegato"}
        </p>
        {connected && status?.connectedAt && <p className="mt-1 text-xs text-zinc-500">Collegato il {formatDate(status.connectedAt)}</p>}
        {status?.lastError && <p className="mt-2 text-xs text-red-300">{status.lastError}</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        Le ricerche e le letture avvengono subito; per creare o modificare un file l'assistente ti manda sempre un'anteprima e agisce solo dopo la tua conferma esplicita.
      </p>

      <div className="mt-5">
        {connected ? (
          <button onClick={() => void disconnect()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            <PowerOff className="h-4 w-4" /> Scollega
          </button>
        ) : atLimit ? (
          <QuotaLockedNotice label="Google Drive" />
        ) : (
          <button onClick={() => void connect()} disabled={loading} className="pa-button flex items-center justify-center gap-2 px-5 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />} Un clic per collegare
          </button>
        )}
      </div>
    </section>
  );
}

function EmailCard({ atLimit, onQuotaChange }: { atLimit: boolean; onQuotaChange: () => void }) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [preset, setPreset] = useState("custom");
  const [presetTouched, setPresetTouched] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.emailStatus();
      setStatus(result.status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato email non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const applyPreset = (value: string, markTouched = true) => {
    setPreset(value);
    if (markTouched) setPresetTouched(true);
    const config = EMAIL_PRESETS[value];
    if (!config || value === "custom") return;
    setImapHost(config.imapHost);
    setImapPort(config.imapPort);
    setImapSecure(config.imapSecure);
    setSmtpHost(config.smtpHost);
    setSmtpPort(config.smtpPort);
    setSmtpSecure(config.smtpSecure);
  };

  const onEmailChange = (value: string) => {
    setEmailAddress(value);
    if (presetTouched) return;
    const detected = detectPresetFromEmail(value);
    if (detected) applyPreset(detected, false);
  };

  const connect = async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const result = await backend.emailConnect({ emailAddress, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, password });
      setStatus(result.status);
      setSaved(true);
      setPassword("");
      onQuotaChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Collegamento email non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Scollegare l'account email? L'assistente smetterà di leggere i nuovi messaggi e preparare bozze.")) return;
    setLoading(true);
    setError("");
    try {
      const result = await backend.emailDisconnect();
      setStatus(result.status);
      onQuotaChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  const connected = status?.status === "connected";
  const activePreset = EMAIL_PRESETS[preset];

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Un'altra casella email</h2>
            <p className="text-xs text-zinc-500">Libero, Virgilio, TIM, Yahoo, Outlook, Aruba o qualsiasi altro provider</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-60" aria-label="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          {connected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Unplug className="h-4 w-4 text-zinc-500" />}
          {connected ? `Collegato · ${status?.emailAddress}` : status?.status === "error" ? "Errore" : "Non collegato"}
        </p>
        {status?.lastSyncedAt && <p className="mt-1 text-xs text-zinc-500">Ultima sincronizzazione: {formatDate(status.lastSyncedAt, true)}</p>}
        {status?.lastError && <p className="mt-2 text-xs text-red-300">{status.lastError}</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-300">Account collegato correttamente.</p>}

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        L'assistente prepara una bozza per ogni email in arrivo: la invii solo tu, dopo averla controllata, dalla sezione "Bozze email".
      </p>

      {connected ? (
        <button onClick={() => void disconnect()} disabled={loading} className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
          <PowerOff className="h-4 w-4" /> Scollega
        </button>
      ) : atLimit ? (
        <QuotaLockedNotice label="una casella email" />
      ) : !expanded ? (
        <button onClick={() => setExpanded(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-extrabold hover:bg-white/10">
          <Plus className="h-4 w-4" /> Collega una casella email
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Indirizzo email</span>
            <input value={emailAddress} onChange={(event) => onEmailChange(event.target.value)} className="pa-input" placeholder="nome@libero.it" type="email" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Provider {!presetTouched && emailAddress && "(rilevato automaticamente)"}</span>
            <select value={preset} onChange={(event) => applyPreset(event.target.value)} className="pa-input">
              <option value="custom">Altro (configurazione manuale)</option>
              {Object.entries(EMAIL_PRESETS).filter(([key]) => key !== "custom").map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Password (o app-password)</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="pa-input" type="password" placeholder="••••••••" />
          </label>
          {activePreset?.note && <p className="text-[11px] leading-5 text-amber-300">{activePreset.note}</p>}
          {preset === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Host IMAP</span>
                <input value={imapHost} onChange={(event) => setImapHost(event.target.value)} className="pa-input" placeholder="imap.provider.it" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Porta IMAP</span>
                <input value={imapPort} onChange={(event) => setImapPort(Number(event.target.value) || 993)} className="pa-input" type="number" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Host SMTP</span>
                <input value={smtpHost} onChange={(event) => setSmtpHost(event.target.value)} className="pa-input" placeholder="smtp.provider.it" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Porta SMTP</span>
                <input value={smtpPort} onChange={(event) => setSmtpPort(Number(event.target.value) || 465)} className="pa-input" type="number" />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <input type="checkbox" checked={imapSecure} onChange={(event) => setImapSecure(event.target.checked)} className="accent-blue-500" /> IMAP con TLS
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <input type="checkbox" checked={smtpSecure} onChange={(event) => setSmtpSecure(event.target.checked)} className="accent-blue-500" /> SMTP con TLS
              </label>
            </div>
          )}
          <button onClick={() => void connect()} disabled={loading || !emailAddress || !password || !imapHost || !smtpHost} className="pa-button flex w-full items-center justify-center gap-2 px-5 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Testa e collega
          </button>
        </div>
      )}
    </section>
  );
}
