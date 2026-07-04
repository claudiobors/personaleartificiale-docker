import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  FolderCheck,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SiteFooter, SiteHeader } from "~/components/SiteChrome";

export const Route = createFileRoute("/")({ component: Home });

type ChatMessage = { id: number; sender: "user" | "agent"; text: string };

const demoStart: ChatMessage[] = [
  { id: 1, sender: "user", text: "Ci sono email importanti stamattina?" },
  {
    id: 2,
    sender: "agent",
    text: "Ne vedo due da controllare: una richiesta di preventivo e un cambio appuntamento. Vuoi che prepari le risposte?",
  },
];

const demoContinuation: Omit<ChatMessage, "id">[] = [
  {
    sender: "user",
    text: "Sì, prepara le bozze e sposta l'appuntamento a giovedì.",
  },
  {
    sender: "agent",
    text: "Fatto. Ho preparato entrambe le bozze e trovato due orari liberi per giovedì. Te li mostro prima di inviare qualsiasi cosa.",
  },
];

function contextualReply(text: string) {
  const value = text.toLowerCase();
  if (/email|mail|posta|rispost/.test(value)) {
    return "Posso filtrare i messaggi, segnalare le priorità e preparare risposte. Prima dell'invio, decidi tu cosa approvare.";
  }
  if (/agenda|appuntament|calendar|incontro|riunione/.test(value)) {
    return "Posso controllare le disponibilità, proporre orari e preparare gli inviti. Ti chiedo conferma prima delle azioni importanti.";
  }
  if (/document|fattur|pdf|file|archiv/.test(value)) {
    return "Posso leggere i documenti, estrarre i dati utili e proporre dove archiviarli, mantenendo tutto ordinato.";
  }
  if (/cliente|crm|trello|scheda|avanzament/.test(value)) {
    return "Posso aggiornare clienti, schede e avanzamenti a partire dai tuoi messaggi, così le informazioni restano allineate.";
  }
  return "Possiamo combinare email, agenda, documenti e aggiornamenti in un unico flusso. Dimmi cosa ti porta via più tempo e partiamo da lì.";
}

function ChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>(demoStart);
  const [input, setInput] = useState("");
  const [automaticStep, setAutomaticStep] = useState(0);
  const [userHasWritten, setUserHasWritten] = useState(false);
  const [replying, setReplying] = useState(false);
  const messageId = useRef(10);
  const scrollArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userHasWritten || automaticStep >= demoContinuation.length) return;
    const timer = window.setTimeout(() => {
      const next = demoContinuation[automaticStep];
      setMessages((current) => [
        ...current,
        { ...next, id: messageId.current++ },
      ]);
      setAutomaticStep((step) => step + 1);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [automaticStep, userHasWritten]);

  useEffect(() => {
    const area = scrollArea.current;
    if (area) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
  }, [messages, replying]);

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || replying) return;
    setUserHasWritten(true);
    setInput("");
    setMessages((current) => [
      ...current,
      { id: messageId.current++, sender: "user", text },
    ]);
    setReplying(true);
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: messageId.current++,
          sender: "agent",
          text: contextualReply(text),
        },
      ]);
      setReplying(false);
    }, 700);
  };

  const tryExample = (text: string) => {
    setUserHasWritten(true);
    setInput(text);
  };

  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2.5rem] border border-slate-700 bg-[#111722] p-2.5 shadow-2xl shadow-blue-950/40">
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#e9f0ea]">
        <div className="flex h-16 items-center gap-3 bg-[#0b1713] px-4 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-1">
            <img
              src="/logo-pa-transparent.png"
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Personale Artificiale</p>
            <p className="text-[11px] text-emerald-300">pronto ad aiutarti</p>
          </div>
        </div>
        <div
          ref={scrollArea}
          className="flex h-[390px] flex-col gap-3 overflow-y-auto overscroll-contain p-3"
          aria-live="polite"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 shadow-sm ${
                message.sender === "user"
                  ? "ml-auto rounded-tr-sm bg-[#d7ffc9] text-slate-900"
                  : "mr-auto rounded-tl-sm bg-white text-slate-900"
              }`}
            >
              {message.text}
            </div>
          ))}
          {replying && (
            <div className="mr-auto rounded-2xl rounded-tl-sm bg-white px-4 py-2 text-slate-500">
              Sto preparando una risposta…
            </div>
          )}
        </div>
        <div className="border-t border-slate-300 bg-[#f4f6f5] p-2.5">
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <label htmlFor="chat-message" className="sr-only">
              Scrivi un messaggio nella demo
            </label>
            <input
              id="chat-message"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (event.target.value) setUserHasWritten(true);
              }}
              placeholder="Scrivi un messaggio…"
              className="h-12 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-[16px] text-slate-900 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || replying}
              aria-label="Invia messaggio"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-45"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 text-[11px]">
            {[
              "Aiutami con le email",
              "Organizza un appuntamento",
              "Archivia una fattura",
              "Aggiorna un cliente",
            ].map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => tryExample(text)}
                className="min-h-11 shrink-0 rounded-full border border-slate-300 bg-white px-3 font-semibold text-slate-700"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const featureCards = [
  {
    icon: Mail,
    title: "Ti aiuta con le email.",
    text: "Separa le priorità, riassume i messaggi e prepara risposte da controllare.",
  },
  {
    icon: CalendarDays,
    title: "Organizza l’agenda.",
    text: "Controlla le disponibilità, propone orari e prepara inviti e promemoria.",
  },
  {
    icon: FolderCheck,
    title: "Mette in ordine i documenti.",
    text: "Legge i file, raccoglie i dati utili e li archivia seguendo le tue regole.",
  },
  {
    icon: UsersRound,
    title: "Aggiorna clienti e attività.",
    text: "Tiene allineate schede, elenchi e avanzamenti partendo dalle tue istruzioni.",
  },
  {
    icon: FileText,
    title: "Impara dai tuoi documenti.",
    text: "Usa listini, procedure e materiali che scegli tu per darti risposte più pertinenti.",
  },
  {
    icon: ShieldCheck,
    title: "Sei tu a decidere cosa può fare.",
    text: "Stabilisci permessi, conferme e limiti. Le decisioni importanti restano tue.",
  },
];

const included = [
  "server e VPS",
  "hosting e infrastruttura",
  "accesso ai modelli di intelligenza artificiale",
  "token e consumi previsti dal piano",
  "manutenzione tecnica",
  "correzioni e continuità del servizio",
  "aggiornamenti periodici",
  "nuove funzioni disponibili per il piano",
];

const plans = [
  {
    name: "Assistente",
    audience: "Per professionisti e piccole attività",
    price: "97 €",
    initialCost: "Configurazione iniziale: 399 € una tantum",
    features: [
      "Un aiuto configurato sulle tue priorità",
      "Email, agenda e documenti",
      "Uso tramite WhatsApp o chat",
      "Infrastruttura, modelli di intelligenza artificiale, token, manutenzione e aggiornamenti inclusi",
    ],
  },
  {
    name: "Ufficio Digitale",
    audience: "Per studi e gruppi di lavoro",
    price: "297 €",
    initialCost: "Configurazione iniziale: 999 € una tantum",
    features: [
      "Più attività coordinate nello stesso servizio",
      "Email, agenda, documenti e aggiornamenti clienti",
      "Regole e documenti condivisi",
      "Infrastruttura, modelli di intelligenza artificiale, token, manutenzione e aggiornamenti inclusi",
    ],
  },
  {
    name: "Su misura",
    audience: "Per esigenze e processi più articolati",
    price: "Preventivo",
    initialCost: "Configurazione iniziale definita nel preventivo",
    features: [
      "Flussi costruiti sulle procedure aziendali",
      "Collegamenti con gli strumenti già usati",
      "Permessi e controlli personalizzati",
      "Infrastruttura, modelli di intelligenza artificiale, token, manutenzione e aggiornamenti inclusi",
    ],
  },
];

const faqs = [
  {
    q: "Devo essere esperto di tecnologia?",
    a: "No. Usi il servizio scrivendo in chat come faresti con un collaboratore. La preparazione tecnica viene gestita per te.",
  },
  {
    q: "Cosa è compreso nel canone?",
    a: "Per l’utilizzo previsto dal piano sono compresi server, infrastruttura, accesso ai modelli di intelligenza artificiale, token, manutenzione, correzioni, continuità del servizio e aggiornamenti. Non devi aprire account tecnici o pagare fatture separate per questi elementi.",
  },
  {
    q: "Il servizio agisce senza chiedere?",
    a: "Decidi tu permessi e regole. Può preparare un’azione e chiederti conferma prima di completarla, soprattutto quando è importante.",
  },
  {
    q: "Quanto tempo posso recuperare?",
    a: "Dipende dalle attività e dal modo in cui lavori. Il calcolatore fornisce una stima indicativa, non una promessa di risultato.",
  },
  {
    q: "Il costo iniziale è incluso nel canone?",
    a: "No. Quando previsto, il costo di configurazione iniziale è mostrato separatamente dal canone mensile.",
  },
];

function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pa-page">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40 lg:pb-28">
          <div className="pa-glow -right-40 top-10" />
          <div className="pa-container relative grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="pa-kicker">
                <Sparkles className="h-3.5 w-3.5" /> Aiuto concreto, in chat
              </span>
              <h1 className="pa-title mt-6 max-w-4xl">
                Un aiuto concreto che ti restituisce{" "}
                <span className="pa-gradient-text">ore ogni settimana.</span> Tu
                resti al comando.
              </h1>
              <p className="pa-muted mt-6 max-w-2xl text-lg leading-8">
                Personale Artificiale riceve istruzioni in chat come un
                collaboratore. Ti aiuta con email, appuntamenti, documenti e
                aggiornamenti, mentre tu mantieni il controllo.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/calcolatore" className="pa-button">
                  Calcola le ore che puoi liberare{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#cosa-fa" className="pa-button-secondary">
                  Scopri come ti aiuta
                </a>
              </div>
              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 min-[430px]:grid-cols-3">
                {[
                  ["Una chat", "per dare istruzioni"],
                  ["Più tempo", "per il lavoro importante"],
                  ["Tu decidi", "permessi e conferme"],
                ].map(([value, label]) => (
                  <div
                    key={value}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="font-extrabold text-white">{value}</p>
                    <p className="mt-1 text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <ChatDemo />
          </div>
        </section>

        <section
          id="come-funziona"
          className="pa-section border-y border-white/10 bg-white/[0.02]"
        >
          <div className="pa-container">
            <div className="max-w-2xl">
              <span className="pa-kicker">Tre passaggi</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Semplice da iniziare, naturale da usare.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                [
                  "1",
                  "Scegli cosa delegare.",
                  "Partiamo dalle attività ripetitive che assorbono più tempo.",
                ],
                [
                  "2",
                  "Prepariamo il servizio sul tuo modo di lavorare.",
                  "Impostiamo regole, documenti e conferme insieme a te.",
                ],
                [
                  "3",
                  "Cominci a usarlo in chat.",
                  "Scrivi o invia un vocale per assegnare un’attività, proprio come fai ogni giorno.",
                ],
              ].map(([number, title, text]) => (
                <article key={number} className="pa-card p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-extrabold">
                    {number}
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
                  <p className="pa-muted mt-3 text-sm leading-6">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cosa-fa" className="pa-section">
          <div className="pa-container">
            <div className="mx-auto max-w-3xl text-center">
              <span className="pa-kicker">Nel lavoro di ogni giorno</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Meno rincorse. Più tempo utile.
              </h2>
              <p className="pa-muted mt-4 text-lg">
                Cominci da ciò che ti serve davvero e aggiungi nuove attività
                quando vuoi.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, text }) => (
                <article key={title} className="pa-card p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
                  <p className="pa-muted mt-2 text-sm leading-6">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section border-y border-blue-500/15 bg-blue-600/[0.07]">
          <div className="pa-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="pa-kicker">Canone tutto incluso</span>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Non devi comprare nient’altro.
              </h2>
              <p className="mt-5 text-lg font-bold text-white">
                Tu paghi il piano scelto. Alla tecnologia pensiamo noi.
              </p>
              <p className="pa-muted mt-3 leading-7">
                Per l’utilizzo previsto dal piano non servono account tecnici né
                fatture separate da altri fornitori.
              </p>
              <a href="#prezzi" className="pa-button mt-7">
                Scopri il canone tutto incluso
              </a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <li
                  key={item}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm font-semibold"
                >
                  <Check
                    className="h-5 w-5 shrink-0 text-blue-300"
                    aria-hidden="true"
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="prezzi" className="pa-section">
          <div className="pa-container">
            <div className="mx-auto max-w-3xl text-center">
              <span className="pa-kicker">Piani separati, scelta tua</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Confronta e scegli con calma.
              </h2>
              <p className="pa-muted mt-5 leading-7">
                Ogni canone include infrastruttura, modelli di intelligenza
                artificiale, token e consumi previsti, manutenzione e
                aggiornamenti. L’eventuale configurazione iniziale è indicata a
                parte.
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className="pa-card flex flex-col p-6 sm:p-7"
                >
                  <div>
                    <h3 className="text-2xl font-extrabold">{plan.name}</h3>
                    <p className="pa-muted mt-2 text-sm">{plan.audience}</p>
                    <p className="mt-7 text-4xl font-extrabold">{plan.price}</p>
                    {plan.price !== "Preventivo" && (
                      <p className="mt-1 text-sm text-slate-400">al mese</p>
                    )}
                    <p className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
                      {plan.initialCost}
                    </p>
                    <ul className="mt-6 space-y-4">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-3 text-sm leading-6 text-slate-300"
                        >
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />{" "}
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={`mailto:info@personaleartificiale.it?subject=Informazioni%20piano%20${encodeURIComponent(plan.name)}`}
                    className="pa-button-secondary mt-8 w-full"
                  >
                    Chiedi informazioni
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="pa-section border-t border-white/10 bg-white/[0.02]"
        >
          <div className="pa-container max-w-4xl">
            <div className="text-center">
              <span className="pa-kicker">Domande frequenti</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Risposte chiare, senza gergo.
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map((item, index) => {
                const open = openFaq === index;
                return (
                  <div key={item.q} className="pa-card overflow-hidden">
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold sm:px-6"
                      aria-expanded={open}
                      aria-controls={`faq-${index}`}
                      onClick={() => setOpenFaq(open ? null : index)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-blue-300 transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <p
                        id={`faq-${index}`}
                        className="pa-muted border-t border-white/10 px-5 py-5 text-sm leading-7 sm:px-6"
                      >
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pa-section">
          <div className="pa-container">
            <div className="pa-card relative overflow-hidden border-blue-500/25 p-7 text-center sm:p-12">
              <div className="pa-glow -right-40 -top-40" />
              <MessageCircle className="relative mx-auto h-10 w-10 text-blue-300" />
              <h2 className="relative mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Quanto tempo potresti recuperare?
              </h2>
              <p className="pa-muted relative mx-auto mt-4 max-w-2xl">
                Inserisci pochi dati e ottieni una stima indicativa basata sulle
                tue attività ripetitive.
              </p>
              <Link to="/calcolatore" className="pa-button relative mt-7">
                Calcola le ore che puoi liberare <Clock3 className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
