import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const admin = createAdminSupabaseClient()

    const { data: family, error: famErr } = await admin
      .from('families')
      .select('id, parent1_first, parent1_last, registration_number, primary_site_id')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()
    if (famErr) throw famErr
    if (!family) return NextResponse.json({ error: 'Famille introuvable' }, { status: 404 })

    const { data: students, error: stuErr } = await admin
      .from('students')
      .select(`
        id, first_name, last_name, date_of_birth, status, site_id, level_id,
        level:levels(id, name, slug, age_min, age_max, color, emoji),
        enrollments(id, status, start_date, academic_year_id, group:groups(id, name, day_of_week, time_slot, site_id, level_id))
      `)
      .eq('family_id', id)
      .eq('organization_id', ctx.organizationId)
      .in('status', ['active', 'trial'])
      .order('first_name')
    if (stuErr) throw stuErr

    const shaped = (students ?? []).map((s) => {
      const enrollments = Array.isArray(s.enrollments) ? s.enrollments : []
      const lastEnrollment = [...enrollments].sort((a, b) =>
        (b.start_date || '').localeCompare(a.start_date || '')
      )[0] ?? null
      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`.trim(),
        date_of_birth: s.date_of_birth,
        site_id: s.site_id,
        level: s.level,
        last_group: lastEnrollment?.group ?? null,
        last_academic_year_id: lastEnrollment?.academic_year_id ?? null,
      }
    })

    return NextResponse.json({ family, students: shaped })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
