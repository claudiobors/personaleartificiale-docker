import crypto from "node:crypto";
import { promisify } from "node:util";
import { query, withTransaction } from "./db.mjs";

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const SESSION_COOKIE = "pa_session";
const OTP_TTL_MINUTES = 10;

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function hashOtp(code) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || "personale-artificiale-dev-otp";
  return crypto.createHmac("sha256", secret).update(String(code)).digest("hex");
}

function otpRequiredFor(row) {
  return process.env.OTP_LOGIN_REQUIRED === "true" || Boolean(row?.otp_enabled) || isAdminEmail(row?.email);
}

async function deliverOtp({ email, name, code }) {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.OTP_EMAIL_FROM || "Personale Artificiale <noreply@personaleartificiale.it>",
        to: [email],
        subject: "Codice di accesso Personale Artificiale",
        text: `Ciao ${name || ""},\n\nIl tuo codice OTP è: ${code}\n\nScade tra ${OTP_TTL_MINUTES} minuti. Se non hai richiesto tu l'accesso, ignora questa email.`,
      }),
      signal: AbortSignal.timeout(Number(process.env.OTP_EMAIL_TIMEOUT_MS || 8000)),
    });
    if (!response.ok) throw apiError(503, "Invio OTP non riuscito. Riprova tra poco.", "otp_delivery_failed");
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[otp-dev] ${email}: ${code}`);
    return;
  }
  throw apiError(503, "OTP attivo ma provider email non configurato. Imposta RESEND_API_KEY.", "otp_not_configured");
}

async function createSessionForUser(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [hashSessionToken(token), userId, SESSION_DAYS],
  );
  await query("UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [userId]);
  return token;
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "La password deve contenere almeno 8 caratteri.";
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "La password deve contenere almeno una lettera e un numero.";
  }
  return null;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  if (!encoded?.startsWith("scrypt:")) return false;
  const [, salt, storedHex] = encoded.split(":");
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const stored = Buffer.from(storedHex, "hex");
  return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    planId: row.plan_id,
    status: row.status,
    stripeCustomerId: row.stripe_customer_id,
    subscriptionId: row.subscription_id,
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end,
    accountType: row.account_type,
    whatsappPhone: row.whatsapp_phone,
    whatsappPhoneVerifiedAt: row.whatsapp_phone_verified_at,
    tokenBalance: row.token_balance,
    monthlyTokenAllowance: row.monthly_token_allowance,
    monthlyTokensUsed: row.monthly_tokens_used,
    tokenResetAt: row.token_reset_at,
    otpEnabled: Boolean(row.otp_enabled),
    isAdmin: isAdminEmail(row.email),
    onboardingComplete: Boolean(row.onboarding_completed_at),
    createdAt: row.created_at,
  };
}

export function isAdminEmail(email) {
  const configured = String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").toLowerCase();
  return configured.split(/[\s,;]+/).filter(Boolean).includes(String(email || "").toLowerCase());
}

const USER_SELECT = `
  SELECT users.id, users.email, users.name, users.plan_id, users.status,
         users.stripe_customer_id, users.subscription_id,
         users.subscription_current_period_end,
         users.onboarding_completed_at, users.created_at, users.password_hash,
         users.account_type, users.whatsapp_phone, users.whatsapp_phone_verified_at,
         users.token_balance, users.monthly_token_allowance, users.monthly_tokens_used,
         users.token_reset_at, users.otp_enabled
  FROM users
