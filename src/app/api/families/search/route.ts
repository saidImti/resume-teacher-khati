import { NextResponse, type NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    if (q.length < 2) return NextResponse.json([])

    const admin = createAdminSupabaseClient()
    const digits = q.replace(/\D/g, '')
    const orParts = [
      `parent1_first.ilike.%${q}%`,
      `parent1_last.ilike.%${q}%`,
      `parent2_first.ilike.%${q}%`,
      `parent2_last.ilike.%${q}%`,
      `registration_number.ilike.%${q}%`,
    ]
    if (digits.length >= 4) {
      orParts.push(`parent1_phone.ilike.%${digits}%`, `parent2_phone.ilike.%${digits}%`)
    }

    const { data, error } = await admin
      .from('families')
      .select('id, parent1_first, parent1_last, parent1_phone, parent1_email, registration_number, primary_site_id, students(id)')
      .eq('organization_id', ctx.organizationId)
      .eq('is_active', true)
      .or(orParts.join(','))
      .limit(8)

    if (error) throw error

    const results = (data ?? []).map((f) => ({
      id: f.id,
      name: `${f.parent1_first} ${f.parent1_last}`.trim(),
      phone: f.parent1_phone,
      email: f.parent1_email,
      registration_number: f.registration_number,
      site_id: f.primary_site_id,
      students_count: Array.isArray(f.students) ? f.students.length : 0,
    }))

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
