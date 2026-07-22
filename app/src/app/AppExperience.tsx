import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthView } from "./AuthView";
import { backend, getToken, setToken } from "./api";
import { ControlPanel } from "./ControlPanel";
import { Onboarding } from "./Onboarding";
import { PlansView } from "./PlansView";
import type { KnowledgeFile, OnboardingData, Plan, UserProfile } from "./types";

const EMPTY_STATS = { files: 0, ready_files: 0, messages: 0 };

export function AppExperience() {
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [onboarding, setOnboarding] = useState<Partial<OnboardingData>>({});
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [editingProfile, setEditingProfile] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async (profile: UserProfile) => {
    if (profile.status !== "active") return;
    setWorkspaceLoading(true);
    try {
      const [setup, metrics] = await Promise.all([
        backend.onboarding(),
        backend.stats(),
      ]);
      setOnboarding(setup.data);
      setFiles(setup.files);
      setStats(metrics.stats);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile caricare la configurazione.");
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const planResult = await backend.plans();
        if (!cancelled) setPlans(planResult.plans);

        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        let profile: UserProfile;

        if (params.get("checkout") === "success" && sessionId) {
          const confirmation = await backend.confirmCheckout(sessionId);
          profile = confirmation.user;
          window.history.replaceState({}, document.title, "/dashboard");
        } else {
          profile = (await backend.me()).user;
          if (params.get("checkout") === "cancelled") {
            setError("Pagamento annullato: non è stato effettuato alcun addebito.");
            window.history.replaceState({}, document.title, "/dashboard");
          }
        }

        if (!cancelled) {
          setUser(profile);
          await loadWorkspace(profile);
        }
      } catch (cause) {
        if (getToken()) setToken(null);
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Servizio non disponibile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [loadWorkspace]);

  const authenticated = (profile: UserProfile) => {
    setUser(profile);
    setError("");
    void loadWorkspace(profile);
  };

  const checkout = async (planId: string) => {
    setBusyPlan(planId);
    setError("");
    try {
      const result = await backend.checkout(planId);
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout non disponibile.");
      setBusyPlan(null);
    }
  };

  const openPortal = async () => {
    setBusyPlan("portal");
    setError("");
    try {
      const result = await backend.portal();
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Portale Stripe non disponibile.");
      setBusyPlan(null);
    }
  };

  const logout = async () => {
    try { await backend.logout(); } catch {}
    setToken(null);
    setUser(null);
    setOnboarding({});
    setFiles([]);
    setStats(EMPTY_STATS);
    setEditingProfile(false);
    setError("");
  };

  const onboardingDone = async () => {
    const profile = (await backend.me()).user;
    setUser(profile);
    setEditingProfile(false);
    await loadWorkspace(profile);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05070b] text-white">
        <Loader2 className="h-9 w-9 animate-spin text-blue-400" />
        <p className="text-sm font-bold text-zinc-400">Preparo la tua area riservata…</p>
      </div>
    );
  }

  if (!user) return <AuthView onAuthenticated={authenticated} />;

  if (user.status !== "active") {
    return (
      <PlansView
        user={user}
        plans={plans}
        busyPlan={busyPlan}
        error={error}
        onCheckout={checkout}
        onPortal={openPortal}
        onLogout={logout}
      />
    );
  }

  if (workspaceLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05070b] text-white">
        <Loader2 className="h-9 w-9 animate-spin text-blue-400" />
        <p className="text-sm font-bold text-zinc-400">Carico profilo e knowledge base…</p>
      </div>
    );
  }

  if (!user.onboardingComplete || editingProfile) {
    return (
      <Onboarding
        user={user}
        initial={onboarding}
        initialFiles={files}
        editing={editingProfile}
        onDone={() => void onboardingDone()}
        onLogout={logout}
      />
    );
  }

  return (
    <ControlPanel
      user={user}
      plan={plans.find((plan) => plan.id === user.planId)}
      onboarding={onboarding}
      files={files}
      stats={stats}
      onFilesChange={(next) => {
        setFiles(next);
        setStats((current) => ({
          ...current,
          files: next.length,
          ready_files: next.filter((file) => file.status === "ready").length,
        }));
      }}
      onEditProfile={() => setEditingProfile(true)}
      onPortal={openPortal}
      onLogout={logout}
    />
  );
}

