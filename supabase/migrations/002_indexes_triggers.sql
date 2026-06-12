-- ============================================================
-- Migration 002 — Indexes, triggers, updated_at
-- Date : 2026-06-06
-- ============================================================

-- ─── INDEXES DE PERFORMANCE ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_groups_site_id         ON groups(site_id);
CREATE INDEX IF NOT EXISTS idx_groups_level_id        ON groups(level_id);
CREATE INDEX IF NOT EXISTS idx_groups_academic_year   ON groups(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_groups_active          ON groups(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sessions_group_id      ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date          ON sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status        ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_contents_session_id    ON contents(session_id);
CREATE INDEX IF NOT EXISTS idx_contents_type          ON contents(type);
CREATE INDEX IF NOT EXISTS idx_contents_status        ON contents(status);

CREATE INDEX IF NOT EXISTS idx_resumes_session_id     ON resumes(session_id);
CREATE INDEX IF NOT EXISTS idx_resumes_status         ON resumes(status);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at     ON resumes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resume_sections_resume ON resume_sections(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_sections_order  ON resume_sections(resume_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_resume_activities_resume ON resume_activities(resume_id);

CREATE INDEX IF NOT EXISTS idx_wa_sends_resume_id     ON whatsapp_sends(resume_id);
CREATE INDEX IF NOT EXISTS idx_wa_sends_group_id      ON whatsapp_sends(group_id);
CREATE INDEX IF NOT EXISTS idx_wa_sends_status        ON whatsapp_sends(status);

-- Index full-text pour la recherche dans les résumés
CREATE INDEX IF NOT EXISTS idx_resumes_fts
  ON resumes USING gin(
    to_tsvector('french',
      COALESCE(title, '') || ' ' || COALESCE(body_text, '')
    )
  );

-- ─── TRIGGER : updated_at automatique ───────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur chaque table
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'academic_years', 'sites', 'levels', 'groups',
    'sessions', 'contents', 'resumes', 'resume_sections',
    'activities', 'whatsapp_sends', 'users'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ─── TRIGGER : créer profil user automatiquement ────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
