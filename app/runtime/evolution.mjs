import crypto from "node:crypto";
import { apiError } from "./auth.mjs";
import { query } from "./db.mjs";
import { answerWithKnowledge } from "./assistant.mjs";
import { handleBookingMessage } from "./booking.mjs";
import { handleCoachMessage } from "./coach.mjs";
import { consumeTokens, estimateTokens } from "./credits.mjs";
import { handleDriveMessage } from "./drive-actions.mjs";
import { synthesizeSpeech, transcribeAudio } from "./speech.mjs";
import { createCreditCheckout } from "./stripe.mjs";
import { handleTravelImageMessage, handleTravelMessage } from "./travel.mjs";
import { handleTriageMessage } from "./triage.mjs";
import { handleVideoRecapFile, handleVideoRecapMessage } from "./video-recap.mjs";
import { getUserByWhatsAppNumber } from "./whatsapp-numbers.mjs";

const AUDIO_REQUEST_PATTERN = /\b(rispondimi (in|con) (un )?audio|mandami (un |una nota )?audio|un vocale|in vocale|con la voce|rispondi (a |in )?voce|nota vocale|messaggio vocale)\b/i;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertWhatsAppRateLimit(remoteJid) {
  const recent = await query(
    `SELECT COUNT(*)::int AS count
     FROM agent_messages
     WHERE channel = 'whatsapp' AND direction = 'incoming'
       AND metadata->>'remoteJid' = $1
       AND created_at > NOW() - INTERVAL '1 minute'`,
    [remoteJid],
  );
  if ((recent.rows[0]?.count || 0) > Number(process.env.WHATSAPP_MAX_MSG_PER_MINUTE || 10)) {
    throw apiError(429, "Troppi messaggi WhatsApp in poco tempo.", "whatsapp_rate_limited");
  }
}

// Messaggi da numeri non riconosciuti, account inattivi o onboarding incompleto non finiscono mai in
// agent_messages, quindi il rate limit sopra (basato su DB) non li vede: senza questo contatore in
// memoria un numero che scrive ripetutamente riceverebbe una risposta automatica ogni volta.
const AUTO_REPLY_LIMIT = Number(process.env.WHATSAPP_AUTO_REPLY_LIMIT || 3);
const AUTO_REPLY_WINDOW_MS = Number(process.env.WHATSAPP_AUTO_REPLY_WINDOW_MS || 10 * 60_000);
const autoReplyCounters = new Map();

