import { simpleParser } from "mailparser";
import { apiError } from "./auth.mjs";
import { query } from "./db.mjs";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  googleClientConfig,
  refreshGoogleToken,
  revokeGoogleToken,
  verifyGoogleState,
} from "./google-oauth.mjs";
import { assertIntegrationSlot } from "./integration-quota.mjs";
import { encryptSecret, decryptSecret } from "./secrets.mjs";
import { answerWithKnowledge } from "./assistant.mjs";
import { consumeTokens, estimateTokens } from "./credits.mjs";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const SCOPE = "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send";
const REDIRECT_PATH = "/api/integrations/gmail/callback";
const MAX_MESSAGES_PER_POLL = Number(process.env.EMAIL_MAX_MESSAGES_PER_POLL || 10);

export function gmailAuthUrl(userId) {
  const { clientId, redirectUri } = googleClientConfig(REDIRECT_PATH);
  return buildGoogleAuthUrl({ clientId, redirectUri, scope: SCOPE, userId });
}

async function loadIntegration(userId) {
  const result = await query(`SELECT * FROM integrations WHERE user_id = $1 AND provider = 'gmail'`, [userId]);
  return result.rows[0] || null;
}

async function gmailFetch(accessToken, pathname, options = {}) {
  const response = await fetch(GMAIL_API + pathname, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(Number(process.env.GOOGLE_TIMEOUT_MS || 10000)),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const error = apiError(response.status, payload?.error?.message || "Gmail non disponibile.", "gmail_error");
    error.detail = payload;
    throw error;
  }
  return payload;
}

async function storeTokens(userId, { accessToken, refreshToken, expiresIn }) {
  const existing = await loadIntegration(userId);
  const previousSecrets = existing?.secrets || {};
  const secrets = {
    accessToken: encryptSecret(accessToken),
    refreshToken: refreshToken ? encryptSecret(refreshToken) : previousSecrets.refreshToken,
    expiresAt: Date.now() + Math.max(0, (Number(expiresIn) || 3600) - 60) * 1000,
  };
  if (!secrets.refreshToken) {
    throw apiError(
      400,
      "Google non ha fornito un accesso persistente. Vai su https://myaccount.google.com/permissions, rimuovi l'accesso a Personale Artificiale e riprova a collegare Gmail.",
    );
  }
  const profile = await gmailFetch(accessToken, "/users/me/profile").catch(() => null);
  const settings = { emailAddress: profile?.emailAddress || null };
  await query(
    `INSERT INTO integrations (user_id, provider, status, secrets, settings, last_error, updated_at)
     VALUES ($1, 'gmail', 'connected', $2::jsonb, $3::jsonb, NULL, NOW())
     ON CONFLICT (user_id, provider) DO UPDATE SET
       status = 'connected', secrets = $2::jsonb, settings = $3::jsonb, last_error = NULL, updated_at = NOW()`,
    [userId, JSON.stringify(secrets), JSON.stringify(settings)],
  );
}

export async function handleGmailCallback(code, state) {
  const userId = verifyGoogleState(state);
  await assertIntegrationSlot(userId, "gmail");
  const { clientId, clientSecret, redirectUri } = googleClientConfig(REDIRECT_PATH);
  const payload = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri });
  await storeTokens(userId, { accessToken: payload.access_token, refreshToken: payload.refresh_token, expiresIn: payload.expires_in });
  return userId;
}

async function refreshAccessToken(userId, row) {
  const { clientId, clientSecret } = googleClientConfig(REDIRECT_PATH);
  const refreshToken = decryptSecret(row.secrets?.refreshToken);
  let payload;
  try {
    payload = await refreshGoogleToken({ clientId, clientSecret, refreshToken });
  } catch (error) {
    await query(
      `UPDATE integrations SET status = 'error', last_error = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'gmail'`,
      [(error.message || "Rinnovo del collegamento Gmail non riuscito.").slice(0, 500), userId],
    );
    throw apiError(401, "Il collegamento a Gmail è scaduto. Ricollegalo dalle integrazioni.", "google_reauth_required");
  }
  const secrets = {
    ...row.secrets,
    accessToken: encryptSecret(payload.access_token),
    expiresAt: Date.now() + Math.max(0, (Number(payload.expires_in) || 3600) - 60) * 1000,
  };
  await query(
    `UPDATE integrations SET secrets = $1::jsonb, status = 'connected', last_error = NULL, updated_at = NOW() WHERE user_id = $2 AND provider = 'gmail'`,
    [JSON.stringify(secrets), userId],
  );
  return payload.access_token;
}

async function getValidAccessToken(userId, row) {
  const expiresAt = Number(row.secrets?.expiresAt || 0);
  if (expiresAt > Date.now() + 30_000) return decryptSecret(row.secrets.accessToken);
  return refreshAccessToken(userId, row);
}

