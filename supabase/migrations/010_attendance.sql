-- ============================================================
-- Migration 010 — Présences (attendance)
-- Suivi des présences par séance · Notifications absents
-- ============================================================

-- ─── TABLE PRINCIPALE ────────────────────────────────────────────────────────
-- Une ligne par élève par séance. UNIQUE(session_id, student_id) garantit
-- qu'on ne peut pas avoir deux statuts pour le même élève le même cours.

CREATE TABLE IF NOT EXISTS attendance (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      UUID        NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id)  ON DELETE CASCADE,

  -- Statut de présence
  status          TEXT        NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present','absent','late','excused')),

  -- Horodatage du marquage
  marked_at       TIMESTAMPTZ DEFAULT now(),

  -- Note libre (ex: "maladie", "prévenu", "RDV médical")
  notes           TEXT,

  -- Suivi des notifications WhatsApp envoyées aux parents
  notif_sent_at   TIMESTAMPTZ,
  notif_type      TEXT CHECK (notif_type IN ('parent_info','catchup','none')),

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Contrainte unicité : 1 enregistrement par élève par séance
  UNIQUE(session_id, student_id)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id    ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status     ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at  ON attendance(marked_at);

-- Index composite pour les rapports d'absences par élève
CREATE INDEX IF NOT EXISTS idx_attendance_student_status
  ON attendance(student_id, status);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_owner" ON attendance;
CREATE POLICY "attendance_owner" ON attendance
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK   (auth.uid() = user_id);

-- ─── TRIGGER updated_at ──────────────────────────────────────────────────────
-- La fonction update_updated_at_column() est déjà définie dans migration 009

DROP TRIGGER IF EXISTS attendance_updated_at ON attendance;
CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
