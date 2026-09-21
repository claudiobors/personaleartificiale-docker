import { query } from "./db.mjs";
import { apiError, getUserById } from "./auth.mjs";

function adminRecipients() {
  const configured = String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "");
  return configured.split(/[\s,;]+/).filter(Boolean);
}

// Stesso provider/pattern di auth.mjs::deliverOtp: se manca RESEND_API_KEY la richiesta
// viene comunque salvata (è quella l'informazione che conta), la notifica è solo un
// avviso rapido per l'operatore.
async function notifyAdmins({ user, companySize, useCase, notes }) {
  const recipients = adminRecipients();
  if (!recipients.length || !process.env.RESEND_API_KEY) return;
  const from = process.env.OTP_EMAIL_FROM || "Personale Artificiale <onboarding@resend.dev>";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `Nuova richiesta preventivo "su misura" — ${user.name}`,
        text: [
          `Cliente: ${user.name} <${user.email}>`,
          `Dimensione azienda: ${companySize || "non indicata"}`,
          `Caso d'uso: ${useCase || "non indicato"}`,
          `Note: ${notes || "—"}`,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(Number(process.env.OTP_EMAIL_TIMEOUT_MS || 8000)),
    });
  } catch (error) {
    console.error("[quotes] notifica admin non riuscita", user.id, error?.message || error);
  }
}

export async function createQuoteRequest({ userId, companySize, useCase, notes }) {
  const user = await getUserById(userId);
  if (!user) throw apiError(404, "Utente non trovato.");

  await query(
    `INSERT INTO custom_quote_requests (user_id, company_size, use_case, notes)
     VALUES ($1, $2, $3, $4)`,
    [userId, companySize || null, useCase || null, notes || null],
  );
  await query(
    `UPDATE users SET custom_quote_requested_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId],
  );

  await notifyAdmins({ user, companySize, useCase, notes });

  return { user: await getUserById(userId) };
}
