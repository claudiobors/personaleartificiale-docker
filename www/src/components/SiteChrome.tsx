import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2.5"
      aria-label="Personale Artificiale, home"
    >
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ${compact ? "h-9 w-9 p-1" : "h-11 w-11 p-1.5"}`}
      >
        <img
          src="/logo-pa-transparent.png"
          alt=""
          className="h-full w-full object-contain"
        />
      </span>
      <span className="truncate text-[0.95rem] font-extrabold tracking-tight text-white min-[375px]:text-base sm:text-lg">
        Personale Artificiale
      </span>
    </Link>
  );
}

const navItems = [
  { href: "/#come-funziona", label: "Come funziona" },
  { href: "/#cosa-fa", label: "Cosa fa" },
  { href: "/#prezzi", label: "Piani" },
  { href: "/#faq", label: "Domande" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnWide = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", closeOnWide);
    return () => window.removeEventListener("resize", closeOnWide);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-white/10 bg-[#05070b]/95 backdrop-blur-xl">
      <div className="pa-container flex h-full min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <Brand compact />
        </div>
        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Navigazione principale"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link to="/calcolatore" className="pa-button">
            Calcola le ore
          </Link>
        </nav>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white md:hidden"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navigazione mobile"
          className="fixed left-0 top-[72px] max-h-[calc(100dvh-72px)] w-[100vw] overflow-x-hidden overflow-y-auto border-b border-white/10 bg-[#080b11] px-3 py-4 shadow-2xl md:hidden"
        >
          <div className="mx-auto flex w-full max-w-xl flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-4 font-semibold text-slate-200 hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/calcolatore"
              onClick={() => setOpen(false)}
              className="pa-button mt-3 w-full"
            >
              Calcola le ore che puoi liberare
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#05070b] py-10">
      <div className="pa-container grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Brand compact />
          <p className="pa-muted mt-4 max-w-lg text-sm leading-6">
            Un aiuto concreto in chat per alleggerire il lavoro quotidiano,
            lasciando a te decisioni e controllo.
          </p>
          <a
            href="mailto:info@personaleartificiale.it"
            className="mt-3 inline-block text-sm text-blue-300 underline"
          >
            info@personaleartificiale.it
          </a>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <nav
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
            aria-label="Link legali"
          >
            <Link to="/privacy" className="text-slate-300 hover:text-white">
              Privacy
            </Link>
            <Link
              to="/cookie-policy"
              className="text-slate-300 hover:text-white"
            >
              Cookie Policy
            </Link>
            <Link
              to="/termini-servizio"
              className="text-slate-300 hover:text-white"
            >
              Termini
            </Link>
          </nav>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Personale Artificiale. Tutti i diritti
            riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LegalLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="pa-page">
      <SiteHeader />
      <main className="pa-container pb-20 pt-32">
        <div className="mx-auto max-w-3xl">
          <span className="pa-kicker">{eyebrow}</span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="pa-muted mt-3 text-sm">
            Ultimo aggiornamento: {updated}
          </p>
          <article className="pa-card mt-10 space-y-8 p-5 text-sm leading-7 text-slate-300 sm:p-8 [&_a]:text-blue-300 [&_a]:underline [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
