import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getStudentById, getEnrollmentsByStudent, getInvoices, getPaymentsByFamily } from '@/lib/supabase/queries'
import { StudentProfile } from '@/components/eleves/StudentProfile'

export const metadata: Metadata = { title: 'Fiche élève' }

interface Props { params: Promise<{ id: string }> }

export default async function StudentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  let student
  try {
    student = await getStudentById(admin, id)
  } catch {
    notFound()
  }

  const [enrollments, payments, invoices, { data: groups }] = await Promise.all([
    getEnrollmentsByStudent(admin, id),
    student.family_id ? getPaymentsByFamily(admin, student.family_id) : Promise.resolve([]),
    student.family_id ? getInvoices(admin, { familyId: student.family_id }) : Promise.resolve([]),
    admin.from('groups').select('id, name, level:levels(name, emoji), site:sites(name)').eq('is_active', true).order('name'),
  ])

  return (
    <StudentProfile
      student={student}
      enrollments={enrollments}
      payments={payments}
      invoices={invoices}
      groups={(groups ?? []) as unknown as { id: string; name: string; level: { name: string; emoji: string }; site: { name: string } }[]}
    />
  )
}
