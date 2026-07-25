import { query } from "./db.mjs";
import { apiError } from "./auth.mjs";
import { getPlan } from "./plans.mjs";

function cleanPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw apiError(400, "Inserisci un numero WhatsApp valido in formato internazionale.");
  return raw.startsWith("+") ? "+" + digits : "+" + digits;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
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

async function syncPrimaryNumber(userId) {
  const result = await query(`SELECT phone FROM whatsapp_numbers WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`, [userId]);
  await query(`UPDATE users SET whatsapp_phone = $1, updated_at = NOW() WHERE id = $2`, [result.rows[0]?.phone || null, userId]);
}

function mapNumber(row) {
  return { id: row.id, phone: row.phone, label: row.label, createdAt: row.created_at };
}

export async function listWhatsappNumbers(userId) {
  const [quota, numbers] = await Promise.all([
    whatsappNumberQuota(userId),
    query(`SELECT id, phone, label, created_at FROM whatsapp_numbers WHERE user_id = $1 ORDER BY created_at ASC`, [userId]),
  ]);
  return { numbers: numbers.rows.map(mapNumber), quota };
}

export async function addWhatsappNumber(userId, { phone, label }, { bypassQuota = false } = {}) {
  const cleanedPhone = cleanPhone(phone);
  const digits = onlyDigits(cleanedPhone);

  const existing = await query(
    `SELECT user_id FROM whatsapp_numbers WHERE regexp_replace(phone, '\\D', '', 'g') = $1`,
    [digits],
  );
  if (existing.rowCount && existing.rows[0].user_id !== userId) {
    throw apiError(409, "Questo numero è già registrato su un altro account.");
  }
  if (existing.rowCount) return listWhatsappNumbers(userId);

  if (!bypassQuota) {
    const quota = await whatsappNumberQuota(userId);
    if (quota.used >= quota.total) {
      const error = apiError(402, `Hai raggiunto il limite di ${quota.total} numeri WhatsApp del tuo piano.`, "whatsapp_number_quota_exceeded");
      error.quota = quota;
      throw error;
    }
  }

  await query(
    `INSERT INTO whatsapp_numbers (user_id, phone, label) VALUES ($1, $2, $3)`,
    [userId, cleanedPhone, String(label || "").trim().slice(0, 80) || null],
  );
  await syncPrimaryNumber(userId);
  return listWhatsappNumbers(userId);
}

export async function removeWhatsappNumber(userId, numberId) {
  const result = await query(`DELETE FROM whatsapp_numbers WHERE id = $1 AND user_id = $2 RETURNING id`, [numberId, userId]);
  if (!result.rowCount) throw apiError(404, "Numero non trovato.");
  await syncPrimaryNumber(userId);
  return listWhatsappNumbers(userId);
}

export async function getUserByWhatsAppNumber(remoteJid) {
  const digits = onlyDigits(remoteJid);
  if (!digits) return null;
  const result = await query(
    `SELECT users.id, users.email, users.name, users.plan_id, users.status, users.stripe_customer_id,
            users.subscription_id, users.subscription_current_period_end, users.token_balance,
            users.onboarding_completed_at
     FROM whatsapp_numbers
     JOIN users ON users.id = whatsapp_numbers.user_id
     WHERE regexp_replace(whatsapp_numbers.phone, '\\D', '', 'g') = $1
     LIMIT 1`,
    [digits],
  );
  return result.rows[0] || null;
}
