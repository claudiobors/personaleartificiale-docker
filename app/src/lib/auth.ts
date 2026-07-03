/**
 * Authentication and session management for Personale Artificiale.
 * PostgreSQL version with prepared statements.
 */
import { query, execute } from './db';
import crypto from 'node:crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  createdat: string;
  planid: string;
  subscriptionid: string | null;
  stripecustomerid: string | null;
  toneofvoice: string | null;
  status: 'active' | 'pending' | 'cancelled';
}

function generateToken(length = 48): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export async function findOrCreateUser(params: {
  email: string;
  name: string;
  planId: string;
}): Promise<User> {
  const existing = await query<User>(
    `SELECT id, email, name, created_at as createdAt, plan_id as planId,
            subscription_id as subscriptionId, stripe_customer_id as stripeCustomerId,
            tone_of_voice as toneOfVoice, status
     FROM users WHERE email = $1`,
    [params.email],
  );

  if (existing.length > 0) return existing[0];

  const result = await execute(
    `INSERT INTO users (id, email, name, plan_id, status)
     VALUES (gen_random_uuid(), $1, $2, $3, 'pending')
     RETURNING id, email, name, created_at as createdAt, plan_id as planId,
               subscription_id as subscriptionId, stripe_customer_id as stripeCustomerId,
               tone_of_voice as toneOfVoice, status`,
    [params.email, params.name, params.planId],
  );

  const user = result.rows[0] as unknown as User;

  await execute(
    `INSERT INTO agent_config (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [user.id],
  );

  return user;
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  await execute(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [token, userId],
  );
  return token;
}

export async function getUserBySession(
  token: string,
): Promise<User | null> {
  const users = await query<User>(
    `SELECT u.id, u.email, u.name, u.created_at as createdAt,
            u.plan_id as planId, u.subscription_id as subscriptionId,
            u.stripe_customer_id as stripeCustomerId,
            u.tone_of_voice as toneOfVoice, u.status
     FROM users u
     JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token],
  );
  return users[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await query<User>(
    `SELECT id, email, name, created_at as createdAt, plan_id as planId,
            subscription_id as subscriptionId, stripe_customer_id as stripeCustomerId,
            tone_of_voice as toneOfVoice, status
     FROM users WHERE id = $1`,
    [id],
  );
  return users[0] ?? null;
}

export async function getUserByStripeCustomerId(
  customerId: string,
): Promise<User | null> {
  const users = await query<User>(
    `SELECT id, email, name, created_at as createdAt, plan_id as planId,
            subscription_id as subscriptionId, stripe_customer_id as stripeCustomerId,
            tone_of_voice as toneOfVoice, status
     FROM users WHERE stripe_customer_id = $1`,
    [customerId],
  );
  return users[0] ?? null;
}

export async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  status: string,
): Promise<void> {
  await execute(
    `UPDATE users SET subscription_id = $1, status = $2 WHERE id = $3`,
    [subscriptionId, status, userId],
  );
}

export async function updateStripeCustomerId(
  userId: string,
  customerId: string,
): Promise<void> {
  await execute(
    `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
    [customerId, userId],
  );
}

export async function updateToneOfVoice(
  userId: string,
  toneOfVoice: string,
): Promise<void> {
  await execute(
    `UPDATE users SET tone_of_voice = $1 WHERE id = $2`,
    [toneOfVoice, userId],
  );
  await execute(
    `UPDATE agent_config SET tone_of_voice = $1, updated_at = NOW() WHERE user_id = $2`,
    [toneOfVoice, userId],
  );
}

export async function getActiveSessionCount(): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()`,
  );
  return parseInt(result[0]?.count ?? '0', 10);
}
