import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
});

pool.on("error", (error) => {
  console.error("[database] PostgreSQL pool error", error);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function migrate() {
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      plan_id TEXT NOT NULL DEFAULT 'none',
      subscription_id TEXT,
      stripe_customer_id TEXT,
      stripe_checkout_session_id TEXT,
      subscription_current_period_end TIMESTAMPTZ,
      last_payment_error TEXT,
      tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
      status TEXT NOT NULL DEFAULT 'pending',
      terms_accepted_at TIMESTAMPTZ,
      onboarding_completed_at TIMESTAMPTZ
    )
  `);

  const userColumns = [
    "ADD COLUMN IF NOT EXISTS password_hash TEXT",
    "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ",
    "ADD COLUMN IF NOT EXISTS last_payment_error TEXT",
    "ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ",
    "ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ",
  ];
  for (const definition of userColumns) {
    await query(`ALTER TABLE users ${definition}`);
  }
  await query("ALTER TABLE users ALTER COLUMN plan_id SET DEFAULT 'none'");
  await query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check");
  await query(`
    ALTER TABLE users ADD CONSTRAINT users_status_check
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled'))
  `).catch((error) => {
    if (error.code !== "42710") throw error;
  });

  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_config (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      agent_name TEXT DEFAULT 'Assistente Virtuale',
      tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
      role_description TEXT DEFAULT 'Assistente Digitale per l''Ufficio Virtuale',
      business_description TEXT,
      products TEXT,
      target_audience TEXT,
      competitors TEXT,
      onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'Assistente Virtuale'");
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS business_description TEXT");
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS products TEXT");
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS target_audience TEXT");
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS competitors TEXT");
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb");
  await query("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE");

  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      qdrant_collection TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      chunks_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query("ALTER TABLE knowledge_files ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processing'");
  await query("ALTER TABLE knowledge_files ADD COLUMN IF NOT EXISTS chunks_count INTEGER NOT NULL DEFAULT 0");
  await query("ALTER TABLE knowledge_files ADD COLUMN IF NOT EXISTS error_message TEXT");

  await query(`
    CREATE TABLE IF NOT EXISTS agent_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      instance_name TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_configured',
      qr_code TEXT,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);
  await query("ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS qr_code TEXT");
  await query("ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_error TEXT");

  await query(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)");
  await query("CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))");
  await query("CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_files(user_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_messages_user_created ON agent_messages(user_id, created_at DESC)");
  await query("CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_dedupe ON agent_messages(user_id, channel, created_at DESC)");
  await query("CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance ON whatsapp_sessions(instance_name)");
  await query("DELETE FROM sessions WHERE expires_at <= NOW()");
}

export async function closeDatabase() {
  await pool.end();
}
