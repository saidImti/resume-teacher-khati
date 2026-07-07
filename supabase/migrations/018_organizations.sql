-- ============================================================
-- Migration 018 — Multi-tenant SaaS : organizations
-- Date : 2026-07-06
--
-- Convertit l'app mono-tenant en multi-tenant :
--   §1  Table organizations
--   §2  users.organization_id + rôle 'viewer'
--   §3  Backfill : org « Teacher Khati », toutes les données dessus
--   §4  Helpers RLS : current_org_id(), is_org_writer(), has_site_access()
--   §5  organization_id sur toutes les tables (backfill + NOT NULL + index)
--   §6  Triggers BEFORE INSERT de remplissage d'organization_id
--       (l'ancien code, qui ne connaît pas la colonne, continue de marcher)
--   §7  Contraintes UNIQUE re-scopées par organisation
--   §8  handle_new_user() : self-service signup (crée l'org + seed)
--   §9  Toutes les policies RLS recréées (pattern plat par org)
--   §10 Policies Storage « branding » par organisation
--
-- Idempotent : ré-exécutable sans dégât.
-- ============================================================


-- ─── §1 Table organizations ─────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;


-- ─── §2 users : organization_id + rôle viewer ───────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'teacher', 'viewer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── §3 Backfill : organisation « Teacher Khati » ───────────

DO $$
DECLARE
  v_org UUID;
BEGIN
  SELECT id INTO v_org FROM organizations ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN
    INSERT INTO organizations (name, slug)
    VALUES ('Teacher Khati', 'teacher-khati')
    RETURNING id INTO v_org;
  END IF;

  UPDATE users SET organization_id = v_org WHERE organization_id IS NULL;

  -- Le logo uploadé au niveau user devient le logo de l'organisation.
  -- (Les anciens chemins Storage {user_id}/… restent lisibles : toutes les
  --  lectures passent par le client admin + URLs signées.)
  UPDATE organizations o
     SET logo_url = u.logo_url
    FROM users u
   WHERE o.id = v_org
     AND o.logo_url IS NULL
     AND u.organization_id = v_org
     AND u.logo_url IS NOT NULL;
END $$;

ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);


-- ─── §4 Helpers RLS ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- is_admin() : sémantique inchangée (l'appartenance à une seule org fait
-- que « admin » signifie « admin de SON org » dès qu'on le combine au
-- prédicat organization_id = current_org_id() dans chaque policy).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_org_writer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- has_site_access : exige désormais aussi que le site soit dans l'org.
CREATE OR REPLACE FUNCTION has_site_access(site_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN sites s ON s.id = site_uuid AND s.organization_id = u.organization_id
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR site_uuid = ANY(u.site_ids))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- ─── §5 organization_id sur toutes les tables ───────────────

DO $$
DECLARE
  v_org UUID;
  t TEXT;
BEGIN
  SELECT id INTO v_org FROM organizations ORDER BY created_at LIMIT 1;

  FOREACH t IN ARRAY ARRAY[
    'sites', 'levels', 'groups', 'sessions', 'contents',
    'resumes', 'resume_sections', 'activities', 'resume_activities',
    'whatsapp_sends', 'academic_years', 'families', 'students',
    'enrollments', 'schedules', 'pricing_rules', 'invoices', 'payments',
    'attendance', 'saved_fiches', 'feature_flags', 'whatsapp_settings',
    'pinterest_settings', 'user_tools', 'api_keys', 'signatories'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)', t);
    EXECUTE format(
      'UPDATE %I SET organization_id = $1 WHERE organization_id IS NULL', t) USING v_org;
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_org ON %I(organization_id)', t, t);
  END LOOP;
END $$;


-- ─── §6 Triggers de remplissage d'organization_id ───────────
-- L'ancien code déployé ne pose jamais organization_id : ces triggers le
-- dérivent du parent (ou de l'utilisateur) pour que les inserts existants
-- continuent de fonctionner pendant la fenêtre SQL-appliqué → code-déployé.
-- Fallback : org de l'appelant, puis org unique si une seule existe.

CREATE OR REPLACE FUNCTION org_fallback()
RETURNS UUID AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM users WHERE id = auth.uid()),
    (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(id::text)::uuid END FROM organizations)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION org_fill_from_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM users WHERE id = NEW.user_id),
      org_fallback()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION org_fill_from_site()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM sites WHERE id = NEW.site_id),
      org_fallback()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION org_fill_from_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM groups WHERE id = NEW.group_id),
      org_fallback()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION org_fill_from_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM sessions WHERE id = NEW.session_id),
      org_fallback()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION org_fill_from_resume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM resumes WHERE id = NEW.resume_id),
      org_fallback()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION org_fill_fallback_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := org_fallback();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Tables avec user_id → org de l'utilisateur.
