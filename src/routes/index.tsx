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
  MessageSquare,
  ArrowRight,
  Lock,
  Database,
  Shield,
  Plus,
  Minus,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  Workflow,
  FileText,
  Brain,
  Phone,
  CheckCircle2,
} from "lucide-react";

// Custom SVG for Trello
const Trello = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <rect width="3" height="9" x="7" y="7" rx="1" />
    <rect width="3" height="5" x="14" y="7" rx="1" />
  </svg>
);

export const Route = createFileRoute("/")({
  component: Home,
});

// Mock conversations for the interactive WhatsApp simulator
const CHAT_DEMOS = [
  {
    id: "calendar",
    label: "Organizza Agenda",
    icon: Calendar,
    messages: [
      { sender: "user", text: "Ciao Marco, fissa un incontro con Giulia per domani alle 15:30 e inviale un invito mail." },
      { sender: "agent", status: "thinking", text: "Analizzo la richiesta e controllo la disponibilità..." },
      { sender: "agent", status: "acting", text: "📅 Ricerca slot su Google Calendar..." },
      { sender: "agent", text: "Perfetto! Ho bloccato domani alle 15:30 sul tuo calendario. Invito email inviato con successo a Giulia (giulia@azienda.it). Ho salvato l'evento come 'Allineamento Personale Artificiale'." },
    ]
  },
  {
    id: "email",
    label: "Triage & Email",
    icon: Mail,
    messages: [
      { sender: "user", text: "Controlla se ci sono email importanti arrivate stamattina e fammi un riassunto veloce." },
      { sender: "agent", status: "thinking", text: "Accedo alla casella Gmail aziendale..." },
      { sender: "agent", status: "acting", text: "🔍 Scansione email ricevute nelle ultime 6 ore..." },
      { sender: "agent", text: "Hai ricevuto 14 email. Solo 1 richiede attenzione immediata:\n\n**Mittente:** Studio Legale Rossi\n**Oggetto:** Firma Contratto MVP\n**Sintesi:** Chiedono se possiamo anticipare la firma a venerdì mattina.\n\nVuoi che risponda proponendo le ore 10:00?" },
    ]
  },
  {
    id: "document",
    label: "Archivia Documento",
    icon: FileText,
    messages: [
      { sender: "user", text: "Ti inoltro questa fattura PDF ricevuta dal fornitore. Archiviala in Drive nella cartella corretta e segna la scadenza." },
      { sender: "agent", status: "thinking", text: "Ricezione file 'fattura-2026-894.pdf'..." },
      { sender: "agent", status: "acting", text: "📂 Estrazione dati con AI e caricamento in Google Drive..." },
      { sender: "agent", text: "Ricevuto! Ho estratto i dati:\n• **Fornitore:** CloudTech SRL\n• **Importo:** €1.240,00\n• **Scadenza:** 30/07/2026\n\nFattura archiviata nella cartella 'Acquisti 2026' su Google Drive. Ho anche aggiunto un promemoria sul tuo calendario per la scadenza di pagamento." },
    ]
  },
  {
    id: "trello",
    label: "Aggiorna Trello / CRM",
    icon: Trello,
    messages: [
      { sender: "user", text: "Abbiamo chiuso l'accordo con l'azienda SolarFuture! Crea una scheda su Trello per avviare il progetto." },
      { sender: "agent", status: "thinking", text: "Elaborazione lead e aggiornamento flussi..." },
      { sender: "agent", status: "acting", text: "📋 Creazione scheda su Trello (Bacheca Clienti)..." },
      { sender: "agent", text: "Congratulazioni per la firma! 🎉\nHo creato la scheda **'SolarFuture - Kickoff'** nella lista 'In Corso' su Trello. Ho inserito la checklist iniziale, assegnato il project manager e allegato il link del contratto." },
    ]
  }
];