function autoReplyAllowed(remoteJid) {
  const now = Date.now();
  const entry = autoReplyCounters.get(remoteJid);
  if (!entry || now > entry.resetAt) {
    autoReplyCounters.set(remoteJid, { count: 1, resetAt: now + AUTO_REPLY_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= AUTO_REPLY_LIMIT;
}

async function evolutionFetch(pathname, options = {}) {
  let res;
  try {
    res = await fetch(EVOLUTION_URL + pathname, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
      signal: AbortSignal.timeout(Number(process.env.EVOLUTION_TIMEOUT_MS || 10000)),
    });
  } catch (error) {
    const message = error?.name === "TimeoutError"
      ? "Timeout collegando Evolution API."
      : "Evolution API non raggiungibile dal container app.";
    const wrapped = apiError(503, `${message} Verifica che il container evolution sia attivo e raggiungibile su ${EVOLUTION_URL}.`, "evolution_unreachable");
    wrapped.detail = { url: EVOLUTION_URL + pathname, cause: error?.message || String(error) };
    throw wrapped;
  }
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
     FROM whatsapp_sessions WHERE user_id = $1 AND purpose = 'platform_main'`,
    [user.id],
  );
  let instanceName = existing.rows[0]?.instance_name || safeInstanceName(user.id);

  await query(
    `INSERT INTO whatsapp_sessions (user_id, instance_name, status, purpose, updated_at)
     VALUES ($1, $2, 'provisioning', 'platform_main', NOW())
     ON CONFLICT (user_id) DO UPDATE SET status = 'provisioning', purpose = 'platform_main', updated_at = NOW()`,
    [user.id, instanceName],
  );

  try {
    await evolutionFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    }).catch((error) => {
      if (![400, 409, 403].includes(Number(error.status))) throw error;
    });

    const webhookUrl = origin.replace(/\/+$/, "") + "/api/evolution/webhook?apikey=" + encodeURIComponent(evolutionKey());
    let webhookError = null;
    await evolutionFetch("/webhook/set/" + encodeURIComponent(instanceName), {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    }).catch((error) => {
      webhookError = "Registrazione webhook non riuscita: " + (error.message || "errore sconosciuto");
      console.error("[evolution] webhook/set failed", instanceName, error?.detail || error);
    });

    if (!webhookError) {
      const saved = await evolutionFetch("/webhook/find/" + encodeURIComponent(instanceName)).catch((error) => {
        console.error("[evolution] webhook/find failed", instanceName, error?.detail || error);
        return null;
      });
      const savedWebhook = saved?.webhook || saved;
      if (!savedWebhook?.enabled || !String(savedWebhook?.url || "").includes("/api/evolution/webhook")) {
        webhookError = "Il webhook risulta non attivo o con URL diverso su Evolution dopo la registrazione. Verifica la versione dell'API.";
        console.error("[evolution] webhook/find mismatch", instanceName, saved);
      }
    }

    const qr = await fetchQr(instanceName).catch(() => null);
    await query(
      `UPDATE whatsapp_sessions
       SET status = $1, qr_code = $2, last_error = $3, updated_at = NOW()
       WHERE user_id = $4`,
      [qr?.base64 ? "qr_ready" : "provisioned", qr?.base64 || qr?.code || null, webhookError, user.id],
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

export async function disconnectWhatsAppSession(userId) {
  const session = await getSessionByUser(userId);
  if (!session?.instanceName) throw apiError(404, "Nessuna sessione WhatsApp da disconnettere.");
  await evolutionFetch("/instance/logout/" + encodeURIComponent(session.instanceName), { method: "DELETE" }).catch((error) => {
    if (![400, 404].includes(Number(error.status))) throw error;
  });
  await query(
    `UPDATE whatsapp_sessions SET status = 'disconnected', qr_code = NULL, last_error = NULL, updated_at = NOW() WHERE user_id = $1`,
    [userId],
  );
  return getWhatsAppStatus(userId);
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
     FROM whatsapp_sessions WHERE user_id = $1 AND purpose = 'platform_main'`,
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
  if (provided !== configured) {
    console.warn("[evolution] webhook rifiutato: apikey mancante o errata", { hasHeader: Boolean(request.headers.apikey || request.headers["x-api-key"]), hasQuery: url.searchParams.has("apikey") });
    throw apiError(401, "Webhook Evolution non autorizzato.");
  }
}

function extractWebhookMessage(payload) {
  const data = payload?.data || payload;
  const instanceName = payload?.instance || data?.instance || data?.instanceName || payload?.instanceName;
  const key = data?.key || data?.message?.key || {};
  const remoteJid = key.remoteJid || data?.remoteJid || data?.from || data?.sender;
  const fromMe = Boolean(key.fromMe || data?.fromMe);
  // I messaggi effimeri (chat con "messaggi a tempo") avvolgono il contenuto reale in ephemeralMessage.message.
  let message = data?.message || data?.messages?.[0]?.message || data;
  message = message?.ephemeralMessage?.message || message;
  const text =
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.text ||
    data?.text ||
    data?.body ||
    "";
  return {
    instanceName,
    remoteJid,
    fromMe,
    messageId: key.id || null,
    audioMessage: message?.audioMessage || null,
    imageMessage: message?.imageMessage || message?.documentMessage || null,
    videoMessage: message?.videoMessage || null,
    text: String(text || "").trim(),
  };
}

export async function processEvolutionWebhook(payload) {
  const event = String(payload?.event || payload?.type || "").toUpperCase();
  const { instanceName, remoteJid, fromMe, messageId, audioMessage, imageMessage, videoMessage, text } = extractWebhookMessage(payload);
  console.info("[evolution] webhook ricevuto", { event, instanceName, remoteJid, fromMe, hasAudio: Boolean(audioMessage), hasImage: Boolean(imageMessage), hasVideo: Boolean(videoMessage), textLength: text.length });

  try {
    return await handleEvolutionWebhook({ event, instanceName, remoteJid, fromMe, messageId, audioMessage, imageMessage, videoMessage, text, payload });
  } catch (error) {
    console.error("[evolution] ERRORE non gestito nel webhook", {
      instanceName,
      remoteJid,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack,
    });
    throw error;
  }
}

async function handleEvolutionWebhook({ event, instanceName, remoteJid, fromMe, messageId, audioMessage, imageMessage, videoMessage, text, payload }) {
  if (!instanceName) {
    console.warn("[evolution] webhook ignorato: instance mancante nel payload", { event, keys: Object.keys(payload || {}) });
    return { ignored: true, reason: "missing_instance" };
  }

  const session = await getSessionByInstance(instanceName);
  if (!session) {
    console.warn("[evolution] webhook ignorato: nessuna sessione per questa instance", { instanceName });
    return { ignored: true, reason: "unknown_instance" };
  }

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

  if (fromMe || !remoteJid || (!audioMessage && !imageMessage && !videoMessage && text.length < 2)) {
    console.info("[evolution] webhook ignorato: non è un messaggio testuale, vocale, immagine o video valido", { event, fromMe, hasRemoteJid: Boolean(remoteJid), hasAudio: Boolean(audioMessage), hasImage: Boolean(imageMessage), hasVideo: Boolean(videoMessage), textLength: text.length });
    return { ignored: true };
  }

  try {
    await assertWhatsAppRateLimit(remoteJid);
  } catch (error) {
    console.warn("[evolution] webhook ignorato: rate limit superato per questo numero", { remoteJid: cleanNumber(remoteJid), message: error?.message });
    throw error;
  }

  console.info("[evolution] cerco utente registrato per numero", { remoteJid: cleanNumber(remoteJid) });
  const user = await getUserByWhatsAppNumber(remoteJid);
  console.info("[evolution] esito ricerca utente", { found: Boolean(user), userId: user?.id, status: user?.status });
  if (!user) {
    console.warn("[evolution] mittente non riconosciuto: nessun utente con questo numero registrato", { remoteJid: cleanNumber(remoteJid) });
    if (autoReplyAllowed(remoteJid)) {
      await sendWhatsAppText(
        instanceName,
        remoteJid,
        "Ciao! Questo è il numero del tuo assistente artificiale personale, riservato a chi lo ha attivato e ai numeri autorizzati sul suo account. Se sei tu il titolare, accedi alla piattaforma e aggiungi questo numero tra i tuoi \"Numeri WhatsApp\".",
      );
    }
    return { ignored: true, reason: "unknown_sender" };
  }
  if (user.status !== "active") {
    console.warn("[evolution] mittente riconosciuto ma account non attivo", { userId: user.id, status: user.status });
    if (autoReplyAllowed(remoteJid)) {
      await sendWhatsAppText(instanceName, remoteJid, "Il tuo account non è attivo. Accedi alla piattaforma per completare piano e pagamento.");
    }
    return { ignored: true, reason: "inactive_user" };
  }
  if (!user.onboarding_completed_at) {
    console.warn("[evolution] mittente riconosciuto ma onboarding incompleto", { userId: user.id });
    if (autoReplyAllowed(remoteJid)) {
      await sendWhatsAppText(instanceName, remoteJid, "Il tuo bot non è ancora pronto. Completa profilo e knowledge base nella dashboard.");
    }
    return { ignored: true, reason: "onboarding_incomplete" };
  }

  if (imageMessage && !text) {
    console.info("[evolution] immagine/documento ricevuto", { userId: user.id, mimetype: imageMessage.mimetype });
    const travelReply = await downloadEvolutionMedia(instanceName, messageId)
      .then((buffer) => handleTravelImageMessage(user, buffer, imageMessage.mimetype, { channel: "whatsapp", channelRef: remoteJid }))
      .catch((error) => {
        console.error("[evolution] errore elaborazione immagine per travel planner", user.id, error?.message || error);
        return null;
      });
    if (travelReply) {
      await sendAssistantReply(instanceName, remoteJid, travelReply, { requestText: text });
      await query(
        `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
         VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
        [user.id, travelReply, JSON.stringify({ remoteJid, instanceName, source: "travel_planner" })],
      );
      return { replied: true, reason: "travel_planner_image" };
    }
    return { ignored: true, reason: "image_no_active_flow" };
  }

  if (videoMessage && !text) {
    console.info("[evolution] video ricevuto", { userId: user.id, mimetype: videoMessage.mimetype, seconds: videoMessage.seconds });
    const recapReply = await downloadEvolutionMedia(instanceName, messageId)
      .then((buffer) => handleVideoRecapFile(user, buffer, videoMessage.mimetype, { channel: "whatsapp", channelRef: remoteJid }))
      .catch((error) => {
        console.error("[evolution] errore elaborazione video per recap", user.id, error?.message || error);
        return null;
      });
    if (recapReply) {
      await sendWhatsAppText(instanceName, remoteJid, recapReply);
      await query(
        `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
         VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
        [user.id, recapReply, JSON.stringify({ remoteJid, instanceName, source: "video_recap" })],
      );
      return { replied: true, reason: "video_recap" };
    }
    return { ignored: true, reason: "video_no_active_flow" };
  }

  if (audioMessage && !text) {
    console.info("[evolution] messaggio vocale ricevuto, avvio trascrizione locale", { userId: user.id, seconds: audioMessage.seconds });
    try {
      const audioBuffer = await downloadEvolutionMedia(instanceName, messageId);
      text = await transcribeAudio(audioBuffer);
    } catch (error) {
      console.error("[evolution] trascrizione audio fallita", user.id, error?.message || error, error?.detail);
      if (autoReplyAllowed(remoteJid)) {
        await sendWhatsAppText(instanceName, remoteJid, "Non sono riuscito a capire il messaggio vocale. Puoi riscrivermelo in testo?");
      }
      return { ignored: true, reason: "audio_transcription_failed" };
    }
    if (text.length < 2) {
      console.warn("[evolution] trascrizione audio vuota", { userId: user.id });
      if (autoReplyAllowed(remoteJid)) {
        await sendWhatsAppText(instanceName, remoteJid, "Non sono riuscito a capire il messaggio vocale. Puoi riscrivermelo in testo?");
      }
      return { ignored: true, reason: "audio_empty_transcription" };
    }
    console.info("[evolution] messaggio vocale trascritto", { userId: user.id, textLength: text.length });
  }

  const recent = await query(
    `SELECT 1 FROM agent_messages
     WHERE user_id = $1 AND direction = 'incoming' AND channel = 'whatsapp'
       AND metadata->>'remoteJid' = $2 AND content = $3 AND created_at > NOW() - INTERVAL '2 minutes'
     LIMIT 1`,
    [user.id, remoteJid, text],
  );
  if (recent.rowCount) {
    console.info("[evolution] webhook ignorato: messaggio duplicato ricevuto due volte da Evolution", { userId: user.id });
    return { duplicate: true };
  }

  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'incoming', 'whatsapp', $2, $3::jsonb)`,
    [user.id, text, JSON.stringify({ remoteJid, instanceName })],
  );

  const videoRecapReply = await handleVideoRecapMessage(user, text, { channel: "whatsapp", channelRef: remoteJid }).catch((error) => {
    console.error("[evolution] errore nel flusso recap video", user.id, error?.message || error);
    return null;
  });
  if (videoRecapReply) {
    const replyText = typeof videoRecapReply === "string" ? videoRecapReply : videoRecapReply.text;
    await sendWhatsAppText(instanceName, remoteJid, replyText);
    if (typeof videoRecapReply === "object" && videoRecapReply.audioText) {
      try {
        const audioBuffer = await synthesizeSpeech(videoRecapReply.audioText);
        await sendWhatsAppAudio(instanceName, remoteJid, audioBuffer);
      } catch (error) {
        console.error("[evolution] mini-audio recap video fallito", user.id, error?.message || error);
      }
    }
    await query(
      `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
       VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
      [user.id, replyText, JSON.stringify({ remoteJid, instanceName, source: "video_recap" })],
    );
    console.info("[evolution] risposta recap video inviata", { userId: user.id });
    return { replied: true, reason: "video_recap" };
  }

  const coachReply = await handleCoachMessage(user, text, { channel: "whatsapp", channelRef: remoteJid }).catch((error) => {
    console.error("[evolution] errore nel flusso coach obiettivi", user.id, error?.message || error);
    return null;
  });
  if (coachReply) {
    await sendAssistantReply(instanceName, remoteJid, coachReply, { requestText: text });
    await query(
      `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
       VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
      [user.id, coachReply, JSON.stringify({ remoteJid, instanceName, source: "coach" })],
    );
    console.info("[evolution] risposta coach obiettivi inviata", { userId: user.id });
    return { replied: true, reason: "coach" };
  }

  const travelReplyText = await handleTravelMessage(user, text, { channel: "whatsapp", channelRef: remoteJid }).catch((error) => {
    console.error("[evolution] errore nel flusso travel planner", user.id, error?.message || error);
    return null;
  });
  if (travelReplyText) {
    await sendAssistantReply(instanceName, remoteJid, travelReplyText, { requestText: text });
    await query(
      `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
       VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
      [user.id, travelReplyText, JSON.stringify({ remoteJid, instanceName, source: "travel_planner" })],
    );
    console.info("[evolution] risposta travel planner inviata", { userId: user.id });
    return { replied: true, reason: "travel_planner" };
  }

  const triageReply = await handleTriageMessage(user, text, { channel: "whatsapp", channelRef: remoteJid }).catch((error) => {
    console.error("[evolution] errore nel flusso triage posta", user.id, error?.message || error);
    return null;
  });
  if (triageReply) {
    await sendAssistantReply(instanceName, remoteJid, triageReply, { requestText: text });
    await query(
      `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
       VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
      [user.id, triageReply, JSON.stringify({ remoteJid, instanceName, source: "triage" })],
    );
    console.info("[evolution] risposta triage posta inviata", { userId: user.id });
    return { replied: true, reason: "triage" };
  }

  const bookingReply = await handleBookingMessage(user, text, { channel: "whatsapp", channelRef: remoteJid }).catch((error) => {
    console.error("[evolution] errore nel flusso prenotazione", user.id, error?.message || error);
    return null;
  });
  if (bookingReply) {
    await sendAssistantReply(instanceName, remoteJid, bookingReply, { requestText: text });
    await query(
      `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
       VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
      [user.id, bookingReply, JSON.stringify({ remoteJid, instanceName, source: "calendar_booking" })],
    );
    console.info("[evolution] risposta prenotazione inviata", { userId: user.id });
    return { replied: true, reason: "calendar_booking" };
  }

  const driveReply = await handleDriveMessage(user, text, { channel: "whatsapp", channelRef: remoteJid }).catch((error) => {
    console.error("[evolution] errore nel flusso Google Drive", user.id, error?.message || error);
    return null;
  });
  if (driveReply) {
    await sendAssistantReply(instanceName, remoteJid, driveReply, { requestText: text });
    await query(
      `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
       VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
      [user.id, driveReply, JSON.stringify({ remoteJid, instanceName, source: "google_drive" })],
    );
    console.info("[evolution] risposta Google Drive inviata", { userId: user.id });
    return { replied: true, reason: "google_drive" };
  }

  const profile = await query("SELECT onboarding_data FROM agent_config WHERE user_id = $1", [user.id]);
  let answer;
  try {
    await consumeTokens(user.id, estimateTokens(text), "whatsapp_input", { remoteJid, instanceName });
    answer = await answerWithKnowledge(user.id, text, profile.rows[0]?.onboarding_data || {}, {
      channel: "whatsapp",
      channelRef: remoteJid,
      enableTools: true,
    });
    await consumeTokens(user.id, estimateTokens(answer.answer), "whatsapp_output", { remoteJid, instanceName, model: answer.model });
  } catch (error) {
    if (error?.code !== "token_balance_empty") throw error;
    const origin = (process.env.APP_URL || "https://app.personaleartificiale.it").replace(/\/+$/, "");
    const checkout = await createCreditCheckout({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        stripeCustomerId: user.stripe_customer_id,
      },
      packId: process.env.WHATSAPP_DEFAULT_CREDIT_PACK || "crediti-100k",
      origin,
    });
    const recharge = `Hai terminato i crediti token del tuo bot. Puoi acquistare un pacchetto sicuro con Stripe qui:\n${checkout.url}\n\nDopo il pagamento i crediti vengono accreditati automaticamente.`;
    await sendWhatsAppText(instanceName, remoteJid, recharge);
    return { replied: true, reason: "credits_checkout_sent" };
  }
  await sendAssistantReply(instanceName, remoteJid, answer.answer, { requestText: text });
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'outgoing', 'whatsapp', $2, $3::jsonb)`,
    [user.id, answer.answer, JSON.stringify({ remoteJid, instanceName, model: answer.model, fallback: answer.fallback })],
  );
  console.info("[evolution] risposta inviata con successo", { userId: user.id, model: answer.model, fallback: answer.fallback });
  return { replied: true };
}

