-- ─── 019 — OPTIONS DE TARIFICATION ÉTENDUES ─────────────────────────────────
-- Chaque organisation configure déjà ses propres tarifs (pricing_rules est
-- scopée par site → organisation). Cette migration ajoute les options
-- manquantes pour couvrir tous les cas réels d'une école :
--   · frais d'inscription (une fois, par enfant ou par famille)
--   · nombre de mensualités par année scolaire (10 par défaut)
--   · nombre de séances par mois pour le mode « par séance » (4 par défaut)
--   · remise en % si paiement de l'année en une fois
-- Idempotente (ADD COLUMN IF NOT EXISTS + DO $$ pour les contraintes).

ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS registration_fee        NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS registration_fee_scope  TEXT NOT NULL DEFAULT 'per_child',
  ADD COLUMN IF NOT EXISTS months_per_year         SMALLINT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sessions_per_month      SMALLINT NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS annual_discount_pct     NUMERIC(5,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_reg_fee_scope_chk'
  ) THEN
    ALTER TABLE pricing_rules
      ADD CONSTRAINT pricing_rules_reg_fee_scope_chk
      CHECK (registration_fee_scope IN ('per_child','per_family'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_months_per_year_chk'
  ) THEN
    ALTER TABLE pricing_rules
      ADD CONSTRAINT pricing_rules_months_per_year_chk
      CHECK (months_per_year BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_sessions_per_month_chk'
  ) THEN
    ALTER TABLE pricing_rules
      ADD CONSTRAINT pricing_rules_sessions_per_month_chk
      CHECK (sessions_per_month BETWEEN 1 AND 31);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_annual_discount_chk'
  ) THEN
    ALTER TABLE pricing_rules
      ADD CONSTRAINT pricing_rules_annual_discount_chk
      CHECK (annual_discount_pct IS NULL OR (annual_discount_pct >= 0 AND annual_discount_pct <= 100));
  END IF;
END $$;
