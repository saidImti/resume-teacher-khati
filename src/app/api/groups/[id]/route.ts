import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  site_id: z.string().uuid().optional(),
  level_id: z.string().uuid().optional(),
  academic_year_id: z.string().uuid().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  time_slot: z.string().max(20).nullable().optional(),
  max_students: z.number().int().min(1).max(50).nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (ctx.role === 'viewer') return NextResponse.json({ error: 'Lecture seule' }, { status: 403 })

    const { id } = await params
    const parsed = UpdateGroupSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('groups')
      .update({
        ...parsed.data,
        time_slot: parsed.data.time_slot || null,
      })
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*, level:levels(*), site:sites(*)')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Groupe introuvable', details: error },
        { status: error?.code === '23505' ? 409 : 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Suppression de groupe : admin uniquement (policy RESTRICTIVE en base)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

    const { id } = await params
    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from('groups')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('groups')
      .select('*, level:levels(*), site:sites(*), academic_year:academic_years(*)')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
