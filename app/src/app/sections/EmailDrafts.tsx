import { useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Send, Trash2 } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatDate } from "../format";
import type { EmailDraft } from "../types";

export function EmailDrafts() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.emailDrafts();
      setDrafts(result.drafts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bozze email non disponibili.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const send = async (draft: EmailDraft) => {
    setBusyId(draft.id);
    setError("");
    try {
      const result = await backend.sendEmailDraft(draft.id, edited[draft.id] ?? draft.body);
      setDrafts(result.drafts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invio non riuscito.");
    } finally {
      setBusyId(null);
    }
  };

  const discard = async (draft: EmailDraft) => {
    setBusyId(draft.id);
    setError("");
    try {
      const result = await backend.discardEmailDraft(draft.id);
      setDrafts(result.drafts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Email"
        title="Bozze da rivedere"
        description="Il bot prepara una risposta per ogni email in arrivo: controllala, modificala se serve e invia."
        action={
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </button>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading && drafts.length === 0 ? (
        <div className="pa-panel flex items-center justify-center p-14">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="pa-panel flex flex-col items-center justify-center gap-3 p-14 text-center">
          <Mail className="h-9 w-9 text-zinc-700" />
          <p className="text-sm font-bold text-zinc-400">Nessuna bozza in attesa</p>
          <p className="max-w-sm text-xs text-zinc-600">Quando arriva un'email a cui il bot può rispondere, la bozza comparirà qui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <article key={draft.id} className="pa-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{draft.subject}</p>
                  <p className="truncate text-xs text-zinc-500">A: {draft.to}</p>
                </div>
                <span className="shrink-0 text-[11px] text-zinc-600">{formatDate(draft.createdAt, true)}</span>
              </div>
              {draft.originalSnippet && (
                <p className="mt-3 truncate rounded-lg bg-black/20 px-3 py-2 text-xs text-zinc-500" title={draft.originalSnippet}>
                  Re: {draft.originalSnippet}
                </p>
              )}
              <textarea
                value={edited[draft.id] ?? draft.body}
                onChange={(event) => setEdited((current) => ({ ...current, [draft.id]: event.target.value }))}
                rows={6}
                className="pa-input mt-4 resize-y"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => void send(draft)} disabled={busyId === draft.id} className="pa-button flex items-center justify-center gap-2 px-5 py-2.5 text-sm">
                  {busyId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invia
                </button>
                <button onClick={() => void discard(draft)} disabled={busyId === draft.id} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-60">
                  <Trash2 className="h-4 w-4" /> Scarta
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
