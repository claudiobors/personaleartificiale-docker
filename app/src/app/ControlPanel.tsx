import { useEffect, useState } from "react";
import {
  Bot,
  ClipboardList,
  CreditCard,
  Database,
  Gauge,
  MessageCircle,
  Settings,
  ShieldCheck,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import { backend } from "./api";
import { Shell, type NavGroup } from "./Shell";
import { AdminLogs } from "./sections/AdminLogs";
import { AdminUsers } from "./sections/AdminUsers";
import { AdminWhatsApp } from "./sections/AdminWhatsApp";
import { AccountSettings } from "./sections/AccountSettings";
import { AgentProfile } from "./sections/AgentProfile";
import { Billing } from "./sections/Billing";
import { Credits } from "./sections/Credits";
import { Knowledge } from "./sections/Knowledge";
import { Overview } from "./sections/Overview";
import { WhatsAppClientSection } from "./sections/WhatsAppClient";
import type { KnowledgeFile, OnboardingData, Plan, UserProfile, WhatsAppContact } from "./types";

type SectionKey =
  | "overview"
  | "knowledge"
  | "agent"
  | "whatsapp-client"
  | "credits"
  | "billing"
  | "settings"
  | "admin-users"
  | "admin-logs"
  | "admin-whatsapp";

interface Props {
  user: UserProfile;
  plan?: Plan;
  onboarding: Partial<OnboardingData>;
  files: KnowledgeFile[];
  stats: { files: number; ready_files: number; messages: number; whatsapp_status?: string | null };
  onFilesChange: (files: KnowledgeFile[]) => void;
  onEditProfile: () => void;
  onUserChange: (user: UserProfile) => void;
  onPortal: () => void;
  onLogout: () => void;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  overview: "Panoramica",
  knowledge: "Documenti",
  agent: "Assistente",
  "whatsapp-client": "WhatsApp",
  credits: "Crediti",
  billing: "Fatturazione",
  settings: "Impostazioni",
  "admin-users": "Amministrazione · Utenti",
  "admin-logs": "Amministrazione · Log",
  "admin-whatsapp": "Amministrazione · WhatsApp",
};

export function ControlPanel({
  user,
  plan,
  onboarding,
  files,
  stats,
  onFilesChange,
  onEditProfile,
  onUserChange,
  onPortal,
  onLogout,
}: Props) {
  const [active, setActive] = useState<SectionKey>("overview");
  const [whatsAppContact, setWhatsAppContact] = useState<WhatsAppContact | null>(null);

  useEffect(() => {
    backend.whatsappContact().then((result) => setWhatsAppContact(result.contact)).catch(() => undefined);
  }, []);

  const navGroups: NavGroup[] = [
    {
      label: "Area di lavoro",
      items: [
        { key: "overview", label: "Panoramica", icon: Gauge },
        { key: "knowledge", label: "Documenti", icon: Database, badge: files.length ? String(files.length) : undefined },
        { key: "agent", label: "Assistente", icon: Bot },
        { key: "whatsapp-client", label: "WhatsApp", icon: MessageCircle },
      ],
    },
    {
      label: "Utilizzo",
      items: [
        { key: "credits", label: "Crediti", icon: Wallet },
        { key: "billing", label: "Fatturazione", icon: CreditCard },
      ],
    },
    {
      label: "Account",
      items: [{ key: "settings", label: "Impostazioni", icon: Settings }],
    },
  ];

  if (user.isAdmin) {
    navGroups.push({
      label: "Amministrazione",
      items: [
        { key: "admin-users", label: "Utenti", icon: UsersIcon },
        { key: "admin-logs", label: "Log", icon: ClipboardList },
        { key: "admin-whatsapp", label: "WhatsApp piattaforma", icon: ShieldCheck },
      ],
    });
  }

  return (
    <Shell
      user={user}
      planLabel={plan?.name || "Nessun piano"}
      navGroups={navGroups}
      active={active}
      onNavigate={(key) => setActive(key as SectionKey)}
      pageTitle={SECTION_LABELS[active]}
      onLogout={onLogout}
    >
      {active === "overview" && (
        <Overview
          user={user}
          plan={plan}
          onboarding={onboarding}
          stats={stats}
          whatsAppContact={whatsAppContact}
          onNavigate={(key) => setActive(key as SectionKey)}
          onEditProfile={onEditProfile}
        />
      )}
      {active === "knowledge" && <Knowledge files={files} onFilesChange={onFilesChange} />}
      {active === "agent" && <AgentProfile onboarding={onboarding} onEdit={onEditProfile} />}
      {active === "whatsapp-client" && (
        <WhatsAppClientSection
          contact={whatsAppContact}
          whatsappPhone={user.whatsappPhone || ""}
          onGoToSettings={() => setActive("settings")}
        />
      )}
      {active === "credits" && <Credits user={user} plan={plan} />}
      {active === "billing" && <Billing user={user} plan={plan} onPortal={onPortal} />}
      {active === "settings" && <AccountSettings user={user} onProfileSaved={onUserChange} onLogout={onLogout} />}
      {active === "admin-users" && user.isAdmin && <AdminUsers />}
      {active === "admin-logs" && user.isAdmin && <AdminLogs />}
      {active === "admin-whatsapp" && user.isAdmin && <AdminWhatsApp />}
    </Shell>
  );
}
