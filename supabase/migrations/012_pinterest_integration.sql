-- ============================================================
-- Migration 012 — Intégration Pinterest OAuth
-- Résumé Teacher Khati
-- Date : 2026-06-22
-- ============================================================

CREATE TABLE IF NOT EXISTS pinterest_settings (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token          TEXT,
  refresh_token         TEXT,
  token_expires_at      TIMESTAMPTZ,

  -- Infos du compte Pinterest lié
  pinterest_user_id     TEXT,
  pinterest_username    TEXT,
  pinterest_full_name   TEXT,
  pinterest_profile_url TEXT,

  -- Stats
  pins_created          INTEGER DEFAULT 0,
  last_pin_at           TIMESTAMPTZ,

  connected_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pinterest_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pinterest_settings_owner" ON pinterest_settings;
CREATE POLICY "pinterest_settings_owner" ON pinterest_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK   (auth.uid() = user_id);

DROP TRIGGER IF EXISTS pinterest_settings_updated_at ON pinterest_settings;
CREATE TRIGGER pinterest_settings_updated_at
  BEFORE UPDATE ON pinterest_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
