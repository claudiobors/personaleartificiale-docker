/**
 * Production server for Personale Artificiale.
 * Serves:
 * 1. API routes (/api/*) — handled natively with Node.js
 * 2. Static assets from ./dist/client/
 * 3. TanStack Start SSR handler for everything else
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { writeFile, unlink, mkdir, readdir } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";
const CLIENT_DIR = path.resolve(__dirname, "dist/client");
const UPLOADS_BASE = process.env.UPLOADS_DIR || "/home/team/shared/uploads";

// Lazy-load Stripe (only when an API route needs it)
let _stripe = null;
async function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    const Stripe = (await import("stripe")).default;
    _stripe = new Stripe(key, { apiVersion: "2025-04-30" });
  }
  return _stripe;
}

// ─── DB helper ───────────────────────────────────────────────────────────────
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

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function generateToken(length = 48) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
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
    FROM users WHERE email = '${safeEmail}'`);
  if (existing.length > 0) return existing[0];
  const id = generateToken(12);
  dbExecute(`INSERT INTO users (id, email, name, plan_id, status)
    VALUES ('${id}', '${safeEmail}', '${name.replace(/'/g, "''")}', '${planId}', 'pending')`);
  dbExecute(`INSERT OR IGNORE INTO agent_config (user_id) VALUES ('${id}')`);
  return { id, email, name, createdAt: new Date().toISOString(), planId, subscriptionId: null, stripeCustomerId: null, toneOfVoice: null, status: "pending" };
}

function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  dbExecute(`INSERT INTO sessions (token, user_id, expires_at) VALUES ('${token}', '${userId}', '${expiresAt}')`);
  return token;
}

function getUserBySession(token) {
  const sessions = dbQuery(`SELECT user_id, expires_at FROM sessions WHERE token = '${token.replace(/'/g, "''")}'`);
  if (sessions.length === 0) return null;
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) {
    dbExecute(`DELETE FROM sessions WHERE token = '${token.replace(/'/g, "''")}'`);
    return null;
  }
  const users = dbQuery(`SELECT id, email, name, created_at as createdAt,
    plan_id as planId, subscription_id as subscriptionId,
    stripe_customer_id as stripeCustomerId, tone_of_voice as toneOfVoice, status
    FROM users WHERE id = '${session.user_id.replace(/'/g, "''")}'`);
  return users.length > 0 ? users[0] : null;
}

function getUserFromAuthHeader(req) {
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return getUserBySession(match[1]);
}

// ─── Body parser ──────────────────────────────────────────────────────────────
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

// ─── Response helpers ────────────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  const body = JSON.stringify(data);
  return { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body };
}

function errorResponse(msg, status = 400) {
  return jsonResponse({ error: msg }, status);
}

// ─── API Route handlers ──────────────────────────────────────────────────────

// POST /api/auth/register
async function handleRegister(req) {
  const body = await parseJSONBody(req);
  if (!body || !body.email || !body.name || !body.planId) {
    return errorResponse("Missing required fields: email, name, planId");
  }
  if (body.planId !== "assistente-esecutivo" && body.planId !== "ufficio-digitale") {
    return errorResponse("Invalid planId");
  }
  await ensureTables();
  const user = findOrCreateUser(body.email, body.name, body.planId);
  const token = createSession(user.id);
  return jsonResponse({ token, user: { id: user.id, email: user.email, name: user.name, planId: user.planId } });
}

// GET /api/auth/me
async function handleMe(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  return jsonResponse({ user });
}

// POST /api/stripe/checkout
async function handleCheckout(req) {
  const body = await parseJSONBody(req);
  if (!body || !body.planId || !body.email) {
    return errorResponse("Missing required fields: planId, email");
  }
  if (body.planId !== "assistente-esecutivo" && body.planId !== "ufficio-digitale") {
    return errorResponse("Invalid planId");
  }
  const PLANS = {
    "assistente-esecutivo": { name: "Assistente Esecutivo", setupFee: 39900, monthlyPrice: 9700 },
    "ufficio-digitale": { name: "L'Ufficio Digitale", setupFee: 99900, monthlyPrice: 29700 },
  };
  const plan = PLANS[body.planId];
  const stripe = getStripe();
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
    success_url: body.successUrl || "https://personaleartificiale.it/dashboard",
    cancel_url: body.cancelUrl || "https://personaleartificiale.it",
    metadata: { plan_id: body.planId },
    subscription_data: { metadata: { plan_id: body.planId } },
  });
  return jsonResponse({ url: session.url, sessionId: session.id });
}

// POST /api/stripe/webhook
async function handleWebhook(req) {
  const rawBody = await readBody(req);
  const signature = req.headers["stripe-signature"];
  if (!signature) return errorResponse("Missing stripe-signature header");
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const planId = session.metadata?.plan_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const email = session.customer_email || session.customer_details?.email;
        if (email) {
          await ensureTables();
          const user = findOrCreateUser(email, email.split("@")[0] || "User", planId || "assistente-esecutivo");
          dbExecute(`UPDATE users SET subscription_id = '${subscriptionId}',
            stripe_customer_id = '${customerId}', stripe_checkout_session_id = '${session.id}',
            status = 'active' WHERE id = '${user.id}'`);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const status = sub.status === "active" ? "active" : sub.status === "canceled" ? "cancelled" : "pending";
        dbExecute(`UPDATE users SET status = '${status}' WHERE subscription_id = '${sub.id}'`);
        break;
      }
    }
    return jsonResponse({ received: true });
  } catch (err) {
    return errorResponse(`Webhook error: ${err.message}`, 400);
  }
}

// GET /api/agent/config
async function handleGetAgentConfig(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const configs = dbQuery(`SELECT tone_of_voice, role_description FROM agent_config WHERE user_id = '${user.id.replace(/'/g, "''")}'`);
  if (configs.length === 0) return jsonResponse({ config: null });
  return jsonResponse({ config: { toneOfVoice: configs[0].tone_of_voice, roleDescription: configs[0].role_description } });
}

// PUT /api/agent/config
async function handleUpdateAgentConfig(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const body = await parseJSONBody(req);
  if (!body) return errorResponse("Invalid JSON body");
  const tone = (body.toneOfVoice || "").replace(/'/g, "''");
  const role = (body.roleDescription || "").replace(/'/g, "''");
  dbExecute(`INSERT INTO agent_config (user_id, tone_of_voice, role_description, created_at, updated_at)
    VALUES ('${user.id}', '${tone}', '${role}', datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET tone_of_voice = '${tone}', role_description = '${role}', updated_at = datetime('now')`);
  return jsonResponse({ success: true });
}

// GET /api/agent/knowledge
async function handleListKnowledge(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
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
  } catch {
    // Directory doesn't exist yet — no files
  }
  return jsonResponse({ files });
}

// POST /api/agent/knowledge
async function handleUploadKnowledge(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const raw = await readBody(req);
  const contentType = req.headers["content-type"] || "";
  // Handle multipart or raw file upload
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  await mkdir(tenantDir, { recursive: true });
  if (contentType.includes("multipart/form-data")) {
    // Simple multipart parser — extract filename and content
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) return errorResponse("Missing boundary in multipart");
    // Extract the first file from multipart
    const parts = raw.toString("binary").split(`--${boundary}`);
    for (const part of parts) {
      const filenameMatch = part.match(/filename="(.+?)"/);
      if (filenameMatch) {
        const originalName = filenameMatch[1];
        const bodyStart = part.indexOf("\r\n\r\n") + 4;
        const fileContent = part.substring(bodyStart, part.lastIndexOf("\r\n--"));
        const ext = path.extname(originalName).toLowerCase();
        if (![".pdf", ".doc", ".docx", ".txt", ".md"].includes(ext)) continue;
        const timestamp = Date.now();
        const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        await writeFile(path.join(tenantDir, safeName), Buffer.from(fileContent, "binary"));
        return jsonResponse({ file: { id: `file-${timestamp}`, originalName, fileName: safeName, ext } });
      }
    }
    return errorResponse("No file found in upload");
  } else {
    // Raw binary upload — use X-Filename header
    const originalName = req.headers["x-filename"] || `upload-${Date.now()}`;
    const ext = path.extname(originalName).toLowerCase();
    if (![".pdf", ".doc", ".docx", ".txt", ".md"].includes(ext)) {
      return errorResponse(`Formato non supportato: ${ext}`);
    }
    const timestamp = Date.now();
    const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(path.join(tenantDir, safeName), raw);
    return jsonResponse({ file: { id: `file-${timestamp}`, originalName, fileName: safeName, ext } });
  }
}

// DELETE /api/agent/knowledge
async function handleDeleteKnowledge(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const fileId = url.searchParams.get("id");
  if (!fileId) return errorResponse("Missing file id query param");
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  try {
    const entries = await readdir(tenantDir);
    for (const entry of entries) {
      if (entry.startsWith(fileId.replace("file-", ""))) {
        await unlink(path.join(tenantDir, entry));
        return jsonResponse({ success: true });
      }
    }
  } catch { /* file not found */ }
  return errorResponse("File not found", 404);
}

