import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  site_id: z.string().uuid('site_id invalide'),
  level_id: z.string().uuid('level_id invalide'),
  academic_year_id: z.string().uuid('academic_year_id invalide'),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  time_slot: z.string().max(20).nullable().optional(),
  max_students: z.number().int().min(1).max(50).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const academicYearId = searchParams.get('academicYearId')
    const admin = createAdminSupabaseClient()

    let query = admin
      .from('groups')
      .select('*, level:levels(*), site:sites(*)')
      .order('name')

    if (siteId) query = query.eq('site_id', siteId)
    if (academicYearId) query = query.eq('academic_year_id', academicYearId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const parsed = CreateGroupSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('groups')
      .insert({
        name: parsed.data.name,
        site_id: parsed.data.site_id,
        level_id: parsed.data.level_id,
        academic_year_id: parsed.data.academic_year_id,
        day_of_week: parsed.data.day_of_week ?? null,
        time_slot: parsed.data.time_slot || null,
        max_students: parsed.data.max_students ?? 12,
        is_active: true,
      })
      .select('*, level:levels(*), site:sites(*)')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Un groupe avec ce nom existe déjà sur ce site, ce niveau et cette année.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'Impossible de créer le groupe', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
