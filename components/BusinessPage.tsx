"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const enterprisePillars = [
  {
    title: "Audit gratuito",
    copy: "Analizziamo processi, dati, gestionali e colli di bottiglia per capire dove gli agenti IA possono portare valore reale.",
    detail: "Output: mappa opportunita, rischi, priorita e prime ipotesi di implementazione."
  },
  {
    title: "Cloud aziendale",
    copy: "Progettiamo sistemi di agenti IA in cloud per incorporare l'intelligenza artificiale dentro dati, gestionale e processo.",
    detail: "Ideale per aziende produttive che vogliono scalare senza gestire infrastruttura interna."
  },
  {
    title: "AI locale",
    copy: "Studiamo architetture locali per modelli AI on-premise quando privacy, continuita o controllo dati sono decisivi.",
    detail: "Hardware, deployment, accessi, manutenzione, aggiornamenti e governance."
  },
  {
    title: "Integrazioni operative",
    copy: "Colleghiamo agenti, gestionali, software aziendali, database, documenti e flussi di reparto.",
    detail: "Obiettivo: non aggiungere un pannello, ma far lavorare meglio quello che gia usate."
  }
];

const cloudCapabilities = [
  "Agenti per ufficio acquisti, amministrazione, produzione e commerciale",
  "Lettura documenti, email, ordini, schede cliente e dati operativi",
  "Azioni controllate con approvazione umana per passaggi sensibili",
  "Integrazione con gestionali, CRM, fogli, Drive, database e API",
  "Report, riepiloghi, alert e controllo anomalie in tempo quasi reale",
  "Possibile collaborazione con VaultPlant per piattaforme cloud aziendali"
];

const localStack = [
  ["Studio hardware", "Valutazione GPU, storage, rete, backup, ridondanza e costi di esercizio."],
  ["Modelli locali", "Scelta tra modelli open source, quantizzazione, performance e requisiti di privacy."],
  ["Ambiente sicuro", "Accessi, log, segregazione dati, policy interne e procedure di aggiornamento."],
  ["Operativita", "Interfacce semplici per reparti e agenti connessi ai software aziendali esistenti."]
];

const implementationFlow = [
  "Audit gratuito su dati, processi e strumenti",
  "Disegno architettura cloud, locale o ibrida",
  "Prototipo su un reparto o flusso ad alto impatto",
  "Integrazione con gestionale, dati e software operativi",
  "Governance, sicurezza, test e formazione interna",
  "Estensione progressiva agli altri processi aziendali"
];

