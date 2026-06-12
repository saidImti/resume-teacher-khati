import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schema création ─────────────────────────────────────────────────────────

const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  site_id: z.string().uuid('site_id invalide'),
  level_id: z.string().uuid('level_id invalide'),
  academic_year_id: z.string().uuid('academic_year_id invalide'),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  time_slot: z.string().max(20).nullable().optional(),
  max_students: z.number().int().min(1).max(50).optional(),
})

// ─── GET /api/groups ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const academicYearId = searchParams.get('academicYearId')

    let query = supabase
      .from('groups')
      .select('*, level:levels(*), site:sites(*)')
      .order('name')

    if (siteId) query = query.eq('site_id', siteId)
    if (academicYearId) query = query.eq('academic_year_id', academicYearId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── POST /api/groups ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateGroupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Générer le slug depuis le nom
    const slug = parsed.data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data, error } = await supabase
      .from('groups')
      .insert({ ...parsed.data, slug, created_by: user.id })
      .select('*, level:levels(*), site:sites(*)')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Un groupe avec ce nom existe déjà sur ce site' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
