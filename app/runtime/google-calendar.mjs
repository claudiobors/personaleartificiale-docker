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

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";
const REDIRECT_PATH = "/api/integrations/google/callback";

const BUSINESS_START_HOUR = Number(process.env.CALENDAR_BUSINESS_START_HOUR || 9);
const BUSINESS_END_HOUR = Number(process.env.CALENDAR_BUSINESS_END_HOUR || 18);

export function googleAuthUrl(userId) {
  const { clientId, redirectUri } = googleClientConfig(REDIRECT_PATH);
  return buildGoogleAuthUrl({ clientId, redirectUri, scope: SCOPE, userId });
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
  const userId = verifyGoogleState(state);
  await assertIntegrationSlot(userId, "google_calendar");
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
      `UPDATE integrations SET status = 'error', last_error = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'google_calendar'`,
      [(error.message || "Rinnovo del collegamento Google non riuscito.").slice(0, 500), userId],
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
    await revokeGoogleToken(decryptSecret(row.secrets.accessToken));
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
