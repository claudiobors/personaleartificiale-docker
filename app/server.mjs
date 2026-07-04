/**
 * Personale Artificiale — Production server.
 * Converts Node.js http to Web API Request/Response for TanStack Start SSR.
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
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

let ssrHandler = null;

async function getSSRHandler() {
  if (ssrHandler) return ssrHandler;
  try {
    const mod = await import("./dist/server/server.js");
    // TanStack Start exports a default handler that accepts (req, res) or Web API
    ssrHandler = mod.default || mod;
    return ssrHandler;
  } catch (e) {
    console.error("Failed to load SSR handler:", e.message);
    return null;
  }
}

function nodeReqToWebRequest(req, url) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  const requestUrl = new URL(url.pathname + url.search, `${protocol}://${host}`);

  return new Request(requestUrl, {
    method: req.method,
    headers: new Headers(req.headers),
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
    duplex: req.method !== "GET" && req.method !== "HEAD" ? "half" : undefined,
  });
}

async function webResponseToNode(res, webResponse) {
  res.writeHead(webResponse.status, webResponse.statusText, Object.fromEntries(webResponse.headers.entries()));
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(value);
      }
    };
    pump().catch(() => res.end());
  } else {
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? HOST}`);

    // Health check
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      return;
    }

    // Try static files from dist/client
    const filePath = path.join(
      CLIENT_DIR,
      url.pathname === "/" ? "index.html" : url.pathname,
    );
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
      return;
    }

    // SSR handling via TanStack Start
    const handler = await getSSRHandler();
    if (handler) {
      const webRequest = nodeReqToWebRequest(req, url);
      const webResponse = await handler(webRequest);
      await webResponseToNode(res, webResponse);
      return;
    }

    // Fallback
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  } catch (e) {
    console.error("Request error:", e.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Personale Artificiale serving on http://${HOST}:${PORT}`);
});