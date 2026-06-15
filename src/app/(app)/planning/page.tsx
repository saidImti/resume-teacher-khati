import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getSchedulesByDay, getStudents } from '@/lib/supabase/queries'
import { PlanningContent } from '@/components/planning/PlanningContent'

export const metadata: Metadata = { title: 'Planning' }

export default async function PlanningPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [sites, schedulesByDay, students, groupsRes] = await Promise.all([
    getSites(supabase),
    getSchedulesByDay(supabase).catch(() => ({})),
    getStudents(supabase, { status: 'active' }).catch(() => []),
    supabase
      .from('groups')
      .select('*, site:sites(*), level:levels(*)')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <PlanningContent
      sites={sites}
      schedulesByDay={schedulesByDay}
      students={students}
      groups={groupsRes.data ?? []}
    />
  )
}
