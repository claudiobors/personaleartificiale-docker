import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Check,
  Zap,
  Cpu,
  Mail,
  Calendar,
  Folder,
  ArrowRight,
  TrendingDown,
  Clock,
  Euro,
  Scale,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/ads")({
  component: AdsLandingPage,
});

function AdsLandingPage() {
  // Calculator states
  const [hourlyRate, setHourlyRate] = useState<number>(40);
  const [hoursPerDay, setHoursPerDay] = useState<number>(3);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(20);

  // Calculated values
  const hoursWasted = hoursPerDay * daysPerMonth;
  const currentCost = hoursWasted * hourlyRate;

  // Determine recommended plan dynamically
  let recommendedPlan = {
    name: "L'Ufficio Digitale",
    monthly: 297,
    setup: 999,
    badge: "Consigliato per Te",
    features: [
      "Fino a 3 Agenti AI cooperanti",
      "Integrazione WhatsApp e Telegram",
      "Connessione Google Workspace completa",
      "Gestione Trello, Asana o CRM proprietario",
      "Supporto RAG per caricamento PDF illimitati",
      "Modifica del Tone of Voice personalizzata",
    ],
  };

  if (currentCost <= 600) {
    recommendedPlan = {
      name: "Assistente Esecutivo",
      monthly: 97,
      setup: 399,
      badge: "Ideale per Freelance & Artigiani",
      features: [
        "1 Agente AI dedicato su WhatsApp",
        "Configurazione Tone of Voice personalizzato",
        "Lettura e sintesi documenti (PDF, Docx)",
        "Integrazione Google Calendar & Email",
        "Archiviazione automatica su Google Drive",
        "Setup guidato iniziale in 15 minuti",
      ],
    };
  } else if (currentCost > 2500) {
    recommendedPlan = {
      name: "Enterprise su Misura",
      monthly: 500,
      setup: 3500,
      badge: "Soluzione Aziendale Avanzata",
      features: [
        "Agenti AI illimitati e personalizzati",
        "Integrazione ERP aziendali complessi",
        "Canale WhatsApp Business dedicato",
        "SLA e supporto dedicato 24/7",
        "Database vettoriale privato e on-premise",
        "Training AI avanzato continuativo",
      ],
    };
  }

  const netSavingsMonthly = currentCost - recommendedPlan.monthly;
  const netSavingsYearly = netSavingsMonthly * 12;
  const roiMultiplier = Math.max(1, Math.round(currentCost / recommendedPlan.monthly));

  // State for FAQ accordion
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Come fa un dipendente AI a costare così poco rispetto a un umano?",
      a: "I nostri agenti AI utilizzano i modelli di linguaggio più avanzati (come GPT-4o) ottimizzati per l'automazione d'ufficio. Non dormono, non richiedono contributi pensionistici, uffici fisici, ferie o malattia. Svolgono le mansioni digitali in frazioni di secondo, riducendo i costi operativi del 90%.",
    },
    {
      q: "L'agente AI fa errori? Come posso controllarlo?",
      a: "Gli agenti operano secondo le linee guida impostate nel Wizard iniziale (Tone of Voice, manuali operativi e PDF inseriti). Nel piano 'L'Ufficio Digitale' e 'Enterprise' è possibile impostare un flusso di approvazione 'Human-in-the-loop': l'agente prepara la mail o l'azione e ti chiede conferma su WhatsApp prima di inviarla.",
    },
    {
      q: "Ho bisogno di competenze tecniche per usarlo?",
      a: "Assolutamente no. I tuoi clienti e collaboratori comunicano con l'agente AI tramite normalissimi messaggi di testo o vocali su WhatsApp o Telegram, esattamente come farebbero con un assistente umano. Tutta la complessità tecnica è gestita invisibilmente nei sistemi aziendali.",
    },
    {
      q: "Quali software aziendali potete integrare?",
      a: "Fuori dalla scatola integriamo Google Workspace (Gmail, Calendar, Drive), Microsoft 365, Trello, Asana, Notion, Slack e i principali CRM (Salesforce, HubSpot, Pipedrive). Per flussi personalizzati o ERP proprietari, il nostro team Enterprise può sviluppare connettori ad-hoc.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">
      {/* Background Radial Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-purple-600 blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-blue-600 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
            <Cpu className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Personale Artificiale
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <a
            href="#calculator"
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-semibold hover:bg-slate-800 hover:border-slate-700 transition-all"
          >
            Calcola ROI
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ottimizzato per Professionisti e PMI</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-6">
          Smetti di buttare ore in compiti ripetitivi. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-400">
            Fai Lavorare l'AI al Posto Tuo.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Pianificare riunioni, compilare Trello, archiviare fatture, smistare email... 
          Un assistente virtuale personalizzato vive su <strong>WhatsApp</strong> ed esegue 
          le tue azioni aziendali in automatico. Scopri quanto stai perdendo ogni mese.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#calculator"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-white"
          >
            Calcola il Tuo Risparmio AI
            <ArrowRight className="w-5 h-5" />
          </a>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 font-semibold hover:border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            Prova Onboarding Demo
          </Link>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section id="calculator" className="relative max-w-7xl mx-auto px-6 py-12 scroll-mt-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />

        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-12 relative overflow-hidden backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Sliders */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Calcolatore ROI AI</h2>
                <p className="text-sm text-slate-400">
                  Modifica i parametri per simulare i costi della tua operatività manuale corrente.
                </p>
              </div>

              {/* Slider 1: Hourly Rate */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Euro className="w-4 h-4 text-purple-400" />
                    Valore della tua ora lavorativa
                  </span>
                  <span className="text-purple-400 text-lg">€{hourlyRate}/ora</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="150"
                  step="5"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>€15</span>
                  <span>Freelance Medio (e.g. €40)</span>
                  <span>€150</span>
                </div>
              </div>

              {/* Slider 2: Hours per Day */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Ore/giorno in admin e ripetitivi
                  </span>
                  <span className="text-blue-400 text-lg">{hoursPerDay} {hoursPerDay === 1 ? "ora" : "ore"}/giorno</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1 ora</span>
                  <span>Fatture, email, CRM (e.g. 3h)</span>
                  <span>8 ore (Full-time)</span>
                </div>
              </div>

              {/* Slider 3: Days per Month */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Giorni lavorati al mese
                  </span>
                  <span className="text-emerald-400 text-lg">{daysPerMonth} giorni/mese</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={daysPerMonth}
                  onChange={(e) => setDaysPerMonth(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>10 giorni</span>
                  <span>Standard lavorativo (e.g. 20)</span>
                  <span>30 giorni</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Costo Attuale Operativo</div>
                  <div className="text-2xl font-black text-red-400">€{currentCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ mese</span></div>
                </div>
              </div>
            </div>

            {/* Right Column: Comparative Charts & Dynamically Recommended Plan */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Visual Side-by-Side Comparison */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-black flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Confronto Costo Mensile
                </h3>

                <div className="space-y-3">
                  {/* Current Cost Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Costo Lavoro Manuale</span>
                      <span className="font-bold text-red-400">€{currentCost}</span>
                    </div>
                    <div className="w-full h-8 bg-slate-950 rounded-xl border border-slate-900 overflow-hidden relative flex items-center px-3 justify-between">
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-950/60 to-red-900/40 border-r border-red-500/40 rounded-l-xl"
                        initial={{ width: "100%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.3 }}
                      />
                      <span className="text-xs font-semibold text-slate-300 relative z-10">Lavoro Manuale Ripetitivo</span>
                      <span className="text-xs font-bold text-red-400 relative z-10">€{currentCost}/mese</span>
                    </div>
                  </div>

                  {/* AI Cost Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Costo Personale Artificiale</span>
                      <span className="font-bold text-purple-400">€{recommendedPlan.monthly}</span>
                    </div>
                    <div className="w-full h-8 bg-slate-950 rounded-xl border border-slate-900 overflow-hidden relative flex items-center px-3 justify-between">
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-950/60 via-purple-900/40 to-blue-900/20 border-r border-purple-500/40 rounded-l-xl"
                        initial={{ width: "5%" }}
                        animate={{ width: `${Math.max(8, (recommendedPlan.monthly / currentCost) * 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      <span className="text-xs font-semibold text-slate-300 relative z-10 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
                        Agente AI (WhatsApp)
                      </span>
                      <span className="text-xs font-bold text-purple-400 relative z-10">€{recommendedPlan.monthly}/mese</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic ROI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-center">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Risparmio Mensile</div>
                  <div className="text-xl md:text-2xl font-black text-purple-400">€{netSavingsMonthly.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Spesi al posto del manuale</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Risparmio Annuale</div>
                  <div className="text-xl md:text-2xl font-black text-emerald-400">€{netSavingsYearly.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Denaro netto salvato</div>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center col-span-2 md:col-span-1">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Efficienza ROI</div>
                  <div className="text-xl md:text-2xl font-black text-blue-400">{roiMultiplier}x Più Economico</div>
                  <div className="text-[10px] text-slate-400 mt-1">Rispetto al tuo costo orario</div>
                </div>
              </div>

              {/* Recommended Plan Offer Box */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow">
                  {recommendedPlan.badge}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-900">
                  <div>
                    <div className="text-xs text-purple-400 font-semibold tracking-wider uppercase mb-1">Piano Consigliato</div>
                    <h4 className="text-2xl font-bold text-white">{recommendedPlan.name}</h4>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-3xl font-black text-white">€{recommendedPlan.monthly}<span className="text-sm font-normal text-slate-500"> / mese</span></div>
                    <div className="text-xs text-slate-400 mt-1">+ €{recommendedPlan.setup} di setup iniziale una tantum</div>
                  </div>
                </div>

                <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {recommendedPlan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/dashboard"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 font-bold hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 text-white text-base"
                >
                  Attiva Ora l'Agente AI & Risparmia €{netSavingsMonthly}
                  <ArrowRight className="w-5 h-5 animate-pulse" />
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Integration Capabilities Grid */}
      <section className="relative max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Zero curva di apprendimento. Usa WhatsApp.</h2>
          <p className="text-slate-400">
            L'agente AI si collega ai software aziendali che usi già. Tu o il tuo team dovete solo inviargli un messaggio di testo o vocale, esattamente come fareste con un collega umano.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-900 hover:border-slate-800 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Gestione Email Intelligente</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              L'agente legge, categorizza e scrive bozze di risposte personalizzate su Gmail/Outlook. Ti notifica su WhatsApp solo le email che richiedono la tua attenzione urgente.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-900 hover:border-slate-800 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Pianificazione Appuntamenti</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Basta inviare un vocale: "Fissami una call di 30 min con Marco domani pomeriggio". L'agente controlla Google Calendar, trova lo slot libero e invia l'invito.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-900 hover:border-slate-800 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Folder className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Archiviazione Documenti</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Carica una fattura, un preventivo o una foto di una ricevuta su WhatsApp. L'agente AI estrae i dati con l'OCR, la rinomina in modo logico e la archivia nella giusta cartella Google Drive.
            </p>
          </div>
        </div>
      </section>

      {/* Onboarding Showcase (How it Works) */}
      <section className="relative max-w-5xl mx-auto px-6 py-12 border-t border-slate-900 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-12">Attivazione in 3 semplici step</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">1</div>
            <h3 className="text-lg font-bold text-white">Completa il Checkout</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Seleziona il piano ideale calcolato sopra ed effettua l'acquisto sicuro su Stripe con fatturazione automatica.
            </p>
          </div>
          <div className="space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">2</div>
            <h3 className="text-lg font-bold text-white">Wizard di Configurazione</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Accedi alla dashboard per definire il nome, le regole dell'agente e carica i PDF informativi della tua attività.
            </p>
          </div>
          <div className="space-y-3 relative">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">3</div>
            <h3 className="text-lg font-bold text-white">Inquadra il QR Code</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Inquadra il codice QR generato usando l'applicazione WhatsApp o Telegram del tuo smartphone e l'agente AI sarà attivo al 100%!
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="relative max-w-4xl mx-auto px-6 py-16 border-t border-slate-900 scroll-mt-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">Domande Frequenti</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden transition-all duration-350"
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center font-bold text-base hover:text-purple-400 transition-colors"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                    activeFaq === index ? "rotate-180 text-purple-400" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {activeFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-slate-900/50 pt-3">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="relative py-24 bg-gradient-to-t from-purple-950/20 via-slate-950 to-slate-950 border-t border-slate-900 text-center px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
            Riprenditi il controllo del tuo tempo.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unisciti ai professionisti che risparmiano fino a mezza giornata lavorativa ogni giorno. 
            Calcola la tua efficienza e sblocca il potere della forza lavoro digitale.
          </p>
          <div className="flex justify-center">
            <Link
              to="/dashboard"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 font-bold hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] transition-all flex items-center gap-2 text-white text-lg"
            >
              Attiva Ora il Tuo Agente AI
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Footer Info */}
      <footer className="relative max-w-7xl mx-auto px-6 py-12 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span>&copy; {new Date().getFullYear()} Personale Artificiale S.r.l. • Via della Scrofa 104, 00186 Roma (RM) • P.IVA IT12345678901</span>
          <span className="text-[10px] text-slate-600">Iscrizione REA RM-9876543 • Cap. Soc. €10.000 i.v.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          <Link to="/privacy" className="hover:text-slate-300 transition-colors underline">Privacy Policy</Link>
          <Link to="/cookie-policy" className="hover:text-slate-300 transition-colors underline">Cookie Policy</Link>
          <Link to="/termini-servizio" className="hover:text-slate-300 transition-colors underline">Termini di Servizio</Link>
        </div>
      </footer>
    </div>
  );
}
