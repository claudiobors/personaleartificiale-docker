import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import OpenAI from "openai";
import { query } from "./db.mjs";
import { apiError } from "./auth.mjs";

const UPLOADS_BASE = process.env.UPLOADS_DIR || "/app/uploads";
const QDRANT_URL = (process.env.QDRANT_URL || "http://qdrant:6333").replace(/\/+$/, "");
const COLLECTION = process.env.QDRANT_COLLECTION || "pa_knowledge";
const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
const VECTOR_SIZE = Number(process.env.OPENROUTER_EMBEDDING_DIMENSIONS || 1536);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const TYPES = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// Immagini: il file grezzo non viene mai conservato. Si estrae il testo/contenuto informativo
// via modello vision e si cancella subito il file dal disco (privacy: niente foto/documenti
// scansionati che restano in giro, resta solo il testo indicizzato nella knowledge base).
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const MIME_ALIASES = {
  ".md": ["text/markdown", "text/plain", "application/octet-stream"],
  ".txt": ["text/plain", "application/octet-stream"],
  ".pdf": ["application/pdf", "application/octet-stream"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ".jpg": ["image/jpeg", "image/jpg", "application/octet-stream"],
  ".jpeg": ["image/jpeg", "image/jpg", "application/octet-stream"],
  ".png": ["image/png", "application/octet-stream"],
  ".webp": ["image/webp", "application/octet-stream"],
  ".gif": ["image/gif", "application/octet-stream"],
};

function safeOriginalName(value) {
  return path.basename(String(value || "documento").replace(/\\/g, "/")).slice(0, 240);
}

function assertAllowedMime(extension, mimeType = "") {
  const cleanMime = String(mimeType || "").split(";")[0].trim().toLowerCase();
  if (!cleanMime) return;
  const allowed = MIME_ALIASES[extension] || [TYPES[extension]];
  if (!allowed.includes(cleanMime)) {
    throw apiError(415, "Tipo file non coerente con l'estensione. Carica PDF, DOCX, TXT, MD o immagini (JPG, PNG, WEBP, GIF) validi.");
  }
}

function assertFileSignature(extension, buffer) {
  const headBytes = buffer.subarray(0, 12);
  const head = headBytes.toString("latin1");
  if ((extension === ".jpg" || extension === ".jpeg") && !(headBytes[0] === 0xff && headBytes[1] === 0xd8 && headBytes[2] === 0xff)) {
    throw apiError(415, "L'immagine JPEG non sembra valida o è corrotta.");
  }
  if (extension === ".png" && !(headBytes[0] === 0x89 && headBytes[1] === 0x50 && headBytes[2] === 0x4e && headBytes[3] === 0x47)) {
    throw apiError(415, "L'immagine PNG non sembra valida o è corrotta.");
  }
  if (extension === ".webp" && !(head.startsWith("RIFF") && headBytes.subarray(8, 12).toString("latin1") === "WEBP")) {
    throw apiError(415, "L'immagine WEBP non sembra valida o è corrotta.");
  }
  if (extension === ".gif" && !(head.startsWith("GIF87a") || head.startsWith("GIF89a"))) {
    throw apiError(415, "L'immagine GIF non sembra valida o è corrotta.");
  }
  if (extension === ".pdf" && !head.startsWith("%PDF-")) {
    throw apiError(415, "Il PDF non sembra valido o è corrotto.");
  }
  if (extension === ".docx" && !head.startsWith("PK\u0003\u0004")) {
    throw apiError(415, "Il DOCX non sembra valido o è corrotto.");
  }
}

let openai;

function embeddingConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw apiError(503, "OPENROUTER_API_KEY non configurata: il documento è salvato ma non può essere indicizzato.");
  }
  return {
    apiKey,
    baseURL: (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, ""),
    siteUrl: process.env.OPENROUTER_SITE_URL || process.env.APP_URL || "https://app.personaleartificiale.it",
    appName: process.env.OPENROUTER_APP_NAME || "Personale Artificiale",
  };
}

function embeddingClient() {
  const config = embeddingConfig();
  openai ??= new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: {
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.appName,
    },
  });
  return openai;
}

function qdrantHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (process.env.QDRANT_API_KEY) headers["api-key"] = process.env.QDRANT_API_KEY;
  return headers;
}

