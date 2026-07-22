-- Personale Artificiale — PostgreSQL initialisation
-- Eseguito automaticamente solo al primo avvio del volume postgres-data.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Evolution API usa un database separato nello stesso cluster.
SELECT 'CREATE DATABASE evolution'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution')\gexec

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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'cancelled')),
  terms_accepted_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

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
);

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
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  channel TEXT NOT NULL DEFAULT 'dashboard',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_files(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON agent_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_dedupe ON agent_messages(user_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance ON whatsapp_sessions(instance_name);
