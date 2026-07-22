import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { backend } from "./api";
import { AppHeader } from "./PlansView";
import { EMPTY_ONBOARDING, type KnowledgeFile, type OnboardingData, type UserProfile } from "./types";

interface Props {
  user: UserProfile;
  initial: Partial<OnboardingData>;
  initialFiles: KnowledgeFile[];
  editing?: boolean;
  onDone: () => void;
  onLogout: () => void;
}

const STEPS = [
  { title: "La tua attività", subtitle: "Identità e contesto aziendale", icon: Building2 },
  { title: "Conoscenza", subtitle: "Offerta, clienti e regole", icon: FileText },
  { title: "Il tuo assistente", subtitle: "Ruolo, tono e confini", icon: Sparkles },
  { title: "Documenti", subtitle: "Materiale per il RAG", icon: Upload },
];

export function Onboarding({ user, initial, initialFiles, editing = false, onDone, onLogout }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ ...EMPTY_ONBOARDING, ...initial });
  const [files, setFiles] = useState(initialFiles);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const update = (key: keyof OnboardingData, value: string) => {
    setData((current) => ({ ...current, [key]: value }));
    setSaved("");
  };

  const saveAndContinue = async () => {
    setError("");
    setBusy(true);
    try {
      await backend.saveOnboarding(data, false);
      setSaved("Bozza salvata");
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await backend.saveOnboarding(data, true);
      if (!result.rag.indexed) {
        setSaved("Profilo salvato. L'indicizzazione RAG verrà riprovata quando i servizi AI saranno disponibili.");
      }
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Configurazione non completata.");
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of selected) {
        const result = await backend.upload(file);
        setFiles((current) => [result.file, ...current]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Caricamento non riuscito.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  };

  const removeFile = async (file: KnowledgeFile) => {
    setError("");
    try {
      await backend.deleteFile(file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita.");
    }
  };

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <AppHeader user={user} onLogout={onLogout} />
      <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              {editing ? "Profilo aziendale" : "Passaggio 4 di 4 · Configurazione"}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {editing ? "Aggiorna ciò che l'assistente deve sapere" : "Costruiamo il tuo assistente"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Più il contesto è preciso, pi? le risposte saranno utili e coerenti. Puoi salvare una bozza
              e completare i dati in seguito.
            </p>
          </div>
          {editing && (
            <button onClick={onDone} className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Torna alla dashboard
            </button>
          )}
        </div>

        <nav aria-label="Avanzamento onboarding" className="mb-8 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
                  index === step
                    ? "border-blue-400/40 bg-blue-500/10"
                    : index < step
                      ? "border-emerald-400/20 bg-emerald-500/[0.05]"
                      : "border-white/10 bg-white/[0.025]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    index < step ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-blue-300"
                  }`}>
                    {index < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-xs font-extrabold">{index + 1}. {item.title}</p>
                    <p className="hidden text-[10px] text-zinc-500 sm:block">{item.subtitle}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
            {saved}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
          {step === 0 && (
            <div>
              <SectionTitle title="Raccontaci chi sei" description="Questi dati identificano l'azienda e aiutano l?assistente a contestualizzare ogni conversazione." />
              <div className="grid gap-5 md:grid-cols-2">
                <Input label="Nome azienda *" value={data.companyName} onChange={(value) => update("companyName", value)} placeholder="Ragione sociale o nome attività" />
                <Input label="Settore *" value={data.industry} onChange={(value) => update("industry", value)} placeholder="Es. consulenza, e-commerce, studio legale" />
                <Input label="Sito web" value={data.website} onChange={(value) => update("website", value)} placeholder="https://?" type="url" />
                <Input label="Partita IVA" value={data.vatNumber} onChange={(value) => update("vatNumber", value)} placeholder="IT?" />
                <div className="md:col-span-2">
                  <Input label="Sede / area geografica" value={data.address} onChange={(value) => update("address", value)} placeholder="Indirizzo o territorio servito" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Descrizione dell'attività *" value={data.businessDescription} onChange={(value) => update("businessDescription", value)} placeholder="Cosa fa l?azienda, come lavora e in cosa ? specializzata?" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <SectionTitle title="La conoscenza operativa" description="Inserisci le informazioni che l?assistente dovrà usare per rispondere e prendere decisioni." />
              <div className="grid gap-5 md:grid-cols-2">
                <Textarea label="Prodotti e servizi *" value={data.productsServices} onChange={(value) => update("productsServices", value)} placeholder="Elenco, caratteristiche, prezzi indicativi, disponibilità" />
                <Textarea label="Clienti ideali *" value={data.targetAudience} onChange={(value) => update("targetAudience", value)} placeholder="Tipi di clienti, esigenze, territorio, fascia di mercato?" />
                <Textarea label="Concorrenti o alternative" value={data.competitors} onChange={(value) => update("competitors", value)} placeholder="Chi sono e come vi differenziate?" />
                <Textarea label="Punti di forza" value={data.differentiators} onChange={(value) => update("differentiators", value)} placeholder="Perché un cliente dovrebbe scegliere voi?" />
                <Textarea label="Domande frequenti e risposte" value={data.commonQuestions} onChange={(value) => update("commonQuestions", value)} placeholder="Tempi, prezzi, consegne, assistenza, garanzie?" />
                <Textarea label="Policy e regole aziendali" value={data.policies} onChange={(value) => update("policies", value)} placeholder="Resi, privacy, sconti, pagamenti, procedure interne?" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionTitle title="Comportamento dell'assistente" description="Definisci obiettivi, stile e situazioni in cui deve coinvolgere una persona." />
              <div className="grid gap-5 md:grid-cols-2">
                <Input label="Nome dell'assistente" value={data.agentName} onChange={(value) => update("agentName", value)} placeholder="Es. Arianna" />
                <Input label="Lingua principale" value={data.preferredLanguage} onChange={(value) => update("preferredLanguage", value)} placeholder="Italiano" />
                <Textarea label="Ruolo dell'assistente" value={data.roleDescription} onChange={(value) => update("roleDescription", value)} placeholder="Cosa deve fare concretamente?" />
                <Textarea label="Obiettivi principali *" value={data.mainGoals} onChange={(value) => update("mainGoals", value)} placeholder="Es. qualificare lead, rispondere alle FAQ, fissare appuntamenti?" />
                <Textarea label="Tono di voce *" value={data.toneOfVoice} onChange={(value) => update("toneOfVoice", value)} placeholder="Professionale, sintetico, rassicurante?" />
                <Textarea label="Argomenti vietati e limiti" value={data.forbiddenTopics} onChange={(value) => update("forbiddenTopics", value)} placeholder="Cosa non deve promettere, comunicare o fare?" />
                <Textarea label="Escalation a una persona" value={data.escalationRules} onChange={(value) => update("escalationRules", value)} placeholder="Quando e a chi passare la conversazione?" />
                <Textarea label="Orari e disponibilit?" value={data.openingHours} onChange={(value) => update("openingHours", value)} placeholder="Lun–Ven 9:00–18:00, festivi esclusi?" />
                <Input label="Email di contatto *" value={data.contactEmail} onChange={(value) => update("contactEmail", value)} placeholder="assistenza@azienda.it" type="email" />
                <Input label="Telefono di contatto" value={data.contactPhone} onChange={(value) => update("contactPhone", value)} placeholder="+39…" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <SectionTitle title="Documenti per il RAG" description="Carica materiale affidabile: listini, cataloghi, FAQ, procedure, manuali e policy. Ogni file viene estratto e indicizzato separatamente." />
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/[0.05] px-6 py-10 text-center hover:bg-blue-500/[0.08]">
                {uploading ? <Loader2 className="h-8 w-8 animate-spin text-blue-300" /> : <Upload className="h-8 w-8 text-blue-300" />}
                <span className="mt-3 text-sm font-extrabold">{uploading ? "Indicizzazione in corso…" : "Seleziona uno o più documenti"}</span>
                <span className="mt-1 text-xs text-zinc-500">PDF, DOCX, TXT o MD · massimo 15 MB per file</span>
                <input disabled={uploading} type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={uploadFiles} className="sr-only" />
              </label>

              <div className="mt-5 space-y-2">
                {files.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-5 text-center text-sm text-zinc-500">
                    Nessun documento caricato. Puoi completare il profilo e aggiungerli in seguito.
                  </p>
                ) : files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-blue-300">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{file.name}</p>
                      <p className={`text-[11px] ${file.status === "ready" ? "text-emerald-400" : file.status === "error" ? "text-red-300" : "text-amber-300"}`}>
                        {file.status === "ready" ? `Indicizzato · ${file.chunks} sezioni` : file.status === "error" ? file.error || "Indicizzazione non riuscita" : "Elaborazione…"}
                      </p>
                    </div>
                    <button onClick={() => removeFile(file)} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Elimina ${file.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
                <h3 className="font-extrabold">Pronto per completare?</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Verificheremo i campi obbligatori e indicizzeremo anche questo profilo aziendale nel RAG.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || busy}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Indietro
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={saveAndContinue} disabled={busy} className="pa-button flex items-center justify-center gap-2 px-6 py-3">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salva e continua <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={complete} disabled={busy || uploading} className="pa-button flex items-center justify-center gap-2 px-6 py-3">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing ? "Salva configurazione" : "Completa e apri la dashboard"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-7">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pa-input" />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">{label}</span>
      <textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pa-input resize-y" />
    </label>
  );
}