export async function sendWhatsAppText(instanceName, to, text) {
  const number = cleanNumber(to);
  if (!number) throw apiError(400, "Numero WhatsApp non valido.");
  const cleanText = String(text).slice(0, 3500);
  // Attesa prima di chiamare Evolution: rende il ritmo delle risposte meno istantaneo/robotico.
  const minDelay = Number(process.env.WHATSAPP_SEND_DELAY_MIN_MS || 2500);
  const maxDelay = Number(process.env.WHATSAPP_SEND_DELAY_MAX_MS || 7000);
  await sleep(Math.max(0, minDelay + Math.random() * Math.max(0, maxDelay - minDelay)));
  // "delay" lato Evolution simula l'indicatore "sta scrivendo…"; lo scaliamo con la lunghezza del testo.
  const typingDelay = Math.min(6000, Math.max(1200, cleanText.length * 30));
  return evolutionFetch("/message/sendText/" + encodeURIComponent(instanceName), {
    method: "POST",
    body: JSON.stringify({
      number,
      text: cleanText,
      delay: typingDelay,
    }),
  });
}

export async function sendWhatsAppAudio(instanceName, to, audioBuffer) {
  const number = cleanNumber(to);
  if (!number) throw apiError(400, "Numero WhatsApp non valido.");
  const minDelay = Number(process.env.WHATSAPP_SEND_DELAY_MIN_MS || 2500);
  const maxDelay = Number(process.env.WHATSAPP_SEND_DELAY_MAX_MS || 7000);
  await sleep(Math.max(0, minDelay + Math.random() * Math.max(0, maxDelay - minDelay)));
  return evolutionFetch("/message/sendWhatsAppAudio/" + encodeURIComponent(instanceName), {
    method: "POST",
    body: JSON.stringify({
      number,
      audio: audioBuffer.toString("base64"),
      encoding: true,
      delay: 1200,
    }),
  });
}

