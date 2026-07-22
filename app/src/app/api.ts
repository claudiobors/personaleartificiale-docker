import type { KnowledgeFile, OnboardingData, Plan, UserProfile, WhatsAppSession } from "./types";

const TOKEN_KEY = "pa_session";

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  if (!token) sessionStorage.removeItem(TOKEN_KEY);
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
  plans: () => api<{ plans: Plan[] }>("/api/plans", {}, false),
  register: (data: { name: string; email: string; password: string; termsAccepted: boolean }) =>
    api<{ token: string; user: UserProfile }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  login: (data: { email: string; password: string }) =>
    api<{ token: string; user: UserProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  logout: () => api<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => api<{ user: UserProfile }>("/api/auth/me"),
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
  exportPrivacy: () => api<{ data: unknown }>("/api/privacy/export"),
  deleteAccount: (confirmation: string) => api<{ deleted: boolean; deletedAt: string }>("/api/privacy/account", {
    method: "DELETE",
    body: JSON.stringify({ confirmation }),
  }),
};

