import { Bot, Building2, CheckCircle2, Gauge } from "lucide-react";
import { PageHeader } from "../Shell";
import type { OnboardingData } from "../types";

interface Props {
  onboarding: Partial<OnboardingData>;
  onEdit: () => void;
}

export function AgentProfile({ onboarding, onEdit }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurazione attuale"
        title={onboarding.agentName || "Assistente Virtuale"}
        description={onboarding.roleDescription || "Configura ruolo, tono e regole del tuo assistente."}
        action={
          <button onClick={onEdit} className="pa-button px-5 py-2.5 text-sm">Modifica configurazione</button>
        }
      />

      <div className="pa-panel p-6 sm:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileItem label="Azienda" value={onboarding.companyName} icon={Building2} />
          <ProfileItem label="Settore" value={onboarding.industry} icon={Gauge} />
          <ProfileItem label="Tono di voce" value={onboarding.toneOfVoice} icon={Bot} />
          <ProfileItem label="Obiettivi" value={onboarding.mainGoals} icon={CheckCircle2} />
          <ProfileItem label="Prodotti e servizi" value={onboarding.productsServices} icon={Building2} />
          <ProfileItem label="Clienti ideali" value={onboarding.targetAudience} icon={Gauge} />
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ label, value, icon: Icon }: { label: string; value?: string; icon: typeof Building2 }) {
  return (
    <div className="pa-panel-tight p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-zinc-500"><Icon className="h-4 w-4 text-blue-400" /> {label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{value || "Non specificato"}</p>
    </div>
  );
}
