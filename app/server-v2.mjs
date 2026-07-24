import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatchApi } from "./runtime/api.mjs";
import { closeDatabase, migrate } from "./runtime/db.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const CLIENT_DIR = path.resolve(__dirname, "dist/client");
const rateLimits = new Map();
const API_WINDOW_MS = 15 * 60_000;
const API_LIMIT = Number(process.env.API_RATE_LIMIT || 600);
const AUTH_LIMIT = Number(process.env.AUTH_RATE_LIMIT || 20);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
  };
}

function writeResult(res, result) {
  res.writeHead(result.status, { ...securityHeaders(), ...result.headers });
  res.end(result.body ?? "");
}

function findClientAsset(prefix, suffix) {
  const assetsDir = path.join(CLIENT_DIR, "assets");
  try {
    return fs.readdirSync(assetsDir).find((name) => name.startsWith(prefix) && name.endsWith(suffix));
  } catch {
    return null;
  }
}

function dashboardShellHtml() {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dashboard | Personale Artificiale</title>
    <meta name="robots" content="noindex" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 15% 0%, rgba(37,99,235,.36), transparent 30%), #05070b; color: white; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      header { border-bottom: 1px solid rgba(255,255,255,.1); background: rgba(8,11,17,.9); }
      .wrap { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
      .top { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .brand { display: flex; align-items: center; gap: 10px; font-weight: 950; }
      .logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 14px; background: white; color: #0f172a; font-weight: 950; }
      main { padding: 34px 0 70px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .card { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); border-radius: 28px; padding: 24px; box-shadow: 0 24px 70px rgba(0,0,0,.25); }
      .full { grid-column: 1 / -1; }
      h1 { margin: 0; font-size: clamp(30px, 5vw, 52px); line-height: 1; letter-spacing: -.045em; }
      h2 { margin: 0 0 12px; font-size: 22px; }
      p { color: #cbd5e1; line-height: 1.65; }
      label { display: block; margin: 12px 0 6px; color: #94a3b8; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
      input, textarea, select { width: 100%; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: rgba(0,0,0,.24); color: white; padding: 12px 14px; font: inherit; }
      textarea { min-height: 90px; resize: vertical; }
      button, .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; border: 0; border-radius: 999px; background: #2563eb; color: white; padding: 0 18px; font-weight: 900; cursor: pointer; text-decoration: none; }
      button.secondary { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); }
      button:disabled { opacity: .55; cursor: wait; }
      .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .muted { color: #94a3b8; font-size: 14px; }
      .alert { margin: 14px 0; border: 1px solid rgba(248,113,113,.32); background: rgba(239,68,68,.12); color: #fecaca; border-radius: 16px; padding: 12px 14px; }
      .ok { border-color: rgba(52,211,153,.28); background: rgba(16,185,129,.1); color: #bbf7d0; }
      .plan { display: flex; flex-direction: column; gap: 10px; }
      .price { font-size: 34px; font-weight: 950; }
      .qr { max-width: 260px; padding: 12px; border-radius: 18px; background: white; }
      .hidden { display: none; }
      @media (max-width: 850px) { .grid { grid-template-columns: 1fr; } .full { grid-column: auto; } }
    </style>
  </head>
  <body>
    <header><div class="wrap top"><div class="brand"><span class="logo">PA</span> Personale Artificiale</div><button id="logout" class="secondary hidden">Esci</button></div></header>
    <main class="wrap">
      <section class="card full"><h1>Area clienti e configurazione bot AI</h1><p>Fallback operativo: registrazione, scelta piano, onboarding e QR WhatsApp restano disponibili anche se il renderer principale è temporaneamente degradato.</p><div id="message"></div></section>
      <div id="app" class="grid"></div>
    </main>
    <script>
      const TOKEN_KEY = 'pa_session';
      let token = sessionStorage.getItem(TOKEN_KEY) || '';
      let user = null;
      let plans = [];
      const app = document.getElementById('app');
      const msg = document.getElementById('message');
      const logoutBtn = document.getElementById('logout');
      function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
      function show(text, ok=false){ msg.innerHTML = text ? '<div class="alert '+(ok?'ok':'')+'">'+esc(text)+'</div>' : ''; }
      async function api(path, options){
        const headers = new Headers((options && options.headers) || {});
        if (token) headers.set('Authorization', 'Bearer ' + token);
        if (options && options.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
        const res = await fetch(path, Object.assign({credentials:'same-origin'}, options || {}, {headers}));
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || 'Operazione non riuscita');
        return payload;
      }
      function formValue(form, name){ return new FormData(form).get(name) || ''; }
      async function load(){
        try { plans = (await api('/api/plans', {headers:{}})).plans || []; } catch(e) {}
        if (token) { try { user = (await api('/api/auth/me')).user; } catch(e) { token=''; sessionStorage.removeItem(TOKEN_KEY); } }
        logoutBtn.classList.toggle('hidden', !user);
        render();
      }
      function render(){ if (!user) return renderAuth(); if (user.status !== 'active') return renderPlans(); if (!user.onboardingComplete) return renderOnboarding(); return renderDashboard(); }
      function renderAuth(){
        app.innerHTML = '<section class="card"><h2>Crea account</h2><form id="register"><label>Nome</label><input name="name" required placeholder="Mario Rossi"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" minlength="8" required><label class="muted"><input name="terms" type="checkbox" required style="width:auto"> Accetto termini e privacy</label><button>Crea account</button></form></section><section class="card"><h2>Accedi</h2><form id="login"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><button>Accedi</button></form></section>';
        document.getElementById('register').onsubmit = async e => { e.preventDefault(); try { const f=e.currentTarget; const r=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:formValue(f,'name'),email:formValue(f,'email'),password:formValue(f,'password'),termsAccepted:true})}); token=r.token; sessionStorage.setItem(TOKEN_KEY, token); user=r.user; show('Account creato', true); render(); } catch(err){ show(err.message); } };
        document.getElementById('login').onsubmit = async e => { e.preventDefault(); try { const f=e.currentTarget; const r=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:formValue(f,'email'),password:formValue(f,'password')})}); token=r.token; sessionStorage.setItem(TOKEN_KEY, token); user=r.user; show('Accesso riuscito', true); render(); } catch(err){ show(err.message); } };
      }
      function renderPlans(){
        app.innerHTML = '<section class="card full"><h2>Scegli piano</h2><p class="muted">Dopo il pagamento completi dati azienda, knowledge base e WhatsApp.</p><div class="grid">'+plans.map(p => '<article class="card plan"><h2>'+esc(p.name)+'</h2><p>'+esc(p.description)+'</p><div class="price">'+esc(p.monthlyPriceFormatted)+'</div><p class="muted">+ '+esc(p.setupFeeFormatted)+' setup</p><button data-plan="'+esc(p.id)+'">Scegli questo piano</button></article>').join('')+'</div></section>';
        app.querySelectorAll('[data-plan]').forEach(b => b.onclick = async () => { try { b.disabled=true; const r=await api('/api/stripe/checkout',{method:'POST',body:JSON.stringify({planId:b.dataset.plan})}); location.assign(r.url); } catch(err){ show(err.message); b.disabled=false; } });
      }
      function renderOnboarding(){
        app.innerHTML = '<section class="card full"><h2>Configura il tuo assistente</h2><form id="onboarding" class="grid"><div><label>Azienda *</label><input name="companyName" required><label>Settore *</label><input name="industry" required><label>Email contatto *</label><input name="contactEmail" type="email" required><label>Telefono</label><input name="contactPhone"></div><div><label>Descrizione attività *</label><textarea name="businessDescription" required></textarea><label>Prodotti/servizi *</label><textarea name="productsServices" required></textarea><label>Clienti ideali *</label><textarea name="targetAudience" required></textarea></div><div><label>Obiettivi *</label><textarea name="mainGoals" required></textarea><label>Tono di voce *</label><textarea name="toneOfVoice" required>Professionale, chiaro e utile</textarea><label>Nome assistente</label><input name="agentName" value="Arianna"></div><div><label>Regole/escalation</label><textarea name="escalationRules"></textarea><label>Limiti</label><textarea name="forbiddenTopics"></textarea><label>Orari</label><input name="openingHours"></div><div class="full"><button>Salva e vai alla dashboard</button></div></form></section>';
        document.getElementById('onboarding').onsubmit = async e => { e.preventDefault(); try { const f=e.currentTarget; const data=Object.fromEntries(new FormData(f).entries()); data.website=''; data.vatNumber=''; data.address=''; data.competitors=''; data.differentiators=''; data.commonQuestions=''; data.policies=''; data.preferredLanguage='Italiano'; data.roleDescription='Assistente AI commerciale e operativo'; await api('/api/onboarding',{method:'PUT',body:JSON.stringify({data,complete:true})}); user=(await api('/api/auth/me')).user; show('Configurazione salvata', true); render(); } catch(err){ show(err.message); } };
      }
      async function renderDashboard(){
        app.innerHTML = '<section class="card"><h2>Dashboard</h2><p>Account operativo per '+esc(user.email)+'</p><button id="wa">Attiva WhatsApp / mostra QR</button><div id="waBox"></div></section><section class="card"><h2>Verifica assistente</h2><form id="chat"><label>Domanda</label><input name="q" placeholder="Cosa vendiamo?"><button>Chiedi</button></form><pre id="answer" class="muted"></pre></section>';
        document.getElementById('wa').onclick = async () => { try { const r=await api('/api/whatsapp/provision',{method:'POST'}); const s=r.session; document.getElementById('waBox').innerHTML='<p>Stato: '+esc(s.status)+'<br>Istanza: '+esc(s.instanceName||'')+'</p>'+(s.qrCode?'<img class="qr" alt="QR WhatsApp" src="'+(s.qrCode.startsWith('data:')?s.qrCode:'data:image/png;base64,'+s.qrCode)+'">':'')+(s.lastError?'<div class="alert">'+esc(s.lastError)+'</div>':''); } catch(err){ show(err.message); } };
        document.getElementById('chat').onsubmit = async e => { e.preventDefault(); try { const q=formValue(e.currentTarget,'q'); const r=await api('/api/assistant/chat',{method:'POST',body:JSON.stringify({query:q})}); document.getElementById('answer').textContent=r.answer; } catch(err){ show(err.message); } };
      }
      logoutBtn.onclick = async () => { try { await api('/api/auth/logout',{method:'POST'}); } catch(e) {} token=''; user=null; sessionStorage.removeItem(TOKEN_KEY); show('Logout effettuato', true); render(); };
      load();
    </script>
  </body>
