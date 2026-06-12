import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schema de mise à jour ───────────────────────────────────────────────────

const PatchSchema = z.object({
  status: z.enum(['draft', 'reviewed', 'approved', 'sent']).optional(),
  html_content: z.string().optional(),
  whatsapp_text: z.string().optional(),
})

// ─── PATCH /api/resumes/[id] ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Validation
    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.html_content !== undefined) updates.html_content = parsed.data.html_content
    if (parsed.data.whatsapp_text !== undefined) updates.whatsapp_text = parsed.data.whatsapp_text

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour fournie' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('resumes')
      .update(updates)
      .eq('id', id)
      .select('id, status')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Résumé introuvable ou erreur de mise à jour', details: error?.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, id: data.id, status: data.status })
  } catch (error) {
    console.error('Erreur PATCH /api/resumes/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── GET /api/resumes/[id] ────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('resumes')
      .select(`
        *,
        sections:resume_sections(*)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Résumé introuvable' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET /api/resumes/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