`;

export async function registerUser({ name, email, password, termsAccepted }) {
  const cleanEmail = normalizeEmail(email);
  const cleanName = String(name ?? "").trim();

  if (cleanName.length < 2) throw apiError(400, "Inserisci nome e cognome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw apiError(400, "Inserisci un indirizzo email valido.");
  }
  const passwordError = validatePassword(password);
  if (passwordError) throw apiError(400, passwordError);
  if (termsAccepted !== true) {
    throw apiError(400, "Devi accettare Termini di servizio e Privacy.");
  }

  const passwordHash = await hashPassword(password);

  return withTransaction(async (client) => {
    const existing = await client.query(
      `${USER_SELECT} WHERE LOWER(email) = $1 FOR UPDATE`,
      [cleanEmail],
    );

    let user;
    if (existing.rows[0]) {
      if (existing.rows[0].password_hash) {
        throw apiError(409, "Esiste già un account con questa email. Accedi.");
      }
      const updated = await client.query(
        `UPDATE users
         SET name = $1, password_hash = $2, terms_accepted_at = NOW(), updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [cleanName, passwordHash, existing.rows[0].id],
      );
      user = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO users (email, name, password_hash, plan_id, status, terms_accepted_at)
         VALUES ($1, $2, $3, 'none', 'pending', NOW())
         RETURNING *`,
        [cleanEmail, cleanName, passwordHash],
      );
      user = inserted.rows[0];
    }

    await client.query(
      "INSERT INTO agent_config (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [user.id],
    );

    const token = crypto.randomBytes(32).toString("hex");
    await client.query(
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
      [hashSessionToken(token), user.id, SESSION_DAYS],
    );

    return { token, user: mapUser(user) };
  });
}

export async function loginUser({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  const result = await query(`${USER_SELECT} WHERE LOWER(email) = $1`, [cleanEmail]);
  const row = result.rows[0];

  if (!row || !(await verifyPassword(String(password ?? ""), row.password_hash))) {
    throw apiError(401, "Email o password non corretti.");
  }

  if (otpRequiredFor(row)) {
    const code = String(crypto.randomInt(100000, 1000000));
    const challenge = await query(
      `INSERT INTO otp_challenges (user_id, code_hash, purpose, expires_at)
       VALUES ($1, $2, 'login', NOW() + ($3 || ' minutes')::interval)
       RETURNING id, expires_at`,
      [row.id, hashOtp(code), OTP_TTL_MINUTES],
    );
    await deliverOtp({ email: row.email, name: row.name, code });
    return {
      otpRequired: true,
      challengeId: challenge.rows[0].id,
      expiresAt: challenge.rows[0].expires_at,
      user: { email: row.email, name: row.name },
      devCode: process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY ? code : undefined,
    };
  }

  const token = await createSessionForUser(row.id);

  return { token, user: mapUser(row) };
}

export async function verifyLoginOtp({ challengeId, code }) {
  const cleanCode = String(code || "").replace(/\D/g, "");
  if (!challengeId || cleanCode.length !== 6) throw apiError(400, "Codice OTP non valido.");

  return withTransaction(async (client) => {
    const challenge = await client.query(
      `SELECT c.id, c.user_id, c.code_hash, c.attempts, c.expires_at, c.consumed_at,
              users.id, users.email, users.name, users.plan_id, users.status,
              users.stripe_customer_id, users.subscription_id,
              users.subscription_current_period_end, users.onboarding_completed_at,
              users.created_at, users.password_hash, users.account_type,
              users.whatsapp_phone, users.whatsapp_phone_verified_at,
              users.token_balance, users.monthly_token_allowance,
              users.monthly_tokens_used, users.token_reset_at, users.otp_enabled
       FROM otp_challenges c JOIN users ON users.id = c.user_id
       WHERE c.id = $1 FOR UPDATE`,
      [challengeId],
    );
    const row = challenge.rows[0];
    if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw apiError(401, "Codice OTP scaduto. Accedi di nuovo.");
    }
    if (row.attempts >= 5) throw apiError(429, "Troppi tentativi OTP. Accedi di nuovo.");
    const expected = Buffer.from(row.code_hash);
    const provided = Buffer.from(hashOtp(cleanCode));
    const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
    if (!valid) {
      await client.query("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1", [challengeId]);
      throw apiError(401, "Codice OTP non corretto.");
    }
    await client.query("UPDATE otp_challenges SET consumed_at = NOW() WHERE id = $1", [challengeId]);
    const token = crypto.randomBytes(32).toString("hex");
    await client.query(
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
      [hashSessionToken(token), row.user_id, SESSION_DAYS],
    );
    await client.query("UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [row.user_id]);
    return { token, user: mapUser(row) };
  });
}

function parseCookies(header = "") {
  return Object.fromEntries(
    String(header).split(";").map((part) => {
      const index = part.indexOf("=");
      if (index < 0) return ["", ""];
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
    }).filter(([key]) => key),
  );
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export function bearerToken(request) {
  const value = request.headers.authorization;
  const match = typeof value === "string" && value.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1];
  return parseCookies(request.headers.cookie)[SESSION_COOKIE] || null;
}

export async function requireUser(request) {
  const token = bearerToken(request);
  if (!token) throw apiError(401, "Sessione mancante. Accedi di nuovo.");

  const result = await query(
    `${USER_SELECT}
     JOIN sessions s ON s.user_id = users.id
     WHERE s.token = ANY($1::text[]) AND s.expires_at > NOW()`,
    [[hashSessionToken(token), token]],
  );
  const user = mapUser(result.rows[0]);
  if (!user) throw apiError(401, "Sessione scaduta. Accedi di nuovo.");
  return { user, token };
}

export async function requireActiveUser(request) {
  const auth = await requireUser(request);
  if (auth.user.status !== "active") {
    throw apiError(402, "È necessario un abbonamento attivo.");
  }
  return auth;
}

export async function requireAdminUser(request) {
  const auth = await requireUser(request);
  if (!auth.user.isAdmin) throw apiError(403, "Area riservata all'amministratore della piattaforma.");
  return auth;
}

export async function logoutUser(token) {
  if (token) await query("DELETE FROM sessions WHERE token = ANY($1::text[])", [[hashSessionToken(token), token]]);
}

export async function getUserById(id) {
  const result = await query(`${USER_SELECT} WHERE users.id = $1`, [id]);
  return mapUser(result.rows[0]);
}

export function apiError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
