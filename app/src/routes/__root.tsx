import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  Link,
} from "@tanstack/react-router";
import { type ReactNode, useState, useEffect } from "react";
import { Cookie, X, Check, Shield } from "lucide-react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Personale Artificiale - Dipendenti Virtuali AI per la tua Azienda" },
      { name: "description", content: "Assumi collaboratori virtuali basati su AI che lavorano direttamente su WhatsApp e Telegram. Collega Gmail, Calendario, CRM, Drive e Trello in pochi minuti." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" }
    ],
  }),
  notFoundComponent: () => <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
    <h1 className="text-3xl font-extrabold mb-2">404 - Pagina non trovata</h1>
    <p className="text-zinc-400 text-sm mb-6">La risorsa che stai cercando non esiste o è stata spostata.</p>
    <Link to="/" className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm transition-all">Torna alla Home</Link>
  </div>,
  component: RootComponent,
});

function RootComponent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem("pa_cookie_consent");
    if (!consent) {
      // Delay display slightly for better UX
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

  return (
    <RootDocument>
      <Outlet />

      {/* Cookie Banner (GDPR compliant) */}
      {showBanner && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md bg-zinc-900/95 border border-purple-500/20 rounded-2xl p-6 shadow-2xl z-[99999] backdrop-blur-md animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Cookie className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Rispetto della tua Privacy (GDPR)
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                Utilizziamo i cookie per migliorare il funzionamento del sito, gestire il checkout di Stripe ed elaborare analisi statistiche anonime. Puoi decidere quali accettare. Consulta la nostra <Link to="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link> e <Link to="/cookie-policy" className="text-purple-400 hover:underline">Cookie Policy</Link> per maggiori dettagli.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-end">
            <button
              onClick={handleRejectAll}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-850 transition-all text-center"
            >
              Solo Necessari
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 shadow shadow-purple-500/10 transition-all text-center"
            >
              Accetta Tutti
            </button>
          </div>
        </div>
      )}
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
