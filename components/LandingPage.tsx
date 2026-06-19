"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Files,
  MailCheck,
  Menu,
  MessageCircle,
  Mic2,
  PenLine,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Trello,
  WalletCards,
  WandSparkles,
  X
} from "lucide-react";

type Power = {
  title: string;
  eyebrow: string;
  copy: string;
  icon: ReactNode;
  visual: "calendar" | "marketing" | "automation";
};

const navItems = [
  { label: "Azione", href: "#azione" },
  { label: "Metodo", href: "#come-funziona" },
  { label: "Prezzi", href: "#pricing" },
  { label: "Enterprise", href: "#enterprise" }
];

const chatMessages = [
  {
    author: "AI",
    text: "Buongiorno! Email analizzate, call delle 15:00 fissata, fattura salvata su Drive. Procedo con il post LinkedIn?"
  },
  {
    author: "Tu",
    text: "Procedi e ricordami il commercialista alle 18."
  },
  {
    author: "AI",
    text: "Fatto. Reminder impostato. 👍"
  }
];

const powers: Power[] = [
  {
    title: "Gestione Calendario",
    eyebrow: "Agenda autonoma",
    copy: "Gli scrivi su WhatsApp, lui fissa l'appuntamento sul tuo Calendar senza conflitti.",
    icon: <CalendarDays />,
    visual: "calendar"
  },
  {
    title: "Team Marketing",
    eyebrow: "Contenuti pronti",
    copy: "Il tuo Responsabile Marketing digitale crea post, copy e immagini in pochi secondi.",
    icon: <PenLine />,
    visual: "marketing"
  },
  {
    title: "Automazione Aziendale",
    eyebrow: "Operazioni sincronizzate",
    copy: "Il Collaboratore aggiorna Trello, estrapola dati dai documenti e fa lead generation per te.",
    icon: <Trello />,
    visual: "automation"
  }
];

const features = [
  {
    title: "Interfaccia Umana",
    copy: "Nessun software da imparare. Usi messaggi o vocali su WhatsApp/Telegram.",
    icon: <Mic2 />
  },
  {
    title: "Memoria a Lungo Termine",
    copy: "Ricorda clienti, progetti passati e preferenze operative.",
    icon: <BrainCircuit />
  },
  {
    title: "Connessione Totale",
    copy: "Integrato nativamente con Email, Drive, Calendar e Trello.",
    icon: <PlugZap />
  }
];

const onboarding = [
  "Ricevi la videoguida per aprire VPS e OpenAI. Dati e chiavi restano tuoi.",
  "Compili il caso d'uso per istruire la tua AI.",
  "Video-call di 1 ora con l'Esperto: fine chiamata, AI installata e attiva sul tuo telefono."
];

const packages = [
  {
    name: "Assistente Base",
    price: "€399",
    description: "Per professionisti che vogliono togliere attrito da email, agenda e file.",
    items: ["1 Agente Assistente", "WhatsApp/Telegram", "Mail, Calendar, Drive", "Setup 1h inclusa"],
    highlighted: false
  },
  {
    name: "Top Team Personale Artificiale",
    price: "€999",
    description: "Per chi vuole un piccolo reparto digitale già diviso per responsabilità.",
    items: [
      "3 Agenti: Assistente, Marketing, Collaboratore",
      "Sentiment email e priorità operative",
      "Trello, copywriting e immagini",
      "Setup 1h inclusa"
    ],
    highlighted: true
  }
];

