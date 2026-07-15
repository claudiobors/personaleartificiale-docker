/**
 * Personale Artificiale — App Server (Dashboard SPA + API)
 * Serves:
 * 1. API routes (/api/*) with auth, rate limiting, input validation
 * 2. Dashboard SPA (index.html) for all non-API routes
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

// ─── Rate limiter ──────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 20;
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

// ─── DB helpers ────────────────────────────────────────────────────────────
function escapeSQL(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

function dbQuery(sql) {
  return JSON.parse(execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }));
}

function dbExecute(sql) {
  const raw = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  try { return JSON.parse(raw); } catch { return { status: "ok" }; }
}

// ─── Auth ──────────────────────────────────────────────────────────────────
function generateToken(length = 48) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}
function generateUserId() {
  return crypto.randomBytes(8).toString("hex");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
function validatePlanId(planId) {
  return planId === "assistente-esecutivo" || planId === "ufficio-digitale";
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
  const existing = dbQuery(`SELECT id, email, name, created_at as createdAt,
    plan_id as planId, subscription_id as subscriptionId,
    stripe_customer_id as stripeCustomerId, tone_of_voice as toneOfVoice, status
    FROM users WHERE email = ${escapeSQL(email)}`);
  if (existing.length > 0) return existing[0];
  const id = generateUserId();
  dbExecute(`INSERT INTO users (id, email, name, plan_id, status)
    VALUES (${escapeSQL(id)}, ${escapeSQL(email)}, ${escapeSQL(name)}, ${escapeSQL(planId)}, 'pending')`);
  dbExecute(`INSERT OR IGNORE INTO agent_config (user_id) VALUES (${escapeSQL(id)})`);
  return { id, email, name, createdAt: new Date().toISOString(), planId, subscriptionId: null, stripeCustomerId: null, toneOfVoice: null, status: "pending" };
}

function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  dbExecute(`INSERT INTO sessions (token, user_id, expires_at) VALUES (${escapeSQL(token)}, ${escapeSQL(userId)}, ${escapeSQL(expiresAt)})`);
  return token;
}

function getUserBySession(token) {
  const sessions = dbQuery(`SELECT user_id, expires_at FROM sessions WHERE token = ${escapeSQL(token)}`);
  if (sessions.length === 0) return null;
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) {
    dbExecute(`DELETE FROM sessions WHERE token = ${escapeSQL(token)}`);
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
  if (!match || !/^[a-f0-9]{48}$/.test(match[1])) return null;
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
  try { return JSON.parse((await readBody(req)).toString("utf-8")); } catch { return null; }
}

// ─── Response helpers ──────────────────────────────────────────────────────
function jsonResponse(data, status = 200, origin = "") {
  return { status, headers: corsHeaders(origin), body: JSON.stringify(data) };
}
function errorResponse(msg, status = 400, origin = "") {
  return jsonResponse({ error: msg }, status, origin);
}
function getOrigin(req) { return req.headers["origin"] || ""; }

// ─── Stripe ────────────────────────────────────────────────────────────────
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

// ─── API Route handlers ────────────────────────────────────────────────────
async function handleRegister(req) {
  const origin = getOrigin(req);
  const body = await parseJSONBody(req);
  if (!body || !body.email || !body.name || !body.planId)
    return errorResponse("Campi obbligatori: email, name, planId", 400, origin);
  if (!validateEmail(body.email)) return errorResponse("Email non valida", 400, origin);
  if (!validatePlanId(body.planId)) return errorResponse("PlanId non valido", 400, origin);
  if (!body.name || body.name.length > 100) return errorResponse("Nome non valido", 400, origin);
  await ensureTables();
  const user = findOrCreateUser(body.email, body.name, body.planId);
  const token = createSession(user.id);
  return jsonResponse({ token, user: { id: user.id, email: user.email, name: user.name, planId: user.planId } }, 200, origin);
}

async function handleMe(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  return jsonResponse({ user }, 200, origin);
}

async function handleLogout(req) {
  const origin = getOrigin(req);
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match && /^[a-f0-9]{48}$/.test(match[1]))
      dbExecute(`DELETE FROM sessions WHERE token = ${escapeSQL(match[1])}`);
  }
  return jsonResponse({ success: true }, 200, origin);
}

async function handleCheckout(req) {
  const origin = getOrigin(req);
  const body = await parseJSONBody(req);
  if (!body || !body.planId || !body.email)
    return errorResponse("Campi obbligatori: planId, email", 400, origin);
  if (!validatePlanId(body.planId)) return errorResponse("PlanId non valido", 400, origin);
  if (!validateEmail(body.email)) return errorResponse("Email non valida", 400, origin);
  const PLANS = {
    "assistente-esecutivo": { name: "Assistente Esecutivo", setupFee: 39900, monthlyPrice: 9700 },
    "ufficio-digitale": { name: "L'Ufficio Digitale", setupFee: 99900, monthlyPrice: 29700 },
  };
  try {
    const stripe = await getStripe();
    const plan = PLANS[body.planId];
    const setupPrice = await stripe.prices.create({ unit_amount: plan.setupFee, currency: "eur", product_data: { name: `${plan.name} — Setup` } });
    const monthlyPrice = await stripe.prices.create({ unit_amount: plan.monthlyPrice, currency: "eur", recurring: { interval: "month" }, product_data: { name: `${plan.name} — Abbonamento` } });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: setupPrice.id, quantity: 1 }, { price: monthlyPrice.id, quantity: 1 }],
      customer_email: body.email,
      success_url: "https://app.personaleartificiale.it",
      cancel_url: "https://personaleartificiale.it",
      metadata: { plan_id: body.planId },
      subscription_data: { metadata: { plan_id: body.planId } },
    });
    return jsonResponse({ url: session.url, sessionId: session.id }, 200, origin);
  } catch { return errorResponse("Errore nel pagamento", 500, origin); }
}

async function handleWebhook(req) {
  const rawBody = await readBody(req);
  const signature = req.headers["stripe-signature"];
  if (!signature) return errorResponse("Missing stripe-signature header", 400);
  try {
    const stripe = await getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const planId = s.metadata?.plan_id;
      if (validatePlanId(planId) && s.customer_email) {
        await ensureTables();
        const user = findOrCreateUser(s.customer_email, s.customer_email.split("@")[0] || "User", planId);
        dbExecute(`UPDATE users SET subscription_id = ${escapeSQL(s.subscription)}, stripe_customer_id = ${escapeSQL(s.customer)}, stripe_checkout_session_id = ${escapeSQL(s.id)}, status = 'active' WHERE id = ${escapeSQL(user.id)}`);
      }
    }
    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const status = sub.status === "active" ? "active" : sub.status === "canceled" ? "cancelled" : "pending";
      dbExecute(`UPDATE users SET status = ${escapeSQL(status)} WHERE subscription_id = ${escapeSQL(sub.id)}`);
    }
    return jsonResponse({ received: true }, 200);
  } catch { return errorResponse("Webhook error", 400); }
}

async function handleGetAgentConfig(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const configs = dbQuery(`SELECT tone_of_voice, role_description FROM agent_config WHERE user_id = ${escapeSQL(user.id)}`);
  if (configs.length === 0) return jsonResponse({ config: null }, 200, origin);
  return jsonResponse({ config: { toneOfVoice: configs[0].tone_of_voice, roleDescription: configs[0].role_description } }, 200, origin);
}

async function handleUpdateAgentConfig(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const body = await parseJSONBody(req);
  if (!body) return errorResponse("JSON non valido", 400, origin);
  const tone = (body.toneOfVoice || "").slice(0, 500);
  const role = (body.roleDescription || "").slice(0, 500);
  dbExecute(`INSERT INTO agent_config (user_id, tone_of_voice, role_description, created_at, updated_at)
    VALUES (${escapeSQL(user.id)}, ${escapeSQL(tone)}, ${escapeSQL(role)}, datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET tone_of_voice = ${escapeSQL(tone)}, role_description = ${escapeSQL(role)}, updated_at = datetime('now')`);
  return jsonResponse({ success: true }, 200, origin);
}

async function handleListKnowledge(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  const files = [];
  try {
    for (const entry of await readdir(tenantDir, { withFileTypes: true })) {
      if (entry.isFile() && [".pdf", ".doc", ".docx", ".txt", ".md"].includes(path.extname(entry.name).toLowerCase())) {
        const ts = parseInt(entry.name.split("-")[0], 10) || Date.now();
        files.push({ id: `file-${ts}`, originalName: entry.name.replace(/^\d+-/, ""), fileName: entry.name, ext: path.extname(entry.name), uploadedAt: new Date(ts).toISOString() });
      }
    }
  } catch {}
  return jsonResponse({ files }, 200, origin);
}

async function handleUploadKnowledge(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const raw = await readBody(req);
  if (raw.length > 20 * 1024 * 1024) return errorResponse("File troppo grande (max 20MB)", 413, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  await mkdir(tenantDir, { recursive: true });
  const ALLOWED = [".pdf", ".doc", ".docx", ".txt", ".md"];
  const originalName = req.headers["x-filename"] || `upload-${Date.now()}`;
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED.includes(ext)) return errorResponse(`Formato non supportato: ${ext}`, 400, origin);
  const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(path.join(tenantDir, safeName), raw);
  return jsonResponse({ file: { id: `file-${Date.now()}`, originalName, fileName: safeName, ext } }, 200, origin);
}

async function handleDeleteKnowledge(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const fileId = new URL(req.url, `http://localhost`).searchParams.get("id");
  if (!fileId) return errorResponse("Missing file id", 400, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  if (!tenantDir.startsWith(UPLOADS_BASE)) return errorResponse("Accesso negato", 403, origin);
  try {
    for (const entry of await readdir(tenantDir)) {
      if (entry.startsWith(fileId.replace("file-", ""))) {
        await unlink(path.join(tenantDir, entry));
        return jsonResponse({ success: true }, 200, origin);
      }
    }
  } catch {}
  return errorResponse("File non trovato", 404, origin);
}

async function handleGetAgentStats(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  let fileCount = 0;
  try {
    for (const e of await readdir(tenantDir, { withFileTypes: true }))
      if (e.isFile() && [".pdf", ".doc", ".docx", ".txt", ".md"].includes(path.extname(e.name).toLowerCase())) fileCount++;
  } catch {}
  return jsonResponse({ stats: { totalMessages: 0, totalTasksCompleted: 0, filesInKnowledgeBase: fileCount, activeSince: new Date().toISOString() } }, 200, origin);
}

async function handleAgentStatus(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  return jsonResponse({ status: "online", agentId: user.id, lastActive: new Date().toISOString() }, 200, origin);
}

async function handleGetToneOfVoice(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const configs = dbQuery(`SELECT tone_of_voice FROM agent_config WHERE user_id = ${escapeSQL(user.id)}`);
  return jsonResponse({ toneOfVoice: configs.length > 0 ? configs[0].tone_of_voice : "Professionale, cortese e amichevole" }, 200, origin);
}

async function handleUpdateToneOfVoice(req) {
  const origin = getOrigin(req);
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Non autorizzato", 401, origin);
  const body = await parseJSONBody(req);
  if (!body || !body.toneOfVoice) return errorResponse("Missing toneOfVoice", 400, origin);
  dbExecute(`UPDATE agent_config SET tone_of_voice = ${escapeSQL(body.toneOfVoice.slice(0, 500))}, updated_at = datetime('now') WHERE user_id = ${escapeSQL(user.id)}`);
  return jsonResponse({ success: true }, 200, origin);
}

function handleHealth(req) {
  return jsonResponse({ status: "ok", timestamp: new Date().toISOString() }, 200, getOrigin(req));
}

function handlePlans(req) {
  return jsonResponse({ plans: [
    { id: "assistente-esecutivo", name: "Assistente Esecutivo", setupFee: 39900, monthlyPrice: 9700, description: "Per freelance e artigiani" },
    { id: "ufficio-digitale", name: "L'Ufficio Digitale", setupFee: 99900, monthlyPrice: 29700, description: "Per PMI, agenzie e studi professionali" },
  ]}, 200, getOrigin(req));
}

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
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

const UPLOADS_BASE = process.env.UPLOADS_DIR || "/home/team/shared/uploads";

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      const headers = corsHeaders(getOrigin(req));
      res.writeHead(204, { ...headers, "Content-Length": "0" });
      res.end(); return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

    // Rate limiting on auth endpoints
    if (pathname.startsWith("/api/auth/") && !rateLimit(clientIp)) {
      const r = jsonResponse({ error: "Troppe richieste. Riprova tra un minuto." }, 429, getOrigin(req));
      res.writeHead(r.status, r.headers); res.end(r.body); return;
    }

    // ── API Routes ──────────────────────────────────────────────────────────
    if (pathname.startsWith("/api/")) {
      const routeKey = `${req.method} ${pathname}`;
      const handler = API_ROUTES[routeKey];
      if (handler) {
        const result = await handler(req);
        res.writeHead(result.status, result.headers);
        res.end(result.body || ""); return;
      }
      if (req.method === "DELETE" && pathname.startsWith("/api/agent/knowledge")) {
        const result = await handleDeleteKnowledge(req);
        res.writeHead(result.status, result.headers); res.end(result.body || ""); return;
      }
      const r = jsonResponse({ error: "API route not found" }, 404, getOrigin(req));
      res.writeHead(r.status, r.headers); res.end(r.body); return;
    }

    // ── Static files (dashboard SPA) ─────────────────────────────────────────
    const filePath = pathname === "/" ? path.join(CLIENT_DIR, "index.html") : path.join(CLIENT_DIR, pathname);
    if (filePath.startsWith(CLIENT_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(content); return;
    }

    // ── Fallback: serve dashboard SPA for all routes (SPA routing) ──────────
    const indexPath = path.join(CLIENT_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(content);
    } else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Personale Artificiale</h1><p>Dashboard in caricamento...</p>");
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
  console.log(`Personale Artificiale App serving on http://${HOST}:${PORT}`);
  console.log(`API routes at http://${HOST}:${PORT}/api/*`);
});