import crypto from "node:crypto";
import { apiError } from "./auth.mjs";
import { query } from "./db.mjs";
import { answerWithKnowledge } from "./assistant.mjs";

const EVOLUTION_URL = (process.env.EVOLUTION_API_URL || "http://evolution:8080").replace(/\/+$/, "");

function evolutionKey() {
  const key = process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY;
  if (!key) throw apiError(503, "Evolution API non configurata. Imposta EVOLUTION_API_KEY.", "evolution_not_configured");
  return key;
}

function headers() {
  return { "Content-Type": "application/json", apikey: evolutionKey() };
}

function safeInstanceName(userId) {
  return "pa_" + String(userId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
}

function cleanNumber(value) {
  return String(value || "").replace(/@s\.whatsapp\.net$/i, "").replace(/\D/g, "");
}

async function evolutionFetch(pathname, options = {}) {
  const res = await fetch(EVOLUTION_URL + pathname, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(Number(process.env.EVOLUTION_TIMEOUT_MS || 10000)),
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!res.ok) {
    const error = apiError(res.status, payload?.message || payload?.error || "Evolution API non disponibile.", "evolution_error");
    error.detail = payload;
    throw error;
  }
  return payload;
}

export async function ensureWhatsAppSession(user, origin) {
  const existing = await query(
    `SELECT instance_name, status, qr_code, last_error, updated_at
     FROM whatsapp_sessions WHERE user_id = $1`,
    [user.id],
  );
  let instanceName = existing.rows[0]?.instance_name || safeInstanceName(user.id);

  await query(
    `INSERT INTO whatsapp_sessions (user_id, instance_name, status, updated_at)
     VALUES ($1, $2, 'provisioning', NOW())
     ON CONFLICT (user_id) DO UPDATE SET status = 'provisioning', updated_at = NOW()`,
    [user.id, instanceName],
  );

  try {
    await evolutionFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    }).catch((error) => {
      if (![400, 409, 403].includes(Number(error.status))) throw error;
    });

    const webhookUrl = origin.replace(/\/+$/, "") + "/api/evolution/webhook";
    await evolutionFetch("/webhook/set/" + encodeURIComponent(instanceName), {
      method: "POST",
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
      }),
    }).catch(() => {});

    const qr = await fetchQr(instanceName).catch(() => null);
    await query(
      `UPDATE whatsapp_sessions
       SET status = $1, qr_code = $2, last_error = NULL, updated_at = NOW()
       WHERE user_id = $3`,
      [qr?.base64 ? "qr_ready" : "provisioned", qr?.base64 || qr?.code || null, user.id],
    );
    return await getWhatsAppStatus(user.id);
  } catch (error) {
    await query(
      `UPDATE whatsapp_sessions SET status = 'error', last_error = $1, updated_at = NOW() WHERE user_id = $2`,
      [(error.message || "Errore Evolution").slice(0, 500), user.id],
    );
    throw error;
  }
}

async function fetchQr(instanceName) {
  const data = await evolutionFetch("/instance/connect/" + encodeURIComponent(instanceName), { method: "GET" });
  return {
    code: data?.code || data?.qrcode?.code || "",
    base64: data?.base64 || data?.qrcode?.base64 || data?.qr || "",
  };
}

export async function refreshWhatsAppStatus(userId) {
  const current = await getSessionByUser(userId);
  if (!current) return getWhatsAppStatus(userId);
  try {
    const data = await evolutionFetch("/instance/connectionState/" + encodeURIComponent(current.instanceName));
    const state = data?.instance?.state || data?.state || "unknown";
    const status = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
    await query(
      `UPDATE whatsapp_sessions SET status = $1, last_error = NULL, updated_at = NOW() WHERE user_id = $2`,
      [status, userId],
    );
  } catch (error) {
    await query(
      `UPDATE whatsapp_sessions SET last_error = $1, updated_at = NOW() WHERE user_id = $2`,
      [(error.message || "Status Evolution non disponibile").slice(0, 500), userId],
    );
  }
  return getWhatsAppStatus(userId);
}

