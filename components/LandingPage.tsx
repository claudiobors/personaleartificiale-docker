"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  Files,
  MailCheck,
  Menu,
  MessageCircle,
  Mic2,
  PenLine,
  PlugZap,
  Send,
  ShieldCheck,
  Sparkles,
  Trello,
  WalletCards,
  WandSparkles,
  X
} from "lucide-react";

type Agent = {
  name: string;
  title: string;
  photo: string;
  accent: string;
  tagline: string;
  tasks: string[];
};

type Demo = {
  title: string;
  plainTitle: string;
  icon: ReactNode;
  agent: string;
  telegram: string;
  does: string[];
  result: string;
  visual: "calendar" | "mail" | "invoice" | "marketing" | "lead" | "trello";
};

const navItems = [
  { label: "Team", href: "#team" },
  { label: "Demo", href: "#demo" },
  { label: "Metodo", href: "#metodo" },
  { label: "Prezzi", href: "#pricing" },
  { label: "Contatto", href: "#enterprise" }
];

const agents: Agent[] = [
  {
    name: "Giulia",
    title: "Assistente Operativa",
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=90",
    accent: "from-cyan to-aurora",
    tagline: "Tiene in ordine agenda, Gmail, promemoria e documenti.",
    tasks: ["Legge Gmail e priorita", "Fissa appuntamenti", "Salva file su Drive", "Ti ricorda cosa fare"]
  },
  {
    name: "Marco",
    title: "Responsabile Marketing",
    photo:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1000&q=90",
    accent: "from-plasma to-cyan",
    tagline: "Trasforma idee confuse in post, copy, campagne e immagini.",
    tasks: ["Scrive post social", "Crea idee contenuto", "Prepara caption", "Adatta il tono del brand"]
  },
  {
    name: "Lorenzo",
    title: "Collaboratore Aziendale",
    photo:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1000&q=90",
    accent: "from-ember to-aurora",
    tagline: "Esegue lavori ripetitivi: Trello, PDF, lead, schede e follow-up.",
    tasks: ["Aggiorna Trello", "Estrae dati dai PDF", "Crea schede operative", "Prepara liste lead"]
  }
];

const chatMessages = [
  {
    author: "Giulia",
    text: "Ho letto 34 messaggi Gmail. 5 sono urgenti. Ho fissato la call con Luca domani alle 15:00 e salvato la fattura in Drive."
  },
  {
    author: "Tu",
    text: "Perfetto. Preparami anche il promemoria per il commercialista alle 18."
  },
  {
    author: "Giulia",
    text: "Fatto. Ti avviso alle 18:00 su Telegram. Ho anche preparato il riepilogo dei messaggi Gmail importanti."
  }
];

const demos: Demo[] = [
  {
    title: "Calendario senza messaggi avanti e indietro",
    plainTitle: "Appuntamento fissato",
    icon: <CalendarDays />,
    agent: "Giulia",
    telegram: "Fissa una call con Luca domani pomeriggio, evita sovrapposizioni.",
    does: ["Controlla il calendario", "Trova uno slot libero", "Crea l'evento", "Ti manda conferma"],
    result: "Evento creato: Call con Luca, domani ore 15:00.",
    visual: "calendar"
  },
  {
    title: "Gmail capito e ordinato prima che tu apra la casella",
    plainTitle: "Gmail prioritario",
    icon: <MailCheck />,
    agent: "Giulia",
    telegram: "Dimmi quali messaggi Gmail devo leggere oggi e cosa devo fare prima.",
    does: ["Legge mittenti e contenuti", "Separa urgenze da rumore", "Prepara risposta breve", "Segna le azioni"],
    result: "5 messaggi urgenti, 2 risposte pronte, 1 documento da firmare.",
    visual: "mail"
  },
  {
    title: "Fatture e PDF trasformati in lavoro fatto",
    plainTitle: "PDF processato",
    icon: <FileText />,
    agent: "Lorenzo",
    telegram: "Prendi questa fattura, salva i dati e prepara la scheda cliente.",
    does: ["Legge il PDF", "Estrae importo e scadenza", "Compila la scheda", "Archivia il file"],
    result: "Scheda cliente pronta con P.IVA, importo, scadenza e link al PDF.",
    visual: "invoice"
  },
  {
    title: "Marketing senza fissare una riunione",
    plainTitle: "Post pronto",
    icon: <PenLine />,
    agent: "Marco",
    telegram: "Fammi un post LinkedIn per spiegare che automatizziamo il back office.",
    does: ["Capisce il messaggio", "Scrive il copy", "Propone una visual", "Prepara 3 varianti"],
    result: "Post LinkedIn pronto: titolo, testo, CTA e idea immagine.",
    visual: "marketing"
  },
  {
    title: "Lead generation spiegata semplice",
    plainTitle: "Lista contatti",
    icon: <BriefcaseBusiness />,
    agent: "Lorenzo",
    telegram: "Trovami 20 studi dentistici a Milano con Gmail o contatto pubblico e telefono.",
    does: ["Cerca aziende compatibili", "Filtra contatti inutili", "Prepara tabella", "Scrive primo messaggio"],
    result: "20 lead ordinati per zona, contatto e probabilita di risposta.",
    visual: "lead"
  },
  {
    title: "Trello aggiornato senza aprire Trello",
    plainTitle: "Board aggiornata",
    icon: <Trello />,
    agent: "Lorenzo",
    telegram: "Sposta il task del preventivo in urgente e aggiungi la scadenza di venerdi.",
    does: ["Trova la card giusta", "Aggiorna stato e scadenza", "Aggiunge checklist", "Ti conferma tutto"],
    result: "Card aggiornata, checklist inserita, scadenza venerdi ore 12:00.",
    visual: "trello"
  }
];

