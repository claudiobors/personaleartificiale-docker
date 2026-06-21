"use client";

import { FormEvent, ReactNode, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  MailCheck,
  Menu,
  MessageCircle,
  PenLine,
  PlugZap,
  Send,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";

type Agent = {
  name: string;
  role: string;
  photo: string;
  imagePosition: string;
  promise: string;
  tasks: string[];
};

type Demo = {
  title: string;
  agent: string;
  request: string;
  result: string;
  icon: ReactNode;
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
    name: "Roberta",
    role: "Segreteria, agenda e Gmail",
    photo: "/agents/roberta.png",
    imagePosition: "object-[center_18%]",
    promise:
      "Tiene il ritmo della giornata: legge la posta, prepara risposte, organizza appuntamenti e ti avvisa prima che qualcosa scappi.",
    tasks: ["Gmail prioritario", "Appuntamenti", "Follow-up", "Drive ordinato"]
  },
  {
    name: "Luca",
    role: "Marketing, idee e contenuti",
    photo: "/agents/luca.png",
    imagePosition: "object-[center_18%]",
    promise:
      "Trasforma vocali, appunti e idee sparse in post, campagne, caption, varianti e testi pronti da pubblicare.",
    tasks: ["Post social", "Calendari editoriali", "Hook", "Tono di brand"]
  },
  {
    name: "Simone",
    role: "Operazioni, documenti e dati",
    photo: "/agents/simone.png",
    imagePosition: "object-[center_18%]",
    promise:
      "Legge PDF, controlla ordini, prepara schede cliente, organizza dati e segnala cosa va fatto prima.",
    tasks: ["PDF e fatture", "Lead", "Ordini", "Tabelle operative"]
  }
];

const demos: Demo[] = [
  {
    title: "Calendario senza ping-pong",
    agent: "Roberta",
    request: "Fissa una call con Davide domani pomeriggio, evita sovrapposizioni.",
    result: "Evento creato, promemoria impostato, nota pronta per arrivare preparato.",
    icon: <CalendarDays />
  },
  {
    title: "Gmail gia filtrata",
    agent: "Roberta",
    request: "Dimmi quali messaggi devo leggere oggi e cosa devo fare prima.",
    result: "5 messaggi urgenti, 2 risposte pronte, 1 documento da firmare.",
    icon: <MailCheck />
  },
  {
    title: "PDF trasformati in lavoro",
    agent: "Simone",
    request: "Prendi questa fattura, salva i dati e prepara la scheda cliente.",
    result: "Scheda pronta con importo, scadenza, link al file e prossimo task.",
    icon: <FileText />
  },
  {
    title: "Marketing senza riunioni",
    agent: "Luca",
    request: "Fammi un post LinkedIn per spiegare che automatizziamo il back office.",
    result: "Hook, testo, CTA, idea visual e tre versioni alternative.",
    icon: <PenLine />
  }
];

const examples = [
  ["Commercialista", "Ricordami di mandargli la fattura e prepara il testo della mail."],
  ["Cliente lento", "Scrivi un follow-up gentile ma fermo per il preventivo non approvato."],
  ["Agenda piena", "Trova 30 minuti liberi questa settimana per parlare con Martina."],
  ["Post social", "Trasforma questo audio in un post LinkedIn semplice e convincente."],
  ["Documenti", "Riassumi questo PDF e dimmi le tre cose che devo fare."],
  ["Operazioni", "Controlla gli ordini in ritardo e dimmi quali clienti devo aggiornare oggi."]
];

const method = [
  {
    title: "Apri la base tecnica",
    copy: "Ricevi una videoguida per VPS e Motore AI. Dati, accessi e chiavi restano tuoi.",
    icon: <ShieldCheck />
  },
  {
    title: "Disegni il caso d'uso",
    copy: "Definiamo cosa deve fare l'agente, cosa non deve fare e quale tono deve usare.",
    icon: <BrainCircuit />
  },
  {
    title: "Entra in Telegram",
    copy: "In una video-call di setup il tuo team digitale diventa operativo dove gia scrivi ogni giorno.",
    icon: <MessageCircle />
  }
];

