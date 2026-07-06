import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Mail, FileText, Cpu, X, Menu, Sparkles, ArrowRight, Phone, MessageSquare, Folder, Brain, Lock, Zap, Database, Shield, Check, Minus, HelpCircle, ChevronDown } from "lucide-react";
const Trello = (props) => /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", ...props, children: [
  /* @__PURE__ */ jsx("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }),
  /* @__PURE__ */ jsx("rect", { width: "3", height: "9", x: "7", y: "7", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { width: "3", height: "5", x: "14", y: "7", rx: "1" })
] });
const CHAT_DEMOS = [{
  id: "calendar",
  label: "Organizza Agenda",
  icon: Calendar,
  messages: [{
    sender: "user",
    text: "Ciao Marco, fissa un incontro con Giulia per domani alle 15:30 e inviale un invito mail."
  }, {
    sender: "agent",
    status: "thinking",
    text: "Analizzo la richiesta e controllo la disponibilità..."
  }, {
    sender: "agent",
    status: "acting",
    text: "📅 Ricerca slot su Google Calendar..."
  }, {
    sender: "agent",
    text: "Perfetto! Ho bloccato domani alle 15:30 sul tuo calendario. Invito email inviato con successo a Giulia (giulia@azienda.it). Ho salvato l'evento come 'Allineamento Personale Artificiale'."
  }]
}, {
  id: "email",
  label: "Triage & Email",
  icon: Mail,
  messages: [{
    sender: "user",
    text: "Controlla se ci sono email importanti arrivate stamattina e fammi un riassunto veloce."
  }, {
    sender: "agent",
    status: "thinking",
    text: "Accedo alla casella Gmail aziendale..."
  }, {
    sender: "agent",
    status: "acting",
    text: "🔍 Scansione email ricevute nelle ultime 6 ore..."
  }, {
    sender: "agent",
    text: "Hai ricevuto 14 email. Solo 1 richiede attenzione immediata:\n\n**Mittente:** Studio Legale Rossi\n**Oggetto:** Firma Contratto MVP\n**Sintesi:** Chiedono se possiamo anticipare la firma a venerdì mattina.\n\nVuoi che risponda proponendo le ore 10:00?"
  }]
}, {
  id: "document",
  label: "Archivia Documento",
  icon: FileText,
  messages: [{
    sender: "user",
    text: "Ti inoltro questa fattura PDF ricevuta dal fornitore. Archiviala in Drive nella cartella corretta e segna la scadenza."
  }, {
    sender: "agent",
    status: "thinking",
    text: "Ricezione file 'fattura-2026-894.pdf'..."
  }, {
    sender: "agent",
    status: "acting",
    text: "📂 Estrazione dati con AI e caricamento in Google Drive..."
  }, {
    sender: "agent",
    text: "Ricevuto! Ho estratto i dati:\n• **Fornitore:** CloudTech SRL\n• **Importo:** €1.240,00\n• **Scadenza:** 30/07/2026\n\nFattura archiviata nella cartella 'Acquisti 2026' su Google Drive. Ho anche aggiunto un promemoria sul tuo calendario per la scadenza di pagamento."
  }]
}, {
  id: "trello",
  label: "Aggiorna Trello / CRM",
  icon: Trello,
  messages: [{
    sender: "user",
    text: "Abbiamo chiuso l'accordo con l'azienda SolarFuture! Crea una scheda su Trello per avviare il progetto."
  }, {
    sender: "agent",
    status: "thinking",
    text: "Elaborazione lead e aggiornamento flussi..."
  }, {
    sender: "agent",
    status: "acting",
    text: "📋 Creazione scheda su Trello (Bacheca Clienti)..."
  }, {
    sender: "agent",
    text: "Congratulazioni per la firma! 🎉\nHo creato la scheda **'SolarFuture - Kickoff'** nella lista 'In Corso' su Trello. Ho inserito la checklist iniziale, assegnato il project manager e allegato il link del contratto."
  }]
}];
function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemo, setActiveDemo] = useState(CHAT_DEMOS[0]);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("assistente-esecutivo");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setVisibleMessages([]);
    setMsgIndex(0);
    setIsTyping(false);
    let timer;
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
          }, 2e3);
        }
      }
    };
    loadNextMessage();
    return () => clearTimeout(timer);
  }, [activeDemo, msgIndex]);
  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden selection:bg-purple-500 selection:text-white", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" }),
    /* @__PURE__ */ jsx("div", { className: "absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" }),
    /* @__PURE__ */ jsx("div", { className: "absolute bottom-[1000px] left-10 w-[400px] h-[400px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none" }),
    /* @__PURE__ */ jsxs("header", { className: "fixed top-0 left-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900", children: [
      /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-6 h-20 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-3 group", children: [
          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300", children: /* @__PURE__ */ jsx(Cpu, { className: "w-5 h-5 text-white" }) }),
          /* @__PURE__ */ jsx("span", { className: "text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent", children: "Personale Artificiale" })
        ] }),
        /* @__PURE__ */ jsxs("nav", { className: "hidden md:flex items-center gap-8", children: [
          /* @__PURE__ */ jsx("a", { href: "#come-funziona", className: "text-sm text-zinc-400 hover:text-white transition-colors", children: "Come Funziona" }),
          /* @__PURE__ */ jsx("a", { href: "#caratteristiche", className: "text-sm text-zinc-400 hover:text-white transition-colors", children: "Integrazioni" }),
          /* @__PURE__ */ jsx("a", { href: "#prezzi", className: "text-sm text-zinc-400 hover:text-white transition-colors", children: "Prezzi" }),
          /* @__PURE__ */ jsx("a", { href: "#faq", className: "text-sm text-zinc-400 hover:text-white transition-colors", children: "FAQ" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "hidden md:flex items-center gap-4", children: [
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", className: "px-5 py-2.5 rounded-xl text-sm font-medium border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all", children: "Accedi" }),
          /* @__PURE__ */ jsx("a", { href: "#prezzi", className: "px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-300", children: "Assumi un Agente" })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: "md:hidden p-2 text-zinc-400 hover:text-white transition-colors", children: mobileMenuOpen ? /* @__PURE__ */ jsx(X, { className: "w-6 h-6" }) : /* @__PURE__ */ jsx(Menu, { className: "w-6 h-6" }) })
      ] }),
      /* @__PURE__ */ jsx(AnimatePresence, { children: mobileMenuOpen && /* @__PURE__ */ jsxs(motion.div, { initial: {
        opacity: 0,
        y: -20
      }, animate: {
        opacity: 1,
        y: 0
      }, exit: {
        opacity: 0,
        y: -20
      }, className: "md:hidden absolute top-20 left-0 w-full bg-zinc-950 border-b border-zinc-900 py-6 px-6 flex flex-col gap-5 shadow-2xl", children: [
        /* @__PURE__ */ jsx("a", { href: "#come-funziona", onClick: () => setMobileMenuOpen(false), className: "text-base text-zinc-400 hover:text-white transition-colors", children: "Come Funziona" }),
        /* @__PURE__ */ jsx("a", { href: "#caratteristiche", onClick: () => setMobileMenuOpen(false), className: "text-base text-zinc-400 hover:text-white transition-colors", children: "Integrazioni" }),
        /* @__PURE__ */ jsx("a", { href: "#prezzi", onClick: () => setMobileMenuOpen(false), className: "text-base text-zinc-400 hover:text-white transition-colors", children: "Prezzi" }),
        /* @__PURE__ */ jsx("a", { href: "#faq", onClick: () => setMobileMenuOpen(false), className: "text-base text-zinc-400 hover:text-white transition-colors", children: "FAQ" }),
        /* @__PURE__ */ jsx("div", { className: "h-[1px] bg-zinc-900 my-2" }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", onClick: () => setMobileMenuOpen(false), className: "w-full text-center py-3 rounded-xl text-sm font-medium border border-zinc-800 hover:bg-zinc-900 transition-all", children: "Accedi" }),
          /* @__PURE__ */ jsx("a", { href: "#prezzi", onClick: () => setMobileMenuOpen(false), className: "w-full text-center py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-500 text-white transition-all", children: "Assumi un Agente" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "pt-32 pb-24 md:pt-40 md:pb-32 px-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-7 flex flex-col items-start text-left", children: [
        /* @__PURE__ */ jsxs(motion.div, { initial: {
          opacity: 0,
          y: 15
        }, animate: {
          opacity: 1,
          y: 0
        }, transition: {
          duration: 0.5
        }, className: "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 uppercase tracking-wider", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "w-3.5 h-3.5 text-purple-400 animate-pulse" }),
          "La Rivoluzione del Lavoro Digitale"
        ] }),
        /* @__PURE__ */ jsxs(motion.h1, { initial: {
          opacity: 0,
          y: 20
        }, animate: {
          opacity: 1,
          y: 0
        }, transition: {
          duration: 0.6,
          delay: 0.1
        }, className: "text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6", children: [
          "Assumi il tuo primo",
          " ",
          /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-purple-400 via-purple-500 to-blue-400 bg-clip-text text-transparent", children: "Dipendente Virtuale" }),
          " ",
          "su WhatsApp"
        ] }),
        /* @__PURE__ */ jsx(motion.p, { initial: {
          opacity: 0,
          y: 20
        }, animate: {
          opacity: 1,
          y: 0
        }, transition: {
          duration: 0.6,
          delay: 0.2
        }, className: "text-lg text-zinc-400 mb-10 max-w-2xl leading-relaxed", children: "Operativi h24, con zero curva di apprendimento. Comunica a voce o via testo proprio come faresti con un collaboratore umano. L'AI gestisce le tue email, organizza il calendario, aggiorna il CRM e archivia file su Drive. **Risparmia fino a mezza giornata di lavoro al giorno.**" }),
        /* @__PURE__ */ jsxs(motion.div, { initial: {
          opacity: 0,
          y: 20
        }, animate: {
          opacity: 1,
          y: 0
        }, transition: {
          duration: 0.6,
          delay: 0.3
        }, className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto", children: [
          /* @__PURE__ */ jsxs("a", { href: "#prezzi", className: "px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2.5 transition-all duration-300 group", children: [
            "Inizia Ora",
            /* @__PURE__ */ jsx(ArrowRight, { className: "w-5 h-5 group-hover:translate-x-1 transition-transform" })
          ] }),
          /* @__PURE__ */ jsx("a", { href: "#come-funziona", className: "px-8 py-4 rounded-xl text-base font-medium border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 flex items-center justify-center gap-2 transition-all", children: "Come funziona" })
        ] }),
        /* @__PURE__ */ jsxs(motion.div, { initial: {
          opacity: 0
        }, animate: {
          opacity: 1
        }, transition: {
          duration: 1,
          delay: 0.5
        }, className: "grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-zinc-900 w-full max-w-md", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: "15 Min" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 uppercase font-semibold mt-1", children: "Tempo di attivazione" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: "4.5 Ore" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 uppercase font-semibold mt-1", children: "Risparmiate al giorno" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-white", children: "Zero" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 uppercase font-semibold mt-1", children: "Software da imparare" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(motion.div, { initial: {
        opacity: 0,
        scale: 0.95
      }, animate: {
        opacity: 1,
        scale: 1
      }, transition: {
        duration: 0.8
      }, className: "lg:col-span-5 flex flex-col items-center justify-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "w-full max-w-[360px] aspect-[9/19] rounded-[48px] bg-zinc-900 p-3.5 border-4 border-zinc-800 shadow-2xl relative ring-1 ring-white/10 glow-purple", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-32 bg-zinc-900 rounded-b-2xl z-20 flex items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "w-12 h-1 bg-zinc-800 rounded-full mb-1" }) }),
          /* @__PURE__ */ jsxs("div", { className: "w-full h-full rounded-[38px] bg-zinc-950 overflow-hidden relative flex flex-col", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/95 border-b border-zinc-850 px-4 pt-6 pb-3 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow", children: "PA" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-zinc-200", children: "Personale Artificiale" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-zinc-400", children: "Online • Agente Attivo" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx(Phone, { className: "w-4 h-4 text-zinc-400" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-3.5 text-xs flex flex-col justify-end", children: [
              /* @__PURE__ */ jsx("div", { className: "text-center text-[10px] text-zinc-500 py-1 bg-zinc-900/40 rounded-lg mx-6 mb-2", children: "🔒 Chat crittografata con WhatsApp Business API" }),
              visibleMessages.map((msg, idx) => /* @__PURE__ */ jsxs("div", { className: `flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`, children: [
                /* @__PURE__ */ jsx("div", { className: `p-3 rounded-2xl ${msg.sender === "user" ? "bg-purple-600 text-white rounded-tr-none" : msg.status === "thinking" ? "bg-zinc-900 text-purple-300 italic border border-purple-950 rounded-tl-none animate-pulse" : msg.status === "acting" ? "bg-blue-950 text-blue-300 font-medium border border-blue-900 rounded-tl-none" : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none"}`, style: {
                  whiteSpace: "pre-line"
                }, children: msg.text }),
                /* @__PURE__ */ jsx("span", { className: "text-[9px] text-zinc-500 mt-1 px-1", children: msg.sender === "user" ? "Tu" : "Agente AI" })
              ] }, idx)),
              isTyping && /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900 text-zinc-400 border border-zinc-800 p-3 rounded-2xl rounded-tl-none self-start flex items-center gap-1 max-w-[80%] animate-pulse", children: [
                /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce", style: {
                  animationDelay: "0ms"
                } }),
                /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce", style: {
                  animationDelay: "150ms"
                } }),
                /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce", style: {
                  animationDelay: "300ms"
                } })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-3 bg-zinc-900/90 border-t border-zinc-850 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("div", { className: "flex-1 bg-zinc-950 rounded-full px-3 py-2 text-[11px] text-zinc-500 border border-zinc-850", children: "Messaggio..." }),
              /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white", children: /* @__PURE__ */ jsx(MessageSquare, { className: "w-3.5 h-3.5" }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-8 flex flex-wrap justify-center gap-2 max-w-sm", children: CHAT_DEMOS.map((demo) => {
          const IconComp = demo.icon;
          return /* @__PURE__ */ jsxs("button", { onClick: () => setActiveDemo(demo), className: `px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all duration-300 ${activeDemo.id === demo.id ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10" : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"}`, children: [
            /* @__PURE__ */ jsx(IconComp, { className: "w-3.5 h-3.5" }),
            demo.label
          ] }, demo.id);
        }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "py-12 border-t border-b border-zinc-900 bg-zinc-950/50", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-6 text-center", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs uppercase font-semibold tracking-widest text-zinc-500 mb-8", children: "Si collega all'istante con i tuoi strumenti di lavoro quotidiano" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-300", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold tracking-wider text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Mail, { className: "w-4 h-4 text-red-400" }),
          " Gmail"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold tracking-wider text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Calendar, { className: "w-4 h-4 text-blue-400" }),
          " Google Calendar"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold tracking-wider text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Folder, { className: "w-4 h-4 text-yellow-500" }),
          " Google Drive"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold tracking-wider text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Trello, { className: "w-4 h-4 text-blue-500" }),
          " Trello"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold tracking-wider text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(MessageSquare, { className: "w-4 h-4 text-green-500" }),
          " WhatsApp"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold tracking-wider text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Brain, { className: "w-4 h-4 text-purple-500" }),
          " Telegram"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "come-funziona", className: "py-24 md:py-32 px-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-6 uppercase tracking-wider", children: "Onboarding Fulmineo" }),
      /* @__PURE__ */ jsx("h2", { className: "text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight", children: "Pronto a lavorare in 3 semplici passi" }),
      /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-lg mb-20 max-w-2xl mx-auto", children: "Nessuna programmazione, nessuna configurazione server. Scegli un piano, inserisci i file di conoscenza ed inquadra il codice QR." }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-10 relative", children: [
        /* @__PURE__ */ jsx("div", { className: "hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-purple-500/50 to-blue-500/50 -z-10" }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 relative hover:border-purple-500/20 transition-all duration-300 group", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -top-5 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-purple-400 group-hover:scale-110 transition-transform", children: "1" }),
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-6", children: /* @__PURE__ */ jsx(Lock, { className: "w-6 h-6 text-purple-400" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-zinc-100 mb-3", children: "Scegli e Acquista" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Completa l'acquisto sicuro con Stripe. Verrai reindirizzato all'istante sulla dashboard utente." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 relative hover:border-blue-500/20 transition-all duration-300 group", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -top-5 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-blue-400 group-hover:scale-110 transition-transform", children: "2" }),
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6", children: /* @__PURE__ */ jsx(Brain, { className: "w-6 h-6 text-blue-400" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-zinc-100 mb-3", children: "Configura & Allena" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Seleziona il tono di voce e carica PDF (listini, FAQ, cataloghi) per formare l'AI sul tuo business." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 relative hover:border-purple-500/20 transition-all duration-300 group", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -top-5 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-purple-400 group-hover:scale-110 transition-transform", children: "3" }),
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-6", children: /* @__PURE__ */ jsx(Zap, { className: "w-6 h-6 text-purple-400" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-zinc-100 mb-3", children: "Scansiona e Attiva" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Inquadra il codice QR con WhatsApp per collegare l'agente. Da questo momento è operativo h24." })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "caratteristiche", className: "py-24 bg-zinc-900/30 border-t border-b border-zinc-900 px-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center max-w-3xl mx-auto mb-20", children: [
        /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 uppercase tracking-wider", children: "Cosa Può Fare Per Te" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight", children: "Un assistente completo per liberare il tuo tempo" }),
        /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-lg leading-relaxed", children: "Il tuo dipendente virtuale non si limita a rispondere: agisce direttamente sui tuoi applicativi, automatizzando i flussi quotidiani ripetitivi." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-purple-500/20 hover:bg-zinc-900 transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400", children: /* @__PURE__ */ jsx(Mail, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white mb-3", children: "Triage & Gestione Email" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Filtra la posta in arrivo, individua le priorità urgenti, scrive bozze di risposta professionali e ti aggiorna via chat sulle novità." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-purple-500/20 hover:bg-zinc-900 transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400", children: /* @__PURE__ */ jsx(Calendar, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white mb-3", children: "Pianificazione Agenda" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Gestisce prenotazioni, fissa riunioni di allineamento su Google Calendar, invia inviti email automatici ed evita conflitti di orari." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-purple-500/20 hover:bg-zinc-900 transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400", children: /* @__PURE__ */ jsx(Folder, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white mb-3", children: "Archiviazione Intelligente" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Inoltra file, fatture o PDF via WhatsApp. L'agente li analizza, estrae i dati chiave e li cataloga con ordine su Google Drive." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-blue-500/20 hover:bg-zinc-900 transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400", children: /* @__PURE__ */ jsx(Trello, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white mb-3", children: "Aggiornamento CRM & Trello" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Monitora lo stato di avanzamento delle attività, crea e muove schede su Trello o Asana, e aggiorna i dettagli dei clienti sul CRM aziendale." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-blue-500/20 hover:bg-zinc-900 transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400", children: /* @__PURE__ */ jsx(Database, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white mb-3", children: "Memoria e Conoscenza RAG" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Carica listini prezzi e file PDF. Grazie al sistema di memoria RAG a lungo termine, l'AI risponde con estrema precisione basandosi sui tuoi dati." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/50 border border-zinc-850 rounded-3xl p-8 hover:border-blue-500/20 hover:bg-zinc-900 transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400", children: /* @__PURE__ */ jsx(Shield, { className: "w-6 h-6" }) }),
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white mb-3", children: "Massima Sicurezza e Privacy" }),
          /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm leading-relaxed", children: "Integrazioni certificate OAuth 2.0. I dati aziendali e della chat sono crittografati e protetti, senza rivendita a terze parti." })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "prezzi", className: "py-24 md:py-32 px-6 relative", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center max-w-3xl mx-auto mb-20", children: [
        /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 uppercase tracking-wider", children: "Piani Semplici, Senza Sorprese" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight text-white", children: "Scegli il livello del tuo collaboratore AI" }),
        /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-lg leading-relaxed", children: "Tutti i piani includono un periodo di attivazione assistito. Prezzi trasparenti con setup una tantum + abbonamento mensile." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/40 border border-zinc-850 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-750 transition-all relative", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-zinc-200 mb-2", children: "Assistente Esecutivo" }),
            /* @__PURE__ */ jsx("p", { className: "text-zinc-500 text-xs mb-6", children: "Ideale per Freelance, Artigiani e Professionisti." }),
            /* @__PURE__ */ jsxs("div", { className: "border-b border-zinc-850 pb-6 mb-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-4xl font-extrabold text-white", children: "€97" }),
                /* @__PURE__ */ jsx("span", { className: "text-zinc-500 text-sm font-medium", children: "/ mese" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-purple-400 font-semibold mt-1", children: "+ €399 costo di setup iniziale" })
            ] }),
            /* @__PURE__ */ jsxs("ul", { className: "space-y-4 mb-8 text-sm text-zinc-300", children: [
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  /* @__PURE__ */ jsx("strong", { children: "1 Agente Virtuale" }),
                  " dedicato"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Integrazione Google Calendar & Gmail" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Archiviazione Documenti Drive" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Connessione WhatsApp o Telegram" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3 text-zinc-500", children: [
                /* @__PURE__ */ jsx(Minus, { className: "w-5 h-5 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Memoria RAG (knowledge base PDF)" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3 text-zinc-500", children: [
                /* @__PURE__ */ jsx(Minus, { className: "w-5 h-5 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Supporto prioritario 1-to-1" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
            plan: "executive"
          }, className: "w-full text-center py-3.5 px-4 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all shadow-md", children: "Inizia Ora" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/60 border-2 border-purple-500 rounded-3xl p-8 flex flex-col justify-between hover:scale-[1.02] transition-all relative shadow-xl shadow-purple-500/5 glow-purple", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow", children: "Il Più Popolare 🔥" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-2xl font-bold text-white mb-2 mt-2", children: "L'Ufficio Digitale" }),
            /* @__PURE__ */ jsx("p", { className: "text-purple-300 text-xs mb-6 font-medium", children: "Ottimo per PMI, Agenzie, Studi Professionali." }),
            /* @__PURE__ */ jsxs("div", { className: "border-b border-zinc-850 pb-6 mb-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-5xl font-extrabold text-white", children: "€297" }),
                /* @__PURE__ */ jsx("span", { className: "text-zinc-400 text-sm font-medium", children: "/ mese" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "text-sm text-purple-400 font-bold mt-1", children: "+ €999 costo di setup iniziale" })
            ] }),
            /* @__PURE__ */ jsxs("ul", { className: "space-y-4 mb-8 text-sm text-zinc-200", children: [
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx("strong", { children: "Fino a 3 Agenti Cooperatori" }) })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Integrazione Google Workspace completa" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Integrazione Trello, Asana & CRM" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Connessione WhatsApp + Telegram" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  /* @__PURE__ */ jsx("strong", { children: "Memoria RAG & caricamento PDF" }),
                  " (Allena l'AI)"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Supporto prioritario e Setup guidato" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
            plan: "digital-office"
          }, className: "w-full text-center py-4 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white transition-all shadow-lg shadow-purple-500/20", children: "Inizia Setup Assistito" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/40 border border-zinc-850 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-750 transition-all relative", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-zinc-200 mb-2", children: "Enterprise" }),
            /* @__PURE__ */ jsx("p", { className: "text-zinc-500 text-xs mb-6", children: "Per aziende strutturate con flussi ed ERP personalizzati." }),
            /* @__PURE__ */ jsxs("div", { className: "border-b border-zinc-850 pb-6 mb-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-1", children: [
                /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-zinc-400", children: "Canone personalizzato" }),
                /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold text-white", children: "~€500" }),
                /* @__PURE__ */ jsx("span", { className: "text-zinc-500 text-xs", children: "/mo" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-purple-400 font-semibold mt-1", children: "Setup personalizzato a partire da €3.500" })
            ] }),
            /* @__PURE__ */ jsxs("ul", { className: "space-y-4 mb-8 text-sm text-zinc-300", children: [
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx("strong", { children: "Agenti Virtuali Illimitati" }) })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Integrazioni ERP, Database e CRM aziendali (Hubspot, Salesforce, SAP)" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Knowledge Base custom integrata" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Hosting dedicato su server privato" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "SLA di risposta e supporto 24/7 dedicato" })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(Check, { className: "w-5 h-5 text-purple-500 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsx("span", { children: "Sviluppo di strumenti su misura" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
            plan: "enterprise"
          }, className: "w-full text-center py-3.5 px-4 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all shadow-md", children: "Contatta per Preventivo" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "faq", className: "py-24 md:py-32 bg-zinc-900/10 border-t border-zinc-900 px-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-6 uppercase tracking-wider", children: "Domande Frequenti" }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight", children: "Hai domande? Abbiamo risposte" }),
        /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-base max-w-lg mx-auto", children: "Ecco le risposte ad alcune delle domande più comuni che i nostri clienti ci rivolgono prima di iniziare." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-4", children: [{
        q: "Come fa il Dipendente Virtuale ad accedere ai miei dati aziendali?",
        a: "L'accesso avviene in modo completamente sicuro tramite OAuth 2.0 (l'autenticazione ufficiale Google). Tu decidi quali strumenti collegare. L'AI leggerà solo ciò che è necessario per eseguire i tuoi ordini e i dati non verranno mai usati per addestrare modelli esterni."
      }, {
        q: "Devo configurare un nuovo numero di telefono?",
        a: "No! Puoi utilizzare il tuo numero di telefono aziendale WhatsApp o Telegram esistente. L'attivazione richiede solo la scansione di un codice QR tramite la dashboard, esattamente come faresti per collegare WhatsApp Web."
      }, {
        q: "Qual è la precisione dell'AI? Risponde in modo corretto?",
        a: "La precisione è estremamente elevata perché integriamo la tecnologia RAG (Retrieval-Augmented Generation). Caricando i tuoi listini, cataloghi o FAQ in PDF, l'agente risponderà attenendosi esclusivamente a quelle informazioni. Se una domanda esula dalle sue conoscenze, ti inoltrerà la conversazione chiedendoti istruzioni."
      }, {
        q: "Quanto tempo richiede la configurazione?",
        a: "L'attivazione tecnica richiede meno di 15 minuti. Una volta effettuato il pagamento, la nostra dashboard ti guiderà passo-passo nel setup del tono di voce, caricamento PDF, autorizzazione Google e scansione QR code. Sarà pronto all'istante."
      }, {
        q: "È previsto un contratto di vincolo temporale?",
        a: "Nessun vincolo! Puoi decidere di disattivare l'abbonamento mensile in qualsiasi momento direttamente dalla tua area clienti. Il setup iniziale copre il nostro affiancamento dedicato e l'attivazione dell'infrastruttura di memoria."
      }].map((item, idx) => /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all duration-300", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => toggleFaq(idx), className: "w-full px-6 py-5 text-left flex items-center justify-between font-bold text-zinc-200 hover:text-white transition-colors", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx(HelpCircle, { className: "w-5 h-5 text-purple-400 shrink-0" }),
            item.q
          ] }),
          /* @__PURE__ */ jsx(ChevronDown, { className: `w-5 h-5 text-zinc-500 transition-transform duration-300 shrink-0 ${faqOpen === idx ? "rotate-180 text-purple-400" : ""}` })
        ] }),
        /* @__PURE__ */ jsx(AnimatePresence, { initial: false, children: faqOpen === idx && /* @__PURE__ */ jsx(motion.div, { initial: {
          height: 0,
          opacity: 0
        }, animate: {
          height: "auto",
          opacity: 1
        }, exit: {
          height: 0,
          opacity: 0
        }, transition: {
          duration: 0.3
        }, children: /* @__PURE__ */ jsx("div", { className: "px-6 pb-6 text-sm text-zinc-400 border-t border-zinc-950/20 pt-3 leading-relaxed", children: item.a }) }) })
      ] }, idx)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "py-24 md:py-32 px-6 bg-gradient-to-b from-zinc-950 to-zinc-900 relative", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto rounded-[32px] bg-gradient-to-tr from-purple-900/30 via-zinc-900/80 to-blue-900/10 border border-purple-500/20 p-8 md:p-16 text-center relative overflow-hidden shadow-2xl glow-purple", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" }),
      /* @__PURE__ */ jsx(Sparkles, { className: "w-12 h-12 text-purple-400 mx-auto mb-6 animate-pulse" }),
      /* @__PURE__ */ jsxs("h2", { className: "text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-[1.2]", children: [
        "Fai il salto di qualità.",
        /* @__PURE__ */ jsx("br", {}),
        "Assumi Personale Artificiale."
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-zinc-300 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed", children: "Smetti di perdere ore dietro a compiti ripetitivi. Affida l'agenda, l'archiviazione e le email ad un dipendente virtuale efficiente, puntuale e instancabile." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4", children: [
        /* @__PURE__ */ jsxs("a", { href: "#prezzi", className: "px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 group transition-all", children: [
          "Guarda i Piani & Prezzi",
          /* @__PURE__ */ jsx(ArrowRight, { className: "w-5 h-5 group-hover:translate-x-1 transition-transform" })
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/dashboard", className: "px-8 py-4 rounded-xl text-base font-medium border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white transition-all", children: "Prova Demo Onboarding" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 mt-8 text-xs text-zinc-500", children: [
        /* @__PURE__ */ jsx(Shield, { className: "w-4 h-4 text-zinc-600" }),
        "Pagamenti sicuri gestiti da Stripe • Nessun vincolo di rinnovo • Attivazione in 15 minuti"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-zinc-900 py-12 px-6 bg-zinc-950 text-zinc-400", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center md:items-start gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center", children: /* @__PURE__ */ jsx(Cpu, { className: "w-4 h-4 text-white" }) }),
          /* @__PURE__ */ jsx("span", { className: "text-base font-bold text-zinc-200", children: "Personale Artificiale" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] text-zinc-500 max-w-sm text-center md:text-left mt-1", children: "Personale Artificiale S.r.l. • Via della Scrofa 104, 00186 Roma (RM) • Cap. Soc. €10.000 i.v. • P.IVA / C.F. IT12345678901 • Numero REA RM-9876543" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center md:items-end gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center gap-6 text-xs text-zinc-500 font-medium", children: [
          /* @__PURE__ */ jsx("a", { href: "#come-funziona", className: "hover:text-zinc-300 transition-colors", children: "Come funziona" }),
          /* @__PURE__ */ jsx("a", { href: "#caratteristiche", className: "hover:text-zinc-300 transition-colors", children: "Integrazioni" }),
          /* @__PURE__ */ jsx("a", { href: "#prezzi", className: "hover:text-zinc-300 transition-colors", children: "Prezzi" }),
          /* @__PURE__ */ jsx("a", { href: "#faq", className: "hover:text-zinc-300 transition-colors", children: "FAQ" }),
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", className: "hover:text-zinc-300 transition-colors", children: "Dashboard" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center gap-4 text-xs text-zinc-500 border-t border-zinc-900/50 pt-3 w-full md:w-auto md:justify-end", children: [
          /* @__PURE__ */ jsx(Link, { to: "/privacy", className: "hover:text-zinc-300 transition-colors underline", children: "Privacy Policy" }),
          /* @__PURE__ */ jsx("span", { children: "•" }),
          /* @__PURE__ */ jsx(Link, { to: "/cookie-policy", className: "hover:text-zinc-300 transition-colors underline", children: "Cookie Policy" }),
          /* @__PURE__ */ jsx("span", { children: "•" }),
          /* @__PURE__ */ jsx(Link, { to: "/termini-servizio", className: "hover:text-zinc-300 transition-colors underline", children: "Termini di Servizio" })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-zinc-600 mt-1", children: [
          "© 2026 Personale Artificiale. Tutti i diritti riservati. Realizzato con ",
          /* @__PURE__ */ jsx("a", { href: "https://cto.new", className: "underline hover:text-zinc-400", children: "cto.new" })
        ] })
      ] })
    ] }) })
  ] });
}
export {
  Home as component
};
