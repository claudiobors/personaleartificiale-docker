import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Cpu, ArrowLeft, Cookie } from "lucide-react";
function CookiePolicy() {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between relative", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" }),
    /* @__PURE__ */ jsx("div", { className: "absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none" }),
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
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400", children: /* @__PURE__ */ jsx(Cookie, { className: "w-6 h-6" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs uppercase font-bold tracking-widest text-purple-400", children: "Informativa Legale" }),
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white mt-1", children: "Cookie Policy" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-relaxed", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-zinc-400", children: [
          "Ultimo aggiornamento: ",
          /* @__PURE__ */ jsx("strong", { children: "2 luglio 2026" })
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          "Questo sito web utilizza i cookie e tecnologie simili per garantire il corretto funzionamento delle procedure e migliorare l'esperienza di navigazione degli utenti. Questo documento fornisce informazioni dettagliate sull'uso dei cookie, su come sono utilizzati da ",
          /* @__PURE__ */ jsx("strong", { children: "Personale Artificiale" }),
          " e su come gestirli."
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "1. Cosa sono i Cookie?" }),
          /* @__PURE__ */ jsx("p", { children: "I cookie sono piccoli file di testo che i siti visitati dagli utenti inviano ai loro terminali (solitamente al browser), dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva. I cookie possono essere utilizzati per diverse finalità (es. autenticazione informatica, monitoraggio di sessioni, memorizzazione di informazioni su specifiche configurazioni riguardanti gli utenti, memorizzazione delle preferenze, ecc.)." })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "2. Tipologie di Cookie Utilizzati" }),
          /* @__PURE__ */ jsx("p", { children: "Nel nostro sito utilizziamo le seguenti tipologie di cookie:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-4 text-zinc-400", children: [
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Cookie Tecnici e Necessari (Prima parte):" }),
              " Questi cookie sono essenziali per il funzionamento del sito. Consentono la navigazione tra le pagine, la memorizzazione delle sessioni di checkout sicure di Stripe, il mantenimento dello stato di autenticazione nella dashboard utente e la memorizzazione della tua preferenza circa l'accettazione dei cookie stessi. Senza questi cookie, il sito non potrebbe funzionare correttamente."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Cookie Analitici (Terza parte):" }),
              " Utilizzati per raccogliere informazioni in forma aggregata e anonima sul numero degli utenti e su come questi visitano il sito (es. Google Analytics con IP anonimizzato). Questi cookie ci aiutano a misurare le performance e a migliorare l'usabilità del sito."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Cookie di Profilazione e Marketing (Terza parte):" }),
              " Utilizzati per tracciare la provenienza delle visite dalle nostre campagne pubblicitarie (es. Google Ads, LinkedIn Pixel). Questi cookie sono installati solo previo tuo esplicito consenso fornito tramite il nostro Cookie Banner."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "3. Elenco dei Cookie di Terze Parti" }),
          /* @__PURE__ */ jsx("p", { children: "Navigando su questo sito potresti ricevere cookie da siti gestiti da altre organizzazioni. In particolare:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-2 text-zinc-400", children: [
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Stripe:" }),
              " Cookie tecnici essenziali per elaborare i pagamenti degli abbonamenti e prevenire frodi finanziarie."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Google Workspace API:" }),
              " Cookie temporanei utilizzati durante la procedura di connessione OAuth 2.0 sicura per identificare l'utente."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { className: "text-zinc-200", children: "Google Ads / Tag Manager:" }),
              " Cookie di tracciamento delle conversioni pubblicitarie (attivati solo con consenso)."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "4. Gestione e Disabilitazione dei Cookie" }),
          /* @__PURE__ */ jsx("p", { children: "Puoi modificare in qualsiasi momento le tue preferenze relative ai cookie cliccando sul pulsante di revoca nel banner oppure configurando direttamente il tuo browser." }),
          /* @__PURE__ */ jsx("p", { children: "La disabilitazione totale o parziale dei cookie tecnici può compromettere l'utilizzo delle funzionalità riservate agli utenti registrati (in particolare l'accesso alla dashboard e l'onboarding)." }),
          /* @__PURE__ */ jsx("p", { children: "Per disabilitare i cookie tramite i browser principali:" }),
          /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 space-y-1 text-zinc-400 text-xs", children: [
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Google Chrome:" }),
              " Impostazioni ",
              ">",
              " Privacy e sicurezza ",
              ">",
              " Cookie e altri dati dei siti."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Mozilla Firefox:" }),
              " Opzioni ",
              ">",
              " Privacy e sicurezza ",
              ">",
              " Cookie e dati dei siti web."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Safari:" }),
              " Preferenze ",
              ">",
              " Privacy ",
              ">",
              " Blocca tutti i cookie."
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Microsoft Edge:" }),
              " Impostazioni ",
              ">",
              " Autorizzazioni sito ",
              ">",
              " Cookie e dati del sito."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "5. Contatti" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "Per qualsiasi chiarimento in merito alla presente informativa sull'uso dei cookie, puoi contattare il Titolare del Trattamento all'indirizzo email ",
            /* @__PURE__ */ jsx("a", { href: "mailto:privacy@personaleartificiale.it", className: "text-purple-400 hover:underline", children: "privacy@personaleartificiale.it" }),
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
  CookiePolicy as component
};
