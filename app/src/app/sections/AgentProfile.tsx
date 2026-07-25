import { useEffect, useState } from "react";
import { AlertTriangle, Bot, Building2, CheckCircle2, Gauge, Globe, Loader2 } from "lucide-react";
import { backend } from "../api";
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

      <InternetAccessCard />
    </div>
  );
}

function InternetAccessCard() {
  const [enabled, setEnabled] = useState(false);
  const [restrictions, setRestrictions] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.internetAccess();
      setEnabled(result.settings.enabled);
      setRestrictions(result.settings.restrictions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impostazioni non disponibili.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await backend.saveInternetAccess({ enabled, restrictions });
      setEnabled(result.settings.enabled);
      setRestrictions(result.settings.restrictions);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pa-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
            <Globe className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold">Accesso a internet</h2>
            <p className="text-xs text-zinc-500">Il tuo assistente può cercare informazioni aggiornate sul web quando la knowledge base non basta</p>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
      </div>

      <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <span>
          <span className="block text-sm font-bold">Cerca sul web quando serve</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Disattivato: risponde solo con documenti e profilo aziendale.</span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => { setEnabled(event.target.checked); setSaved(false); }}
          className="h-5 w-5 shrink-0 accent-blue-500"
        />
      </label>

      {enabled && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Limiti per la ricerca web (facoltativo)</span>
          <textarea
            value={restrictions}
            onChange={(event) => { setRestrictions(event.target.value); setSaved(false); }}
            rows={3}
            className="pa-input resize-y"
            placeholder='Es. "Usa internet solo per orari, meteo o eventi pubblici. Non cercare informazioni su concorrenti o persone specifiche."'
          />
          <p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-zinc-500">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            L'assistente userà comunque prima la tua knowledge base: il web è solo un'integrazione per ciò che i documenti non coprono.
          </p>
        </label>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-300">Impostazioni salvate.</p>}

      <button onClick={() => void save()} disabled={saving || loading} className="pa-button mt-5 px-5 py-2.5 text-sm">
        {saving ? "Salvo…" : "Salva"}
      </button>
    </section>
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
