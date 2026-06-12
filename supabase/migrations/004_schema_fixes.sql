-- ============================================================
-- Migration 004 — Corrections divergences schéma vs code
-- Résumé Teacher Khati
-- Date : 2026-06-07
-- ============================================================

-- ─── FIX 1 : groups — ajout colonne sort_order ──────────────
-- La colonne sort_order est utilisée par SortableGroupList (Phase 3)
-- mais était absente de la migration initiale.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- ─── FIX 2 : resume_sections — correction du CHECK type ─────
-- La migration 001 avait les anciens types ('intro','vocabulary',
-- 'activities','grammar','phonics','free').
-- Le code utilise : 'intro','activity','vocabulary','grammar',
-- 'song','story','game','outro','custom' + on garde phonics et free
-- pour la rétrocompatibilité.
ALTER TABLE resume_sections DROP CONSTRAINT IF EXISTS resume_sections_type_check;
ALTER TABLE resume_sections ADD CONSTRAINT resume_sections_type_check
  CHECK (type IN (
    'intro',
    'activity',
    'vocabulary',
    'grammar',
    'song',
    'story',
    'game',
    'outro',
    'custom',
    'phonics',
    'free'
  ));

-- ─── FIX 3 : trigger updated_at pour whatsapp_sends ─────────
-- S'assurer que la table whatsapp_sends bénéficie du trigger
-- (au cas où la migration 002 ne l'aurait pas inclus).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'handle_updated_at'
    AND tgrelid = 'whatsapp_sends'::regclass
  ) THEN
    CREATE TRIGGER handle_updated_at
      BEFORE UPDATE ON whatsapp_sends
      FOR EACH ROW
      EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- moddatetime peut ne pas être disponible, on ignore
  NULL;
END $$;
