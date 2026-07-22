import { useState } from "react";
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { backend, setToken } from "./api";
import type { UserProfile } from "./types";

interface Props {
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthView({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = mode === "register"
        ? await backend.register({ name, email, password, termsAccepted: terms })
        : await backend.login({ email, password });
      setToken(result.token);
      onAuthenticated(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accesso non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5">
              <img src="/logo-pa-transparent.png" alt="" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-sm font-extrabold">Personale Artificiale</p>
              <p className="text-[11px] text-zinc-500">Area riservata</p>
            </div>
          </div>
          <a href="https://www.personaleartificiale.it" className="text-xs font-semibold text-zinc-400 hover:text-white">
            Torna al sito
          </a>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300">
            <Sparkles className="h-3.5 w-3.5" /> Il tuo team AI, configurato sui tuoi dati
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
            Prima conosciamo te. Poi costruiamo il tuo{" "}
            <span className="text-blue-400">personale artificiale.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">
            Crea il tuo account, scegli il piano e completa il pagamento sicuro.
            Subito dopo raccoglieremo le informazioni e i documenti necessari per
            addestrare il tuo assistente sul contesto reale dell'azienda.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Account e dati separati per cliente",
              "Pagamento e rinnovo gestiti da Stripe",
              "Documenti indicizzati nel RAG",
              "Configurazione modificabile in ogni momento",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/40 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-black/30 p-1">
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${mode === "register" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Registrati
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${mode === "login" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Accedi
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold">
              {mode === "register" ? "Crea il tuo account" : "Bentornato"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === "register"
                ? "Il piano si sceglie nel passaggio successivo."
                : "Continua dalla configurazione che avevi lasciato."}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field label="Nome e cognome">
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="pa-input"
                  placeholder="Mario Rossi"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pa-input"
                placeholder="mario@azienda.it"
              />
            </Field>
            <Field label="Password">
              <input
                required
                minLength={8}
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pa-input"
                placeholder="Almeno 8 caratteri"
              />
            </Field>

            {mode === "register" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-400">
                <input
                  required
                  type="checkbox"
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                  className="mt-1 accent-blue-500"
                />
                <span>
                  Accetto i{" "}
                  <a className="text-blue-300 underline" href="https://www.personaleartificiale.it/termini-servizio" target="_blank" rel="noreferrer">
                    Termini di servizio
                  </a>{" "}
                  e la{" "}
                  <a className="text-blue-300 underline" href="https://www.personaleartificiale.it/privacy" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </a>.
                </span>
              </label>
            )}

            <button disabled={busy} className="pa-button flex w-full items-center justify-center gap-2 py-3.5">
              {busy ? "Attendi…" : mode === "register" ? "Crea account" : "Accedi"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/10 pt-5 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Dati protetti</span>
            <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Sessione sicura</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

