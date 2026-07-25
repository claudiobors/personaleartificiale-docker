import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Loader2, Mail, PowerOff, RefreshCw, Unplug } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { CalendarStatus, EmailStatus } from "../types";

const EMAIL_PRESETS: Record<string, { imapHost: string; imapPort: number; imapSecure: boolean; smtpHost: string; smtpPort: number; smtpSecure: boolean }> = {
  gmail: { imapHost: "imap.gmail.com", imapPort: 993, imapSecure: true, smtpHost: "smtp.gmail.com", smtpPort: 465, smtpSecure: true },
  outlook: { imapHost: "outlook.office365.com", imapPort: 993, imapSecure: true, smtpHost: "smtp.office365.com", smtpPort: 587, smtpSecure: false },
  aruba: { imapHost: "imaps.aruba.it", imapPort: 993, imapSecure: true, smtpHost: "smtps.aruba.it", smtpPort: 465, smtpSecure: true },
};

export function Integrations() {
  const [callbackNotice, setCallbackNotice] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("integration") !== "google") return;
    const status = params.get("status");
    setCallbackNotice(
      status === "connected"
        ? { ok: true, message: "Google Calendar collegato correttamente." }
        : { ok: false, message: params.get("message") || "Collegamento Google non riuscito." },
    );
    window.history.replaceState({}, document.title, "/dashboard");
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrazioni"
        title="Calendario ed email"
        description="Collega i tuoi account: il bot potrà proporre appuntamenti e preparare bozze di risposta alle email in arrivo."
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
      <div className="grid gap-5 lg:grid-cols-2">
        <GoogleCalendarCard />
        <EmailCard />
      </div>
    </div>
  );
}

function GoogleCalendarCard() {
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
    if (!window.confirm("Scollegare Google Calendar? Il bot smetterà di poter proporre appuntamenti.")) return;
    setLoading(true);
    setError("");
    try {
      const result = await backend.googleCalendarDisconnect();
      setStatus(result.status);
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
        Quando un cliente chiede un appuntamento su WhatsApp, il bot propone gli orari liberi e crea l'evento solo dopo la sua conferma esplicita — non prenota mai in autonomia.
      </p>

      <div className="mt-5">
        {connected ? (
          <button onClick={() => void disconnect()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            <PowerOff className="h-4 w-4" /> Scollega
          </button>
        ) : (
          <button onClick={() => void connect()} disabled={loading} className="pa-button flex items-center justify-center gap-2 px-5 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} Collega Google Calendar
          </button>
        )}
      </div>
    </section>
  );
}

function EmailCard() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [preset, setPreset] = useState("gmail");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState(EMAIL_PRESETS.gmail.imapHost);
  const [imapPort, setImapPort] = useState(EMAIL_PRESETS.gmail.imapPort);
  const [imapSecure, setImapSecure] = useState(EMAIL_PRESETS.gmail.imapSecure);
  const [smtpHost, setSmtpHost] = useState(EMAIL_PRESETS.gmail.smtpHost);
  const [smtpPort, setSmtpPort] = useState(EMAIL_PRESETS.gmail.smtpPort);
  const [smtpSecure, setSmtpSecure] = useState(EMAIL_PRESETS.gmail.smtpSecure);

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

  const applyPreset = (value: string) => {
    setPreset(value);
    const config = EMAIL_PRESETS[value];
    if (!config) return;
    setImapHost(config.imapHost);
    setImapPort(config.imapPort);
    setImapSecure(config.imapSecure);
    setSmtpHost(config.smtpHost);
    setSmtpPort(config.smtpPort);
    setSmtpSecure(config.smtpSecure);
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Collegamento email non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Scollegare l'account email? Il bot smetterà di leggere i nuovi messaggi e preparare bozze.")) return;
    setLoading(true);
    setError("");
    try {
      const result = await backend.emailDisconnect();
      setStatus(result.status);
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
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Email (IMAP/SMTP)</h2>
            <p className="text-xs text-zinc-500">Bozze di risposta automatiche alle email in arrivo</p>
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
        Il bot legge le email in arrivo e prepara una bozza di risposta: la invii solo tu, dopo averla controllata, dalla sezione "Bozze email".
      </p>

      {connected ? (
        <button onClick={() => void disconnect()} disabled={loading} className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
          <PowerOff className="h-4 w-4" /> Scollega
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Provider</span>
            <select value={preset} onChange={(event) => applyPreset(event.target.value)} className="pa-input">
              <option value="gmail">Gmail / Google Workspace</option>
              <option value="outlook">Outlook / Microsoft 365</option>
              <option value="aruba">Aruba</option>
              <option value="custom">Altro (configurazione manuale)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Indirizzo email</span>
            <input value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} className="pa-input" placeholder="nome@azienda.it" type="email" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Password (o app-password)</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="pa-input" type="password" placeholder="••••••••" />
          </label>
          {preset === "gmail" && (
            <p className="text-[11px] leading-5 text-amber-300">
              Con Gmail serve una "password per le app": attiva la verifica in due passaggi e generala su myaccount.google.com/apppasswords.
            </p>
          )}
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
          <button onClick={() => void connect()} disabled={loading || !emailAddress || !password} className="pa-button flex w-full items-center justify-center gap-2 px-5 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Testa e collega
          </button>
        </div>
      )}
    </section>
  );
}
