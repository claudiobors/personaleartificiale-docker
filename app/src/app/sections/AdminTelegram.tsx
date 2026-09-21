import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PowerOff, RefreshCw, ShieldCheck } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { AdminTelegramBot } from "../types";

const STATUS_LABELS: Record<string, string> = {
  connected: "Connesso",
  disconnected: "Disconnesso",
  error: "Errore",
};

export function AdminTelegram() {
  const [bots, setBots] = useState<AdminTelegramBot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.adminTelegramBots();
      setBots(result.bots);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Elenco bot Telegram non disponibile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const disconnect = async (bot: AdminTelegramBot) => {
    if (!window.confirm(`Disconnettere il bot Telegram di ${bot.userName}? Smetterà di rispondere finché non lo ricollega dalla propria dashboard.`)) return;
    setDisconnectingId(bot.userId);
    setError("");
    try {
      const result = await backend.adminDisconnectTelegramBot(bot.userId);
      setBots(result.bots);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Disconnessione non riuscita.");
    } finally {
      setDisconnectingId(null);
    }
  };

  const connectedCount = bots.filter((bot) => bot.status === "connected").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Canale operativo · Amministrazione"
        title="Telegram dei clienti"
        description="Ogni account collega il proprio bot Telegram in autonomia: questa è solo una panoramica per assistenza. Il token del bot e il contenuto dei messaggi restano cosa privata di ogni cliente, mai visibili da qui."
        action={
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="pa-panel p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Bot connessi</p>
          <p className="mt-1 text-2xl font-black text-emerald-300">{connectedCount} / {bots.length}</p>
        </div>
        <div className="pa-panel flex items-start gap-3 p-5 text-xs leading-5 text-zinc-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
          <p>Ogni bot risponde solo al proprio titolare e alle chat che ha autorizzato: nessun bot qui è un canale di assistenza clienti condiviso.</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="pa-panel overflow-hidden">
        {loading && bots.length === 0 ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
        ) : bots.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">Nessun account ha ancora collegato un bot Telegram.</p>
        ) : (
          <div className="divide-y divide-white/8">
            {bots.map((bot) => {
              const isConnected = bot.status === "connected";
              return (
                <div key={bot.userId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {isConnected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                      {bot.userName} <span className="truncate text-xs font-normal text-zinc-500">{bot.userEmail}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {STATUS_LABELS[bot.status] || bot.status}
                      {bot.botUsername && ` · @${bot.botUsername}`}
                      {` · ${bot.chatsCount} chat autorizzat${bot.chatsCount === 1 ? "a" : "e"}`}
                      {bot.updatedAt && ` · aggiornato ${formatDate(bot.updatedAt, true)}`}
                    </p>
                    {bot.lastError && <p className="mt-1 text-xs text-red-300">{bot.lastError}</p>}
                  </div>
                  <button
                    onClick={() => void disconnect(bot)}
                    disabled={disconnectingId === bot.userId}
                    className="flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-extrabold text-red-200 hover:bg-red-500/20 disabled:opacity-60 sm:self-auto"
                  >
                    {disconnectingId === bot.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
                    Disconnetti (assistenza)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
