import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { apiError } from "./auth.mjs";
import { query } from "./db.mjs";
import { assertIntegrationSlot } from "./integration-quota.mjs";
import { encryptSecret, decryptSecret } from "./secrets.mjs";
import { answerWithKnowledge } from "./assistant.mjs";
import { consumeTokens, estimateTokens } from "./credits.mjs";

const POLL_TIMEOUT_MS = Number(process.env.EMAIL_POLL_TIMEOUT_MS || 20000);
const MAX_MESSAGES_PER_POLL = Number(process.env.EMAIL_MAX_MESSAGES_PER_POLL || 10);

async function loadIntegration(userId) {
  const result = await query(`SELECT * FROM integrations WHERE user_id = $1 AND provider = 'email_imap'`, [userId]);
  return result.rows[0] || null;
}

export async function getEmailStatus(userId) {
  const row = await loadIntegration(userId);
  if (!row) return { status: "disconnected" };
  return {
    status: row.status,
    lastError: row.last_error,
    emailAddress: row.settings?.emailAddress || null,
    lastSyncedAt: row.last_synced_at,
  };
}

function buildImapConfig(settings, password) {
  return {
    host: settings.imapHost,
    port: Number(settings.imapPort),
    secure: Boolean(settings.imapSecure),
    auth: { user: settings.emailAddress, pass: password },
    logger: false,
    socketTimeout: POLL_TIMEOUT_MS,
  };
}

function buildSmtpTransport(settings, password) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: Number(settings.smtpPort),
    secure: Boolean(settings.smtpSecure),
    auth: { user: settings.emailAddress, pass: password },
  });
}

function cleanSettings(input) {
  const emailAddress = String(input?.emailAddress || "").trim().toLowerCase();
  const imapHost = String(input?.imapHost || "").trim();
  const smtpHost = String(input?.smtpHost || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) throw apiError(400, "Inserisci un indirizzo email valido.");
  if (!imapHost || !smtpHost) throw apiError(400, "Compila host IMAP e host SMTP.");
  return {
    emailAddress,
    imapHost,
    imapPort: Number(input?.imapPort) || 993,
    imapSecure: input?.imapSecure !== false,
    smtpHost,
    smtpPort: Number(input?.smtpPort) || 465,
    smtpSecure: input?.smtpSecure !== false,
  };
}

export async function connectEmailAccount(userId, input) {
  await assertIntegrationSlot(userId, "email_imap");
  const settings = cleanSettings(input);
  const password = String(input?.password || "");
  if (!password) throw apiError(400, "Password (o app-password) mancante.");

  const client = new ImapFlow(buildImapConfig(settings, password));
  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
  } catch (error) {
    throw apiError(400, "Connessione IMAP non riuscita: verifica host, porta e credenziali. (" + (error?.message || "errore sconosciuto") + ")");
  } finally {
    await client.logout().catch(() => {});
  }

  const transport = buildSmtpTransport(settings, password);
  try {
    await transport.verify();
  } catch (error) {
    throw apiError(400, "Connessione SMTP non riuscita: verifica host, porta e credenziali. (" + (error?.message || "errore sconosciuto") + ")");
  }

  const secrets = { password: encryptSecret(password) };
  await query(
    `INSERT INTO integrations (user_id, provider, status, secrets, settings, last_error, updated_at)
     VALUES ($1, 'email_imap', 'connected', $2::jsonb, $3::jsonb, NULL, NOW())
     ON CONFLICT (user_id, provider) DO UPDATE SET
       status = 'connected', secrets = $2::jsonb, settings = $3::jsonb, last_error = NULL, updated_at = NOW()`,
    [userId, JSON.stringify(secrets), JSON.stringify(settings)],
  );
  return getEmailStatus(userId);
}

export async function disconnectEmailAccount(userId) {
  await query(`DELETE FROM integrations WHERE user_id = $1 AND provider = 'email_imap'`, [userId]);
}

