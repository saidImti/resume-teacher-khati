import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getStudentById, getEnrollmentsByStudent, getPaymentsByFamily } from '@/lib/supabase/queries'
import { StudentProfile } from '@/components/eleves/StudentProfile'

export const metadata: Metadata = { title: 'Fiche élève' }

interface Props { params: Promise<{ id: string }> }

export default async function StudentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let student
  try {
    student = await getStudentById(supabase, id)
  } catch {
    notFound()
  }

  const [enrollments, payments] = await Promise.all([
    getEnrollmentsByStudent(supabase, id),
    student.family_id ? getPaymentsByFamily(supabase, student.family_id) : Promise.resolve([]),
  ])

  return (
    <StudentProfile
      student={student}
      enrollments={enrollments}
      payments={payments}
    />
  )
}