export async function sendWhatsAppDocument(instanceName, to, { buffer, fileName, mimetype, caption, mediatype = "document" }) {
  const number = cleanNumber(to);
  if (!number) throw apiError(400, "Numero WhatsApp non valido.");
  return evolutionFetch("/message/sendMedia/" + encodeURIComponent(instanceName), {
    method: "POST",
    body: JSON.stringify({
      number,
      mediatype,
      mimetype,
      fileName,
      caption: caption || undefined,
      media: buffer.toString("base64"),
    }),
  });
}

export async function instanceNameForUser(userId) {
  const session = await getSessionByUser(userId);
  return session?.instanceName || null;
}

// Invia la risposta come nota vocale solo se il cliente l'ha chiesto esplicitamente in questo messaggio;
// se la sintesi/l'invio audio falliscono, torna sempre al testo. Regola non negoziabile: mai chiamata
// per messaggi di errore/limite (quei punti del codice usano sempre sendWhatsAppText direttamente).
async function sendAssistantReply(instanceName, remoteJid, replyText, { requestText = "" } = {}) {
  if (AUDIO_REQUEST_PATTERN.test(requestText)) {
    try {
      const audioBuffer = await synthesizeSpeech(replyText);
      await sendWhatsAppAudio(instanceName, remoteJid, audioBuffer);
      return;
    } catch (error) {
      console.error("[evolution] sintesi/invio vocale falliti, rispondo in testo", error?.message || error, error?.detail);
    }
  }
  await sendWhatsAppText(instanceName, remoteJid, replyText);
}

async function downloadEvolutionMedia(instanceName, messageId) {
  if (!messageId) throw apiError(400, "Messaggio senza identificativo.", "evolution_media_no_id");
  const payload = await evolutionFetch("/chat/getBase64FromMediaMessage/" + encodeURIComponent(instanceName), {
    method: "POST",
    body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
  });
  const base64 = payload?.base64 || payload?.data || payload?.media || payload?.buffer;
  if (!base64) {
    console.error("[evolution] risposta getBase64FromMediaMessage senza contenuto riconoscibile", {
      instanceName,
      keys: Object.keys(payload || {}),
    });
    throw apiError(502, "Download del media non riuscito.", "evolution_media_download_error");
  }
  return Buffer.from(base64, "base64");
}

export function newWebhookToken() {
  return crypto.randomBytes(24).toString("hex");
}