const packages = [
  {
    name: "Assistente Base",
    price: "599 euro",
    billing: "una tantum",
    description: "Per iniziare con Roberta e liberare la giornata da posta, agenda e promemoria.",
    items: ["1 agente", "Telegram", "Gmail, Calendar, Drive", "Setup guidato 1 ora"],
    highlighted: false
  },
  {
    name: "Top Team Personale Artificiale",
    price: "1500 euro",
    billing: "una tantum",
    description: "Per avere tre profili specializzati che si dividono il lavoro come un mini reparto.",
    items: ["3 agenti", "Marketing e contenuti", "PDF, lead e operazioni", "Onboarding guidato"],
    highlighted: true
  }
];

const faqs = [
  {
    question: "Devo essere un esperto informatico?",
    answer: "No. Tu usi Telegram. La parte tecnica viene preparata durante l'onboarding."
  },
  {
    question: "I dati sono al sicuro?",
    answer: "Si. La struttura e tua, gli accessi sono tuoi, le chiavi restano sotto il tuo controllo."
  },
  {
    question: "Ci sono costi ricorrenti?",
    answer: "Nessun abbonamento mensile obbligatorio. Restano solo VPS e consumo del Motore AI."
  },
  {
    question: "Funziona anche con vocali?",
    answer: "Si. Puoi scrivere o mandare vocali su Telegram come faresti con un collaboratore."
  },
  {
    question: "Chi controlla cosa fa l'agente?",
    answer: "Tu. Per azioni sensibili si possono impostare conferme obbligatorie prima dell'esecuzione."
  },
  {
    question: "Posso modificarlo dopo il setup?",
    answer:
      "Si. Puoi intervenire in autonomia o richiedere assistenza tecnica con il Piano Protezione AI o con interventi singoli."
  }
];

const sectionMotion = {
  hidden: { opacity: 0, y: 34, filter: "blur(8px)" },
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
      viewport={{ once: true, amount: 0.18 }}
      variants={sectionMotion}
      transition={{ duration: 0.72, ease: [0.22, 0.86, 0.18, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo-pa-transparent.png"
      alt="Personale Artificiale"
      width={760}
      height={520}
      priority
      className={className}
    />
  );
}

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-black/10 bg-white text-ink shadow-[0_12px_40px_rgba(1,19,56,0.08)] [&_svg]:size-5 [&_svg]:stroke-[1.6]">
      {children}
    </span>
  );
}

function ButtonLink({
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
        "group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-5 text-sm font-bold transition duration-500 ease-premium active:translate-y-px",
        primary
          ? "bg-ink text-white shadow-[0_18px_50px_rgba(0,57,255,0.20)] hover:bg-blue"
          : "border border-ink/15 bg-white/70 text-ink hover:border-blue/50 hover:text-blue"
      ].join(" ")}
    >
      <span>{children}</span>
      <ArrowUpRight className="size-4 stroke-[1.8] transition duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

function FluidNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <nav className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between rounded-full border border-ink/10 bg-white/78 px-4 shadow-[0_18px_70px_rgba(1,19,56,0.10)] backdrop-blur-2xl">
          <a href="#" className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(1,19,56,0.08)]">
              <Logo className="h-9 w-12 object-contain" />
            </span>
            <span className="leading-none">
              <span className="block text-sm font-black tracking-tight text-ink">PersonaleArtificiale</span>
              <span className="mt-1 hidden text-[11px] font-semibold text-ink/50 sm:block">
                Un aiuto concreto nelle attivita quotidiane
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink/58 transition duration-500 hover:bg-ink/[0.055] hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:block">
            <ButtonLink href="#pricing">Configura il team</ButtonLink>
          </div>

          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            onClick={() => setOpen((value) => !value)}
            className="relative grid size-11 place-items-center rounded-full border border-ink/10 bg-white text-ink lg:hidden"
          >
            <Menu className={`absolute size-5 transition duration-500 ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
            <X className={`absolute size-5 transition duration-500 ${open ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.42, ease: [0.22, 0.86, 0.18, 1] }}
            className="fixed inset-0 z-40 bg-paper/96 px-5 pt-28 backdrop-blur-2xl lg:hidden"
          >
            <div className="grid gap-3">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[22px] border border-ink/10 bg-white px-5 py-4 text-2xl font-black text-ink"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pt-28">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(0,57,255,0.10),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(0,57,255,0.12),transparent_28%)]" />
      <div className="mx-auto grid min-h-[calc(100dvh-7rem)] max-w-[1180px] items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 0.86, 0.18, 1] }}
          className="max-w-[680px]"
        >
          <p className="mb-5 inline-flex rounded-full border border-blue/18 bg-white/72 px-4 py-2 text-sm font-bold text-blue shadow-[0_14px_50px_rgba(0,57,255,0.10)]">
            Team digitali AI su Telegram
          </p>
          <h1 className="text-balance text-[clamp(3.5rem,8vw,7.6rem)] font-black leading-[0.88] tracking-tight text-ink">
            Il lavoro ripetitivo trova finalmente personale.
          </h1>
          <p className="mt-7 max-w-[58ch] text-lg leading-8 text-ink/66 md:text-xl">
            Personale Artificiale costruisce agenti che leggono, organizzano, scrivono, ricordano e aggiornano strumenti aziendali mentre tu continui a parlare su Telegram.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#pricing">Vedi i pacchetti</ButtonLink>
            <ButtonLink href="#demo" variant="secondary">Guarda cosa fa</ButtonLink>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 0.86, 0.18, 1] }}
          className="relative mx-auto w-full max-w-[620px]"
        >
          <div className="absolute -inset-8 -z-10 rounded-[44px] bg-blue/[0.08] blur-3xl" />
          <div className="relative overflow-hidden rounded-[34px] border border-ink/10 bg-white p-4 shadow-[0_36px_120px_rgba(1,19,56,0.16)]">
            <div className="grid min-h-[430px] place-items-center rounded-[26px] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] p-8">
              <Logo className="w-full max-w-[520px] drop-shadow-[0_20px_30px_rgba(1,19,56,0.14)]" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 grid gap-2 rounded-[22px] border border-ink/10 bg-white/86 p-4 shadow-[0_18px_60px_rgba(1,19,56,0.12)] backdrop-blur-xl sm:grid-cols-3">
              {["Gmail", "Calendar", "Drive"].map((item) => (
                <div key={item} className="rounded-[16px] bg-ink/[0.04] px-4 py-3 text-sm font-black text-ink">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const stats = [
    ["24/7", "Sempre operativo"],
    ["3", "Profili specializzati"],
    ["0", "Nuovi pannelli da imparare"],
    ["100%", "Accessi sotto il tuo controllo"]
  ];

  return (
    <MotionSection className="px-4 py-10">
      <div className="mx-auto grid max-w-[1180px] border-y border-ink/10 md:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="px-2 py-7 md:border-l md:border-ink/10 md:first:border-l-0">
            <p className="text-4xl font-black tracking-tight text-ink">{value}</p>
            <p className="mt-1 text-sm font-semibold text-ink/55">{label}</p>
          </div>
        ))}
      </div>
    </MotionSection>
  );
}

