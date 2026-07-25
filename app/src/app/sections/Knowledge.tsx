import { useState } from "react";
import { Database, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatBytes } from "../format";
import type { KnowledgeFile } from "../types";

interface Props {
  files: KnowledgeFile[];
  onFilesChange: (files: KnowledgeFile[]) => void;
}

export function Knowledge({ files, onFilesChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setUploading(true);
    setError("");
    try {
      const next = [...files];
      for (const file of selected) {
        const result = await backend.upload(file);
        next.unshift(result.file);
      }
      onFilesChange(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Caricamento non riuscito.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  };

  const remove = async (file: KnowledgeFile) => {
    setError("");
    try {
      await backend.deleteFile(file.id);
      onFilesChange(files.filter((item) => item.id !== file.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge base"
        title="Documenti"
        description="Isolati nel tuo spazio e indicizzati in Qdrant per le risposte del bot."
        action={
          <label className="pa-button flex cursor-pointer items-center justify-center gap-2 px-5 py-2.5 text-sm">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Indicizzo…" : "Carica documenti"}
            <input disabled={uploading} type="file" multiple accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={upload} />
          </label>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="pa-panel p-5 sm:p-6">
        <div className="space-y-2">
          {files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
              <Database className="mx-auto h-9 w-9 text-zinc-700" />
              <p className="mt-3 text-sm font-bold text-zinc-400">Nessun documento</p>
              <p className="mt-1 text-xs text-zinc-600">Aggiungi listini, FAQ, procedure o cataloghi.</p>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-blue-300">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{file.name}</p>
                  <p className={`text-[11px] ${file.status === "ready" ? "text-emerald-400" : file.status === "error" ? "text-red-300" : "text-amber-300"}`}>
                    {file.status === "ready" ? `Pronto · ${file.chunks} sezioni` : file.status === "error" ? file.error : "Elaborazione…"}
                  </p>
                </div>
                <span className="hidden text-[11px] text-zinc-600 sm:block">{formatBytes(file.size)}</span>
                <button onClick={() => remove(file)} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Elimina ${file.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