function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemo, setActiveDemo] = useState(CHAT_DEMOS[0]);
  const [visibleMessages, setVisibleMessages] = useState<any[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Run simulated chat on active demo change
  useEffect(() => {
    setVisibleMessages([]);
    setMsgIndex(0);
    setIsTyping(false);
    
    let timer: any;
    const loadNextMessage = () => {
      if (msgIndex < activeDemo.messages.length) {
        const nextMsg = activeDemo.messages[msgIndex];
        if (nextMsg.sender === "agent" && (nextMsg.status === "thinking" || nextMsg.status === "acting")) {
          setIsTyping(true);
          timer = setTimeout(() => {
            setVisibleMessages((prev) => [...prev, nextMsg]);
            setIsTyping(false);
            setMsgIndex((prev) => prev + 1);
          }, 1500);
        } else {
          setIsTyping(true);
          timer = setTimeout(() => {
            setVisibleMessages((prev) => [...prev, nextMsg]);
            setIsTyping(false);
            setMsgIndex((prev) => prev + 1);
          }, 2000);
        }
      }
    };

    loadNextMessage();
    return () => clearTimeout(timer);
  }, [activeDemo, msgIndex]);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden selection:bg-purple-500 selection:text-white">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[1000px] left-10 w-[400px] h-[400px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Personale Artificiale
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#come-funziona" className="text-sm text-zinc-400 hover:text-white transition-colors">Come Funziona</a>
            <a href="#caratteristiche" className="text-sm text-zinc-400 hover:text-white transition-colors">Integrazioni</a>
            <a href="#prezzi" className="text-sm text-zinc-400 hover:text-white transition-colors">Prezzi</a>
            <a href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a 
              href="https://app.personaleartificiale.it"
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all"
            >
              Accedi
            </a>
            <a 
              href="#prezzi"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-300"
            >
              Assumi un Agente
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-20 left-0 w-full bg-zinc-950 border-b border-zinc-900 py-6 px-6 flex flex-col gap-5 shadow-2xl"
            >
              <a 
                href="#come-funziona" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-zinc-400 hover:text-white transition-colors"
              >
                Come Funziona
              </a>
              <a 
                href="#caratteristiche" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-zinc-400 hover:text-white transition-colors"
              >
                Integrazioni
              </a>
              <a 
                href="#prezzi" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-zinc-400 hover:text-white transition-colors"
              >
                Prezzi
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-zinc-400 hover:text-white transition-colors"
              >
                FAQ
              </a>
              <div className="h-[1px] bg-zinc-900 my-2" />
              <div className="flex flex-col gap-3">
                <a 
                  href="https://app.personaleartificiale.it"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl text-sm font-medium border border-zinc-800 hover:bg-zinc-900 transition-all"
                >
                  Accedi
                </a>
                <a 
                  href="#prezzi"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-500 text-white transition-all"
                >
                  Assumi un Agente
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Hero Left */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              La Rivoluzione del Lavoro Digitale
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              Assumi il tuo primo{" "}
              <span className="bg-gradient-to-r from-purple-400 via-purple-500 to-blue-400 bg-clip-text text-transparent">
                Dipendente Virtuale
              </span>{" "}
              su WhatsApp
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-zinc-400 mb-10 max-w-2xl leading-relaxed"
            >
              Operativi h24, con zero curva di apprendimento. Comunica a voce o via testo proprio come faresti con un collaboratore umano. L'AI gestisce le tue email, organizza il calendario, aggiorna il CRM e archivia file su Drive. **Risparmia fino a mezza giornata di lavoro al giorno.**
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto"
            >
              <a 
                href="https://app.personaleartificiale.it"
                className="px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2.5 transition-all duration-300 group whitespace-nowrap"
              >
                Registrati / Inizia Gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="https://app.personaleartificiale.it"
                className="px-8 py-4 rounded-xl text-base font-medium border border-zinc-800 hover:border-zinc-750 hover:bg-zinc-900/50 flex items-center justify-center gap-2 transition-all text-zinc-300 hover:text-white whitespace-nowrap"
              >
                Accedi al tuo Account
              </a>
            </motion.div>

            {/* Quick trust metrics */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-zinc-900 w-full max-w-md"
            >
              <div>
                <p className="text-2xl font-bold text-white">15 Min</p>
                <p className="text-xs text-zinc-500 uppercase font-semibold mt-1">Tempo di attivazione</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">4.5 Ore</p>
                <p className="text-xs text-zinc-500 uppercase font-semibold mt-1">Risparmiate al giorno</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Zero</p>
                <p className="text-xs text-zinc-500 uppercase font-semibold mt-1">Software da imparare</p>
              </div>
            </motion.div>
          </div>

          {/* Hero Right - Interactive Mobile Emulator */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 flex flex-col items-center justify-center"
          >
            {/* Phone Frame */}
            <div className="w-full max-w-[360px] aspect-[9/19] rounded-[48px] bg-zinc-900 p-3.5 border-4 border-zinc-800 shadow-2xl relative ring-1 ring-white/10 glow-purple">
              {/* Speaker & Sensor Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-32 bg-zinc-900 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-12 h-1 bg-zinc-800 rounded-full mb-1" />
              </div>

              {/* Screen Inner */}
              <div className="w-full h-full rounded-[38px] bg-zinc-950 overflow-hidden relative flex flex-col">
                
                {/* Chat App Header */}
                <div className="bg-zinc-900/95 border-b border-zinc-850 px-4 pt-6 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow">
                      PA
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Personale Artificiale</h4>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-zinc-400">Online • Agente Attivo</span>
                      </div>
                    </div>
                  </div>
                  <Phone className="w-4 h-4 text-zinc-400" />
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs flex flex-col justify-end">
                  
                  {/* System greeting */}
                  <div className="text-center text-[10px] text-zinc-500 py-1 bg-zinc-900/40 rounded-lg mx-6 mb-2">
                    🔒 Chat crittografata con WhatsApp Business API
                  </div>

                  {visibleMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}
                    >
                      <div 
                        className={`p-3 rounded-2xl ${
                          msg.sender === "user" 
                            ? "bg-purple-600 text-white rounded-tr-none" 
                            : msg.status === "thinking" 
                            ? "bg-zinc-900 text-purple-300 italic border border-purple-950 rounded-tl-none animate-pulse"
                            : msg.status === "acting"
                            ? "bg-blue-950 text-blue-300 font-medium border border-blue-900 rounded-tl-none"
                            : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none"
                        }`}
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 px-1">
                        {msg.sender === "user" ? "Tu" : "Agente AI"}
                      </span>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="bg-zinc-900 text-zinc-400 border border-zinc-800 p-3 rounded-2xl rounded-tl-none self-start flex items-center gap-1 max-w-[80%] animate-pulse">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>

                {/* Simulated Input */}
                <div className="p-3 bg-zinc-900/90 border-t border-zinc-850 flex items-center gap-2">
                  <div className="flex-1 bg-zinc-950 rounded-full px-3 py-2 text-[11px] text-zinc-500 border border-zinc-850">
                    Messaggio...
                  </div>
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-sm">
              {CHAT_DEMOS.map((demo) => {
                const IconComp = demo.icon;
                return (
                  <button
                    key={demo.id}
                    onClick={() => setActiveDemo(demo)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all duration-300 ${
                      activeDemo.id === demo.id
                        ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    {demo.label}
                  </button>
                );
              })}
            </div>
          </motion.div>

        </div>
      </section>

      {/* Trust Banner (Integrazioni) */}
      <section className="py-12 border-t border-b border-zinc-900 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs uppercase font-semibold tracking-widest text-zinc-500 mb-8">
            Si collega all'istante con i tuoi strumenti di lavoro quotidiano
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
            <span className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-400" /> Gmail
            </span>
            <span className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Google Calendar
            </span>
            <span className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <Folder className="w-4 h-4 text-yellow-500" /> Google Drive
            </span>
            <span className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <Trello className="w-4 h-4 text-blue-500" /> Trello
            </span>
            <span className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" /> WhatsApp
            </span>
            <span className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" /> Telegram
            </span>
          </div>
        </div>
      </section>

      {/* Come Funziona - Onboarding Zero-Touch */}
      <section id="come-funziona" className="py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-6 uppercase tracking-wider">
            Onboarding Fulmineo
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Pronto a lavorare in 3 semplici passi
          </h2>
          <p className="text-zinc-400 text-lg mb-20 max-w-2xl mx-auto">
            Nessuna programmazione, nessuna configurazione server. Scegli un piano, inserisci i file di conoscenza ed inquadra il codice QR.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-purple-500/50 to-blue-500/50 -z-10" />

            {/* Step 1 */}
            <div className="flex flex-col items-center bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 relative hover:border-purple-500/20 transition-all duration-300 group">
              <div className="absolute -top-5 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-purple-400 group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-6">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Scegli e Acquista</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Completa l'acquisto sicuro con Stripe. Verrai reindirizzato all'istante sulla dashboard utente.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 relative hover:border-blue-500/20 transition-all duration-300 group">
              <div className="absolute -top-5 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-blue-400 group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Configura & Allena</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Seleziona il tono di voce e carica PDF (listini, FAQ, cataloghi) per formare l'AI sul tuo business.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 relative hover:border-purple-500/20 transition-all duration-300 group">
              <div className="absolute -top-5 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-purple-400 group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Scansiona e Attiva</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Inquadra il codice QR con WhatsApp per collegare l'agente. Da questo momento è operativo h24.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Caratteristiche / Integrazioni - Futuristic grid */}
      <section id="caratteristiche" className="py-24 bg-zinc-900/30 border-t border-b border-zinc-900 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 uppercase tracking-wider">
              Cosa Può Fare Per Te
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Un assistente completo per liberare il tuo tempo
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Il tuo dipendente virtuale non si limita a rispondere: agisce direttamente sui tuoi applicativi, automatizzando i flussi quotidiani ripetitivi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feat 1 */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-purple-500/20 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Triage & Gestione Email</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Filtra la posta in arrivo, individua le priorità urgenti, scrive bozze di risposta professionali e ti aggiorna via chat sulle novità.
              </p>
            </div>

            {/* Feat 2 */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-purple-500/20 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Pianificazione Agenda</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Gestisce prenotazioni, fissa riunioni di allineamento su Google Calendar, invia inviti email automatici ed evita conflitti di orari.
              </p>
            </div>

            {/* Feat 3 */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-purple-500/20 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
                <Folder className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Archiviazione Intelligente</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Inoltra file, fatture o PDF via WhatsApp. L'agente li analizza, estrae i dati chiave e li cataloga con ordine su Google Drive.
              </p>
            </div>

            {/* Feat 4 */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-blue-500/20 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400">
                <Trello className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Aggiornamento CRM & Trello</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Monitora lo stato di avanzamento delle attività, crea e muove schede su Trello o Asana, e aggiorna i dettagli dei clienti sul CRM aziendale.
              </p>
            </div>

            {/* Feat 5 */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-blue-500/20 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Memoria e Conoscenza RAG</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Carica listini prezzi e file PDF. Grazie al sistema di memoria RAG a lungo termine, l'AI risponde con estrema precisione basandosi sui tuoi dati.
              </p>
            </div>

            {/* Feat 6 */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-blue-500/20 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Massima Sicurezza e Privacy</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Integrazioni certificate OAuth 2.0. I dati aziendali e della chat sono crittografati e protetti, senza rivendita a terze parti.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="prezzi" className="py-24 md:py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 uppercase tracking-wider">
              Piani Semplici, Senza Sorprese
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight text-white">
              Scegli il livello del tuo collaboratore AI
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Tutti i piani includono un periodo di attivazione assistito. Prezzi trasparenti con setup una tantum + abbonamento mensile.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
            
            {/* Plan 1 */}
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-750 transition-all relative">
              <div>
                <h3 className="text-xl font-bold text-zinc-200 mb-2">Assistente Esecutivo</h3>
                <p className="text-zinc-500 text-xs mb-6">Ideale per Freelance, Artigiani e Professionisti.</p>
                
                <div className="border-b border-zinc-850 pb-6 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">€97</span>
                    <span className="text-zinc-500 text-sm font-medium">/ mese</span>
                  </div>
                  {/* Prezzo setup nascosto */}
                </div>

                <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span><strong>1 Agente Virtuale</strong> dedicato</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Integrazione Google Calendar & Gmail</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Archiviazione Documenti Drive</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Connessione WhatsApp o Telegram</span>
                  </li>
                  <li className="flex items-start gap-3 text-zinc-500">
                    <Minus className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>Memoria RAG (knowledge base PDF)</span>
                  </li>
                  <li className="flex items-start gap-3 text-zinc-500">
                    <Minus className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>Supporto prioritario 1-to-1</span>
                  </li>
                </ul>
              </div>

              <a 
                href="https://app.personaleartificiale.it?plan=assistente-esecutivo" 
                className="w-full text-center py-3.5 px-4 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all shadow-md"
              >
                Seleziona piano
              </a>
            </div>

            {/* Plan 2 - Best Seller */}
            <div className="bg-zinc-900/60 border-2 border-purple-500 rounded-3xl p-8 flex flex-col justify-between hover:scale-[1.02] transition-all relative shadow-xl shadow-purple-500/5 glow-purple">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow whitespace-nowrap">
                Offerta speciale - Risparmia il 40% 🔥
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 mt-2">L'Ufficio Digitale</h3>
                <p className="text-purple-300 text-xs mb-6 font-medium">Ottimo per PMI, Agenzie, Studi Professionali.</p>
                
                <div className="border-b border-zinc-850 pb-6 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold text-white">€297</span>
                    <span className="text-zinc-400 text-sm font-medium">/ mese</span>
                  </div>
                  {/* Prezzo setup nascosto */}
                </div>

                <ul className="space-y-4 mb-8 text-sm text-zinc-200">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Fino a 3 Agenti Cooperatori</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Integrazione Google Workspace completa</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Integrazione Trello, Asana & CRM</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Connessione WhatsApp + Telegram</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Memoria RAG & caricamento PDF</strong> (Allena l'AI)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Supporto prioritario e Setup guidato</span>
                  </li>
                </ul>
              </div>

              <a 
                href="https://app.personaleartificiale.it?plan=ufficio-digitale" 
                className="w-full text-center py-4 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white transition-all shadow-lg shadow-purple-500/20"
              >
                Seleziona piano
              </a>
            </div>

            {/* Plan 3 */}
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-750 transition-all relative">
              <div>
                <h3 className="text-xl font-bold text-zinc-200 mb-2">Enterprise</h3>
                <p className="text-zinc-500 text-xs mb-6">Per aziende strutturate con flussi ed ERP personalizzati.</p>
                
                <div className="border-b border-zinc-850 pb-6 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-zinc-400">Canone personalizzato</span>
                    <span className="text-2xl font-bold text-white">~€500</span>
                    <span className="text-zinc-500 text-xs">/mo</span>
                  </div>
                  {/* Prezzo setup nascosto */}
                </div>

                <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span><strong>Agenti Virtuali Illimitati</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Integrazioni ERP, Database e CRM aziendali (Hubspot, Salesforce, SAP)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Knowledge Base custom integrata</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Hosting dedicato su server privato</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>SLA di risposta e supporto 24/7 dedicato</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Sviluppo di strumenti su misura</span>
                  </li>
                </ul>
              </div>

              <a 
                href="https://app.personaleartificiale.it?plan=enterprise" 
                className="w-full text-center py-3.5 px-4 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all shadow-md"
              >
                Contatta per Preventivo
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 md:py-32 bg-zinc-900/10 border-t border-zinc-900 px-6">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-6 uppercase tracking-wider">
              Domande Frequenti
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Hai domande? Abbiamo risposte
            </h2>
            <p className="text-zinc-400 text-base max-w-lg mx-auto">
              Ecco le risposte ad alcune delle domande più comuni che i nostri clienti ci rivolgono prima di iniziare.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Come fa il Dipendente Virtuale ad accedere ai miei dati aziendali?",
                a: "L'accesso avviene in modo completamente sicuro tramite OAuth 2.0 (l'autenticazione ufficiale Google). Tu decidi quali strumenti collegare. L'AI leggerà solo ciò che è necessario per eseguire i tuoi ordini e i dati non verranno mai usati per addestrare modelli esterni."
              },
              {
                q: "Devo configurare un nuovo numero di telefono?",
                a: "No! Puoi utilizzare il tuo numero di telefono aziendale WhatsApp o Telegram esistente. L'attivazione richiede solo la scansione di un codice QR tramite la dashboard, esattamente come faresti per collegare WhatsApp Web."
              },
              {
                q: "Qual è la precisione dell'AI? Risponde in modo corretto?",
                a: "La precisione è estremamente elevata perché integriamo la tecnologia RAG (Retrieval-Augmented Generation). Caricando i tuoi listini, cataloghi o FAQ in PDF, l'agente risponderà attenendosi esclusivamente a quelle informazioni. Se una domanda esula dalle sue conoscenze, ti inoltrerà la conversazione chiedendoti istruzioni."
              },
              {
                q: "Quanto tempo richiede la configurazione?",
                a: "L'attivazione tecnica richiede meno di 15 minuti. Una volta effettuato il pagamento, la nostra dashboard ti guiderà passo-passo nel setup del tono di voce, caricamento PDF, autorizzazione Google e scansione QR code. Sarà pronto all'istante."
              },
              {
                q: "È previsto un contratto di vincolo temporale?",
                a: "Nessun vincolo! Puoi decidere di disattivare l'abbonamento mensile in qualsiasi momento direttamente dalla tua area clienti. Il setup iniziale copre il nostro affiancamento dedicato e l'attivazione dell'infrastruttura di memoria."
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between font-bold text-zinc-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-purple-400 shrink-0" />
                    {item.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform duration-300 shrink-0 ${faqOpen === idx ? "rotate-180 text-purple-400" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {faqOpen === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-sm text-zinc-400 border-t border-zinc-950/20 pt-3 leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-6 bg-gradient-to-b from-zinc-950 to-zinc-900 relative">
        <div className="max-w-5xl mx-auto rounded-[32px] bg-gradient-to-tr from-purple-900/30 via-zinc-900/80 to-blue-900/10 border border-purple-500/20 p-8 md:p-16 text-center relative overflow-hidden shadow-2xl glow-purple">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
          
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-6 animate-pulse" />
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-[1.2]">
            Fai il salto di qualità.<br />Assumi Personale Artificiale.
          </h2>
          <p className="text-zinc-300 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Smetti di perdere ore dietro a compiti ripetitivi. Affida l'agenda, l'archiviazione e le email ad un dipendente virtuale efficiente, puntuale e instancabile.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
            <a 
              href="#prezzi"
              className="px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 group transition-all"
            >
              Guarda i Piani & Prezzi
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="https://app.personaleartificiale.it"
              className="px-8 py-4 rounded-xl text-base font-medium border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white transition-all"
            >
              Prova l'App / Accedi
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 mt-8 text-xs text-zinc-500">
            <Shield className="w-4 h-4 text-zinc-600" />
            Pagamenti sicuri gestiti da Stripe • Nessun vincolo di rinnovo • Attivazione in 15 minuti
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 bg-zinc-950 text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-zinc-200">Personale Artificiale</span>
            </div>
            <p className="text-[11px] text-zinc-500 max-w-sm text-center md:text-left mt-1">
              Personale Artificiale S.r.l. • Via della Scrofa 104, 00186 Roma (RM) • Cap. Soc. €10.000 i.v. • P.IVA / C.F. IT12345678901 • Numero REA RM-9876543
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500 font-medium">
              <a href="#come-funziona" className="hover:text-zinc-300 transition-colors">Come funziona</a>
              <a href="#caratteristiche" className="hover:text-zinc-300 transition-colors">Integrazioni</a>
              <a href="#prezzi" className="hover:text-zinc-300 transition-colors">Prezzi</a>
              <a href="#faq" className="hover:text-zinc-300 transition-colors">FAQ</a>
              <a href="https://app.personaleartificiale.it" className="hover:text-zinc-300 transition-colors">Dashboard</a>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs text-zinc-500 border-t border-zinc-900/50 pt-3 w-full md:w-auto md:justify-end">
              <Link to="/privacy" className="hover:text-zinc-300 transition-colors underline">Privacy Policy</Link>
              <span>•</span>
              <Link to="/cookie-policy" className="hover:text-zinc-300 transition-colors underline">Cookie Policy</Link>
              <span>•</span>
              <Link to="/termini-servizio" className="hover:text-zinc-300 transition-colors underline">Termini di Servizio</Link>
            </div>

            <p className="text-[10px] text-zinc-600 mt-1">
              © 2026 Personale Artificiale. Tutti i diritti riservati. Realizzato con <a href="https://cto.new" className="underline hover:text-zinc-400">cto.new</a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
