import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

const numberOrNull = z.preprocess(
  (value) => value === '' || value === null || value === undefined ? null : Number(value),
  z.number().min(0).max(99999).nullable()
)

const PricingRuleSchema = z.object({
  site_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  billing_type: z.enum(['per_session', 'monthly_per_child', 'monthly_family']),
  price_per_session: numberOrNull.optional(),
  price_1_child: numberOrNull.optional(),
  price_2_children: numberOrNull.optional(),
  price_3_children: numberOrNull.optional(),
  price_4_children: numberOrNull.optional(),
  price_5plus: numberOrNull.optional(),
  effective_from: z.string().min(10).max(10),
  effective_until: z.string().min(10).max(10).nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const parsed = PricingRuleSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données tarifaires invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('pricing_rules')
      .insert({
        user_id: user.id,
        site_id: parsed.data.site_id,
        name: parsed.data.name,
        billing_type: parsed.data.billing_type,
        price_per_session: parsed.data.billing_type === 'per_session' ? parsed.data.price_per_session ?? 0 : null,
        price_1_child: parsed.data.billing_type !== 'per_session' ? parsed.data.price_1_child ?? 0 : null,
        price_2_children: parsed.data.billing_type !== 'per_session' ? parsed.data.price_2_children ?? parsed.data.price_1_child ?? 0 : null,
        price_3_children: parsed.data.billing_type !== 'per_session' ? parsed.data.price_3_children ?? parsed.data.price_2_children ?? parsed.data.price_1_child ?? 0 : null,
        price_4_children: parsed.data.billing_type !== 'per_session' ? parsed.data.price_4_children ?? parsed.data.price_3_children ?? parsed.data.price_1_child ?? 0 : null,
        price_5plus: parsed.data.billing_type !== 'per_session' ? parsed.data.price_5plus ?? parsed.data.price_4_children ?? parsed.data.price_1_child ?? 0 : null,
        effective_from: parsed.data.effective_from,
        effective_until: parsed.data.effective_until || null,
        is_active: parsed.data.is_active ?? true,
        notes: parsed.data.notes || null,
      })
      .select('*, site:sites(*)')
      .single()

    if (error) return NextResponse.json({ error: error.message, details: error }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
