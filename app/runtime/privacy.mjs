import { rm } from "node:fs/promises";
import path from "node:path";
import { apiError } from "./auth.mjs";
import { query, withTransaction } from "./db.mjs";
import { deleteUserVectors } from "./rag.mjs";

const UPLOADS_BASE = process.env.UPLOADS_DIR || "/app/uploads";

function rows(result) {
  return result.rows || [];
}

export async function exportUserData(userId) {
  const [user, config, files, messages, whatsapp] = await Promise.all([
    query(
      `SELECT id, email, name, created_at, updated_at, plan_id, status,
              subscription_current_period_end, terms_accepted_at, onboarding_completed_at
       FROM users WHERE id = $1`,
      [userId],
    ),
    query(
      `SELECT agent_name, tone_of_voice, role_description, business_description,
              products, target_audience, competitors, onboarding_data,
              onboarding_completed, created_at, updated_at
       FROM agent_config WHERE user_id = $1`,
      [userId],
    ),
    query(
      `SELECT id, original_name, mime_type, file_size, status, chunks_count,
              error_message, created_at
       FROM knowledge_files WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    ),
    query(
      `SELECT direction, channel, content, metadata, created_at
       FROM agent_messages WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    ),
    query(
      `SELECT instance_name, status, last_error, created_at, updated_at
       FROM whatsapp_sessions WHERE user_id = $1`,
      [userId],
    ),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: rows(user)[0] || null,
    configuration: rows(config)[0] || null,
    knowledgeFiles: rows(files),
    messages: rows(messages),
    whatsapp: rows(whatsapp)[0] || null,
  };
}

export async function deleteUserData(userId, confirmation) {
  if (String(confirmation || "").toUpperCase() !== "ELIMINA") {
    throw apiError(400, "Per eliminare i dati devi confermare con ELIMINA.");
  }

  const userResult = await query("SELECT id, stripe_customer_id, subscription_id FROM users WHERE id = $1", [userId]);
  if (!userResult.rows[0]) throw apiError(404, "Utente non trovato.");

  await deleteUserVectors(userId).catch((error) => console.warn("[privacy] vector cleanup failed", error.message));
  await rm(path.join(UPLOADS_BASE, userId), { recursive: true, force: true }).catch(() => {});

  await withTransaction(async (client) => {
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
  });

  return { deleted: true, deletedAt: new Date().toISOString() };
}