function AgentTeam() {
  return (
    <MotionSection id="team" className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[760px]">
          <h2 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-ink md:text-7xl">
            Non un chatbot. Un reparto con ruoli chiari.
          </h2>
          <p className="mt-6 text-lg leading-8 text-ink/62">
            Ogni agente ha un perimetro preciso, una memoria operativa e un modo di lavorare riconoscibile. Cosi non chiedi &quot;all&apos;AI&quot;, chiedi alla persona digitale giusta.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {agents.map((agent, index) => (
            <motion.article
              key={agent.name}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 0.86, 0.18, 1] }}
              className={[
                "group overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-[0_26px_90px_rgba(1,19,56,0.10)]",
                index === 1 ? "lg:mt-12" : ""
              ].join(" ")}
            >
              <div className="relative aspect-[4/4.8] overflow-hidden bg-[#edf2ff]">
                <Image src={agent.photo} alt={agent.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className={`object-cover ${agent.imagePosition}`} />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/58 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-4xl font-black tracking-tight">{agent.name}</p>
                  <p className="mt-1 text-sm font-bold text-white/78">{agent.role}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-base leading-7 text-ink/68">{agent.promise}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {agent.tasks.map((task) => (
                    <span key={task} className="rounded-full border border-blue/12 bg-blue/[0.055] px-3 py-1.5 text-xs font-bold text-blue">
                      {task}
                    </span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function DemoShowcase() {
  const [active, setActive] = useState(0);
  const demo = demos[active];

  return (
    <MotionSection id="demo" className="px-4 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <div>
          <h2 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-ink md:text-7xl">
            Scrivi una richiesta. Vedi lavoro finito.
          </h2>
          <p className="mt-6 text-lg leading-8 text-ink/62">
            La differenza non e la risposta. E tutto quello che succede dopo: controllo degli strumenti, preparazione, archiviazione e conferma.
          </p>
          <div className="mt-8 grid gap-2">
            {demos.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActive(index)}
                className={[
                  "flex items-center justify-between rounded-[18px] border px-4 py-4 text-left transition duration-500",
                  active === index
                    ? "border-blue/35 bg-blue text-white shadow-[0_18px_60px_rgba(0,57,255,0.20)]"
                    : "border-ink/10 bg-white text-ink hover:border-blue/30"
                ].join(" ")}
              >
                <span className="font-black">{item.title}</span>
                <ArrowRight className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-ink/10 bg-ink p-3 text-white shadow-[0_34px_120px_rgba(1,19,56,0.22)]">
          <div className="rounded-[24px] border border-white/10 bg-[#07111f] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconWrap>{demo.icon}</IconWrap>
                <div>
                  <p className="font-black">{demo.agent}</p>
                  <p className="text-sm text-white/52">Telegram operativo</p>
                </div>
              </div>
              <Sparkles className="size-5 text-electric" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={demo.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 0.86, 0.18, 1] }}
                className="grid gap-4"
              >
                <div className="ml-auto max-w-[82%] rounded-[22px] bg-white px-5 py-4 text-ink">
                  <p className="text-sm font-bold text-blue">Tu</p>
                  <p className="mt-2 leading-7">{demo.request}</p>
                </div>
                <div className="max-w-[86%] rounded-[22px] border border-white/10 bg-white/[0.08] px-5 py-4">
                  <p className="text-sm font-bold text-electric">{demo.agent}</p>
                  <p className="mt-2 leading-7 text-white/82">{demo.result}</p>
                </div>
                <div className="mt-4 grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.055] p-4 sm:grid-cols-3">
                  {["Capisce", "Esegue", "Conferma"].map((step) => (
                    <div key={step} className="rounded-[16px] bg-white px-4 py-4 text-sm font-black text-ink">
                      {step}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function SimpleExamples() {
  return (
    <MotionSection className="px-4 py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-px overflow-hidden rounded-[28px] border border-ink/10 bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
          {examples.map(([label, text]) => (
            <div key={label} className="bg-white p-6">
              <p className="text-sm font-black text-blue">{label}</p>
              <p className="mt-4 text-xl font-black leading-snug tracking-tight text-ink">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: "Parli su Telegram",
      copy: "Nessun pannello nuovo. Scrivi o mandi vocali come faresti con una persona.",
      icon: <Send />
    },
    {
      title: "Ricorda il contesto",
      copy: "Clienti, preferenze, progetti, stile di comunicazione e regole restano in memoria.",
      icon: <BrainCircuit />
    },
    {
      title: "Lavora negli strumenti",
      copy: "Gmail, Drive, Calendar, CRM, gestionali e board operative vengono collegati al tuo Motore AI.",
      icon: <PlugZap />
    }
  ];

  return (
    <MotionSection className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="rounded-[34px] bg-ink p-4 text-white shadow-[0_36px_130px_rgba(1,19,56,0.24)]">
          <div className="grid gap-8 rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,#07111f,#020817)] p-6 md:p-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                La parte semplice resta semplice.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/64">
                Il sistema e potente dietro le quinte, ma l&apos;esperienza per chi lo usa resta immediata: messaggio, azione, conferma.
              </p>
            </div>
            <div className="grid gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-[22px] border border-white/10 bg-white/[0.07] p-5">
                  <div className="mb-5 text-electric [&_svg]:size-6 [&_svg]:stroke-[1.5]">{feature.icon}</div>
                  <h3 className="text-2xl font-black">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-white/62">{feature.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function OnboardingFlow() {
  return (
    <MotionSection id="metodo" className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <h2 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-ink md:text-7xl">
            Dal primo messaggio al primo lavoro fatto.
          </h2>
          <p className="text-lg leading-8 text-ink/62">
            L&apos;onboarding serve a trasformare un agente generico in personale che conosce strumenti, regole e priorita della tua attivita.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {method.map((step, index) => (
            <div key={step.title} className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(1,19,56,0.08)]">
              <div className="mb-8 flex items-center justify-between">
                <IconWrap>{step.icon}</IconWrap>
                <span className="text-5xl font-black tracking-tight text-ink/10">{index + 1}</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-ink">{step.title}</h3>
              <p className="mt-4 leading-7 text-ink/62">{step.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function Pricing() {
  return (
    <MotionSection id="pricing" className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[760px]">
          <h2 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-ink md:text-7xl">
            Parti piccolo o costruisci subito il team.
          </h2>
          <p className="mt-6 text-lg leading-8 text-ink/62">
            Paghi la configurazione iniziale. Il sistema resta tuo, con costi vivi separati per VPS e Motore AI.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {packages.map((item) => (
            <article
              key={item.name}
              className={[
                "rounded-[32px] border p-6 shadow-[0_28px_100px_rgba(1,19,56,0.10)]",
                item.highlighted ? "border-blue/24 bg-blue text-white" : "border-ink/10 bg-white text-ink"
              ].join(" ")}
            >
              <div className="mb-10 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black tracking-tight">{item.name}</h3>
                  <p className={`mt-3 leading-7 ${item.highlighted ? "text-white/70" : "text-ink/62"}`}>{item.description}</p>
                </div>
                <WalletCards className="size-7 shrink-0 stroke-[1.5]" />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-5xl font-black tracking-tight">{item.price}</p>
                <p className={`pb-2 text-sm font-bold ${item.highlighted ? "text-white/64" : "text-ink/52"}`}>{item.billing}</p>
              </div>
              <div className="mt-8 grid gap-3">
                {item.items.map((benefit) => (
                  <div key={benefit} className={`flex items-center gap-3 rounded-[16px] px-4 py-3 text-sm font-bold ${item.highlighted ? "bg-white/12" : "bg-ink/[0.045]"}`}>
                    <Check className="size-4 shrink-0 stroke-[1.8]" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <ButtonLink href="#enterprise" variant={item.highlighted ? "secondary" : "primary"}>
                  Richiedi disponibilita
                </ButtonLink>
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
    <MotionSection className="px-4 py-20">
      <div className="mx-auto max-w-[1180px] rounded-[34px] border border-ink/10 bg-white p-6 shadow-[0_30px_100px_rgba(1,19,56,0.10)] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-balance text-4xl font-black leading-tight tracking-tight text-ink md:text-6xl">
              Assistenza quando vuoi evolvere.
            </h2>
            <p className="mt-5 leading-8 text-ink/62">
              Il tuo assistente e di tua proprieta. Se preferisci delegare manutenzione, aggiornamenti o nuove integrazioni, hai due strade.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-ink p-5 text-white">
              <IconWrap>
                <ShieldCheck />
              </IconWrap>
              <h3 className="mt-6 text-2xl font-black">Piano Protezione AI</h3>
              <p className="mt-3 text-4xl font-black">29 euro/mese</p>
              <p className="mt-4 leading-7 text-white/64">2 ore di assistenza, aggiornamenti periodici e priorita sui nuovi agenti.</p>
            </div>
            <div className="rounded-[24px] border border-ink/10 bg-paper p-5">
              <IconWrap>
                <Clock3 />
              </IconWrap>
              <h3 className="mt-6 text-2xl font-black text-ink">Intervento singolo</h3>
              <p className="mt-3 text-4xl font-black text-ink">59 euro/ora</p>
              <p className="mt-4 leading-7 text-ink/62">Assistenza tecnica al bisogno, senza abbonamenti e senza vincoli.</p>
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
    window.setTimeout(() => setStatus("success"), 900);
  }

  return (
    <MotionSection id="enterprise" className="px-4 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside>
          <h2 className="text-balance text-5xl font-black leading-[0.95] tracking-tight text-ink md:text-7xl">
            Progetti aziendali con processi reali.
          </h2>
          <p className="mt-6 text-lg leading-8 text-ink/62">
            Se hai CRM, gestionali, ordini, report o approvazioni interne, partiamo da una mappa operativa prima di automatizzare.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Integrazioni con strumenti esistenti",
              "Controllo ordini, stati e anomalie",
              "Comunicazioni clienti con approvazione",
              "Report e KPI di reparto"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[18px] border border-ink/10 bg-white px-4 py-3 font-bold text-ink">
                <Check className="size-4 text-blue" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-ink/10 bg-white p-5 shadow-[0_30px_110px_rgba(1,19,56,0.12)] md:p-8">
          <div className="mb-7 flex items-center gap-3">
            <IconWrap>
              <Building2 />
            </IconWrap>
            <div>
              <p className="text-xl font-black text-ink">Richiesta progetto</p>
              <p className="text-sm font-semibold text-ink/52">Risposta dopo una prima valutazione del caso.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome" name="name" placeholder="Mario Rossi" />
            <Field label="Email aziendale" name="email" type="email" placeholder="mario@azienda.it" />
            <Field label="Telefono" name="phone" placeholder="+39 333 000 0000" />
            <Field label="Partita IVA" name="vat" placeholder="IT00000000000" />
            <SelectField label="Dimensione azienda" name="company_size" options={["1 - 5 persone", "6 - 20 persone", "21 - 50 persone", "50+ persone"]} />
            <SelectField
              label="Tipo di progetto"
              name="complexity"
              options={["Gestionale o CRM", "Ordini e stati operativi", "Comunicazioni clienti", "Analisi dati e report"]}
            />
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-ink/68">Processi, strumenti e colli di bottiglia</span>
              <textarea
                name="description"
                required
                rows={6}
                placeholder="Esempio: abbiamo ordini su gestionale, richieste clienti su Gmail, preventivi su Drive e dati di reparto da analizzare."
                className="w-full resize-none rounded-[18px] border border-ink/12 bg-paper px-4 py-3 text-ink outline-none transition duration-500 placeholder:text-ink/35 focus:border-blue/55 focus:bg-white"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-ink px-5 text-sm font-bold text-white transition duration-500 hover:bg-blue active:translate-y-px disabled:cursor-wait disabled:opacity-70"
            >
              <span>{status === "loading" ? "Invio in corso..." : "Invia richiesta"}</span>
              <ArrowUpRight className="size-4 stroke-[1.8]" />
            </button>
            <AnimatePresence>
              {status === "success" ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-sm font-bold text-blue"
                >
                  Richiesta ricevuta. Ti ricontattiamo a breve.
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </form>
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
      <span className="mb-2 block text-sm font-bold text-ink/68">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-[18px] border border-ink/12 bg-paper px-4 py-3 text-ink outline-none transition duration-500 placeholder:text-ink/35 focus:border-blue/55 focus:bg-white"
      />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink/68">{label}</span>
      <select
        name={name}
        required
        className="w-full rounded-[18px] border border-ink/12 bg-paper px-4 py-3 text-ink outline-none transition duration-500 focus:border-blue/55 focus:bg-white"
      >
        <option value="">Seleziona</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <MotionSection className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[940px]">
        <h2 className="text-center text-5xl font-black leading-[0.95] tracking-tight text-ink md:text-7xl">
          Domande prima di delegare davvero.
        </h2>
        <div className="mt-12 grid gap-3">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="overflow-hidden rounded-[22px] border border-ink/10 bg-white">
              <button
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left"
              >
                <span className="text-lg font-black text-ink">{faq.question}</span>
                <ChevronDown className={`size-5 shrink-0 text-blue transition duration-500 ${open === index ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {open === index ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 0.86, 0.18, 1] }}
                  >
                    <p className="px-5 pb-5 leading-7 text-ink/62">{faq.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </div>
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
      <footer className="border-t border-ink/10 px-4 py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-6 text-sm font-semibold text-ink/52 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(1,19,56,0.08)]">
              <Logo className="h-9 w-12 object-contain" />
            </span>
            <div>
              <p className="font-black text-ink">PersonaleArtificiale</p>
              <p className="mt-1">Copyright 2026. Un aiuto concreto nelle attivita quotidiane.</p>
            </div>
          </div>
          <a href="#enterprise" className="inline-flex items-center gap-2 text-ink transition hover:text-blue">
            Parliamo del tuo processo
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </footer>
    </main>
  );
}
