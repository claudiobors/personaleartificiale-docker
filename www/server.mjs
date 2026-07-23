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
