-- ============================================================
-- Migration 001 — Schéma initial Phase 1
-- Résumé Teacher Khati
-- Date : 2026-06-06
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── TABLE : academic_years ─────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_active
  ON academic_years (is_active) WHERE is_active = true;

-- ─── TABLE : sites ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  address     TEXT,
  color       TEXT DEFAULT '#6366f1',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : levels ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS levels (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  age_min     INT NOT NULL,
  age_max     INT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#f59e0b',
  emoji       TEXT DEFAULT '🌟',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : groups ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  level_id         UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  day_of_week      INT CHECK (day_of_week BETWEEN 0 AND 6),
  time_slot        TEXT,
  max_students     INT DEFAULT 12,
  is_active        BOOLEAN DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, level_id, academic_year_id, name)
);

-- ─── TABLE : sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  title        TEXT,
  theme        TEXT,
  status       TEXT DEFAULT 'draft'
               CHECK (status IN ('draft', 'in_progress', 'completed')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : contents ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS contents (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type         TEXT NOT NULL
               CHECK (type IN ('padlet','youtube','pdf','image','audio','text','url')),
  url          TEXT,
  raw_text     TEXT,
  file_path    TEXT,
  metadata     JSONB DEFAULT '{}',
  ai_analysis  JSONB DEFAULT '{}',
  status       TEXT DEFAULT 'pending'
               CHECK (status IN ('pending','processing','ready','error')),
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : resumes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumes (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version      INT DEFAULT 1,
  title        TEXT NOT NULL,
  intro        TEXT,
  body_json    JSONB,
  body_html    TEXT,
  body_text    TEXT,
  ai_model     TEXT,
  ai_prompt    TEXT,
  status       TEXT DEFAULT 'draft'
               CHECK (status IN ('draft','reviewed','approved','sent')),
  is_current   BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_current
  ON resumes (session_id) WHERE is_current = true;

-- ─── TABLE : resume_sections ────────────────────────────────
CREATE TABLE IF NOT EXISTS resume_sections (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resume_id    UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  type         TEXT NOT NULL
               CHECK (type IN ('intro','vocabulary','activities','grammar','phonics','free')),
  title        TEXT,
  content_json JSONB,
  content_text TEXT,
  sort_order   INT DEFAULT 0,
  is_visible   BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : activities ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  level_ids    UUID[] DEFAULT '{}',
  skills       TEXT[] DEFAULT '{}',
  tags         TEXT[] DEFAULT '{}',
  duration_min INT,
  emoji        TEXT,
  is_public    BOOLEAN DEFAULT true,
  usage_count  INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : resume_activities ──────────────────────────────
CREATE TABLE IF NOT EXISTS resume_activities (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resume_id   UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
  sort_order  INT DEFAULT 0,
  custom_note TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : whatsapp_sends ─────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_sends (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resume_id       UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  message_body    TEXT NOT NULL,
  recipient_count INT DEFAULT 0,
  wa_message_ids  TEXT[] DEFAULT '{}',
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','sending','sent','partial_error','failed')),
  sent_at         TIMESTAMPTZ,
  error_log       JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : users (extension auth.users) ───────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT DEFAULT 'teacher'
              CHECK (role IN ('admin', 'teacher')),
  site_ids    UUID[] DEFAULT '{}',
  avatar_url  TEXT,
  preferences JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
