import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Cpu, ArrowLeft, Shield } from "lucide-react";
function PrivacyPolicy() {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between relative", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" }),
    /* @__PURE__ */ jsx("div", { className: "absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none" }),
    /* @__PURE__ */ jsx("header", { className: "bg-zinc-900/30 backdrop-blur-md border-b border-zinc-900/80 px-6 py-4 sticky top-0 z-50", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center", children: /* @__PURE__ */ jsx(Cpu, { className: "w-4.5 h-4.5 text-white" }) }),
        /* @__PURE__ */ jsx("span", { className: "text-base font-bold text-white", children: "Personale Artificiale" })
      ] }),
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors border border-zinc-800 rounded-full px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-900", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "w-3.5 h-3.5" }),
        " Torna al sito"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "flex-1 max-w-4xl w-full mx-auto px-6 py-12", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-8", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400", children: /* @__PURE__ */ jsx(Shield, { className: "w-6 h-6" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs uppercase font-bold tracking-widest text-purple-400", children: "Informativa Legale" }),
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white mt-1", children: "Privacy Policy" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-relaxed", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-zinc-400", children: [
          "Ultimo aggiornamento: ",
          /* @__PURE__ */ jsx("strong", { children: "2 luglio 2026" })
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          "Benvenuto su ",
          /* @__PURE__ */ jsx("strong", { children: "Personale Artificiale" }),
          ". La tua privacy e la sicurezza dei tuoi dati sono la nostra massima priorità. Questa Privacy Policy descrive come raccogliamo, utilizziamo, proteggiamo e condividiamo i tuoi dati personali quando utilizzi la nostra piattaforma e i nostri servizi, comprese le nostre integrazioni con WhatsApp, Telegram e Google Workspace."
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "1. Titolare del Trattamento" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "Il titolare del trattamento dei dati è:",
            /* @__PURE__ */ jsx("br", {}),
            /* @__PURE__ */ jsx("strong", { children: "Personale Artificiale S.r.l." }),
            /* @__PURE__ */ jsx("br", {}),
            "Via della Scrofa 104, 00186 Roma (RM)",
            /* @__PURE__ */ jsx("br", {}),
            "P.IVA: IT12345678901",
            /* @__PURE__ */ jsx("br", {}),
            "Email di contatto: ",
            /* @__PURE__ */ jsx("a", { href: "mailto:privacy@personaleartificiale.it", className: "text-purple-400 hover:underline", children: "privacy@personaleartificiale.it" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "2. Tipologia di Dati Raccolti" }),
          /* @__PURE__ */ jsx("p", { children: "Raccogliamo diverse tipologie di informazioni per fornirti il Servizio ed ottimizzare l'esperienza d'uso:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-2 text-zinc-400", children: [
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Dati Account utente:" }),
              " Nome, cognome, indirizzo email, informazioni di pagamento (elaborate in modo sicuro da Stripe)."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Dati di Configurazione Agente:" }),
              " Nome dell'agente, tono di voce, istruzioni operative, e file PDF caricati come knowledge base aziendale."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Credenziali OAuth e API:" }),
              " Token di autorizzazione Google Workspace (Gmail, Calendar, Drive) per consentire all'agente di eseguire le azioni richieste. Non salviamo password."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Contenuto dei Messaggi:" }),
              " I testi e i messaggi vocali inviati all'agente virtuale via WhatsApp o Telegram, necessari per l'elaborazione dei comandi tramite modelli linguistici (LLM)."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "3. Finalità del Trattamento" }),
          /* @__PURE__ */ jsx("p", { children: "I dati personali vengono raccolti esclusivamente per le seguenti finalità:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-2 text-zinc-400", children: [
            /* @__PURE__ */ jsx("li", { children: "Erogare e gestire il servizio di dipendente virtuale AI." }),
            /* @__PURE__ */ jsx("li", { children: "Permettere l'integrazione e l'esecuzione automatica di task su Gmail, Google Calendar e Google Drive." }),
            /* @__PURE__ */ jsx("li", { children: "Gestire la fatturazione, l'abbonamento e i pagamenti sicuri tramite il circuito Stripe." }),
            /* @__PURE__ */ jsx("li", { children: "Fornire assistenza tecnica e rispondere alle richieste di supporto." }),
            /* @__PURE__ */ jsx("li", { children: "Rispettare gli obblighi di legge in materia fiscale e contabile." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "4. Integrazione Google API ed Evolution API" }),
          /* @__PURE__ */ jsx("p", { children: "Il nostro servizio utilizza le API ufficiali di Google OAuth 2.0. L'uso dei dati ricevuti dalle API di Google da parte di Personale Artificiale rispetta pienamente le norme sul livello di accesso dei dati utente di Google." }),
          /* @__PURE__ */ jsx("p", { children: "I file caricati in formato PDF e i messaggi ricevuti vengono elaborati temporaneamente per consentire l'interazione RAG (Retrieval-Augmented Generation) e l'elaborazione del modello AI. I dati non vengono trasmessi a terzi per scopi promozionali, né utilizzati per l'addestramento di modelli di intelligenza artificiale commerciali generali non controllati dall'utente." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "5. Sicurezza dei Dati" }),
          /* @__PURE__ */ jsx("p", { children: "Adottiamo misure di sicurezza tecnologiche avanzate e organizzative per proteggere i tuoi dati personali da perdita, abuso, accesso non autorizzato o alterazione. Tutti i dati in transito vengono crittografati tramite protocollo SSL/TLS e conservati in server protetti." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "6. Diritti dell'Interessato (GDPR)" }),
          /* @__PURE__ */ jsx("p", { children: "In conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR), hai il diritto di:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-2 text-zinc-400", children: [
            /* @__PURE__ */ jsx("li", { children: "Accedere ai tuoi dati personali in nostro possesso." }),
            /* @__PURE__ */ jsx("li", { children: "Chiedere la rettifica dei dati inesatti o l'integrazione di quelli incompleti." }),
            /* @__PURE__ */ jsx("li", { children: `Chiedere la cancellazione permanente dei tuoi dati personali ("diritto all'oblio").` }),
            /* @__PURE__ */ jsx("li", { children: "Revocare in qualsiasi momento il consenso alle integrazioni Google Workspace o WhatsApp." }),
            /* @__PURE__ */ jsx("li", { children: "Presentare un reclamo all'Autorità Garante per la Protezione dei Dati Personali." })
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            "Per esercitare uno qualsiasi di questi diritti, puoi inviarci una richiesta scritta all'indirizzo email ",
            /* @__PURE__ */ jsx("a", { href: "mailto:supporto@personaleartificiale.it", className: "text-purple-400 hover:underline", children: "supporto@personaleartificiale.it" }),
            "."
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-zinc-900 py-8 px-6 bg-zinc-950", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500", children: [
      /* @__PURE__ */ jsx("p", { children: "© 2026 Personale Artificiale S.r.l. Tutti i diritti riservati." }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
        /* @__PURE__ */ jsx(Link, { to: "/privacy", className: "hover:text-zinc-300 transition-colors", children: "Privacy Policy" }),
        /* @__PURE__ */ jsx(Link, { to: "/cookie-policy", className: "hover:text-zinc-300 transition-colors", children: "Cookie Policy" }),
        /* @__PURE__ */ jsx(Link, { to: "/termini-servizio", className: "hover:text-zinc-300 transition-colors", children: "Termini di Servizio" })
      ] })
    ] }) })
  ] });
}
export {
  PrivacyPolicy as component
};
