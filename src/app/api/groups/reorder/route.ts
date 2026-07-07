import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

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
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.role === 'viewer') return NextResponse.json({ error: 'Lecture seule' }, { status: 403 })
  const supabase = await createServerSupabaseClient()

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
    supabase.from('groups').update({ sort_order }).eq('id', id).eq('organization_id', ctx.organizationId)
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: parsed.data.groups.length })
}