// GET /api/agent/stats
async function handleGetAgentStats(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const tenantDir = path.join(UPLOADS_BASE, user.id);
  let fileCount = 0;
  try {
    const entries = await readdir(tenantDir, { withFileTypes: true });
    fileCount = entries.filter(e => e.isFile() && [".pdf", ".doc", ".docx", ".txt", ".md"].includes(path.extname(e.name).toLowerCase())).length;
  } catch { /* no files */ }
  return jsonResponse({ stats: { totalMessages: 0, totalTasksCompleted: 0, filesInKnowledgeBase: fileCount, activeSince: new Date().toISOString() } });
}

// GET /api/agent/status
async function handleAgentStatus(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  return jsonResponse({ status: "online", agentId: user.id, lastActive: new Date().toISOString() });
}

// GET /api/config/tone-of-voice
async function handleGetToneOfVoice(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const configs = dbQuery(`SELECT tone_of_voice FROM agent_config WHERE user_id = '${user.id.replace(/'/g, "''")}'`);
  const toneOfVoice = configs.length > 0 ? configs[0].tone_of_voice : "Professionale, cortese e amichevole";
  return jsonResponse({ toneOfVoice });
}

// PUT /api/config/tone-of-voice
async function handleUpdateToneOfVoice(req) {
  const user = getUserFromAuthHeader(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const body = await parseJSONBody(req);
  if (!body || !body.toneOfVoice) return errorResponse("Missing toneOfVoice");
  const safe = body.toneOfVoice.replace(/'/g, "''");
  dbExecute(`UPDATE agent_config SET tone_of_voice = '${safe}', updated_at = datetime('now') WHERE user_id = '${user.id}'`);
  return jsonResponse({ success: true });
}

// POST /api/whatsapp/webhook
async function handleWhatsAppWebhook(req) {
  const body = await parseJSONBody(req);
  if (!body) return errorResponse("Invalid JSON");
  // Echo back for now — actual WhatsApp integration is handled by the AI Agent Engineer
  return jsonResponse({ status: "received", messageId: body.messageId || null });
}

// GET /api/plans
async function handlePlans(req) {
  return jsonResponse({
    plans: [
      { id: "assistente-esecutivo", name: "Assistente Esecutivo", setupFee: 39900, monthlyPrice: 9700, description: "Per freelance e artigiani" },
      { id: "ufficio-digitale", name: "L'Ufficio Digitale", setupFee: 99900, monthlyPrice: 29700, description: "Per PMI, agenzie e studi professionali" },
    ],
  });
}

// GET /api/health
function handleHealth() {
  return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
}

// ─── API Router ───────────────────────────────────────────────────────────────
const API_ROUTES = {
  // Auth
  "GET /api/health": handleHealth,
  "GET /api/plans": handlePlans,
  "POST /api/auth/register": handleRegister,
  "GET /api/auth/me": handleMe,
  // Stripe
  "POST /api/stripe/checkout": handleCheckout,
  "POST /api/stripe/webhook": handleWebhook,
  // Agent
  "GET /api/agent/config": handleGetAgentConfig,
  "PUT /api/agent/config": handleUpdateAgentConfig,
  "GET /api/agent/knowledge": handleListKnowledge,
  "POST /api/agent/knowledge": handleUploadKnowledge,
  "DELETE /api/agent/knowledge": handleDeleteKnowledge,
  "GET /api/agent/stats": handleGetAgentStats,
  "GET /api/agent/status": handleAgentStatus,
  // Config
  "GET /api/config/tone-of-voice": handleGetToneOfVoice,
  "PUT /api/config/tone-of-voice": handleUpdateToneOfVoice,
  // WhatsApp
  "POST /api/whatsapp/webhook": handleWhatsAppWebhook,
};

// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webp": "image/webp", ".woff": "font/woff",
  ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

// ─── Main server ─────────────────────────────────────────────────────────────
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
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // ── 1. API Routes ────────────────────────────────────────────────────────
    if (pathname.startsWith("/api/")) {
      const routeKey = `${req.method} ${pathname}`;
      const handler = API_ROUTES[routeKey];
      if (handler) {
        const result = await handler(req);
        if (result.body) {
          res.writeHead(result.status, result.headers);
          res.end(result.body);
        } else {
          res.writeHead(result.status, result.headers);
          res.end();
        }
        return;
      }
      // Try prefix matching for routes with path parameters
      const method = req.method;
      if (method === "DELETE" && pathname.startsWith("/api/agent/knowledge")) {
        const result = await handleDeleteKnowledge(req);
        res.writeHead(result.status, result.headers);
        res.end(result.body);
        return;
      }
      // No matching API route — 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API route not found", path: pathname }));
      return;
    }

    // ── 2. Static files ─────────────────────────────────────────────────────
    if (pathname !== "/") {
      const filePath = path.join(CLIENT_DIR, pathname === "/" ? "index.html" : pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || "application/octet-stream";
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": mimeType });
        res.end(content);
        return;
      }
    }

    // ── 3. SSR fallback ─────────────────────────────────────────────────────
    if (ssrHandler) {
      const protocol = req.socket?.encrypted ? "https" : "http";
      const requestUrl = `${protocol}://${req.headers.host || "localhost"}${req.url}`;
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
      // No SSR handler — serve index.html as SPA fallback
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
      res.end(JSON.stringify({ error: "Internal Server Error", detail: err.message }));
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Personale Artificiale serving on http://${HOST}:${PORT}`);
  console.log(`API routes available at http://${HOST}:${PORT}/api/*`);
});