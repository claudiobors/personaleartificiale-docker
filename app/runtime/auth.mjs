import crypto from "node:crypto";
import { promisify } from "node:util";
import { query, withTransaction } from "./db.mjs";

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const SESSION_COOKIE = "pa_session";
const OTP_TTL_MINUTES = 10;
const MIN_SECRET_LENGTH = 32;

// Solo per sviluppo locale senza .env completo: un segreto casuale generato una volta all'avvio di
// questo processo (mai scritto su disco, mai lo stesso tra due riavvii). Non è MAI usato in
// produzione: assertProductionSecrets() qui sotto blocca l'avvio se mancano le variabili vere,
// proprio per evitare che un deploy dimentichi JWT_SECRET/OTP_SECRET e finisca per firmare
// sessioni/OTP con un valore fisso e leggibile nel codice sorgente.
const DEV_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");

// Chiamata una sola volta all'avvio del processo (vedi server-v2.mjs). docker-compose imposta
// NODE_ENV=production anche in locale, quindi questo controllo gira sempre, non solo sul VPS reale.
// JWT_SECRET protegge sessioni e OTP per OGNI utente ad ogni richiesta: prima, se mancava, il codice
// ripiegava silenziosamente su una stringa fissa scritta nel sorgente (chiunque legga il repo potrebbe
// forgiare sessioni/OTP validi su un deploy che se lo fosse dimenticato) — per questo blocca l'avvio.
// INTEGRATIONS_ENCRYPTION_KEY invece non ha mai avuto un fallback insicuro: senza di lei le
// integrazioni Google/email restano semplicemente disattivate (secrets.mjs rifiuta di salvare
// credenziali in chiaro) — bloccare l'avvio anche per questa spegnerebbe l'intera piattaforma solo
// perché nessuno ha ancora collegato un'integrazione, quindi qui ci si limita ad avvisare forte.
export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(`Configurazione non sicura: JWT_SECRET mancante o più corta di ${MIN_SECRET_LENGTH} caratteri.`);
  }
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!key || key.length < MIN_SECRET_LENGTH) {
    console.warn(
      `[startup] ATTENZIONE: INTEGRATIONS_ENCRYPTION_KEY mancante o più corta di ${MIN_SECRET_LENGTH} caratteri. ` +
      "Le integrazioni Google Calendar/Gmail/Drive ed email restano disattivate finché non la imposti nel .env.",
    );
  }
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// Esportato per riuso: qualunque altro flusso che deve inviare un codice a 6 cifre e poi verificarlo
// (es. la verifica di proprietà dei numeri WhatsApp in whatsapp-numbers.mjs) usa lo stesso HMAC con
// la stessa gestione del segreto, invece di reinventare la stessa logica con un proprio fallback.
export function hashOtp(code) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
  return crypto.createHmac("sha256", secret).update(String(code)).digest("hex");
}

function otpRequiredFor(row) {
  if (process.env.OTP_LOGIN_REQUIRED === "false") return Boolean(row?.otp_enabled);
  return process.env.OTP_LOGIN_REQUIRED === "true" || Boolean(row?.otp_enabled) || isAdminEmail(row?.email);
}

async function deliverOtp({ email, name, code }) {
  if (process.env.RESEND_API_KEY) {
    const from = process.env.OTP_EMAIL_FROM || "Personale Artificiale <onboarding@resend.dev>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Codice di accesso Personale Artificiale",
        text: `Ciao ${name || ""},\n\nIl tuo codice OTP è: ${code}\n\nScade tra ${OTP_TTL_MINUTES} minuti. Se non hai richiesto tu l'accesso, ignora questa email.`,
      }),
      signal: AbortSignal.timeout(Number(process.env.OTP_EMAIL_TIMEOUT_MS || 8000)),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[otp] Resend delivery failed", {
        status: response.status,
        from,
        to: email,
        detail: detail.slice(0, 1000),
      });
      const message = response.status === 403 || response.status === 422
        ? "Invio OTP non riuscito: verifica RESEND_API_KEY e il dominio/mittente OTP_EMAIL_FROM su Resend."
        : "Invio OTP non riuscito. Riprova tra poco.";
      throw apiError(503, message, "otp_delivery_failed");
    }
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

