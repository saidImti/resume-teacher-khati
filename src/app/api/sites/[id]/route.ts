import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { withApiAuth } from '@/lib/with-api-auth'

const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(240).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await withApiAuth(request, 'admin')
    if (!auth.ok) return auth.response

    const { id } = await params
    const parsed = UpdateSiteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const updates: Record<string, unknown> = { ...parsed.data }
    if ('address' in parsed.data) updates.address = parsed.data.address || null
    if (parsed.data.name) updates.slug = slugify(parsed.data.name)

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('sites')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        const message = error.message.includes('registration_prefix')
          ? `Le code ${parsed.data.registration_prefix} est deja utilise par un autre site`
          : 'Un site avec ce nom existe deja'
        return NextResponse.json({ error: message }, { status: 409 })
      }
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }
    if (!data) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await withApiAuth(request, 'admin')
    if (!auth.ok) return auth.response

    const { id } = await params
    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from('sites')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
