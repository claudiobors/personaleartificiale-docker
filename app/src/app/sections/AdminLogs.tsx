import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate, formatNumber } from "../format";
import type { AdminLogs as AdminLogsData } from "../types";

type LogsTab = "sessions" | "messages" | "ledger";

const WHATSAPP_LABELS: Record<string, string> = {
  not_configured: "Da attivare",
  provisioning: "Preparazione",
  provisioned: "Pronto per QR",
  qr_ready: "QR pronto",
  connecting: "Connessione",
  connected: "Connesso",
  disconnected: "Disconnesso",
  error: "Errore",
};

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLogsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<LogsTab>("sessions");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.adminLogs();
      setLogs(result.logs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Log non disponibili.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Amministrazione"
        title="Log"
        description="Sessioni WhatsApp, messaggi e movimenti token, per verificare che tutto funzioni."
        action={
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </button>
        }
      />

      <nav className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1 lg:w-fit">
        {([
          ["sessions", "Sessioni WhatsApp"],
          ["messages", "Messaggi"],
          ["ledger", "Movimenti token"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${
              tab === value ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {tab === "sessions" && (
        <div className="pa-panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Utente</th>
                <th className="px-4 py-3">Istanza</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Ultimo errore</th>
                <th className="px-4 py-3">Aggiornato</th>
              </tr>
            </thead>
            <tbody>
              {loading && !logs ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
              ) : !logs?.sessions.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nessuna sessione WhatsApp registrata.</td></tr>
              ) : (
                logs.sessions.map((session, index) => (
                  <tr key={`${session.user_id}-${index}`} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{session.email || session.user_id}</td>
                    <td className="px-4 py-3 text-zinc-400">{session.instance_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          session.status === "connected"
                            ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
                            : session.status === "error"
                            ? "border-red-400/25 bg-red-500/15 text-red-300"
                            : "border-white/10 text-zinc-400"
                        }`}
                      >
                        {WHATSAPP_LABELS[session.status] || session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-red-300">{session.last_error || "—"}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(session.updated_at, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "messages" && (
        <div className="pa-panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Utente</th>
                <th className="px-4 py-3">Direzione</th>
                <th className="px-4 py-3">Canale</th>
                <th className="px-4 py-3">Contenuto</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading && !logs ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
              ) : !logs?.messages.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nessun messaggio registrato.</td></tr>
              ) : (
                logs.messages.map((message) => (
                  <tr key={message.id} className="border-b border-white/5 last:border-0 align-top">
                    <td className="px-4 py-3 text-zinc-300">{message.email || message.user_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          message.direction === "incoming"
                            ? "border-blue-400/25 bg-blue-500/15 text-blue-300"
                            : "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {message.direction === "incoming" ? "Ricevuto" : "Inviato"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{message.channel}</td>
                    <td className="max-w-md truncate px-4 py-3 text-zinc-400" title={message.content}>{message.content}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(message.created_at, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ledger" && (
        <div className="pa-panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Utente</th>
                <th className="px-4 py-3">Variazione</th>
                <th className="px-4 py-3">Saldo dopo</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading && !logs ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
              ) : !logs?.ledger.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nessun movimento token registrato.</td></tr>
              ) : (
                logs.ledger.map((entry, index) => (
                  <tr key={`${entry.user_id}-${index}`} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{entry.email || entry.user_id}</td>
                    <td className={`px-4 py-3 font-bold ${entry.delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {entry.delta >= 0 ? "+" : ""}{formatNumber(entry.delta)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(entry.balance_after)}</td>
                    <td className="px-4 py-3 text-zinc-400">{entry.reason}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(entry.created_at, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
