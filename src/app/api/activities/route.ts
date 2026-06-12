import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schéma création ──────────────────────────────────────────────────────────

const CreateActivitySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(150),
  description: z.string().max(500).nullable().optional(),
  level_ids: z.array(z.string().uuid()).min(1, 'Au moins un niveau requis'),
  skills: z.array(
    z.enum(['speaking', 'listening', 'reading', 'writing', 'phonics', 'vocabulary', 'grammar'])
  ).min(1, 'Au moins une compétence'),
  tags: z.array(z.string().max(30)).optional().default([]),
  duration_min: z.number().int().min(1).max(120).nullable().optional(),
  emoji: z.string().max(10).nullable().optional(),
  is_public: z.boolean().optional().default(true),
})

// ─── GET /api/activities ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const levelId = searchParams.get('levelId')
    const skill = searchParams.get('skill')
    const q = searchParams.get('q')

    let query = supabase
      .from('activities')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('name')

    // Filtrer par compétence (contains dans le tableau JSONB)
    if (skill) {
      query = query.contains('skills', [skill])
    }

    // Filtrer par niveau (contains dans le tableau JSONB)
    if (levelId) {
      query = query.contains('level_ids', [levelId])
    }

    // Recherche texte sur le nom
    if (q) {
      query = query.ilike('name', `%${q}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── POST /api/activities ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...parsed.data,
        created_by: user.id,
        usage_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
