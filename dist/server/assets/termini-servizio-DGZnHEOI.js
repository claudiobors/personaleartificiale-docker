import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Cpu, ArrowLeft, Scale } from "lucide-react";
function TerminiServizio() {
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
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400", children: /* @__PURE__ */ jsx(Scale, { className: "w-6 h-6" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs uppercase font-bold tracking-widest text-purple-400", children: "Accordo Contrattuale" }),
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white mt-1", children: "Termini di Servizio" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-relaxed", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-zinc-400", children: [
          "Ultimo aggiornamento: ",
          /* @__PURE__ */ jsx("strong", { children: "2 luglio 2026" })
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          `I presenti Termini di Servizio ("Termini") regolano l'accesso e l'uso della piattaforma, del sito web e dei servizi software di intelligenza artificiale forniti da `,
          /* @__PURE__ */ jsx("strong", { children: "Personale Artificiale S.r.l." }),
          ` ("noi", "ci" o "nostro"). Ti preghiamo di leggere attentamente i presenti Termini prima di completare l'acquisto di un abbonamento o di utilizzare i nostri dipendenti virtuali AI.`
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "1. Accettazione dei Termini" }),
          /* @__PURE__ */ jsx("p", { children: "Registrandoti sulla nostra piattaforma, completando il pagamento di setup e abbonamento su Stripe, o utilizzando in qualsiasi modo il nostro software, dichiari di aver letto, compreso e accettato di essere vincolato dai presenti Termini. Se non accetti i presenti Termini, non sei autorizzato a utilizzare il nostro servizio." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "2. Descrizione del Servizio" }),
          /* @__PURE__ */ jsx("p", { children: "Personale Artificiale fornisce software basato su intelligenza artificiale configurabile tramite una dashboard web (onboarding wizard) in grado di integrarsi tramite OAuth 2.0 con i servizi Google Workspace dell'utente (Gmail, Calendar, Drive) e di operare come assistente digitale tramite account WhatsApp o Telegram collegati." }),
          /* @__PURE__ */ jsx("p", { children: "L'utente prende atto e accetta che le risposte dell'agente AI sono generate da modelli linguistici avanzati e, pur essendo addestrate tramite file di conoscenza (PDF), possono eccezionalmente presentare inesattezze. È responsabilità dell'utente monitorare l'attività del dipendente virtuale." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "3. Piani, Prezzi e Politica di Setup" }),
          /* @__PURE__ */ jsx("p", { children: "I nostri piani tariffari prevedono due componenti di costo distinte:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-2 text-zinc-400", children: [
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Costo di Setup iniziale (una tantum):" }),
              " Copre l'attivazione dell'infrastruttura, il provisioning del database di memoria vettoriale e l'assistenza dedicata per l'onboarding. Questo costo viene addebitato immediatamente al momento del checkout e non è rimborsabile una volta avviata la procedura di configurazione dell'agente."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Abbonamento Mensile ricorrente:" }),
              " Consente l'accesso continuo alla piattaforma e l'operatività h24 dell'agente. L'abbonamento si rinnova automaticamente ogni mese."
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "I prezzi correnti sono quelli esposti sul sito al momento dell'acquisto. Tutti i pagamenti sono elaborati in modo sicuro da Stripe." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "4. Cancellazione e Churn Policy" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "L'utente può disdire l'abbonamento mensile in qualsiasi momento, senza alcuna penale, direttamente dalla propria area riservata o contattando il supporto all'indirizzo email ",
            /* @__PURE__ */ jsx("a", { href: "mailto:supporto@personaleartificiale.it", className: "text-purple-400 hover:underline", children: "supporto@personaleartificiale.it" }),
            "."
          ] }),
          /* @__PURE__ */ jsx("p", { children: "In caso di disdetta prima del rinnovo, l'agente virtuale rimarrà operativo fino al termine del periodo mensile già pagato. Alla scadenza, la sessione WhatsApp verrà interrotta e i dati di configurazione verranno archiviati per un periodo di 30 giorni prima di essere eliminati definitivamente per motivi di sicurezza." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "5. Uso Consentito e Limitazioni" }),
          /* @__PURE__ */ jsx("p", { children: "L'utente si impegna a utilizzare il servizio in conformità con tutte le leggi applicabili e a non utilizzare i dipendenti virtuali per:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-2 text-zinc-400", children: [
            /* @__PURE__ */ jsx("li", { children: "Inviare comunicazioni di massa non sollecitate (spam) o promozioni ingannevoli." }),
            /* @__PURE__ */ jsx("li", { children: "Sostituirsi in modo fraudolento all'identità di terzi soggetti o enti pubblici." }),
            /* @__PURE__ */ jsx("li", { children: "Trattare dati bancari protetti o informazioni riservate sensibili in violazione del GDPR." }),
            /* @__PURE__ */ jsx("li", { children: "Svolgere attività illegali o contrarie all'ordine pubblico." })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "Ci riserviamo il diritto di sospendere o interrompere l'accesso al servizio in caso di violazione accertata dei presenti Termini o delle policy di utilizzo di Stripe, WhatsApp/Meta o Google." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "6. Limitazione di Responsabilità" }),
          /* @__PURE__ */ jsx("p", { children: "Nei limiti massimi consentiti dalla legge, Personale Artificiale S.r.l. non sarà responsabile per eventuali danni indiretti, incidentali, speciali, consequenziali o punitivi, o per qualsiasi perdita di profitti o ricavi, derivanti da disservizi di rete, malfunzionamenti delle API di terze parti (Google, Meta), o risposte errate o imprecise fornite dall'agente AI." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "7. Legge Applicabile e Foro Competente" }),
          /* @__PURE__ */ jsx("p", { children: "I presenti Termini sono regolati e interpretati in conformità con la legge italiana. Per qualsiasi controversia derivante dall'interpretazione o dall'esecuzione del presente contratto sarà competente in via esclusiva il Foro di Roma." })
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
  TerminiServizio as component
};
