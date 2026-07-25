import { CreditCard } from "lucide-react";
import { PageHeader } from "../Shell";
import type { Plan, UserProfile } from "../types";

interface Props {
  user: UserProfile;
  plan?: Plan;
  onPortal: () => void;
}

export function Billing({ user, plan, onPortal }: Props) {
  const renewal = user.subscriptionCurrentPeriodEnd
    ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(user.subscriptionCurrentPeriodEnd))
    : "Gestito da Stripe";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Abbonamento" title="Fatturazione" description="Gestisci piano, metodo di pagamento e fatture dal portale Stripe." />

      <section className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <div className="pa-panel p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-blue-300">Piano attuale</p>
          <h2 className="mt-2 text-2xl font-black">{plan?.name}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <BillingItem label="Canone" value={(plan?.monthlyPriceFormatted || "?") + " / mese"} />
            <BillingItem label="Prossimo rinnovo" value={renewal} />
            <BillingItem label="Stato" value="Attivo" />
            <BillingItem label="Rinnovo" value="Automatico" />
          </div>
          <button onClick={onPortal} className="pa-button mt-7 flex items-center gap-2 px-5 py-3">
            <CreditCard className="h-4 w-4" /> Apri il portale Stripe
          </button>
        </div>
        <aside className="pa-panel p-6">
          <h3 className="font-extrabold">Nel portale puoi</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li>• Aggiornare carta e dati di fatturazione</li>
            <li>• Consultare e scaricare le fatture</li>
            <li>• Verificare i prossimi addebiti</li>
            <li>• Gestire o disdire l'abbonamento</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}

function BillingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="pa-panel-tight p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  );
}
