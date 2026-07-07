import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

const Schema = z.object({
  student_id: z.string().uuid(),
  group_id:   z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:     z.enum(['active', 'trial']).default('active'),
  notes:      z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (ctx.role === 'viewer') return NextResponse.json({ error: 'Lecture seule' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const admin = createAdminSupabaseClient()

  // L'élève et le groupe doivent appartenir à l'organisation
  const [{ data: student }, { data: group }] = await Promise.all([
    admin.from('students').select('organization_id').eq('id', parsed.data.student_id).maybeSingle(),
    admin.from('groups').select('organization_id').eq('id', parsed.data.group_id).maybeSingle(),
  ])
  if (!student || student.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }
  if (!group || group.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('enrollments')
    // user_id NOT NULL jusqu'à la migration 019
    .insert({ ...parsed.data, organization_id: ctx.organizationId, user_id: ctx.user.id })
    .select('id, student_id, group_id, status, start_date')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ enrollment: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (ctx.role === 'viewer') return NextResponse.json({ error: 'Lecture seule' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  const { error } = await admin
    .from('enrollments')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
