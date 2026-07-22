import { query } from "./db.mjs";
import {
  apiError,
  bearerToken,
  clearSessionCookie,
  getUserById,
  loginUser,
  logoutUser,
  registerUser,
  requireActiveUser,
  requireUser,
  sessionCookie,
} from "./auth.mjs";
import { publicPlans, getPlan } from "./plans.mjs";
import {
  confirmCheckout,
  constructWebhook,
  createCheckout,
  createPortal,
  processWebhook,
} from "./stripe.mjs";
import {
  deleteKnowledge,
  indexOnboarding,
  listKnowledge,
  searchKnowledge,
  uploadAndIndex,
} from "./rag.mjs";
import { answerWithKnowledge } from "./assistant.mjs";
import {
  assertEvolutionWebhook,
  ensureWhatsAppSession,
  getWhatsAppStatus,
  processEvolutionWebhook,
  refreshWhatsAppStatus,
} from "./evolution.mjs";
import { deleteUserData, exportUserData } from "./privacy.mjs";

const MAX_JSON = 1024 * 1024;
const MAX_UPLOAD = 15 * 1024 * 1024;

function response(data, status = 200, headers = {}) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
    body: JSON.stringify(data),
  };
}

function authResponse(result, status = 200) {
  return response(result, status, { "Set-Cookie": sessionCookie(result.token) });
}

function clearAuthResponse(data = { success: true }) {
  return response(data, 200, { "Set-Cookie": clearSessionCookie() });
}

