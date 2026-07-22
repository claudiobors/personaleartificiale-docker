import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  FileText,
  Gauge,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { backend } from "./api";
import { AppHeader } from "./PlansView";
import type { KnowledgeFile, OnboardingData, Plan, UserProfile, WhatsAppSession } from "./types";

type Tab = "overview" | "knowledge" | "whatsapp" | "profile" | "billing";

interface Props {
  user: UserProfile;
  plan?: Plan;
  onboarding: Partial<OnboardingData>;
  files: KnowledgeFile[];
  stats: { files: number; ready_files: number; messages: number; whatsapp_status?: string | null };
  onFilesChange: (files: KnowledgeFile[]) => void;
  onEditProfile: () => void;
  onPortal: () => void;
  onLogout: () => void;
}

export function ControlPanel({
  user,
  plan,
  onboarding,
  files,
  stats,
  onFilesChange,
  onEditProfile,
  onPortal,
  onLogout,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Array<{ score: number; source: string }>>([]);
  const [whatsApp, setWhatsApp] = useState<WhatsAppSession | null>(null);
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
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

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setAnswer("");
    try {
      const result = await backend.askAssistant(query);
      setAnswer(result.answer);
      setSources(result.sources);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Risposta non disponibile.");
    } finally {
      setSearching(false);
    }
  };


  const loadWhatsApp = async () => {
    setWhatsAppLoading(true);
    setError("");
    try {
      const result = await backend.whatsappStatus();
      setWhatsApp(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stato WhatsApp non disponibile.");
    } finally {
      setWhatsAppLoading(false);
    }
  };

  const provisionWhatsApp = async () => {
    setWhatsAppLoading(true);
    setError("");
    try {
      const result = await backend.provisionWhatsApp();
      setWhatsApp(result.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attivazione WhatsApp non riuscita.");
    } finally {
      setWhatsAppLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "whatsapp" && !whatsApp) void loadWhatsApp();
  }, [tab, whatsApp]);


  const exportPrivacy = async () => {
    setPrivacyLoading(true);
    setError("");
    try {
      const result = await backend.exportPrivacy();
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "personale-artificiale-dati.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Esportazione dati non riuscita.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const deleteAccount = async () => {
    const confirmation = window.prompt("Per eliminare account e dati scrivi ELIMINA");
    if (confirmation !== "ELIMINA") return;
    setPrivacyLoading(true);
    setError("");
    try {
      await backend.deleteAccount(confirmation);
      onLogout();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione account non riuscita.");
      setPrivacyLoading(false);
    }
  };

  const renewal = user.subscriptionCurrentPeriodEnd
    ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(user.subscriptionCurrentPeriodEnd))
    : "Gestito da Stripe";

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <AppHeader user={user} onLogout={onLogout} />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              Account operativo
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">
              Ciao {user.name.split(" ")[0]}, il tuo assistente è pronto.
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {onboarding.companyName || "La tua azienda"} · {plan?.name || user.planId}
            </p>
          </div>
          <button onClick={onEditProfile} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10">
            <Settings className="h-4 w-4" /> Modifica configurazione
          </button>
        </section>

        <nav className="mb-7 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.025] p-1">
          {([
            ["overview", "Panoramica", Gauge],
            ["knowledge", "Knowledge base", Database],
            ["whatsapp", "WhatsApp", MessageCircle],
            ["profile", "Profilo AI", Bot],
            ["billing", "Fatturazione", CreditCard],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${
                tab === value ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric icon={Database} label="Documenti" value={String(files.length)} detail={stats.ready_files + " indicizzati"} />
              <Metric icon={Bot} label="Profilo AI" value="Completo" detail={onboarding.toneOfVoice || "Configurato"} />
              <Metric icon={CreditCard} label="Abbonamento" value="Attivo" detail={"Rinnovo: " + renewal} />
              <Metric icon={MessageCircle} label="WhatsApp" value={statusLabel(stats.whatsapp_status || whatsApp?.status)} detail="Canale cliente" />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                    <Search className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-extrabold">Verifica il RAG</h2>
                    <p className="text-xs text-zinc-500">Fai una domanda e controlla quali informazioni recupera.</p>
                  </div>
                </div>
                <form onSubmit={search} className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="pa-input flex-1" placeholder="Es. Qual è la nostra politica sui resi?" />
                  <button disabled={searching} className="pa-button flex items-center justify-center gap-2 px-5">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Cerca
                  </button>
                </form>
                {answer && (
                  <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-blue-300">Risposta dell'assistente</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{answer}</p>
                    {sources.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {sources.map((source, index) => (
                          <span key={`${source.source}-${index}`} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] text-zinc-400">
                            {source.source || "Profilo aziendale"} · {Math.round(source.score * 100)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/15 to-transparent p-6">
                <p className="text-xs font-black uppercase tracking-widest text-blue-300">Piano attivo</p>
                <h2 className="mt-2 text-2xl font-black">{plan?.name}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{plan?.description}</p>
                <ul className="mt-5 space-y-2">
                  {plan?.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        {tab === "knowledge" && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-black">Knowledge base</h2>
                <p className="mt-1 text-sm text-zinc-500">Documenti isolati nel tuo spazio e indicizzati in Qdrant.</p>
              </div>
              <label className="pa-button flex cursor-pointer items-center justify-center gap-2 px-5 py-3">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Indicizzo…" : "Carica documenti"}
                <input disabled={uploading} type="file" multiple accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={upload} />
              </label>
            </div>

            <div className="mt-6 space-y-2">
              {files.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
                  <Database className="mx-auto h-9 w-9 text-zinc-700" />
                  <p className="mt-3 text-sm font-bold text-zinc-400">Nessun documento</p>
                  <p className="mt-1 text-xs text-zinc-600">Aggiungi listini, FAQ, procedure o cataloghi.</p>
                </div>
              ) : files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
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
              ))}
            </div>
          </section>
        )}


        {tab === "whatsapp" && (
          <section className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Canale operativo</p>
                  <h2 className="mt-2 text-2xl font-black">Bot WhatsApp per i clienti</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Genera l'istanza Evolution, collega il numero con QR code e ricevi messaggi reali: il bot risponde usando profilo aziendale e knowledge base.
                  </p>
                </div>
                <button onClick={() => void loadWhatsApp()} disabled={whatsAppLoading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
                  <RefreshCw className={`mr-2 inline h-4 w-4 ${whatsAppLoading ? "animate-spin" : ""}`} /> Aggiorna
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Stato</p>
                    <p className="mt-1 text-xl font-black">{statusLabel(whatsApp?.status || stats.whatsapp_status)}</p>
                    {whatsApp?.instanceName && <p className="mt-1 text-xs text-zinc-500">Istanza: {whatsApp.instanceName}</p>}
                    {whatsApp?.lastError && <p className="mt-2 text-xs text-red-300">{whatsApp.lastError}</p>}
                  </div>
                  <button onClick={() => void provisionWhatsApp()} disabled={whatsAppLoading} className="pa-button flex items-center justify-center gap-2 px-5 py-3">
                    {whatsAppLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {whatsApp?.instanceName ? "Rigenera collegamento" : "Attiva WhatsApp"}
                  </button>
                </div>
              </div>

              {whatsApp?.qrCode && (
                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
                  <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-200"><QrCode className="h-4 w-4" /> Scansiona il QR con WhatsApp</p>
                  <div className="mt-4 inline-block rounded-2xl bg-white p-3">
                    <img src={whatsApp.qrCode.startsWith("data:") ? whatsApp.qrCode : `data:image/png;base64,${whatsApp.qrCode}`} alt="QR code WhatsApp" className="h-56 w-56 object-contain" />
                  </div>
                </div>
              )}
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <h3 className="font-extrabold">Cosa succede dopo</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                <li>• Ogni cliente ha una sessione WhatsApp isolata.</li>
                <li>• I messaggi in ingresso vengono salvati e deduplicati.</li>
                <li>• Le risposte usano RAG, onboarding e fallback sicuro.</li>
                <li>• Il webhook rifiuta chiamate senza API key Evolution.</li>
              </ul>
            </aside>
          </section>
        )}

        {tab === "profile" && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-300">Configurazione attuale</p>
                <h2 className="mt-2 text-2xl font-black">{onboarding.agentName || "Assistente Virtuale"}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{onboarding.roleDescription}</p>
              </div>
              <button onClick={onEditProfile} className="pa-button px-5 py-3">Modifica dati</button>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <ProfileItem label="Azienda" value={onboarding.companyName} icon={Building2} />
              <ProfileItem label="Settore" value={onboarding.industry} icon={Gauge} />
              <ProfileItem label="Tono di voce" value={onboarding.toneOfVoice} icon={Bot} />
              <ProfileItem label="Obiettivi" value={onboarding.mainGoals} icon={CheckCircle2} />
            </div>
          </section>
        )}

        {tab === "billing" && (
          <section className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-blue-300">Abbonamento</p>
              <h2 className="mt-2 text-2xl font-black">{plan?.name}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <BillingItem label="Canone" value={(plan?.monthlyPriceFormatted || "?") + " / mese"} />
                <BillingItem label="Prossimo rinnovo" value={renewal} />
                <BillingItem label="Stato" value="Attivo" />
                <BillingItem label="Rinnovo" value="Automatico" />
              </div>
              <button onClick={onPortal} className="pa-button mt-7 flex items-center gap-2 px-5 py-3">
                <CreditCard className="h-4 w-4" /> Apri il portale Stripe
              </button>
            </div>
            <aside className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="font-extrabold">Nel portale puoi</h3>
                <ul className="mt-4 space-y-3 text-sm text-zinc-400">
                  <li>• Aggiornare carta e dati di fatturazione</li>
                  <li>• Consultare e scaricare le fatture</li>
                  <li>• Verificare i prossimi addebiti</li>
                  <li>• Gestire o disdire l'abbonamento</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="font-extrabold">Privacy e dati personali</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Scarica i dati associati all'account o richiedi l'eliminazione definitiva. I dati operativi vengono isolati per cliente.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={() => void exportPrivacy()} disabled={privacyLoading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-60">Esporta dati</button>
                  <button onClick={() => void deleteAccount()} disabled={privacyLoading} className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60">Elimina account e dati</button>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Database; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-blue-400" />
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </article>
  );
}

function ProfileItem({ label, value, icon: Icon }: { label: string; value?: string; icon: typeof Building2 }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-zinc-500"><Icon className="h-4 w-4 text-blue-400" /> {label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{value || "Non specificato"}</p>
    </div>
  );
}

function BillingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "?";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}


function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    not_configured: "Da attivare",
    provisioning: "Preparazione",
    provisioned: "Pronto per QR",
    qr_ready: "QR pronto",
    connecting: "Connessione",
    connected: "Connesso",
    disconnected: "Disconnesso",
    error: "Errore",
  };
  return labels[status || "not_configured"] || "Da attivare";
}
