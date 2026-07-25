import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { backend } from "../api";
import { PageHeader } from "../Shell";
import { formatNumber } from "../format";
import type { CreditPack, CreditSummary, Plan, UserProfile } from "../types";

interface Props {
  user: UserProfile;
  plan?: Plan;
}

export function Credits({ user, plan }: Props) {
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.credits();
      setCredits(result.credits);
      setPacks(result.packs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Crediti non disponibili.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const buy = async (packId: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await backend.creditCheckout(packId);
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout crediti non disponibile.");
      setLoading(false);
    }
  };

  const balance = credits?.balance ?? user.tokenBalance ?? 0;
  const allowance = credits?.monthlyAllowance ?? user.monthlyTokenAllowance ?? plan?.includedTokens ?? 0;
  const used = credits?.monthlyUsed ?? user.monthlyTokensUsed ?? 0;
  const usedRatio = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilizzo AI"
        title="Crediti e token"
        description="Ogni messaggio WhatsApp e test dashboard consuma crediti in base ai token stimati."
        action={
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </button>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="pa-panel p-6 sm:p-8">
          <h2 className="text-3xl font-black">{formatNumber(balance)} <span className="text-base font-bold text-zinc-500">token</span></h2>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
              <span>Usati questo periodo</span>
              <span>{formatNumber(used)} / {formatNumber(allowance)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${usedRatio}%` }} />
            </div>
          </div>
          {credits?.ledger && credits.ledger.length > 0 && (
            <div className="mt-6 space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Ultimi movimenti</p>
              {credits.ledger.slice(0, 6).map((entry, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                  <span className="truncate text-zinc-400">{entry.reason}</span>
                  <span className={entry.delta >= 0 ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
                    {entry.delta >= 0 ? "+" : ""}{formatNumber(entry.delta)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pa-panel p-6 sm:p-8">
          <h3 className="text-lg font-black">Acquista altri crediti</h3>
          <p className="mt-2 text-sm text-zinc-400">Pagamento sicuro con Stripe. I token vengono accreditati automaticamente al webhook di pagamento.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <article key={pack.id} className="pa-panel-tight p-5">
                <p className="text-xs font-black uppercase tracking-wider text-blue-300">{formatNumber(pack.tokens)} token</p>
                <h4 className="mt-2 font-extrabold">{pack.name}</h4>
                <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{pack.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-xl font-black">{pack.priceFormatted}</span>
                  <button onClick={() => void buy(pack.id)} disabled={loading} className="pa-button px-4 py-2.5 text-sm">Compra</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
