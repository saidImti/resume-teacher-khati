import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getLevels } from '@/lib/supabase/queries'
import { NewRegistrationForm } from '@/components/eleves/NewRegistrationForm'
import type { AcademicYear } from '@/types'

export const metadata: Metadata = { title: 'Nouvelle inscription' }

export default async function NewStudentPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId

  const admin = createAdminSupabaseClient()
  const [sites, levels, { data: academicYears }] = await Promise.all([
    getSites(admin, orgId),
    getLevels(admin, orgId),
    admin
      .from('academic_years')
      .select('id, name, start_date, end_date, is_active, created_at, updated_at')
      .eq('organization_id', orgId)
      .order('start_date', { ascending: false }),
  ])

  return (
    <NewRegistrationForm
      sites={sites}
      levels={levels}
      academicYears={(academicYears ?? []) as AcademicYear[]}
    />
  )
}
