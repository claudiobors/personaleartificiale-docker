import { useState } from "react";
import { AlertTriangle, ArrowRight, Download, KeyRound, MessageCircle, Trash2 } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import type { UserProfile } from "../types";

interface Props {
  user: UserProfile;
  onProfileSaved: (user: UserProfile) => void;
  onNavigateToNumbers: () => void;
  onLogout: () => void;
}

export function AccountSettings({ user, onProfileSaved, onNavigateToNumbers, onLogout }: Props) {
  const [accountType, setAccountType] = useState(user.accountType || "business");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyError, setPrivacyError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await backend.updateProfile({ accountType });
      setAccountType(result.user.accountType || accountType);
      onProfileSaved(result.user);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profilo non aggiornato.");
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setPrivacyLoading(true);
    setPrivacyError("");
    try {
      const result = await backend.exportPrivacy();
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "personale-artificiale-dati.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setPrivacyError(cause instanceof Error ? cause.message : "Esportazione dati non riuscita.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSaved(false);
    try {
      await backend.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSaved(true);
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "Cambio password non riuscito.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const deleteAccount = async () => {
    const confirmation = window.prompt("Per eliminare account e dati scrivi ELIMINA");
    if (confirmation !== "ELIMINA") return;
    setPrivacyLoading(true);
    setPrivacyError("");
    try {
      await backend.deleteAccount(confirmation);
      onLogout();
    } catch (cause) {
      setPrivacyError(cause instanceof Error ? cause.message : "Eliminazione account non riuscita.");
      setPrivacyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Impostazioni" description="Tipo di profilo e gestione dei tuoi dati." />

      <section className="pa-panel p-6 sm:p-8">
        <h3 className="font-extrabold">Tipo di profilo</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Usato per adattare l'onboarding e i suggerimenti dell'assistente.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Tipo profilo</span>
            <select value={accountType} onChange={(event) => setAccountType(event.target.value as "private" | "business" | "professional")} className="pa-input">
              <option value="business">Azienda</option>
              <option value="professional">Professionista</option>
              <option value="private">Privato</option>
            </select>
          </label>
          <button onClick={() => void save()} disabled={saving} className="pa-button px-5 py-3">
            {saving ? "Salvo…" : "Salva"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {saved && <p className="mt-3 text-sm text-emerald-300">Profilo aggiornato.</p>}
      </section>

      <section className="pa-panel p-6 sm:p-8">
        <h3 className="flex items-center gap-2 font-extrabold"><KeyRound className="h-4 w-4 text-blue-300" /> Sicurezza account</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Cambiando la password, tutte le altre sessioni aperte (altri browser o dispositivi) vengono disconnesse.</p>
        <form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Password attuale</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="pa-input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Nuova password</span>
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="pa-input"
              placeholder="Almeno 8 caratteri"
            />
          </label>
          <div className="sm:col-span-2">
            <button disabled={passwordSaving} className="pa-button px-5 py-3">
              {passwordSaving ? "Aggiorno…" : "Aggiorna password"}
            </button>
          </div>
        </form>
        {passwordError && <p className="mt-3 text-sm text-red-300">{passwordError}</p>}
        {passwordSaved && <p className="mt-3 text-sm text-emerald-300">Password aggiornata.</p>}
      </section>

      <section className="pa-panel p-6 sm:p-8">
        <h3 className="flex items-center gap-2 font-extrabold"><MessageCircle className="h-4 w-4 text-blue-300" /> WhatsApp</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Collega il tuo numero WhatsApp perché diventi il bot, e autorizza eventuali altri numeri (socio, familiare, collega) a scrivergli: mai un canale di assistenza per i tuoi clienti.
        </p>
        <button onClick={onNavigateToNumbers} className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold hover:bg-white/10">
          Gestisci WhatsApp <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className="pa-panel p-6 sm:p-8">
        <h3 className="font-extrabold">Privacy e dati personali</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Scarica i dati associati al tuo account o richiedi l'eliminazione definitiva.</p>
        {privacyError && <p className="mt-3 text-sm text-red-300">{privacyError}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => void exportData()} disabled={privacyLoading} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <Download className="h-4 w-4" /> Esporta dati
          </button>
          <button onClick={() => void deleteAccount()} disabled={privacyLoading} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            <Trash2 className="h-4 w-4" /> Elimina account e dati
          </button>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          L'eliminazione è definitiva: rimuove account, documenti, configurazione, cronologia messaggi e annulla anche l'abbonamento Stripe (e gli eventuali extra attivi).
        </p>
      </section>
    </div>
  );
}
