-- ============================================================
-- Migration 011 — Années scolaires complètes + Feature Flags + WhatsApp
-- ============================================================

-- ─── 1. AMÉLIORER academic_years ─────────────────────────────────────────────
-- Ajouter user_id (RLS), couleur d'affichage, notes

ALTER TABLE academic_years
  ADD COLUMN IF NOT EXISTS user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS color     TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS notes     TEXT;

-- Index pour filtrer par utilisateur
CREATE INDEX IF NOT EXISTS idx_academic_years_user_id ON academic_years(user_id);

-- RLS sur academic_years
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_years_owner" ON academic_years;
CREATE POLICY "academic_years_owner" ON academic_years
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK   (auth.uid() = user_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS academic_years_updated_at ON academic_years;
CREATE TRIGGER academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. LIEN groupes ↔ années scolaires ─────────────────────────────────────
-- Chaque groupe appartient à une année scolaire.
-- Les groupes Kids 2024-25 et Kids 2025-26 sont des entités séparées.
-- Un wizard "Nouvelle année" recopie les groupes de l'année précédente.

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_academic_year ON groups(academic_year_id);

-- ─── 3. FEATURE FLAGS ────────────────────────────────────────────────────────
-- Système de bascule par fonctionnalité.
-- enabled_for_teacher : Khati voit la feature dans son dashboard
-- enabled_for_parents : les parents voient / reçoivent la feature
-- Ce découplage permet de tester sans exposer aux parents.

CREATE TABLE IF NOT EXISTS feature_flags (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identifiant technique de la feature
  feature_key           TEXT    NOT NULL,
  -- Ex: 'attendance', 'revision_sheets', 'whatsapp_catchup', 'voice_clone',
  --     'time_capsule', 'live_feed', 'passport', 'ai_profile',
  --     'streaks', 'parent_portal', 'qr_checkin', 'absence_patterns'

  -- Libellé affiché dans les settings
  label                 TEXT    NOT NULL,
  description           TEXT,
  category              TEXT    DEFAULT 'general',
  -- Catégories : 'pedagogie' | 'parents' | 'whatsapp' | 'ia' | 'premium'

  -- Activation
  enabled_for_teacher   BOOLEAN DEFAULT true,   -- visible par Khati
  enabled_for_parents   BOOLEAN DEFAULT false,  -- visible / envoyé aux parents

  -- Icône Lucide React pour l'affichage
  icon                  TEXT    DEFAULT 'Sparkles',

  -- Ordre d'affichage dans la page settings
  sort_order            SMALLINT DEFAULT 99,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_user_id ON feature_flags(user_id);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_flags_owner" ON feature_flags;
CREATE POLICY "feature_flags_owner" ON feature_flags
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK   (auth.uid() = user_id);

DROP TRIGGER IF EXISTS feature_flags_updated_at ON feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. CONFIGURATION WHATSAPP ───────────────────────────────────────────────
-- Un seul enregistrement par utilisateur (upsert).
-- test_mode = true → tous les messages vont sur test_number au lieu de production.

CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID    NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Numéro de production (envoi réel aux parents)
  production_number     TEXT,           -- ex: '+33612345678'
  production_verified   BOOLEAN DEFAULT false,

  -- Numéro de test (WhatsApp perso pour tester)
  test_number           TEXT,           -- ex: '+33698765432'

  -- Mode actif
  test_mode             BOOLEAN DEFAULT true,  -- true par défaut → sécurité

  -- Meta WhatsApp Business API
  meta_phone_id         TEXT,           -- Phone Number ID (Meta for Developers)
  meta_waba_id          TEXT,           -- WhatsApp Business Account ID
  meta_token_encrypted  TEXT,           -- token chiffré côté serveur

  -- N8N webhook (alternative sans Meta API)
  n8n_webhook_url       TEXT,
  n8n_enabled           BOOLEAN DEFAULT false,

  -- Stats
  messages_sent_today   INTEGER DEFAULT 0,
  messages_sent_month   INTEGER DEFAULT 0,
  last_message_at       TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_settings_owner" ON whatsapp_settings;
CREATE POLICY "whatsapp_settings_owner" ON whatsapp_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK   (auth.uid() = user_id);

DROP TRIGGER IF EXISTS whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 5. DONNÉES INITIALES — années scolaires & feature flags ─────────────────
-- Insérées pour le premier utilisateur (Teacher Khati).
-- Utilise ON CONFLICT DO NOTHING pour éviter les doublons en cas de re-run.

-- Année scolaire 2024-2025 (passée)
INSERT INTO academic_years (user_id, name, start_date, end_date, is_active, color)
SELECT id, '2024 – 2025', '2024-09-02', '2025-07-04', false, '#8b5cf6'
FROM auth.users LIMIT 1
ON CONFLICT DO NOTHING;

-- Année scolaire 2025-2026 (active)
INSERT INTO academic_years (user_id, name, start_date, end_date, is_active, color)
SELECT id, '2025 – 2026', '2025-09-01', '2026-07-03', true, '#6366f1'
FROM auth.users LIMIT 1
ON CONFLICT DO NOTHING;

-- Feature flags initiaux — toutes visibles par Khati, masquées aux parents
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;

  INSERT INTO feature_flags (user_id, feature_key, label, description, category, icon, sort_order, enabled_for_teacher, enabled_for_parents) VALUES
    (v_uid, 'attendance',         'Module Présences',              'Faire l''appel, marquer absents, statistiques',                         'pedagogie', 'ClipboardCheck', 1,  true, false),
    (v_uid, 'whatsapp_catchup',   'Rattrapage WhatsApp',           'Envoi automatique du contenu du cours aux élèves absents',              'whatsapp',  'MessageSquare',  2,  true, false),
    (v_uid, 'revision_sheets',    'Fiches de révision mensuelles', 'Fiche ludique par niveau et site, générée par IA chaque mois',         'pedagogie', 'BookOpen',       3,  true, false),
    (v_uid, 'absence_patterns',   'Alertes absences IA',           'Détection automatique des patterns d''absences et risques de départ',   'ia',        'Brain',          4,  true, false),
    (v_uid, 'streaks',            'Streaks & badges',              'Gamification : récompenser les élèves assidus',                         'parents',   'Trophy',         5,  true, false),
    (v_uid, 'passport',           'Passeport Anglais',             'Certificat numérique évolutif par élève, niveaux CECRL',                'premium',   'Award',          6,  true, false),
    (v_uid, 'time_capsule',       'Time Capsule',                  'Enregistrement début/fin d''année — preuve de progression',             'premium',   'Hourglass',      7,  true, false),
    (v_uid, 'live_feed',          'Live Feed cours',               'Micro-événements en temps réel pendant le cours pour les parents',      'parents',   'Radio',          8,  true, false),
    (v_uid, 'ai_profile',         'Profil IA individuel',          'Mémorisation des forces/faiblesses de chaque élève par l''IA',         'ia',        'UserCheck',      9,  true, false),
    (v_uid, 'voice_clone',        'Voix IA Teacher Khati',         'Messages vocaux personnalisés dans la voix de la professeure',          'premium',   'Mic',            10, true, false),
    (v_uid, 'qr_checkin',         'QR Code check-in',              'Les élèves scannent un QR à l''entrée pour marquer leur présence',      'premium',   'QrCode',         11, true, false),
    (v_uid, 'parent_portal',      'Espace parent sécurisé',        'Portail web privé par famille : présences, résumés, factures',         'parents',   'Eye',            12, true, false),
    (v_uid, 'payment_reminders',  'Rappels de paiement',           'Relances WhatsApp automatiques pour les impayés',                       'whatsapp',  'CreditCard',     13, true, false),
    (v_uid, 'monthly_report',     'Rapport mensuel d''assiduité',  'Bilan automatique envoyé aux parents le 1er de chaque mois',            'parents',   'BarChart2',      14, true, false)
  ON CONFLICT (user_id, feature_key) DO NOTHING;
END $$;

-- Configuration WhatsApp initiale (mode test activé par défaut)
INSERT INTO whatsapp_settings (user_id, test_mode)
SELECT id, true FROM auth.users LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
