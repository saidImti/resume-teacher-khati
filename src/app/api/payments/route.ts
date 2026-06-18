import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

const PaymentSchema = z.object({
  family_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  amount: z.number().positive().max(99999),
  method: z.enum(['cash', 'card', 'transfer', 'check', 'other']),
  payment_date: z.string().date(),
  reference: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const parsed = PaymentSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données de paiement invalides' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const payload = parsed.data
  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .select('*')
    .eq('id', payload.invoice_id)
    .eq('family_id', payload.family_id)
    .single()
  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      user_id: user.id,
      family_id: payload.family_id,
      invoice_id: payload.invoice_id,
      amount: payload.amount,
      currency: 'EUR',
      method: payload.method,
      payment_date: payload.payment_date,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single()
  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  const amountPaid = Number(invoice.amount_paid) + payload.amount
  const amountDue = Number(invoice.amount_due)
  const status = amountPaid >= amountDue ? 'paid' : 'partial'
  const { error: updateError } = await admin
    .from('invoices')
    .update({ amount_paid: amountPaid, status })
    .eq('id', invoice.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  return NextResponse.json(payment, { status: 201 })
}
