import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const numberOrNull = z.preprocess(
  (value) => value === '' || value === null || value === undefined ? null : Number(value),
  z.number().min(0).max(99999).nullable()
)

const UpdatePricingRuleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  billing_type: z.enum(['per_session', 'monthly_per_child', 'monthly_family']).optional(),
  price_per_session: numberOrNull.optional(),
  price_1_child: numberOrNull.optional(),
  price_2_children: numberOrNull.optional(),
  price_3_children: numberOrNull.optional(),
  price_4_children: numberOrNull.optional(),
  price_5plus: numberOrNull.optional(),
  effective_from: z.string().min(10).max(10).optional(),
  effective_until: z.string().min(10).max(10).nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Tarification : admin uniquement (matrice RLS)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

    const { id } = await params
    const parsed = UpdatePricingRuleSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données tarifaires invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('pricing_rules')
      .update({
        ...parsed.data,
        effective_until: parsed.data.effective_until || null,
        notes: parsed.data.notes || null,
      })
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*, site:sites(*)')
      .single()

    if (error || !data) return NextResponse.json({ error: error?.message || 'Tarif introuvable' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
