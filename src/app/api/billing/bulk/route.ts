import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const BulkSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  action: z.enum(['paid', 'pending', 'overdue']),
  entries: z.array(z.object({
    family_id: z.string().uuid(),
    site_id: z.string().uuid().nullable(),
    amount_due: z.number().min(0).max(99999),
  })).min(1).max(500),
})

export async function POST(request: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Finances : admin uniquement (matrice RLS)
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
  const parsed = BulkSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Sélection ou période invalide' }, { status: 400 })
  const admin = createAdminSupabaseClient()
  const results = []
  for (const entry of parsed.data.entries) {
    const { data: family } = await admin.from('families').select('organization_id').eq('id', entry.family_id).single()
    if (!family || family.organization_id !== ctx.organizationId) continue
    const { data: existing } = await admin.from('invoices').select('*').eq('family_id', entry.family_id)
      .eq('period_month', parsed.data.month).eq('period_year', parsed.data.year).neq('status', 'cancelled').limit(1).maybeSingle()
    let invoice = existing
    if (!invoice) {
      const { data } = await admin.from('invoices').insert({
        // user_id NOT NULL jusqu'à la migration 019
        organization_id: ctx.organizationId, user_id: ctx.user.id, family_id: entry.family_id, site_id: entry.site_id,
        period_month: parsed.data.month, period_year: parsed.data.year,
        invoice_number: `FAC-${parsed.data.year}${String(parsed.data.month).padStart(2, '0')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        amount_due: entry.amount_due, amount_paid: 0, discount: 0,
        status: parsed.data.action === 'overdue' ? 'overdue' : 'pending',
        due_date: `${parsed.data.year}-${String(parsed.data.month).padStart(2, '0')}-01`, line_items: [],
      }).select().single()
      invoice = data
    } else {
      const paid = Number(invoice.amount_paid)
      const status = paid >= entry.amount_due ? 'paid' : paid > 0 ? 'partial' : parsed.data.action === 'overdue' ? 'overdue' : 'pending'
      const { data } = await admin.from('invoices').update({ amount_due: entry.amount_due, site_id: entry.site_id, status }).eq('id', invoice.id).select().single()
      invoice = data
    }
    if (!invoice) continue
    if (parsed.data.action === 'paid') {
      const remaining = Math.max(Number(invoice.amount_due) - Number(invoice.amount_paid), 0)
      if (remaining > 0) await admin.from('payments').insert({
        organization_id: ctx.organizationId, user_id: ctx.user.id, invoice_id: invoice.id, family_id: entry.family_id, amount: remaining,
        currency: 'EUR', method: 'cash', payment_date: new Date().toISOString().slice(0, 10),
        notes: 'Validation collective depuis Familles & paiements',
      })
      const { data } = await admin.from('invoices').update({ amount_paid: Number(invoice.amount_due), status: 'paid' }).eq('id', invoice.id).select('*, family:families(*), site:sites(*)').single()
      invoice = data
    }
    results.push(invoice)
  }
  return NextResponse.json({ updated: results.length, invoices: results })
}
