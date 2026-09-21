import { useMemo, useState } from "react";
import { ArrowRight, Check, CreditCard, LogOut, RefreshCw, ShieldCheck, Lock, Send } from "lucide-react";
import type { Plan, UserProfile } from "./types";

interface Props {
  user: UserProfile;
  plans: Plan[];
  busyPlan: string | null;
  error: string;
  onCheckout: (planId: string, cycleId: string) => void;
  onPortal: () => void;
  onLogout: () => void;
  onRequestQuote: (data: { companySize: string; useCase: string; notes: string }) => Promise<void>;
  initialPlanId: string | null;
  initialCycleId: string | null;
}

const trustBadges = [
  {
    title: "Dati isolati per cliente",
    text: "Ogni account ha il proprio spazio dati, cifrato e separato dagli altri clienti. Puoi esportare o cancellare tutto in ogni momento.",
  },
  {
    title: "Nessun costo di attivazione",
    text: "Paghi solo il canone del piano scelto. Nessuna voce nascosta, nessun setup da pagare a parte.",
  },
  {
    title: "Protezione anti-ban WhatsApp",
    text: "Numero dedicato, limiti di invio e risposte solo a conversazioni consentite riducono il rischio di sospensione da parte di WhatsApp.",
  },
  {
    title: "Sistema in evoluzione continua",
    text: "È una piattaforma innovativa e sperimentale, aggiornata di continuo: nuove funzioni incluse nel canone, senza costi aggiuntivi.",
  },
];

