-- ============================================================
-- Migration 017 — Marque : logo de l'école + signataires de documents
-- Résumé Teacher Khati
-- Date : 2026-07-03
-- ------------------------------------------------------------
-- Demande utilisateur : uploader un logo (remplace le "K" partout
-- où c'est pertinent — Sidebar, page de connexion, PDF) et un ou
-- plusieurs signataires (chacun avec son nom/rôle + sa signature
-- scannée), appliqués automatiquement sur les documents imprimés
-- (facture, fiche de présence). Les colonnes stockent des CHEMINS
-- de stockage (pas des URLs) — l'URL signée est générée à chaque
-- lecture depuis le bucket privé `branding`.
-- ============================================================

-- ─── 1. Logo (un seul par utilisateur) ───────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN users.logo_url IS
  'Chemin dans le bucket Storage "branding" (ex. "<user_id>/logo.png"), pas une URL. NULL = logo par défaut (marque "K").';

-- ─── 2. Signataires (0 à plusieurs par utilisateur) ──────────
-- sort_order détermine la position sur les documents : le premier
-- (0) remplit le bloc "L'enseignant(e)", le second (1) le bloc
-- "Direction" sur la fiche de présence. Label libre (ex. "Teacher
-- Khati", "Directeur", "Directrice", ou tout autre intitulé).
CREATE TABLE IF NOT EXISTS signatories (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label          TEXT        NOT NULL DEFAULT 'Signataire',
  signature_url  TEXT,       -- chemin storage, ex. "<user_id>/signatories/<id>.png" ; NULL = pas encore uploadée
  sort_order     INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE signatories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signatories_owner" ON signatories;
CREATE POLICY "signatories_owner" ON signatories
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK   (auth.uid() = user_id);

DROP TRIGGER IF EXISTS signatories_updated_at ON signatories;
CREATE TRIGGER signatories_updated_at
  BEFORE UPDATE ON signatories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_signatories_user_sort ON signatories(user_id, sort_order);

-- ─── 3. Bucket Storage privé pour logo + signatures ──────────
-- Privé : les URLs signées sont générées côté serveur à l'affichage,
-- jamais de lien public permanent et devinable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "branding_owner_select" ON storage.objects;
CREATE POLICY "branding_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "branding_owner_insert" ON storage.objects;
CREATE POLICY "branding_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "branding_owner_update" ON storage.objects;
CREATE POLICY "branding_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "branding_owner_delete" ON storage.objects;
CREATE POLICY "branding_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]
  );