-- ⚠️ families : nom en « aa_ » pour passer AVANT trg_families_registration_number
--    (ordre alphabétique des triggers) — le numéro d'inscription est par org.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students', 'enrollments', 'schedules', 'pricing_rules', 'invoices',
    'payments', 'attendance', 'academic_years', 'saved_fiches',
    'feature_flags', 'whatsapp_settings', 'pinterest_settings',
    'user_tools', 'api_keys', 'signatories'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %s_org_fill ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %s_org_fill BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION org_fill_from_user()',
      t, t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS aa_families_org_fill ON families;
CREATE TRIGGER aa_families_org_fill
  BEFORE INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_user();

DROP TRIGGER IF EXISTS groups_org_fill ON groups;
CREATE TRIGGER groups_org_fill
  BEFORE INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_site();

DROP TRIGGER IF EXISTS sessions_org_fill ON sessions;
CREATE TRIGGER sessions_org_fill
  BEFORE INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_group();

DROP TRIGGER IF EXISTS whatsapp_sends_org_fill ON whatsapp_sends;
CREATE TRIGGER whatsapp_sends_org_fill
  BEFORE INSERT ON whatsapp_sends
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_group();

DROP TRIGGER IF EXISTS contents_org_fill ON contents;
CREATE TRIGGER contents_org_fill
  BEFORE INSERT ON contents
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_session();

DROP TRIGGER IF EXISTS resumes_org_fill ON resumes;
CREATE TRIGGER resumes_org_fill
  BEFORE INSERT ON resumes
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_session();

DROP TRIGGER IF EXISTS resume_sections_org_fill ON resume_sections;
CREATE TRIGGER resume_sections_org_fill
  BEFORE INSERT ON resume_sections
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_resume();

DROP TRIGGER IF EXISTS resume_activities_org_fill ON resume_activities;
CREATE TRIGGER resume_activities_org_fill
  BEFORE INSERT ON resume_activities
  FOR EACH ROW EXECUTE FUNCTION org_fill_from_resume();

DROP TRIGGER IF EXISTS sites_org_fill ON sites;
CREATE TRIGGER sites_org_fill
  BEFORE INSERT ON sites
  FOR EACH ROW EXECUTE FUNCTION org_fill_fallback_only();

DROP TRIGGER IF EXISTS levels_org_fill ON levels;
CREATE TRIGGER levels_org_fill
  BEFORE INSERT ON levels
  FOR EACH ROW EXECUTE FUNCTION org_fill_fallback_only();

DROP TRIGGER IF EXISTS activities_org_fill ON activities;
CREATE TRIGGER activities_org_fill
  BEFORE INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION org_fill_fallback_only();


-- ─── §7 Contraintes UNIQUE re-scopées par organisation ──────

-- sites.slug : unique PAR org (deux écoles peuvent avoir un site « paris »)
ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_org_slug
  ON sites (organization_id, slug);

-- levels.slug : unique PAR org
ALTER TABLE levels DROP CONSTRAINT IF EXISTS levels_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_levels_org_slug
  ON levels (organization_id, slug);

-- sites.registration_prefix : unique PAR org
DROP INDEX IF EXISTS idx_sites_registration_prefix;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_org_registration_prefix
  ON sites (organization_id, registration_prefix)
  WHERE registration_prefix IS NOT NULL;

