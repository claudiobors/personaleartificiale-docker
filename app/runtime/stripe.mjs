import Stripe from "stripe";
import { query } from "./db.mjs";
import { apiError } from "./auth.mjs";
import { getPlan } from "./plans.mjs";

let stripeClient;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw apiError(503, "Stripe non ? configurato. Imposta STRIPE_SECRET_KEY.", "stripe_not_configured");
  }
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

function itemFor(plan, kind) {
  const recurring = kind === "monthly";
  const envName = recurring ? plan.stripeMonthlyPriceEnv : plan.stripeSetupPriceEnv;
  const configuredPrice = process.env[envName];
  if (configuredPrice) return { price: configuredPrice, quantity: 1 };

  const amount = recurring ? plan.monthlyPrice : plan.setupFee;
  const suffix = recurring ? "Abbonamento mensile" : "Configurazione iniziale";
  const priceData = {
    currency: "eur",
    unit_amount: amount,
    product_data: {
      name: plan.name + " · " + suffix,
      description: plan.description,
      metadata: { plan_id: plan.id, charge_type: recurring ? "recurring" : "setup" },
    },
  };
  if (recurring) priceData.recurring = { interval: "month" };
  return { price_data: priceData, quantity: 1 };
}

function statusFromStripe(status) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "paused") return "past_due";
  if (status === "canceled") return "cancelled";
  return "pending";
}

function periodEnd(subscription) {
  const direct = subscription?.current_period_end;
  const itemEnds = subscription?.items?.data?.map((item) => item.current_period_end).filter(Boolean) ?? [];
  const value = direct || (itemEnds.length ? Math.max(...itemEnds) : null);
  return value ? new Date(value * 1000) : null;
}

async function ensureCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { user_id: user.id },
  });
  await query(
    "UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2",
    [customer.id, user.id],
  );
  return customer.id;
}

export async function createCheckout({ user, planId, origin }) {
  const plan = getPlan(planId);
  if (!plan) throw apiError(400, "Piano non valido.");
  if (user.status === "active") {
    throw apiError(409, "Hai già un abbonamento attivo. Gestiscilo dalla sezione Fatturazione.");
  }

  const customer = await ensureCustomer(user);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [itemFor(plan, "monthly"), itemFor(plan, "setup")],
    success_url: origin + "/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + "/dashboard?checkout=cancelled",
    locale: "it",
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    allow_promotion_codes: true,
    metadata: { user_id: user.id, plan_id: plan.id },
    subscription_data: { metadata: { user_id: user.id, plan_id: plan.id } },
  });

  await query(
    `UPDATE users
     SET plan_id = $1, stripe_checkout_session_id = $2, updated_at = NOW()
     WHERE id = $3`,
    [plan.id, session.id, user.id],
  );

  return { url: session.url, sessionId: session.id };
}

async function activateFromSession(session) {
  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!userId || !planId || !subscriptionId || !customerId) return;

  const subscription = typeof session.subscription === "object" && session.subscription
    ? session.subscription
    : await stripe().subscriptions.retrieve(subscriptionId);

  await query(
    `UPDATE users
     SET plan_id = $1, subscription_id = $2, stripe_customer_id = $3,
         stripe_checkout_session_id = $4, status = $5,
         subscription_current_period_end = $6, last_payment_error = NULL,
         updated_at = NOW()
     WHERE id = $7`,
    [
      planId,
      subscriptionId,
      customerId,
      session.id,
      statusFromStripe(subscription.status),
      periodEnd(subscription),
      userId,
    ],
  );
}

export async function confirmCheckout({ sessionId, userId }) {
  if (!sessionId) throw apiError(400, "Sessione Stripe mancante.");
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });
  if (session.metadata?.user_id !== userId) throw apiError(403, "Sessione Stripe non valida.");
  if (session.status !== "complete") {
    return { complete: false, paymentStatus: session.payment_status };
  }
  await activateFromSession(session);
  return { complete: true, paymentStatus: session.payment_status };
}

export async function createPortal({ user, origin }) {
  if (!user.stripeCustomerId) throw apiError(400, "Profilo di fatturazione non ancora disponibile.");
  const session = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: origin + "/dashboard",
  });
  return { url: session.url };
}

async function updateSubscription(subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) return;
  await query(
    `UPDATE users
     SET subscription_id = $1, status = $2,
         subscription_current_period_end = $3, updated_at = NOW()
     WHERE stripe_customer_id = $4`,
    [subscription.id, statusFromStripe(subscription.status), periodEnd(subscription), customerId],
  );
}

export function constructWebhook(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw apiError(503, "STRIPE_WEBHOOK_SECRET non configurato.");
  }
  return stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

export async function processWebhook(event) {
  const exists = await query("SELECT 1 FROM stripe_webhook_events WHERE event_id = $1", [event.id]);
  if (exists.rowCount) return { duplicate: true };

  switch (event.type) {
    case "checkout.session.completed":
      await activateFromSession(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await updateSubscription(event.data.object);
      break;
    case "invoice.paid": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await query(
          "UPDATE users SET status = 'active', last_payment_error = NULL, updated_at = NOW() WHERE stripe_customer_id = $1",
          [customerId],
        );
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await query(
          `UPDATE users SET status = 'past_due', last_payment_error = $1, updated_at = NOW()
           WHERE stripe_customer_id = $2`,
          ["Il rinnovo non è riuscito. Aggiorna il metodo di pagamento.", customerId],
        );
      }
      break;
    }
    default:
      break;
  }

  await query(
    "INSERT INTO stripe_webhook_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [event.id, event.type],
  );
  return { duplicate: false };
}

export async function retrieveSubscription(subscriptionId) {
  return stripe().subscriptions.retrieve(subscriptionId);
}

