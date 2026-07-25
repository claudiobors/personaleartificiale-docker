import { Copy, ExternalLink, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { PageHeader } from "../Shell";
import type { WhatsAppContact } from "../types";

interface Props {
  contact: WhatsAppContact | null;
  whatsappPhone: string;
  onGoToSettings: () => void;
}

export function WhatsAppClientSection({ contact, whatsappPhone, onGoToSettings }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Canale cliente"
        title="Parla con il tuo assistente"
        description="Il bot risponde solo ai numeri registrati e associati al tuo account attivo."
      />
      <WhatsAppClientCard contact={contact} whatsappPhone={whatsappPhone} onConfigure={onGoToSettings} full />
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
    <aside className={`pa-panel relative overflow-hidden p-6 sm:p-7 ${full ? "max-w-2xl" : ""}`}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,.35), transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Chat WhatsApp</p>
          <h2 className="mt-2 text-xl font-black">Scrivi al tuo bot</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Usa il numero ufficiale della piattaforma. Il messaggio è già preimpostato e il sistema riconosce il tuo account dal numero personale salvato.
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
          <Phone className="h-4 w-4" /> Inserisci il tuo numero personale
        </button>
      ) : (
        <p className="relative mt-5 flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Il bot ti riconoscerà scrivendo da {whatsappPhone}
        </p>
      )}
    </aside>
  );
}
