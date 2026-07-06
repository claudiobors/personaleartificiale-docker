import { jsxs, jsx } from "react/jsx-runtime";
import { createRootRoute, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";
const appCss = "/assets/app-CJoUQTlT.css";
const Route$8 = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Personale Artificiale - Dipendenti Virtuali AI per la tua Azienda" },
      { name: "description", content: "Assumi collaboratori virtuali basati su AI che lavorano direttamente su WhatsApp e Telegram. Collega Gmail, Calendario, CRM, Drive e Trello in pochi minuti." }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" }
    ]
  }),
  notFoundComponent: () => /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold mb-2", children: "404 - Pagina non trovata" }),
    /* @__PURE__ */ jsx("p", { className: "text-zinc-400 text-sm mb-6", children: "La risorsa che stai cercando non esiste o è stata spostata." }),
    /* @__PURE__ */ jsx(Link, { to: "/", className: "px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm transition-all", children: "Torna alla Home" })
  ] }),
  component: RootComponent
});
function RootComponent() {
  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    const consent = localStorage.getItem("pa_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);
  const handleAcceptAll = () => {
    localStorage.setItem("pa_cookie_consent", "all");
    setShowBanner(false);
  };
  const handleRejectAll = () => {
    localStorage.setItem("pa_cookie_consent", "necessary");
    setShowBanner(false);
  };
  return /* @__PURE__ */ jsxs(RootDocument, { children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    showBanner && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md bg-zinc-900/95 border border-purple-500/20 rounded-2xl p-6 shadow-2xl z-[99999] backdrop-blur-md animate-in slide-in-from-bottom-5 duration-500", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4 mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0", children: /* @__PURE__ */ jsx(Cookie, { className: "w-5 h-5 animate-pulse" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-white flex items-center gap-1.5", children: "Rispetto della tua Privacy (GDPR)" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-zinc-400 leading-relaxed mt-1", children: [
            "Utilizziamo i cookie per migliorare il funzionamento del sito, gestire il checkout di Stripe ed elaborare analisi statistiche anonime. Puoi decidere quali accettare. Consulta la nostra ",
            /* @__PURE__ */ jsx(Link, { to: "/privacy", className: "text-purple-400 hover:underline", children: "Privacy Policy" }),
            " e ",
            /* @__PURE__ */ jsx(Link, { to: "/cookie-policy", className: "text-purple-400 hover:underline", children: "Cookie Policy" }),
            " per maggiori dettagli."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-2.5 justify-end", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleRejectAll,
            className: "px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-850 transition-all text-center",
            children: "Solo Necessari"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleAcceptAll,
            className: "px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 shadow shadow-purple-500/10 transition-all text-center",
            children: "Accetta Tutti"
          }
        )
      ] })
    ] })
  ] });
}
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "it", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$7 = () => import("./termini-servizio-DGZnHEOI.js");
const Route$7 = createFileRoute("/termini-servizio")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./termini-DGZnHEOI.js");
const Route$6 = createFileRoute("/termini")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./roi-BQfSKZmL.js");
const Route$5 = createFileRoute("/roi")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./privacy-WBp9hVpS.js");
const Route$4 = createFileRoute("/privacy")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./cookie-policy-C_vUDPsU.js");
const Route$3 = createFileRoute("/cookie-policy")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./calcolatore-BQfSKZmL.js");
const Route$2 = createFileRoute("/calcolatore")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./ads-BQfSKZmL.js");
const Route$1 = createFileRoute("/ads")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./index-pJ6fJWcF.js");
const Route = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const TerminiServizioRoute = Route$7.update({
  id: "/termini-servizio",
  path: "/termini-servizio",
  getParentRoute: () => Route$8
});
const TerminiRoute = Route$6.update({
  id: "/termini",
  path: "/termini",
  getParentRoute: () => Route$8
});
const RoiRoute = Route$5.update({
  id: "/roi",
  path: "/roi",
  getParentRoute: () => Route$8
});
const PrivacyRoute = Route$4.update({
  id: "/privacy",
  path: "/privacy",
  getParentRoute: () => Route$8
});
const CookiePolicyRoute = Route$3.update({
  id: "/cookie-policy",
  path: "/cookie-policy",
  getParentRoute: () => Route$8
});
const CalcolatoreRoute = Route$2.update({
  id: "/calcolatore",
  path: "/calcolatore",
  getParentRoute: () => Route$8
});
const AdsRoute = Route$1.update({
  id: "/ads",
  path: "/ads",
  getParentRoute: () => Route$8
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$8
});
const rootRouteChildren = {
  IndexRoute,
  AdsRoute,
  CalcolatoreRoute,
  CookiePolicyRoute,
  PrivacyRoute,
  RoiRoute,
  TerminiRoute,
  TerminiServizioRoute
};
const routeTree = Route$8._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultNotFoundComponent: () => /* @__PURE__ */ jsx("p", { children: "Not found" })
  });
}
export {
  getRouter
};
