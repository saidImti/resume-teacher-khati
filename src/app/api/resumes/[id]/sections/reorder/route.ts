import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schéma ──────────────────────────────────────────────────────────────────

const ReorderSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
      })
    )
    .min(1),
})

// ─── PATCH /api/resumes/[id]/sections/reorder ────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: resumeId } = await params

  // Vérifier que le résumé existe
  const { error: resumeError } = await supabase
    .from('resumes')
    .select('id')
    .eq('id', resumeId)
    .single()

  if (resumeError) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  // Parser le body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ReorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Mettre à jour chaque section en batch (Promise.all)
  const updates = parsed.data.sections.map(({ id, sort_order }) =>
    supabase
      .from('resume_sections')
      .update({ sort_order })
      .eq('id', id)
      .eq('resume_id', resumeId) // sécurité : on s'assure que la section appartient au résumé
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: parsed.data.sections.length })
}
