import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getLevels, getStudents, getStudentStats } from '@/lib/supabase/queries'
import { ElevesContent } from '@/components/eleves/ElevesContent'

export const metadata: Metadata = { title: 'Élèves' }

export default async function ElevesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [sites, levels, students, stats] = await Promise.all([
    getSites(supabase),
    getLevels(supabase),
    getStudents(supabase).catch(() => []),
    getStudentStats(supabase).catch(() => null),
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
