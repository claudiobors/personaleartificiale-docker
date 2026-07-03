/**
 * Production server for Hostinger (Node.js).
 * Serves the TanStack Start SSR build output.
 * - Static assets from ./dist/client/
 * - SSR handler from ./dist/server/server.js for everything else
 * - Reads PORT from environment (Hostinger convention)
 * - No Bun, no sudo, no lsof, no setsid dependencies
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";
const CLIENT_DIR = path.resolve(__dirname, "dist/client");

// MIME types for static files
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

// Import the SSR handler
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
  console.error("Failed to load SSR handler:", err);
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // 1. Try serving static files from dist/client/
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

    // 2. Fallback: SSR handler
    // Build a standard Request object for the SSR handler
    const protocol = req.socket?.encrypted ? "https" : "http";
    const requestUrl = `${protocol}://${req.headers.host || "localhost"}${req.url}`;
    
    // Convert headers
    const requestHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => requestHeaders.append(key, v));
        } else {
          requestHeaders.set(key, String(value));
        }
      }
    }

    // Read body if present
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
      });
    }

    const request = new Request(requestUrl, {
      method: req.method,
      headers: requestHeaders,
      body: body,
    });

    const response = await ssrHandler(request);

    // Send SSR response back
    const responseBody = await response.text();
    res.writeHead(
      response.status,
      Object.fromEntries(response.headers.entries())
    );
    res.end(responseBody);
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Personale Artificiale serving on http://${HOST}:${PORT}`);
});
