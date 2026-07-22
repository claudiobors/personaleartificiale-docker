import { ArrowRight, Check, CreditCard, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import type { Plan, UserProfile } from "./types";

interface Props {
  user: UserProfile;
  plans: Plan[];
  busyPlan: string | null;
  error: string;
  onCheckout: (planId: string) => void;
  onPortal: () => void;
  onLogout: () => void;
}

export function PlansView({ user, plans, busyPlan, error, onCheckout, onPortal, onLogout }: Props) {
  const recoverBilling = Boolean(user.subscriptionId) && (user.status === "past_due" || user.status === "cancelled");

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
                Entrambi i piani includono configurazione iniziale e rinnovo mensile automatico.
                Puoi gestire metodo di pagamento, fatture e disdetta dal portale Stripe.
              </p>
            </section>

            {error && <div className="mx-auto mt-8 max-w-2xl"><ErrorBox message={error} /></div>}

            <section className="mt-10 grid gap-5 lg:grid-cols-2">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border p-6 sm:p-8 ${
                    plan.highlighted
                      ? "border-blue-400/40 bg-blue-500/[0.075] shadow-2xl shadow-blue-950/30"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                      Più completo
                    </span>
                  )}
                  <p className="text-xs font-extrabold uppercase tracking-widest text-blue-300">{plan.tagline}</p>
                  <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">{plan.description}</p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black">{plan.monthlyPriceFormatted}</span>
                      <span className="pb-1 text-sm text-zinc-500">/mese</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      + {plan.setupFeeFormatted} una tantum per configurazione e avvio
                    </p>
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
                    onClick={() => onCheckout(plan.id)}
                    disabled={busyPlan !== null}
                    className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold transition disabled:opacity-50 ${
                      plan.highlighted ? "bg-blue-600 hover:bg-blue-500" : "bg-white text-zinc-950 hover:bg-zinc-200"
                    }`}
                  >
                    {busyPlan === plan.id ? "Apro Stripe…" : "Scegli questo piano"}
                    {busyPlan !== plan.id && <ArrowRight className="h-4 w-4" />}
                  </button>
                </article>
              ))}
            </section>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-zinc-500">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /> Pagamento ospitato da Stripe</span>
              <span>Rinnovo mensile automatico</span>
              <span>Fattura e ricevute nel portale cliente</span>
            </div>
          </>
        )}
      </div>
    </main>
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

