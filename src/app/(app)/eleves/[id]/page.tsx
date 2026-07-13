import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getStudentById, getEnrollmentsByStudent, getInvoices, getPaymentsByFamily } from '@/lib/supabase/queries'
import { StudentProfile } from '@/components/eleves/StudentProfile'

export const metadata: Metadata = { title: 'Fiche élève' }

interface Props { params: Promise<{ id: string }> }

export default async function StudentPage({ params }: Props) {
  const { id } = await params
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()

  let student
  try {
    student = await getStudentById(admin, orgId, id)
  } catch {
    notFound()
  }

  const [enrollments, payments, invoices, { data: groups }, { data: attendance }] = await Promise.all([
    getEnrollmentsByStudent(admin, orgId, id),
    student.family_id ? getPaymentsByFamily(admin, orgId, student.family_id) : Promise.resolve([]),
    student.family_id ? getInvoices(admin, orgId, { familyId: student.family_id }) : Promise.resolve([]),
    admin.from('groups').select('id, name, level:levels(name, emoji), site:sites(name)').eq('organization_id', orgId).eq('is_active', true).order('name'),
    admin
      .from('attendance')
      .select('id, status, notes, marked_at, session:sessions(id, session_date, group:groups(name, level:levels(name, emoji, color)))')
      .eq('organization_id', orgId)
      .eq('student_id', id),
  ])

  const attendanceHistory = ((attendance ?? []) as unknown as {
    id: string
    status: string
    notes: string | null
    marked_at: string
    session: { id: string; session_date: string; group: { name: string; level: { name: string; emoji: string; color: string } | null } | null } | null
  }[])
    .filter((entry) => entry.session)
    .sort((a, b) => (b.session!.session_date).localeCompare(a.session!.session_date))

  return (
    <StudentProfile
      student={student}
      enrollments={enrollments}
      payments={payments}
      invoices={invoices}
      groups={(groups ?? []) as unknown as { id: string; name: string; level: { name: string; emoji: string }; site: { name: string } }[]}
      attendance={attendanceHistory}
    />
  )
}
