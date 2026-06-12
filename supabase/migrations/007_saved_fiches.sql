-- ─── 007_saved_fiches.sql ────────────────────────────────────────────────────
-- Table pour sauvegarder fiches de séance et bilans annuels générés par l'IA.
-- Permet de retrouver, re-exporter et partager les documents plus tard.

CREATE TABLE IF NOT EXISTS public.saved_fiches (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Discriminant
  type         text        NOT NULL CHECK (type IN ('seance', 'bilan')),

  -- Métadonnées pour l'affichage dans l'historique
  title        text        NOT NULL,          -- ex: "Farm Animals · Juniors"
  level        text        NOT NULL,          -- ex: "Juniors"
  level_slug   text,                          -- ex: "juniors"
  theme        text,                          -- pour fiches de séance
  academic_year text,                         -- pour bilans, ex: "2024-2025"
  session_date  date,                         -- pour fiches de séance

  -- Contenu JSON complet (FicheResult ou BilanResult)
  data         jsonb       NOT NULL,

  -- Timestamps
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Index rapides pour la liste historique
CREATE INDEX IF NOT EXISTS saved_fiches_user_id_idx   ON public.saved_fiches (user_id);
CREATE INDEX IF NOT EXISTS saved_fiches_type_idx       ON public.saved_fiches (user_id, type);
CREATE INDEX IF NOT EXISTS saved_fiches_created_at_idx ON public.saved_fiches (user_id, created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_saved_fiches_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saved_fiches_updated_at
  BEFORE UPDATE ON public.saved_fiches
  FOR EACH ROW EXECUTE FUNCTION public.update_saved_fiches_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.saved_fiches ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne voit que ses propres fiches
CREATE POLICY "saved_fiches_select_own"
  ON public.saved_fiches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_fiches_insert_own"
  ON public.saved_fiches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_fiches_delete_own"
  ON public.saved_fiches FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (pour les API routes Next.js)
CREATE POLICY "saved_fiches_service_all"
  ON public.saved_fiches FOR ALL
  USING (auth.role() = 'service_role');