// N=2^17 segue le linee guida OWASP correnti per scrypt su login interattivo (il default di Node,
// N=2^14, è ormai considerato debole). Il costo N usato è scritto dentro l'hash stesso: le password
// già salvate con il vecchio default continuano a verificarsi correttamente con quel valore, mentre
// ogni nuovo hash (registrazione, o un futuro cambio password) usa il nuovo costo più alto.
const SCRYPT_N = Number(process.env.PASSWORD_SCRYPT_N || 131072);
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;
const LEGACY_SCRYPT_N = 16384;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  return `scrypt:${SCRYPT_N}:${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  if (!encoded?.startsWith("scrypt:")) return false;
  const parts = encoded.split(":");
  let n, salt, storedHex;
  if (parts.length === 4) {
    [, n, salt, storedHex] = parts;
    n = Number(n);
  } else if (parts.length === 3) {
    [, salt, storedHex] = parts;
    n = LEGACY_SCRYPT_N;
  } else {
    return false;
  }
  const derived = Buffer.from(await scrypt(password, salt, 64, { N: n, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM }));
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
    subscriptionCycleMonths: row.subscription_cycle_months,
    customQuoteRequestedAt: row.custom_quote_requested_at,
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
         users.token_reset_at, users.otp_enabled,
         users.subscription_cycle_months, users.custom_quote_requested_at
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
       WHERE c.id = $1 AND c.purpose = 'login' FOR UPDATE`,
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

// Cambio password da utente già autenticato: invalida ogni ALTRA sessione attiva (su altri
// dispositivi/browser), in modo che se la password stava per essere cambiata perché sospettata
// compromessa, un eventuale accesso non autorizzato altrove venga chiuso subito. La sessione da cui
// arriva questa richiesta resta valida, per non disconnettere l'utente che ha appena agito.
export async function changePassword(userId, currentToken, { currentPassword, newPassword }) {
  const result = await query(`${USER_SELECT} WHERE users.id = $1`, [userId]);
  const row = result.rows[0];
  if (!row || !(await verifyPassword(String(currentPassword ?? ""), row.password_hash))) {
    throw apiError(401, "Password attuale non corretta.");
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw apiError(400, passwordError);

  const newHash = await hashPassword(newPassword);
  await withTransaction(async (client) => {
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, userId]);
    await client.query("DELETE FROM sessions WHERE user_id = $1 AND token != $2", [userId, hashSessionToken(currentToken)]);
  });
  return { success: true };
}

// Non rivela mai se l'email esiste o meno (stesso messaggio di successo in entrambi i casi), per non
// trasformare questo endpoint in un modo per verificare quali email sono registrate sulla piattaforma.
export async function requestPasswordReset(email) {
  const cleanEmail = normalizeEmail(email);
  const result = await query(`${USER_SELECT} WHERE LOWER(email) = $1`, [cleanEmail]);
  const row = result.rows[0];
  if (row) {
    const code = String(crypto.randomInt(100000, 1000000));
    await query(
      `INSERT INTO otp_challenges (user_id, code_hash, purpose, expires_at)
       VALUES ($1, $2, 'password_reset', NOW() + ($3 || ' minutes')::interval)`,
      [row.id, hashOtp(code), OTP_TTL_MINUTES],
    );
    await deliverOtp({ email: row.email, name: row.name, code }).catch((error) => {
      console.warn("[auth] invio codice reset password fallito", cleanEmail, error?.message || error);
    });
    if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
      console.info(`[password-reset-dev] ${cleanEmail}: ${code}`);
    }
  }
  return { success: true };
}

// Come il cambio password da autenticati: invalida TUTTE le sessioni esistenti, dato che chi usa
// questo flusso non ha (o non usa) una sessione valida da preservare — è comunque la scelta giusta
// in un recupero password, che spesso segue proprio il sospetto di un accesso non autorizzato.
export async function resetPasswordWithOtp({ email, code, newPassword }) {
  const cleanCode = String(code || "").replace(/\D/g, "");
  const cleanEmail = normalizeEmail(email);
  if (cleanCode.length !== 6) throw apiError(400, "Codice non valido.");
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw apiError(400, passwordError);
  // Calcolato prima di aprire la transazione: scrypt è volutamente lento (vedi SCRYPT_N sopra), e non
  // ha senso tenere una riga di otp_challenges bloccata con FOR UPDATE per tutta la sua durata.
  const newHash = await hashPassword(newPassword);

  await withTransaction(async (client) => {
    const userResult = await client.query(`${USER_SELECT} WHERE LOWER(email) = $1`, [cleanEmail]);
    const user = userResult.rows[0];
    if (!user) throw apiError(401, "Codice non corretto o scaduto.");

    const challenge = await client.query(
      `SELECT id, code_hash, attempts, expires_at, consumed_at FROM otp_challenges
       WHERE user_id = $1 AND purpose = 'password_reset' AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [user.id],
    );
    const row = challenge.rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      throw apiError(401, "Codice non corretto o scaduto.");
    }
    if (row.attempts >= 5) throw apiError(429, "Troppi tentativi. Richiedi un nuovo codice.");
    const expected = Buffer.from(row.code_hash);
    const provided = Buffer.from(hashOtp(cleanCode));
    const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
    if (!valid) {
      await client.query("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1", [row.id]);
      throw apiError(401, "Codice non corretto o scaduto.");
    }

    await client.query("UPDATE otp_challenges SET consumed_at = NOW() WHERE id = $1", [row.id]);
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, user.id]);
    await client.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
  });
  return { success: true };
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
