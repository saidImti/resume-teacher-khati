-- ────────────────────────────────────────────────────────────────
-- Migration 014 — Outils / Intégrations personnalisées
-- Permet à l'utilisateur d'ajouter n'importe quelle intégration :
-- n8n, Make, Airtable, Notion, Zapier, Slack, etc.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_tools (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  icon_emoji   TEXT        DEFAULT '🔧',
  category     TEXT        DEFAULT 'autre'
               CHECK (category IN ('automation','crm','communication','stockage','paiement','calendrier','autre')),
  external_url TEXT,
  webhook_url  TEXT,
  api_key      TEXT,
  is_active    BOOLEAN     DEFAULT true,
  sort_order   INT         DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_tools_user_id ON user_tools(user_id);

ALTER TABLE user_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tools_owner" ON user_tools;
CREATE POLICY "user_tools_owner" ON user_tools
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_tools_updated_at ON user_tools;
CREATE TRIGGER user_tools_updated_at
  BEFORE UPDATE ON user_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
