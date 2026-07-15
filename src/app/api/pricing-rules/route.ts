import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const numberOrNull = z.preprocess(
  (value) => value === '' || value === null || value === undefined ? null : Number(value),
  z.number().min(0).max(99999).nullable()
)

const intOrDefault = (def: number, min: number, max: number) => z.preprocess(
  (value) => value === '' || value === null || value === undefined ? def : Number(value),
  z.number().int().min(min).max(max)
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
  // Options étendues (migration 019)
  registration_fee: numberOrNull.optional(),
  registration_fee_scope: z.enum(['per_child', 'per_family']).optional(),
  months_per_year: intOrDefault(10, 1, 12).optional(),
  sessions_per_month: intOrDefault(4, 1, 31).optional(),
  annual_discount_pct: z.preprocess(
    (value) => value === '' || value === null || value === undefined ? null : Number(value),
    z.number().min(0).max(100).nullable()
  ).optional(),
  effective_from: z.string().min(10).max(10),
  effective_until: z.string().min(10).max(10).nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    const admin = createAdminSupabaseClient()
    let query = admin
      .from('pricing_rules')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .eq('is_active', true)
      .lte('effective_from', new Date().toISOString().slice(0, 10))
      .order('effective_from', { ascending: false })

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) throw error

    // Une seule regle active par site (la plus recente si plusieurs)
    const bySite = new Map<string, (typeof data)[number]>()
    for (const rule of data ?? []) {
      if (!bySite.has(rule.site_id)) bySite.set(rule.site_id, rule)
    }

    return NextResponse.json(siteId ? (bySite.get(siteId) ?? null) : Array.from(bySite.values()))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Tarification : admin uniquement (matrice RLS)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

    const parsed = PricingRuleSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données tarifaires invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    // Le site doit appartenir à l'organisation
    const { data: site } = await admin.from('sites').select('organization_id').eq('id', parsed.data.site_id).maybeSingle()
    if (!site || site.organization_id !== ctx.organizationId) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('pricing_rules')
      .insert({
        organization_id: ctx.organizationId,
        // user_id NOT NULL jusqu'à la migration 019
        user_id: ctx.user.id,
        site_id: parsed.data.site_id,
        name: parsed.data.name,
        billing_type: parsed.data.billing_type,
        price_per_session: parsed.data.billing_type === 'per_session' ? parsed.data.price_per_session ?? 0 : null,
        price_1_child: parsed.data.billing_type !== 'per_session' ? parsed.data.price_1_child ?? 0 : null,
        price_2_children: parsed.data.billing_type !== 'per_session' ? parsed.data.price_2_children ?? parsed.data.price_1_child ?? 0 : null,
        price_3_children: parsed.data.billing_type !== 'per_session' ? parsed.data.price_3_children ?? parsed.data.price_2_children ?? parsed.data.price_1_child ?? 0 : null,
        price_4_children: parsed.data.billing_type !== 'per_session' ? parsed.data.price_4_children ?? parsed.data.price_3_children ?? parsed.data.price_1_child ?? 0 : null,
        price_5plus: parsed.data.billing_type !== 'per_session' ? parsed.data.price_5plus ?? parsed.data.price_4_children ?? parsed.data.price_1_child ?? 0 : null,
        registration_fee: parsed.data.registration_fee ?? null,
        registration_fee_scope: parsed.data.registration_fee_scope ?? 'per_child',
        months_per_year: parsed.data.months_per_year ?? 10,
        sessions_per_month: parsed.data.sessions_per_month ?? 4,
        annual_discount_pct: parsed.data.annual_discount_pct ?? null,
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
