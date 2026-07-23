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
    <title>Personale Artificiale</title>
    <meta name="description" content="Assistenti AI configurati per aziende, studi e professionisti." />
    <style>
      :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 20% 10%, #1d4ed8 0, transparent 30%), #05070b; color: white; }
      main { width: min(920px, calc(100% - 40px)); padding: 56px 0; }
      .card { border: 1px solid rgba(255,255,255,.14); border-radius: 28px; background: rgba(15,23,42,.72); padding: clamp(28px, 6vw, 64px); box-shadow: 0 30px 80px rgba(0,0,0,.35); }
      .kicker { color: #93c5fd; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; font-size: 12px; }
      h1 { font-size: clamp(38px, 7vw, 72px); line-height: .95; margin: 18px 0; letter-spacing: -.05em; }
      p { max-width: 680px; color: #cbd5e1; font-size: 18px; line-height: 1.7; }
      a { display: inline-flex; margin-top: 24px; min-height: 48px; align-items: center; border-radius: 999px; background: #2563eb; color: white; padding: 0 22px; font-weight: 800; text-decoration: none; }
    </style>
  </head>
  <body>
    <main><section class="card">
      <div class="kicker">Personale Artificiale</div>
      <h1>Assistenti AI pronti per lavorare con i tuoi clienti.</h1>
      <p>Configuriamo bot AI, knowledge base e automazioni WhatsApp per rispondere meglio, vendere di più e liberare tempo operativo.</p>
      <a href="https://app.personaleartificiale.it/dashboard">Accedi alla dashboard</a>
    </section></main>
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
