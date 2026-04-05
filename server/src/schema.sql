CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'consumer',
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  suggestion_state JSONB,
  expires_at TIMESTAMP,
  saved_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  health_relevant BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consumer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS expert_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Minted',
  image_url TEXT,
  chain_hash TEXT,
  uploaded_at TIMESTAMP,
  minted_from TEXT,
  creator_name TEXT,
  file_format TEXT,
  usage_license TEXT,
  summary TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  ai_referral_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_asset_views (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(128),
  source VARCHAR(50) NOT NULL DEFAULT 'direct',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_asset_likes (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'plyt_app',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (asset_id, user_id)
);

CREATE TABLE IF NOT EXISTS digital_asset_saves (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'plyt_app',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (asset_id, user_id)
);

CREATE TABLE IF NOT EXISTS digital_asset_ai_referrals (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(128),
  source VARCHAR(50) NOT NULL DEFAULT 'assistant',
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_asset_views_asset_id ON digital_asset_views(asset_id);
CREATE INDEX IF NOT EXISTS idx_digital_asset_views_created_at ON digital_asset_views(created_at);
CREATE INDEX IF NOT EXISTS idx_digital_asset_ai_referrals_asset_id ON digital_asset_ai_referrals(asset_id);
CREATE INDEX IF NOT EXISTS idx_digital_asset_ai_referrals_created_at ON digital_asset_ai_referrals(created_at);

CREATE TABLE IF NOT EXISTS profile_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES profile_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  document_type TEXT,
  description TEXT,
  content_markdown TEXT,
  content_json JSONB,
  tags TEXT[],
  source TEXT,
  source_ref TEXT,
  source_conversation_id TEXT,
  source_message_index INT,
  selection_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_categories_user_id ON profile_categories(user_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_profile_items_category_id ON profile_items(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_items_user_id ON profile_items(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages_to_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT 'store_request',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_table TEXT,
  source_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preference_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  signal_value TEXT,
  confidence NUMERIC(4,2) NOT NULL DEFAULT 0.50,
  source TEXT NOT NULL DEFAULT 'derived',
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE (user_id, signal_type, signal_key, signal_value)
);

CREATE TABLE IF NOT EXISTS user_memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, summary_type)
);

CREATE TABLE IF NOT EXISTS allowed_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_to_admin_created_at ON messages_to_admin(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_to_admin_status ON messages_to_admin(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memory_events_user_id_created_at ON user_memory_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preference_signals_user_id_type ON user_preference_signals(user_id, signal_type, last_seen_at DESC);
