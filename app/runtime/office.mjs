import { apiError } from "./auth.mjs";

const OFFICE_API_URL = (process.env.OFFICE_API_URL || "http://office:8091").replace(/\/+$/, "");

async function officeFetch(pathname, options = {}) {
  let res;
  try {
    res = await fetch(OFFICE_API_URL + pathname, {
      ...options,
      signal: AbortSignal.timeout(Number(process.env.OFFICE_TIMEOUT_MS || 30000)),
    });
  } catch (error) {
    const message = error?.name === "TimeoutError" ? "Timeout collegando il servizio documenti." : "Servizio documenti non raggiungibile.";
    throw apiError(503, message, "office_unreachable");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw apiError(res.status, text.slice(0, 300) || "Servizio documenti non disponibile.", "office_error");
  }
  return res;
}

export async function createExcel({ sheetName, rows }) {
  const res = await officeFetch("/excel/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheetName, rows }),
  });
  return Buffer.from(await res.arrayBuffer());
}

export async function readExcel(buffer) {
  const res = await officeFetch("/excel/read", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  return res.json();
}

export async function createPptx({ slides }) {
  const res = await officeFetch("/pptx/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slides }),
  });
  return Buffer.from(await res.arrayBuffer());
}

export async function createDocx({ title, sections }) {
  const res = await officeFetch("/docx/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, sections }),
  });
  return Buffer.from(await res.arrayBuffer());
}

export async function createPdf({ title, paragraphs }) {
  const res = await officeFetch("/pdf/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, paragraphs }),
  });
  return Buffer.from(await res.arrayBuffer());
}

export async function extractPdfText(buffer) {
  const res = await officeFetch("/pdf/extract-text", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  const data = await res.json();
  return String(data.text || "");
}
