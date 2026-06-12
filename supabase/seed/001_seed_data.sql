-- ============================================================
-- Seed 001 — Données initiales
-- Date : 2026-06-06
-- À exécuter après les migrations
-- ============================================================

-- ─── Niveaux (fixes) ────────────────────────────────────────
INSERT INTO levels (name, slug, age_min, age_max, emoji, color, sort_order)
VALUES
  ('Preschoolers', 'preschoolers', 3,  5,  '🐣', '#10b981', 1),
  ('Kids',         'kids',         6,  8,  '🌟', '#f59e0b', 2),
  ('Juniors',      'juniors',      9,  11, '🚀', '#3b82f6', 3),
  ('Tweens',       'tweens',       12, 14, '🎯', '#8b5cf6', 4),
  ('Teenagers',    'teenagers',    15, 18, '🏆', '#ef4444', 5)
ON CONFLICT (slug) DO NOTHING;

-- ─── Année scolaire courante ─────────────────────────────────
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES ('2025-2026', '2025-09-01', '2026-07-05', true)
ON CONFLICT DO NOTHING;

-- ─── Sites ──────────────────────────────────────────────────
INSERT INTO sites (name, slug, address, color)
VALUES
  ('Maison-Alfort', 'maison-alfort', 'Maison-Alfort, 94700', '#6366f1'),
  ('Champigny',     'champigny',     'Champigny-sur-Marne, 94500', '#f59e0b')
ON CONFLICT (slug) DO NOTHING;

-- ─── Activités de base ──────────────────────────────────────
-- (IDs des niveaux récupérés dynamiquement)
DO $$
DECLARE
  preschoolers_id UUID;
  kids_id UUID;
  juniors_id UUID;
  tweens_id UUID;
  teenagers_id UUID;
BEGIN
  SELECT id INTO preschoolers_id FROM levels WHERE slug = 'preschoolers';
  SELECT id INTO kids_id         FROM levels WHERE slug = 'kids';
  SELECT id INTO juniors_id      FROM levels WHERE slug = 'juniors';
  SELECT id INTO tweens_id       FROM levels WHERE slug = 'tweens';
  SELECT id INTO teenagers_id    FROM levels WHERE slug = 'teenagers';

  INSERT INTO activities (name, description, level_ids, skills, tags, duration_min, emoji)
  VALUES
    ('Flashcard Game',      'Jeu de mémorisation avec cartes vocabulaire',
     ARRAY[preschoolers_id, kids_id], ARRAY['vocabulary','speaking'], ARRAY['vocabulary','game'], 10, '🃏'),

    ('Simon Says',          'Jeu de consignes en anglais',
     ARRAY[preschoolers_id, kids_id, juniors_id], ARRAY['listening','speaking'], ARRAY['game','instructions'], 10, '👂'),

    ('Song & Dance',        'Chanson avec mouvements',
     ARRAY[preschoolers_id, kids_id], ARRAY['listening','speaking'], ARRAY['song','movement'], 10, '🎵'),

    ('Story Time',          'Lecture d''une histoire illustrée',
     ARRAY[preschoolers_id, kids_id, juniors_id], ARRAY['listening','reading'], ARRAY['story','reading'], 15, '📚'),

    ('Role Play',           'Jeu de rôle en anglais',
     ARRAY[kids_id, juniors_id, tweens_id], ARRAY['speaking','listening'], ARRAY['roleplay','communication'], 15, '🎭'),

    ('Vocabulary Bingo',    'Bingo avec les mots de la leçon',
     ARRAY[kids_id, juniors_id], ARRAY['vocabulary','listening'], ARRAY['game','vocabulary'], 10, '🎱'),

    ('Writing Activity',    'Exercice d''écriture guidé',
     ARRAY[juniors_id, tweens_id, teenagers_id], ARRAY['writing'], ARRAY['writing','grammar'], 20, '✏️'),

    ('Debate / Discussion', 'Discussion ouverte ou mini-débat',
     ARRAY[tweens_id, teenagers_id], ARRAY['speaking','listening'], ARRAY['debate','communication'], 20, '💬'),

    ('Grammar Game',        'Jeu pour pratiquer une règle grammaticale',
     ARRAY[juniors_id, tweens_id, teenagers_id], ARRAY['grammar','speaking'], ARRAY['grammar','game'], 15, '🔤'),

    ('Pronunciation Drill', 'Exercice de phonétique et prononciation',
     ARRAY[preschoolers_id, kids_id, juniors_id], ARRAY['phonics','speaking'], ARRAY['phonics','pronunciation'], 10, '🗣️')
  ON CONFLICT DO NOTHING;
END;
$$;
