-- ============================================================
-- Migration 005 — Correction profil utilisateur + trigger
-- Résumé Teacher Khati
-- Date : 2026-06-08
-- Problème : le trigger on_auth_user_created ne s'est pas
-- déclenché pour les users créés avant les migrations.
-- De plus, le role par défaut 'teacher' + site_ids vides
-- bloque l'accès RLS à tous les sites.
-- ============================================================

-- ─── 1. Corriger le trigger pour les nouveaux utilisateurs ──
-- Le premier utilisateur créé = admin (Teacher Khati).
-- Les suivants = teacher (enseignants futurs).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;

  INSERT INTO public.users (id, full_name, avatar_url, role, site_ids)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    -- Premier utilisateur = admin, les suivants = teacher
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'teacher' END,
    '{}'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Backfill — créer les profils manquants ──────────────
-- Insère un profil admin pour chaque auth.user sans profil.
-- Si un seul utilisateur existe → il devient admin.
-- Si plusieurs → tous deviennent admin (à ajuster manuellement).
INSERT INTO public.users (id, full_name, avatar_url, role, site_ids)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'avatar_url', ''),
  'admin',
  '{}'
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Corriger les profils existants avec role manquant ───
-- Si un profil existe mais avec role = 'teacher' et user est seul
-- → le promouvoir admin.
UPDATE public.users
SET role = 'admin'
WHERE id IN (
  SELECT pu.id
  FROM public.users pu
  -- Seulement si c'est le seul utilisateur OU si aucun admin n'existe encore
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE role = 'admin'
  )
);

-- ─── 4. Vérification finale ──────────────────────────────────
-- À titre informatif — pas d'erreur si vide.
-- SELECT id, full_name, role, site_ids FROM public.users;
