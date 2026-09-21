import crypto from "node:crypto";
import { apiError, hashOtp } from "./auth.mjs";
import { query } from "./db.mjs";
import { encryptSecret, decryptSecret } from "./secrets.mjs";
import { answerWithKnowledge } from "./assistant.mjs";
import { consumeTokens, estimateTokens } from "./credits.mjs";
import { createCreditCheckout } from "./stripe.mjs";

const TELEGRAM_API = "https://api.telegram.org";
const VERIFICATION_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Come le altre skill/moduli via WhatsApp: qui invece niente parole chiave o prenotazioni, solo la
// pipeline principale di risposta (RAG + skill via function-calling). I moduli specifici (Coach,
// Triage, Travel Planner, recap video, vocali) restano per ora solo su WhatsApp — estenderli qui è
// un lavoro a parte, non fatto in questa prima versione del canale Telegram.

function apiUrl(token, method) {
  return `${TELEGRAM_API}/bot${token}/${method}`;
}

async function telegramFetch(token, method, body) {
  let res;
  try {
    res = await fetch(apiUrl(token, method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(Number(process.env.TELEGRAM_TIMEOUT_MS || 10000)),
    });
  } catch (error) {
    const message = error?.name === "TimeoutError" ? "Timeout contattando Telegram." : "Telegram non raggiungibile.";
    throw apiError(503, message, "telegram_unreachable");
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) {
    throw apiError(res.status >= 400 ? res.status : 502, payload?.description || "Telegram API non disponibile.", "telegram_error");
  }
  return payload.result;
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function loadBot(userId) {
  const result = await query(`SELECT * FROM telegram_bots WHERE user_id = $1`, [userId]);
  return result.rows[0] || null;
}

async function loadBotById(botId) {
  const result = await query(`SELECT * FROM telegram_bots WHERE id = $1`, [botId]);
  return result.rows[0] || null;
}

function webhookUrlFor(origin, botId) {
  return origin.replace(/\/+$/, "") + "/api/telegram/webhook/" + encodeURIComponent(botId);
}

export async function getTelegramStatus(userId) {
  const bot = await loadBot(userId);
  if (!bot) return { status: "not_configured", botUsername: null, lastError: null, chats: [] };
  const chats = await query(
    `SELECT chat_id, telegram_username, label, is_owner, created_at FROM telegram_chats WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId],
  );
  return {
    status: bot.status,
    botUsername: bot.bot_username,
    lastError: bot.last_error,
    chats: chats.rows.map((row) => ({
      chatId: row.chat_id,
      username: row.telegram_username,
      label: row.label,
      isOwner: row.is_owner,
      createdAt: row.created_at,
    })),
  };
}

// Genera un codice di autorizzazione: la primissima volta serve al titolare per rivendicare il bot
// appena collegato (mandandolo in chat privata al proprio bot), le volte dopo per autorizzare
// chiunque altro. Un solo codice attivo alla volta per account, come i numeri WhatsApp.
export async function requestTelegramAuthorization(userId, label) {
  const bot = await loadBot(userId);
  if (!bot) throw apiError(409, "Collega prima un bot Telegram.");
  const code = generateCode();
  await query(
    `INSERT INTO telegram_pending_verifications (user_id, code_hash, label, attempts, expires_at)
     VALUES ($1, $2, $3, 0, NOW() + ($4 || ' minutes')::interval)
     ON CONFLICT (user_id) DO UPDATE SET code_hash = $2, label = $3, attempts = 0, expires_at = NOW() + ($4 || ' minutes')::interval, created_at = NOW()`,
    [userId, hashOtp(code), String(label || "").trim().slice(0, 80) || null, VERIFICATION_TTL_MINUTES],
  );
  return { code, botUsername: bot.bot_username, expiresInMinutes: VERIFICATION_TTL_MINUTES };
}

export async function connectTelegramBot(userId, token, origin) {
  const cleanToken = String(token || "").trim();
  if (!/^\d+:[\w-]{30,}$/.test(cleanToken)) {
    throw apiError(400, "Token non valido: incolla il token che ti ha dato @BotFather.");
  }

  const me = await telegramFetch(cleanToken, "getMe").catch(() => {
    throw apiError(400, "Token non valido o bot non raggiungibile su Telegram.");
  });
  if (!me?.is_bot) throw apiError(400, "Questo token non appartiene a un bot Telegram.");

  const webhookSecret = crypto.randomBytes(32).toString("hex");
  const existing = await loadBot(userId);
  const botId = existing?.id;
  const secrets = encryptSecret(cleanToken);

  const upserted = await query(
    `INSERT INTO telegram_bots (user_id, bot_token_encrypted, bot_username, webhook_secret, status, last_error, updated_at)
     VALUES ($1, $2, $3, $4, 'connected', NULL, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       bot_token_encrypted = $2, bot_username = $3, webhook_secret = $4, status = 'connected', last_error = NULL, updated_at = NOW()
     RETURNING id`,
    [userId, secrets, me.username || null, webhookSecret],
  );
  const id = botId || upserted.rows[0].id;

  await telegramFetch(cleanToken, "setWebhook", {
    url: webhookUrlFor(origin, id),
    secret_token: webhookSecret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  }).catch(async (error) => {
    await query(`UPDATE telegram_bots SET status = 'error', last_error = $1 WHERE id = $2`, [
      (error.message || "Registrazione webhook Telegram non riuscita.").slice(0, 500),
      id,
    ]);
    throw error;
  });

  // Se non esiste già un proprietario, prepariamo subito il codice che il cliente dovrà mandare al
  // suo bot per rivendicarlo: senza questo passaggio il bot resterebbe collegato ma senza nessuno
  // autorizzato a parlarci, e chiunque trovasse lo username potrebbe provarci per primo.
  const hasOwner = await query(`SELECT 1 FROM telegram_chats WHERE user_id = $1 AND is_owner = TRUE`, [userId]);
  let claim = null;
  if (!hasOwner.rowCount) {
    claim = await requestTelegramAuthorization(userId, "Titolare");
  }

  return { botUsername: me.username, claim };
}

// Pannello admin, stesso principio di listAllWhatsAppSessions in evolution.mjs: solo una
// panoramica di stato per assistenza (connesso/errore, username del bot, quante chat lo hanno
// autorizzato) — mai il token del bot né il contenuto dei messaggi di un cliente.
export async function listAllTelegramBots() {
  const result = await query(
    `SELECT tb.user_id, tb.bot_username, tb.status, tb.last_error, tb.updated_at,
            u.name, u.email,
            (SELECT COUNT(*)::int FROM telegram_chats tc WHERE tc.user_id = tb.user_id) AS chats_count
     FROM telegram_bots tb
     JOIN users u ON u.id = tb.user_id
     ORDER BY tb.updated_at DESC`,
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    userName: row.name,
    userEmail: row.email,
    botUsername: row.bot_username,
    status: row.status,
    chatsCount: row.chats_count,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  }));
}

export async function disconnectTelegramBot(userId) {
  const bot = await loadBot(userId);
  if (!bot) throw apiError(404, "Nessun bot Telegram da disconnettere.");
  const token = decryptSecret(bot.bot_token_encrypted);
  await telegramFetch(token, "deleteWebhook", {}).catch((error) => {
    console.warn("[telegram] deleteWebhook fallita", userId, error?.message || error);
  });
  await query(`DELETE FROM telegram_bots WHERE user_id = $1`, [userId]);
  return getTelegramStatus(userId);
}

export async function removeTelegramChat(userId, chatId) {
  const result = await query(`DELETE FROM telegram_chats WHERE user_id = $1 AND chat_id = $2 RETURNING id`, [userId, chatId]);
  if (!result.rowCount) throw apiError(404, "Chat non trovata.");
  return getTelegramStatus(userId);
}

// Come autoReplyAllowed in evolution.mjs: senza questo, una chat non autorizzata che scrive in loop
// farebbe rispondere il bot (e chiamare l'API Telegram) ad ogni messaggio, indefinitamente.
const AUTO_REPLY_LIMIT = Number(process.env.TELEGRAM_AUTO_REPLY_LIMIT || 3);
const AUTO_REPLY_WINDOW_MS = Number(process.env.TELEGRAM_AUTO_REPLY_WINDOW_MS || 10 * 60_000);
const autoReplyCounters = new Map();

function autoReplyAllowed(key) {
  const now = Date.now();
  const entry = autoReplyCounters.get(key);
  if (!entry || now > entry.resetAt) {
    autoReplyCounters.set(key, { count: 1, resetAt: now + AUTO_REPLY_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= AUTO_REPLY_LIMIT;
}

function sendMessage(token, chatId, text) {
  return telegramFetch(token, "sendMessage", { chat_id: chatId, text: String(text).slice(0, 4000) }).catch((error) => {
    console.error("[telegram] invio messaggio fallito", chatId, error?.message || error);
  });
}

async function tryClaimChat(userId, chatId, username, text) {
  const pending = await query(`SELECT * FROM telegram_pending_verifications WHERE user_id = $1`, [userId]);
  const row = pending.rows[0];
  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  if (row.attempts >= MAX_VERIFICATION_ATTEMPTS) return false;

  const cleanCode = String(text || "").replace(/\D/g, "");
  if (cleanCode.length !== 6) return false;
  const expected = Buffer.from(row.code_hash);
  const provided = Buffer.from(hashOtp(cleanCode));
  const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  if (!valid) {
    await query(`UPDATE telegram_pending_verifications SET attempts = attempts + 1 WHERE user_id = $1`, [userId]);
    return false;
  }

  const hasOwner = await query(`SELECT 1 FROM telegram_chats WHERE user_id = $1 AND is_owner = TRUE`, [userId]);
  await query(
    `INSERT INTO telegram_chats (user_id, chat_id, telegram_username, label, is_owner)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, chat_id) DO UPDATE SET telegram_username = $3, label = COALESCE($4, telegram_chats.label)`,
    [userId, String(chatId), username || null, row.label, !hasOwner.rowCount],
  );
  await query(`DELETE FROM telegram_pending_verifications WHERE user_id = $1`, [userId]);
  return true;
}

async function isAuthorizedChat(userId, chatId) {
  const result = await query(`SELECT 1 FROM telegram_chats WHERE user_id = $1 AND chat_id = $2`, [userId, String(chatId)]);
  return result.rowCount > 0;
}

async function loadOwnerUser(userId) {
  const result = await query(
    `SELECT id, email, name, plan_id, status, stripe_customer_id, subscription_id,
            subscription_current_period_end, token_balance, onboarding_completed_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

export async function handleTelegramWebhook(botId, secretToken, update) {
  const bot = await loadBotById(botId);
  if (!bot) return { ignored: true, reason: "unknown_bot" };
  const providedBuf = Buffer.from(String(secretToken || ""));
  const expectedBuf = Buffer.from(bot.webhook_secret);
  const validSecret = providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
  if (!validSecret) {
    console.warn("[telegram] webhook rifiutato: secret_token mancante o errato", { botId });
    return { ignored: true, reason: "invalid_secret" };
  }

  const message = update?.message;
  if (!message?.chat?.id) return { ignored: true, reason: "no_message" };
  const chatId = message.chat.id;
  const username = message.from?.username || message.from?.first_name || null;
  const text = String(message.text || "").trim();
  const token = decryptSecret(bot.bot_token_encrypted);

  const authorized = await isAuthorizedChat(bot.user_id, chatId);
  if (!authorized) {
    const claimed = text && (await tryClaimChat(bot.user_id, chatId, username, text));
    if (claimed) {
      await sendMessage(token, chatId, "✅ Numero autorizzato! Da adesso puoi scrivermi liberamente.");
      return { claimed: true };
    }
    if (autoReplyAllowed(`${botId}:${chatId}`)) {
      await sendMessage(
        token,
        chatId,
        "Ciao! Questo è un assistente artificiale personale, riservato al titolare e a chi ha autorizzato. Se il titolare ti ha dato un codice, scrivimelo qui per autorizzarti.",
      );
    }
    return { ignored: true, reason: "unauthorized_sender" };
  }

  if (!text) {
    await sendMessage(token, chatId, "Per ora posso rispondere solo a messaggi di testo su Telegram.");
    return { ignored: true, reason: "unsupported_content" };
  }

  const user = await loadOwnerUser(bot.user_id);
  if (!user || user.status !== "active" || !user.onboarding_completed_at) {
    return { ignored: true, reason: "account_not_ready" };
  }

  const profile = await query("SELECT onboarding_data FROM agent_config WHERE user_id = $1", [user.id]);
  let answer;
  try {
    await consumeTokens(user.id, estimateTokens(text), "telegram_input", { chatId });
    answer = await answerWithKnowledge(user.id, text, profile.rows[0]?.onboarding_data || {}, {
      channel: "telegram",
      channelRef: String(chatId),
      enableTools: true,
    });
    await consumeTokens(user.id, estimateTokens(answer.answer), "telegram_output", { chatId, model: answer.model });
  } catch (error) {
    if (error?.code !== "token_balance_empty") throw error;
    const origin = (process.env.APP_URL || "https://app.personaleartificiale.it").replace(/\/+$/, "");
    const checkout = await createCreditCheckout({
      user: { id: user.id, email: user.email, name: user.name, status: user.status, stripeCustomerId: user.stripe_customer_id },
      packId: process.env.WHATSAPP_DEFAULT_CREDIT_PACK || "crediti-100k",
      origin,
    });
    await sendMessage(token, chatId, `Hai terminato i crediti token del tuo bot. Puoi acquistare un pacchetto sicuro con Stripe qui:\n${checkout.url}`);
    return { replied: true, reason: "credits_checkout_sent" };
  }

  await sendMessage(token, chatId, answer.answer);
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata) VALUES ($1, 'incoming', 'telegram', $2, $3::jsonb)`,
    [user.id, text, JSON.stringify({ chatId })],
  );
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata) VALUES ($1, 'outgoing', 'telegram', $2, $3::jsonb)`,
    [user.id, answer.answer, JSON.stringify({ chatId, model: answer.model, fallback: answer.fallback })],
  );
  return { replied: true };
}
