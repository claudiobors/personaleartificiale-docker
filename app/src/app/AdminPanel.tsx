import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Coins,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { backend } from "./api";
import type { AdminLogs, AdminUserProfile, Plan } from "./types";

type AdminTab = "users" | "logs";
type LogsTab = "sessions" | "messages" | "ledger";

const STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  active: "Attivo",
  past_due: "Pagamento in ritardo",
  cancelled: "Annullato",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-400/25 bg-amber-500/15 text-amber-300",
  active: "border-emerald-400/25 bg-emerald-500/15 text-emerald-300",
  past_due: "border-orange-400/25 bg-orange-500/15 text-orange-300",
  cancelled: "border-red-400/25 bg-red-500/15 text-red-300",
};

const WHATSAPP_LABELS: Record<string, string> = {
  not_configured: "Da attivare",
  provisioning: "Preparazione",
  provisioned: "Pronto per QR",
  qr_ready: "QR pronto",
  connecting: "Connessione",
  connected: "Connesso",
  disconnected: "Disconnesso",
  error: "Errore",
};

export function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [plans, setPlans] = useState<Plan[]>([]);

  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [editing, setEditing] = useState<AdminUserProfile | null>(null);

  const [logs, setLogs] = useState<AdminLogs | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsTab, setLogsTab] = useState<LogsTab>("sessions");

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const result = await backend.adminUsers();
      setUsers(result.users);
    } catch (cause) {
      setUsersError(cause instanceof Error ? cause.message : "Elenco utenti non disponibile.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const result = await backend.adminLogs();
      setLogs(result.logs);
    } catch (cause) {
      setLogsError(cause instanceof Error ? cause.message : "Log non disponibili.");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    backend.plans().then((result) => setPlans(result.plans)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab === "logs" && !logs) void loadLogs();
  }, [tab, logs]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (planFilter !== "all" && user.planId !== planFilter) return false;
      if (!term) return true;
      return user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    });
  }, [users, search, statusFilter, planFilter]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      pending: users.filter((user) => user.status === "pending").length,
      tokens: users.reduce((sum, user) => sum + (user.tokenBalance || 0), 0),
      whatsappConnected: users.filter((user) => user.whatsappStatus === "connected").length,
    }),
    [users],
  );

  const saveUser = async (payload: { userId: string; name: string; planId: string; status: string; accountType: string; whatsappPhone: string }) => {
    const result = await backend.adminUpdateUser(payload);
    setUsers(result.users);
    setEditing(null);
  };

  const grantTokens = async (userId: string, tokens: number, note: string) => {
    await backend.adminGrantTokens({ userId, tokens, note });
    await loadUsers();
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-300">Pannello amministrazione</p>
          <h2 className="mt-2 text-2xl font-black">Utenti, piani, token e log</h2>
        </div>
        <nav className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
          {([
            ["users", "Utenti", UsersIcon],
            ["logs", "Log", Activity],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${
                tab === value ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "users" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Utenti totali" value={String(summary.total)} icon={UsersIcon} />
            <SummaryCard label="Attivi" value={String(summary.active)} icon={CheckCircle2} tone="emerald" />
            <SummaryCard label="In attesa" value={String(summary.pending)} icon={AlertCircle} tone="amber" />
            <SummaryCard label="Token in circolo" value={formatNumber(summary.tokens)} icon={Coins} />
            <SummaryCard label="WhatsApp connessi" value={String(summary.whatsappConnected)} icon={MessageSquare} tone="emerald" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca per nome o email…" className="pa-input pl-9" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="pa-input sm:w-48">
              <option value="all">Tutti gli stati</option>
              <option value="active">Attivo</option>
              <option value="pending">In attesa</option>
              <option value="past_due">Pagamento in ritardo</option>
              <option value="cancelled">Annullato</option>
            </select>
            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="pa-input sm:w-56">
              <option value="all">Tutti i piani</option>
              <option value="none">Nessun piano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <button onClick={() => void loadUsers()} disabled={usersLoading} className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
              <RefreshCw className={`mr-2 inline h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} /> Aggiorna
            </button>
          </div>

          {usersError && (
            <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {usersError}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Utente</th>
                  <th className="px-4 py-3">Piano</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Documenti</th>
                  <th className="px-4 py-3">Creato</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {usersLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">Nessun utente trovato.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{user.name}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{plans.find((plan) => plan.id === user.planId)?.name || "Nessuno"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[user.status] || "border-white/10 text-zinc-400"}`}>
                          {STATUS_LABELS[user.status] || user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold">{formatNumber(user.tokenBalance || 0)}</p>
                        <p className="text-[11px] text-zinc-500">{formatNumber(user.monthlyTokensUsed || 0)} / {formatNumber(user.monthlyTokenAllowance || 0)} usati</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{WHATSAPP_LABELS[user.whatsappStatus || ""] || "Non attivo"}</td>
                      <td className="px-4 py-3 text-zinc-400">{user.readyFiles}/{user.files}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditing(user)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10">
                          Gestisci <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
              {([
                ["sessions", "Sessioni WhatsApp"],
                ["messages", "Messaggi"],
                ["ledger", "Movimenti token"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setLogsTab(value)}
                  className={`rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${
                    logsTab === value ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button onClick={() => void loadLogs()} disabled={logsLoading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
              <RefreshCw className={`mr-2 inline h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} /> Aggiorna
            </button>
          </div>

          {logsError && (
            <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {logsError}
            </div>
          )}

          {logsTab === "sessions" && (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Utente</th>
                    <th className="px-4 py-3">Istanza</th>
                    <th className="px-4 py-3">Stato</th>
                    <th className="px-4 py-3">Ultimo errore</th>
                    <th className="px-4 py-3">Aggiornato</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading && !logs ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                  ) : !logs?.sessions.length ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nessuna sessione WhatsApp registrata.</td></tr>
                  ) : (
                    logs.sessions.map((session, index) => (
                      <tr key={`${session.user_id}-${index}`} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-zinc-300">{session.email || session.user_id}</td>
                        <td className="px-4 py-3 text-zinc-400">{session.instance_name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                              session.status === "connected"
                                ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
                                : session.status === "error"
                                ? "border-red-400/25 bg-red-500/15 text-red-300"
                                : "border-white/10 text-zinc-400"
                            }`}
                          >
                            {WHATSAPP_LABELS[session.status] || session.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-red-300">{session.last_error || "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(session.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {logsTab === "messages" && (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Utente</th>
                    <th className="px-4 py-3">Direzione</th>
                    <th className="px-4 py-3">Canale</th>
                    <th className="px-4 py-3">Contenuto</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading && !logs ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                  ) : !logs?.messages.length ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nessun messaggio registrato.</td></tr>
                  ) : (
                    logs.messages.map((message) => (
                      <tr key={message.id} className="border-b border-white/5 last:border-0 align-top">
                        <td className="px-4 py-3 text-zinc-300">{message.email || message.user_id}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                              message.direction === "incoming"
                                ? "border-blue-400/25 bg-blue-500/15 text-blue-300"
                                : "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            {message.direction === "incoming" ? "Ricevuto" : "Inviato"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{message.channel}</td>
                        <td className="max-w-md truncate px-4 py-3 text-zinc-400" title={message.content}>{message.content}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(message.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {logsTab === "ledger" && (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Utente</th>
                    <th className="px-4 py-3">Variazione</th>
                    <th className="px-4 py-3">Saldo dopo</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading && !logs ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                  ) : !logs?.ledger.length ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nessun movimento token registrato.</td></tr>
                  ) : (
                    logs.ledger.map((entry, index) => (
                      <tr key={`${entry.user_id}-${index}`} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-zinc-300">{entry.email || entry.user_id}</td>
                        <td className={`px-4 py-3 font-bold ${entry.delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                          {entry.delta >= 0 ? "+" : ""}{formatNumber(entry.delta)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{formatNumber(entry.balance_after)}</td>
                        <td className="px-4 py-3 text-zinc-400">{entry.reason}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(entry.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditUserModal
          user={editing}
          plans={plans}
          onClose={() => setEditing(null)}
          onSave={saveUser}
          onGrantTokens={grantTokens}
        />
      )}
    </section>
  );
}

function EditUserModal({
  user,
  plans,
  onClose,
  onSave,
  onGrantTokens,
}: {
  user: AdminUserProfile;
  plans: Plan[];
  onClose: () => void;
  onSave: (payload: { userId: string; name: string; planId: string; status: string; accountType: string; whatsappPhone: string }) => Promise<void>;
  onGrantTokens: (userId: string, tokens: number, note: string) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [planId, setPlanId] = useState(user.planId || "none");
  const [status, setStatus] = useState<string>(user.status);
  const [accountType, setAccountType] = useState<string>(user.accountType || "business");
  const [whatsappPhone, setWhatsappPhone] = useState(user.whatsappPhone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [tokens, setTokens] = useState("");
  const [note, setNote] = useState("");
  const [granting, setGranting] = useState(false);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({ userId: user.id, name, planId, status, accountType, whatsappPhone });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  };

  const grant = async () => {
    const amount = Math.round(Number(tokens));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Inserisci un numero di token valido.");
      return;
    }
    setGranting(true);
    setError("");
    try {
      await onGrantTokens(user.id, amount, note || "Accredito manuale admin");
      setTokens("");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accredito non riuscito.");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0e14] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-300">Gestione account</p>
            <h3 className="mt-1 text-xl font-black">{user.email}</h3>
            <p className="mt-1 text-xs text-zinc-500">ID: {user.id} · Registrato il {formatDate(user.createdAt)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="pa-input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Tipo profilo</span>
            <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="pa-input">
              <option value="business">Azienda</option>
              <option value="professional">Professionista</option>
              <option value="private">Privato</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Piano</span>
            <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="pa-input">
              <option value="none">Nessun piano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Stato abbonamento</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="pa-input">
              <option value="pending">In attesa</option>
              <option value="active">Attivo</option>
              <option value="past_due">Pagamento in ritardo</option>
              <option value="cancelled">Annullato</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Numero WhatsApp personale</span>
            <input value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} className="pa-input" placeholder="+393331234567" />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">Impostando lo stato su "Attivo" con un piano selezionato viene accreditato subito il monte token incluso.</p>

        <button onClick={() => void save()} disabled={saving} className="pa-button mt-5 w-full px-5 py-3">
          {saving ? "Salvo…" : "Salva modifiche"}
        </button>

        <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
          <h4 className="flex items-center gap-2 font-extrabold text-emerald-100"><Coins className="h-4 w-4" /> Accredita token manualmente</h4>
          <p className="mt-1 text-xs text-zinc-400">Saldo attuale: {formatNumber(user.tokenBalance || 0)} token.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Token da aggiungere</span>
              <input value={tokens} onChange={(event) => setTokens(event.target.value)} type="number" min="1" className="pa-input" placeholder="Es. 50000" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-zinc-300">Nota (facoltativa)</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} className="pa-input" placeholder="Motivo dell'accredito" />
            </label>
            <button onClick={() => void grant()} disabled={granting} className="pa-button px-5 py-3">
              {granting ? "Accredito…" : "Accredita"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Documenti" value={`${user.readyFiles}/${user.files}`} />
          <MiniStat label="Messaggi" value={formatNumber(user.messages)} />
          <MiniStat label="WhatsApp" value={WHATSAPP_LABELS[user.whatsappStatus || ""] || "Non attivo"} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof UsersIcon; tone?: "emerald" | "amber" }) {
  const toneClass = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-blue-300";
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </article>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
