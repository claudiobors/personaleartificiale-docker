import crypto from "node:crypto";
import { query } from "./db.mjs";
import { apiError, hashOtp } from "./auth.mjs";
import { getPlan } from "./plans.mjs";

const VERIFICATION_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_MINUTES = 1;

// Senza un minimo di attesa tra un invio e l'altro, chiunque potrebbe usare "aggiungi numero" per
// mandare messaggi WhatsApp ripetuti a un numero che non è nemmeno suo (basta far scadere/reinviare
// il codice in loop): un numero appena inviato (scadenza ancora vicina al TTL pieno) blocca un nuovo
// invio per un minuto, indipendentemente da chi lo richiede.
function assertResendAllowed(verificationExpiresAt) {
  if (!verificationExpiresAt) return;
  const issuedAt = new Date(verificationExpiresAt).getTime() - VERIFICATION_TTL_MINUTES * 60_000;
  const nextAllowedAt = issuedAt + RESEND_COOLDOWN_MINUTES * 60_000;
  if (Date.now() < nextAllowedAt) {
    throw apiError(429, "Codice già inviato di recente: aspetta un minuto prima di richiederne un altro.");
  }
}

function cleanPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw apiError(400, "Inserisci un numero WhatsApp valido in formato internazionale.");
  return raw.startsWith("+") ? "+" + digits : "+" + digits;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function whatsappNumberQuota(userId) {
  const result = await query(`SELECT plan_id, extra_whatsapp_slots FROM users WHERE id = $1`, [userId]);
  const row = result.rows[0];
  const plan = getPlan(row?.plan_id);
  const included = plan?.includedWhatsappNumbers || 0;
  const extra = row?.extra_whatsapp_slots || 0;
  const usedResult = await query(`SELECT COUNT(*)::int AS count FROM whatsapp_numbers WHERE user_id = $1`, [userId]);
  return { included, extra, total: included + extra, used: usedResult.rows[0].count };
}

