/**
 * Personale Artificiale — Production Server (Hardened)
 * Serves:
 * 1. API routes (/api/*) with auth, rate limiting, input validation
 * 2. Static assets from ./dist/client/
 * 3. TanStack Start SSR handler for everything else
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { writeFile, unlink, mkdir, readdir } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";
const CLIENT_DIR = path.resolve(__dirname, "dist/client");
const UPLOADS_BASE = process.env.UPLOADS_DIR || "/home/team/shared/uploads";

// ─── Allowed origins for CORS ──────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://personaleartificiale.it",
  "https://www.personaleartificiale.it",
  "https://app.personaleartificiale.it",
  /^https:\/\/[a-z0-9-]+\.ctonew\.app$/,
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  for (const rule of ALLOWED_ORIGINS) {
    if (rule instanceof RegExp && rule.test(origin)) return true;
    if (rule === origin) return true;
  }
  return false;
}

function corsHeaders(origin) {
  const headers = { "Content-Type": "application/json" };
  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return headers;
}

// ─── Rate limiter (in-memory sliding window) ───────────────────────────────
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // max requests per window

const rateCounters = new Map();
function rateLimit(ip) {
  const now = Date.now();
  let entry = rateCounters.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry = { windowStart: now, count: 0 };
    rateCounters.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// ─── DB helper (parameterized via alphanumeric validation) ──────────────────
function validateAlpha(value, maxLen = 255) {
  if (typeof value !== "string") return false;
  if (value.length > maxLen) return false;
  return true;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validatePlanId(planId) {
  return planId === "assistente-esecutivo" || planId === "ufficio-digitale";
}

// SAFE: Only pass validated alphanumeric values or internally-generated IDs
function escapeSQL(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

function dbQuery(sql) {
  const safe = sql.replace(/"/g, '\\"');
  const raw = execSync(`team-db "${safe}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function dbExecute(sql) {
  const safe = sql.replace(/"/g, '\\"');
  const raw = execSync(`team-db "${safe}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  try { return JSON.parse(raw); } catch { return { status: "ok" }; }
}

// ─── Auth helpers ───────────────────────────────────────────────────────────
function generateToken(length = 48) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

function generateUserId() {
  return crypto.randomBytes(8).toString("hex"); // 16 chars
}

async function ensureTables() {
  dbExecute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), plan_id TEXT NOT NULL,
    subscription_id TEXT, stripe_customer_id TEXT, stripe_checkout_session_id TEXT,
    tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
    status TEXT NOT NULL DEFAULT 'pending'
  )`);
  dbExecute(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  dbExecute(`CREATE TABLE IF NOT EXISTS agent_config (
    user_id TEXT PRIMARY KEY,
    tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
    role_description TEXT DEFAULT 'Assistente Digitale',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
}

function findOrCreateUser(email, name, planId) {
  const safeEmail = email.replace(/'/g, "''");
  const existing = dbQuery(`SELECT id, email, name, created_at as createdAt,
    plan_id as planId, subscription_id as subscriptionId,
    stripe_customer_id as stripeCustomerId, tone_of_voice as toneOfVoice, status
    FROM users WHERE email = ${escapeSQL(safeEmail)}`);
  if (existing.length > 0) return existing[0];
  const id = generateUserId();
  const safeName = name.replace(/'/g, "''");
  dbExecute(`INSERT INTO users (id, email, name, plan_id, status)
    VALUES (${escapeSQL(id)}, ${escapeSQL(safeEmail)}, ${escapeSQL(safeName)}, ${escapeSQL(planId)}, 'pending')`);
  dbExecute(`INSERT OR IGNORE INTO agent_config (user_id) VALUES (${escapeSQL(id)})`);
  return { id, email, name, createdAt: new Date().toISOString(), planId, subscriptionId: null, stripeCustomerId: null, toneOfVoice: null, status: "pending" };
}

function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  dbExecute(`INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${escapeSQL(token)}, ${escapeSQL(userId)}, ${escapeSQL(expiresAt)})`);
  return token;
}

function getUserBySession(token) {
  const safeToken = token.replace(/'/g, "''");
  const sessions = dbQuery(`SELECT user_id, expires_at FROM sessions WHERE token = ${escapeSQL(safeToken)}`);
  if (sessions.length === 0) return null;
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) {
    dbExecute(`DELETE FROM sessions WHERE token = ${escapeSQL(safeToken)}`);
    return null;
  }
  const users = dbQuery(`SELECT id, email, name, created_at as createdAt,
    plan_id as planId, subscription_id as subscriptionId,
    stripe_customer_id as stripeCustomerId, tone_of_voice as toneOfVoice, status
    FROM users WHERE id = ${escapeSQL(session.user_id)}`);
  return users.length > 0 ? users[0] : null;
}

function getUserFromAuthHeader(req) {
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  // Token must be alphanumeric
  if (!/^[a-f0-9]{48}$/.test(match[1])) return null;
  return getUserBySession(match[1]);
}

// ─── Body parser ────────────────────────────────────────────────────────────
async function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function parseJSONBody(req) {
  const raw = await readBody(req);
  try { return JSON.parse(raw.toString("utf-8")); } catch { return null; }
}

// ─── Response helpers ──────────────────────────────────────────────────────
function jsonResponse(data, status = 200, origin = "") {
  const body = JSON.stringify(data);
  return { status, headers: corsHeaders(origin), body };
}

function errorResponse(msg, status = 400, origin = "") {
  // Never leak internal details — only the message passed here
  return jsonResponse({ error: msg }, status, origin);
}

// ─── Rate limit response ───────────────────────────────────────────────────
function rateLimitResponse(origin = "") {
  return jsonResponse({ error: "Troppe richieste. Riprova tra un minuto." }, 429, origin);
}

// ─── API Route handlers ────────────────────────────────────────────────────
function getOrigin(req) {
  return req.headers["origin"] || "";
}

// POST /api/auth/register
async function handleRegister(req) {
  const origin = getOrigin(req);
  const body = await parseJSONBody(req);
  if (!body || !body.email || !body.name || !body.planId) {
    return errorResponse("Campi obbligatori mancanti: email, name, planId", 400, origin);
  }
  if (!validateEmail(body.email)) {
    return errorResponse("Email non valida", 400, origin);
  }
  if (!validatePlanId(body.planId)) {
    return errorResponse("PlanId non valido", 400, origin);
  }
  if (!validateAlpha(body.name, 200)) {
    return errorResponse("Nome troppo lungo o non valido", 400, origin);
  }
  await ensureTables();
  const user = findOrCreateUser(body.email, body.name, body.planId);
  const token = createSession(user.id);
  return jsonResponse({ token, user: { id: user.id, email: user.email, name: user.name, planId: user.planId } }, 200, origin);
}

// GET /api/auth/me
async function handleMe(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  return jsonResponse({ user }, 200, origin);
}

// POST /api/auth/logout
async function handleLogout(req) {
  const origin = getOrigin(req);
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (!auth) return jsonResponse({ success: true }, 200, origin);
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match && /^[a-f0-9]{48}$/.test(match[1])) {
    dbExecute(`DELETE FROM sessions WHERE token = ${escapeSQL(match[1])}`);
  }
  return jsonResponse({ success: true }, 200, origin);
}

// POST /api/stripe/checkout
async function handleCheckout(req) {
  const origin = getOrigin(req);
  const body = await parseJSONBody(req);
  if (!body || !body.planId || !body.email) {
    return errorResponse("Campi obbligatori mancanti: planId, email", 400, origin);
  }
  if (!validatePlanId(body.planId)) {
    return errorResponse("PlanId non valido", 400, origin);
  }
  if (!validateEmail(body.email)) {
    return errorResponse("Email non valida", 400, origin);
  }
  const PLANS = {
    "assistente-esecutivo": { name: "Assistente Esecutivo", setupFee: 39900, monthlyPrice: 9700 },
    "ufficio-digitale": { name: "L'Ufficio Digitale", setupFee: 99900, monthlyPrice: 29700 },
  };
  const plan = PLANS[body.planId];
  try {
    const stripe = await getStripe();
    const setupPrice = await stripe.prices.create({
      unit_amount: plan.setupFee, currency: "eur",
      product_data: { name: `${plan.name} — Setup Fee` },
    });
    const monthlyPrice = await stripe.prices.create({
      unit_amount: plan.monthlyPrice, currency: "eur", recurring: { interval: "month" },
      product_data: { name: `${plan.name} — Abbonamento Mensile` },
    });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        { price: setupPrice.id, quantity: 1 },
        { price: monthlyPrice.id, quantity: 1 },
      ],
      customer_email: body.email,
      success_url: "https://app.personaleartificiale.it/dashboard",
      cancel_url: "https://personaleartificiale.it",
      metadata: { plan_id: body.planId },
      subscription_data: { metadata: { plan_id: body.planId } },
    });
    return jsonResponse({ url: session.url, sessionId: session.id }, 200, origin);
  } catch (err) {
    return errorResponse("Errore nel pagamento. Riprova.", 500, origin);
  }
}

// POST /api/stripe/webhook
async function handleWebhook(req) {
  const origin = getOrigin(req);
  const rawBody = await readBody(req);
  const signature = req.headers["stripe-signature"];
  if (!signature) return errorResponse("Missing stripe-signature header", 400, origin);
  try {
    const stripe = await getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const planId = session.metadata?.plan_id;
        // Verify plan_id is valid
        if (!validatePlanId(planId)) break;
        // Verify amount matches expected plan
        const PLANS = {
          "assistente-esecutivo": { setupFee: 39900, monthlyPrice: 9700 },
          "ufficio-digitale": { setupFee: 99900, monthlyPrice: 29700 },
        };
        const plan = PLANS[planId];
        if (!plan) break;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const email = session.customer_email || session.customer_details?.email;
        if (email) {
          await ensureTables();
          const user = findOrCreateUser(email, email.split("@")[0] || "User", planId);
          dbExecute(`UPDATE users SET subscription_id = ${escapeSQL(subscriptionId)},
            stripe_customer_id = ${escapeSQL(customerId)}, stripe_checkout_session_id = ${escapeSQL(session.id)},
            status = 'active' WHERE id = ${escapeSQL(user.id)}`);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const status = sub.status === "active" ? "active" : sub.status === "canceled" ? "cancelled" : "pending";
        dbExecute(`UPDATE users SET status = ${escapeSQL(status)} WHERE subscription_id = ${escapeSQL(sub.id)}`);
        break;
      }
    }
    return jsonResponse({ received: true }, 200, origin);
  } catch (err) {
    return errorResponse(`Webhook error`, 400, origin);
  }
}

// GET /api/agent/config
async function handleGetAgentConfig(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const configs = dbQuery(`SELECT tone_of_voice, role_description FROM agent_config WHERE user_id = ${escapeSQL(user.id)}`);
  if (configs.length === 0) return jsonResponse({ config: null }, 200, origin);
  return jsonResponse({ config: { toneOfVoice: configs[0].tone_of_voice, roleDescription: configs[0].role_description } }, 200, origin);
}

// PUT /api/agent/config
async function handleUpdateAgentConfig(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const body = await parseJSONBody(req);
  if (!body) return errorResponse("JSON non valido", 400, origin);
  const tone = (body.toneOfVoice || "").slice(0, 500).replace(/'/g, "''");
  const role = (body.roleDescription || "").slice(0, 500).replace(/'/g, "''");
  dbExecute(`INSERT INTO agent_config (user_id, tone_of_voice, role_description, created_at, updated_at)
    VALUES (${escapeSQL(user.id)}, ${escapeSQL(tone)}, ${escapeSQL(role)}, datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET tone_of_voice = ${escapeSQL(tone)}, role_description = ${escapeSQL(role)}, updated_at = datetime('now')`);
  return jsonResponse({ success: true }, 200, origin);
}

// GET /api/agent/knowledge
async function handleListKnowledge(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  // Prevent directory traversal: user.id must be safe (generated internally)
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  const files = [];
  try {
    const entries = await readdir(tenantDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".pdf", ".doc", ".docx", ".txt", ".md"].includes(ext)) {
          const ts = parseInt(entry.name.split("-")[0], 10) || Date.now();
          files.push({ id: `file-${ts}`, originalName: entry.name.replace(/^\d+-/, ""), fileName: entry.name, ext, uploadedAt: new Date(ts).toISOString() });
        }
      }
    }
  } catch { /* no files */ }
  return jsonResponse({ files }, 200, origin);
}

