import { rm } from "node:fs/promises";
import path from "node:path";
import { apiError } from "./auth.mjs";
import { query, withTransaction } from "./db.mjs";
import { deleteUserVectors } from "./rag.mjs";
import { cancelStripeSubscriptionForDeletion } from "./stripe.mjs";

const UPLOADS_BASE = process.env.UPLOADS_DIR || "/app/uploads";

function rows(result) {
  return result.rows || [];
}

export async function exportUserData(userId) {
  const [
    user, config, files, messages, whatsapp, whatsappNumbers, integrations,
    tokenLedger, emailDrafts, coachGoals, triageSessions, travelPlans, addonSubscriptions,
    telegramBot, telegramChats,
  ] = await Promise.all([
    query(
      `SELECT id, email, name, created_at, updated_at, plan_id, status,
              subscription_current_period_end, terms_accepted_at, onboarding_completed_at
       FROM users WHERE id = $1`,
      [userId],
    ),
    query(
      `SELECT agent_name, tone_of_voice, role_description, business_description,
              products, target_audience, competitors, onboarding_data,
              onboarding_completed, created_at, updated_at
       FROM agent_config WHERE user_id = $1`,
      [userId],
    ),
    query(
      `SELECT id, original_name, mime_type, file_size, status, chunks_count,
              error_message, created_at
       FROM knowledge_files WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    ),
    query(
      `SELECT direction, channel, content, metadata, created_at
       FROM agent_messages WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT instance_name, status, last_error, created_at, updated_at
       FROM whatsapp_sessions WHERE user_id = $1`,
      [userId],
    ),
    query(`SELECT phone, label, created_at FROM whatsapp_numbers WHERE user_id = $1 ORDER BY created_at ASC`, [userId]),
    // Mai i "secrets" (token OAuth/password IMAP cifrati): solo lo stato della connessione, utile
    // a chi chiede quali servizi terzi ha collegato al proprio assistente.
    query(
      `SELECT provider, status, settings, last_error, last_synced_at, created_at, updated_at
       FROM integrations WHERE user_id = $1`,
      [userId],
    ),
    query(
      `SELECT delta, balance_after, reason, metadata, created_at
       FROM token_ledger WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT to_address, subject, body, original_snippet, provider, status, created_at, sent_at
       FROM email_drafts WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT status, phase, wish, motivation, outcome, obstacle, deadline_at, process_goal,
              if_then_plan, created_at, updated_at
       FROM coach_goals WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT status, groups, created_at, updated_at FROM triage_sessions WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT status, origin, destination, depart_date, return_date, travelers, created_at, updated_at
       FROM travel_plans WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT addon_type, status, created_at FROM addon_subscriptions WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    // Mai il token del bot (cifrato): solo se un bot è collegato e a che username risponde.
    query(`SELECT bot_username, status, last_error, created_at, updated_at FROM telegram_bots WHERE user_id = $1`, [userId]),
    query(
      `SELECT chat_id, telegram_username, label, is_owner, created_at FROM telegram_chats WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: rows(user)[0] || null,
    configuration: rows(config)[0] || null,
    knowledgeFiles: rows(files),
    messages: rows(messages),
    whatsapp: rows(whatsapp)[0] || null,
    whatsappNumbers: rows(whatsappNumbers),
    integrations: rows(integrations),
    tokenLedger: rows(tokenLedger),
    emailDrafts: rows(emailDrafts),
    coachGoals: rows(coachGoals),
    triageSessions: rows(triageSessions),
    travelPlans: rows(travelPlans),
    addonSubscriptions: rows(addonSubscriptions),
    telegramBot: rows(telegramBot)[0] || null,
    telegramChats: rows(telegramChats),
  };
}

export async function deleteUserData(userId, confirmation) {
  if (String(confirmation || "").toUpperCase() !== "ELIMINA") {
    throw apiError(400, "Per eliminare i dati devi confermare con ELIMINA.");
  }

  const userResult = await query("SELECT id, stripe_customer_id, subscription_id FROM users WHERE id = $1", [userId]);
  const user = userResult.rows[0];
  if (!user) throw apiError(404, "Utente non trovato.");

  const addons = await query(
    `SELECT stripe_subscription_id FROM addon_subscriptions WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );

  // Senza questo, cancellare l'account in piattaforma lasciava l'abbonamento (e gli eventuali extra)
  // attivi su Stripe: la carta del cliente avrebbe continuato a essere addebitata anche dopo
  // l'eliminazione, senza più alcun riferimento locale per fermarla.
  await cancelStripeSubscriptionForDeletion({
    stripeCustomerId: user.stripe_customer_id,
    subscriptionId: user.subscription_id,
  }).catch((error) => console.warn("[privacy] cancellazione Stripe fallita", error.message));
  for (const addon of addons.rows) {
    await cancelStripeSubscriptionForDeletion({ subscriptionId: addon.stripe_subscription_id }).catch((error) =>
      console.warn("[privacy] cancellazione addon Stripe fallita", addon.stripe_subscription_id, error.message),
    );
  }

  await deleteUserVectors(userId).catch((error) => console.warn("[privacy] vector cleanup failed", error.message));
  await rm(path.join(UPLOADS_BASE, userId), { recursive: true, force: true }).catch(() => {});

  await withTransaction(async (client) => {
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
  });

  return { deleted: true, deletedAt: new Date().toISOString() };
}
