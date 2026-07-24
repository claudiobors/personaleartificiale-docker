/**
 * Personale Artificiale — www Server
 * Serves built TanStack Start assets and SSR routes.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";
const CLIENT_DIR = path.resolve(__dirname, "dist/client");

const MIME_TYPES = {
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
  console.error("[startup] SSR bundle www non disponibile:", error.message);
}

function write(res, status, headers = {}, body = "", method = "GET") {
  res.writeHead(status, headers);
  res.end(method === "HEAD" ? undefined : body);
}

function serveStatic(req, res, pathname) {
  let decodedPath;
  try { decodedPath = decodeURIComponent(pathname); } catch { decodedPath = pathname; }
  const filePath = path.resolve(CLIENT_DIR, "." + decodedPath);
  if (!filePath.startsWith(CLIENT_DIR + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  if (req.method === "HEAD") {
    res.end();
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
  return true;
}

function fallbackHtml() {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Personale Artificiale | Bot AI per vendere e rispondere ai clienti</title>
    <meta name="description" content="Configuriamo bot AI e assistenti WhatsApp su misura per aziende, studi e professionisti." />
    <style>
      :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; background: radial-gradient(circle at 15% 0%, rgba(37,99,235,.45), transparent 30%), radial-gradient(circle at 85% 20%, rgba(16,185,129,.18), transparent 28%), #05070b; color: white; }
      a { color: inherit; }
      .wrap { width: min(1120px, calc(100% - 36px)); margin: 0 auto; }
      header { padding: 22px 0; border-bottom: 1px solid rgba(255,255,255,.1); }
      nav { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .brand { display: flex; align-items: center; gap: 10px; font-weight: 950; letter-spacing: -.02em; }
      .logo { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 14px; background: white; color: #0f172a; font-weight: 950; }
      .hero { padding: clamp(56px, 8vw, 110px) 0 42px; display: grid; gap: 32px; grid-template-columns: minmax(0, 1.08fr) minmax(280px, .92fr); align-items: center; }
      .kicker { color: #93c5fd; font-weight: 900; text-transform: uppercase; letter-spacing: .16em; font-size: 12px; }
      h1 { font-size: clamp(42px, 7vw, 76px); line-height: .94; margin: 18px 0; letter-spacing: -.06em; max-width: 820px; }
      .lead { max-width: 700px; color: #cbd5e1; font-size: clamp(18px, 2vw, 21px); line-height: 1.7; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
      .btn { display: inline-flex; min-height: 52px; align-items: center; justify-content: center; border-radius: 999px; padding: 0 22px; font-weight: 900; text-decoration: none; }
      .btn.primary { background: #2563eb; box-shadow: 0 18px 44px rgba(37,99,235,.28); }
      .btn.secondary { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: #dbeafe; }
      .panel, .card { border: 1px solid rgba(255,255,255,.13); background: rgba(15,23,42,.68); box-shadow: 0 30px 80px rgba(0,0,0,.32); backdrop-filter: blur(14px); }
      .panel { border-radius: 32px; padding: 22px; }
      .chat { min-height: 360px; border-radius: 24px; background: #e9f0ea; color: #111827; overflow: hidden; }
      .chat-head { background: #0b1713; color: white; padding: 18px; font-weight: 900; }
      .bubble { margin: 16px; padding: 13px 15px; border-radius: 18px; line-height: 1.45; font-size: 14px; box-shadow: 0 8px 20px rgba(0,0,0,.08); }
      .bubble.me { margin-left: 62px; background: #d7ffc9; border-top-right-radius: 4px; }
      .bubble.bot { margin-right: 42px; background: white; border-top-left-radius: 4px; }
      .grid { display: grid; gap: 16px; grid-template-columns: repeat(3, 1fr); padding: 28px 0 70px; }
      .card { border-radius: 24px; padding: 24px; }
      .card h2 { margin: 0 0 10px; font-size: 19px; }
      .card p { margin: 0; color: #94a3b8; line-height: 1.6; }
      .price { font-size: 34px; font-weight: 950; margin-top: 14px; }
      footer { border-top: 1px solid rgba(255,255,255,.1); color: #64748b; padding: 24px 0 36px; font-size: 13px; }
      @media (max-width: 820px) { .hero, .grid { grid-template-columns: 1fr; } h1 { font-size: 44px; } }
    </style>
  </head>
  <body>
    <header><nav class="wrap"><div class="brand"><span class="logo">PA</span> Personale Artificiale</div><a class="btn secondary" href="//app.personaleartificiale.it/dashboard">Area clienti</a></nav></header>
    <main class="wrap">
      <section class="hero">
        <div>
          <div class="kicker">Bot AI configurati sui tuoi dati</div>
          <h1>Un assistente AI che risponde, vende e libera tempo operativo.</h1>
          <p class="lead">Configuriamo per te un bot aziendale collegabile a WhatsApp, knowledge base e processi interni. Tu scegli piano e dati: il sistema prepara dashboard, profilo AI e QR di collegamento.</p>
          <div class="actions"><a class="btn primary" href="//app.personaleartificiale.it/dashboard">Crea il tuo bot AI</a><a class="btn secondary" href="#piani">Vedi i piani</a></div>
        </div>
        <aside class="panel"><div class="chat"><div class="chat-head">Personale Artificiale · WhatsApp</div><div class="bubble me">Un cliente chiede prezzi e disponibilità.</div><div class="bubble bot">Rispondo con i dati approvati, propongo il piano corretto e salvo la conversazione.</div><div class="bubble me">E se serve una persona?</div><div class="bubble bot">Applico le regole di escalation e passo il contatto al referente.</div></div></aside>
      </section>
      <section class="grid" id="piani">
        <article class="card"><h2>Assistente Esecutivo</h2><p>Per professionisti e piccole attività: WhatsApp, documenti, FAQ e automazioni essenziali.</p><div class="price">97 €/mese</div></article>
        <article class="card"><h2>Ufficio Digitale</h2><p>Per PMI e studi: più knowledge base, processi più strutturati e supporto prioritario.</p><div class="price">297 €/mese</div></article>
        <article class="card"><h2>Flusso completo</h2><p>Registrazione, pagamento, onboarding aziendale, upload documenti e QR WhatsApp in dashboard.</p><div class="price">Pronto</div></article>
      </section>
    </main>
    <footer><div class="wrap">© 2026 Personale Artificiale · Servizio configurato su dati, regole e conferme del cliente.</div></footer>
  </body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/healthz") {
      write(res, 200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      }, JSON.stringify({ status: "ok", service: "www" }), req.method);
      return;
    }

    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      write(res, 405, { "Content-Type": "text/plain; charset=utf-8" }, "Method Not Allowed", req.method);
      return;
    }

    if (url.pathname !== "/" && serveStatic(req, res, url.pathname)) return;

    if (req.method === "HEAD") {
      write(res, 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      }, "", req.method);
      return;
    }

    if (!ssrHandler) {
      write(res, 503, { "Content-Type": "text/plain; charset=utf-8" }, "Sito temporaneamente non disponibile.", req.method);
      return;
    }

    const protocol = String(req.headers["x-forwarded-proto"] || "http").split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
      else if (value != null) headers.set(key, String(value));
    }

    const request = new Request(protocol + "://" + host + (req.url || "/"), {
      method: req.method,
      headers,
    });
    const response = await ssrHandler(request);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const body = Buffer.from(await response.arrayBuffer());

    if (response.status >= 500 && /application\/json/i.test(responseHeaders["content-type"] || "") && body.includes("HTTPError")) {
      write(res, 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-SSR-Fallback": "www-http-error",
      }, fallbackHtml(), req.method);
      return;
    }

    write(res, response.status, responseHeaders, body, req.method);
  } catch (err) {
    console.error("[request] www", err);
    if (!res.headersSent) {
      write(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Internal Server Error", req.method);
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Personale Artificiale www serving on http://${HOST}:${PORT}`);
});
