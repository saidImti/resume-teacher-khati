import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schéma mise à jour ───────────────────────────────────────────────────────

const UpdateActivitySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(500).nullable().optional(),
  level_ids: z.array(z.string().uuid()).min(1).optional(),
  skills: z.array(
    z.enum(['speaking', 'listening', 'reading', 'writing', 'phonics', 'vocabulary', 'grammar'])
  ).min(1).optional(),
  tags: z.array(z.string().max(30)).optional(),
  duration_min: z.number().int().min(1).max(120).nullable().optional(),
  emoji: z.string().max(10).nullable().optional(),
  is_public: z.boolean().optional(),
})

// ─── GET /api/activities/[id] ─────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).single()

    if (error || !data) return NextResponse.json({ error: 'Activité introuvable' }, { status: 404 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── PATCH /api/activities/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const parsed = UpdateActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('activities')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Activité introuvable' }, { status: 404 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── DELETE /api/activities/[id] ──────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { error } = await supabase.from('activities').delete().eq('id', id)

    if (error) return NextResponse.json({ error: 'Activité introuvable' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
