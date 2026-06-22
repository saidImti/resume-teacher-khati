// POST /api/whatsapp/payment-reminder
// Envoie une relance de paiement WhatsApp à une famille ou à toutes les familles impayées.
// Body: { invoiceId: string } OU { all: true, statuses?: string[] }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage, normalizePhoneNumber } from '@/lib/whatsapp/send'

const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const Schema = z.union([
  z.object({ invoiceId: z.string().uuid() }),
  z.object({ all: z.literal(true), statuses: z.array(z.string()).optional() }),
])

function buildReminderMessage(opts: {
  parentFirst: string
  amount: number
  periodMonth: number
  periodYear: number
  invoiceNumber: string | null
  isOverdue: boolean
}): string {
  const { parentFirst, amount, periodMonth, periodYear, invoiceNumber, isOverdue } = opts
  const monthName = MONTH_NAMES[(periodMonth - 1) % 12] ?? ''
  const ref = invoiceNumber ? ` (réf. ${invoiceNumber})` : ''
  const emoji = isOverdue ? '🔴' : '📋'

  return [
    `${emoji} *Bonjour ${parentFirst},*`,
    '',
    isOverdue
      ? `Nous n'avons pas encore reçu le règlement de votre facture du mois de *${monthName} ${periodYear}*${ref}.`
      : `Un rappel concernant la facture du mois de *${monthName} ${periodYear}*${ref}.`,
    '',
    `*Montant restant à régler : ${amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}*`,
    '',
    'Pour tout renseignement, n\'hésitez pas à nous contacter.',
    '',
    '📚 Teacher Khati — Cours d\'anglais pour enfants',
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invoiceId UUID ou { all: true } requis' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // ── Paramètres WhatsApp ──────────────────────────────────────────────────────
  const { data: waSettings } = await admin
    .from('whatsapp_settings')
    .select('test_mode, test_number')
    .eq('user_id', user.id)
    .maybeSingle()

  const testMode   = waSettings?.test_mode ?? true
  const testNumber = normalizePhoneNumber(waSettings?.test_number)

  // ── Chargement des factures ──────────────────────────────────────────────────
  let invoiceQuery = admin
    .from('invoices')
    .select(`
      id, family_id, period_month, period_year, invoice_number,
      amount_due, amount_paid, status,
      family:families(id, parent1_first, parent1_whatsapp, parent1_phone)
    `)
    .eq('user_id', user.id)

  if ('invoiceId' in parsed.data) {
    invoiceQuery = invoiceQuery.eq('id', parsed.data.invoiceId)
  } else {
    const statuses = parsed.data.statuses ?? ['pending', 'overdue', 'partial']
    invoiceQuery = invoiceQuery.in('status', statuses)
  }

  const { data: invoices, error: invErr } = await invoiceQuery
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })
  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Aucune facture à relancer' })
  }

  // ── Envoi ────────────────────────────────────────────────────────────────────
  type ReminderResult = {
    invoiceId: string
    family: string
    phone: string | null
    success: boolean
    simulated: boolean
    skipped?: boolean
    error?: string
  }
  const results: ReminderResult[] = []

  for (const inv of invoices) {
    type FamilyShape = { id: string; parent1_first: string; parent1_whatsapp: string | null; parent1_phone: string | null }
    const rawFamily = inv.family as unknown as FamilyShape | FamilyShape[] | null
    const family = rawFamily
      ? (Array.isArray(rawFamily) ? (rawFamily as FamilyShape[])[0] ?? null : rawFamily)
      : null

    const balance = Number(inv.amount_due) - Number(inv.amount_paid)
    if (balance <= 0) {
      results.push({ invoiceId: inv.id, family: family?.parent1_first ?? '?', phone: null, success: true, simulated: false, skipped: true })
      continue
    }

    const rawPhone  = family?.parent1_whatsapp ?? family?.parent1_phone ?? null
    const destPhone = testMode
      ? (testNumber ?? normalizePhoneNumber(rawPhone))
      : normalizePhoneNumber(rawPhone)

    if (!destPhone) {
      results.push({ invoiceId: inv.id, family: family?.parent1_first ?? '?', phone: null, success: false, simulated: false, error: 'Aucun numéro WhatsApp' })
      continue
    }

    const message = buildReminderMessage({
      parentFirst:   family?.parent1_first ?? 'Parent',
      amount:        balance,
      periodMonth:   inv.period_month as number,
      periodYear:    inv.period_year as number,
      invoiceNumber: inv.invoice_number as string | null,
      isOverdue:     inv.status === 'overdue',
    })

    const sendResult = await sendWhatsAppMessage(destPhone, message)
    results.push({
      invoiceId: inv.id,
      family:    family?.parent1_first ?? '?',
      phone:     destPhone,
      success:   sendResult.success,
      simulated: sendResult.simulated,
      error:     sendResult.error,
    })

    if (sendResult.success) {
      // reminder_sent_at column added in migration 013 — graceful fallback if not applied yet
      try {
        await admin
          .from('invoices')
          .update({ reminder_sent_at: new Date().toISOString() } as never)
          .eq('id', inv.id)
      } catch { /* migration 013 not yet applied — non-blocking */ }
    }
  }

  const sent      = results.filter((r) => r.success && !r.skipped).length
  const failed    = results.filter((r) => !r.success).length
  const skipped   = results.filter((r) => r.skipped).length
  const simulated = results.some((r) => r.simulated)

  return NextResponse.json({ ok: true, sent, failed, skipped, simulated, testMode, results })
}
