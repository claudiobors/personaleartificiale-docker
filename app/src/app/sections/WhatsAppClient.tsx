import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Lock, MessageCircle, Phone, Plus, PowerOff, QrCode, Trash2 } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { Quota, WhatsAppSession, WhatsappNumber, WhatsappNumberPendingVerification } from "../types";

const STATUS_LABELS: Record<string, string> = {
  not_configured: "Da collegare",
  provisioning: "Preparazione",
  provisioned: "Pronto per QR",
  qr_ready: "QR pronto",
  connecting: "Connessione",
  connected: "Connesso",
  disconnected: "Disconnesso",
  error: "Errore",
};

const SETTLING_STATUSES = new Set(["provisioning", "qr_ready", "connecting"]);

export function WhatsAppClientSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Il tuo assistente personale"
        title="Collega il tuo WhatsApp"
        description="Il tuo numero WhatsApp diventa il bot: risponde solo a te e ai numeri che autorizzi, non è un canale di assistenza per i tuoi clienti."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <WhatsAppClientCard full />
        <WhatsappNumbersCard />
      </div>
    </div>
  );
}

// Autosufficiente (stato, polling, provisioning, disconnessione): usato sia nella pagina dedicata
// (full) sia come riquadro compatto nella Panoramica, senza bisogno di stato condiviso dal genitore.
export function WhatsAppClientCard({ full = false }: { full?: boolean }) {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const result = await backend.whatsappStatus();
      setSession(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato WhatsApp non disponibile.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (session && SETTLING_STATUSES.has(session.status)) {
      pollRef.current = setInterval(() => void load(true), 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session?.status]);

  const provision = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.provisionWhatsApp();
      setSession(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attivazione WhatsApp non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnettere il tuo WhatsApp? Il bot smetterà di rispondere finché non ricolleghi un nuovo QR.")) return;
    setDisconnecting(true);
    setError("");
    try {
      const result = await backend.disconnectWhatsApp();
      setSession(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setDisconnecting(false);
    }
  };

  const status = session?.status || "not_configured";
  const isConnected = status === "connected";

  return (
    <aside className={`pa-panel relative overflow-hidden p-6 sm:p-7 ${full ? "" : ""}`}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,.35), transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Il tuo numero WhatsApp</p>
          <h2 className="mt-2 text-xl font-black">
            {isConnected ? "Bot attivo" : "Collega il tuo WhatsApp"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {isConnected
              ? "Il tuo numero risponde già come il tuo assistente personale."
              : "Scansiona il QR con lo stesso WhatsApp che vuoi trasformare nel tuo bot."}
          </p>
        </div>
        <MessageCircle className="h-6 w-6 shrink-0 text-emerald-300" />
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Stato</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-black">
              {isConnected && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
              {STATUS_LABELS[status] || "Da collegare"}
            </p>
            {session?.connectedNumber && <p className="mt-1 text-xs text-emerald-300">{session.connectedNumber}</p>}
            {full && session?.updatedAt && <p className="mt-1 text-[11px] text-zinc-600">Aggiornato: {formatDate(session.updatedAt, true)}</p>}
            {session?.lastError && <p className="mt-2 text-xs text-red-300">{session.lastError}</p>}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={() => void provision()} disabled={loading} className="pa-button flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {session?.instanceName ? "Rigenera" : "Connetti"}
            </button>
            {session?.instanceName && status !== "not_configured" && (
              <button
                onClick={() => void disconnect()}
                disabled={disconnecting}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
              >
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
                Disconnetti
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="relative mt-3 text-sm text-red-300">{error}</p>}

      {session?.qrCode && (
        <div className="relative mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-200"><QrCode className="h-4 w-4" /> Scansiona con WhatsApp</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Apri WhatsApp sul telefono che vuoi collegare → Impostazioni → Dispositivi collegati → Collega un dispositivo.</p>
          <div className="mt-4 inline-block rounded-2xl bg-white p-3">
            <img
              src={session.qrCode.startsWith("data:") ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
              alt="QR code WhatsApp"
              className={full ? "h-56 w-56 object-contain" : "h-40 w-40 object-contain"}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500">Lo stato si aggiorna da solo dopo la scansione.</p>
        </div>
      )}

      {full && !isConnected && (
        <p className="relative mt-5 text-xs leading-5 text-zinc-500">
          Il numero che scansioni diventa il numero del bot: risponderà a te e a chi autorizzi, non ai tuoi clienti finché non li aggiungi esplicitamente.
        </p>
      )}
    </aside>
  );
}

function WhatsappNumbersCard() {
  const [numbers, setNumbers] = useState<WhatsappNumber[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [buyingAddon, setBuyingAddon] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [addonNotice, setAddonNotice] = useState("");

  const [pending, setPending] = useState<WhatsappNumberPendingVerification | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.whatsappNumbers();
      setNumbers(result.numbers);
      setQuota(result.quota);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Numeri WhatsApp non disponibili.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("addon") === "extra_whatsapp_number" && params.get("status") === "success") {
      setAddonNotice("Numero extra attivato. Potrebbero volerci alcuni secondi prima che risulti disponibile.");
      window.history.replaceState({}, document.title, "/dashboard");
    }
  }, []);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdding(true);
    setError("");
    setQuotaExceeded(false);
    try {
      const result = await backend.addWhatsappNumber({ phone, label });
      if ("pendingVerification" in result) {
        setPending(result);
        setVerifyCode("");
      } else {
        setNumbers(result.numbers);
        setQuota(result.quota);
        setPhone("");
        setLabel("");
      }
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("limite")) setQuotaExceeded(true);
      setError(cause instanceof Error ? cause.message : "Aggiunta numero non riuscita.");
    } finally {
      setAdding(false);
    }
  };

  const verifyPending = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    setVerifying(true);
    setError("");
    try {
      const result = await backend.verifyWhatsappNumber({ numberId: pending.numberId, code: verifyCode });
      setNumbers(result.numbers);
      setQuota(result.quota);
      setPending(null);
      setVerifyCode("");
      setPhone("");
      setLabel("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Codice non corretto.");
    } finally {
      setVerifying(false);
    }
  };

  const resendPending = async () => {
    if (!pending) return;
    setError("");
    try {
      const result = await backend.resendWhatsappVerification({ numberId: pending.numberId });
      if ("pendingVerification" in result) setPending(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reinvio non riuscito.");
    }
  };

  const resumeVerification = async (number: WhatsappNumber) => {
    setResendingId(number.id);
    setError("");
    try {
      const result = await backend.resendWhatsappVerification({ numberId: number.id });
      if ("pendingVerification" in result) {
        setPending(result);
        setVerifyCode("");
      } else {
        await load();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invio codice non riuscito.");
    } finally {
      setResendingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Rimuovere questo numero? Smetterà di poter scrivere all'assistente.")) return;
    setRemovingId(id);
    setError("");
    try {
      const result = await backend.removeWhatsappNumber(id);
      setNumbers(result.numbers);
      setQuota(result.quota);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Rimozione non riuscita.");
    } finally {
      setRemovingId(null);
    }
  };

  const buyExtraNumber = async () => {
    setBuyingAddon(true);
    setError("");
    try {
      const result = await backend.addonCheckout("extra_whatsapp_number");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile avviare il pagamento.");
      setBuyingAddon(false);
    }
  };

  const atLimit = quota ? quota.used >= quota.total : false;

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
          <Phone className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-extrabold">Numeri autorizzati</h2>
          <p className="text-xs text-zinc-500">Oltre a te, chi altro può scrivere al tuo bot</p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-400">
        Scrivere "a te stesso" sul numero che hai collegato funziona già in automatico, senza bisogno di aggiungerlo qui. Aggiungi qui solo i numeri di altre persone (socio, familiare, collega…) che vuoi autorizzare a scrivere al bot e ricevere risposta.
      </p>

      {addonNotice && (
        <div role="alert" className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {addonNotice}
        </div>
      )}

      {quota && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>Numeri usati</span>
            <span>{quota.used} / {quota.total}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${quota.total ? Math.min(100, (quota.used / quota.total) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-5 space-y-2">
        {loading && numbers.length === 0 ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
        ) : numbers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-zinc-500">Nessun numero ancora aggiunto.</p>
        ) : (
          numbers.map((number) => (
            <div key={number.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {number.phone}
                  {!number.verified && (
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-300">
                      In attesa di verifica
                    </span>
                  )}
                </p>
                {number.label && <p className="truncate text-xs text-zinc-500">{number.label}</p>}
              </div>
              {!number.verified && (
                <button
                  onClick={() => void resumeVerification(number)}
                  disabled={resendingId === number.id}
                  className="rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-xs font-extrabold text-blue-100 hover:bg-blue-500/20 disabled:opacity-60"
                >
                  {resendingId === number.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verifica"}
                </button>
              )}
              <button onClick={() => void remove(number.id)} disabled={removingId === number.id} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60" aria-label="Rimuovi numero">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {pending ? (
        <form onSubmit={verifyPending} className="mt-5 space-y-3">
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
            {pending.deliveryFailed
              ? `Non sono riuscito a mandare il codice via WhatsApp a ${pending.phone}: verifica che il tuo bot sia connesso, poi riprova.`
              : `Ti abbiamo mandato un codice via WhatsApp a ${pending.phone}. Inseriscilo per confermare che il numero è autorizzato.`}
            {pending.devCode && <p className="mt-2 font-mono text-xs text-emerald-300">Dev code: {pending.devCode}</p>}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Codice ricevuto su WhatsApp</span>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={verifyCode}
              onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, ""))}
              className="pa-input text-center text-xl tracking-[0.4em]"
              placeholder="000000"
            />
          </label>
          <button disabled={verifying || verifyCode.length !== 6} className="pa-button flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Conferma numero
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => void resendPending()} className="font-bold text-zinc-400 hover:text-white">
              Rinvia codice
            </button>
            <button type="button" onClick={() => { setPending(null); setVerifyCode(""); }} className="font-bold text-zinc-400 hover:text-white">
              Annulla
            </button>
          </div>
        </form>
      ) : quotaExceeded || atLimit ? (
        <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-200"><Lock className="h-4 w-4" /> Hai raggiunto il limite di numeri del tuo piano</p>
          <p className="mt-1 text-xs text-amber-100/80">Attiva un numero extra a 5€/mese per aggiungerne un altro.</p>
          <button onClick={() => void buyExtraNumber()} disabled={buyingAddon} className="pa-button mt-4 flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm">
            {buyingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Attiva numero extra
          </button>
        </div>
      ) : (
        <form onSubmit={add} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Numero WhatsApp</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="pa-input" placeholder="+393331234567" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Etichetta (facoltativa)</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="pa-input" placeholder="Es. Socio, Collega" />
          </label>
          <button disabled={adding} className="pa-button flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Aggiungi numero
          </button>
          <p className="text-center text-[11px] text-zinc-500">Gli mandiamo un codice via WhatsApp su quel numero per confermare che è autorizzato.</p>
        </form>
      )}
    </section>
  );
}