async function qdrant(pathname, options = {}) {
  const response = await fetch(QDRANT_URL + pathname, {
    ...options,
    headers: { ...qdrantHeaders(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(Number(process.env.QDRANT_TIMEOUT_MS || 8000)),
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error("Qdrant " + response.status + ": " + detail.slice(0, 300));
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function ensureCollection() {
  const response = await fetch(QDRANT_URL + "/collections/" + COLLECTION, {
    headers: qdrantHeaders(),
    signal: AbortSignal.timeout(Number(process.env.QDRANT_TIMEOUT_MS || 8000)),
  });
  if (response.ok) return;
  if (response.status !== 404) throw new Error("Qdrant non raggiungibile: " + response.status);
  await qdrant("/collections/" + COLLECTION, {
    method: "PUT",
    body: JSON.stringify({ vectors: { size: VECTOR_SIZE, distance: "Cosine" } }),
  });
  await qdrant("/collections/" + COLLECTION + "/index", {
    method: "PUT",
    body: JSON.stringify({ field_name: "user_id", field_schema: "keyword" }),
  }).catch(() => {});
}

function chunkText(text, size = 1200, overlap = 180) {
  const normalized = text.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(
        normalized.lastIndexOf("\n", end),
        normalized.lastIndexOf(". ", end),
        normalized.lastIndexOf(" ", end),
      );
      if (boundary > start + size * 0.6) end = boundary + 1;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks.filter(Boolean);
}

async function extractText(filePath, extension) {
  const buffer = await readFile(filePath);
  if (extension === ".txt" || extension === ".md") return buffer.toString("utf8");
  if (extension === ".pdf") {
    const result = await pdf(buffer);
    return result.text;
  }
  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return extractImageText(buffer, TYPES[extension]);
  }
  throw apiError(400, "Formato non supportato.");
}

async function extractImageText(buffer, mimeType) {
  const model = process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o-mini";
  const completion = await embeddingClient().chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Estrai in italiano tutte le informazioni utili da questa immagine: testo leggibile, numeri, prezzi, tabelle, elenchi, contatti. Se è un documento o listino, riportane il contenuto in modo fedele e strutturato. Se è una foto generica, descrivi brevemente cosa mostra. Rispondi solo con il contenuto informativo, senza commenti o premesse.",
          },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } },
        ],
      },
    ],
    max_tokens: 1500,
  });
  const text = String(completion.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Il modello vision non ha estratto alcun contenuto dall'immagine.");
  return text;
}

async function embedTexts(texts) {
  const response = await embeddingClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    ...(EMBEDDING_MODEL.endsWith("text-embedding-3-small") ? { dimensions: VECTOR_SIZE } : {}),
  });
  return response.data.map((item) => item.embedding);
}

async function deleteVectors(filter) {
  await ensureCollection();
  await qdrant("/collections/" + COLLECTION + "/points/delete?wait=true", {
    method: "POST",
    body: JSON.stringify({ filter }),
  });
}

export async function deleteUserVectors(userId) {
  await deleteVectors({ must: [{ key: "user_id", match: { value: userId } }] });
}

async function upsertChunks({ userId, fileId, fileName, source, chunks }) {
  await ensureCollection();
  const embeddings = await embedTexts(chunks);
  const points = chunks.map((text, index) => ({
    id: crypto.randomUUID(),
    vector: embeddings[index],
    payload: {
      user_id: userId,
      file_id: fileId,
      file_name: fileName,
      source,
      chunk_index: index,
      text,
    },
  }));
  await qdrant("/collections/" + COLLECTION + "/points?wait=true", {
    method: "PUT",
    body: JSON.stringify({ points }),
  });
  return points.length;
}

function fileDto(row) {
  return {
    id: row.id,
    name: row.original_name,
    mimeType: row.mime_type,
    size: row.file_size,
    status: row.status,
    chunks: row.chunks_count,
    error: row.error_message,
    createdAt: row.created_at,
  };
}

