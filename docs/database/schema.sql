-- ============================================================
-- RÉSUMÉ TEACHER KHATI — Schéma Supabase complet
-- Version : 1.0.0 | Date : 2026-06-06
-- ============================================================
-- Ce fichier est la référence canonique du schéma.
-- Les migrations se trouvent dans supabase/migrations/
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Recherche full-text

-- ============================================================
-- TABLE : academic_years (Années scolaires)
-- ============================================================
CREATE TABLE academic_years (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,              -- Ex: "2024-2025"
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Contrainte : une seule année active
CREATE UNIQUE INDEX idx_academic_years_active ON academic_years (is_active) WHERE is_active = true;

-- ============================================================
-- TABLE : sites (Sites physiques)
-- ============================================================
CREATE TABLE sites (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,              -- Ex: "Maison-Alfort"
  slug        TEXT NOT NULL UNIQUE,       -- Ex: "maison-alfort"
  address     TEXT,
  color       TEXT DEFAULT '#6366f1',     -- Couleur UI du site
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : levels (Niveaux pédagogiques)
-- ============================================================
CREATE TABLE levels (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,          -- Ex: "Kids"
  slug            TEXT NOT NULL UNIQUE,   -- Ex: "kids"
  age_min         INT NOT NULL,           -- 6
  age_max         INT NOT NULL,           -- 8
  description     TEXT,
  color           TEXT DEFAULT '#f59e0b',
  emoji           TEXT DEFAULT '🌟',
  sort_order      INT DEFAULT 0,          -- Pour l'affichage trié
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales des niveaux (seed)
INSERT INTO levels (name, slug, age_min, age_max, emoji, color, sort_order) VALUES
  ('Preschoolers', 'preschoolers', 3,  5,  '🐣', '#10b981', 1),
  ('Kids',         'kids',         6,  8,  '🌟', '#f59e0b', 2),
  ('Juniors',      'juniors',      9,  11, '🚀', '#3b82f6', 3),
  ('Tweens',       'tweens',       12, 14, '🎯', '#8b5cf6', 4),
  ('Teenagers',    'teenagers',    15, 18, '🏆', '#ef4444', 5);

-- ============================================================
-- TABLE : groups (Groupes de cours)
-- ============================================================
CREATE TABLE groups (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  level_id         UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,         -- Ex: "Kids A", "Kids B"
  day_of_week      INT,                   -- 0=Lundi, 6=Dimanche (optionnel)
  time_slot        TEXT,                  -- Ex: "14h00-15h00" (optionnel)
  max_students     INT DEFAULT 12,
  is_active        BOOLEAN DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, level_id, academic_year_id, name)
);

-- ============================================================
-- TABLE : sessions (Séances de cours)
-- ============================================================
CREATE TABLE sessions (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id         UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  session_date     DATE NOT NULL,
  title            TEXT,                  -- Titre optionnel de la séance
  theme            TEXT,                  -- Ex: "Animals", "Colors"
  status           TEXT DEFAULT 'draft'   -- draft | in_progress | completed
                   CHECK (status IN ('draft', 'in_progress', 'completed')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : contents (Contenus source)
-- ============================================================
CREATE TABLE contents (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type         TEXT NOT NULL              -- padlet | youtube | pdf | image | audio | text | url
               CHECK (type IN ('padlet', 'youtube', 'pdf', 'image', 'audio', 'text', 'url')),
  url          TEXT,                      -- URL source (Padlet, YouTube...)
  raw_text     TEXT,                      -- Contenu texte brut
  file_path    TEXT,                      -- Path Supabase Storage (PDF, images...)
  metadata     JSONB DEFAULT '{}',        -- Données extraites (titre YT, nb cartes Padlet...)
  ai_analysis  JSONB DEFAULT '{}',        -- Résultat de l'analyse IA
  status       TEXT DEFAULT 'pending'     -- pending | processing | ready | error
               CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : resumes (Résumés générés)
-- ============================================================
CREATE TABLE resumes (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version      INT DEFAULT 1,             -- Numéro de version (régénérations)
  title        TEXT NOT NULL,             -- Titre du résumé
  intro        TEXT,                      -- Introduction (ex: "Cette semaine...")
  body_json    JSONB,                     -- Contenu TipTap (JSON)
  body_html    TEXT,                      -- HTML rendu pour WhatsApp
  body_text    TEXT,                      -- Texte brut pour WhatsApp
  ai_model     TEXT,                      -- Modèle IA utilisé (gpt-4o, claude-3...)
  ai_prompt    TEXT,                      -- Prompt utilisé (pour traçabilité)
  status       TEXT DEFAULT 'draft'       -- draft | reviewed | approved | sent
               CHECK (status IN ('draft', 'reviewed', 'approved', 'sent')),
  is_current   BOOLEAN DEFAULT true,      -- Version actuelle (une seule par session)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Un seul résumé "actuel" par session
CREATE UNIQUE INDEX idx_resumes_current ON resumes (session_id) WHERE is_current = true;

-- ============================================================
-- TABLE : resume_sections (Sections du résumé — Drag & Drop)
-- ============================================================
CREATE TABLE resume_sections (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resume_id    UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  type         TEXT NOT NULL              -- intro | vocabulary | activities | grammar | phonics | free
               CHECK (type IN ('intro', 'vocabulary', 'activities', 'grammar', 'phonics', 'free')),
  title        TEXT,
  content_json JSONB,                     -- Contenu TipTap de la section
  content_text TEXT,
  sort_order   INT DEFAULT 0,
  is_visible   BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : activities (Bibliothèque d'activités)
-- ============================================================
CREATE TABLE activities (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  level_ids    UUID[] DEFAULT '{}',       -- Niveaux compatibles (array)
  skills       TEXT[] DEFAULT '{}',       -- speaking | listening | reading | writing | phonics
  tags         TEXT[] DEFAULT '{}',       -- Tags libres (animals, colors, numbers...)
  duration_min INT,                       -- Durée en minutes
  emoji        TEXT,
  is_public    BOOLEAN DEFAULT true,
  usage_count  INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : resume_activities (Activités liées à un résumé)
-- ============================================================
CREATE TABLE resume_activities (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resume_id    UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  activity_id  UUID NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
  sort_order   INT DEFAULT 0,
  custom_note  TEXT,                      -- Note personnalisée pour ce cours
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : whatsapp_sends (Historique des envois WhatsApp)
-- ============================================================
CREATE TABLE whatsapp_sends (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resume_id         UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  message_body      TEXT NOT NULL,        -- Message tel qu'envoyé
  recipient_count   INT DEFAULT 0,        -- Nb de destinataires
  wa_message_ids    TEXT[] DEFAULT '{}',  -- IDs messages WhatsApp
  status            TEXT DEFAULT 'pending' -- pending | sending | sent | partial_error | failed
                    CHECK (status IN ('pending', 'sending', 'sent', 'partial_error', 'failed')),
  sent_at           TIMESTAMPTZ,
  error_log         JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : users (Extension du profil Supabase Auth)
-- ============================================================
CREATE TABLE users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  role         TEXT DEFAULT 'teacher'     -- admin | teacher
               CHECK (role IN ('admin', 'teacher')),
  site_ids     UUID[] DEFAULT '{}',       -- Sites accessibles
  avatar_url   TEXT,
  preferences  JSONB DEFAULT '{}',        -- Préférences UI (thème, langue...)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES DE PERFORMANCE
-- ============================================================
CREATE INDEX idx_groups_site_id         ON groups(site_id);
CREATE INDEX idx_groups_level_id        ON groups(level_id);
CREATE INDEX idx_groups_academic_year   ON groups(academic_year_id);
CREATE INDEX idx_sessions_group_id      ON sessions(group_id);
CREATE INDEX idx_sessions_date          ON sessions(session_date DESC);
CREATE INDEX idx_contents_session_id    ON contents(session_id);
CREATE INDEX idx_resumes_session_id     ON resumes(session_id);
CREATE INDEX idx_resume_sections_resume ON resume_sections(resume_id);
CREATE INDEX idx_wa_sends_resume_id     ON whatsapp_sends(resume_id);
CREATE INDEX idx_wa_sends_group_id      ON whatsapp_sends(group_id);

-- Recherche full-text sur les résumés
CREATE INDEX idx_resumes_fts ON resumes USING gin(to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(body_text, '')));

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE sites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sends    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs ne voient que les données de leurs sites
-- (Implémentation complète dans les migrations)

-- ============================================================
-- TRIGGERS : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables avec updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['academic_years','sites','levels','groups',
    'sessions','contents','resumes','resume_sections','activities',
    'resume_activities','whatsapp_sends','users']
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()', tbl);
  END LOOP;
END;
$$;
