export const PLANS = {
  "assistente-esecutivo": {
    id: "assistente-esecutivo",
    name: "Assistente Esecutivo",
    tagline: "Il tuo braccio destro digitale",
    description: "Per professionisti, freelance e piccole attività che vogliono delegare comunicazioni e lavoro ripetitivo.",
    setupFee: 39900,
    monthlyPrice: 9700,
    includedTokens: 250000,
    maxDocuments: 50,
    stripeMonthlyPriceEnv: "STRIPE_PRICE_EXECUTIVE_MONTHLY",
    stripeSetupPriceEnv: "STRIPE_PRICE_EXECUTIVE_SETUP",
    features: [
      "1 assistente AI personalizzato",
      "Knowledge base RAG aziendale",
      "Fino a 50 documenti",
      "Configurazione tono, regole e obiettivi",
      "Canale WhatsApp",
      "Report attività e assistenza email",
    ],
  },
  "ufficio-digitale": {
    id: "ufficio-digitale",
    name: "L'Ufficio Digitale",
    tagline: "Un team digitale per la tua impresa",
    description: "Per PMI, studi e agenzie che vogliono automatizzare più processi e gestire una base informativa estesa.",
    setupFee: 99900,
    monthlyPrice: 29700,
    includedTokens: 1000000,
    maxDocuments: 250,
    stripeMonthlyPriceEnv: "STRIPE_PRICE_OFFICE_MONTHLY",
    stripeSetupPriceEnv: "STRIPE_PRICE_OFFICE_SETUP",
    features: [
      "Fino a 3 ruoli AI coordinati",
      "Knowledge base RAG avanzata",
      "Fino a 250 documenti",
      "WhatsApp e flussi multicanale",
      "Configurazione processi e priorità",
      "Report avanzati e supporto prioritario",
    ],
    highlighted: true,
  },
};

export const CREDIT_PACKS = {
  "crediti-100k": {
    id: "crediti-100k",
    name: "Pacchetto 100k token",
    description: "Credito extra per continuare a parlare con il bot via WhatsApp e dashboard.",
    tokens: 100000,
    price: 1900,
    stripePriceEnv: "STRIPE_PRICE_CREDITS_100K",
  },
  "crediti-500k": {
    id: "crediti-500k",
    name: "Pacchetto 500k token",
    description: "Credito extra consigliato per uso continuativo e knowledge base ampia.",
    tokens: 500000,
    price: 7900,
    stripePriceEnv: "STRIPE_PRICE_CREDITS_500K",
  },
};

export function publicPlans() {
  return Object.values(PLANS).map(({ stripeMonthlyPriceEnv, stripeSetupPriceEnv, ...plan }) => ({
    ...plan,
    setupFeeFormatted: euro(plan.setupFee),
    monthlyPriceFormatted: euro(plan.monthlyPrice),
  }));
}

export function getPlan(planId) {
  return PLANS[planId] ?? null;
}

export function publicCreditPacks() {
  return Object.values(CREDIT_PACKS).map(({ stripePriceEnv, ...pack }) => ({
    ...pack,
    priceFormatted: euro(pack.price),
  }));
}

export function getCreditPack(packId) {
  return CREDIT_PACKS[packId] ?? null;
}

export function euro(cents) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
