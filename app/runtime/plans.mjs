export const CYCLES = [
  { id: "1m", months: 1, label: "Mensile", shortLabel: "1 mese", discountPercent: 0 },
  { id: "3m", months: 3, label: "Ogni 3 mesi", shortLabel: "3 mesi", discountPercent: 5 },
  { id: "6m", months: 6, label: "Ogni 6 mesi", shortLabel: "6 mesi", discountPercent: 10 },
  { id: "12m", months: 12, label: "Ogni 12 mesi", shortLabel: "12 mesi", discountPercent: 15 },
];

export const PLANS = {
  "assistente-digitale": {
    id: "assistente-digitale",
    name: "Assistente Digitale",
    tagline: "Il tuo primo collaboratore AI",
    description: "Per professionisti, freelance e piccole attività che vogliono delegare comunicazioni e lavoro ripetitivo.",
    monthlyPrice: 7890,
    includedTokens: 200000,
    maxDocuments: 60,
    includedIntegrations: 1,
    includedWhatsappNumbers: 1,
    stripePriceEnvPrefix: "STRIPE_PRICE_ASSISTENTE_DIGITALE",
    features: [
      "1 assistente AI personale",
      "Knowledge base RAG aziendale",
      "Fino a 60 documenti",
      "Configurazione tono, regole e obiettivi",
      "1 numero WhatsApp personale",
      "1 connettore incluso (Gmail, Calendar, Drive o Telegram)",
      "200.000 token al mese inclusi",
      "Nessun costo di attivazione",
    ],
  },
  "ufficio-digitale": {
    id: "ufficio-digitale",
    name: "Ufficio Digitale",
    tagline: "Un team digitale per la tua impresa",
    description: "Per PMI, studi e agenzie che vogliono automatizzare più processi e gestire una base informativa estesa.",
    monthlyPrice: 14890,
    includedTokens: 700000,
    maxDocuments: 250,
    includedIntegrations: 3,
    includedWhatsappNumbers: 2,
    stripePriceEnvPrefix: "STRIPE_PRICE_UFFICIO_DIGITALE",
    features: [
      "Fino a 3 ruoli AI coordinati",
      "Knowledge base RAG avanzata",
      "Fino a 250 documenti",
      "Configurazione processi e priorità",
      "2 numeri WhatsApp personali",
      "3 connettori inclusi (Gmail, Calendar, Drive, Telegram...)",
      "700.000 token al mese inclusi",
      "Nessun costo di attivazione",
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

export function getCycle(cycleId) {
  return CYCLES.find((cycle) => cycle.id === cycleId) ?? null;
}

// Prezzo totale del ciclo, scontato e arrotondato al centesimo: chi paga 12 mesi in
// un colpo solo con il 15% di sconto deve vedere lo stesso numero sia sul sito che
// nella sessione Stripe, quindi questa è l'UNICA funzione che lo calcola.
export function cyclePrice(plan, cycle) {
  const fullPrice = plan.monthlyPrice * cycle.months;
  return Math.round(fullPrice * (1 - cycle.discountPercent / 100));
}

function cycleStripeEnv(plan, cycle) {
  return `${plan.stripePriceEnvPrefix}_${cycle.id.toUpperCase()}`;
}

function planCyclesPublic(plan) {
  return CYCLES.map((cycle) => {
    const total = cyclePrice(plan, cycle);
    const fullPrice = plan.monthlyPrice * cycle.months;
    const savings = fullPrice - total;
    return {
      id: cycle.id,
      months: cycle.months,
      label: cycle.label,
      shortLabel: cycle.shortLabel,
      discountPercent: cycle.discountPercent,
      totalPrice: total,
      totalPriceFormatted: euro(total),
      monthlyEquivalent: Math.round(total / cycle.months),
      monthlyEquivalentFormatted: euro(Math.round(total / cycle.months)),
      savingsFormatted: savings > 0 ? euro(savings) : null,
    };
  });
}

export function publicPlans() {
  return Object.values(PLANS).map(({ stripePriceEnvPrefix, ...plan }) => ({
    ...plan,
    monthlyPriceFormatted: euro(plan.monthlyPrice),
    cycles: planCyclesPublic(plan),
  }));
}

export function getPlan(planId) {
  return PLANS[planId] ?? null;
}

export function getPlanCycleStripeEnv(planId, cycleId) {
  const plan = getPlan(planId);
  const cycle = getCycle(cycleId);
  if (!plan || !cycle) return null;
  return cycleStripeEnv(plan, cycle);
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
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
