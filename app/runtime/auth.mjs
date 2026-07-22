import crypto from "node:crypto";
import { promisify } from "node:util";
import { query, withTransaction } from "./db.mjs";

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const SESSION_COOKIE = "pa_session";

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
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
    onboardingComplete: Boolean(row.onboarding_completed_at),
    createdAt: row.created_at,
  };
}

const USER_SELECT = `
  SELECT users.id, users.email, users.name, users.plan_id, users.status,
         users.stripe_customer_id, users.subscription_id,
         users.subscription_current_period_end,
         users.onboarding_completed_at, users.created_at, users.password_hash
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

  const token = crypto.randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [hashSessionToken(token), row.id, SESSION_DAYS],
  );

  return { token, user: mapUser(row) };
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
