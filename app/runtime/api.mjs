import { query } from "./db.mjs";
import {
  apiError,
  bearerToken,
  clearSessionCookie,
  getUserById,
  loginUser,
  logoutUser,
  registerUser,
  requireAdminUser,
  requireActiveUser,
  requireUser,
  sessionCookie,
  verifyLoginOtp,
} from "./auth.mjs";
import { publicPlans, publicCreditPacks, getPlan } from "./plans.mjs";
import {
  confirmCheckout,
  constructWebhook,
  createCreditCheckout,
  createCheckout,
  createPortal,
  processWebhook,
} from "./stripe.mjs";
import { addCredits, consumeTokens, creditSummary, estimateTokens, grantPlanAllowance } from "./credits.mjs";
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
  disconnectWhatsAppSession,
  ensureWhatsAppSession,
  getWhatsAppStatus,
  processEvolutionWebhook,
  refreshWhatsAppStatus,
} from "./evolution.mjs";
import { deleteUserData, exportUserData } from "./privacy.mjs";
import {
  disconnectGoogleCalendar,
  getCalendarStatus,
  googleAuthUrl,
  handleGoogleCallback,
} from "./google-calendar.mjs";
import {
  connectEmailAccount,
  discardEmailDraft,
  disconnectEmailAccount,
  getEmailStatus,
  listEmailDrafts,
  sendEmailDraft,
} from "./email-integration.mjs";

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

function redirect(location) {
  return { status: 302, headers: { Location: location, "Cache-Control": "no-store" }, body: "" };
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
    "accountType", "personalGoal",
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
  data.accountType = cleanAccountType(data.accountType);
  return data;
}

function validateOnboarding(data) {
  const required = data.accountType === "private"
    ? {
        personalGoal: "obiettivo personale",
        businessDescription: "contesto personale",
        mainGoals: "obiettivi dell'assistente",
        toneOfVoice: "tono di voce",
        contactEmail: "email di contatto",
      }
    : {
        companyName: data.accountType === "professional" ? "nome professionale/studio" : "nome dell'azienda",
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

function normalizePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 8 || digits.length > 15) throw apiError(400, "Inserisci un numero WhatsApp valido in formato internazionale.");
  return raw.startsWith("+") ? "+" + digits : "+" + digits;
}

function cleanAccountType(value) {
  return ["private", "business", "professional"].includes(value) ? value : "business";
}

function whatsappContactFor(user) {
  const rawNumber = process.env.WHATSAPP_BOT_NUMBER || process.env.WHATSAPP_PUBLIC_NUMBER || "";
  const digits = rawNumber.replace(/\D/g, "");
  const displayNumber = rawNumber.trim() || (digits ? "+" + digits : "");
  const message = (process.env.WHATSAPP_PREFILLED_MESSAGE || `Ciao, sono ${user.name}. Voglio aprire la chat con il mio assistente Personale Artificiale.`).slice(0, 500);
  return {
    configured: Boolean(digits),
    number: displayNumber,
    message,
    url: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "",
  };
}

