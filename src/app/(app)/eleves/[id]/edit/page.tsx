import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getLevels, getStudentById, getStudents } from '@/lib/supabase/queries'
import { StudentForm } from '@/components/eleves/StudentForm'
import type { Family } from '@/types'

export const metadata: Metadata = { title: 'Modifier l\'élève' }
interface Props { params: Promise<{ id: string }> }

export default async function EditStudentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let student
  try { student = await getStudentById(supabase, id) }
  catch { notFound() }

  const admin = createAdminSupabaseClient()
  const [sites, levels, students] = await Promise.all([
    getSites(admin), getLevels(admin), getStudents(supabase),
  ])

  const families = Array.from(
    new Map(students.filter(s => s.family).map(s => [s.family_id, s.family])).values()
  ) as Family[]

  return (
    <StudentForm
      mode="edit"
      student={student}
      sites={sites}
      levels={levels}
      existingFamilies={families}
    />
  )
}
