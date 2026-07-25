import { query, withTransaction } from "./db.mjs";
import { apiError } from "./auth.mjs";
import { getPlan } from "./plans.mjs";

export function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

export async function grantPlanAllowance(userId, planId, client = null) {
  const plan = getPlan(planId);
  if (!plan) return null;
  const db = client || { query };
  const result = await db.query(
    `UPDATE users
     SET monthly_token_allowance = $1,
         token_balance = CASE WHEN token_balance < $1 THEN $1 ELSE token_balance END,
         monthly_tokens_used = 0,
         token_reset_at = COALESCE(token_reset_at, NOW() + INTERVAL '30 days'),
         updated_at = NOW()
     WHERE id = $2
     RETURNING token_balance`,
    [plan.includedTokens || 0, userId],
  );
  const balance = result.rows[0]?.token_balance ?? 0;
  await db.query(
    `INSERT INTO token_ledger (user_id, delta, balance_after, reason, metadata)
     VALUES ($1, $2, $3, 'plan_allowance', $4::jsonb)`,
    [userId, plan.includedTokens || 0, balance, JSON.stringify({ planId })],
  );
  return balance;
}

export async function addCredits(userId, tokens, reason = "credit_purchase", metadata = {}, client = null) {
  const amount = Number(tokens || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw apiError(400, "Pacchetto crediti non valido.");
  const db = client || { query };
  const result = await db.query(
    `UPDATE users SET token_balance = token_balance + $1, updated_at = NOW()
     WHERE id = $2 RETURNING token_balance`,
    [Math.round(amount), userId],
  );
  const balance = result.rows[0]?.token_balance ?? 0;
  await db.query(
    `INSERT INTO token_ledger (user_id, delta, balance_after, reason, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [userId, Math.round(amount), balance, reason, JSON.stringify(metadata)],
  );
  return balance;
}

export async function consumeTokens(userId, tokens, reason = "ai_message", metadata = {}) {
  const amount = Math.max(1, Math.round(Number(tokens || 0)));
  return withTransaction(async (client) => {
    const user = await client.query("SELECT token_balance FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const balance = user.rows[0]?.token_balance ?? 0;
    if (balance < amount) {
      throw apiError(402, "Crediti token esauriti. Acquista un pacchetto crediti per continuare.", "token_balance_empty");
    }
    const result = await client.query(
      `UPDATE users
       SET token_balance = token_balance - $1,
           monthly_tokens_used = monthly_tokens_used + $1,
           updated_at = NOW()
       WHERE id = $2 RETURNING token_balance`,
      [amount, userId],
    );
    const next = result.rows[0]?.token_balance ?? 0;
    await client.query(
      `INSERT INTO token_ledger (user_id, delta, balance_after, reason, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [userId, -amount, next, reason, JSON.stringify(metadata)],
    );
    return next;
  });
}

export async function creditSummary(userId) {
  const user = await query(
    `SELECT token_balance, monthly_token_allowance, monthly_tokens_used, token_reset_at
     FROM users WHERE id = $1`,
    [userId],
  );
  const ledger = await query(
    `SELECT delta, balance_after, reason, metadata, created_at
     FROM token_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [userId],
  );
  return {
    balance: user.rows[0]?.token_balance ?? 0,
    monthlyAllowance: user.rows[0]?.monthly_token_allowance ?? 0,
    monthlyUsed: user.rows[0]?.monthly_tokens_used ?? 0,
    resetAt: user.rows[0]?.token_reset_at ?? null,
    ledger: ledger.rows,
  };
}
