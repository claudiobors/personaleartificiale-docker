import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FolderOpen,
  Inbox,
  Loader2,
  Lock,
  Mail,
  Plus,
  PowerOff,
  RefreshCw,
  Sheet,
  Unplug,
  Webhook,
} from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { CalendarStatus, DriveStatus, EmailStatus, Quota } from "../types";

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

  const loadQuota = async () => {
    try {
      const result = await backend.integrationQuota();
      setQuota(result.quota);
    } catch {
      setQuota(null);
    }
  };

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Integrazioni"
        description="Scegli e attiva le integrazioni che vuoi usare, nel limite degli slot inclusi nel tuo piano. Ogni integrazione occupa uno slot finché resta collegata."
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
            {atLimit && (
              <button onClick={() => void buyExtraSlot()} disabled={buyingAddon} className="pa-button flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
                {buyingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Attiva slot extra (9€/mese)
              </button>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${quota.total ? Math.min(100, (quota.used / quota.total) * 100) : 0}%` }} />
          </div>
          {addonError && <p className="mt-3 text-sm text-red-300">{addonError}</p>}
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Disponibili ora</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <GoogleCalendarCard atLimit={atLimit} onQuotaChange={loadQuota} />
          <GmailCard atLimit={atLimit} onQuotaChange={loadQuota} />
          <GoogleDriveCard atLimit={atLimit} onQuotaChange={loadQuota} />
          <EmailCard atLimit={atLimit} onQuotaChange={loadQuota} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Presto disponibili</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ComingSoonCard icon={Webhook} name="Webhook personalizzato" description="Invia eventi (nuovo lead, nuovo messaggio) a Zapier, Make o un URL a tua scelta." />
          <ComingSoonCard icon={Sheet} name="Google Sheets" description="Usa un foglio come listino/orari sempre aggiornato per l'assistente." />
          <ComingSoonCard icon={Mail} name="Telegram" description="Un canale in più con lo stesso assistente, senza numero di telefono." />
        </div>
      </div>
    </div>
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

function ComingSoonCard({ icon: Icon, name, description }: { icon: typeof Webhook; name: string; description: string }) {
  return (
    <article className="pa-panel-tight flex flex-col gap-3 p-5 opacity-70">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <h3 className="text-sm font-extrabold">{name}</h3>
      </div>
      <p className="text-xs leading-5 text-zinc-500">{description}</p>
      <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
        <Clock className="h-3 w-3" /> Presto disponibile
      </span>
    </article>
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
