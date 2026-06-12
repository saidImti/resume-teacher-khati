-- ============================================================
-- Migration 008 — Clés API pour intégrations externes
-- Permet à n8n, Make, Zapier, etc. d'accéder aux routes /api/*
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,                          -- ex: "n8n production"
  key_hash    TEXT        NOT NULL UNIQUE,                   -- SHA-256 de la clé
  key_prefix  TEXT        NOT NULL,                          -- ex: "rtk_abc123" (affiché en UI)
  scopes      TEXT[]      DEFAULT ARRAY['read'],             -- 'read', 'write', 'admin'
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,                                   -- NULL = pas d'expiration
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id    ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash   ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active  ON api_keys(is_active);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();
