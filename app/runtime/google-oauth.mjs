import crypto from "node:crypto";
import { apiError } from "./auth.mjs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

function stateSecret() {
  return process.env.JWT_SECRET || process.env.OTP_SECRET || "personale-artificiale-dev-state";
}

function signGoogleState(userId) {
  const payload = `${userId}.${Date.now()}`;
  const signature = crypto.createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyGoogleState(state) {
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

export function googleClientConfig(redirectPath) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw apiError(503, "Google non è configurato su questa piattaforma. Contatta l'amministratore.", "google_not_configured");
  }
  const redirectUri = (process.env.APP_URL || "https://app.personaleartificiale.it").replace(/\/+$/, "") + redirectPath;
  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthUrl({ clientId, redirectUri, scope, userId }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state: signGoogleState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode({ code, clientId, clientSecret, redirectUri }) {
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
  return payload;
}

export async function refreshGoogleToken({ clientId, clientSecret, refreshToken }) {
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
    throw apiError(401, payload.error_description || "Rinnovo del collegamento Google non riuscito.", "google_reauth_required");
  }
  return payload;
}

export async function revokeGoogleToken(token) {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
}
