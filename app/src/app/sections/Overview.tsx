import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  Database,
  Loader2,
  Phone,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatNumber } from "../format";
import type { OnboardingData, Plan, UserProfile, WhatsAppContact } from "../types";
import { WhatsAppClientCard } from "./WhatsAppClient";

interface Props {
  user: UserProfile;
  plan?: Plan;
  onboarding: Partial<OnboardingData>;
  stats: { files: number; ready_files: number; messages: number };
  whatsAppContact: WhatsAppContact | null;
  onNavigate: (key: string) => void;
  onEditProfile: () => void;
}

export function Overview({ user, plan, onboarding, stats, whatsAppContact, onNavigate, onEditProfile }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Array<{ score: number; source: string }>>([]);
  const [error, setError] = useState("");

  const whatsappPhone = user.whatsappPhone || "";
  const botReady = user.onboardingComplete && stats.ready_files > 0 && Boolean(whatsappPhone);

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

  const setupSteps = [
    {
      title: "Configura profilo",
      detail: user.onboardingComplete ? "Profilo completato" : "Completa tono, obiettivi, regole e contatti",
      done: user.onboardingComplete,
      action: "Apri configurazione",
      onClick: onEditProfile,
    },
    {
      title: "Carica documenti",
      detail: stats.ready_files > 0 ? `${stats.ready_files} documenti indicizzati` : "Aggiungi FAQ, listini, procedure o cataloghi",
      done: stats.ready_files > 0,
      action: "Vai ai documenti",
      onClick: () => onNavigate("knowledge"),
    },
    {
      title: "Collega il tuo numero",
      detail: whatsappPhone || "Inserisci il numero da cui scriverai al bot",
      done: Boolean(whatsappPhone),
      action: "Configura WhatsApp",
      onClick: () => onNavigate("settings"),
    },
    {
      title: "Testa la chat",
      detail: botReady ? "Apri WhatsApp con messaggio preimpostato" : "Disponibile dopo configurazione, documenti e numero",
      done: botReady,
      action: "Apri chat",
      onClick: () => whatsAppContact?.url && window.open(whatsAppContact.url, "_blank", "noopener,noreferrer"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={botReady ? "Assistente pronto" : "Configurazione in corso"}
        title={`Ciao ${user.name.split(" ")[0]}`}
        description="Ecco lo stato del tuo assistente e i prossimi passi consigliati."
        action={
          <button onClick={onEditProfile} className="pa-button flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <Settings className="h-4 w-4" /> Configura
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Database} label="Documenti" value={String(stats.files)} detail={stats.ready_files + " indicizzati"} />
        <Metric icon={Bot} label="Profilo AI" value={user.onboardingComplete ? "Completo" : "Da completare"} detail={onboarding.toneOfVoice || "Configura tono"} />
        <Metric icon={Coins} label="Crediti token" value={formatNumber(user.tokenBalance || 0)} detail={`${formatNumber(user.monthlyTokensUsed || 0)} token usati`} />
        <Metric icon={Phone} label="WhatsApp" value={whatsAppContact?.number || "Da configurare"} detail={whatsappPhone ? `Scrivi da ${whatsappPhone}` : "Inserisci il tuo numero"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
        <div className="pa-panel p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-300">Percorso guidato</p>
              <h2 className="mt-2 text-xl font-black">Configura il bot senza perderti</h2>
            </div>
            <Sparkles className="h-5 w-5 text-blue-300" />
          </div>
          <div className="mt-5 grid gap-2.5">
            {setupSteps.map((step, index) => (
              <button
                key={step.title}
                onClick={step.onClick}
                disabled={step.action === "Apri chat" && !whatsAppContact?.url}
                className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-left transition hover:border-blue-400/35 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${step.done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-zinc-400"}`}>
                  {step.done ? <CheckCircle2 className="h-4.5 w-4.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-white">{step.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">{step.detail}</span>
                </span>
                <span className="hidden items-center gap-1 text-xs font-black text-blue-300 sm:flex">
                  {step.action} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <WhatsAppClientCard contact={whatsAppContact} whatsappPhone={whatsappPhone} onConfigure={() => onNavigate("settings")} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="pa-panel p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
              <Search className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Test rapido del bot</h2>
              <p className="text-xs text-zinc-500">Fai una domanda e verifica come risponde prima di usare WhatsApp.</p>
            </div>
          </div>
          <form onSubmit={search} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="pa-input flex-1" placeholder="Es. Qual è la nostra politica sui resi?" />
            <button disabled={searching} className="pa-button flex items-center justify-center gap-2 px-5">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Testa
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
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

        <div className="pa-panel bg-gradient-to-br from-blue-600/15 to-transparent p-6">
          <p className="text-xs font-black uppercase tracking-widest text-blue-300">Piano attivo</p>
          <h2 className="mt-2 text-xl font-black">{plan?.name}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{plan?.description}</p>
          <button onClick={() => onNavigate("credits")} className="mt-5 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-extrabold hover:bg-white/15">
            Gestisci crediti
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Database; label: string; value: string; detail: string }) {
  return (
    <article className="pa-panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-blue-400" />
      </div>
      <p className="mt-3 truncate text-xl font-black">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>
    </article>
  );
}
