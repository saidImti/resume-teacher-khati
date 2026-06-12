-- ============================================================
-- Seed 002 — Groupes initiaux Teacher Khati
-- Date : 2026-06-08
-- 10 groupes : 5 niveaux x 2 sites
-- ============================================================

DO $$
DECLARE
  champigny_id     UUID;
  maison_alfort_id UUID;
  preschoolers_id  UUID;
  kids_id          UUID;
  juniors_id       UUID;
  tweens_id        UUID;
  teenagers_id     UUID;
  year_id          UUID;
BEGIN
  SELECT id INTO champigny_id     FROM sites WHERE slug = 'champigny';
  SELECT id INTO maison_alfort_id FROM sites WHERE slug = 'maison-alfort';
  SELECT id INTO preschoolers_id  FROM levels WHERE slug = 'preschoolers';
  SELECT id INTO kids_id          FROM levels WHERE slug = 'kids';
  SELECT id INTO juniors_id       FROM levels WHERE slug = 'juniors';
  SELECT id INTO tweens_id        FROM levels WHERE slug = 'tweens';
  SELECT id INTO teenagers_id     FROM levels WHERE slug = 'teenagers';
  SELECT id INTO year_id          FROM academic_years WHERE is_active = true LIMIT 1;

  IF champigny_id IS NULL     THEN RAISE EXCEPTION 'Site champigny introuvable'; END IF;
  IF maison_alfort_id IS NULL THEN RAISE EXCEPTION 'Site maison-alfort introuvable'; END IF;
  IF preschoolers_id IS NULL  THEN RAISE EXCEPTION 'Niveau preschoolers introuvable'; END IF;
  IF year_id IS NULL          THEN RAISE EXCEPTION 'Aucune annee scolaire active'; END IF;

  -- Champigny
  INSERT INTO groups (site_id, level_id, academic_year_id, name, sort_order, is_active, max_students)
  VALUES
    (champigny_id, preschoolers_id, year_id, 'Preschoolers', 1, true, 12),
    (champigny_id, kids_id,         year_id, 'Kids',         2, true, 12),
    (champigny_id, juniors_id,      year_id, 'Juniors',      3, true, 12),
    (champigny_id, tweens_id,       year_id, 'Tweens',       4, true, 12),
    (champigny_id, teenagers_id,    year_id, 'Teenagers',    5, true, 12)
  ON CONFLICT (site_id, level_id, academic_year_id, name) DO NOTHING;

  -- Maison-Alfort
  INSERT INTO groups (site_id, level_id, academic_year_id, name, sort_order, is_active, max_students)
  VALUES
    (maison_alfort_id, preschoolers_id, year_id, 'Preschoolers', 1, true, 12),
    (maison_alfort_id, kids_id,         year_id, 'Kids',         2, true, 12),
    (maison_alfort_id, juniors_id,      year_id, 'Juniors',      3, true, 12),
    (maison_alfort_id, tweens_id,       year_id, 'Tweens',       4, true, 12),
    (maison_alfort_id, teenagers_id,    year_id, 'Teenagers',    5, true, 12)
  ON CONFLICT (site_id, level_id, academic_year_id, name) DO NOTHING;

  RAISE NOTICE 'Groupes crees avec succes';
END;
$$;
