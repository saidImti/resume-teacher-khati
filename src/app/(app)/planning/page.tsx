import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getSchedulesByDay, getStudents } from '@/lib/supabase/queries'
import { PlanningContent } from '@/components/planning/PlanningContent'

export const metadata: Metadata = { title: 'Planning' }

export default async function PlanningPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()

  const [sites, schedulesByDay, students, groupsRes] = await Promise.all([
    getSites(admin, orgId),
    getSchedulesByDay(admin, orgId).catch(() => ({})),
    getStudents(admin, orgId).catch(() => []),
    admin
      .from('groups')
      .select('*, site:sites(*), level:levels(*)')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <PlanningContent
      sites={sites}
      schedulesByDay={schedulesByDay}
      students={students}
      groups={groupsRes.data ?? []}
      organizationId={orgId}
    />
  )
}
