import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Sparkles,
  Upload,
  Check,
  ArrowRight,
  Lock,
  Database,
  Shield,
  User,
  QrCode,
  ArrowLeft,
  ExternalLink,
  FileText,
  AlertCircle,
  Trash2,
  Calendar,
  Mail,
  Folder,
  LogOut,
  Info,
  CreditCard,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

interface UserProfile {
  id: string;
  email: string;
  name: string;
  planId: string;
  status: "active" | "pending" | "cancelled";
  planName?: string;
}

function Dashboard() {
  // Authentication & Subscription Verification States
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("ufficio-digitale");

  // Auth Gate Form States (for non-paid users)
  const [gateName, setGateName] = useState("");
  const [gateEmail, setGateEmail] = useState("");
  const [gatePlan, setGatePlan] = useState("ufficio-digitale");
  const [gateTermsAccepted, setGateTermsAccepted] = useState(false);
  const [gateError, setGateTermsError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Wizard States (for verified active paid users)
  const [activeStep, setActiveStep] = useState(1);
  const [, setFormSaved] = useState(false);

  // Step 1: Agent Setup Form States
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("Assistente Esecutivo");
  const [agentTone, setAgentTone] = useState("Professionale");
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ name: string; size: string }>
  >([
    { name: "listino_prezzi_2026.pdf", size: "1.2 MB" },
    { name: "domande_frequenti_faq.pdf", size: "480 KB" },
  ]);
  const [newFileName, setNewFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Step 2: Google OAuth States
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Step 3: WhatsApp Activation States
  const [isGeneratingQr, setIsGeneratingQr] = useState(true);
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // 1. Initial Authentication and URL Parsing
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get("token");
    const queryPlan = params.get("plan");

    // Pre-select plan if passed in query (for checkout form)
    if (
      queryPlan &&
      (queryPlan === "assistente-esecutivo" ||
        queryPlan === "ufficio-digitale" ||
        queryPlan === "executive")
    ) {
      const canonicalPlan =
        queryPlan === "executive" ? "assistente-esecutivo" : queryPlan;
      setGatePlan(canonicalPlan);
      setSelectedPlan(canonicalPlan);
    }

    let activeToken = localStorage.getItem("pa_token");

    // If query token is present, it takes precedence (e.g. redirect back from Stripe checkout)
    if (queryToken) {
      activeToken = queryToken;
      localStorage.setItem("pa_token", queryToken);
      setToken(queryToken);

      // Clean up URL query parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      url.searchParams.delete("session_id");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search,
      );
    } else if (activeToken) {
      setToken(activeToken);
    }

    if (activeToken) {
      verifySubscription(activeToken);
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Fetch User Subscription Status from API
  const verifySubscription = async (authToken: string) => {
    try {
      const res = await fetch("/api/subscription/status", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Invalid or expired session");
      }

      const data = (await res.json()) as {
        status: "active" | "pending" | "cancelled";
        planId: string;
        planName?: string;
      };

      // Only allow access if the subscription status is active
      if (data.status === "active") {
        setUser({
          id: "",
          email: "",
          name: "",
          planId: data.planId,
          status: data.status,
          planName: data.planName,
        });
        setSelectedPlan(data.planId);

        // Also load the existing agent config if any
        fetchAgentConfig(authToken);
      } else {
        // Clear invalid/pending token
        localStorage.removeItem("pa_token");
        setToken(null);
      }
    } catch (err) {
      console.error("[Subscription Verification Error]", err);
      localStorage.removeItem("pa_token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentConfig = async (authToken: string) => {
    try {
      const res = await fetch("/api/config/tone-of-voice", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const config = (await res.json()) as {
          toneOfVoice: string;
          roleDescription: string;
        };
        setAgentTone(config.toneOfVoice.split(" ")[0] || "Professionale");
        setAgentRole(config.roleDescription);
      }
    } catch (e) {
      // Ignored
    }
  };

  // 3. Initiate Stripe Checkout Flow
  const handleInitiateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateTermsError("");

    if (!gateName.trim() || !gateEmail.trim()) {
      setGateTermsError("Inserisci il tuo nome e il tuo indirizzo email.");
      return;
    }

    if (!gateTermsAccepted) {
      setGateTermsError(
        "È necessario accettare i Termini di Servizio e l'Informativa sulla Privacy.",
      );
      return;
    }

    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: gatePlan,
          email: gateEmail,
          name: gateName,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(
          data.error || "Errore nella creazione della sessione di pagamento",
        );
      }

      // Redirect immediately to Stripe Checkout page
      window.location.href = data.url;
    } catch (err) {
      setGateTermsError(
        err instanceof Error ? err.message : "Internal Server Error",
      );
      setCheckoutLoading(false);
    }
  };

  // 4. Wizard Step 3 Simulators
  useEffect(() => {
    if (activeStep === 3) {
      setIsGeneratingQr(true);
      const timer = setTimeout(() => {
        setIsGeneratingQr(false);
        setQrCodeData(
          "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PersonaleArtificialeActivationFlowMock",
        );
      }, 1500);

      // Simulate a real scanning event after some seconds
      const scanTimer = setTimeout(() => {
        setWhatsAppConnected(true);
      }, 10000);

      return () => {
        clearTimeout(timer);
        clearTimeout(scanTimer);
      };
    }
  }, [activeStep]);

  // Handle uploading knowledge base PDFs (visual mockup)
  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    setIsUploading(true);
    setTimeout(() => {
      setUploadedFiles((prev) => [
        ...prev,
        {
          name: newFileName.endsWith(".pdf")
            ? newFileName
            : `${newFileName}.pdf`,
          size: `${Math.floor(Math.random() * 800 + 200)} KB`,
        },
      ]);
      setNewFileName("");
      setIsUploading(false);
    }, 1200);
  };

  const handleDeleteFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConnectGoogle = () => {
    setIsConnectingGoogle(true);
    setTimeout(() => {
      setGoogleConnected(true);
      setIsConnectingGoogle(false);
    }, 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("pa_token");
    setToken(null);
    setUser(null);
    setActiveStep(1);
    setWhatsAppConnected(false);
  };

  const planTitles: Record<string, string> = {
    "assistente-esecutivo": "Assistente Esecutivo",
    "ufficio-digitale": "L'Ufficio Digitale",
    executive: "Assistente Esecutivo",
    "digital-office": "L'Ufficio Digitale",
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wider text-blue-400">
          Verifica sessione sicura...
        </p>
      </div>
    );
  }

  // GATE SCREEN: Stripe Checkout Paywall
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between relative overflow-x-clip">
        {/* Decorative Blurs */}
        <div className="absolute top-[-10%] right-[-10%] h-80 w-80 sm:h-[500px] sm:w-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] h-80 w-80 sm:h-[500px] sm:w-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <header className="bg-zinc-900/30 backdrop-blur-md border-b border-zinc-900 px-3 py-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex min-w-0 items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1">
                <img
                  src="/logo-pa-transparent.png"
                  alt=""
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="max-w-[10rem] truncate text-sm font-bold text-white min-[375px]:text-base">
                Personale Artificiale
              </span>
            </Link>
            <a
              href="https://www.personaleartificiale.it"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Torna al sito
            </a>
          </div>
        </header>

        {/* Gate Form */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 sm:px-6 sm:py-12 flex flex-col lg:flex-row items-center justify-center gap-12">
          {/* Info Side */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" /> Pagamento Sicuro SSL via Stripe
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Sblocca il tuo <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
                aiuto digitale
              </span>
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              Per accedere alla configurazione dell'agente virtuale e abilitarlo
              sul tuo numero WhatsApp/Telegram, completa l'acquisto del piano.
              Verrai reindirizzato all'istante sulla procedura di setup guidato.
            </p>

            <div className="space-y-3 max-w-sm mx-auto lg:mx-0">
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <Check className="w-4 h-4 text-blue-400" />
                <span>Nessun vincolo, annulli quando vuoi</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <Check className="w-4 h-4 text-blue-400" />
                <span>Configurazione completo assistito in 15 minuti</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <Check className="w-4 h-4 text-blue-400" />
                <span>Collegamento guidato agli strumenti di lavoro</span>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <form onSubmit={handleInitiateCheckout} className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  Iscriviti e Attiva
                </h3>
                <p className="text-xs text-zinc-500">
                  I dati inseriti saranno usati per creare la tua area
                  riservata.
                </p>
              </div>

              {gateError && (
                <div className="p-3.5 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{gateError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 text-white"
                  placeholder="es. Mario Rossi"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Indirizzo Email
                </label>
                <input
                  type="email"
                  required
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 text-white"
                  placeholder="mario.rossi@azienda.com"
                />
              </div>

              {/* Interactive Plan Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Seleziona Piano
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGatePlan("assistente-esecutivo");
                      setSelectedPlan("assistente-esecutivo");
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      gatePlan === "assistente-esecutivo"
                        ? "bg-blue-600/10 border-blue-500 text-white"
                        : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-800"
                    }`}
                  >
                    <div className="text-xs font-bold">A. Esecutivo</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      €97/mo + €399 setup
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setGatePlan("ufficio-digitale");
                    }}
                    type="button"
                    className={`p-3 rounded-xl border text-left transition-all ${
                      gatePlanSelected()
                        ? "bg-blue-600/10 border-blue-500 text-white"
                        : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-800"
                    }`}
                  >
                    <div className="text-xs font-bold">Ufficio Digitale</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      €297/mo + €999 setup
                    </div>
                  </button>
                </div>
              </div>

              {/* Privacy GDPR / Terms checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-[11px] text-zinc-400 leading-normal">
                  <input
                    type="checkbox"
                    checked={gateTermsAccepted}
                    onChange={(e) => setGateTermsAccepted(e.target.checked)}
                    className="mt-0.5 accent-blue-600 rounded bg-zinc-950 border-zinc-850"
                  />
                  <span>
                    Accetto i{" "}
                    <a
                      href="https://www.personaleartificiale.it/termini-servizio"
                      className="text-blue-400 hover:underline"
                    >
                      Termini di servizio
                    </a>{" "}
                    ed esprimo il consenso al trattamento dei dati descritto
                    nella{" "}
                    <a
                      href="https://www.personaleartificiale.it/privacy"
                      className="text-blue-400 hover:underline"
                    >
                      Privacy
                    </a>{" "}
                    (GDPR).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={checkoutLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2 transition-all"
              >
                {checkoutLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Elaborazione Checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4.5 h-4.5" />
                    Procedi al Pagamento Sicuro
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-6 px-4 sm:px-6 bg-zinc-950 text-center text-xs text-zinc-500">
          <p>© 2026 Personale Artificiale. Tutti i diritti riservati.</p>
        </footer>
      </div>
    );

    // Helpers inside paywall component to simplify checks
    function gatePlanSelected() {
      return gatePlan === "ufficio-digitale" || gatePlan === "digital-office";
    }
    function setGatePlan(val: string) {
      setGatePlan(val);
      setSelectedPlan(val);
    }
  }

  // PROGRESS PERCENT
  const progressPercent = activeStep === 1 ? 33 : activeStep === 2 ? 66 : 100;

  // DASHBOARD SCREEN: Active paid user has access to full wizard!
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between relative overflow-x-clip">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-10 h-80 w-80 sm:h-[400px] sm:w-[400px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 h-80 w-80 sm:h-[400px] sm:w-[400px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="bg-zinc-900/50 backdrop-blur-md border-b border-zinc-900 px-3 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex min-w-0 items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1">
              <img
                src="/logo-pa-transparent.png"
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <span className="max-w-[10rem] truncate text-sm font-bold text-white min-[375px]:text-base">
              Personale Artificiale
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-zinc-300 font-semibold">
                {planTitles[selectedPlan] || selectedPlan}
              </span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse ml-1" />
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors border border-zinc-850 px-2.5 py-1.5 rounded-xl hover:bg-zinc-900"
            >
              <LogOut className="w-3.5 h-3.5" /> Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 sm:px-6 sm:py-12 flex flex-col items-stretch">
        {/* Configurazione Wizard Header */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-blue-400">
                Configurazione Cliente Riservato
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Configura il tuo Dipendente AI
              </h1>
            </div>
            <div className="text-xs text-zinc-500 sm:text-right">
              Passo {activeStep} di 3 •{" "}
              <span className="text-zinc-300 font-semibold">
                {progressPercent}% completato
              </span>
            </div>
          </div>

          {/* Progress Tracker Bar */}
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Steps Horizontal Selectors */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveStep(1)}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                activeStep === 1
                  ? "bg-blue-600/10 border-blue-500 text-blue-300"
                  : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white"
              }`}
            >
              1. Identità & Knowledge
            </button>
            <button
              onClick={() => setActiveStep(2)}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                activeStep === 2
                  ? "bg-blue-600/10 border-blue-500 text-blue-300"
                  : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white"
              }`}
            >
              2. Connessione Google
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                activeStep === 3
                  ? "bg-blue-600/10 border-blue-500 text-blue-300"
                  : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white"
              }`}
            >
              3. Link WhatsApp
            </button>
          </div>
        </div>

        {/* Dynamic Wizard Steps Container */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 sm:p-10 relative flex-1">
          <AnimatePresence mode="wait">
            {/* STEP 1: Identity & Knowledge */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-400" />
                    1. Definisci il Carattere del Dipendente
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Definisci il nome, il ruolo e il comportamento verbale del
                    tuo collaboratore. Saranno la base del suo stile
                    comunicativo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Name field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                      Nome dell'Agente
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 text-white font-medium"
                      placeholder="es. Marco"
                    />
                  </div>

                  {/* Role field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                      Ruolo / Mansionario
                    </label>
                    <input
                      type="text"
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 text-white font-medium"
                      placeholder="es. Assistente Esecutivo"
                    />
                  </div>

                  {/* Tone field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                      Tono di Voce
                    </label>
                    <select
                      value={agentTone}
                      onChange={(e) => setAgentTone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 text-white font-medium"
                    >
                      <option value="Professionale">
                        💼 Professionale e Sobrio
                      </option>
                      <option value="Amichevole">
                        😊 Amichevole ed Empatico
                      </option>
                      <option value="Formale">👔 Formale e Rispettoso</option>
                      <option value="Tecnico">💻 Tecnico e Diretto</option>
                    </select>
                  </div>
                </div>

                {/* PDF Knowledge Base */}
                <div className="border-t border-zinc-900 pt-8">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-blue-400" />
                      Addestra con la Conoscenza Aziendale (PDF)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Carica listini, istruzioni, listati prodotti, listino
                      prezzi o brochure FAQ. Il dipendente virtuale utilizzerà
                      questi PDF come manuali d'istruzione esclusivi.
                    </p>
                  </div>

                  {/* PDF Upload form */}
                  <form onSubmit={handleUploadFile} className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10 pr-4 py-3 text-base focus:outline-none focus:border-blue-500 text-white"
                        placeholder="Nome file PDF da caricare (es. catalogo_servizi)"
                      />
                      <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                    </div>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-sm flex items-center gap-2 transition-all shrink-0"
                    >
                      {isUploading ? (
                        "Caricamento..."
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Aggiungi PDF
                        </>
                      )}
                    </button>
                  </form>

                  {/* List of uploaded files */}
                  <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 divide-y divide-zinc-900">
                    {uploadedFiles.length === 0 ? (
                      <div className="text-center py-6 text-sm text-zinc-500 flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-zinc-700" />
                        Nessun PDF caricato. L'AI userà le sue conoscenze
                        generali.
                      </div>
                    ) : (
                      uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="font-semibold text-zinc-200">
                                {file.name}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {file.size} • Stato:{" "}
                                <span className="text-emerald-400 font-medium">
                                  Indicizzato RAG
                                </span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteFile(idx)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-zinc-900 pt-8 mt-4">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Dati allineati con
                    Turso DB
                  </div>
                  <button
                    onClick={async () => {
                      // Save config to db
                      try {
                        await fetch("/api/config/tone-of-voice", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            toneOfVoice: `${agentTone} — ${agentRole}`,
                          }),
                        });
                      } catch (e) {
                        // Ignore non-blocking save error
                      }
                      setFormSaved(true);
                      setActiveStep(2);
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm flex items-center gap-2 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg"
                  >
                    Salva e Continua <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Google Workspace OAuth Connection */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    2. Collega i tuoi Strumenti Google
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Autorizza l'agente a operare per tuo conto su Gmail,
                    Calendario e Drive. Usiamo l'integrazione ufficiale Google
                    OAuth 2.0 sicura e certificata.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Google Card 1: Gmail */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 text-red-400">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 mb-1">
                      Email (Gmail)
                    </h4>
                    <p className="text-[11px] text-zinc-400 mb-4">
                      Scrive bozze, monitora mittenti urgenti e ti invia
                      resoconti.
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${googleConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-900 text-zinc-500"}`}
                    >
                      {googleConnected ? "Connesso" : "In attesa"}
                    </span>
                  </div>

                  {/* Google Card 2: Calendar */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 mb-1">
                      Google Calendar
                    </h4>
                    <p className="text-[11px] text-zinc-400 mb-4">
                      Inserisce eventi, controlla orari ed invia inviti mail.
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${googleConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-900 text-zinc-500"}`}
                    >
                      {googleConnected ? "Connesso" : "In attesa"}
                    </span>
                  </div>

                  {/* Google Card 3: Drive */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4 text-yellow-400">
                      <Folder className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 mb-1">
                      Google Drive
                    </h4>
                    <p className="text-[11px] text-zinc-400 mb-4">
                      Archivia fatture, contratti o PDF inoltrati via chat.
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${googleConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-900 text-zinc-500"}`}
                    >
                      {googleConnected ? "Connesso" : "In attesa"}
                    </span>
                  </div>
                </div>

                {/* Connection Action Box */}
                <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-400 leading-relaxed">
                      <p className="font-bold text-zinc-200 mb-1">
                        Informativa sulla Sicurezza dei Dati
                      </p>
                      La connessione avviene sul server sicuro Google. Non
                      conserviamo le tue password. Puoi scollegare il dipendente
                      AI o revocare i permessi in qualsiasi momento con un solo
                      clic.
                    </div>
                  </div>

                  <button
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle || googleConnected}
                    className={`px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all shrink-0 ${
                      googleConnected
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 pointer-events-none"
                        : "bg-white hover:bg-zinc-100 text-zinc-950"
                    }`}
                  >
                    {isConnectingGoogle ? (
                      "Connessione in corso..."
                    ) : googleConnected ? (
                      <>
                        <Check className="w-4 h-4" /> Google Connesso
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" /> Autorizza Google
                        Workspace
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center border-t border-zinc-900 pt-8 mt-4">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="px-5 py-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold text-sm flex items-center gap-2 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Indietro
                  </button>
                  <button
                    onClick={() => setActiveStep(3)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm flex items-center gap-2 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg"
                  >
                    Allinea e Continua <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: WhatsApp QR Activation */}
            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                    <QrCode className="w-5 h-5 text-blue-400" />
                    3. Collega l'Agente a WhatsApp
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Scansiona il codice QR per attivare la sessione WhatsApp
                    Business. L'agente virtuale abiterà il tuo numero e
                    risponderà all'istante.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Instructions */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-300 shrink-0">
                        a
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Apri <strong>WhatsApp</strong> sul tuo telefono
                        cellulare aziendale o personale.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-300 shrink-0">
                        b
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Tocca <strong>Menu</strong> o{" "}
                        <strong>Impostazioni</strong> e seleziona{" "}
                        <strong>Dispositivi Collegati</strong>.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-300 shrink-0">
                        c
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Inquadra il codice QR visualizzato a destra. La
                        connessione richiede solo pochi secondi.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
                      <Info className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                      <div>
                        <strong>Nota importante:</strong> Una volta inquadrato,
                        non scollegare il dispositivo dal cellulare. Se la
                        sessione scade, potrai rigenerare il codice QR da questa
                        sezione.
                      </div>
                    </div>
                  </div>

                  {/* QR Box */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-850 flex flex-col items-center justify-center relative w-[240px] aspect-square shadow-2xl">
                      {isGeneratingQr ? (
                        <div className="text-center space-y-2">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-[10px] text-zinc-500">
                            Generazione codice QR...
                          </p>
                        </div>
                      ) : whatsAppConnected ? (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-center space-y-3"
                        >
                          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                            <Check className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              Agente Attivato! 🎉
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">
                              Operativo su WhatsApp Business
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="relative"
                        >
                          <img
                            src={qrCodeData || ""}
                            alt="WhatsApp Activation QR Code"
                            className="w-[180px] h-[180px] rounded-xl bg-white p-2"
                          />
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 shadow shadow-blue-500 animate-bounce" />
                        </motion.div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[10px]">
                      <span
                        className={`w-2 h-2 rounded-full ${whatsAppConnected ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"}`}
                      />
                      <span className="text-zinc-500">
                        {whatsAppConnected
                          ? "Agente Virtuale Attivo e Pronto"
                          : "In attesa di scansione..."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Finish Success screen if connected */}
                {whatsAppConnected && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />{" "}
                        Configurazione Completato con Successo!
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Il tuo dipendente virtuale{" "}
                        <strong>{agentName || "Marco"}</strong> è ora attivo e
                        collegato a Gmail, Google Calendar e Google Drive.
                        Inviali un messaggio per testarlo!
                      </p>
                    </div>
                    <Link
                      to="/"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shrink-0 transition-all text-center"
                    >
                      Vai alla Landing Page
                    </Link>
                  </motion.div>
                )}

                <div className="flex justify-between items-center border-t border-zinc-900 pt-8 mt-4">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-5 py-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold text-sm flex items-center gap-2 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Indietro
                  </button>

                  {!whatsAppConnected && (
                    <button
                      onClick={() => setWhatsAppConnected(true)}
                      className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-sm flex items-center gap-2 border border-zinc-850 hover:border-zinc-700 transition-all shadow"
                    >
                      Simula Scansione Codice{" "}
                      <QrCode className="w-4 h-4 text-blue-400" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 Personale Artificiale. Area riservata.</p>
          <div className="flex gap-4">
            <a
              href="https://www.personaleartificiale.it"
              className="hover:text-zinc-300 transition-colors"
            >
              Sito pubblico
            </a>
            <a
              href="https://www.personaleartificiale.it/privacy"
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy
            </a>
            <span className="text-zinc-850">|</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Connessione Crittografata SSL
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