export async function listKnowledge(userId) {
  const result = await query(
    `SELECT id, original_name, mime_type, file_size, status, chunks_count, error_message, created_at
     FROM knowledge_files WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows.map(fileDto);
}

export async function uploadAndIndex({ userId, originalName, mimeType, buffer, maxFiles }) {
  if (!buffer?.length) throw apiError(400, "Il file è vuoto.");
  if (buffer.length > MAX_FILE_SIZE) throw apiError(413, "Il file supera il limite di 15 MB.");

  const cleanOriginalName = safeOriginalName(originalName);
  const extension = path.extname(cleanOriginalName).toLowerCase();
  if (!TYPES[extension]) {
    throw apiError(400, "Formato non supportato. Usa PDF, DOCX, TXT, MD o un'immagine (JPG, PNG, WEBP, GIF).");
  }
  assertAllowedMime(extension, mimeType);
  assertFileSignature(extension, buffer);

  const countResult = await query("SELECT COUNT(*)::int AS count FROM knowledge_files WHERE user_id = $1", [userId]);
  if (countResult.rows[0].count >= maxFiles) {
    throw apiError(409, "Hai raggiunto il limite documenti del tuo piano.");
  }

  const tenantDir = path.join(UPLOADS_BASE, userId);
  await mkdir(tenantDir, { recursive: true });
  const storedName = Date.now() + "-" + crypto.randomUUID() + extension;
  const filePath = path.join(tenantDir, storedName);
  await writeFile(filePath, buffer);

  const inserted = await query(
    `INSERT INTO knowledge_files
      (user_id, filename, original_name, mime_type, file_size, qdrant_collection, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'processing')
     RETURNING *`,
    [userId, storedName, cleanOriginalName, mimeType || TYPES[extension], buffer.length, COLLECTION],
  );
  const row = inserted.rows[0];

  try {
    const text = await extractText(filePath, extension);
    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("Non è stato possibile estrarre testo dal documento.");
    const chunksCount = await upsertChunks({
      userId,
      fileId: row.id,
      fileName: cleanOriginalName,
      source: "document",
      chunks,
    });
    const updated = await query(
      `UPDATE knowledge_files SET status = 'ready', chunks_count = $1, error_message = NULL
       WHERE id = $2 RETURNING *`,
      [chunksCount, row.id],
    );
    return fileDto(updated.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indicizzazione non riuscita";
    const updated = await query(
      `UPDATE knowledge_files SET status = 'error', error_message = $1
       WHERE id = $2 RETURNING *`,
      [message.slice(0, 500), row.id],
    );
    return fileDto(updated.rows[0]);
  } finally {
    // Le immagini non vengono mai conservate su disco: una volta estratto il contenuto
    // (o fallito il tentativo), il file grezzo viene cancellato subito per privacy.
    if (IMAGE_EXTENSIONS.has(extension)) {
      await unlink(filePath).catch(() => {});
    }
  }
}

export async function deleteKnowledge(userId, fileId) {
  const result = await query(
    "DELETE FROM knowledge_files WHERE id = $1 AND user_id = $2 RETURNING filename",
    [fileId, userId],
  );
  if (!result.rows[0]) throw apiError(404, "Documento non trovato.");

  await deleteVectors({
    must: [
      { key: "user_id", match: { value: userId } },
      { key: "file_id", match: { value: fileId } },
    ],
  }).catch((error) => console.warn("[rag] vector cleanup failed", error.message));

  await unlink(path.join(UPLOADS_BASE, userId, result.rows[0].filename)).catch(() => {});
}

export async function indexOnboarding(userId, onboarding) {
  const labels = {
    companyName: "Azienda",
    website: "Sito",
    industry: "Settore",
    vatNumber: "Partita IVA",
    address: "Sede",
    businessDescription: "Descrizione attività",
    productsServices: "Prodotti e servizi",
    targetAudience: "Clienti ideali",
    competitors: "Concorrenti",
    differentiators: "Punti di forza",
    commonQuestions: "Domande frequenti",
    policies: "Regole e policy",
    mainGoals: "Obiettivi",
    forbiddenTopics: "Limiti e argomenti vietati",
    escalationRules: "Quando passare a una persona",
    contactEmail: "Email di contatto",
    contactPhone: "Telefono",
    openingHours: "Orari",
    toneOfVoice: "Tono di voce",
    preferredLanguage: "Lingua",
    agentName: "Nome assistente",
    roleDescription: "Ruolo assistente",
  };
  const text = Object.entries(labels)
    .map(([key, label]) => onboarding[key] ? label + ":\n" + onboarding[key] : "")
    .filter(Boolean)
    .join("\n\n");
  const chunks = chunkText(text);
  if (!chunks.length) return 0;

  await deleteVectors({
    must: [
      { key: "user_id", match: { value: userId } },
      { key: "source", match: { value: "onboarding" } },
    ],
  }).catch(() => {});

  return upsertChunks({
    userId,
    fileId: "onboarding",
    fileName: "Profilo aziendale",
    source: "onboarding",
    chunks,
  });
}

export async function searchKnowledge(userId, searchText, limit = 5) {
  const [vector] = await embedTexts([searchText]);
  await ensureCollection();
  const result = await qdrant("/collections/" + COLLECTION + "/points/query", {
    method: "POST",
    body: JSON.stringify({
      query: vector,
      filter: { must: [{ key: "user_id", match: { value: userId } }] },
      limit: Math.min(Math.max(Number(limit) || 5, 1), 10),
      with_payload: true,
      with_vector: false,
    }),
  });
  const points = result.result?.points ?? result.result ?? [];
  return points.map((point) => ({
    score: point.score,
    text: point.payload?.text,
    source: point.payload?.file_name,
  }));
}