const features = [
  {
    title: "Parli su Telegram",
    copy: "Non installi gestionali strani. Scrivi o mandi vocali come faresti con una persona.",
    icon: <Send />
  },
  {
    title: "Ricorda il contesto",
    copy: "Clienti, preferenze, progetti, stile di comunicazione e regole operative restano in memoria.",
    icon: <BrainCircuit />
  },
  {
    title: "Lavora negli strumenti",
    copy: "Gmail, Drive, Calendar, Trello e flussi aziendali vengono collegati al tuo Motore AI.",
    icon: <PlugZap />
  }
];

const examples = [
  ["Commercialista", "Ricordami di mandargli la fattura e prepara il testo della mail."],
  ["Cliente lento", "Scrivi un follow-up gentile ma fermo per il preventivo non approvato."],
  ["Agenda piena", "Trova 30 minuti liberi questa settimana per parlare con Martina."],
  ["Post social", "Trasforma questo audio in un post LinkedIn semplice e convincente."],
  ["Documenti", "Riassumi questo PDF e dimmi le tre cose che devo fare."],
  ["Trello", "Crea una card per il nuovo cliente e metti le attivita in ordine."]
];

const onboarding = [
  "Ricevi la videoguida per aprire VPS e Motore AI. Dati, accessi e chiavi restano tuoi.",
  "Compili il caso d'uso: cosa deve fare l'agente, cosa non deve fare, che tono deve usare.",
  "Video-call di 1 ora con l'esperto: a fine chiamata il tuo team digitale e attivo su Telegram."
];

const packages = [
  {
    name: "Assistente Base",
    price: "€599",
    billing: "una tantum",
    description: "Per chi vuole iniziare con una persona digitale che gestisce il lavoro quotidiano.",
    items: ["1 agente: Giulia Assistente", "Solo Telegram", "Mail, Calendar, Drive", "Setup 1h inclusa"],
    highlighted: false
  },
  {
    name: "Top Team Personale Artificiale",
    price: "€1500",
    billing: "una tantum",
    description: "Per chi vuole tre profili specializzati che si dividono i compiti come un vero mini-team.",
    items: [
      "3 agenti: Giulia, Marco, Lorenzo",
      "Gmail, sentiment e priorita operative",
      "Trello, copywriting, PDF e lead generation",
      "Setup 1h inclusa"
    ],
    highlighted: true
  }
];