const faqs = [
  {
    question: "Devo essere un esperto informatico?",
    answer: "No, usi solo WhatsApp e ti guidiamo noi."
  },
  {
    question: "I dati sono al sicuro?",
    answer: "Sì, VPS tua, chiavi tue."
  },
  {
    question: "Costi ricorrenti?",
    answer: "Nessun abbonamento nostro. Solo i tuoi costi vivi di VPS (pochi €) e token OpenAI."
  },
  {
    question: "Perché 3 agenti?",
    answer: "Specializzazione. Si dividono i task lavorando in sinergia."
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
      viewport={{ once: true, amount: 0.18 }}
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
        <nav className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-white/[0.12] bg-obsidian/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <a href="#" className="flex items-center gap-3 text-sm font-semibold text-white">
            <span className="flex size-9 items-center justify-center rounded-full bg-white text-obsidian">
              <Bot className="size-4 stroke-[1.4]" />
            </span>
            Personale Artificiale
          </a>
          <div className="hidden items-center gap-1 md:flex">
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
            className="relative flex size-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white transition-all duration-700 ease-premium md:hidden"
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
            className="fixed inset-0 z-30 bg-obsidian/90 px-6 pt-28 backdrop-blur-3xl md:hidden"
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

function AnimatedMockup() {
  return (
    <div className="outer-shell relative mx-auto w-full max-w-[460px] rounded-[2rem] p-2 shadow-plasma">
      <div className="inner-core overflow-hidden rounded-[calc(2rem-0.5rem)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-cyan/[0.14] text-cyan">
              <Bot className="size-5 stroke-[1.3]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Assistente PA</p>
              <p className="text-xs text-aurora">online e operativo</p>
            </div>
          </div>
          <span className="rounded-full border border-aurora/25 bg-aurora/10 px-3 py-1 text-xs text-aurora">24/7</span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {chatMessages.map((message, index) => (
            <motion.div
              key={message.text}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.45 + index * 0.52, ease: [0.32, 0.72, 0, 1] }}
              className={`flex ${message.author === "Tu" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={[
                  "max-w-[86%] rounded-lg px-4 py-3 text-sm leading-relaxed",
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
            ["Mail", <MailCheck key="mail" />],
            ["Calendar", <CalendarDays key="calendar" />],
            ["Drive", <Files key="files" />]
          ].map(([label, icon], index) => (
            <motion.div
              key={label as string}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 2.25 + index * 0.14, ease: [0.32, 0.72, 0, 1] }}
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
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 md:grid-cols-[1.08fr_0.92fr]">
        <motion.div
          initial={{ opacity: 0, y: 46, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.95, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-4xl"
        >
          <span className="mb-6 inline-flex rounded-full border border-cyan/[0.24] bg-cyan/[0.08] px-3 py-1 text-[10px] font-semibold uppercase text-cyan">
            AI employees for serious operators
          </span>
          <h1 className="text-balance bg-shine-text bg-clip-text text-5xl font-black leading-[0.95] text-transparent sm:text-6xl md:text-7xl">
            Smetti di rincorrere il lavoro. Assumi il tuo primo dipendente digitale.
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-white/70 md:text-xl">
            Un assistente personale basato sull&apos;AI che vive nel tuo WhatsApp o Telegram.
            Gestisce email, appuntamenti e la tua vita aziendale 24/7. Risparmia oltre ½
            della tua giornata lavorativa.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <PremiumButton href="#pricing">Scopri i Pacchetti</PremiumButton>
            <PremiumButton href="#enterprise" variant="secondary">
              Richiedi Consulenza
            </PremiumButton>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[
              ["Tempo recuperato", "½ giornata"],
              ["Canali", "WA + Telegram"],
              ["Setup", "1 ora"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xl font-bold text-white">{value}</p>
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
          <AnimatedMockup />
        </motion.div>
      </div>
    </section>
  );
}

function PowerVisual({ type }: { type: Power["visual"] }) {
  if (type === "calendar") {
    return (
      <div className="relative min-h-[290px] overflow-hidden rounded-lg border border-white/10 bg-obsidian p-5">
        <motion.div
          key="calendar-msg"
          initial={{ opacity: 0, x: -24, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.72, ease: [0.32, 0.72, 0, 1] }}
          className="w-[78%] rounded-lg bg-white text-obsidian p-4 text-sm font-semibold"
        >
          Fissa una call con Luca domani alle 15:00
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20, y: 40 }}
          animate={{ opacity: 1, x: 0, y: 12 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="ml-auto mt-4 w-[72%] rounded-lg border border-cyan/30 bg-cyan/10 p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-cyan">
            <CalendarDays className="size-4 stroke-[1.3]" />
            <span className="text-xs font-semibold">Google Calendar</span>
          </div>
          <p className="text-lg font-bold text-white">Call con Luca</p>
          <p className="mt-2 text-sm text-white/[0.58]">Domani · 15:00 · nessun conflitto</p>
        </motion.div>
        <motion.span
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.74, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="absolute left-[34%] top-[45%] h-px w-28 origin-left bg-cyan/70"
        />
      </div>
    );
  }

  if (type === "marketing") {
    return (
      <div className="min-h-[290px] rounded-lg border border-white/10 bg-obsidian p-5">
        <div className="mb-5 flex items-center gap-3">
          <IconWrap>
            <WandSparkles />
          </IconWrap>
          <div>
            <p className="text-sm font-semibold text-white">Marketing Agent</p>
            <p className="text-xs text-white/[0.48]">Generazione campagna</p>
          </div>
        </div>
        <div className="space-y-3">
          {["Analisi tone of voice", "Copy LinkedIn", "Immagine post", "CTA finale"].map((step, index) => (
            <div key={step} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                <span>{step}</span>
                <span>{index === 3 ? "100%" : `${62 + index * 11}%`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.85, delay: index * 0.16, ease: [0.32, 0.72, 0, 1] }}
                  className="h-full origin-left rounded-full bg-gradient-to-r from-cyan to-aurora"
                  style={{ width: `${70 + index * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[290px] overflow-hidden rounded-lg border border-white/10 bg-obsidian p-5">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className="rounded-lg border border-ember/30 bg-ember/10 p-4"
      >
        <div className="mb-3 flex items-center gap-2 text-ember">
          <Files className="size-4 stroke-[1.3]" />
          <span className="text-xs font-semibold">PDF parsing</span>
        </div>
        <div className="space-y-2">
          <span className="block h-2 w-full rounded-full bg-white/[0.16]" />
          <span className="block h-2 w-4/5 rounded-full bg-white/[0.12]" />
          <span className="block h-2 w-3/5 rounded-full bg-white/10" />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 26, y: 34 }}
        animate={{ opacity: 1, x: 0, y: 12 }}
        transition={{ duration: 0.82, delay: 0.34, ease: [0.32, 0.72, 0, 1] }}
        className="ml-auto mt-5 w-[82%] rounded-lg border border-plasma/35 bg-plasma/12 p-4"
      >
        <div className="mb-3 flex items-center gap-2 text-plasma">
          <Trello className="size-4 stroke-[1.3]" />
          <span className="text-xs font-semibold">Trello aggiornato</span>
        </div>
        <p className="text-sm font-semibold text-white">Lead qualificato · Preventivo allegato</p>
        <p className="mt-2 text-xs text-white/[0.52]">Scadenza, valore e next action estratti.</p>
      </motion.div>
    </div>
  );
}

function ActionShowcase() {
  const [active, setActive] = useState(0);
  const current = powers[active];

  return (
    <MotionSection id="azione" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
              L&apos;AI in Azione
            </span>
            <h2 className="text-balance text-4xl font-black leading-tight text-white md:text-6xl">
              Tre agenti, un solo modo naturale di comandarli.
            </h2>
          </div>
          <p className="max-w-md text-pretty text-base leading-7 text-white/[0.62]">
            Ogni demo simula un flusso reale: messaggio in chat, interpretazione AI,
            aggiornamento dello strumento corretto.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[0.88fr_1.12fr]">
          <div className="flex gap-3 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {powers.map((power, index) => (
              <button
                type="button"
                key={power.title}
                onClick={() => setActive(index)}
                className={[
                  "outer-shell min-w-[280px] rounded-lg p-1 text-left transition-all duration-700 ease-premium md:min-w-0",
                  active === index ? "shadow-halo" : "opacity-78 hover:opacity-100"
                ].join(" ")}
              >
                <div className="inner-core rounded-[calc(0.5rem-0.125rem)] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <IconWrap>{power.icon}</IconWrap>
                    <span className="text-xs text-white/[0.42]">0{index + 1}</span>
                  </div>
                  <p className="text-xs font-semibold uppercase text-cyan">{power.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-bold text-white">{power.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/[0.58]">{power.copy}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="outer-shell rounded-[2rem] p-2">
            <div className="inner-core rounded-[calc(2rem-0.5rem)] p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.visual}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.985 }}
                  transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
                >
                  <PowerVisual type={current.visual} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function FeatureGrid() {
  return (
    <MotionSection id="come-funziona" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            Come funziona
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Non cambi abitudini. Cambi leva operativa.
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
      <div className="mx-auto max-w-6xl">
        <div className="outer-shell rounded-[2rem] p-2">
          <div className="inner-core rounded-[calc(2rem-0.5rem)] p-6 md:p-10">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex rounded-full border border-aurora/[0.24] bg-aurora/[0.08] px-3 py-1 text-[10px] font-semibold uppercase text-aurora">
                Onboarding guidato
              </span>
              <h2 className="text-balance text-4xl font-black leading-tight md:text-5xl">
                Dal primo briefing al telefono operativo in una chiamata.
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
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
              Pricing
            </span>
            <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
              Un acquisto, nessun abbonamento mensile da parte nostra.
            </h2>
          </div>
          <p className="max-w-md text-pretty leading-7 text-white/[0.62]">
            Paghi setup e configurazione. I costi vivi di VPS e token OpenAI restano sotto il tuo controllo.
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
                  <p className="text-4xl font-black text-white">{pack.price}</p>
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

function EnterpriseForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    window.setTimeout(() => setStatus("success"), 1100);
  }

  return (
    <MotionSection id="enterprise" className="relative z-10 px-4 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="pt-3">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            Enterprise
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Per aziende strutturate, progettiamo il tuo reparto AI.
          </h2>
          <p className="mt-6 text-pretty text-lg leading-8 text-white/[0.62]">
            Raccontaci struttura, volumi e obiettivi. Ti rispondiamo con una proposta concreta, non con una demo generica.
          </p>
        </div>

        <div className="outer-shell rounded-[2rem] p-2">
          <form onSubmit={handleSubmit} className="inner-core rounded-[calc(2rem-0.5rem)] p-5 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome" name="name" placeholder="Mario Rossi" />
              <Field label="Email Aziendale" name="email" type="email" placeholder="mario@azienda.it" />
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
                  placeholder="Quali processi vuoi delegare alla tua AI?"
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="mb-4 inline-flex rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase text-white/[0.58]">
            FAQ
          </span>
          <h2 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Dubbi normali, risposte dritte.
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
      { icon: <MessageCircle />, label: "Comandi via chat e vocali" }
    ],
    []
  );

  return (
    <MotionSection className="relative z-10 px-4 py-16">
      <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-4">
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
      <ActionShowcase />
      <FeatureGrid />
      <OnboardingFlow />
      <Pricing />
      <EnterpriseForm />
      <FAQ />
      <footer className="relative z-10 border-t border-white/10 px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-white/[0.46] md:flex-row">
          <p>© 2026 Personale Artificiale</p>
          <p>Assistenti digitali AI su WhatsApp e Telegram.</p>
        </div>
      </footer>
    </main>
  );
}
