import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getLevels, getStudents } from '@/lib/supabase/queries'
import { StudentForm } from '@/components/eleves/StudentForm'

export const metadata: Metadata = { title: 'Nouvel élève' }

export default async function NewStudentPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId

  const admin = createAdminSupabaseClient()
  const [sites, levels, students] = await Promise.all([
    getSites(admin, orgId),
    getLevels(admin, orgId),
    getStudents(admin, orgId),
  ])

  // Pour pouvoir rattacher à une famille existante, on récupère les familles distinctes
  const families = Array.from(
    new Map(
      students
        .filter(s => s.family)
        .map(s => [s.family_id, s.family])
    ).values()
  )

  return (
    <StudentForm
      mode="create"
      sites={sites}
      levels={levels}
      existingFamilies={families as import('@/types').Family[]}
    />
  )
}