async function updateUserProfile(userId, input) {
  const accountType = cleanAccountType(input?.accountType);
  const whatsappPhone = normalizePhone(input?.whatsappPhone);
  const result = await query(
    `UPDATE users
     SET account_type = $1,
         whatsapp_phone = NULLIF($2, ''),
         whatsapp_phone_verified_at = CASE WHEN NULLIF($2, '') IS DISTINCT FROM whatsapp_phone THEN NULL ELSE whatsapp_phone_verified_at END,
         updated_at = NOW()
     WHERE id = $3
     RETURNING id`,
    [accountType, whatsappPhone, userId],
  );
  if (!result.rowCount) throw apiError(404, "Utente non trovato.");
  return getUserById(userId);
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
       account_type = $4,
       onboarding_completed_at = CASE WHEN $2 THEN COALESCE(onboarding_completed_at, NOW()) ELSE onboarding_completed_at END,
       updated_at = NOW() WHERE id = $3`,
    [data.toneOfVoice, complete, userId, data.accountType],
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

function mapAdminUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    planId: row.plan_id,
    status: row.status,
    accountType: row.account_type,
    whatsappPhone: row.whatsapp_phone,
    tokenBalance: row.token_balance ?? 0,
    monthlyTokenAllowance: row.monthly_token_allowance ?? 0,
    monthlyTokensUsed: row.monthly_tokens_used ?? 0,
    onboardingComplete: Boolean(row.onboarding_completed_at || row.onboarding_completed),
    files: row.files ?? 0,
    readyFiles: row.ready_files ?? 0,
    messages: row.messages ?? 0,
    whatsappStatus: row.whatsapp_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function adminListUsers() {
  const result = await query(
    `SELECT users.id, users.email, users.name, users.plan_id, users.status,
            users.account_type, users.whatsapp_phone, users.token_balance,
            users.monthly_token_allowance, users.monthly_tokens_used,
            users.onboarding_completed_at, users.created_at, users.updated_at,
            COALESCE(files.count, 0)::int AS files,
            COALESCE(ready.count, 0)::int AS ready_files,
            COALESCE(messages.count, 0)::int AS messages,
            sessions.status AS whatsapp_status
     FROM users
     LEFT JOIN LATERAL (SELECT COUNT(*) FROM knowledge_files WHERE user_id = users.id) files ON true
     LEFT JOIN LATERAL (SELECT COUNT(*) FROM knowledge_files WHERE user_id = users.id AND status = 'ready') ready ON true
     LEFT JOIN LATERAL (SELECT COUNT(*) FROM agent_messages WHERE user_id = users.id) messages ON true
     LEFT JOIN whatsapp_sessions sessions ON sessions.user_id = users.id
     ORDER BY users.created_at DESC
     LIMIT 250`,
  );
  return result.rows.map(mapAdminUser);
}

async function adminUpdateUser(input, admin) {
  const userId = String(input?.userId || "");
  if (!userId) throw apiError(400, "Utente mancante.");
  const planId = input?.planId === "none" ? "none" : (getPlan(input?.planId) ? input.planId : "none");
  const status = ["pending", "active", "past_due", "cancelled"].includes(input?.status) ? input.status : "pending";
  const accountType = cleanAccountType(input?.accountType);
  const whatsappPhone = normalizePhone(input?.whatsappPhone);
  const name = String(input?.name || "").trim().slice(0, 160) || "Utente";
  await query(
    `UPDATE users
     SET name = $1, plan_id = $2, status = $3, account_type = $4,
         whatsapp_phone = NULLIF($5, ''), updated_at = NOW()
     WHERE id = $6`,
    [name, planId, status, accountType, whatsappPhone, userId],
  );
  if (status === "active" && planId !== "none") await grantPlanAllowance(userId, planId);
  await query(
    `INSERT INTO token_ledger (user_id, delta, balance_after, reason, metadata)
     SELECT id, 0, token_balance, 'admin_account_update', $1::jsonb FROM users WHERE id = $2`,
    [JSON.stringify({ adminId: admin.id, planId, status, accountType }), userId],
  );
  return getUserById(userId);
}

async function adminGrantTokens(input, admin) {
  const userId = String(input?.userId || "");
  const tokens = Math.round(Number(input?.tokens || 0));
  const note = String(input?.note || "Accredito manuale admin").slice(0, 300);
  if (!userId) throw apiError(400, "Utente mancante.");
  if (!Number.isFinite(tokens) || tokens <= 0 || tokens > 50_000_000) throw apiError(400, "Numero token non valido.");
  const balance = await addCredits(userId, tokens, "admin_credit_grant", { note, adminId: admin.id });
  return { balance };
}

async function adminLogs() {
  const messages = await query(
    `SELECT agent_messages.id, agent_messages.user_id, users.email, agent_messages.direction,
            agent_messages.channel, agent_messages.content, agent_messages.metadata,
            agent_messages.created_at
     FROM agent_messages
     LEFT JOIN users ON users.id = agent_messages.user_id
     ORDER BY agent_messages.created_at DESC
     LIMIT 120`,
  );
  const sessions = await query(
    `SELECT whatsapp_sessions.user_id, users.email, whatsapp_sessions.instance_name,
            whatsapp_sessions.status, whatsapp_sessions.last_error, whatsapp_sessions.updated_at
     FROM whatsapp_sessions
     LEFT JOIN users ON users.id = whatsapp_sessions.user_id
     ORDER BY whatsapp_sessions.updated_at DESC
     LIMIT 50`,
  );
  const ledger = await query(
    `SELECT token_ledger.user_id, users.email, token_ledger.delta,
            token_ledger.balance_after, token_ledger.reason, token_ledger.metadata,
            token_ledger.created_at
     FROM token_ledger
     LEFT JOIN users ON users.id = token_ledger.user_id
     ORDER BY token_ledger.created_at DESC
     LIMIT 80`,
  );
  return { messages: messages.rows, sessions: sessions.rows, ledger: ledger.rows };
}

export async function dispatchApi(request, url) {
  try {
    const method = request.method || "GET";
    const path = url.pathname;

    if (["GET", "HEAD"].includes(method) && path === "/api/health") {
      await query("SELECT 1");
      return response({
        status: "ok",
        services: {
          database: "connected",
          stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
          rag: Boolean(process.env.OPENROUTER_API_KEY && process.env.QDRANT_URL),
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/api/plans") {
      return response({ plans: publicPlans(), creditPacks: publicCreditPacks() });
    }

    if (method === "POST" && path === "/api/auth/register") {
      return authResponse(await registerUser(await jsonBody(request)), 201);
    }

    if (method === "POST" && path === "/api/auth/login") {
      const result = await loginUser(await jsonBody(request));
      return result.token ? authResponse(result) : response(result);
    }

    if (method === "POST" && path === "/api/auth/otp/verify") {
      return authResponse(await verifyLoginOtp(await jsonBody(request)));
    }

    if (method === "POST" && path === "/api/auth/logout") {
      await logoutUser(bearerToken(request));
      return clearAuthResponse();
    }

    if (method === "GET" && path === "/api/auth/me") {
      const { user } = await requireUser(request);
      return response({ user });
    }

    if (method === "PUT" && path === "/api/profile") {
      const { user } = await requireActiveUser(request);
      return response({ user: await updateUserProfile(user.id, await jsonBody(request)) });
    }

    if (method === "GET" && path === "/api/credits") {
      const { user } = await requireActiveUser(request);
      return response({ credits: await creditSummary(user.id), packs: publicCreditPacks() });
    }

    if (method === "POST" && path === "/api/stripe/credits-checkout") {
      const { user } = await requireActiveUser(request);
      const body = await jsonBody(request);
      return response(await createCreditCheckout({ user, packId: body.packId, origin: originFor(request) }));
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
      const { user } = await requireAdminUser(request);
      return response({ session: await refreshWhatsAppStatus(user.id) });
    }

    if (method === "POST" && path === "/api/whatsapp/provision") {
      const { user } = await requireAdminUser(request);
      return response({ session: await ensureWhatsAppSession(user, originFor(request)) });
    }

    if (method === "POST" && path === "/api/whatsapp/disconnect") {
      const { user } = await requireAdminUser(request);
      return response({ session: await disconnectWhatsAppSession(user.id) });
    }

    if (method === "GET" && path === "/api/whatsapp/contact") {
      const { user } = await requireActiveUser(request);
      return response({ contact: whatsappContactFor(user) });
    }

    if (method === "POST" && path === "/api/evolution/webhook") {
      assertEvolutionWebhook(request, url);
      const result = await processEvolutionWebhook(await jsonBody(request));
      return response({ received: true, ...result });
    }

    if (method === "GET" && path === "/api/integrations/google/status") {
      const { user } = await requireActiveUser(request);
      return response({ status: await getCalendarStatus(user.id) });
    }

    if (method === "GET" && path === "/api/integrations/google/connect") {
      const { user } = await requireActiveUser(request);
      return response({ url: googleAuthUrl(user.id) });
    }

    if (method === "GET" && path === "/api/integrations/google/callback") {
      const dashboardUrl = originFor(request) + "/dashboard";
      try {
        await handleGoogleCallback(url.searchParams.get("code"), url.searchParams.get("state"));
        return redirect(`${dashboardUrl}?integration=google&status=connected`);
      } catch (error) {
        const message = encodeURIComponent(error?.message || "Collegamento Google non riuscito.");
        return redirect(`${dashboardUrl}?integration=google&status=error&message=${message}`);
      }
    }

    if (method === "POST" && path === "/api/integrations/google/disconnect") {
      const { user } = await requireActiveUser(request);
      await disconnectGoogleCalendar(user.id);
      return response({ status: await getCalendarStatus(user.id) });
    }

    if (method === "GET" && path === "/api/integrations/email/status") {
      const { user } = await requireActiveUser(request);
      return response({ status: await getEmailStatus(user.id) });
    }

    if (method === "POST" && path === "/api/integrations/email/connect") {
      const { user } = await requireActiveUser(request);
      const status = await connectEmailAccount(user.id, await jsonBody(request));
      return response({ status });
    }

    if (method === "POST" && path === "/api/integrations/email/disconnect") {
      const { user } = await requireActiveUser(request);
      await disconnectEmailAccount(user.id);
      return response({ status: await getEmailStatus(user.id) });
    }

    if (method === "GET" && path === "/api/email/drafts") {
      const { user } = await requireActiveUser(request);
      return response({ drafts: await listEmailDrafts(user.id) });
    }

    if (method === "POST" && path === "/api/email/drafts/send") {
      const { user } = await requireActiveUser(request);
      const draftId = url.searchParams.get("id");
      if (!draftId) throw apiError(400, "ID bozza mancante.");
      const body = await jsonBody(request);
      const result = await sendEmailDraft(user.id, draftId, body.body);
      return response({ ...result, drafts: await listEmailDrafts(user.id) });
    }

    if (method === "POST" && path === "/api/email/drafts/discard") {
      const { user } = await requireActiveUser(request);
      const draftId = url.searchParams.get("id");
      if (!draftId) throw apiError(400, "ID bozza mancante.");
      const result = await discardEmailDraft(user.id, draftId);
      return response({ ...result, drafts: await listEmailDrafts(user.id) });
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
      await consumeTokens(user.id, estimateTokens(question), "dashboard_input", { source: "dashboard-test" });
      const result = await answerWithKnowledge(user.id, question, profile.data);
      await consumeTokens(user.id, estimateTokens(result.answer), "dashboard_output", { model: result.model });
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

    if (method === "GET" && path === "/api/admin/users") {
      await requireAdminUser(request);
      return response({ users: await adminListUsers() });
    }

    if (method === "PUT" && path === "/api/admin/users") {
      const { user: admin } = await requireAdminUser(request);
      const user = await adminUpdateUser(await jsonBody(request), admin);
      return response({ user, users: await adminListUsers() });
    }

    if (method === "POST" && path === "/api/admin/tokens") {
      const { user: admin } = await requireAdminUser(request);
      const result = await adminGrantTokens(await jsonBody(request), admin);
      return response(result);
    }

    if (method === "GET" && path === "/api/admin/logs") {
      await requireAdminUser(request);
      return response({ logs: await adminLogs() });
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

