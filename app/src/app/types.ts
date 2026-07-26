export type SubscriptionStatus = "pending" | "active" | "past_due" | "cancelled";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  planId: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
  accountType?: "private" | "business" | "professional";
  whatsappPhone?: string | null;
  whatsappPhoneVerifiedAt?: string | null;
  tokenBalance?: number;
  monthlyTokenAllowance?: number;
  monthlyTokensUsed?: number;
  tokenResetAt?: string | null;
  otpEnabled?: boolean;
  isAdmin?: boolean;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  description: string;
  setupFee: number;
  monthlyPrice: number;
  includedTokens?: number;
  maxDocuments?: number;
  includedIntegrations?: number;
  includedWhatsappNumbers?: number;
  setupFeeFormatted: string;
  monthlyPriceFormatted: string;
  features: string[];
  highlighted?: boolean;
}

export interface CreditPack {
  id: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  priceFormatted: string;
}

export interface Addon {
  type: "extra_integration" | "extra_whatsapp_number";
  name: string;
  description: string;
  price: number;
  priceFormatted: string;
}

export interface Quota {
  included: number;
  extra: number;
  total: number;
  used: number;
}

export interface WhatsappNumber {
  id: string;
  phone: string;
  label?: string | null;
  createdAt: string;
}

export interface InternetAccessSettings {
  enabled: boolean;
  restrictions: string;
}

export interface CreditSummary {
  balance: number;
  monthlyAllowance: number;
  monthlyUsed: number;
  resetAt?: string | null;
  ledger: Array<{ delta: number; balance_after: number; reason: string; created_at: string }>;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  status: "processing" | "ready" | "error";
  chunks: number;
  error?: string | null;
  createdAt: string;
}

export interface WhatsAppSession {
  userId?: string;
  instanceName: string | null;
  status: "not_configured" | "provisioning" | "provisioned" | "qr_ready" | "connecting" | "connected" | "disconnected" | "error";
  qrCode?: string | null;
  lastError?: string | null;
  updatedAt?: string | null;
}

export interface WhatsAppContact {
  configured: boolean;
  number: string;
  message: string;
  url: string;
}

export interface CalendarStatus {
  status: "disconnected" | "connected" | "error";
  lastError?: string | null;
  connectedAt?: string | null;
  calendarId?: string;
}

export interface EmailStatus {
  status: "disconnected" | "connected" | "error";
  lastError?: string | null;
  emailAddress?: string | null;
  lastSyncedAt?: string | null;
}

export interface DriveStatus {
  status: "disconnected" | "connected" | "error";
  lastError?: string | null;
  connectedAt?: string | null;
}

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  originalSnippet?: string | null;
  createdAt: string;
}

export interface AdminUserProfile extends UserProfile {
  files: number;
  readyFiles: number;
  messages: number;
  whatsappStatus?: string | null;
  updatedAt?: string | null;
}

export interface AdminLogs {
  messages: Array<{
    id: string;
    user_id: string;
    email?: string | null;
    direction: "incoming" | "outgoing";
    channel: string;
    content: string;
    metadata?: Record<string, unknown> | null;
    created_at: string;
  }>;
  sessions: Array<{
    user_id: string;
    email?: string | null;
    instance_name: string;
    status: string;
    last_error?: string | null;
    updated_at: string;
  }>;
  ledger: Array<{
    user_id: string;
    email?: string | null;
    delta: number;
    balance_after: number;
    reason: string;
    metadata?: Record<string, unknown> | null;
    created_at: string;
  }>;
}

export interface OnboardingData {
  accountType: "private" | "business" | "professional";
  personalGoal: string;
  companyName: string;
  website: string;
  industry: string;
  vatNumber: string;
  address: string;
  businessDescription: string;
  productsServices: string;
  targetAudience: string;
  competitors: string;
  differentiators: string;
  commonQuestions: string;
  policies: string;
  mainGoals: string;
  forbiddenTopics: string;
  escalationRules: string;
  contactEmail: string;
  contactPhone: string;
  openingHours: string;
  toneOfVoice: string;
  preferredLanguage: string;
  agentName: string;
  roleDescription: string;
}

export const EMPTY_ONBOARDING: OnboardingData = {
  accountType: "business",
  personalGoal: "",
  companyName: "",
  website: "",
  industry: "",
  vatNumber: "",
  address: "",
  businessDescription: "",
  productsServices: "",
  targetAudience: "",
  competitors: "",
  differentiators: "",
  commonQuestions: "",
  policies: "",
  mainGoals: "",
  forbiddenTopics: "",
  escalationRules: "",
  contactEmail: "",
  contactPhone: "",
  openingHours: "",
  toneOfVoice: "Professionale, chiaro e cordiale",
  preferredLanguage: "Italiano",
  agentName: "Assistente Virtuale",
  roleDescription: "Assistente digitale per clienti e attività operative",
};