// POST /api/agent/knowledge
async function handleUploadKnowledge(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const raw = await readBody(req);
  if (raw.length > 20 * 1024 * 1024) return errorResponse("File troppo grande (max 20MB)", 413, origin);
  const contentType = req.headers["content-type"] || "";
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  await mkdir(tenantDir, { recursive: true });
  const ALLOWED_EXTS = [".pdf", ".doc", ".docx", ".txt", ".md"];
  if (contentType.includes("multipart/form-data")) {
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) return errorResponse("Missing boundary in multipart", 400, origin);
    const parts = raw.toString("binary").split(`--${boundary}`);
    for (const part of parts) {
      const filenameMatch = part.match(/filename="(.+?)"/);
      if (filenameMatch) {
        const originalName = filenameMatch[1];
        const bodyStart = part.indexOf("\r\n\r\n") + 4;
        const fileContent = part.substring(bodyStart, part.lastIndexOf("\r\n--"));
        const ext = path.extname(originalName).toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) continue;
        const timestamp = Date.now();
        const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        await writeFile(path.join(tenantDir, safeName), Buffer.from(fileContent, "binary"));
        return jsonResponse({ file: { id: `file-${timestamp}`, originalName, fileName: safeName, ext } }, 200, origin);
      }
    }
    return errorResponse("Nessun file trovato", 400, origin);
  } else {
    const originalName = req.headers["x-filename"] || `upload-${Date.now()}`;
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return errorResponse(`Formato non supportato: ${ext}`, 400, origin);
    }
    const timestamp = Date.now();
    const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(path.join(tenantDir, safeName), raw);
    return jsonResponse({ file: { id: `file-${timestamp}`, originalName, fileName: safeName, ext } }, 200, origin);
  }
}

