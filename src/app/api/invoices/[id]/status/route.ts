import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const StatusSchema = z.object({
  status: z.enum(['pending', 'overdue']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Finances : admin uniquement (matrice RLS)
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const parsed = StatusSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const { id } = await params
  const admin = createAdminSupabaseClient()
  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('organization_id', ctx.organizationId)
    .single()
  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }
  if (Number(invoice.amount_paid) > 0) {
    return NextResponse.json({ error: 'Une facture déjà payée ne peut pas être remise impayée directement.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('invoices')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('*, family:families(*), site:sites(*)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
