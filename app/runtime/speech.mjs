import { apiError } from "./auth.mjs";

const SPEECH_API_URL = (process.env.SPEECH_API_URL || "http://speech:8090").replace(/\/+$/, "");

async function speechFetch(pathname, options = {}, timeoutMs = Number(process.env.SPEECH_TIMEOUT_MS || 30000)) {
  let res;
  try {
    res = await fetch(SPEECH_API_URL + pathname, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const message = error?.name === "TimeoutError" ? "Timeout collegando il servizio vocale." : "Servizio vocale non raggiungibile.";
    throw apiError(503, message, "speech_unreachable");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw apiError(res.status, text.slice(0, 300) || "Servizio vocale non disponibile.", "speech_error");
  }
  return res;
}

export async function transcribeAudio(buffer, { ext } = {}) {
  const query = ext ? `?ext=${encodeURIComponent(ext)}` : "";
  const res = await speechFetch(`/transcribe${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  const data = await res.json();
  return String(data.text || "").trim();
}

export async function fetchVideoTranscript(url) {
  const res = await speechFetch(
    "/video/transcript",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) },
    Number(process.env.SPEECH_VIDEO_TIMEOUT_MS || 180000),
  );
  return res.json();
}

export async function synthesizeSpeech(text, { format = "ogg" } = {}) {
  const res = await speechFetch("/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, format }),
  });
  return Buffer.from(await res.arrayBuffer());
}
