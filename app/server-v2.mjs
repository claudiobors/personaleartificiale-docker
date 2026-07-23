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
  const css = findClientAsset("app-", ".css");
  const indexJs = findClientAsset("index-", ".js");
  const dashboardJs = findClientAsset("dashboard-", ".js");
  const cssTag = css ? `<link rel="stylesheet" href="/assets/${css}">` : "";
  const scripts = [indexJs, dashboardJs]
    .filter(Boolean)
    .map((name) => `<script type="module" src="/assets/${name}"></script>`)
    .join("");

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dashboard | Personale Artificiale</title>
    <meta name="robots" content="noindex" />
    ${cssTag}
    <style>
      body { margin: 0; background: #05070b; color: white; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      #root:empty { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      #root:empty::before { content: "Personale Artificiale — caricamento dashboard…"; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    ${scripts}
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