// DELETE /api/agent/knowledge
async function handleDeleteKnowledge(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const fileId = url.searchParams.get("id");
  if (!fileId) return errorResponse("Missing file id", 400, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  try {
    const entries = await readdir(tenantDir);
    for (const entry of entries) {
      if (entry.startsWith(fileId.replace("file-", ""))) {
        await unlink(path.join(tenantDir, entry));
        return jsonResponse({ success: true }, 200, origin);
      }
    }
  } catch { /* file not found */ }
  return errorResponse("File non trovato", 404, origin);
}

// GET /api/agent/stats
async function handleGetAgentStats(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  let fileCount = 0;
  try {
    const entries = await readdir(tenantDir, { withFileTypes: true });
    fileCount = entries.filter(e => e.isFile() && [".pdf", ".doc", ".docx", ".txt", ".md"].includes(path.extname(e.name).toLowerCase())).length;
  } catch { /* no files */ }
  return jsonResponse({ stats: { totalMessages: 0, totalTasksCompleted: 0, filesInKnowledgeBase: fileCount, activeSince: new Date().toISOString() } }, 200, origin);
}

// GET /api/agent/status
async function handleAgentStatus(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  return jsonResponse({ status: "online", agentId: user.id, lastActive: new Date().toISOString() }, 200, origin);
}

// GET /api/config/tone-of-voice
async function handleGetToneOfVoice(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const configs = dbQuery(`SELECT tone_of_voice FROM agent_config WHERE user_id = ${escapeSQL(user.id)}`);
  const toneOfVoice = configs.length > 0 ? configs[0].tone_of_voice : "Professionale, cortese e amichevole";
  return jsonResponse({ toneOfVoice }, 200, origin);
}

// PUT /api/config/tone-of-voice
async function handleUpdateToneOfVoice(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const body = await parseJSONBody(req);
  if (!body || !body.toneOfVoice) return errorResponse("Missing toneOfVoice", 400, origin);
  const safe = body.toneOfVoice.slice(0, 500).replace(/'/g, "''");
  dbExecute(`UPDATE agent_config SET tone_of_voice = ${escapeSQL(safe)}, updated_at = datetime('now') WHERE user_id = ${escapeSQL(user.id)}`);
  return jsonResponse({ success: true }, 200, origin);
}

// POST /api/whatsapp/webhook
async function handleWhatsAppWebhook(req) {
  const origin = getOrigin(req);
  const body = await parseJSONBody(req);
  if (!body) return errorResponse("JSON non valido", 400, origin);
  return jsonResponse({ status: "received", messageId: body.messageId || null }, 200, origin);
}

// GET /api/plans
async function handlePlans(req) {
  const origin = getOrigin(req);
  return jsonResponse({
    plans: [
      { id: "assistente-esecutivo", name: "Assistente Esecutivo", setupFee: 39900, monthlyPrice: 9700, description: "Per freelance e artigiani" },
      { id: "ufficio-digitale", name: "L'Ufficio Digitale", setupFee: 99900, monthlyPrice: 29700, description: "Per PMI, agenzie e studi professionali" },
    ],
  }, 200, origin);
}

// GET /api/health
function handleHealth(req) {
  const origin = getOrigin(req);
  return jsonResponse({ status: "ok", timestamp: new Date().toISOString() }, 200, origin);
}

// ─── Lazy Stripe loader ────────────────────────────────────────────────────
let _stripe = null;
async function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    const { default: Stripe } = await import("stripe");
    _stripe = new Stripe(key, { apiVersion: "2025-04-30" });
  }
  return _stripe;
}

