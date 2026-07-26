import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
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

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const SCOPE = "https://www.googleapis.com/auth/drive";
const REDIRECT_PATH = "/api/integrations/drive/callback";

const EXPORTABLE_MIME = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

export function driveAuthUrl(userId) {
  const { clientId, redirectUri } = googleClientConfig(REDIRECT_PATH);
  return buildGoogleAuthUrl({ clientId, redirectUri, scope: SCOPE, userId });
}

async function loadIntegration(userId) {
  const result = await query(`SELECT * FROM integrations WHERE user_id = $1 AND provider = 'google_drive'`, [userId]);
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
      "Google non ha fornito un accesso persistente. Vai su https://myaccount.google.com/permissions, rimuovi l'accesso a Personale Artificiale e riprova a collegare Drive.",
    );
  }
  await query(
    `INSERT INTO integrations (user_id, provider, status, secrets, settings, last_error, updated_at)
     VALUES ($1, 'google_drive', 'connected', $2::jsonb, '{}'::jsonb, NULL, NOW())
     ON CONFLICT (user_id, provider) DO UPDATE SET
       status = 'connected', secrets = $2::jsonb, last_error = NULL, updated_at = NOW()`,
    [userId, JSON.stringify(secrets)],
  );
}

export async function handleDriveCallback(code, state) {
  const userId = verifyGoogleState(state);
  await assertIntegrationSlot(userId, "google_drive");
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
      `UPDATE integrations SET status = 'error', last_error = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'google_drive'`,
      [(error.message || "Rinnovo del collegamento Drive non riuscito.").slice(0, 500), userId],
    );
    throw apiError(401, "Il collegamento a Google Drive è scaduto. Ricollegalo dalle integrazioni.", "google_reauth_required");
  }
  const secrets = {
    ...row.secrets,
    accessToken: encryptSecret(payload.access_token),
    expiresAt: Date.now() + Math.max(0, (Number(payload.expires_in) || 3600) - 60) * 1000,
  };
  await query(
    `UPDATE integrations SET secrets = $1::jsonb, status = 'connected', last_error = NULL, updated_at = NOW() WHERE user_id = $2 AND provider = 'google_drive'`,
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

export async function getDriveStatus(userId) {
  const row = await loadIntegration(userId);
  if (!row) return { status: "disconnected" };
  return { status: row.status, lastError: row.last_error, connectedAt: row.created_at };
}

export async function disconnectGoogleDrive(userId) {
  const row = await loadIntegration(userId);
  if (row?.secrets?.accessToken) {
    await revokeGoogleToken(decryptSecret(row.secrets.accessToken));
  }
  await query(`DELETE FROM integrations WHERE user_id = $1 AND provider = 'google_drive'`, [userId]);
}

export async function isDriveConnected(userId) {
  const row = await loadIntegration(userId);
  return Boolean(row && row.status === "connected");
}

async function driveFetch(userId, pathname, options = {}) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw apiError(409, "Nessun Google Drive collegato.", "drive_not_connected");
  const response = await fetch((options.uploadApi ? DRIVE_UPLOAD_API : DRIVE_API) + pathname, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(Number(process.env.GOOGLE_TIMEOUT_MS || 15000)),
  });
  if (!response.ok) {
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
    const error = apiError(response.status, payload?.error?.message || "Google Drive non disponibile.", "drive_error");
    error.detail = payload;
    throw error;
  }
  return response;
}

function escapeDriveQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function searchDriveFiles(userId, searchText, limit = 5) {
  const value = escapeDriveQueryValue(searchText);
  const q = `(name contains '${value}' or fullText contains '${value}') and trashed = false`;
  const fields = "files(id,name,mimeType,webViewLink,modifiedTime)";
  const response = await driveFetch(
    userId,
    `/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=${Math.min(Math.max(Number(limit) || 5, 1), 10)}`,
  );
  const data = await response.json();
  return data.files || [];
}

export async function downloadDriveFileBuffer(userId, fileId) {
  const response = await driveFetch(userId, `/files/${encodeURIComponent(fileId)}?alt=media`);
  return Buffer.from(await response.arrayBuffer());
}

export async function readDriveFileText(userId, file) {
  const exportMime = EXPORTABLE_MIME[file.mimeType];
  if (exportMime) {
    const response = await driveFetch(userId, `/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exportMime)}`);
    return (await response.text()).slice(0, 20_000);
  }
  const response = await driveFetch(userId, `/files/${encodeURIComponent(file.id)}?alt=media`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (file.mimeType === "application/pdf") return (await pdf(buffer)).text.slice(0, 20_000);
  if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (await mammoth.extractRawText({ buffer })).value.slice(0, 20_000);
  }
  return buffer.toString("utf8").slice(0, 20_000);
}

async function uploadDriveFileContent(userId, fileId, content, mimeType = "text/plain; charset=utf-8") {
  await driveFetch(userId, `/files/${encodeURIComponent(fileId)}?uploadType=media`, {
    uploadApi: true,
    method: "PATCH",
    headers: { "Content-Type": mimeType },
    body: content,
  });
}

// mimeType di default 'text/plain' per i diari/note testuali già in uso; per file binari (Excel, PPTX,
// Word, PDF generati dalle skill Office) passa il mimeType reale così Drive lo serve/anteprima correttamente.
export async function createDriveFile(userId, { name, content, mimeType = "text/plain", parentId }) {
  const isTextPlain = mimeType === "text/plain";
  const safeName = String(name || "Nota").trim().slice(0, 200) || "Nota";
  const finalName = isTextPlain && !safeName.endsWith(".txt") ? `${safeName}.txt` : safeName;
  const metadata = { name: finalName, mimeType: isTextPlain ? "text/plain" : mimeType };
  if (parentId) metadata.parents = [parentId];
  const response = await driveFetch(userId, "/files?fields=id,name,webViewLink", {
    method: "POST",
    body: JSON.stringify(metadata),
  });
  const file = await response.json();
  await uploadDriveFileContent(userId, file.id, content, isTextPlain ? "text/plain; charset=utf-8" : mimeType);
  return file;
}

// Trova (o crea) una cartella Drive per nome, usata per raccogliere i file generati dalle skill.
export async function ensureDriveFolder(userId, folderName) {
  const value = escapeDriveQueryValue(folderName);
  const q = `name = '${value}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const response = await driveFetch(userId, `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`);
  const data = await response.json();
  if (data.files?.[0]) return data.files[0].id;
  const createResponse = await driveFetch(userId, "/files?fields=id,name", {
    method: "POST",
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await createResponse.json();
  return folder.id;
}

export async function appendToDriveFile(userId, { fileId, name, addition }) {
  let existing = "";
  try {
    existing = await readDriveFileText(userId, { id: fileId, mimeType: "text/plain" });
  } catch (error) {
    console.warn("[drive] impossibile leggere il file esistente prima di aggiungere testo", fileId, error?.message || error);
  }
  const updated = existing ? `${existing}\n\n${addition}` : addition;
  await uploadDriveFileContent(userId, fileId, updated);
  return { id: fileId, name };
}
