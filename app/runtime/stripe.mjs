import Stripe from "stripe";
import { query } from "./db.mjs";
import { apiError } from "./auth.mjs";
import { PLANS, getAddon, getPlan, getCreditPack } from "./plans.mjs";
import { addCredits, grantPlanAllowance } from "./credits.mjs";

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

function creditItemFor(pack) {
  const configuredPrice = process.env[pack.stripePriceEnv];
  if (configuredPrice) return { price: configuredPrice, quantity: 1 };
  return {
    price_data: {
      currency: "eur",
      unit_amount: pack.price,
      product_data: {
        name: pack.name,
        description: pack.description,
        metadata: { pack_id: pack.id, tokens: String(pack.tokens), charge_type: "credits" },
      },
    },
    quantity: 1,
  };
}

function addonItemFor(addon) {
  const configuredPrice = process.env[addon.priceEnv];
  if (configuredPrice) return { price: configuredPrice, quantity: 1 };
  return {
    price_data: {
      currency: "eur",
      unit_amount: addon.price,
      recurring: { interval: "month" },
      product_data: {
        name: addon.name,
        description: addon.description,
        metadata: { addon_type: addon.type, charge_type: "addon" },
      },
    },
    quantity: 1,
  };
}

function planIdFromSubscription(subscription) {
  const items = subscription?.items?.data || [];
  for (const item of items) {
    const priceId = item.price?.id;
    if (!priceId) continue;
    const match = Object.values(PLANS).find((plan) => process.env[plan.stripeMonthlyPriceEnv] === priceId);
    if (match) return match.id;
  }
  if (subscription?.metadata?.plan_id && getPlan(subscription.metadata.plan_id)) {
    return subscription.metadata.plan_id;
  }
  return null;
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

function localBillingBypassAllowed(origin) {
  if (process.env.DEV_BYPASS_BILLING !== "true") return false;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  } catch {
    return false;
  }
}

export async function createCheckout({ user, planId, origin }) {
  const plan = getPlan(planId);
  if (!plan) throw apiError(400, "Piano non valido.");
  if (user.status === "active") {
    throw apiError(409, "Hai già un abbonamento attivo. Gestiscilo dalla sezione Fatturazione.");
  }

  if (localBillingBypassAllowed(origin)) {
    await query(
      `UPDATE users
       SET plan_id = $1, status = 'active', subscription_id = COALESCE(subscription_id, 'dev_bypass'),
           stripe_checkout_session_id = 'dev_bypass',
           subscription_current_period_end = NOW() + INTERVAL '30 days',
           last_payment_error = NULL, updated_at = NOW()
       WHERE id = $2`,
      [plan.id, user.id],
    );
    await grantPlanAllowance(user.id, plan.id);
    return { url: origin.replace(/\/+$/, "") + "/dashboard?checkout=dev-bypass" };
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

export async function createCreditCheckout({ user, packId, origin }) {
  const pack = getCreditPack(packId);
  if (!pack) throw apiError(400, "Pacchetto crediti non valido.");
  if (user.status !== "active") throw apiError(402, "Serve un account attivo per acquistare crediti.");
  const customer = await ensureCustomer(user);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer,
    line_items: [creditItemFor(pack)],
    success_url: origin + "/dashboard?credits=success&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + "/dashboard?credits=cancelled",
    locale: "it",
    allow_promotion_codes: true,
    metadata: { user_id: user.id, pack_id: pack.id, tokens: String(pack.tokens), checkout_type: "credits" },
  });
  return { url: session.url, sessionId: session.id };
}

