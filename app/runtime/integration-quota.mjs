import { query } from "./db.mjs";
import { apiError } from "./auth.mjs";
import { getPlan } from "./plans.mjs";

export async function integrationQuota(userId) {
  const result = await query(`SELECT plan_id, extra_integration_slots FROM users WHERE id = $1`, [userId]);
  const row = result.rows[0];
  const plan = getPlan(row?.plan_id);
  const included = plan?.includedIntegrations || 0;
  const extra = row?.extra_integration_slots || 0;
  const usedResult = await query(`SELECT COUNT(*)::int AS count FROM integrations WHERE user_id = $1 AND status = 'connected'`, [userId]);
  return { included, extra, total: included + extra, used: usedResult.rows[0].count };
}

/**
 * Va chiamata prima di attivare una NUOVA integrazione (provider non ancora collegato).
 * Se il provider risulta già connesso, non conta come nuovo slot: ricollegare/aggiornare
 * le credenziali di un'integrazione esistente è sempre permesso.
 */
export async function assertIntegrationSlot(userId, provider) {
  const existing = await query(
    `SELECT 1 FROM integrations WHERE user_id = $1 AND provider = $2 AND status = 'connected'`,
    [userId, provider],
  );
  if (existing.rowCount) return;

  const quota = await integrationQuota(userId);
  if (quota.used >= quota.total) {
    const error = apiError(402, `Hai raggiunto il limite di ${quota.total} integrazioni del tuo piano.`, "integration_quota_exceeded");
    error.quota = quota;
    throw error;
  }
}