</html>`;
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function allowedOrigins(req) {
  const rawHost = req.headers.host;
  const hostHttps = rawHost ? "https://" + rawHost : null;
  const hostHttp = rawHost ? "http://" + rawHost : null;
  return new Set([
    hostHttps,
    process.env.NODE_ENV !== "production" ? hostHttp : null,
    process.env.APP_URL,
    process.env.WWW_URL,
  ].filter(Boolean).map((value) => String(value).replace(/\/+$/, "")));
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return allowedOrigins(req).has(String(origin).replace(/\/+$/, ""));
}

function incrementLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || now > current.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function authRateLimited(req, pathname) {
  if (!["/api/auth/login", "/api/auth/register"].includes(pathname)) return false;
  return incrementLimit(clientIp(req) + ":" + pathname, AUTH_LIMIT, API_WINDOW_MS);
}

function apiRateLimited(req, pathname) {
  if (pathname === "/api/health" || pathname === "/api/stripe/webhook" || pathname === "/api/evolution/webhook") return false;
  return incrementLimit(clientIp(req) + ":api", API_LIMIT, API_WINDOW_MS);
}

async function collectRequestBody(req, max = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

let ssrHandler = null;
try {
  const module = await import("./dist/server/server.js");
  const candidate = module.default || module;
  ssrHandler =
    typeof candidate === "function" ? candidate :
    typeof candidate?.fetch === "function" ? candidate.fetch.bind(candidate) :
    typeof candidate?.default?.fetch === "function" ? candidate.default.fetch.bind(candidate.default) :
    null;
} catch (error) {
  console.error("[startup] SSR bundle non disponibile:", error.message);
}

await migrate();
console.log("[startup] Migrazioni PostgreSQL completate");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://" + (req.headers.host || "localhost"));
    const pathname = url.pathname;

    if (pathname === "/") {
      res.writeHead(307, { ...securityHeaders(), Location: "/dashboard" });
      res.end();
      return;
    }

    if (pathname.startsWith("/api/")) {
      if (!originAllowed(req)) {
        writeResult(res, {
          status: 403,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ error: "Origine richiesta non autorizzata." }),
        });
        return;
      }
      if (apiRateLimited(req, pathname)) {
        writeResult(res, {
          status: 429,
          headers: { "Content-Type": "application/json; charset=utf-8", "Retry-After": "900" },
          body: JSON.stringify({ error: "Troppe richieste. Riprova tra qualche minuto." }),
        });
        return;
      }
      if (authRateLimited(req, pathname)) {
        writeResult(res, {
          status: 429,
          headers: { "Content-Type": "application/json; charset=utf-8", "Retry-After": "900" },
          body: JSON.stringify({ error: "Troppi tentativi. Riprova tra qualche minuto." }),
        });
        return;
      }
      writeResult(res, await dispatchApi(req, url));
      return;
    }

    if (pathname !== "/") {
      let decodedPath;
      try { decodedPath = decodeURIComponent(pathname); } catch { decodedPath = pathname; }
      const filePath = path.resolve(CLIENT_DIR, "." + decodedPath);
      if (filePath.startsWith(CLIENT_DIR + path.sep) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const extension = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          ...securityHeaders(),
          "Content-Type": MIME[extension] || "application/octet-stream",
          "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    if (req.method === "HEAD" && pathname === "/dashboard") {
      res.writeHead(200, { ...securityHeaders(), "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      res.end();
      return;
    }

    if (!ssrHandler) {
      res.writeHead(503, { ...securityHeaders(), "Content-Type": "text/plain; charset=utf-8" });
      res.end("Applicazione temporaneamente non disponibile.");
      return;
    }

    const protocol = String(req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http")).split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
      else if (value != null) headers.set(key, String(value));
    }

    let body;
    if (!["GET", "HEAD"].includes(req.method || "GET")) body = await collectRequestBody(req);
    const request = new Request(protocol + "://" + host + (req.url || "/"), {
      method: req.method,
      headers,
      body,
    });
    const response = await ssrHandler(request);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const responseBody = Buffer.from(await response.arrayBuffer());
    if (pathname === "/dashboard" && response.status >= 500 && /application\/json/i.test(responseHeaders["content-type"] || "") && responseBody.includes("HTTPError")) {
      res.writeHead(200, {
        ...securityHeaders(),
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
        "X-SSR-Fallback": "app-http-error",
      });
      res.end(dashboardShellHtml());
      return;
    }
    res.writeHead(response.status, { ...securityHeaders(), ...responseHeaders });
    res.end(responseBody);
  } catch (error) {
    console.error("[request]", error);
    if (!res.headersSent) {
      res.writeHead(500, { ...securityHeaders(), "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Errore interno del server." }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log("[startup] Personale Artificiale su http://" + HOST + ":" + PORT);
});

async function shutdown(signal) {
  console.log("[shutdown] " + signal);
  server.close(async () => {
    await closeDatabase().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