export async function createAddonCheckout({ user, addonType, origin }) {
  const addon = getAddon(addonType);
  if (!addon) throw apiError(400, "Componente aggiuntivo non valido.");
  if (user.status !== "active") throw apiError(402, "Serve un account attivo per attivare un componente aggiuntivo.");
  const customer = await ensureCustomer(user);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [addonItemFor(addon)],
    success_url: origin + `/dashboard?addon=${addonType}&status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: origin + `/dashboard?addon=${addonType}&status=cancelled`,
    locale: "it",
    allow_promotion_codes: true,
    metadata: { user_id: user.id, addon_type: addonType, checkout_type: "addon" },
    subscription_data: { metadata: { user_id: user.id, addon_type: addonType, checkout_type: "addon" } },
  });
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
  await grantPlanAllowance(userId, planId);
}

async function activateCreditsFromSession(session) {
  const userId = session.metadata?.user_id;
  const packId = session.metadata?.pack_id;
  const pack = getCreditPack(packId);
  if (!userId || !pack || session.payment_status !== "paid") return;
  await addCredits(userId, pack.tokens, "credit_purchase", { packId, stripeSessionId: session.id });
}

async function grantAddonSlot(userId, addonType, subscriptionId) {
  const inserted = await query(
    `INSERT INTO addon_subscriptions (user_id, addon_type, stripe_subscription_id, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (stripe_subscription_id) DO NOTHING
     RETURNING id`,
    [userId, addonType, subscriptionId],
  );
  if (!inserted.rowCount) return;
  const column = addonType === "extra_integration" ? "extra_integration_slots" : "extra_whatsapp_slots";
  await query(`UPDATE users SET ${column} = ${column} + 1, updated_at = NOW() WHERE id = $1`, [userId]);
}

async function revokeAddonSlot(userId, addonType, subscriptionId) {
  const updated = await query(
    `UPDATE addon_subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = $1 AND status = 'active' RETURNING id`,
    [subscriptionId],
  );
  if (!updated.rowCount) return;
  const column = addonType === "extra_integration" ? "extra_integration_slots" : "extra_whatsapp_slots";
  await query(`UPDATE users SET ${column} = GREATEST(0, ${column} - 1), updated_at = NOW() WHERE id = $1`, [userId]);
}

async function activateAddonFromSession(session) {
  const userId = session.metadata?.user_id;
  const addonType = session.metadata?.addon_type;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!userId || !addonType || !subscriptionId) return;
  await grantAddonSlot(userId, addonType, subscriptionId);
}

/**
 * Se un cliente passa a un piano con quote più basse e in quel momento ha più
 * integrazioni/numeri attivi di quanti ne includa il nuovo piano, l'eccedenza
 * viene addebitata automaticamente come componente extra (per policy: chi supera
 * la quota dopo un downgrade paga da subito, non perde l'accesso).
 */
async function reconcilePlanDowngrade(userId, customerId, newPlanId) {
  if (!customerId) return;
  const plan = getPlan(newPlanId);
  if (!plan) return;

  const [userRow, integrationsCount, numbersCount] = await Promise.all([
    query(`SELECT extra_integration_slots, extra_whatsapp_slots FROM users WHERE id = $1`, [userId]),
    query(`SELECT COUNT(*)::int AS count FROM integrations WHERE user_id = $1 AND status = 'connected'`, [userId]),
    query(`SELECT COUNT(*)::int AS count FROM whatsapp_numbers WHERE user_id = $1`, [userId]),
  ]);
  const row = userRow.rows[0];
  if (!row) return;

  const overIntegrations = Math.max(
    0,
    integrationsCount.rows[0].count - (plan.includedIntegrations || 0) - (row.extra_integration_slots || 0),
  );
  const overNumbers = Math.max(
    0,
    numbersCount.rows[0].count - (plan.includedWhatsappNumbers || 0) - (row.extra_whatsapp_slots || 0),
  );

  for (let i = 0; i < overIntegrations; i += 1) {
    await autoChargeAddon(userId, customerId, "extra_integration");
  }
  for (let i = 0; i < overNumbers; i += 1) {
    await autoChargeAddon(userId, customerId, "extra_whatsapp_number");
  }
}

async function autoChargeAddon(userId, customerId, addonType) {
  const addon = getAddon(addonType);
  if (!addon) return;
  try {
    const subscription = await stripe().subscriptions.create({
      customer: customerId,
      items: [addonItemFor(addon)],
      metadata: { user_id: userId, addon_type: addonType, checkout_type: "addon" },
      description: `${addon.name} — attivato automaticamente dopo cambio piano`,
    });
    await grantAddonSlot(userId, addonType, subscription.id);
  } catch (error) {
    console.error("[stripe] addebito automatico componente extra non riuscito", userId, addonType, error?.message || error);
  }
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

async function updateAddonSubscription(subscription) {
  const userId = subscription.metadata?.user_id;
  const addonType = subscription.metadata?.addon_type;
  if (!userId || !addonType) return;
  const active = statusFromStripe(subscription.status) === "active";
  if (!active) {
    await revokeAddonSlot(userId, addonType, subscription.id);
  }
}

async function updateSubscription(subscription) {
  if (subscription.metadata?.checkout_type === "addon") {
    await updateAddonSubscription(subscription);
    return;
  }

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) return;

  const existing = await query(`SELECT id, plan_id FROM users WHERE stripe_customer_id = $1`, [customerId]);
  const userRow = existing.rows[0];
  const newPlanId = planIdFromSubscription(subscription);

  await query(
    `UPDATE users
     SET subscription_id = $1, status = $2,
         subscription_current_period_end = $3,
         plan_id = COALESCE($5, plan_id),
         updated_at = NOW()
     WHERE stripe_customer_id = $4`,
    [subscription.id, statusFromStripe(subscription.status), periodEnd(subscription), customerId, newPlanId],
  );

  if (userRow && newPlanId && newPlanId !== userRow.plan_id) {
    await grantPlanAllowance(userRow.id, newPlanId).catch((error) =>
      console.error("[stripe] aggiornamento monte token dopo cambio piano fallito", userRow.id, error?.message || error),
    );
    await reconcilePlanDowngrade(userRow.id, customerId, newPlanId).catch((error) =>
      console.error("[stripe] riconciliazione downgrade fallita", userRow.id, error?.message || error),
    );
  }
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
    case "checkout.session.completed": {
      const checkoutType = event.data.object?.metadata?.checkout_type;
      if (checkoutType === "credits") {
        await activateCreditsFromSession(event.data.object);
      } else if (checkoutType === "addon") {
        await activateAddonFromSession(event.data.object);
      } else {
        await activateFromSession(event.data.object);
      }
      break;
    }
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

