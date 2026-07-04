import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Personale Artificiale | Area riservata" },
      {
        name: "description",
        content:
          "Configura e gestisci il tuo aiuto digitale Personale Artificiale.",
      },
      { name: "theme-color", content: "#05070b" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/logo-pa-transparent.png" },
      { rel: "apple-touch-icon", href: "/logo-pa-transparent.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="pa-page flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <img
        src="/logo-pa-transparent.png"
        alt=""
        className="mb-5 h-16 w-16 rounded-2xl bg-white object-contain p-1.5"
      />
      <h1 className="mb-2 text-3xl font-extrabold">Pagina non trovata</h1>
      <p className="pa-muted mb-6 text-sm">
        La pagina che cerchi non è disponibile.
      </p>
      <Link to="/" className="pa-button">
        Torna all’area riservata
      </Link>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  const [showSheet, setShowSheet] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("pa_cookie_consent")) {
      const timer = window.setTimeout(() => setShowSheet(true), 500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (showSheet) acceptButtonRef.current?.focus();
  }, [showSheet]);

  const closeSheet = () => {
    localStorage.setItem("pa_cookie_consent", "necessary");
    setShowSheet(false);
  };

  return (
    <RootDocument>
      <Outlet />
      {showSheet && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/70 px-0 sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-cookie-title"
            aria-describedby="app-cookie-description"
            className="mx-auto max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#2b3953] bg-[#0d111a] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 id="app-cookie-title" className="text-lg font-extrabold">
                  Solo tecnologie necessarie
                </h2>
                <p
                  id="app-cookie-description"
                  className="pa-muted mt-1 text-sm leading-6"
                >
                  Usiamo solo tecnologie necessarie per far funzionare l’area
                  riservata e ricordare questa scelta. Nessun cookie
                  pubblicitario.
                </p>
              </div>
            </div>
            <p className="pa-muted mb-5 text-sm">
              Leggi la{" "}
              <a
                href="https://www.personaleartificiale.it/privacy"
                onClick={() => setShowSheet(false)}
                className="text-blue-300 underline"
              >
                Privacy
              </a>{" "}
              e la{" "}
              <a
                href="https://www.personaleartificiale.it/cookie-policy"
                onClick={() => setShowSheet(false)}
                className="text-blue-300 underline"
              >
                Cookie Policy
              </a>
              .
            </p>
            <button
              ref={acceptButtonRef}
              type="button"
              onClick={closeSheet}
              className="pa-button w-full"
            >
              Ho capito
            </button>
          </section>
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
