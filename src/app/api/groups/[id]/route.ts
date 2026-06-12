import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schema mise à jour ───────────────────────────────────────────────────────

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level_id: z.string().uuid().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  time_slot: z.string().max(20).nullable().optional(),
  max_students: z.number().int().min(1).max(50).nullable().optional(),
  is_active: z.boolean().optional(),
})

// ─── PATCH /api/groups/[id] ───────────────────────────────────────────────────

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
    const parsed = UpdateGroupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = { ...parsed.data }

    // Mettre à jour le slug si le nom change
    if (parsed.data.name) {
      updates.slug = parsed.data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .select('*, level:levels(*), site:sites(*)')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── DELETE /api/groups/[id] (archive) ────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    // Archiver plutôt que supprimer
    const { error } = await supabase
      .from('groups')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── GET /api/groups/[id] ─────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    const { data, error } = await supabase
      .from('groups')
      .select('*, level:levels(*), site:sites(*), academic_year:academic_years(*)')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