// Solo i numeri verificati contano come "il tuo numero riconosciuto": mostrarne uno non ancora
// verificato darebbe l'impressione che l'assistente lo riconosca già, mentre non è ancora vero.
async function syncPrimaryNumber(userId) {
  const result = await query(
    `SELECT phone FROM whatsapp_numbers WHERE user_id = $1 AND verified_at IS NOT NULL ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  await query(`UPDATE users SET whatsapp_phone = $1, updated_at = NOW() WHERE id = $2`, [result.rows[0]?.phone || null, userId]);
}

function mapNumber(row) {
  return { id: row.id, phone: row.phone, label: row.label, verified: Boolean(row.verified_at), createdAt: row.created_at };
}

export async function listWhatsappNumbers(userId) {
  const [quota, numbers] = await Promise.all([
    whatsappNumberQuota(userId),
    query(`SELECT id, phone, label, verified_at, created_at FROM whatsapp_numbers WHERE user_id = $1 ORDER BY created_at ASC`, [userId]),
  ]);
  return { numbers: numbers.rows.map(mapNumber), quota };
}

// Un numero nuovo resta "in attesa" finché non si conferma un codice ricevuto via WhatsApp su quel
// numero: senza questa verifica, chiunque potrebbe registrare il numero di un'altra persona (bastano
// le cifre) e farlo trattare come autorizzato, facendo rispondere l'assistente a uno sconosciuto con
// la knowledge base e i crediti del titolare. bypassQuota è usato solo dal pannello admin per
// impostare direttamente il numero di un account: quel percorso è già un'azione fidata e attiva il
// numero subito, senza passare dalla verifica.
export async function addWhatsappNumber(userId, { phone, label }, { bypassQuota = false } = {}) {
  const cleanedPhone = cleanPhone(phone);
  const digits = onlyDigits(cleanedPhone);
  const cleanLabel = String(label || "").trim().slice(0, 80) || null;

  const existing = await query(
    `SELECT id, user_id, verified_at, verification_expires_at FROM whatsapp_numbers WHERE regexp_replace(phone, '\\D', '', 'g') = $1`,
    [digits],
  );
  if (existing.rowCount && existing.rows[0].user_id !== userId) {
    throw apiError(409, "Questo numero è già registrato su un altro account.");
  }
  if (existing.rowCount && existing.rows[0].verified_at) {
    return listWhatsappNumbers(userId);
  }
  if (existing.rowCount && !bypassQuota) {
    assertResendAllowed(existing.rows[0].verification_expires_at);
  }

  if (!bypassQuota && !existing.rowCount) {
    const quota = await whatsappNumberQuota(userId);
    if (quota.used >= quota.total) {
      const error = apiError(402, `Hai raggiunto il limite di ${quota.total} numeri WhatsApp del tuo piano.`, "whatsapp_number_quota_exceeded");
      error.quota = quota;
      throw error;
    }
  }

  if (bypassQuota) {
    if (existing.rowCount) {
      await query(`UPDATE whatsapp_numbers SET label = COALESCE($1, label), verified_at = NOW(), verification_code_hash = NULL WHERE id = $2`, [cleanLabel, existing.rows[0].id]);
    } else {
      await query(`INSERT INTO whatsapp_numbers (user_id, phone, label, verified_at) VALUES ($1, $2, $3, NOW())`, [userId, cleanedPhone, cleanLabel]);
    }
    await syncPrimaryNumber(userId);
    return listWhatsappNumbers(userId);
  }

  const code = generateCode();
  const codeHash = hashOtp(code);
  let numberId;
  if (existing.rowCount) {
    numberId = existing.rows[0].id;
    await query(
      `UPDATE whatsapp_numbers SET label = COALESCE($1, label), verification_code_hash = $2,
              verification_expires_at = NOW() + ($3 || ' minutes')::interval, verification_attempts = 0
       WHERE id = $4`,
      [cleanLabel, codeHash, VERIFICATION_TTL_MINUTES, numberId],
    );
  } else {
    const inserted = await query(
      `INSERT INTO whatsapp_numbers (user_id, phone, label, verification_code_hash, verification_expires_at, verification_attempts)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval, 0)
       RETURNING id`,
      [userId, cleanedPhone, cleanLabel, codeHash, VERIFICATION_TTL_MINUTES],
    );
    numberId = inserted.rows[0].id;
  }

  return { pendingVerification: true, numberId, phone: cleanedPhone, expiresInMinutes: VERIFICATION_TTL_MINUTES, code };
}

export async function resendWhatsappVerification(userId, numberId) {
  const result = await query(
    `SELECT id, phone, verified_at, verification_expires_at FROM whatsapp_numbers WHERE id = $1 AND user_id = $2`,
    [numberId, userId],
  );
  const row = result.rows[0];
  if (!row) throw apiError(404, "Numero non trovato.");
  if (row.verified_at) return { alreadyVerified: true };
  assertResendAllowed(row.verification_expires_at);

  const code = generateCode();
  await query(
    `UPDATE whatsapp_numbers SET verification_code_hash = $1, verification_expires_at = NOW() + ($2 || ' minutes')::interval, verification_attempts = 0
     WHERE id = $3`,
    [hashOtp(code), VERIFICATION_TTL_MINUTES, numberId],
  );
  return { pendingVerification: true, numberId, phone: row.phone, expiresInMinutes: VERIFICATION_TTL_MINUTES, code };
}

export async function verifyWhatsappNumber(userId, numberId, code) {
  const cleanCode = String(code || "").replace(/\D/g, "");
  if (cleanCode.length !== 6) throw apiError(400, "Codice non valido.");

  const result = await query(
    `SELECT id, verification_code_hash, verification_expires_at, verification_attempts, verified_at
     FROM whatsapp_numbers WHERE id = $1 AND user_id = $2`,
    [numberId, userId],
  );
  const row = result.rows[0];
  if (!row) throw apiError(404, "Numero non trovato.");
  if (row.verified_at) return listWhatsappNumbers(userId);
  if (!row.verification_code_hash || !row.verification_expires_at || new Date(row.verification_expires_at).getTime() < Date.now()) {
    throw apiError(401, "Codice scaduto: richiedine uno nuovo.");
  }
  if (row.verification_attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw apiError(429, "Troppi tentativi: richiedi un nuovo codice.");
  }

  const expected = Buffer.from(row.verification_code_hash);
  const provided = Buffer.from(hashOtp(cleanCode));
  const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  if (!valid) {
    await query(`UPDATE whatsapp_numbers SET verification_attempts = verification_attempts + 1 WHERE id = $1`, [numberId]);
    throw apiError(401, "Codice non corretto.");
  }

  await query(`UPDATE whatsapp_numbers SET verified_at = NOW(), verification_code_hash = NULL WHERE id = $1`, [numberId]);
  await syncPrimaryNumber(userId);
  return listWhatsappNumbers(userId);
}

export async function removeWhatsappNumber(userId, numberId) {
  const result = await query(`DELETE FROM whatsapp_numbers WHERE id = $1 AND user_id = $2 RETURNING id`, [numberId, userId]);
  if (!result.rowCount) throw apiError(404, "Numero non trovato.");
  await syncPrimaryNumber(userId);
  return listWhatsappNumbers(userId);
}

// Ogni istanza WhatsApp è ormai il numero personale di UN account (vedi evolution.mjs): questo
// controllo è quindi sempre scoped a quello specifico account, mai una ricerca globale — un numero
// registrato per il cliente A non deve mai poter autorizzare l'account del cliente B, anche se per
// assurdo scrivesse al numero sbagliato. Solo i numeri verificati contano.
export async function isNumberAuthorizedForUser(userId, remoteJid) {
  const digits = onlyDigits(remoteJid);
  if (!digits) return false;
  const result = await query(
    `SELECT 1 FROM whatsapp_numbers
     WHERE user_id = $1 AND regexp_replace(phone, '\\D', '', 'g') = $2 AND verified_at IS NOT NULL`,
    [userId, digits],
  );
  return result.rowCount > 0;
}
