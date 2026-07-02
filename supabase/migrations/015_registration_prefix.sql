-- ============================================================
-- Migration 015 — Préfixe de numérotation par site
-- Résumé Teacher Khati — chantier de fusion Fiche Inscription
-- Date : 2026-07-01
-- ------------------------------------------------------------
-- Fiche Inscription attribue à chaque site un code numérique
-- (10, 20, 30…) servant de préfixe aux numéros d'inscription
-- séquentiels ("10-00001"). RTK n'avait aucune maison pour ce
-- code. On l'ajoute sur `sites` : c'est une propriété par site.
-- Décision produit validée (audit §8, 2026-07-01) : porter le
-- numéro d'inscription et sa génération séquentielle par site.
-- ============================================================

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS registration_prefix INT;

-- Un préfixe donné ne doit identifier qu'un seul site.
-- Index partiel : plusieurs sites peuvent rester à NULL,
-- mais deux sites ne peuvent pas partager le même préfixe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_registration_prefix
  ON sites (registration_prefix)
  WHERE registration_prefix IS NOT NULL;

COMMENT ON COLUMN sites.registration_prefix IS
  'Préfixe numérique hérité de Fiche Inscription (ex. 10) pour les numéros d''inscription séquentiels par site. NULL si le site n''en a pas.';
