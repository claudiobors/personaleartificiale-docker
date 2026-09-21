import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PowerOff, RefreshCw, ShieldCheck } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { AdminWhatsAppSession } from "../types";

const STATUS_LABELS: Record<string, string> = {
  not_configured: "Non collegato",
  provisioning: "Preparazione",
  provisioned: "Pronto per QR",
  qr_ready: "QR in attesa di scansione",
  connecting: "Connessione",
  connected: "Connesso",
  disconnected: "Disconnesso",
  error: "Errore",
};

export function AdminWhatsApp() {
  const [sessions, setSessions] = useState<AdminWhatsAppSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.adminWhatsappSessions();
      setSessions(result.sessions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Elenco sessioni WhatsApp non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const disconnect = async (session: AdminWhatsAppSession) => {
    if (!window.confirm(`Disconnettere WhatsApp di ${session.userName}? Il suo bot smetterà di rispondere finché non riscansiona un nuovo QR dalla propria dashboard.`)) return;
    setDisconnectingId(session.userId);
    setError("");
    try {
      const result = await backend.adminDisconnectWhatsappSession(session.userId);
      setSessions(result.sessions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setDisconnectingId(null);
    }
  };

  const connectedCount = sessions.filter((s) => s.status === "connected").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Canale operativo · Amministrazione"
        title="WhatsApp dei clienti"
        description="Da quando ogni account collega il proprio numero WhatsApp, non c'è più un'istanza unica da gestire qui: questa è solo una panoramica per assistenza. Il QR e la connessione restano cosa privata di ogni cliente, mai visibili da qui."
        action={
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="pa-panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Account connessi</p>
          <p className="mt-1 text-2xl font-black text-emerald-300">{connectedCount} / {sessions.length}</p>
        </div>
        <div className="pa-panel flex items-start gap-3 p-5 text-xs leading-5 text-zinc-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
          <p>Ogni account risponde solo al proprio titolare e ai numeri che ha autorizzato: nessun bot qui è un canale di assistenza clienti condiviso.</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="pa-panel overflow-hidden">
        {loading && sessions.length === 0 ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">Nessun account ha ancora iniziato a collegare WhatsApp.</p>
        ) : (
          <div className="divide-y divide-white/8">
            {sessions.map((session) => {
              const isConnected = session.status === "connected";
              return (
                <div key={session.userId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {isConnected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                      {session.userName} <span className="truncate text-xs font-normal text-zinc-500">{session.userEmail}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {STATUS_LABELS[session.status] || session.status}
                      {session.connectedNumber && ` · ${session.connectedNumber}`}
                      {session.updatedAt && ` · aggiornato ${formatDate(session.updatedAt, true)}`}
                    </p>
                    {session.lastError && <p className="mt-1 text-xs text-red-300">{session.lastError}</p>}
                  </div>
                  {session.instanceName && session.status !== "not_configured" && (
                    <button
                      onClick={() => void disconnect(session)}
                      disabled={disconnectingId === session.userId}
                      className="flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60 sm:self-auto"
                    >
                      {disconnectingId === session.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
                      Disconnetti (assistenza)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
