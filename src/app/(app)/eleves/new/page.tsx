import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getLevels, getStudents } from '@/lib/supabase/queries'
import { StudentForm } from '@/components/eleves/StudentForm'

export const metadata: Metadata = { title: 'Nouvel élève' }

export default async function NewStudentPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [sites, levels, students] = await Promise.all([
    getSites(supabase),
    getLevels(supabase),
    getStudents(supabase),
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