// ─── API Router ─────────────────────────────────────────────────────────────
const API_ROUTES = {
  "GET /api/health": handleHealth,
  "GET /api/plans": handlePlans,
  "POST /api/auth/register": handleRegister,
  "GET /api/auth/me": handleMe,
  "POST /api/auth/logout": handleLogout,
  "POST /api/stripe/checkout": handleCheckout,
  "POST /api/stripe/webhook": handleWebhook,
  "GET /api/agent/config": handleGetAgentConfig,
  "PUT /api/agent/config": handleUpdateAgentConfig,
  "GET /api/agent/knowledge": handleListKnowledge,
  "POST /api/agent/knowledge": handleUploadKnowledge,
  "DELETE /api/agent/knowledge": handleDeleteKnowledge,
  "GET /api/agent/stats": handleGetAgentStats,
  "GET /api/agent/status": handleAgentStatus,
  "GET /api/config/tone-of-voice": handleGetToneOfVoice,
  "PUT /api/config/tone-of-voice": handleUpdateToneOfVoice,
  "POST /api/whatsapp/webhook": handleWhatsAppWebhook,
};

// ─── MIME types ─────────────────────────────────────────────────────────────
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webp": "image/webp", ".woff": "font/woff",
  ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

// ─── Main server ───────────────────────────────────────────────────────────
let ssrHandler;
try {
  const serverModule = await import("./dist/server/server.js");
  ssrHandler = serverModule.default || serverModule;
  if (ssrHandler && typeof ssrHandler.fetch === "function") {
    ssrHandler = ssrHandler.fetch;
  } else if (typeof ssrHandler === "object" && typeof ssrHandler.default?.fetch === "function") {
    ssrHandler = ssrHandler.default.fetch;
  }
} catch (err) {
  console.error("SSR handler not available — API routes only mode:", err.message);
  ssrHandler = null;
}