const sectionMotion = {
  hidden: { opacity: 0, y: 42, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" }
};

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
      variants={sectionMotion}
      transition={{ duration: 0.84, ease: [0.22, 0.86, 0.18, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function EnterpriseButton({
  children,
  href,
  variant = "primary"
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "blue";
}) {
  const primary = variant === "primary";
  const blue = variant === "blue";

  return (
    <a
      href={href}
      className={[
        "group inline-flex min-h-12 items-center justify-center rounded-full px-2 py-2 text-sm font-black transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
        blue
          ? "bg-[#0347ff] text-white shadow-[0_18px_60px_rgba(3,71,255,0.32)] hover:bg-[#05060b]"
          : primary
          ? "bg-white text-[#05060b] shadow-[0_24px_80px_rgba(255,255,255,0.18)]"
          : "border border-white/18 bg-white/[0.08] text-white hover:bg-white/[0.12]"
      ].join(" ")}
    >
      <span className="px-4">{children}</span>
      <span
        className={[
          "grid size-9 place-items-center rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105",
          blue ? "bg-white text-[#0347ff]" : primary ? "bg-[#0347ff] text-white" : "bg-white text-[#0347ff]"
        ].join(" ")}
        aria-hidden="true"
      >
        ↗
      </span>
    </a>
  );
}

function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[34px] border border-white/12 bg-white/[0.06] p-2 shadow-[0_34px_130px_rgba(0,0,0,0.30)] ${className}`}>
      <div className="h-full rounded-[calc(2.125rem-0.5rem)] border border-white/10 bg-[#080c18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
        {children}
      </div>
    </div>
  );
}

function EnterpriseNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between rounded-full border border-white/80 bg-white/94 px-3 shadow-[0_26px_90px_rgba(3,18,60,0.24)] backdrop-blur-2xl md:px-4">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef4ff] ring-1 ring-[#0347ff]/14">
            <Logo className="h-9 w-12 object-contain" />
          </span>
          <span className="min-w-0 leading-none">
            <span className="block truncate text-sm font-black tracking-tight text-[#05060b]">PersonaleArtificiale</span>
            <span className="mt-1 hidden items-center gap-2 text-[11px] font-black text-[#0347ff] sm:flex">
              <span className="rounded-full bg-[#0347ff] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white">Aziende</span>
              <span className="text-[#05060b]/68">AI cloud e locale</span>
            </span>
          </span>
        </a>
        <div className="hidden items-center gap-1 md:flex">
          <a href="#cloud" className="rounded-full px-4 py-2 text-sm font-bold text-[#05060b]/72 transition duration-700 hover:bg-[#0347ff]/10 hover:text-[#0347ff]">
            Cloud
          </a>
          <a href="#locale" className="rounded-full px-4 py-2 text-sm font-bold text-[#05060b]/72 transition duration-700 hover:bg-[#0347ff]/10 hover:text-[#0347ff]">
            Locale
          </a>
          <a href="#audit" className="rounded-full px-4 py-2 text-sm font-bold text-[#05060b]/72 transition duration-700 hover:bg-[#0347ff]/10 hover:text-[#0347ff]">
            Audit
          </a>
        </div>
        <EnterpriseButton href="mailto:info@personaleartificiale.it?subject=Audit%20gratuito%20AI%20aziendale" variant="blue">
          Audit gratuito
        </EnterpriseButton>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate min-h-[100dvh] overflow-hidden px-4 pt-28 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_18%,rgba(3,71,255,0.56),transparent_30%),radial-gradient(circle_at_18%_72%,rgba(125,162,255,0.16),transparent_32%),linear-gradient(135deg,#05060b,#071131_58%,#0347ff)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:92px_92px] opacity-40" />
      <div className="mx-auto grid min-h-[calc(100dvh-7rem)] max-w-[1180px] items-center gap-10 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 34, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.88, ease: [0.22, 0.86, 0.18, 1] }}
        >
          <p className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0347ff]">
            Sistemi AI enterprise
          </p>
          <h1 className="max-w-[820px] text-balance text-[clamp(3.5rem,7vw,7.6rem)] font-black leading-[0.88] tracking-tight">
            AI dentro dati, gestionale e processo produttivo.
          </h1>
          <p className="mt-7 max-w-[68ch] text-xl font-semibold leading-8 text-white/84">
            Progettiamo sistemi di agenti IA in cloud, in locale o ibridi per aziende che vogliono usare l&apos;intelligenza artificiale sui propri dati operativi, non su demo isolate.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <EnterpriseButton href="mailto:info@personaleartificiale.it?subject=Audit%20gratuito%20AI%20aziendale">
              Richiedi audit gratuito
            </EnterpriseButton>
            <EnterpriseButton href="/" variant="secondary">
              Torna alla homepage
            </EnterpriseButton>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotate: 1.5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.94, delay: 0.1, ease: [0.22, 0.86, 0.18, 1] }}
          className="relative"
        >
          <Shell>
            <div className="grid min-h-[520px] place-items-center p-6 md:p-10">
              <div className="rounded-[30px] bg-white p-8 shadow-[0_34px_120px_rgba(3,71,255,0.28)]">
                <Logo className="w-full max-w-[500px]" />
              </div>
              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                {["Cloud", "Locale", "Sicurezza", "Gestionale"].map((item) => (
                  <div key={item} className="rounded-[22px] bg-white/[0.10] px-4 py-4 text-center text-sm font-black text-white">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Shell>
        </motion.div>
      </div>
    </section>
  );
}

function AuditSection() {
  return (
    <MotionSection id="audit" className="bg-[#05060b] px-4 py-28 text-white md:py-36">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[760px]">
          <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0347ff]">
            Audit gratuito
          </p>
          <h2 className="text-balance text-5xl font-black leading-[0.94] tracking-tight md:text-7xl">
            Prima capiamo dove l&apos;AI serve davvero.
          </h2>
          <p className="mt-6 text-lg font-semibold leading-8 text-white/78">
            Guardiamo processi, dati, software, vincoli e rischi. Poi proponiamo implementazioni realistiche: cloud, locale o ibride.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {enterprisePillars.map((pillar) => (
            <Shell key={pillar.title}>
              <div className="p-5">
                <h3 className="text-2xl font-black tracking-tight text-white">{pillar.title}</h3>
                <p className="mt-4 leading-7 text-white/78">{pillar.copy}</p>
                <p className="mt-5 rounded-[20px] bg-white/[0.10] p-4 text-sm font-bold leading-6 text-white/84">{pillar.detail}</p>
              </div>
            </Shell>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function CloudPlatform() {
  return (
    <MotionSection id="cloud" className="bg-[#eef4ff] px-4 py-28 text-[#05060b] md:py-36">
      <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-[#0347ff] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
            Piattaforma cloud
          </p>
          <h2 className="text-balance text-5xl font-black leading-[0.94] tracking-tight md:text-7xl">
            La piattaforma completa per aziende produttive.
          </h2>
          <p className="mt-6 text-lg font-semibold leading-8 text-[#05060b]/76">
            Una base cloud per incorporare l&apos;AI nei dati, nel gestionale e in tutto il processo aziendale. Gli agenti leggono, preparano, segnalano e lavorano con le informazioni operative gia presenti.
          </p>
          <p className="mt-5 text-lg font-semibold leading-8 text-[#05060b]/76">
            Tutto possibile anche in collaborazione con{" "}
            <a href="https://vaultplant.com" target="_blank" rel="noreferrer" className="font-black text-[#0347ff] underline decoration-[#0347ff]/30 underline-offset-4">
              vaultplant.com
            </a>
            .
          </p>
        </div>

        <div className="rounded-[34px] bg-white p-2 shadow-[0_34px_120px_rgba(3,71,255,0.18)]">
          <div className="grid gap-3 rounded-[calc(2.125rem-0.5rem)] bg-[#05060b] p-4 text-white md:p-5">
            {cloudCapabilities.map((capability) => (
              <div key={capability} className="rounded-[22px] bg-white/[0.10] px-5 py-4 text-base font-bold leading-7 text-white/86">
                {capability}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

function LocalAI() {
  return (
    <MotionSection id="locale" className="bg-[#05060b] px-4 py-28 text-white md:py-36">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0347ff]">
              AI locale e hardware
            </p>
            <h2 className="text-balance text-5xl font-black leading-[0.94] tracking-tight md:text-7xl">
              Quando i dati devono restare in casa.
            </h2>
          </div>
          <p className="text-lg font-semibold leading-8 text-white/78">
            Studiamo fornitura, dimensionamento e configurazione hardware per modelli AI locali: performance, sicurezza, costi, aggiornamenti e uso reale nei reparti.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {localStack.map(([title, copy]) => (
            <Shell key={title}>
              <div className="p-6">
                <p className="text-3xl font-black tracking-tight">{title}</p>
                <p className="mt-4 text-lg font-semibold leading-8 text-white/78">{copy}</p>
              </div>
            </Shell>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function ImplementationFlow() {
  return (
    <MotionSection className="bg-[#eef4ff] px-4 py-28 text-[#05060b] md:py-36">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-balance text-center text-5xl font-black leading-[0.94] tracking-tight md:text-7xl">
          Dal sopralluogo digitale alla messa in produzione.
        </h2>
        <div className="mt-12 grid gap-3">
          {implementationFlow.map((step, index) => (
            <div key={step} className="grid gap-4 rounded-[26px] bg-white p-5 shadow-[0_20px_80px_rgba(3,71,255,0.10)] sm:grid-cols-[88px_1fr] sm:items-center">
              <p className="text-4xl font-black tabular-nums text-[#0347ff]">{String(index + 1).padStart(2, "0")}</p>
              <p className="text-xl font-black leading-7">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function FinalCTA() {
  return (
    <MotionSection className="bg-[#05060b] px-4 py-28 text-white md:py-36">
      <div className="mx-auto overflow-hidden rounded-[38px] border border-white/12 bg-[radial-gradient(circle_at_82%_18%,rgba(3,71,255,0.46),transparent_32%),linear-gradient(135deg,#080c18,#05060b)] p-6 shadow-[0_44px_150px_rgba(0,0,0,0.34)] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-center">
          <div className="grid min-h-[260px] place-items-center rounded-[30px] bg-white p-8">
            <Logo className="w-full max-w-[320px]" />
          </div>
          <div>
            <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0347ff]">
              Primo passo
            </p>
            <h2 className="text-balance text-5xl font-black leading-[0.94] tracking-tight md:text-7xl">
              Facciamo un audit gratuito sullo stato AI della tua azienda.
            </h2>
            <p className="mt-6 max-w-[66ch] text-lg font-semibold leading-8 text-white/82">
              Ci racconti software, dati, reparto e obiettivi. Ti restituiamo una prima lettura su opportunita, rischi e implementazioni possibili.
            </p>
            <div className="mt-8">
              <EnterpriseButton href="mailto:info@personaleartificiale.it?subject=Audit%20gratuito%20AI%20aziendale">
                Scrivici per l&apos;audit gratuito
              </EnterpriseButton>
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

export default function BusinessPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05060b]">
      <EnterpriseNav />
      <Hero />
      <AuditSection />
      <CloudPlatform />
      <LocalAI />
      <ImplementationFlow />
      <FinalCTA />
    </main>
  );
}