async function bodyBuffer(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(apiError(413, "Richiesta troppo grande."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function jsonBody(request) {
  const buffer = await bodyBuffer(request, MAX_JSON);
  if (!buffer.length) return {};
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw apiError(400, "JSON non valido.");
  }
}

function originFor(request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const proto = String(request.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost:3000";
  return proto + "://" + host;
}

function cleanOnboarding(input) {
  const fields = [
    "companyName", "website", "industry", "vatNumber", "address",
    "businessDescription", "productsServices", "targetAudience", "competitors",
    "differentiators", "commonQuestions", "policies", "mainGoals",
    "forbiddenTopics", "escalationRules", "contactEmail", "contactPhone",
    "openingHours", "toneOfVoice", "preferredLanguage", "agentName",
    "roleDescription",
  ];
  const data = {};
  for (const key of fields) {
    data[key] = typeof input?.[key] === "string" ? input[key].trim().slice(0, 12_000) : "";
  }
  return data;
}

function validateOnboarding(data) {
  const required = {
    companyName: "nome dell'azienda",
    industry: "settore",
    businessDescription: "descrizione dell'attività",
    productsServices: "prodotti o servizi",
    targetAudience: "clienti ideali",
    mainGoals: "obiettivi dell'assistente",
    toneOfVoice: "tono di voce",
    contactEmail: "email di contatto",
  };
  const missing = Object.entries(required).filter(([key]) => !data[key]).map(([, label]) => label);
  if (missing.length) throw apiError(400, "Completa questi campi: " + missing.join(", ") + ".");
}

async function onboardingData(userId) {
  const result = await query(
    `SELECT onboarding_data, onboarding_completed, updated_at
     FROM agent_config WHERE user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return {
    data: row?.onboarding_data || {},
    complete: Boolean(row?.onboarding_completed),
    updatedAt: row?.updated_at || null,
  };
}

async function saveOnboarding(userId, data, complete) {
  await query(
    `INSERT INTO agent_config (
       user_id, agent_name, tone_of_voice, role_description,
       business_description, products, target_audience, competitors,
       onboarding_data, onboarding_completed, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       agent_name = EXCLUDED.agent_name,
       tone_of_voice = EXCLUDED.tone_of_voice,
       role_description = EXCLUDED.role_description,
       business_description = EXCLUDED.business_description,
       products = EXCLUDED.products,
       target_audience = EXCLUDED.target_audience,
       competitors = EXCLUDED.competitors,
       onboarding_data = EXCLUDED.onboarding_data,
       onboarding_completed = EXCLUDED.onboarding_completed,
       updated_at = NOW()`,
    [
      userId,
      data.agentName || "Assistente Virtuale",
      data.toneOfVoice || "Professionale, cortese e amichevole",
      data.roleDescription || "Assistente Digitale",
      data.businessDescription,
      data.productsServices,
      data.targetAudience,
      data.competitors,
      JSON.stringify(data),
      complete,
    ],
  );
  await query(
    `UPDATE users SET tone_of_voice = $1,
       onboarding_completed_at = CASE WHEN $2 THEN COALESCE(onboarding_completed_at, NOW()) ELSE onboarding_completed_at END,
       updated_at = NOW() WHERE id = $3`,
    [data.toneOfVoice, complete, userId],
  );
}

async function dashboardStats(userId) {
  const result = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM knowledge_files WHERE user_id = $1) AS files,
       (SELECT COUNT(*)::int FROM knowledge_files WHERE user_id = $1 AND status = 'ready') AS ready_files,
        (SELECT COUNT(*)::int FROM agent_messages WHERE user_id = $1) AS messages,
        (SELECT status FROM whatsapp_sessions WHERE user_id = $1) AS whatsapp_status`,
    [userId],
  );
  return result.rows[0] || { files: 0, ready_files: 0, messages: 0 };
}

export async function dispatchApi(request, url) {
  try {
    const method = request.method || "GET";
    const path = url.pathname;

    if (method === "GET" && path === "/api/health") {
      await query("SELECT 1");
      return response({
        status: "ok",
        services: {
          database: "connected",
          stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
          rag: Boolean(process.env.OPENAI_API_KEY && process.env.QDRANT_URL),
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/api/plans") {
      return response({ plans: publicPlans() });
    }

    if (method === "POST" && path === "/api/auth/register") {
      return authResponse(await registerUser(await jsonBody(request)), 201);
    }

    if (method === "POST" && path === "/api/auth/login") {
      return authResponse(await loginUser(await jsonBody(request)));
    }

    if (method === "POST" && path === "/api/auth/logout") {
      await logoutUser(bearerToken(request));
      return clearAuthResponse();
    }

    if (method === "GET" && path === "/api/auth/me") {
      const { user } = await requireUser(request);
      return response({ user });
    }

    if (method === "GET" && path === "/api/privacy/export") {
      const { user } = await requireUser(request);
      return response({ data: await exportUserData(user.id) });
    }

    if (method === "DELETE" && path === "/api/privacy/account") {
      const { user } = await requireUser(request);
      const result = await deleteUserData(user.id, (await jsonBody(request)).confirmation);
      return clearAuthResponse(result);
    }

    if (method === "GET" && path === "/api/subscription/status") {
      const { user } = await requireUser(request);
      return response({
        status: user.status,
        planId: user.planId,
        subscriptionId: user.subscriptionId,
        currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      });
    }

    if (method === "POST" && path === "/api/stripe/checkout") {
      const { user } = await requireUser(request);
      const body = await jsonBody(request);
      return response(await createCheckout({
        user,
        planId: body.planId,
        origin: originFor(request),
      }));
    }

    if (method === "GET" && path === "/api/stripe/checkout-session") {
      const { user } = await requireUser(request);
      const result = await confirmCheckout({
        sessionId: url.searchParams.get("session_id"),
        userId: user.id,
      });
      return response({ ...result, user: await getUserById(user.id) });
    }

    if (method === "POST" && path === "/api/stripe/portal") {
      const { user } = await requireUser(request);
      return response(await createPortal({ user, origin: originFor(request) }));
    }

    if (method === "POST" && path === "/api/stripe/webhook") {
      const signature = request.headers["stripe-signature"];
      if (!signature) throw apiError(400, "Firma Stripe mancante.");
      const raw = await bodyBuffer(request, MAX_JSON);
      const event = constructWebhook(raw, signature);
      await processWebhook(event);
      return response({ received: true });
    }

    if (method === "GET" && path === "/api/whatsapp/status") {
      const { user } = await requireActiveUser(request);
      return response({ session: await refreshWhatsAppStatus(user.id) });
    }

    if (method === "POST" && path === "/api/whatsapp/provision") {
      const { user } = await requireActiveUser(request);
      return response({ session: await ensureWhatsAppSession(user, originFor(request)) });
    }

    if (method === "POST" && path === "/api/evolution/webhook") {
      assertEvolutionWebhook(request, url);
      const result = await processEvolutionWebhook(await jsonBody(request));
      return response({ received: true, ...result });
    }

    if (method === "GET" && path === "/api/onboarding") {
      const { user } = await requireActiveUser(request);
      return response({
        ...(await onboardingData(user.id)),
        files: await listKnowledge(user.id),
      });
    }

    if (method === "PUT" && path === "/api/onboarding") {
      const { user } = await requireActiveUser(request);
      const body = await jsonBody(request);
      const data = cleanOnboarding(body.data);
      const complete = body.complete === true;
      if (complete) validateOnboarding(data);
      await saveOnboarding(user.id, data, complete);

      let rag = { indexed: false };
      if (complete) {
        try {
          const chunks = await indexOnboarding(user.id, data);
          rag = { indexed: true, chunks };
        } catch (error) {
          rag = { indexed: false, error: error instanceof Error ? error.message : "RAG non disponibile" };
        }
      }
      return response({ success: true, complete, rag });
    }

    if (method === "GET" && path === "/api/knowledge") {
      const { user } = await requireActiveUser(request);
      return response({ files: await listKnowledge(user.id) });
    }

    if (method === "POST" && path === "/api/knowledge") {
      const { user } = await requireActiveUser(request);
      let fileName = request.headers["x-filename"];
      if (!fileName) throw apiError(400, "Nome file mancante.");
      try { fileName = decodeURIComponent(fileName); } catch {}
      const buffer = await bodyBuffer(request, MAX_UPLOAD);
      const plan = getPlan(user.planId);
      const maxFiles = user.planId === "ufficio-digitale" ? 250 : 50;
      const file = await uploadAndIndex({
        userId: user.id,
        originalName: fileName,
        mimeType: request.headers["content-type"],
        buffer,
        maxFiles: plan ? maxFiles : 0,
      });
      return response({ file }, 201);
    }

    if (method === "DELETE" && path === "/api/knowledge") {
      const { user } = await requireActiveUser(request);
      const fileId = url.searchParams.get("id");
      if (!fileId) throw apiError(400, "ID documento mancante.");
      await deleteKnowledge(user.id, fileId);
      return response({ success: true });
    }

    if (method === "POST" && path === "/api/rag/search") {
      const { user } = await requireActiveUser(request);
      const body = await jsonBody(request);
      if (!body.query || String(body.query).trim().length < 2) {
        throw apiError(400, "Inserisci una domanda da cercare.");
      }
      return response({ results: await searchKnowledge(user.id, String(body.query), body.limit) });
    }

    if (method === "POST" && path === "/api/assistant/chat") {
      const { user } = await requireActiveUser(request);
      const body = await jsonBody(request);
      const question = String(body.query || "").trim().slice(0, 4000);
      if (question.length < 2) {
        throw apiError(400, "Inserisci una domanda per l'assistente.");
      }
      const profile = await onboardingData(user.id);
      await query(
        `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
         VALUES ($1, 'incoming', 'dashboard', $2, $3::jsonb)`,
        [user.id, question, JSON.stringify({ source: "dashboard-test" })],
      );
      const result = await answerWithKnowledge(user.id, question, profile.data);
      await query(
        `INSERT INTO agent_messages (user_id, direction, channel, content, metadata)
         VALUES ($1, 'outgoing', 'dashboard', $2, $3::jsonb)`,
        [user.id, result.answer, JSON.stringify({ sources: result.sources, model: result.model, fallback: result.fallback })],
      );
      return response(result);
    }

    if (method === "GET" && path === "/api/dashboard/stats") {
      const { user } = await requireActiveUser(request);
      return response({ stats: await dashboardStats(user.id) });
    }

    return response({ error: "Endpoint non trovato." }, 404);
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error("[api]", error);
    return response({
      error: status >= 500 && !error?.message ? "Errore interno del server." : error.message,
      code: error?.code,
    }, status);
  }
}

