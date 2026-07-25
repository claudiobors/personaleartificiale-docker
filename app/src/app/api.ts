import type { Addon, AdminLogs, AdminUserProfile, CalendarStatus, CreditPack, CreditSummary, EmailDraft, EmailStatus, InternetAccessSettings, KnowledgeFile, OnboardingData, Plan, Quota, UserProfile, WhatsAppContact, WhatsAppSession, WhatsappNumber } from "./types";

const TOKEN_KEY = "pa_session";

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (authenticated) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof Blob) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || "Operazione non riuscita.");
  return payload;
}

export const backend = {
  health: () => api<{ status: string; services: Record<string, boolean | string> }>("/api/health", {}, false),
  plans: () => api<{ plans: Plan[]; creditPacks: CreditPack[]; addons: Addon[] }>("/api/plans", {}, false),
  register: (data: { name: string; email: string; password: string; termsAccepted: boolean }) =>
    api<{ token: string; user: UserProfile }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  login: (data: { email: string; password: string }) =>
    api<{ token?: string; user: UserProfile | { email: string; name: string }; otpRequired?: boolean; challengeId?: string; expiresAt?: string; devCode?: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  verifyOtp: (data: { challengeId: string; code: string }) =>
    api<{ token: string; user: UserProfile }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  logout: () => api<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => api<{ user: UserProfile }>("/api/auth/me"),
  updateProfile: (data: { accountType: string }) => api<{ user: UserProfile }>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  checkout: (planId: string) =>
    api<{ url: string }>("/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  confirmCheckout: (sessionId: string) =>
    api<{ complete: boolean; user: UserProfile }>(
      `/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
    ),
  portal: () => api<{ url: string }>("/api/stripe/portal", { method: "POST" }),
  credits: () => api<{ credits: CreditSummary; packs: CreditPack[] }>("/api/credits"),
  creditCheckout: (packId: string) => api<{ url: string }>("/api/stripe/credits-checkout", {
    method: "POST",
    body: JSON.stringify({ packId }),
  }),
  onboarding: () =>
    api<{ data: Partial<OnboardingData>; complete: boolean; files: KnowledgeFile[] }>("/api/onboarding"),
  saveOnboarding: (data: OnboardingData, complete: boolean) =>
    api<{ success: boolean; complete: boolean; rag: { indexed: boolean; chunks?: number; error?: string } }>(
      "/api/onboarding",
      { method: "PUT", body: JSON.stringify({ data, complete }) },
    ),
  knowledge: () => api<{ files: KnowledgeFile[] }>("/api/knowledge"),
  upload: (file: File) =>
    api<{ file: KnowledgeFile }>("/api/knowledge", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    }),
  deleteFile: (id: string) =>
    api<{ success: boolean }>(`/api/knowledge?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  search: (query: string) =>
    api<{ results: Array<{ score: number; text: string; source: string }> }>("/api/rag/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  askAssistant: (query: string) =>
    api<{ answer: string; sources: Array<{ source: string; score: number }> }>("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  stats: () =>
    api<{ stats: { files: number; ready_files: number; messages: number; whatsapp_status?: string | null } }>("/api/dashboard/stats"),
  whatsappStatus: () => api<{ session: WhatsAppSession }>("/api/whatsapp/status"),
  provisionWhatsApp: () => api<{ session: WhatsAppSession }>("/api/whatsapp/provision", { method: "POST" }),
  disconnectWhatsApp: () => api<{ session: WhatsAppSession }>("/api/whatsapp/disconnect", { method: "POST" }),
  whatsappContact: () => api<{ contact: WhatsAppContact }>("/api/whatsapp/contact"),
  exportPrivacy: () => api<{ data: unknown }>("/api/privacy/export"),
  deleteAccount: (confirmation: string) => api<{ deleted: boolean; deletedAt: string }>("/api/privacy/account", {
    method: "DELETE",
    body: JSON.stringify({ confirmation }),
  }),
  adminUsers: () => api<{ users: AdminUserProfile[] }>("/api/admin/users"),
  adminUpdateUser: (data: { userId: string; name: string; planId: string; status: string; accountType: string; whatsappPhone: string }) =>
    api<{ user: AdminUserProfile; users: AdminUserProfile[] }>("/api/admin/users", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  adminGrantTokens: (data: { userId: string; tokens: number; note?: string }) =>
    api<{ balance: number }>("/api/admin/tokens", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminLogs: () => api<{ logs: AdminLogs }>("/api/admin/logs"),
  googleCalendarStatus: () => api<{ status: CalendarStatus }>("/api/integrations/google/status"),
  googleCalendarConnectUrl: () => api<{ url: string }>("/api/integrations/google/connect"),
  googleCalendarDisconnect: () => api<{ status: CalendarStatus }>("/api/integrations/google/disconnect", { method: "POST" }),
  gmailStatus: () => api<{ status: EmailStatus }>("/api/integrations/gmail/status"),
  gmailConnectUrl: () => api<{ url: string }>("/api/integrations/gmail/connect"),
  gmailDisconnect: () => api<{ status: EmailStatus }>("/api/integrations/gmail/disconnect", { method: "POST" }),
  emailStatus: () => api<{ status: EmailStatus }>("/api/integrations/email/status"),
  emailConnect: (data: {
    emailAddress: string; imapHost: string; imapPort: number; imapSecure: boolean;
    smtpHost: string; smtpPort: number; smtpSecure: boolean; password: string;
  }) => api<{ status: EmailStatus }>("/api/integrations/email/connect", { method: "POST", body: JSON.stringify(data) }),
  emailDisconnect: () => api<{ status: EmailStatus }>("/api/integrations/email/disconnect", { method: "POST" }),
  emailDrafts: () => api<{ drafts: EmailDraft[] }>("/api/email/drafts"),
  sendEmailDraft: (id: string, body?: string) =>
    api<{ sent: boolean; drafts: EmailDraft[] }>(`/api/email/drafts/send?id=${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  discardEmailDraft: (id: string) =>
    api<{ discarded: boolean; drafts: EmailDraft[] }>(`/api/email/drafts/discard?id=${encodeURIComponent(id)}`, { method: "POST" }),
  whatsappNumbers: () => api<{ numbers: WhatsappNumber[]; quota: Quota }>("/api/whatsapp/numbers"),
  addWhatsappNumber: (data: { phone: string; label?: string }) =>
    api<{ numbers: WhatsappNumber[]; quota: Quota }>("/api/whatsapp/numbers", { method: "POST", body: JSON.stringify(data) }),
  removeWhatsappNumber: (id: string) =>
    api<{ numbers: WhatsappNumber[]; quota: Quota }>(`/api/whatsapp/numbers?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  integrationQuota: () => api<{ quota: Quota }>("/api/integrations/quota"),
  addonCheckout: (addonType: Addon["type"]) =>
    api<{ url: string }>("/api/billing/addon-checkout", { method: "POST", body: JSON.stringify({ addonType }) }),
  internetAccess: () => api<{ settings: InternetAccessSettings }>("/api/assistant/internet-access"),
  saveInternetAccess: (data: InternetAccessSettings) =>
    api<{ settings: InternetAccessSettings }>("/api/assistant/internet-access", { method: "PUT", body: JSON.stringify(data) }),
};

