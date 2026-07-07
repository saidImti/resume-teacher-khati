import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const FamilyRateSchema = z.object({
  primary_site_id: z.string().uuid().nullable().optional(),
  custom_monthly_rate: z.preprocess(
    (value) => value === '' || value === null || value === undefined ? null : Number(value),
    z.number().min(0).max(99999).nullable()
  ).optional(),
  custom_rate_note: z.string().max(1000).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Tarification : admin uniquement (matrice RLS finances)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

    const { id } = await params
    const parsed = FamilyRateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données famille invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('families')
      .update({
        primary_site_id: parsed.data.primary_site_id || null,
        custom_monthly_rate: parsed.data.custom_monthly_rate ?? null,
        custom_rate_note: parsed.data.custom_rate_note || null,
      })
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*, site:sites(*), students(*)')
      .single()

    if (error || !data) return NextResponse.json({ error: error?.message || 'Famille introuvable' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