-- invoices.invoice_number : unique PAR org
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_number
  ON invoices (organization_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- families.registration_number : unique PAR org
DROP INDEX IF EXISTS idx_families_registration_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_org_registration_number
  ON families (organization_id, registration_number)
  WHERE registration_number IS NOT NULL;

-- feature_flags : unique par (org, feature_key) — dédoublonner d'abord
-- (on GARDE l'unique (user_id, feature_key) pour la fenêtre de déploiement,
--  l'ancien code upsert dessus ; suppression en migration 019)
DELETE FROM feature_flags ff
 USING feature_flags ff2
 WHERE ff.organization_id = ff2.organization_id
   AND ff.feature_key = ff2.feature_key
   AND ff.id <> ff2.id
   AND (ff.created_at, ff.id::text) < (ff2.created_at, ff2.id::text);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_org_key
  ON feature_flags (organization_id, feature_key);

-- whatsapp_settings : une config par org — dédoublonner d'abord
-- (on GARDE l'unique user_id pour la fenêtre ; suppression en 019)
DELETE FROM whatsapp_settings ws
 USING whatsapp_settings ws2
 WHERE ws.organization_id = ws2.organization_id
   AND ws.id <> ws2.id
   AND (ws.created_at, ws.id::text) < (ws2.created_at, ws2.id::text);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_settings_org
  ON whatsapp_settings (organization_id);

-- Numéro d'inscription : séquence PAR org (verrou + MAX scannés par org)
CREATE OR REPLACE FUNCTION assign_family_registration_number()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix INT;
  v_next   INT;
BEGIN
  IF NEW.registration_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT registration_prefix INTO v_prefix
    FROM sites WHERE id = NEW.primary_site_id;
  IF v_prefix IS NULL THEN
    v_prefix := 99;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('family_regnum_' || NEW.organization_id::text || '_' || v_prefix::text));

  SELECT COALESCE(MAX(substring(registration_number FROM length(v_prefix::text) + 1)::int), 0) + 1
    INTO v_next
    FROM families
   WHERE organization_id = NEW.organization_id
     AND registration_number LIKE v_prefix::text || '%'
     AND length(registration_number) = length(v_prefix::text) + 5;

  NEW.registration_number := v_prefix::text || lpad(v_next::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─── §8 handle_new_user() : self-service signup ─────────────
-- Invitation : organization_id lu dans app_metadata (posé UNIQUEMENT côté
--   service-role → un client ne peut pas s'injecter dans une org).
-- Sinon : création d'une organisation + rôle admin + seed minimal
--   (5 niveaux + année scolaire active — sans ça, une org neuve ne peut
--    pas créer de groupe : pas d'UI de gestion des niveaux).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org        UUID;
  v_role       TEXT;
  v_school     TEXT;
  v_year_start DATE;
BEGIN
  v_org := NULLIF(NEW.raw_app_meta_data->>'organization_id', '')::uuid;

  IF v_org IS NOT NULL AND EXISTS (SELECT 1 FROM organizations WHERE id = v_org) THEN
    -- Invitation dans une org existante
    v_role := COALESCE(NEW.raw_app_meta_data->>'role', 'teacher');
    IF v_role NOT IN ('admin', 'teacher', 'viewer') THEN
      v_role := 'teacher';
    END IF;
  ELSE
    -- Self-service : nouvelle organisation
    v_school := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'school_name', '')), '');
    IF v_school IS NULL THEN
      v_school := split_part(NEW.email, '@', 1);
    END IF;

    INSERT INTO organizations (name) VALUES (v_school) RETURNING id INTO v_org;
    v_role := 'admin';

    -- Seed : 5 niveaux canoniques
    INSERT INTO levels (organization_id, name, slug, age_min, age_max, emoji, color, sort_order)
    VALUES
      (v_org, 'Preschoolers', 'preschoolers', 3,  5,  '🐣', '#10b981', 1),
      (v_org, 'Kids',         'kids',         6,  8,  '🌟', '#f59e0b', 2),
      (v_org, 'Juniors',      'juniors',      9,  11, '🚀', '#3b82f6', 3),
      (v_org, 'Tweens',       'tweens',       12, 14, '🎯', '#8b5cf6', 4),
      (v_org, 'Teenagers',    'teenagers',    15, 18, '🏆', '#ef4444', 5)
    ON CONFLICT DO NOTHING;

    -- Seed : année scolaire courante active (sept → août)
    IF EXTRACT(MONTH FROM now()) >= 8 THEN
      v_year_start := make_date(EXTRACT(YEAR FROM now())::int, 9, 1);
    ELSE
      v_year_start := make_date(EXTRACT(YEAR FROM now())::int - 1, 9, 1);
    END IF;
    INSERT INTO academic_years (organization_id, name, start_date, end_date, is_active)
    VALUES (
      v_org,
      format('%s-%s', EXTRACT(YEAR FROM v_year_start)::int, EXTRACT(YEAR FROM v_year_start)::int + 1),
      v_year_start,
      make_date(EXTRACT(YEAR FROM v_year_start)::int + 1, 8, 31),
      true
    );
  END IF;

  INSERT INTO public.users (id, full_name, avatar_url, role, site_ids, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    v_role,
    '{}',
    v_org
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── §9 Policies RLS : pattern plat par organisation ────────

-- 9a. DROP de toutes les policies existantes (inventaire 003→017)
DO $$
BEGIN
  -- 003
  DROP POLICY IF EXISTS "users_select_own"        ON users;
  DROP POLICY IF EXISTS "users_update_own"        ON users;
  DROP POLICY IF EXISTS "users_insert"            ON users;
  DROP POLICY IF EXISTS "sites_select"            ON sites;
  DROP POLICY IF EXISTS "sites_all_admin"         ON sites;
  DROP POLICY IF EXISTS "levels_select"           ON levels;
  DROP POLICY IF EXISTS "levels_all_admin"        ON levels;
  DROP POLICY IF EXISTS "academic_years_select"   ON academic_years;
  DROP POLICY IF EXISTS "academic_years_all_admin" ON academic_years;
  DROP POLICY IF EXISTS "groups_select"           ON groups;
  DROP POLICY IF EXISTS "groups_insert"           ON groups;
  DROP POLICY IF EXISTS "groups_update"           ON groups;
  DROP POLICY IF EXISTS "groups_delete_admin"     ON groups;
  DROP POLICY IF EXISTS "sessions_select"         ON sessions;
  DROP POLICY IF EXISTS "sessions_insert"         ON sessions;
  DROP POLICY IF EXISTS "sessions_update"         ON sessions;
  DROP POLICY IF EXISTS "contents_access"         ON contents;
  DROP POLICY IF EXISTS "resumes_access"          ON resumes;
  DROP POLICY IF EXISTS "resume_sections_access"  ON resume_sections;
  DROP POLICY IF EXISTS "activities_select"       ON activities;
  DROP POLICY IF EXISTS "activities_write"        ON activities;
  DROP POLICY IF EXISTS "activities_update"       ON activities;
  DROP POLICY IF EXISTS "resume_activities_access" ON resume_activities;
  DROP POLICY IF EXISTS "whatsapp_sends_access"   ON whatsapp_sends;
  -- 007
  DROP POLICY IF EXISTS "saved_fiches_select_own" ON saved_fiches;
  DROP POLICY IF EXISTS "saved_fiches_insert_own" ON saved_fiches;
  DROP POLICY IF EXISTS "saved_fiches_delete_own" ON saved_fiches;
  DROP POLICY IF EXISTS "saved_fiches_service_all" ON saved_fiches;
  -- 008
  DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;
  -- 009
  DROP POLICY IF EXISTS "families_owner"          ON families;
  DROP POLICY IF EXISTS "students_owner"          ON students;
  DROP POLICY IF EXISTS "enrollments_owner"       ON enrollments;
  DROP POLICY IF EXISTS "schedules_owner"         ON schedules;
  DROP POLICY IF EXISTS "pricing_rules_owner"     ON pricing_rules;
  DROP POLICY IF EXISTS "invoices_owner"          ON invoices;
  DROP POLICY IF EXISTS "payments_owner"          ON payments;
  -- 010
  DROP POLICY IF EXISTS "attendance_owner"        ON attendance;
  -- 011
  DROP POLICY IF EXISTS "academic_years_owner"    ON academic_years;
  DROP POLICY IF EXISTS "feature_flags_owner"     ON feature_flags;
  DROP POLICY IF EXISTS "whatsapp_settings_owner" ON whatsapp_settings;
  -- 012
  DROP POLICY IF EXISTS "pinterest_settings_owner" ON pinterest_settings;
  -- 014
  DROP POLICY IF EXISTS "user_tools_owner"        ON user_tools;
  -- 017
  DROP POLICY IF EXISTS "signatories_owner"       ON signatories;
END $$;

-- 9b. organizations : lecture pour les membres, écriture admin
DROP POLICY IF EXISTS "organizations_member_select" ON organizations;
CREATE POLICY "organizations_member_select" ON organizations
  FOR SELECT TO authenticated
  USING (id = current_org_id());

DROP POLICY IF EXISTS "organizations_admin_update" ON organizations;
CREATE POLICY "organizations_admin_update" ON organizations
  FOR UPDATE TO authenticated
  USING (id = current_org_id() AND is_admin())
  WITH CHECK (id = current_org_id() AND is_admin());

-- 9c. users : sa propre ligne ; l'admin voit/édite les membres de son org.
-- L'auto-escalade de rôle est bloquée par privilèges de colonnes (plus bas).
DROP POLICY IF EXISTS "users_org_select" ON users;
CREATE POLICY "users_org_select" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR (is_admin() AND organization_id = current_org_id()));

DROP POLICY IF EXISTS "users_self_update" ON users;
CREATE POLICY "users_self_update" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Un client authentifié ne peut modifier que les colonnes de profil —
-- jamais role / organization_id / site_ids (service-role uniquement).
REVOKE INSERT, UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name, avatar_url, preferences, updated_at)
  ON public.users TO authenticated;

-- 9d. Tables métier : lecture = membres de l'org ;
--     écriture = admin+teacher (writer) ou admin seul selon la table.
DO $$
DECLARE
  t TEXT;
BEGIN
  -- Écriture admin + teacher
  FOREACH t IN ARRAY ARRAY[
    'groups', 'sessions', 'contents', 'resumes', 'resume_sections',
    'resume_activities', 'activities', 'schedules',
    'families', 'students', 'enrollments', 'attendance'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_read"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_write" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_org_read" ON %I FOR SELECT TO authenticated
         USING (organization_id = current_org_id())', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_org_write" ON %I FOR ALL TO authenticated
         USING (organization_id = current_org_id() AND is_org_writer())
         WITH CHECK (organization_id = current_org_id() AND is_org_writer())', t, t);
  END LOOP;

  -- Écriture admin uniquement (config école + finances)
  FOREACH t IN ARRAY ARRAY[
    'sites', 'levels', 'academic_years', 'pricing_rules',
    'invoices', 'payments', 'whatsapp_sends', 'whatsapp_settings',
    'feature_flags', 'signatories'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_read"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_write" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_org_read" ON %I FOR SELECT TO authenticated
         USING (organization_id = current_org_id())', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_org_write" ON %I FOR ALL TO authenticated
         USING (organization_id = current_org_id() AND is_admin())
         WITH CHECK (organization_id = current_org_id() AND is_admin())', t, t);
  END LOOP;
END $$;

-- Exception : la suppression de groupes reste admin-only (règle historique)
DROP POLICY IF EXISTS "groups_org_write" ON groups;
CREATE POLICY "groups_org_write" ON groups
  FOR ALL TO authenticated
  USING (
    organization_id = current_org_id()
    AND (is_admin() OR (is_org_writer() AND has_site_access(site_id)))
  )
  WITH CHECK (
    organization_id = current_org_id()
    AND (is_admin() OR (is_org_writer() AND has_site_access(site_id)))
  );
DROP POLICY IF EXISTS "groups_delete_admin_only" ON groups;
-- (le FOR ALL ci-dessus couvre DELETE pour les writers site-scopés ; on
--  restreint le DELETE aux admins via une policy RESTRICTIVE)
CREATE POLICY "groups_delete_admin_only" ON groups
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_admin());

-- 9e. Tables personnelles : restent scopées au propriétaire
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'api_keys', 'pinterest_settings', 'user_tools', 'saved_fiches'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_owner_all" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_owner_all" ON %I FOR ALL TO authenticated
         USING (auth.uid() = user_id)
         WITH CHECK (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;

-- saved_fiches : le service role garde l'accès complet (comme avant)
DROP POLICY IF EXISTS "saved_fiches_service_all" ON saved_fiches;
CREATE POLICY "saved_fiches_service_all" ON saved_fiches
  FOR ALL USING (auth.role() = 'service_role');


-- ─── §10 Storage « branding » : dossier = organization_id ───

DROP POLICY IF EXISTS "branding_owner_select" ON storage.objects;
CREATE POLICY "branding_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = current_org_id()::text
  );

DROP POLICY IF EXISTS "branding_owner_insert" ON storage.objects;
CREATE POLICY "branding_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = current_org_id()::text
    AND is_admin()
  );

DROP POLICY IF EXISTS "branding_owner_update" ON storage.objects;
CREATE POLICY "branding_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = current_org_id()::text
    AND is_admin()
  );

DROP POLICY IF EXISTS "branding_owner_delete" ON storage.objects;
CREATE POLICY "branding_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = current_org_id()::text
    AND is_admin()
  );


-- ============================================================
-- FIN 018 — la migration 019 (nettoyage) supprimera plus tard :
--   users.logo_url, l'unique whatsapp_settings.user_id,
--   l'unique feature_flags(user_id, feature_key).
-- ============================================================
