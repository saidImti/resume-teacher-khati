import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

const InvoiceSchema = z.object({
  family_id: z.string().uuid(),
  site_id: z.string().uuid().nullable(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2020).max(2100),
  amount_due: z.number().min(0).max(99999),
  notes: z.string().max(1000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const parsed = InvoiceSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données de facture invalides' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const payload = parsed.data
  const { data: family, error: familyError } = await admin
    .from('families')
    .select('user_id')
    .eq('id', payload.family_id)
    .single()
  if (familyError || !family) {
    return NextResponse.json({ error: 'Famille introuvable' }, { status: 404 })
  }

  const { data: existing, error: existingError } = await admin
    .from('invoices')
    .select('*')
    .eq('family_id', payload.family_id)
    .eq('period_month', payload.period_month)
    .eq('period_year', payload.period_year)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })

  if (existing) {
    const amountPaid = Number(existing.amount_paid)
    const amountDue = payload.amount_due
    const status = amountPaid >= amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'pending'
    const { data, error } = await admin
      .from('invoices')
      .update({
        site_id: payload.site_id,
        amount_due: amountDue,
        status,
        notes: payload.notes ?? existing.notes,
      })
      .eq('id', existing.id)
      .select('*, family:families(*), site:sites(*)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  const invoiceNumber = `FAC-${payload.period_year}${String(payload.period_month).padStart(2, '0')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const { data, error } = await admin
    .from('invoices')
    .insert({
      user_id: family.user_id,
      family_id: payload.family_id,
      site_id: payload.site_id,
      period_month: payload.period_month,
      period_year: payload.period_year,
      invoice_number: invoiceNumber,
      amount_due: payload.amount_due,
      amount_paid: 0,
      discount: 0,
      status: 'pending',
      due_date: `${payload.period_year}-${String(payload.period_month).padStart(2, '0')}-01`,
      line_items: [],
      notes: payload.notes ?? null,
    })
    .select('*, family:families(*), site:sites(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
