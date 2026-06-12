import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Schéma ──────────────────────────────────────────────────────────────────

const ReorderSchema = z.object({
  groups: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
      })
    )
    .min(1),
})

// ─── PATCH /api/groups/reorder ────────────────────────────────────────────────

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const updates = parsed.data.groups.map(({ id, sort_order }) =>
    supabase.from('groups').update({ sort_order }).eq('id', id)
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: parsed.data.groups.length })
}
