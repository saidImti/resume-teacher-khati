-- ============================================================
-- Migration 016 — Numéro d'inscription séquentiel par famille
-- Résumé Teacher Khati — fonctionnalité portée depuis Fiche Inscription
-- Date : 2026-07-02
-- ------------------------------------------------------------
-- Legacy : chaque inscription (= famille) reçoit un numéro
-- "<préfixe site><séquentiel sur 5 chiffres>" — ex. "2000001",
-- affiché "20-00001". Le préfixe vient de sites.registration_prefix
-- (migration 015). Génération ATOMIQUE côté base via trigger :
-- couvre tous les chemins de création (admin, inscription publique)
-- sans dupliquer la logique côté application.
-- ============================================================

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_families_registration_number
  ON families (registration_number)
  WHERE registration_number IS NOT NULL;

-- SECURITY DEFINER : le trigger doit lire le préfixe du site et le max
-- des numéros existants SANS être limité par la RLS de l'utilisateur
-- appelant (même convention que has_site_access / is_admin en 003).
CREATE OR REPLACE FUNCTION assign_family_registration_number()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix INT;
  v_next   INT;
BEGIN
  -- Ne jamais écraser un numéro fourni explicitement (idempotence / import).
  IF NEW.registration_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Préfixe du site principal ; 99 en repli (même convention que le legacy).
  SELECT registration_prefix INTO v_prefix
    FROM sites WHERE id = NEW.primary_site_id;
  IF v_prefix IS NULL THEN
    v_prefix := 99;
  END IF;

  -- Verrou consultatif par préfixe : sérialise les créations simultanées
  -- sur un même site pour éviter deux fois le même séquentiel.
  PERFORM pg_advisory_xact_lock(hashtext('family_regnum_' || v_prefix::text));

  -- Prochain séquentiel = max existant pour ce préfixe + 1.
  SELECT COALESCE(MAX(substring(registration_number FROM length(v_prefix::text) + 1)::int), 0) + 1
    INTO v_next
    FROM families
   WHERE registration_number LIKE v_prefix::text || '%'
     AND length(registration_number) = length(v_prefix::text) + 5;

  NEW.registration_number := v_prefix::text || lpad(v_next::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_families_registration_number ON families;
CREATE TRIGGER trg_families_registration_number
  BEFORE INSERT ON families
  FOR EACH ROW
  EXECUTE FUNCTION assign_family_registration_number();

COMMENT ON COLUMN families.registration_number IS
  'Numéro d''inscription séquentiel par site — stocké "2000001", affiché "20-00001". Attribué automatiquement par trigger à la création.';
