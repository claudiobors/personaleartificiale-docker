/**
 * Stripe client and helpers for Personale Artificiale.
 * Handles checkout sessions (setup fee + recurring subscription),
 * webhook verification, and customer management.
 */
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(key, {
    apiVersion: "2025-04-30",
    typescript: true,
  });
}

/** Pricing plans as defined in the business plan */
export const PLANS = {
  "assistente-esecutivo": {
    name: "Assistente Esecutivo",
    setupFee: 39900, // €399 in cents
    monthlyPrice: 9700, // €97 in cents
    description: "Per freelance e artigiani",
  },
  "ufficio-digitale": {
    name: "L'Ufficio Digitale",
    setupFee: 99900, // €999 in cents
    monthlyPrice: 29700, // €297 in cents
    description: "Per PMI, agenzie e studi professionali",
  },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Create a Stripe Checkout Session for a subscription with setup fee.
 *
 * Strategy: charge the setup fee as an immediate one-time payment via
 * `payment_intent_data` on the subscription, and start the recurring
 * monthly billing from the next cycle.
 *
 * @returns The Checkout Session URL for redirect.
 */
export async function createCheckoutSession(params: {
  planId: PlanId;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const plan = PLANS[params.planId];

  // Create a product for the plan if it doesn't exist yet
  // In production, you'd store price IDs from the Stripe Dashboard

  // Create a one-time price for the setup fee
  const setupPrice = await stripe.prices.create({
    unit_amount: plan.setupFee,
    currency: "eur",
    product_data: {
      name: `${plan.name} — Setup Fee`,
      description: plan.description,
    },
  });

  // Create a recurring price for the monthly subscription
  const monthlyPrice = await stripe.prices.create({
    unit_amount: plan.monthlyPrice,
    currency: "eur",
    recurring: { interval: "month" },
    product_data: {
      name: `${plan.name} — Abbonamento Mensile`,
      description: plan.description,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: setupPrice.id,
        quantity: 1,
      },
      {
        price: monthlyPrice.id,
        quantity: 1,
      },
    ],
    customer_email: params.customerEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      plan_id: params.planId,
      ...params.metadata,
    },
    subscription_data: {
      metadata: {
        plan_id: params.planId,
        ...params.metadata,
      },
    },
  });

  return session;
}

/**
 * Construct and verify a Stripe webhook event from a raw request body.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Retrieve the checkout session and subscription details.
 */
export async function getSessionDetails(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer", "line_items"],
  });
}

/**
 * Retrieve a subscription by ID.
 */
export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription at period end.
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Get the Stripe instance for direct usage when needed.
 */
export function getStripeInstance(): Stripe {
  return getStripe();
}