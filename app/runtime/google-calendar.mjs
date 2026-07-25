import crypto from "node:crypto";
import { apiError } from "./auth.mjs";
import { query } from "./db.mjs";
import { assertIntegrationSlot } from "./integration-quota.mjs";
import { encryptSecret, decryptSecret } from "./secrets.mjs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";

const BUSINESS_START_HOUR = Number(process.env.CALENDAR_BUSINESS_START_HOUR || 9);
const BUSINESS_END_HOUR = Number(process.env.CALENDAR_BUSINESS_END_HOUR || 18);

function stateSecret() {
  return process.env.JWT_SECRET || process.env.OTP_SECRET || "personale-artificiale-dev-state";
}

function signState(userId) {
  const payload = `${userId}.${Date.now()}`;
  const signature = crypto.createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

function verifyState(state) {
  const decoded = Buffer.from(String(state || ""), "base64url").toString("utf8");
  const parts = decoded.split(".");
  if (parts.length !== 3) throw apiError(400, "Stato OAuth non valido.");
  const [userId, timestamp, signature] = parts;
  const expected = crypto.createHmac("sha256", stateSecret()).update(`${userId}.${timestamp}`).digest("hex");
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
    throw apiError(401, "Stato OAuth non valido o manomesso.");
  }
  if (Date.now() - Number(timestamp) > 10 * 60_000) throw apiError(401, "Sessione di collegamento Google scaduta, riprova.");
  return userId;
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw apiError(503, "Google Calendar non è configurato su questa piattaforma. Contatta l'amministratore.", "google_not_configured");
  }
  const redirectUri = (process.env.APP_URL || "https://app.personaleartificiale.it").replace(/\/+$/, "") + "/api/integrations/google/callback";
  return { clientId, clientSecret, redirectUri };
}

export function googleAuthUrl(userId) {
  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: signState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function loadIntegration(userId) {
  const result = await query(`SELECT * FROM integrations WHERE user_id = $1 AND provider = 'google_calendar'`, [userId]);
  return result.rows[0] || null;
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
      "Google non ha fornito un accesso persistente. Vai su https://myaccount.google.com/permissions, rimuovi l'accesso a Personale Artificiale e riprova a collegare il calendario.",
    );
  }
  await query(
    `INSERT INTO integrations (user_id, provider, status, secrets, settings, last_error, updated_at)
     VALUES ($1, 'google_calendar', 'connected', $2::jsonb, '{"calendarId":"primary"}'::jsonb, NULL, NOW())
     ON CONFLICT (user_id, provider) DO UPDATE SET
       status = 'connected', secrets = $2::jsonb, last_error = NULL, updated_at = NOW()`,
    [userId, JSON.stringify(secrets)],
  );
}

export async function handleGoogleCallback(code, state) {
  const userId = verifyState(state);
  await assertIntegrationSlot(userId, "google_calendar");
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(Number(process.env.GOOGLE_TIMEOUT_MS || 10000)),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw apiError(502, payload.error_description || payload.error || "Autorizzazione Google non riuscita.");
  }
  await storeTokens(userId, { accessToken: payload.access_token, refreshToken: payload.refresh_token, expiresIn: payload.expires_in });
  return userId;
}

async function refreshAccessToken(userId, row) {
  const { clientId, clientSecret } = googleConfig();
  const refreshToken = decryptSecret(row.secrets?.refreshToken);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(Number(process.env.GOOGLE_TIMEOUT_MS || 10000)),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    await query(
      `UPDATE integrations SET status = 'error', last_error = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'google_calendar'`,
      [(payload.error_description || "Rinnovo del collegamento Google non riuscito.").slice(0, 500), userId],
    );
    throw apiError(401, "Il collegamento a Google Calendar è scaduto. Ricollega il calendario dalle impostazioni.", "google_reauth_required");
  }
  const secrets = {
    ...row.secrets,
    accessToken: encryptSecret(payload.access_token),
    expiresAt: Date.now() + Math.max(0, (Number(payload.expires_in) || 3600) - 60) * 1000,
  };
  await query(
    `UPDATE integrations SET secrets = $1::jsonb, status = 'connected', last_error = NULL, updated_at = NOW() WHERE user_id = $2 AND provider = 'google_calendar'`,
    [JSON.stringify(secrets), userId],
  );
  return payload.access_token;
}

async function getValidAccessToken(userId) {
  const row = await loadIntegration(userId);
  if (!row || row.status !== "connected") return null;
  const expiresAt = Number(row.secrets?.expiresAt || 0);
  if (expiresAt > Date.now() + 30_000) return decryptSecret(row.secrets.accessToken);
  return refreshAccessToken(userId, row);
}

export async function getCalendarStatus(userId) {
  const row = await loadIntegration(userId);
  if (!row) return { status: "disconnected" };
  return {
    status: row.status,
    lastError: row.last_error,
    connectedAt: row.created_at,
    calendarId: row.settings?.calendarId || "primary",
  };
}

export async function disconnectGoogleCalendar(userId) {
  const row = await loadIntegration(userId);
  if (row?.secrets?.accessToken) {
    const token = decryptSecret(row.secrets.accessToken);
    await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
  }
  await query(`DELETE FROM integrations WHERE user_id = $1 AND provider = 'google_calendar'`, [userId]);
}

async function calendarFetch(userId, pathname, options = {}) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw apiError(409, "Nessun Google Calendar collegato.", "google_not_connected");
  const response = await fetch(GOOGLE_CALENDAR_API + pathname, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(Number(process.env.GOOGLE_TIMEOUT_MS || 10000)),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const error = apiError(response.status, payload?.error?.message || "Google Calendar non disponibile.", "google_error");
    error.detail = payload;
    throw error;
  }
  return payload;
}

export async function isCalendarConnected(userId) {
  const row = await loadIntegration(userId);
  return Boolean(row && row.status === "connected");
}

export async function proposeSlots(userId, { durationMinutes = 60, daysAhead = 7, count = 3 } = {}) {
  const row = await loadIntegration(userId);
  const calendarId = row?.settings?.calendarId || "primary";
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + daysAhead * 86_400_000);
  const freebusy = await calendarFetch(userId, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: calendarId }] }),
  });
  const busy = (freebusy.calendars?.[calendarId]?.busy || []).map((entry) => ({
    start: new Date(entry.start),
    end: new Date(entry.end),
  }));

  const slots = [];
  const cursor = new Date(timeMin);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(cursor.getHours() + 1);
  let guard = 0;
  while (slots.length < count && cursor < timeMax && guard < 24 * daysAhead) {
    guard += 1;
    const day = cursor.getDay();
    const hour = cursor.getHours();
    if (day !== 0 && day !== 6 && hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
      const overlaps = busy.some((entry) => slotStart < entry.end && slotEnd > entry.start);
      if (!overlaps) slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
    }
    cursor.setHours(cursor.getHours() + 1);
  }
  return slots;
}

export async function createCalendarEvent(userId, { summary, description, start, end, attendeeEmail }) {
  const row = await loadIntegration(userId);
  const calendarId = row?.settings?.calendarId || "primary";
  const body = {
    summary: String(summary || "Appuntamento").slice(0, 200),
    description: String(description || "").slice(0, 2000),
    start: { dateTime: start },
    end: { dateTime: end },
  };
  if (attendeeEmail) body.attendees = [{ email: attendeeEmail }];
  return calendarFetch(userId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