export async function getGmailStatus(userId) {
  const row = await loadIntegration(userId);
  if (!row) return { status: "disconnected" };
  return {
    status: row.status,
    lastError: row.last_error,
    emailAddress: row.settings?.emailAddress || null,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function disconnectGmail(userId) {
  const row = await loadIntegration(userId);
  if (row?.secrets?.accessToken) {
    await revokeGoogleToken(decryptSecret(row.secrets.accessToken));
  }
  await query(`DELETE FROM integrations WHERE user_id = $1 AND provider = 'gmail'`, [userId]);
}

function buildRawEmail({ from, to, subject, body, inReplyTo }) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject || "", "utf8").toString("base64")}?=`;
  const bodyBase64 = Buffer.from(body || "", "utf8").toString("base64");
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    inReplyTo ? `References: ${inReplyTo}` : null,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean).join("\r\n");
  return Buffer.from(`${headers}\r\n\r\n${bodyBase64}`, "utf8").toString("base64url");
}

export async function sendGmailReply(userId, { to, subject, body, inReplyTo }) {
  const row = await loadIntegration(userId);
  if (!row || row.status !== "connected") throw apiError(409, "Nessun account Gmail collegato.");
  const accessToken = await getValidAccessToken(userId, row);
  const raw = buildRawEmail({ from: row.settings?.emailAddress, to, subject, body, inReplyTo });
  await gmailFetch(accessToken, "/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}

async function handleIncomingGmailMessage(userId, { fromAddress, subject, bodyText, messageId }) {
  const profile = await query("SELECT onboarding_data FROM agent_config WHERE user_id = $1", [userId]);
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'incoming', 'email', $2, $3::jsonb)`,
    [userId, bodyText, JSON.stringify({ fromAddress, subject, messageId, provider: "gmail" })],
  );

  let answer;
  try {
    await consumeTokens(userId, estimateTokens(bodyText), "email_input", { fromAddress, provider: "gmail" });
    answer = await answerWithKnowledge(userId, bodyText, profile.rows[0]?.onboarding_data || {});
    await consumeTokens(userId, estimateTokens(answer.answer), "email_output", { fromAddress, provider: "gmail", model: answer.model });
  } catch (error) {
    console.warn("[gmail] impossibile generare una bozza di risposta", userId, error?.message || error);
    return;
  }

  const replySubject = /^re:/i.test(subject || "") ? subject : `Re: ${subject || "la tua richiesta"}`;
  await query(
    `INSERT INTO email_drafts (user_id, to_address, subject, body, original_snippet, in_reply_to, provider)
     VALUES ($1, $2, $3, $4, $5, $6, 'gmail')`,
    [userId, fromAddress, replySubject, answer.answer, bodyText.slice(0, 500), messageId || null],
  );
  console.info("[gmail] bozza di risposta creata", { userId, fromAddress });
}

async function pollAccount(row) {
  try {
    const accessToken = await getValidAccessToken(row.user_id, row);
    const list = await gmailFetch(accessToken, `/users/me/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=${MAX_MESSAGES_PER_POLL}`);
    const messages = list?.messages || [];
    for (const item of messages) {
      const full = await gmailFetch(accessToken, `/users/me/messages/${item.id}?format=raw`).catch((error) => {
        console.error("[gmail] impossibile leggere il messaggio", row.user_id, item.id, error?.message || error);
        return null;
      });
      if (!full?.raw) continue;
      const buffer = Buffer.from(full.raw, "base64url");
      const parsed = await simpleParser(buffer);
      const fromAddress = parsed.from?.value?.[0]?.address;
      const bodyText = String(parsed.text || "").trim().slice(0, 4000);
      if (fromAddress && bodyText.length >= 2) {
        await handleIncomingGmailMessage(row.user_id, {
          fromAddress,
          subject: parsed.subject || "",
          bodyText,
          messageId: parsed.messageId,
        }).catch((error) => console.error("[gmail] errore elaborazione messaggio", row.user_id, error?.message || error));
      }
      await gmailFetch(accessToken, `/users/me/messages/${item.id}/modify`, {
        method: "POST",
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      }).catch(() => {});
    }
    await query(`UPDATE integrations SET last_synced_at = NOW(), status = 'connected', last_error = NULL, updated_at = NOW() WHERE id = $1`, [row.id]);
  } catch (error) {
    console.error("[gmail] sincronizzazione fallita", row.user_id, error?.message || error);
    await query(`UPDATE integrations SET status = 'error', last_error = $1, updated_at = NOW() WHERE id = $2`, [(error?.message || "Errore sincronizzazione Gmail").slice(0, 500), row.id]);
  }
}

export async function pollGmailAccounts() {
  const result = await query(`SELECT * FROM integrations WHERE provider = 'gmail' AND status IN ('connected', 'error')`);
  for (const row of result.rows) {
    await pollAccount(row);
  }
}
