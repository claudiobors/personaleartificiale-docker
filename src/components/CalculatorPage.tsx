import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Euro,
  FileText,
  Mail,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "~/components/SiteChrome";

const activities = [
  { id: "email", label: "Email", icon: Mail },
  { id: "agenda", label: "Agenda e appuntamenti", icon: CalendarDays },
  { id: "documenti", label: "Documenti e fatture", icon: FileText },
  { id: "clienti", label: "Clienti, schede e avanzamenti", icon: UsersRound },
] as const;

type ActivityId = (typeof activities)[number]["id"];

const suggestions: Record<ActivityId, string> = {
  email:
    "Filtrare la posta, preparare risposte e segnalare i messaggi prioritari.",
  agenda:
    "Fissare appuntamenti, controllare le disponibilità e preparare gli inviti.",
  documenti:
    "Leggere fatture, estrarre i dati utili e archiviare i file con ordine.",
  clienti:
    "Aggiornare clienti, schede di lavoro e avanzamenti a partire dai tuoi messaggi.",
};

const money = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

export function CalculatorPage({ campaign = false }: { campaign?: boolean }) {
  const [hourlyValue, setHourlyValue] = useState(35);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [daysPerMonth, setDaysPerMonth] = useState(20);
  const [selected, setSelected] = useState<ActivityId[]>(["email"]);

  const results = useMemo(() => {
    const repetitiveHours =
      Math.max(0, hoursPerDay) * Math.max(0, daysPerMonth);
    const recoverableHours = repetitiveHours * 0.35;
    const monthlyValue = recoverableHours * Math.max(0, hourlyValue);
    return { recoverableHours, monthlyValue, yearlyValue: monthlyValue * 12 };
  }, [hourlyValue, hoursPerDay, daysPerMonth]);

  const toggleActivity = (id: ActivityId) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <div className="pa-page">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden pb-14 pt-32 sm:pt-40">
          <div className="pa-glow -right-40 top-0" />
          <div className="pa-container relative text-center">
            <span className="pa-kicker">
              {campaign
                ? "Stima il tempo recuperabile"
                : "Simulatore di risparmio"}
            </span>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-[-0.045em] sm:text-6xl">
              Scopri quante ore potresti{" "}
              <span className="pa-gradient-text">liberare ogni mese.</span>
            </h1>
            <p className="pa-muted mx-auto mt-5 max-w-2xl text-lg leading-8">
              Non scegliamo un piano al posto tuo. Ti aiutiamo a stimare il
              valore del tempo dedicato alle attività ripetitive.
            </p>
          </div>
        </section>

        <section className="pa-container pb-20">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="pa-card p-5 sm:p-7">
              <h2 className="text-2xl font-extrabold">
                Raccontaci la tua giornata
              </h2>
              <p className="pa-muted mt-2 text-sm leading-6">
                Usa valori indicativi: potrai cambiarli e vedere subito una
                nuova stima.
              </p>
              <div className="mt-7 space-y-6">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <Euro className="h-4 w-4 text-blue-300" /> Valore indicativo
                    di un’ora di lavoro
                  </span>
                  <div className="relative">
                    <input
                      className="pa-input pr-12"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="1000"
                      step="1"
                      value={hourlyValue}
                      onChange={(event) =>
                        setHourlyValue(Number(event.target.value))
                      }
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      €
                    </span>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <Clock3 className="h-4 w-4 text-blue-300" /> Ore al giorno
                    dedicate ad attività ripetitive
                  </span>
                  <input
                    className="pa-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="16"
                    step="0.5"
                    value={hoursPerDay}
                    onChange={(event) =>
                      setHoursPerDay(Number(event.target.value))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <CalendarDays className="h-4 w-4 text-blue-300" /> Giorni
                    lavorati al mese
                  </span>
                  <input
                    className="pa-input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    step="1"
                    value={daysPerMonth}
                    onChange={(event) =>
                      setDaysPerMonth(Number(event.target.value))
                    }
                  />
                </label>
                <fieldset>
                  <legend className="mb-3 text-sm font-bold">
                    Quali attività occupano più spesso il tuo tempo?
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activities.map(({ id, label, icon: Icon }) => {
                      const active = selected.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleActivity(id)}
                          className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                            active
                              ? "border-blue-500 bg-blue-500/15 text-white"
                              : "border-slate-700 bg-black/20 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0 text-blue-300" />{" "}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </div>

            <div className="pa-card overflow-hidden border-blue-500/25">
              <div className="border-b border-white/10 bg-blue-500/10 p-5 sm:p-7">
                <p className="text-sm font-bold text-blue-200">
                  La tua stima indicativa
                </p>
                <p className="pa-muted mt-2 text-sm leading-6">
                  La stima considera potenzialmente liberabile il 35% del tempo
                  ripetitivo indicato. Il risultato reale dipende dalle attività
                  e dalla configurazione.
                </p>
              </div>
              <div
                className="grid gap-px bg-white/10 sm:grid-cols-3"
                aria-live="polite"
              >
                {[
                  [
                    "Ore liberabili al mese",
                    `${number.format(results.recoverableHours)} ore`,
                  ],
                  [
                    "Valore recuperabile al mese",
                    money.format(results.monthlyValue),
                  ],
                  [
                    "Valore recuperabile in un anno",
                    money.format(results.yearlyValue),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#0d111a] p-5 sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-3 text-2xl font-extrabold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-5 sm:p-7">
                <h2 className="text-2xl font-extrabold">
                  Come Personale Artificiale può aiutarti
                </h2>
                <ul className="mt-5 space-y-3">
                  {(selected.length
                    ? selected.map((id) => suggestions[id])
                    : [
                        "Combinare email, agenda, documenti e aggiornamenti in un flusso costruito sulle tue priorità.",
                      ]
                  ).map((text) => (
                    <li
                      key={text}
                      className="flex gap-3 text-sm leading-6 text-slate-300"
                    >
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />{" "}
                      {text}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] p-4 text-sm leading-6 text-slate-300">
                  Nel canone sono inclusi, per l’utilizzo previsto dal piano,
                  infrastruttura, modelli di intelligenza artificiale, token e
                  consumi, manutenzione e aggiornamenti. Non servono acquisti
                  tecnici separati.
                </div>
                <p className="pa-muted mt-5 text-xs leading-5">
                  Questi valori sono una stima orientativa e non costituiscono
                  una garanzia di risultato economico o di tempo recuperato.
                </p>
                <Link to="/" hash="prezzi" className="pa-button mt-6 w-full">
                  Confronta i piani e scegli quello adatto a te{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
