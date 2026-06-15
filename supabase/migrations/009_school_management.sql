-- ============================================================
-- Migration 009 — Gestion scolaire complète
-- Familles · Élèves · Inscriptions · Planning · Tarifs · Finances
-- ============================================================

-- ─── 1. FAMILLES ─────────────────────────────────────────────────────────────
-- Regroupe les enfants d'une même famille pour la facturation
CREATE TABLE IF NOT EXISTS families (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Parent principal
  parent1_first   TEXT        NOT NULL,
  parent1_last    TEXT        NOT NULL,
  parent1_phone   TEXT,
  parent1_email   TEXT,
  parent1_whatsapp TEXT,
  -- Parent secondaire (optionnel)
  parent2_first   TEXT,
  parent2_last    TEXT,
  parent2_phone   TEXT,
  parent2_email   TEXT,
  -- Adresse
  address         TEXT,
  city            TEXT,
  postal_code     TEXT,
  -- Site principal de la famille (pour tarification)
  primary_site_id UUID        REFERENCES sites(id) ON DELETE SET NULL,
  -- Tarif personnalisé (override de la grille standard)
  custom_monthly_rate  NUMERIC(8,2),   -- si défini, override la grille
  custom_rate_note     TEXT,           -- ex: "Accord spécial 2024"
  -- Notes & admin
  notes           TEXT,
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. ÉLÈVES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id       UUID        REFERENCES families(id) ON DELETE SET NULL,
  -- Identité
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  date_of_birth   DATE,
  gender          TEXT        CHECK (gender IN ('M','F','autre')) DEFAULT 'M',
  photo_url       TEXT,
  photo_consent   BOOLEAN     DEFAULT false,
  -- Niveau / site
  site_id         UUID        REFERENCES sites(id) ON DELETE SET NULL,
  level_id        UUID        REFERENCES levels(id) ON DELETE SET NULL,
  -- Statut de l'élève
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('trial','active','suspended','departed')),
  -- Dates clés
  enrollment_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  departure_date  DATE,
  departure_reason TEXT,       -- ex: "déménagement", "raison financière", "insatisfaction", "autre"
  -- Santé / urgence
  medical_notes   TEXT,        -- allergies, besoins particuliers
  emergency_name  TEXT,
  emergency_phone TEXT,
  emergency_relation TEXT,     -- ex: "grand-mère"
  -- Notes admin
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. INSCRIPTIONS (student ↔ group) ───────────────────────────────────────
-- Permet de tracker l'historique complet des groupes d'un élève
CREATE TABLE IF NOT EXISTS enrollments (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  group_id        UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  academic_year_id UUID       REFERENCES academic_years(id) ON DELETE SET NULL,
  start_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('trial','active','completed','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, group_id, start_date)
);

-- ─── 4. CRÉNEAUX HORAIRES (schedules) ────────────────────────────────────────
-- Planning récurrent hebdomadaire par groupe
CREATE TABLE IF NOT EXISTS schedules (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id        UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  site_id         UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  -- Récurrence hebdomadaire
  day_of_week     SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
                                        -- 0=Lundi, 1=Mardi, ..., 6=Dimanche
  start_time      TIME        NOT NULL, -- ex: '14:30'
  end_time        TIME        NOT NULL, -- ex: '15:30'
  -- Optionnel
  room            TEXT,                 -- ex: "Salle A", "Studio 1"
  max_students    SMALLINT    DEFAULT 15,
  is_active       BOOLEAN     DEFAULT true,
  notes           TEXT,
  -- Validité (null = toujours actif)
  valid_from      DATE,
  valid_until     DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. GRILLES TARIFAIRES ───────────────────────────────────────────────────
-- Tarifs par site, évolutifs dans le temps
CREATE TABLE IF NOT EXISTS pricing_rules (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id         UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,   -- ex: "Tarif Champigny 2024-25"
  billing_type    TEXT        NOT NULL
                  CHECK (billing_type IN ('per_session','monthly_per_child','monthly_family')),
  -- Tarif par séance
  price_per_session  NUMERIC(8,2),        -- ex: 4.50
  -- Tarif mensuel par enfant (dégressif selon fratrie)
  price_1_child   NUMERIC(8,2),           -- ex: 40.00
  price_2_children NUMERIC(8,2),          -- ex: 35.00 (par enfant)
  price_3_children NUMERIC(8,2),          -- ex: 30.00
  price_4_children NUMERIC(8,2),          -- ex: 26.00
  price_5plus     NUMERIC(8,2),           -- ex: 22.00
  -- Validité
  effective_from  DATE        NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,                    -- NULL = en vigueur indéfiniment
  is_active       BOOLEAN     DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. FACTURES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  site_id         UUID        REFERENCES sites(id) ON DELETE SET NULL,
  -- Période
  period_month    SMALLINT    NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     SMALLINT    NOT NULL,
  invoice_number  TEXT        UNIQUE,     -- ex: "FAC-2025-001"
  -- Montants
  amount_due      NUMERIC(8,2) NOT NULL,
  amount_paid     NUMERIC(8,2) DEFAULT 0,
  discount        NUMERIC(8,2) DEFAULT 0,
  -- Statut
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('draft','pending','partial','paid','overdue','cancelled')),
  due_date        DATE,
  -- Détail (JSON) — liste des enfants + lignes de facturation
  line_items      JSONB       DEFAULT '[]',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. PAIEMENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id      UUID        REFERENCES invoices(id) ON DELETE SET NULL,
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  -- Montant
  amount          NUMERIC(8,2) NOT NULL,
  currency        TEXT        DEFAULT 'EUR',
  -- Méthode
  method          TEXT        NOT NULL DEFAULT 'cash'
                  CHECK (method IN ('cash','card','transfer','check','other')),
  -- Détails
  payment_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  reference       TEXT,        -- numéro de chèque, référence virement
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_families_user_id         ON families(user_id);
CREATE INDEX IF NOT EXISTS idx_families_site_id         ON families(primary_site_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id         ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_family_id       ON students(family_id);
CREATE INDEX IF NOT EXISTS idx_students_site_id         ON students(site_id);
CREATE INDEX IF NOT EXISTS idx_students_status          ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_departure_date  ON students(departure_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id   ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_group_id     ON enrollments(group_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status       ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_schedules_group_id       ON schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_schedules_site_id        ON schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week    ON schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_site_id    ON pricing_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_invoices_family_id       ON invoices(family_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status          ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period          ON invoices(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_family_id       ON payments(family_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id      ON payments(invoice_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE families       ENABLE ROW LEVEL SECURITY;
ALTER TABLE students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "families_owner"      ON families;
DROP POLICY IF EXISTS "students_owner"      ON students;
DROP POLICY IF EXISTS "enrollments_owner"   ON enrollments;
DROP POLICY IF EXISTS "schedules_owner"     ON schedules;
DROP POLICY IF EXISTS "pricing_rules_owner" ON pricing_rules;
DROP POLICY IF EXISTS "invoices_owner"      ON invoices;
DROP POLICY IF EXISTS "payments_owner"      ON payments;

CREATE POLICY "families_owner"      ON families      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "students_owner"      ON students      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enrollments_owner"   ON enrollments   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedules_owner"     ON schedules     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pricing_rules_owner" ON pricing_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_owner"      ON invoices      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_owner"      ON payments      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS families_updated_at      ON families;
DROP TRIGGER IF EXISTS students_updated_at      ON students;
DROP TRIGGER IF EXISTS enrollments_updated_at   ON enrollments;
DROP TRIGGER IF EXISTS schedules_updated_at     ON schedules;
DROP TRIGGER IF EXISTS pricing_rules_updated_at ON pricing_rules;
DROP TRIGGER IF EXISTS invoices_updated_at      ON invoices;

CREATE TRIGGER families_updated_at      BEFORE UPDATE ON families      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER students_updated_at      BEFORE UPDATE ON students      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER enrollments_updated_at   BEFORE UPDATE ON enrollments   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER schedules_updated_at     BEFORE UPDATE ON schedules     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER invoices_updated_at      BEFORE UPDATE ON invoices      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── DONNÉES DE DÉPART : tarifs initiaux ─────────────────────────────────────
-- Ces INSERT utilisent les UUIDs des sites existants via sous-requête

INSERT INTO pricing_rules (user_id, site_id, name, billing_type, price_per_session, effective_from)
SELECT
  (SELECT id FROM auth.users LIMIT 1),
  s.id,
  'Tarif Maison-Alfort — par séance',
  'per_session',
  4.50,
  '2024-09-01'
FROM sites s WHERE s.slug = 'maison-alfort'
ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (user_id, site_id, name, billing_type,
  price_1_child, price_2_children, price_3_children, price_4_children, price_5plus,
  effective_from)
SELECT
  (SELECT id FROM auth.users LIMIT 1),
  s.id,
  'Tarif Champigny — mensuel famille',
  'monthly_family',
  40.00, 35.00, 30.00, 26.00, 22.00,
  '2024-09-01'
FROM sites s WHERE s.slug = 'champigny'
ON CONFLICT DO NOTHING;
