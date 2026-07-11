import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { withApiAuth } from '@/lib/with-api-auth'

const SiteSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  address: z.string().max(240).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide'),
  is_active: z.boolean().optional(),
  registration_prefix: z.number().int().positive().nullable().optional(),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withApiAuth(request, 'admin')
    if (!auth.ok) return auth.response

    const parsed = SiteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    // Code d'inscription : auto-suggéré (prochain multiple de 10) si non fourni,
    // pour que tout site ait toujours un préfixe distinct du fallback 99.
    let registrationPrefix = parsed.data.registration_prefix ?? null
    if (registrationPrefix === null) {
      const { data: existing } = await admin
        .from('sites')
        .select('registration_prefix')
        .eq('organization_id', auth.organizationId)
        .not('registration_prefix', 'is', null)
        .order('registration_prefix', { ascending: false })
        .limit(1)
        .maybeSingle()
      registrationPrefix = existing?.registration_prefix ? existing.registration_prefix + 10 : 10
    }

    const { data, error } = await admin
      .from('sites')
      .insert({
        organization_id: auth.organizationId,
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        address: parsed.data.address || null,
        color: parsed.data.color,
        is_active: parsed.data.is_active ?? true,
        registration_prefix: registrationPrefix,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        const message = error.message.includes('registration_prefix')
          ? `Le code ${registrationPrefix} est deja utilise par un autre site`
          : 'Un site avec ce nom existe deja'
        return NextResponse.json({ error: message }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
