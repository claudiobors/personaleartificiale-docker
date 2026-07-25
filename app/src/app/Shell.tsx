import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, LogOut, Menu, Settings, ShieldCheck, X } from "lucide-react";
import { backend } from "./api";
import type { UserProfile } from "./types";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface ShellProps {
  user: UserProfile;
  planLabel: string;
  navGroups: NavGroup[];
  active: string;
  onNavigate: (key: string) => void;
  pageTitle: string;
  pageDescription?: string;
  headerActions?: React.ReactNode;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Shell({
  user,
  planLabel,
  navGroups,
  active,
  onNavigate,
  pageTitle,
  pageDescription,
  headerActions,
  onLogout,
  children,
}: ShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = (key: string) => {
    onNavigate(key);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-white lg:flex">
      {drawerOpen && (
        <button
          aria-label="Chiudi menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-white/8 bg-[#080b11] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/8 px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <img src="/logo-pa-transparent.png" alt="" className="h-full w-full object-contain" />
            </span>
            <p className="truncate text-sm font-black tracking-tight">Personale Artificiale</p>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Chiudi menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="pa-scroll flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    data-active={active === item.key}
                    className="pa-nav-item w-full"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    {item.badge && (
                      <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-black text-zinc-300">{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/8 p-3">
          <button onClick={() => navigate("settings")} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-extrabold text-white">{user.name}</span>
              <span className="block truncate text-[11px] text-zinc-500">{planLabel}</span>
            </span>
            <Settings className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Topbar
          user={user}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          headerActions={headerActions}
          onOpenDrawer={() => setDrawerOpen(true)}
          onSettings={() => onNavigate("settings")}
          onLogout={onLogout}
        />
        <main className="pa-scroll mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function Topbar({
  user,
  pageTitle,
  pageDescription,
  headerActions,
  onOpenDrawer,
  onSettings,
  onLogout,
}: {
  user: UserProfile;
  pageTitle: string;
  pageDescription?: string;
  headerActions?: React.ReactNode;
  onOpenDrawer: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#05070b]/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={onOpenDrawer} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Apri menu">
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-white sm:text-lg">{pageTitle}</h1>
          {pageDescription && <p className="hidden truncate text-xs text-zinc-500 sm:block">{pageDescription}</p>}
        </div>

        {headerActions && <div className="hidden shrink-0 items-center gap-2 sm:flex">{headerActions}</div>}

        <SystemStatus />

        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 hover:bg-white/[0.06]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black">
              {initials(user.name)}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14] shadow-2xl shadow-black/50">
              <div className="border-b border-white/8 p-4">
                <p className="truncate text-sm font-extrabold text-white">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
                {user.isAdmin && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                    <ShieldCheck className="h-3 w-3" /> Amministratore
                  </span>
                )}
              </div>
              <button onClick={() => { setMenuOpen(false); onSettings(); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-bold text-zinc-300 hover:bg-white/5">
                <Settings className="h-4 w-4" /> Impostazioni account
              </button>
              <button onClick={onLogout} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-bold text-red-300 hover:bg-red-500/10">
                <LogOut className="h-4 w-4" /> Esci
              </button>
            </div>
          )}
        </div>
      </div>
      {headerActions && (
        <div className="flex items-center gap-2 border-t border-white/8 px-4 py-2.5 sm:hidden">{headerActions}</div>
      )}
    </header>
  );
}

function SystemStatus() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const result = await backend.health();
        if (!cancelled) setOk(result.status === "ok");
      } catch {
        if (!cancelled) setOk(false);
      }
    };
    void check();
    const interval = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <span
      title={ok === null ? "Verifico stato sistema…" : ok ? "Sistema operativo" : "Problemi di connessione al servizio"}
      className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-zinc-400 md:flex"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok === null ? "bg-zinc-500" : ok ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-red-400 shadow-[0_0_6px_#f87171]"
        }`}
      />
      {ok === null ? "Verifica…" : ok ? "Operativo" : "Anomalia"}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-400">{eyebrow}</p>}
        <h2 className={eyebrow ? "mt-1.5 text-xl font-black text-white sm:text-2xl" : "text-xl font-black text-white sm:text-2xl"}>{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
