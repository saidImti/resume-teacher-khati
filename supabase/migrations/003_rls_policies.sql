-- ============================================================
-- Migration 003 — Row Level Security (RLS)
-- Date : 2026-06-06
-- ============================================================
-- Règles :
--   admin  → accès complet à tout
--   teacher → accès uniquement à ses sites (users.site_ids)
--   Invité  → aucun accès
-- ============================================================

-- ─── Activer RLS sur toutes les tables ──────────────────────
ALTER TABLE academic_years    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_sections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sends     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;

-- ─── Fonction helper : est admin ? ──────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Fonction helper : accès à ce site ? ────────────────────
CREATE OR REPLACE FUNCTION has_site_access(site_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (role = 'admin' OR site_uuid = ANY(site_ids))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── academic_years : lecture pour tous les authentifiés ─────
CREATE POLICY "academic_years_select" ON academic_years
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "academic_years_all_admin" ON academic_years
  FOR ALL TO authenticated USING (is_admin());

-- ─── levels : lecture pour tous les authentifiés ─────────────
CREATE POLICY "levels_select" ON levels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "levels_all_admin" ON levels
  FOR ALL TO authenticated USING (is_admin());

-- ─── sites : selon accès ─────────────────────────────────────
CREATE POLICY "sites_select" ON sites
  FOR SELECT TO authenticated
  USING (has_site_access(id));

CREATE POLICY "sites_all_admin" ON sites
  FOR ALL TO authenticated USING (is_admin());

-- ─── groups : selon accès au site ───────────────────────────
CREATE POLICY "groups_select" ON groups
  FOR SELECT TO authenticated
  USING (has_site_access(site_id));

CREATE POLICY "groups_insert" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (has_site_access(site_id));

CREATE POLICY "groups_update" ON groups
  FOR UPDATE TO authenticated
  USING (has_site_access(site_id));

CREATE POLICY "groups_delete_admin" ON groups
  FOR DELETE TO authenticated USING (is_admin());

-- ─── sessions : selon accès au site du groupe ───────────────
CREATE POLICY "sessions_select" ON sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = sessions.group_id
      AND has_site_access(g.site_id)
    )
  );

CREATE POLICY "sessions_insert" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = sessions.group_id
      AND has_site_access(g.site_id)
    )
  );

CREATE POLICY "sessions_update" ON sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = sessions.group_id
      AND has_site_access(g.site_id)
    )
  );

-- ─── contents : selon accès à la session ────────────────────
CREATE POLICY "contents_access" ON contents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = contents.session_id
      AND has_site_access(g.site_id)
    )
  );

-- ─── resumes : selon accès à la session ─────────────────────
CREATE POLICY "resumes_access" ON resumes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = resumes.session_id
      AND has_site_access(g.site_id)
    )
  );

-- ─── resume_sections : selon accès au résumé ────────────────
CREATE POLICY "resume_sections_access" ON resume_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resumes r
      JOIN sessions s ON s.id = r.session_id
      JOIN groups g ON g.id = s.group_id
      WHERE r.id = resume_sections.resume_id
      AND has_site_access(g.site_id)
    )
  );

-- ─── activities : lecture publique, écriture authentifiée ───
CREATE POLICY "activities_select" ON activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activities_write" ON activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "activities_update" ON activities
  FOR UPDATE TO authenticated USING (true);

-- ─── resume_activities : selon accès au résumé ──────────────
CREATE POLICY "resume_activities_access" ON resume_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resumes r
      JOIN sessions s ON s.id = r.session_id
      JOIN groups g ON g.id = s.group_id
      WHERE r.id = resume_activities.resume_id
      AND has_site_access(g.site_id)
    )
  );

-- ─── whatsapp_sends : selon accès au groupe ─────────────────
CREATE POLICY "whatsapp_sends_access" ON whatsapp_sends
  FOR ALL TO authenticated
  USING (has_site_access((
    SELECT site_id FROM groups WHERE id = whatsapp_sends.group_id
  )));

-- ─── users : chacun voit son propre profil ──────────────────
CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated USING (id = auth.uid() OR is_admin());

CREATE POLICY "users_insert" ON users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