async function handleIncomingEmail(userId, { fromAddress, subject, bodyText, messageId }) {
  const profile = await query("SELECT onboarding_data FROM agent_config WHERE user_id = $1", [userId]);
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'incoming', 'email', $2, $3::jsonb)`,
    [userId, bodyText, JSON.stringify({ fromAddress, subject, messageId })],
  );

  let answer;
  try {
    await consumeTokens(userId, estimateTokens(bodyText), "email_input", { fromAddress });
    answer = await answerWithKnowledge(userId, bodyText, profile.rows[0]?.onboarding_data || {});
    await consumeTokens(userId, estimateTokens(answer.answer), "email_output", { fromAddress, model: answer.model });
  } catch (error) {
    console.warn("[email] impossibile generare una bozza di risposta", userId, error?.message || error);
    return;
  }

  const replySubject = /^re:/i.test(subject || "") ? subject : `Re: ${subject || "la tua richiesta"}`;
  await query(
    `INSERT INTO email_drafts (user_id, to_address, subject, body, original_snippet, in_reply_to)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, fromAddress, replySubject, answer.answer, bodyText.slice(0, 500), messageId || null],
  );
  console.info("[email] bozza di risposta creata", { userId, fromAddress });
}

async function pollAccount(row) {
  const settings = row.settings || {};
  const password = decryptSecret(row.secrets?.password);
  const client = new ImapFlow(buildImapConfig(settings, password));
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ seen: false });
      const toProcess = (uids || []).slice(0, MAX_MESSAGES_PER_POLL);
      for (const uid of toProcess) {
        const message = await client.fetchOne(uid, { source: true });
        if (!message?.source) continue;
        const parsed = await simpleParser(message.source);
        const fromAddress = parsed.from?.value?.[0]?.address;
        const bodyText = String(parsed.text || "").trim().slice(0, 4000);
        if (fromAddress && bodyText.length >= 2) {
          await handleIncomingEmail(row.user_id, {
            fromAddress,
            subject: parsed.subject || "",
            bodyText,
            messageId: parsed.messageId,
          }).catch((error) => console.error("[email] errore elaborazione messaggio", row.user_id, error?.message || error));
        }
        await client.messageFlagsAdd(uid, ["\\Seen"]).catch(() => {});
      }
    } finally {
      lock.release();
    }
    await query(`UPDATE integrations SET last_synced_at = NOW(), status = 'connected', last_error = NULL, updated_at = NOW() WHERE id = $1`, [row.id]);
  } catch (error) {
    console.error("[email] sincronizzazione fallita", row.user_id, error?.message || error);
    await query(`UPDATE integrations SET status = 'error', last_error = $1, updated_at = NOW() WHERE id = $2`, [(error?.message || "Errore sincronizzazione email").slice(0, 500), row.id]);
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function pollEmailAccounts() {
  const result = await query(`SELECT * FROM integrations WHERE provider = 'email_imap' AND status IN ('connected', 'error')`);
  for (const row of result.rows) {
    await pollAccount(row);
  }
}

function mapDraft(row) {
  return {
    id: row.id,
    to: row.to_address,
    subject: row.subject,
    body: row.body,
    originalSnippet: row.original_snippet,
    createdAt: row.created_at,
  };
}

export async function listEmailDrafts(userId) {
  const result = await query(
    `SELECT * FROM email_drafts WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  return result.rows.map(mapDraft);
}

export async function sendEmailDraft(userId, draftId, editedBody) {
  const draftResult = await query(`SELECT * FROM email_drafts WHERE id = $1 AND user_id = $2 AND status = 'pending'`, [draftId, userId]);
  const draft = draftResult.rows[0];
  if (!draft) throw apiError(404, "Bozza non trovata.");

  const integration = await loadIntegration(userId);
  if (!integration || integration.status !== "connected") throw apiError(409, "Nessun account email collegato.");
  const password = decryptSecret(integration.secrets?.password);
  const transport = buildSmtpTransport(integration.settings, password);
  const body = String(editedBody ?? draft.body).slice(0, 8000);

  await transport.sendMail({
    from: integration.settings.emailAddress,
    to: draft.to_address,
    subject: draft.subject,
    text: body,
    inReplyTo: draft.in_reply_to || undefined,
    references: draft.in_reply_to || undefined,
  });

  await query(`UPDATE email_drafts SET status = 'sent', body = $1, sent_at = NOW() WHERE id = $2`, [body, draftId]);
  await query(
    `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
     VALUES ($1, 'outgoing', 'email', $2, $3::jsonb)`,
    [userId, body, JSON.stringify({ toAddress: draft.to_address, subject: draft.subject })],
  );
  return { sent: true };
}

export async function discardEmailDraft(userId, draftId) {
  const result = await query(
    `UPDATE email_drafts SET status = 'discarded' WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id`,
    [draftId, userId],
  );
  if (!result.rowCount) throw apiError(404, "Bozza non trovata.");
  return { discarded: true };
}
