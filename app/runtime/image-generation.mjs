import { apiError } from "./auth.mjs";

const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

function cfConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw apiError(503, "Generazione immagini non configurata: mancano CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN.", "image_gen_not_configured");
  }
  return { accountId, apiToken };
}

// FLUX e Stable Diffusion XL su Cloudflare Workers AI hanno contratti di risposta DIVERSI:
// FLUX risponde con JSON {result:{image: base64}}, SDXL risponde con bytes binari diretti.
// Ci affidiamo al Content-Type reale della risposta piuttosto che alla sola documentazione,
// perché è nota discordanza tra doc e comportamento reale su alcuni modelli della famiglia SD.
async function runCloudflareModel(model, body) {
  const { accountId, apiToken } = cfConfig();
  let response;
  try {
    response = await fetch(`${CF_API_BASE}/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.CLOUDFLARE_TIMEOUT_MS || 60000)),
    });
  } catch (error) {
    const message = error?.name === "TimeoutError" ? "Timeout collegando Cloudflare Workers AI." : "Cloudflare Workers AI non raggiungibile.";
    throw apiError(503, message, "image_gen_unreachable");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw apiError(response.status, text.slice(0, 300) || "Generazione immagine non riuscita.", "image_gen_error");
  }

  if (contentType.includes("application/json")) {
    const payload = await response.json();
    if (!payload.success) {
      const message = (payload.errors || []).map((error) => error.message).join("; ") || "Generazione immagine non riuscita.";
      throw apiError(502, message, "image_gen_error");
    }
    const base64 = payload.result?.image;
    if (!base64) throw apiError(502, "Risposta senza immagine.", "image_gen_no_image");
    return { buffer: Buffer.from(base64, "base64"), mimetype: "image/jpeg" };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw apiError(502, "Risposta senza immagine.", "image_gen_no_image");
  return { buffer, mimetype: contentType.includes("png") ? "image/png" : contentType.split(";")[0] || "image/png" };
}

export async function generateImage({ prompt, aspect = "square" }) {
  const cleanPrompt = String(prompt || "").trim().slice(0, 2048);
  if (!cleanPrompt) throw apiError(400, "Serve una descrizione per generare l'immagine.");

  if (aspect === "square") {
    return runCloudflareModel("@cf/black-forest-labs/flux-1-schnell", { prompt: cleanPrompt, steps: 8 });
  }
  const dimensions = aspect === "landscape" ? { width: 1344, height: 768 } : { width: 768, height: 1344 };
  return runCloudflareModel("@cf/stabilityai/stable-diffusion-xl-base-1.0", { prompt: cleanPrompt, num_steps: 20, ...dimensions });
}