const faqs = [
  {
    question: "Devo essere un esperto informatico?",
    answer: "No. Tu usi Telegram. La parte tecnica la prepariamo insieme durante l'onboarding."
  },
  {
    question: "I dati sono al sicuro?",
    answer: "Si. La struttura e tua, gli accessi sono tuoi, le chiavi restano sotto il tuo controllo."
  },
  {
    question: "Costi ricorrenti?",
    answer: "Nessun abbonamento mensile da parte nostra. Restano solo i tuoi costi vivi: VPS e consumo del Motore AI."
  },
  {
    question: "Perche 3 agenti?",
    answer: "Perche specializzare funziona meglio. Uno segue agenda e Gmail, uno marketing, uno operazioni e documenti."
  },
  {
    question: "E se non capisco cosa chiedergli?",
    answer: "Ti diamo esempi pronti e casi d'uso. Parti copiando comandi semplici, poi l'agente impara il tuo modo di lavorare."
  },
  {
    question: "Posso usare solo un agente all'inizio?",
    answer: "Si. Puoi partire con Giulia Assistente e aggiungere Marco o Lorenzo quando capisci quali lavori vuoi delegare."
  },
  {
    question: "Funziona anche con vocali?",
    answer: "Si. Puoi scrivere o mandare vocali su Telegram: il punto e comandare il lavoro come faresti con un dipendente."
  },
  {
    question: "Serve cambiare modo di lavorare?",
    answer: "No. L'obiettivo e toglierti passaggi, non aggiungerne. Parti da Telegram e gli agenti lavorano sugli strumenti collegati."
  },
  {
    question: "Chi controlla cosa fa l'agente?",
    answer: "Tu. Possiamo impostare conferme obbligatorie per azioni sensibili come invii, modifiche importanti o aggiornamenti operativi."
  },
  {
    question: "Quanto tempo serve per vedere utilita reale?",
    answer: "Di solito appena vengono collegati Gmail, Calendar e Drive. I primi casi utili sono promemoria, sintesi, risposte e appuntamenti."
  },
  {
    question: "E se sbaglia?",
    answer: "Si corregge il comportamento con regole operative e memoria. Per le azioni critiche puoi richiedere sempre approvazione prima dell'esecuzione."
  },
  {
    question: "E se ho bisogno di cambiare funzioni o fare aggiornamenti dopo un mese?",
    answer: "Nessun problema. Essendo il sistema di tua proprietà, puoi fare le modifiche in autonomia. Se invece preferisci delegare a noi la manutenzione tecnica, puoi abbonarti al nostro 'Piano Protezione AI' (29€/mese per 2 ore di assistenza incluse) oppure prenotare un intervento orario una tantum al bisogno (59€/ora)."
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 44, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" }
};

function MotionSection({
  children,
  className = "",
  id
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.16 }}
      variants={fadeUp}
      transition={{ duration: 0.82, ease: [0.32, 0.72, 0, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-cyan [&_svg]:size-5 [&_svg]:stroke-[1.3]">
      {children}
    </span>
  );
}

function PremiumButton({
  children,
  href,
  variant = "primary"
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";

  return (
    <a
      href={href}
      className={[
        "group inline-flex items-center gap-4 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-700 ease-premium active:scale-[0.98]",
        primary
          ? "bg-vapor text-obsidian shadow-halo hover:bg-white"
          : "border border-white/15 bg-white/[0.035] text-vapor hover:border-cyan/50 hover:bg-white/[0.07]"
      ].join(" ")}
    >
      <span>{children}</span>
      <span
        className={[
          "flex size-8 items-center justify-center rounded-full transition-all duration-700 ease-premium group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105",
          primary ? "bg-obsidian text-vapor" : "bg-white/10 text-cyan"
        ].join(" ")}
      >
        <ArrowUpRight className="size-4 stroke-[1.3]" />
      </span>
    </a>
  );
}

function FluidNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-5">
        <nav className="mx-auto flex w-full max-w-[1040px] items-center justify-between rounded-full border border-white/[0.12] bg-obsidian/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <a href="#" className="flex items-center gap-3 text-sm font-semibold text-white">
            <span className="flex size-9 items-center justify-center rounded-full bg-white text-obsidian">
              <Bot className="size-4 stroke-[1.4]" />
            </span>
            Personale Artificiale
          </a>
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-white/[0.66] transition-all duration-700 ease-premium hover:bg-white/[0.08] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            onClick={() => setOpen((value) => !value)}
            className="relative flex size-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white transition-all duration-700 ease-premium lg:hidden"
          >
            <Menu className={`absolute size-4 stroke-[1.25] transition-all duration-700 ease-premium ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
            <X className={`absolute size-4 stroke-[1.25] transition-all duration-700 ease-premium ${open ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-30 bg-obsidian/90 px-6 pt-28 backdrop-blur-3xl lg:hidden"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease: [0.32, 0.72, 0, 1] }}
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-5 py-4 text-2xl font-semibold text-white"
                >
                  {item.label}
                </motion.a>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function TelegramMockup() {
  return (
    <div className="outer-shell relative mx-auto w-full max-w-[450px] rounded-[2rem] p-2 shadow-plasma">
      <div className="inner-core overflow-hidden rounded-[calc(2rem-0.5rem)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-cyan/[0.14] text-cyan">
              <Send className="size-5 stroke-[1.3]" />
            </span>
            <div>
          <p className="text-sm font-semibold text-white">Telegram · Team Digitale</p>
              <p className="text-xs text-aurora">Giulia, Marco e Lorenzo sono online</p>
            </div>
          </div>
          <span className="rounded-full border border-aurora/25 bg-aurora/10 px-3 py-1 text-xs text-aurora">attivo</span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {chatMessages.map((message, index) => (
            <motion.div
              key={message.text}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35 + index * 0.5, ease: [0.32, 0.72, 0, 1] }}
              className={`flex ${message.author === "Tu" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={[
                  "max-w-[88%] rounded-lg px-4 py-3 text-sm leading-relaxed",
                  message.author === "Tu"
                    ? "bg-vapor text-obsidian"
                    : "border border-white/10 bg-white/[0.06] text-white/[0.88]"
                ].join(" ")}
              >
                <span className="mb-1 block text-[11px] font-semibold uppercase text-current opacity-55">
                  {message.author}
                </span>
                {message.text}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 border-t border-white/[0.08]">
          {[
            ["Gmail", <MailCheck key="mail" />],
            ["Agenda", <CalendarDays key="calendar" />],
            ["Documenti", <Files key="files" />]
          ].map(([label, icon], index) => (
            <motion.div
              key={label as string}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 2.15 + index * 0.14, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-center gap-2 border-r border-white/[0.08] px-3 py-4 last:border-r-0"
            >
              <span className="text-cyan [&_svg]:size-5 [&_svg]:stroke-[1.25]">{icon}</span>
              <span className="text-xs text-white/[0.58]">{label as string}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative z-10 min-h-[100dvh] overflow-hidden px-4 pb-20 pt-32 md:pt-40">
      <div className="absolute inset-x-0 top-0 -z-10 h-[760px] bg-hero-mesh opacity-90" />
      <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 lg:grid-cols-[0.98fr_0.82fr]">
        <motion.div
          initial={{ opacity: 0, y: 46, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.95, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-[760px]"
        >
          <span className="mb-6 inline-flex rounded-full border border-cyan/[0.24] bg-cyan/[0.08] px-3 py-1 text-[10px] font-semibold uppercase text-cyan">
            Il tuo team operativo dentro Telegram
          </span>
          <h1 className="text-balance bg-shine-text bg-clip-text text-5xl font-black leading-[0.95] text-transparent sm:text-6xl xl:text-[4.45rem]">
            Smetti di rincorrere il lavoro. Assumi il tuo primo dipendente digitale.
          </h1>
          <p className="mt-7 max-w-[620px] text-pretty text-lg leading-8 text-white/70 md:text-xl">
            Tre agenti con nomi, ruoli e responsabilita chiare. Tu scrivi su Telegram.
            Loro leggono Gmail, fissano appuntamenti, preparano contenuti, aggiornano Trello
            e trasformano documenti in azioni concrete.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <PremiumButton href="#demo">Vedi esempi pratici</PremiumButton>
            <PremiumButton href="#pricing" variant="secondary">
              Scopri i Pacchetti
            </PremiumButton>
          </div>
          <div className="mt-10 grid max-w-[620px] grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Modo naturale", "Parli via messaggio come con un tuo dipendente"],
              ["Tempo recuperato", "fino a 1/2 giornata"],
              ["Setup guidato", "1 ora"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-lg font-bold text-white md:text-xl">{value}</p>
                <p className="mt-1 text-xs text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 38, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="relative"
        >
          <TelegramMockup />
        </motion.div>
      </div>
    </section>
  );
}

function AgentTeam() {
  return (
    <MotionSection id="team" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 max-w-[760px]">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            Non bot anonimi
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Li vendiamo come persone digitali: ognuno ha un mestiere preciso.
          </h2>
          <p className="mt-6 max-w-[620px] text-pretty text-lg leading-8 text-white/[0.62]">
            Se non sai cosa chiedere a una &quot;AI&quot;, pensa a una persona. A Giulia chiedi agenda
            e Gmail. A Marco chiedi marketing. A Lorenzo chiedi lavoro operativo e documenti.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {agents.map((agent) => (
            <motion.article
              key={agent.name}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
              className="outer-shell rounded-[2rem] p-2"
            >
              <div className="inner-core overflow-hidden rounded-[calc(2rem-0.5rem)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={agent.photo}
                    alt={`${agent.name}, ${agent.title}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/10 to-transparent" />
                  <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${agent.accent}`} />
                </div>
                <div className="p-6">
                  <p className="text-sm font-semibold uppercase text-cyan">{agent.title}</p>
                  <h3 className="mt-2 text-3xl font-black text-white">{agent.name}</h3>
                  <p className="mt-4 text-pretty leading-7 text-white/[0.62]">{agent.tagline}</p>
                  <div className="mt-6 grid gap-2">
                    {agent.tasks.map((task) => (
                      <div key={task} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/[0.72]">
                        <Check className="size-4 stroke-[1.4] text-aurora" />
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function DemoVisual({ type }: { type: Demo["visual"] }) {
  const base = "rounded-lg border border-white/10 bg-obsidian p-5";

  if (type === "calendar") {
    return (
      <div className={`${base} relative min-h-[340px] overflow-hidden`}>
        <MessageBubble text="Fissa con Luca domani pomeriggio" />
        <FlowLine />
        <motion.div
          initial={{ opacity: 0, x: 20, y: 36 }}
          animate={{ opacity: 1, x: 0, y: 18 }}
          transition={{ duration: 0.8, delay: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="ml-auto mt-6 w-[78%] rounded-lg border border-cyan/30 bg-cyan/10 p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-cyan">
            <CalendarDays className="size-4 stroke-[1.3]" />
            <span className="text-xs font-semibold">Calendar</span>
          </div>
          <p className="text-xl font-bold text-white">Call con Luca</p>
          <p className="mt-2 text-sm text-white/[0.58]">Domani · 15:00 · nessun conflitto</p>
        </motion.div>
      </div>
    );
  }

  if (type === "mail") {
    return (
      <div className={`${base} min-h-[340px]`}>
        <div className="mb-5 flex items-center gap-3">
          <IconWrap>
            <MailCheck />
          </IconWrap>
          <div>
            <p className="text-sm font-semibold text-white">Inbox sintetizzata</p>
            <p className="text-xs text-white/[0.48]">34 messaggi Gmail letti in background</p>
          </div>
        </div>
        {["Urgente: cliente in attesa", "Firma contratto", "Newsletter ignorabile", "Pagamento ricevuto"].map((item, index) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: index * 0.12, ease: [0.32, 0.72, 0, 1] }}
            className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3"
          >
            <span className="text-sm text-white/[0.74]">{item}</span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${index < 2 ? "bg-ember/15 text-ember" : "bg-white/10 text-white/45"}`}>
              {index < 2 ? "azione" : "bassa"}
            </span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "invoice") {
    return (
      <div className={`${base} min-h-[340px]`}>
        <div className="rounded-lg border border-ember/30 bg-ember/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-ember">
            <FileText className="size-4 stroke-[1.3]" />
            <span className="text-xs font-semibold">PDF letto</span>
          </div>
          <div className="space-y-2">
            <span className="block h-2 w-full rounded-full bg-white/[0.16]" />
            <span className="block h-2 w-4/5 rounded-full bg-white/[0.12]" />
            <span className="block h-2 w-3/5 rounded-full bg-white/10" />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 12 }}
          transition={{ duration: 0.75, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="mt-5 rounded-lg border border-aurora/30 bg-aurora/10 p-4"
        >
          <p className="text-sm font-semibold text-white">Dati estratti</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Info label="Importo" value="€1.280" />
            <Info label="Scadenza" value="30 giorni" />
            <Info label="P.IVA" value="salvata" />
            <Info label="Drive" value="archiviata" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (type === "marketing") {
    return (
      <div className={`${base} min-h-[340px]`}>
        <div className="mb-5 flex items-center gap-3">
          <IconWrap>
            <WandSparkles />
          </IconWrap>
          <div>
            <p className="text-sm font-semibold text-white">Campagna pronta</p>
            <p className="text-xs text-white/[0.48]">Copy + visual + CTA</p>
          </div>
        </div>
        {["Idea centrale", "Hook del post", "Caption", "CTA finale"].map((step, index) => (
          <div key={step} className="mb-3 rounded-lg border border-white/[0.08] bg-white/[0.035] p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
              <span>{step}</span>
              <span>{index === 3 ? "100%" : `${68 + index * 9}%`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.85, delay: index * 0.16, ease: [0.32, 0.72, 0, 1] }}
                className="h-full origin-left rounded-full bg-gradient-to-r from-plasma to-cyan"
                style={{ width: `${70 + index * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "lead") {
    return (
      <div className={`${base} min-h-[340px]`}>
        <p className="mb-4 text-sm font-semibold text-white">Lead trovati e puliti</p>
        {["Studio Aurora", "Dental Milano Nord", "Clinica Sorriso", "Ortodonzia Verdi"].map((lead, index) => (
          <motion.div
            key={lead}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.13, ease: [0.32, 0.72, 0, 1] }}
            className="mb-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3"
          >
            <div>
              <p className="text-sm font-semibold text-white">{lead}</p>
              <p className="text-xs text-white/[0.46]">contatto + telefono verificati</p>
            </div>
            <span className="rounded-full bg-aurora/12 px-2 py-1 text-xs text-aurora">{80 + index * 4}%</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className={`${base} min-h-[340px]`}>
      <div className="mb-4 flex items-center gap-3 text-plasma">
        <Trello className="size-5 stroke-[1.3]" />
        <span className="text-sm font-semibold">Trello aggiornato</span>
      </div>
      {["Preventivo cliente", "Checklist documenti", "Scadenza venerdi", "Responsabile assegnato"].map((item, index) => (
        <motion.div
          key={item}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: index * 0.12, ease: [0.32, 0.72, 0, 1] }}
          className="mb-3 flex items-center gap-3 rounded-lg border border-plasma/25 bg-plasma/10 p-3"
        >
          <ClipboardCheck className="size-4 stroke-[1.3] text-plasma" />
          <span className="text-sm text-white/[0.72]">{item}</span>
        </motion.div>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase text-white/[0.42]">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function MessageBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.72, ease: [0.32, 0.72, 0, 1] }}
      className="w-[80%] rounded-lg bg-white p-4 text-sm font-semibold text-obsidian"
    >
      {text}
    </motion.div>
  );
}

function FlowLine() {
  return (
    <motion.span
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.74, delay: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className="absolute left-[34%] top-[42%] h-px w-28 origin-left bg-cyan/70"
    />
  );
}

function DemoShowcase() {
  const [active, setActive] = useState(0);
  const current = demos[active];

  return (
    <MotionSection id="demo" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
              Demo per capirlo subito
            </span>
            <h2 className="text-balance text-4xl font-black leading-tight text-white md:text-6xl">
              Guarda cosa gli scrivi e cosa succede dopo.
            </h2>
          </div>
          <p className="max-w-md text-pretty text-base leading-7 text-white/[0.62]">
            Zero teoria. Ogni esempio parte da un messaggio Telegram reale e finisce con un risultato concreto.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.08fr]">
          <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1">
            {demos.map((demo, index) => (
              <button
                type="button"
                key={demo.title}
                onClick={() => setActive(index)}
                className={[
                  "outer-shell rounded-lg p-1 text-left transition-all duration-700 ease-premium",
                  active === index ? "shadow-halo" : "opacity-78 hover:opacity-100"
                ].join(" ")}
              >
                <div className="inner-core rounded-[calc(0.5rem-0.125rem)] p-4">
                  <div className="flex items-start gap-4">
                    <IconWrap>{demo.icon}</IconWrap>
                    <div>
                      <p className="text-xs font-semibold uppercase text-cyan">{demo.agent}</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{demo.plainTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/[0.58]">{demo.title}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="outer-shell rounded-[2rem] p-2">
            <div className="inner-core rounded-[calc(2rem-0.5rem)] p-3 md:p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.title}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.985 }}
                  transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
                  className="grid gap-5 xl:grid-cols-[0.9fr_1fr]"
                >
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-xs font-semibold uppercase text-cyan">Tu scrivi su Telegram</p>
                    <p className="mt-3 rounded-lg bg-white p-4 text-base font-semibold leading-7 text-obsidian">
                      {current.telegram}
                    </p>

                    <p className="mt-6 text-xs font-semibold uppercase text-white/[0.46]">L&apos;agente fa questo</p>
                    <div className="mt-3 space-y-2">
                      {current.does.map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-white/[0.72]">
                          <ArrowRight className="size-4 stroke-[1.3] text-cyan" />
                          {item}
                        </div>
                      ))}
                    </div>

                    <p className="mt-6 text-xs font-semibold uppercase text-aurora">Risultato finale</p>
                    <p className="mt-2 text-pretty text-lg font-bold leading-7 text-white">{current.result}</p>
                  </div>
                  <DemoVisual type={current.visual} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function SimpleExamples() {
  return (
    <MotionSection className="relative z-10 px-4 py-24 md:py-28">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-10 max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            Copia e incolla
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-5xl">
            Se non sai cosa chiedere, parti da questi comandi.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {examples.map(([title, prompt]) => (
            <div key={title} className="outer-shell rounded-lg p-1">
              <div className="inner-core min-h-[180px] rounded-[calc(0.5rem-0.125rem)] p-5">
                <p className="text-sm font-semibold uppercase text-cyan">{title}</p>
                <p className="mt-4 text-pretty text-lg font-bold leading-7 text-white">
                  &quot;{prompt}&quot;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function FeatureGrid() {
  return (
    <MotionSection id="metodo" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            Come funziona
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Tu continui a parlare. Il sistema si occupa del resto.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              whileHover={{ y: -8, rotateX: 2, rotateY: index === 1 ? 0 : index === 0 ? -2 : 2 }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
              className="outer-shell rounded-lg p-1"
            >
              <div className="inner-core min-h-[260px] rounded-[calc(0.5rem-0.125rem)] p-6">
                <IconWrap>{feature.icon}</IconWrap>
                <h3 className="mt-8 text-2xl font-bold text-white">{feature.title}</h3>
                <p className="mt-4 text-pretty leading-7 text-white/[0.58]">{feature.copy}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function OnboardingFlow() {
  return (
    <MotionSection className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1040px]">
        <div className="outer-shell rounded-[2rem] p-2">
          <div className="inner-core rounded-[calc(2rem-0.5rem)] p-6 md:p-10">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex rounded-full border border-aurora/[0.24] bg-aurora/[0.08] px-3 py-1 text-[10px] font-semibold uppercase text-aurora">
                Onboarding guidato
              </span>
              <h2 className="text-balance text-4xl font-black leading-tight md:text-5xl">
                Nessun salto nel buio: lo accendiamo insieme.
              </h2>
            </div>
            <div className="relative grid gap-6 md:grid-cols-3">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.1, ease: [0.32, 0.72, 0, 1] }}
                className="absolute left-8 right-8 top-7 hidden h-px origin-left bg-gradient-to-r from-cyan via-aurora to-plasma md:block"
              />
              {onboarding.map((step, index) => (
                <div key={step} className="relative rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="mb-8 flex size-14 items-center justify-center rounded-full border border-white/[0.12] bg-obsidian text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-pretty leading-7 text-white/[0.68]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function Pricing() {
  return (
    <MotionSection id="pricing" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
              Pricing
            </span>
            <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
              Pacchetti chiari. Niente abbonamento mensile da parte nostra.
            </h2>
          </div>
          <p className="max-w-md text-pretty leading-7 text-white/[0.62]">
            Paghi setup e configurazione. Restano solo i costi vivi della tua infrastruttura e del Motore AI.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {packages.map((pack) => (
            <article
              key={pack.name}
              className={[
                "outer-shell rounded-[2rem] p-2",
                pack.highlighted ? "shadow-plasma" : ""
              ].join(" ")}
            >
              <div className="inner-core flex min-h-[520px] flex-col rounded-[calc(2rem-0.5rem)] p-6 md:p-8">
                <div className="mb-8 flex items-start justify-between gap-5">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <IconWrap>{pack.highlighted ? <Sparkles /> : <WalletCards />}</IconWrap>
                      {pack.highlighted ? (
                        <span className="rounded-full border border-plasma/35 bg-plasma/12 px-3 py-1 text-xs font-semibold text-white">
                          Scelta consigliata
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-3xl font-black text-white">{pack.name}</h3>
                    <p className="mt-4 max-w-lg text-pretty leading-7 text-white/[0.58]">{pack.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-white">{pack.price}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-white/[0.46]">{pack.billing}</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {pack.items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-white/[0.72]">
                      <span className="flex size-6 items-center justify-center rounded-full bg-aurora/12 text-aurora">
                        <Check className="size-3.5 stroke-[1.5]" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <PremiumButton href="#enterprise" variant={pack.highlighted ? "primary" : "secondary"}>
                    Richiedi attivazione
                  </PremiumButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function MaintenanceAssistance() {
  return (
    <MotionSection className="relative z-10 px-4 pb-24 md:pb-32">
      <div className="mx-auto max-w-[1080px]">
        <div className="outer-shell rounded-[2rem] p-2">
          <div className="inner-core rounded-[calc(2rem-0.5rem)] p-6 md:p-10">
            <div className="mb-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <span className="mb-4 inline-flex rounded-full border border-aurora/[0.24] bg-aurora/[0.08] px-3 py-1 text-[10px] font-semibold uppercase text-aurora">
                  Post vendita chiaro
                </span>
                <h2 className="text-balance text-4xl font-black leading-tight md:text-5xl">
                  Manutenzione e Assistenza <span className="text-white/[0.48]">(Opzionale)</span>
                </h2>
              </div>
              <p className="text-pretty text-base leading-7 text-white/[0.64] md:text-lg">
                Il tuo assistente è di tua proprietà e non ha canoni obbligatori. Ma se vuoi che il nostro team sia sempre a tua disposizione per modifiche, aggiornamenti o nuove integrazioni, offriamo due soluzioni:
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-[1.5rem] border border-aurora/35 bg-slate-800/40 p-1 shadow-[0_0_70px_rgba(45,248,162,0.12)]"
              >
                <div className="min-h-[330px] rounded-[calc(1.5rem-0.25rem)] border border-white/10 bg-obsidian/80 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
                  <div className="mb-7 flex items-start justify-between gap-4">
                    <IconWrap>
                      <ShieldCheck />
                    </IconWrap>
                    <span className="rounded-full border border-aurora/35 bg-aurora/12 px-3 py-1 text-[10px] font-black uppercase text-aurora">
                      Consigliato
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-white">Piano Protezione AI</h3>
                  <div className="mt-5 flex items-end gap-2">
                    <p className="text-5xl font-black text-white">€29</p>
                    <p className="pb-2 text-sm font-semibold text-white/[0.52]">/mese</p>
                  </div>
                  <p className="mt-6 text-pretty text-lg leading-8 text-white/[0.66]">
                    Include fino a 2 ore al mese di intervento tecnico dedicato da parte di un nostro AI Expert direttamente sulla tua VPS, su tua richiesta.
                  </p>
                  <div className="mt-7 rounded-lg border border-aurora/20 bg-aurora/[0.08] p-4 text-sm font-semibold text-aurora">
                    Ideale se vuoi evolvere l&apos;assistente ogni mese senza pensare alla parte tecnica.
                  </div>
                </div>
              </motion.article>

              <motion.article
                whileHover={{ y: -6 }}
                transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-[1.5rem] border border-white/12 bg-slate-800/40 p-1"
              >
                <div className="min-h-[330px] rounded-[calc(1.5rem-0.25rem)] border border-white/10 bg-obsidian/72 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
                  <div className="mb-7 flex items-start justify-between gap-4">
                    <IconWrap>
                      <Clock3 />
                    </IconWrap>
                    <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.54]">
                      Al bisogno
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-white">Intervento Singolo</h3>
                  <div className="mt-5 flex items-end gap-2">
                    <p className="text-5xl font-black text-white">€59</p>
                    <p className="pb-2 text-sm font-semibold text-white/[0.52]">/ora</p>
                  </div>
                  <p className="mt-6 text-pretty text-lg leading-8 text-white/[0.66]">
                    Non vuoi abbonamenti? Nessun problema. Puoi richiedere assistenza tecnica pay-as-you-go e farti affiancare da un tecnico solo quando ne hai effettivamente bisogno.
                  </p>
                  <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold text-white/[0.62]">
                    Perfetto se prevedi modifiche rare o vuoi tenere la massima libertà.
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function EnterpriseForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    window.setTimeout(() => setStatus("success"), 1100);
  }

  return (
    <MotionSection id="enterprise" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1080px] gap-8 lg:grid-cols-[0.72fr_1fr]">
        <div className="pt-3">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            Aziende strutturate
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Ti disegniamo un reparto digitale su misura.
          </h2>
          <p className="mt-6 text-pretty text-lg leading-8 text-white/[0.62]">
            Se hai processi, reparti, clienti e volumi piu alti, partiamo da una mappa operativa:
            cosa delegare, quali strumenti collegare, quali controlli mantenere.
          </p>
        </div>

        <div className="outer-shell rounded-[2rem] p-2">
          <form onSubmit={handleSubmit} className="inner-core rounded-[calc(2rem-0.5rem)] p-5 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome" name="name" placeholder="Mario Rossi" />
              <Field label="Gmail aziendale" name="email" type="email" placeholder="mario@azienda.it" />
              <Field label="Telefono" name="phone" placeholder="+39 333 000 0000" />
              <Field label="P.IVA" name="vat" placeholder="IT00000000000" />
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-white/[0.72]">Fascia Fatturato</span>
                <select
                  name="revenue"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition-all duration-700 ease-premium focus:border-cyan/60"
                >
                  <option className="bg-obsidian" value="">
                    Seleziona una fascia
                  </option>
                  <option className="bg-obsidian">0 - 250k</option>
                  <option className="bg-obsidian">250k - 1M</option>
                  <option className="bg-obsidian">1M - 5M</option>
                  <option className="bg-obsidian">5M+</option>
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-white/[0.72]">Descrizione</span>
                <textarea
                  name="description"
                  required
                  rows={5}
                  placeholder="Esempio: voglio gestire Gmail clienti, preventivi, Trello e post social da Telegram."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition-all duration-700 ease-premium placeholder:text-white/32 focus:border-cyan/60"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={status === "loading"}
                className="group inline-flex w-full items-center justify-center gap-4 rounded-full bg-vapor px-5 py-2.5 text-sm font-semibold text-obsidian shadow-halo transition-all duration-700 ease-premium active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 sm:w-auto"
              >
                <span>{status === "loading" ? "Invio in corso..." : "Invia richiesta"}</span>
                <span className="flex size-8 items-center justify-center rounded-full bg-obsidian text-vapor transition-all duration-700 ease-premium group-hover:translate-x-1 group-hover:-translate-y-px">
                  <ArrowUpRight className="size-4 stroke-[1.3]" />
                </span>
              </button>
              <AnimatePresence>
                {status === "success" ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                    className="text-sm font-semibold text-aurora"
                  >
                    Richiesta ricevuta. Ti ricontattiamo a breve.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>
    </MotionSection>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-white/[0.72]">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition-all duration-700 ease-premium placeholder:text-white/32 focus:border-cyan/60"
      />
    </label>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <MotionSection className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-10 text-center">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            FAQ
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Domande che fanno tutti prima di capire quanto e utile.
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="outer-shell rounded-lg p-1">
              <div className="inner-core rounded-[calc(0.5rem-0.125rem)]">
                <button
                  type="button"
                  onClick={() => setOpen(open === index ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                >
                  <span className="text-lg font-bold text-white">{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 stroke-[1.3] text-cyan transition-transform duration-700 ease-premium ${open === index ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open === index ? (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                      className="px-5 pb-5 text-white/[0.62]"
                    >
                      {faq.answer}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function TrustStrip() {
  const stats = useMemo(
    () => [
      { icon: <ShieldCheck />, label: "Dati e chiavi restano tuoi" },
      { icon: <Clock3 />, label: "Operativo 24/7" },
      { icon: <Building2 />, label: "Pensato per processi aziendali" },
      { icon: <MessageCircle />, label: "Comandi testuali e vocali via Telegram" }
    ],
    []
  );

  return (
    <MotionSection className="relative z-10 px-4 py-16">
      <div className="mx-auto grid max-w-[1080px] gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 text-cyan [&_svg]:size-5 [&_svg]:stroke-[1.3]">{stat.icon}</div>
            <p className="text-sm font-semibold text-white/[0.72]">{stat.label}</p>
          </div>
        ))}
      </div>
    </MotionSection>
  );
}

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <FluidNav />
      <Hero />
      <TrustStrip />
      <AgentTeam />
      <DemoShowcase />
      <SimpleExamples />
      <FeatureGrid />
      <OnboardingFlow />
      <Pricing />
      <MaintenanceAssistance />
      <EnterpriseForm />
      <FAQ />
      <footer className="relative z-10 border-t border-white/10 px-4 py-10">
        <div className="mx-auto flex max-w-[1080px] flex-col justify-between gap-4 text-sm text-white/[0.46] md:flex-row">
          <p>© 2026 Personale Artificiale</p>
          <p>Team digitali AI su Telegram.</p>
        </div>
      </footer>
    </main>
  );
}