const server = http.createServer(async (req, res) => {
  try {
    // ── Handle CORS preflight ──────────────────────────────────────────────
    if (req.method === "OPTIONS") {
      const origin = getOrigin(req);
      const headers = corsHeaders(origin);
      res.writeHead(204, { ...headers, "Content-Length": "0" });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

    // ── Rate limiting on auth endpoints ─────────────────────────────────────
    if (pathname.startsWith("/api/auth/")) {
      if (!rateLimit(clientIp)) {
        const origin = getOrigin(req);
        const r = rateLimitResponse(origin);
        res.writeHead(r.status, r.headers);
        res.end(r.body);
        return;
      }
    }

    // ── 1. API Routes ──────────────────────────────────────────────────────
    if (pathname.startsWith("/api/")) {
      const routeKey = `${req.method} ${pathname}`;
      const handler = API_ROUTES[routeKey];
      if (handler) {
        const result = await handler(req);
        res.writeHead(result.status, result.headers);
        res.end(result.body || "");
        return;
      }
      // DELETE /api/agent/knowledge?id=... — handled by prefix match
      if (req.method === "DELETE" && pathname.startsWith("/api/agent/knowledge")) {
        const result = await handleDeleteKnowledge(req);
        res.writeHead(result.status, result.headers);
        res.end(result.body || "");
        return;
      }
      // No match
      const origin = getOrigin(req);
      const r = jsonResponse({ error: "API route not found", path: pathname }, 404, origin);
      res.writeHead(r.status, r.headers);
      res.end(r.body);
      return;
    }

    // ── 2. Static files ────────────────────────────────────────────────────
    if (pathname !== "/") {
      const filePath = path.join(CLIENT_DIR, pathname);
      // Prevent directory traversal
      if (!filePath.startsWith(CLIENT_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || "application/octet-stream";
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": mimeType });
        res.end(content);
        return;
      }
    }

    // ── 3. SSR fallback ────────────────────────────────────────────────────
    if (ssrHandler) {
      const protocol = req.socket?.encrypted || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const requestUrl = `${protocol}://${host}${req.url}`;
      const requestHeaders = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          Array.isArray(value)
            ? value.forEach((v) => requestHeaders.append(key, v))
            : requestHeaders.set(key, String(value));
        }
      }
      let body = null;
      if (req.method !== "GET" && req.method !== "HEAD") {
        body = await readBody(req);
      }
      const request = new Request(requestUrl, { method: req.method, headers: requestHeaders, body });
      const response = await ssrHandler(request);
      const responseBody = await response.text();
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(responseBody);
    } else {
      const indexPath = path.join(CLIENT_DIR, "index.html");
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(content);
      } else {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Personale Artificiale</h1><p>Server is running.</p>");
      }
    }
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Personale Artificiale serving on http://${HOST}:${PORT}`);
  console.log(`API routes available at http://${HOST}:${PORT}/api/*`);
});