async function getSessionByUser(userId) {
  const result = await query(
    `SELECT user_id, instance_name, status, qr_code, last_error, updated_at
     FROM whatsapp_sessions WHERE user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return row ? mapSession(row) : null;
}

async function getSessionByInstance(instanceName) {
  const result = await query(
    `SELECT user_id, instance_name, status, qr_code, last_error, updated_at
     FROM whatsapp_sessions WHERE instance_name = $1`,
    [instanceName],
  );
  const row = result.rows[0];
  return row ? mapSession(row) : null;
}

function mapSession(row) {
  return {
    userId: row.user_id,
    instanceName: row.instance_name,
    status: row.status,
    qrCode: row.qr_code,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

export async function getWhatsAppStatus(userId) {
  return (await getSessionByUser(userId)) || {
    userId,
    instanceName: null,
    status: "not_configured",
    qrCode: null,
    lastError: null,
    updatedAt: null,
  };
}

export function assertEvolutionWebhook(request, url) {
  const configured = process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY;
  if (!configured) throw apiError(503, "Webhook Evolution non configurato.");
  const provided = request.headers.apikey || request.headers["x-api-key"] || url.searchParams.get("apikey");
  if (provided !== configured) throw apiError(401, "Webhook Evolution non autorizzato.");
}

function extractWebhookMessage(payload) {
  const data = payload?.data || payload;
  const instanceName = payload?.instance || data?.instance || data?.instanceName || payload?.instanceName;
  const key = data?.key || data?.message?.key || {};
  const remoteJid = key.remoteJid || data?.remoteJid || data?.from || data?.sender;
  const fromMe = Boolean(key.fromMe || data?.fromMe);
  const message = data?.message || data?.messages?.[0]?.message || data;
  const text =
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.text ||
    data?.text ||
    data?.body ||
    "";
  return { instanceName, remoteJid, fromMe, text: String(text || "").trim() };
}

export async function processEvolutionWebhook(payload) {
  const event = String(payload?.event || payload?.type || "").toUpperCase();
  const { instanceName, remoteJid, fromMe, text } = extractWebhookMessage(payload);
  if (!instanceName) return { ignored: true, reason: "missing_instance" };

  const session = await getSessionByInstance(instanceName);
  if (!session) return { ignored: true, reason: "unknown_instance" };

  if (event.includes("CONNECTION")) {
    const state = payload?.data?.state || payload?.state;
    const status = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
    await query("UPDATE whatsapp_sessions SET status = $1, updated_at = NOW() WHERE instance_name = $2", [status, instanceName]);
    return { updated: true, status };
  }

  if (event.includes("QRCODE")) {
    const qr = payload?.data?.qrcode?.base64 || payload?.data?.base64 || payload?.base64 || null;
    await query("UPDATE whatsapp_sessions SET status = 'qr_ready', qr_code = $1, updated_at = NOW() WHERE instance_name = $2", [qr, instanceName]);
    return { updated: true, status: "qr_ready" };
  }

  if (fromMe || !remoteJid || text.length < 2) return { ignored: true };

  const recent = await query(
    `SELECT 1 FROM agent_messages
     WHERE user_id = $1 AND direction = 'incoming' AND channel = 'whatsapp'
       AND metadata->>'remoteJid' = $2 AND content = $3 AND created_at > NOW() - INTERVAL '2 minutes'
     LIMIT 1`,
    [session.userId, remoteJid, text],
  );
  if (recent.rowCount) return { duplicate: true };

  const profile = await query("SELECT onboarding_data FROM agent_config WHERE user_id = $1", [session.userId]);
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'incoming', 'whatsapp', $2, $3::jsonb)`,
    [session.userId, text, JSON.stringify({ remoteJid, instanceName })],
  );

  const answer = await answerWithKnowledge(session.userId, text, profile.rows[0]?.onboarding_data || {});
  await sendWhatsAppText(instanceName, remoteJid, answer.answer);
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
    [session.userId, answer.answer, JSON.stringify({ remoteJid, instanceName, model: answer.model, fallback: answer.fallback })],
  );
  return { replied: true };
}

export async function sendWhatsAppText(instanceName, to, text) {
  const number = cleanNumber(to);
  if (!number) throw apiError(400, "Numero WhatsApp non valido.");
  return evolutionFetch("/message/sendText/" + encodeURIComponent(instanceName), {
    method: "POST",
    body: JSON.stringify({
      number,
      options: { delay: 900, presence: "composing" },
      textMessage: { text: String(text).slice(0, 3500) },
    }),
  });
}

export function newWebhookToken() {
  return crypto.randomBytes(24).toString("hex");
}
