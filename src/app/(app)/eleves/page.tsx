import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getLevels, getStudents, getStudentStats } from '@/lib/supabase/queries'
import { ElevesContent } from '@/components/eleves/ElevesContent'

export const metadata: Metadata = { title: 'Élèves' }

export default async function ElevesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const [sites, levels, students, stats] = await Promise.all([
    getSites(admin),
    getLevels(admin),
    getStudents(admin).catch(() => []),
    getStudentStats(admin).catch(() => null),
  ])

  return (
    <ElevesContent
      sites={sites}
      levels={levels}
      students={students}
      stats={stats}
    />
  )
}
