/**
 * Simple authentication and session management for Personale Artificiale.
 * Uses a token-based approach suitable for the dashboard.
 * In production, this would be replaced with a proper auth provider.
 */
import { query, execute } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  planId: string;
  subscriptionId: string | null;
  stripeCustomerId: string | null;
  toneOfVoice: string | null;
  status: "active" | "pending" | "cancelled";
}

/** Generate a simple session token */
function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Create the users table if it doesn't exist */
export function ensureTables(): void {
  execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    plan_id TEXT NOT NULL,
    subscription_id TEXT,
    stripe_customer_id TEXT,
    stripe_checkout_session_id TEXT,
    tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
    status TEXT NOT NULL DEFAULT 'pending'
  )`);

  execute(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  execute(`CREATE TABLE IF NOT EXISTS agent_config (
    user_id TEXT PRIMARY KEY,
    tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
    role_description TEXT DEFAULT 'Assistente Digitale per l''Ufficio Virtuale',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
}

/** Register or find a user by email */
export async function findOrCreateUser(params: {
  email: string;
  name: string;
  planId: string;
}): Promise<User> {
  const existing = query<User>(
    `SELECT id, email, name, created_at as createdAt, plan_id as planId,
            subscription_id as subscriptionId, stripe_customer_id as stripeCustomerId,
            tone_of_voice as toneOfVoice, status
     FROM users WHERE email = '${params.email.replace(/'/g, "''")}'`,
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const id = generateToken().slice(0, 12);
  const email = params.email.replace(/'/g, "''");
  const name = params.name.replace(/'/g, "''");

  execute(
    `INSERT INTO users (id, email, name, plan_id, status)
     VALUES ('${id}', '${email}', '${name}', '${params.planId}', 'pending')`,
  );

  // Also create an agent_config entry
  execute(
    `INSERT OR IGNORE INTO agent_config (user_id) VALUES ('${id}')`,
  );

  return {
    id,
    email: params.email,
    name: params.name,
    createdAt: new Date().toISOString(),
    planId: params.planId,
    subscriptionId: null,
    stripeCustomerId: null,
    toneOfVoice: null,
    status: "pending",
  };
}

/** Create a session for a user */
export function createSession(userId: string): string {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  execute(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ('${token}', '${userId}', '${expiresAt}')`,
  );
  return token;
}

/** Validate a session token and return the user */
export function validateSession(
  token: string,
): User | null {
  const sessions = query<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM sessions
     WHERE token = '${token.replace(/'/g, "''")}'`,
  );

  if (sessions.length === 0) return null;

  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) {
    execute(`DELETE FROM sessions WHERE token = '${token.replace(/'/g, "''")}'`);
    return null;
  }

  const users = query<User>(
    `SELECT id, email, name, created_at as createdAt, plan_id as planId,
            subscription_id as subscriptionId, stripe_customer_id as stripeCustomerId,
            tone_of_voice as toneOfVoice, status
     FROM users WHERE id = '${session.user_id.replace(/'/g, "''")}'`,
  );

  return users.length > 0 ? users[0] : null;
}

/** Save tone of voice configuration */
export function saveToneOfVoice(
  userId: string,
  toneOfVoice: string,
): boolean {
  const safeTone = toneOfVoice.replace(/'/g, "''");
  execute(
    `UPDATE agent_config SET tone_of_voice = '${safeTone}',
     updated_at = datetime('now') WHERE user_id = '${userId}'`,
  );
  return true;
}

/** Get agent configuration for a user */
export function getAgentConfig(userId: string): {
  toneOfVoice: string;
  roleDescription: string;
} | null {
  const configs = query<{
    tone_of_voice: string;
    role_description: string;
  }>(
    `SELECT tone_of_voice, role_description FROM agent_config WHERE user_id = '${userId.replace(/'/g, "''")}'`,
  );
  if (configs.length === 0) return null;
  return {
    toneOfVoice: configs[0].tone_of_voice,
    roleDescription: configs[0].role_description,
  };
}

/** Update user's subscription info after successful Stripe checkout */
export function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  stripeCustomerId: string,
  stripeCheckoutSessionId: string,
): void {
  execute(
    `UPDATE users SET
     subscription_id = '${subscriptionId}',
     stripe_customer_id = '${stripeCustomerId}',
     stripe_checkout_session_id = '${stripeCheckoutSessionId}',
     status = 'active'
     WHERE id = '${userId}'`,
  );
}

/** Update subscription status by Stripe subscription ID */
export function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
): void {
  execute(
    `UPDATE users SET status = '${status.replace(/'/g, "''")}'
     WHERE subscription_id = '${subscriptionId.replace(/'/g, "''")}'`,
  );
}