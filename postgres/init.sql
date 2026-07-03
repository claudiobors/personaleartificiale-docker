-- Personale Artificiale — PostgreSQL initialisation
-- Run automatically on first database creation.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    plan_id TEXT NOT NULL,
    subscription_id TEXT,
    stripe_customer_id TEXT,
    stripe_checkout_session_id TEXT,
    tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
    status TEXT NOT NULL DEFAULT 'pending',
    CHECK (status IN ('active', 'pending', 'cancelled'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Agent configuration
CREATE TABLE IF NOT EXISTS agent_config (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT DEFAULT 'Assistente Virtuale',
    tone_of_voice TEXT DEFAULT 'Professionale, cortese e amichevole',
    role_description TEXT DEFAULT 'Assistente Digitale per l''Ufficio Virtuale',
    business_description TEXT,
    products TEXT,
    target_audience TEXT,
    competitors TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WhatsApp sessions
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    qr_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id),
    CHECK (status IN ('pending', 'connecting', 'connected', 'disconnected', 'error'))
);

-- Knowledge base files
CREATE TABLE IF NOT EXISTS knowledge_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    qdrant_collection TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent messages log
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON agent_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_files(user_id);
