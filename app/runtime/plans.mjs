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
    includedIntegrations: 2,
    includedWhatsappNumbers: 1,
    stripeMonthlyPriceEnv: "STRIPE_PRICE_EXECUTIVE_MONTHLY",
    stripeSetupPriceEnv: "STRIPE_PRICE_EXECUTIVE_SETUP",
    features: [
      "1 assistente AI personale",
      "Knowledge base RAG aziendale",
      "Fino a 50 documenti",
      "Configurazione tono, regole e obiettivi",
      "1 numero WhatsApp personale",
      "Fino a 2 integrazioni incluse",
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
    includedIntegrations: 6,
    includedWhatsappNumbers: 2,
    stripeMonthlyPriceEnv: "STRIPE_PRICE_OFFICE_MONTHLY",
    stripeSetupPriceEnv: "STRIPE_PRICE_OFFICE_SETUP",
    features: [
      "Fino a 3 ruoli AI coordinati",
      "Knowledge base RAG avanzata",
      "Fino a 250 documenti",
      "Configurazione processi e priorità",
      "2 numeri WhatsApp personali",
      "Fino a 6 integrazioni incluse",
    ],
    highlighted: true,
  },
};

export const ADDONS = {
  extra_integration: {
    type: "extra_integration",
    name: "Integrazione extra",
    description: "Uno slot in più per collegare un'integrazione oltre quelle incluse nel piano.",
    price: 900,
    priceEnv: "STRIPE_PRICE_EXTRA_INTEGRATION_MONTHLY",
  },
  extra_whatsapp_number: {
    type: "extra_whatsapp_number",
    name: "Numero WhatsApp extra",
    description: "Un numero personale in più a cui il tuo assistente risponde.",
    price: 500,
    priceEnv: "STRIPE_PRICE_EXTRA_WHATSAPP_NUMBER_MONTHLY",
  },
};

export function getAddon(addonType) {
  return ADDONS[addonType] ?? null;
}

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

export function publicAddons() {
  return Object.values(ADDONS).map(({ priceEnv, ...addon }) => ({
    ...addon,
    priceFormatted: euro(addon.price) + " / mese",
  }));
}

export function euro(cents) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