export function PlansView({ user, plans, busyPlan, error, onCheckout, onPortal, onLogout, onRequestQuote, initialPlanId, initialCycleId }: Props) {
  const recoverBilling = Boolean(user.subscriptionId) && (user.status === "past_due" || user.status === "cancelled");
  const [cycleId, setCycleId] = useState(initialCycleId || "1m");
  const availableCycles = plans[0]?.cycles ?? [];

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <AppHeader user={user} onLogout={onLogout} />
      <div className="mx-auto max-w-6xl px-5 py-12">
        {recoverBilling ? (
          <section className="mx-auto max-w-2xl rounded-3xl border border-amber-400/20 bg-amber-500/[0.07] p-7 text-center sm:p-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
              <RefreshCw className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-3xl font-black">Il tuo abbonamento richiede attenzione</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-300">
              Apri il portale Stripe per aggiornare il metodo di pagamento, consultare le fatture
              o verificare lo stato del rinnovo. I tuoi dati e documenti restano al sicuro.
            </p>
            {error && <ErrorBox message={error} />}
            <button onClick={onPortal} disabled={busyPlan !== null} className="pa-button mt-7 inline-flex items-center gap-2 px-6 py-3.5">
              <CreditCard className="h-4 w-4" /> Gestisci fatturazione
            </button>
          </section>
        ) : (
          <>
            <section className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">Passaggio 2 di 4</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Scegli come vuoi iniziare</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                Nessun costo di attivazione. Canone tutto incluso, rinnovo automatico e gestione
                di metodo di pagamento, fatture e disdetta dal portale Stripe in qualsiasi momento.
              </p>
            </section>

            {error && <div className="mx-auto mt-8 max-w-2xl"><ErrorBox message={error} /></div>}

            {availableCycles.length > 0 && (
              <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                {availableCycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    type="button"
                    onClick={() => setCycleId(cycle.id)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                      cycleId === cycle.id ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cycle.shortLabel}
                    {cycle.discountPercent > 0 && (
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${cycleId === cycle.id ? "bg-white/20" : "bg-emerald-500/10 text-emerald-300"}`}>
                        -{cycle.discountPercent}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <section className="mt-8 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => {
                const cycle = plan.cycles.find((item) => item.id === cycleId) ?? plan.cycles[0];
                return (
                  <article
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl border p-6 sm:p-8 ${
                      plan.highlighted
                        ? "border-blue-400/40 bg-blue-500/[0.075] shadow-2xl shadow-blue-950/30"
                        : "border-white/10 bg-white/[0.04]"
                    } ${initialPlanId === plan.id ? "ring-2 ring-blue-400/60" : ""}`}
                  >
                    {plan.highlighted && (
                      <span className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                        Più completo
                      </span>
                    )}
                    <p className="text-xs font-extrabold uppercase tracking-widest text-blue-300">{plan.tagline}</p>
                    <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
                    <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{plan.description}</p>

                    <div className="pa-panel-tight mt-6 p-5">
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black">{cycle?.totalPriceFormatted}</span>
                        <span className="pb-1 text-sm text-zinc-500">
                          {cycle && cycle.months > 1 ? `/ ${cycle.months} mesi` : "/mese"}
                        </span>
                      </div>
                      {cycle && cycle.months > 1 && (
                        <p className="mt-2 text-xs text-zinc-400">
                          equivale a {cycle.monthlyEquivalentFormatted}/mese
                          {cycle.savingsFormatted && <> · risparmi {cycle.savingsFormatted}</>}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-semibold text-emerald-300">Nessun costo di attivazione</p>
                    </div>

                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                            <Check className="h-3 w-3" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => onCheckout(plan.id, cycleId)}
                      disabled={busyPlan !== null}
                      className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold transition disabled:opacity-50 ${
                        plan.highlighted ? "bg-blue-600 hover:bg-blue-500" : "bg-white text-zinc-950 hover:bg-zinc-200"
                      }`}
                    >
                      {busyPlan === plan.id ? "Apro Stripe…" : "Registrati e attiva ora"}
                      {busyPlan !== plan.id && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </article>
                );
              })}

              <CustomQuoteCard user={user} onRequestQuote={onRequestQuote} highlighted={initialPlanId === "su-misura"} />
            </section>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-zinc-500">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /> Pagamento ospitato da Stripe</span>
              <span>Disdici quando vuoi dal portale cliente</span>
              <span>Fattura e ricevute sempre disponibili</span>
            </div>

            <section className="mt-16">
              <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-blue-400">Perché puoi fidarti</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {trustBadges.map((badge) => (
                  <div key={badge.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-300" />
                      <p className="text-sm font-extrabold">{badge.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{badge.text}</p>
                  </div>
                ))}
              </div>
              <p className="mx-auto mt-5 max-w-2xl text-center text-[11px] leading-5 text-zinc-500">
                Personale Artificiale è una piattaforma innovativa e in evoluzione continua: garanzie,
                limiti e politica anti-ban sono descritti per esteso nei{" "}
                <a href="https://www.personaleartificiale.it/termini-servizio" target="_blank" rel="noreferrer" className="text-blue-300 underline">
                  Termini di servizio
                </a>{" "}
                e nella pagina{" "}
                <a href="https://www.personaleartificiale.it/garanzie" target="_blank" rel="noreferrer" className="text-blue-300 underline">
                  Garanzie e policy
                </a>.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function CustomQuoteCard({
  user,
  onRequestQuote,
  highlighted,
}: {
  user: UserProfile;
  onRequestQuote: (data: { companySize: string; useCase: string; notes: string }) => Promise<void>;
  highlighted: boolean;
}) {
  const [companySize, setCompanySize] = useState("1-9 persone");
  const [useCase, setUseCase] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const alreadyRequested = Boolean(user.customQuoteRequestedAt);

  const requestedLabel = useMemo(() => {
    if (!user.customQuoteRequestedAt) return "";
    return new Date(user.customQuoteRequestedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  }, [user.customQuoteRequestedAt]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      await onRequestQuote({ companySize, useCase, notes });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Richiesta non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`flex flex-col rounded-3xl border p-6 sm:p-8 ${highlighted ? "border-blue-400/40 bg-blue-500/[0.075]" : "border-white/10 bg-white/[0.04]"}`}>
      <p className="text-xs font-extrabold uppercase tracking-widest text-blue-300">Su misura</p>
      <h2 className="mt-2 text-2xl font-black">Assistente su misura</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Per processi più articolati, integrazioni specifiche o più assistenti coordinati.
        Registrati e raccontaci cosa ti serve: prepariamo un preventivo su misura.
      </p>

      <div className="pa-panel-tight mt-6 p-5">
        <span className="text-3xl font-black">Preventivo</span>
        <p className="mt-2 text-xs text-zinc-400">Prezzo definito insieme a te, nessun costo di attivazione nascosto.</p>
      </div>

      {alreadyRequested ? (
        <div className="mt-6 flex flex-1 flex-col justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-center">
          <Send className="mx-auto h-6 w-6 text-emerald-300" />
          <p className="mt-3 text-sm font-bold text-emerald-100">Richiesta inviata{requestedLabel ? ` il ${requestedLabel}` : ""}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-200/80">Ti contattiamo entro 1-2 giorni lavorativi per definire il preventivo.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-1 flex-col gap-3">
          {formError && <ErrorBox message={formError} />}
          <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400">
            Dimensione azienda
            <select
              value={companySize}
              onChange={(event) => setCompanySize(event.target.value)}
              className="pa-input mt-1.5 font-normal normal-case"
            >
              <option>Solo io</option>
              <option>1-9 persone</option>
              <option>10-49 persone</option>
              <option>50+ persone</option>
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400">
            Cosa vuoi automatizzare
            <textarea
              required
              value={useCase}
              onChange={(event) => setUseCase(event.target.value)}
              className="pa-input mt-1.5 min-h-20 font-normal normal-case"
              placeholder="Es. più assistenti coordinati, integrazione col nostro gestionale…"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400">
            Note (facoltative)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="pa-input mt-1.5 min-h-14 font-normal normal-case"
            />
          </label>
          <button disabled={busy} className="pa-button-secondary mt-1 flex w-full items-center justify-center gap-2 py-3.5">
            {busy ? "Invio…" : "Registrati e richiedi il preventivo"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
            <Lock className="h-3 w-3" /> Nessun addebito: ti contattiamo prima di ogni pagamento.
          </p>
        </form>
      )}
    </article>
  );
}

export function AppHeader({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  return (
    <header className="border-b border-white/10 bg-[#080b11]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
            <img src="/logo-pa-transparent.png" alt="" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">Personale Artificiale</p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Esci</span>
        </button>
      </div>
    </header>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}
