import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Lock, MessageCircle, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import type { Quota, WhatsAppContact, WhatsappNumber } from "../types";

interface Props {
  contact: WhatsAppContact | null;
  whatsappPhone: string;
  onGoToSettings: () => void;
}

export function WhatsAppClientSection({ contact, whatsappPhone, onGoToSettings }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Il tuo assistente personale"
        title="Parla con il tuo assistente"
        description="Un dipendente artificiale al tuo servizio: risponde solo a te e ai numeri che autorizzi, non è un canale di assistenza per i tuoi clienti."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <WhatsAppClientCard contact={contact} whatsappPhone={whatsappPhone} onConfigure={onGoToSettings} full />
        <WhatsappNumbersCard />
      </div>
    </div>
  );
}

export function WhatsAppClientCard({
  contact,
  whatsappPhone,
  onConfigure,
  full = false,
}: {
  contact: WhatsAppContact | null;
  whatsappPhone: string;
  onConfigure: () => void;
  full?: boolean;
}) {
  const qrUrl = contact?.url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(contact.url)}`
    : "";

  const copyMessage = async () => {
    if (!contact?.message) return;
    await navigator.clipboard?.writeText(contact.message).catch(() => undefined);
  };

  return (
    <aside className={`pa-panel relative overflow-hidden p-6 sm:p-7 ${full ? "" : ""}`}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,.35), transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Chat WhatsApp</p>
          <h2 className="mt-2 text-xl font-black">Scrivi al tuo assistente</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Usa il numero del tuo assistente personale. Il messaggio è già preimpostato e il sistema ti riconosce dal numero salvato tra quelli autorizzati.
          </p>
        </div>
        <MessageCircle className="h-6 w-6 shrink-0 text-emerald-300" />
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Numero da contattare</p>
        <p className="mt-1 text-xl font-black">{contact?.number || "Numero bot non configurato"}</p>
        {!contact?.configured && (
          <p className="mt-2 text-xs leading-5 text-amber-300">
            Chiedi all'amministratore di impostare `WHATSAPP_BOT_NUMBER` nel `.env` e riavviare l'app.
          </p>
        )}
      </div>

      {contact?.configured && (
        <div className="relative mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="inline-flex rounded-2xl bg-white p-3">
            <img src={qrUrl} alt="QR per aprire la chat WhatsApp" className="h-32 w-32 rounded-lg object-contain" />
          </div>
          <div className="space-y-3">
            <a href={contact.url} target="_blank" rel="noreferrer" className="pa-button flex w-full items-center justify-center gap-2 px-5 py-3">
              Apri chat WhatsApp <ExternalLink className="h-4 w-4" />
            </a>
            <button onClick={() => void copyMessage()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold hover:bg-white/10">
              <Copy className="h-4 w-4" /> Copia messaggio
            </button>
          </div>
        </div>
      )}

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Messaggio preimpostato</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{contact?.message || "Ciao, voglio aprire la chat con il mio assistente Personale Artificiale."}</p>
      </div>

      {!whatsappPhone ? (
        <button onClick={onConfigure} className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm font-extrabold text-blue-100 hover:bg-blue-500/20">
          <Phone className="h-4 w-4" /> Aggiungi il tuo numero personale
        </button>
      ) : (
        <p className="relative mt-5 flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> L'assistente ti riconoscerà scrivendo da {whatsappPhone}
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
      setNumbers(result.numbers);
      setQuota(result.quota);
      setPhone("");
      setLabel("");
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("limite")) setQuotaExceeded(true);
      setError(cause instanceof Error ? cause.message : "Aggiunta numero non riuscita.");
    } finally {
      setAdding(false);
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
          <h2 className="font-extrabold">Numeri WhatsApp autorizzati</h2>
          <p className="text-xs text-zinc-500">Solo questi numeri possono scrivere al tuo assistente</p>
        </div>
      </div>

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
                <p className="text-sm font-bold">{number.phone}</p>
                {number.label && <p className="truncate text-xs text-zinc-500">{number.label}</p>}
              </div>
              <button onClick={() => void remove(number.id)} disabled={removingId === number.id} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60" aria-label="Rimuovi numero">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {quotaExceeded || atLimit ? (
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
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="pa-input" placeholder="Es. Io, Socio, Assistente" />
          </label>
          <button disabled={adding} className="pa-button flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Aggiungi numero
          </button>
        </form>
      )}
    </section>
  );
}
