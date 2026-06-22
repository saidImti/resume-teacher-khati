-- ────────────────────────────────────────────────────────────────
-- Migration 013 — Suivi des relances WhatsApp sur les factures
-- ────────────────────────────────────────────────────────────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN invoices.reminder_sent_at IS
  'Timestamp de la dernière relance WhatsApp envoyée au parent pour cette facture';
