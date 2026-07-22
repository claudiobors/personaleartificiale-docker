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
  setupFeeFormatted: string;
  monthlyPriceFormatted: string;
  features: string[];
  highlighted?: boolean;
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

export interface OnboardingData {
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

