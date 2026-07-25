import { useEffect, useState } from "react";
import { Loader2, MessageCircle, QrCode, RefreshCw } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import type { WhatsAppSession } from "../types";

const STATUS_LABELS: Record<string, string> = {
  not_configured: "Da attivare",
  provisioning: "Preparazione",
  provisioned: "Pronto per QR",
  qr_ready: "QR pronto",
  connecting: "Connessione",
  connected: "Connesso",
  disconnected: "Disconnesso",
  error: "Errore",
};

export function AdminWhatsApp() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.whatsappStatus();
      setSession(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato WhatsApp non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Canale operativo · Amministrazione"
        title="Bot WhatsApp per i clienti"
        description="Genera l'istanza Evolution, collega il numero con QR code e ricevi messaggi reali: il bot risponde usando profilo aziendale e knowledge base."
        action={
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
        <div className="pa-panel p-6 sm:p-8">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Stato</p>
                <p className="mt-1 text-xl font-black">{STATUS_LABELS[session?.status || "not_configured"] || "Da attivare"}</p>
                {session?.instanceName && <p className="mt-1 text-xs text-zinc-500">Istanza: {session.instanceName}</p>}
                {session?.lastError && <p className="mt-2 text-xs text-red-300">{session.lastError}</p>}
              </div>
              <button onClick={() => void provision()} disabled={loading} className="pa-button flex items-center justify-center gap-2 px-5 py-3">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {session?.instanceName ? "Rigenera collegamento" : "Attiva WhatsApp"}
              </button>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

          {session?.qrCode && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
              <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-200"><QrCode className="h-4 w-4" /> Scansiona il QR con WhatsApp</p>
              <div className="mt-4 inline-block rounded-2xl bg-white p-3">
                <img src={session.qrCode.startsWith("data:") ? session.qrCode : `data:image/png;base64,${session.qrCode}`} alt="QR code WhatsApp" className="h-56 w-56 object-contain" />
              </div>
            </div>
          )}
        </div>

        <aside className="pa-panel p-6">
          <h3 className="font-extrabold">Cosa succede dopo</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
            <li>• Ogni cliente ha una sessione WhatsApp isolata.</li>
            <li>• I messaggi in ingresso vengono salvati e deduplicati.</li>
            <li>• Le risposte usano RAG, onboarding e fallback sicuro.</li>
            <li>• Il webhook rifiuta chiamate senza API key Evolution.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
