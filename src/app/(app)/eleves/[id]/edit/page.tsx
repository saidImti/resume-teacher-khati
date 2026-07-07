import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getLevels, getStudentById, getStudents } from '@/lib/supabase/queries'
import { StudentForm } from '@/components/eleves/StudentForm'
import type { Family } from '@/types'

export const metadata: Metadata = { title: 'Modifier l\'élève' }
interface Props { params: Promise<{ id: string }> }

export default async function EditStudentPage({ params }: Props) {
  const { id } = await params
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId

  let student
  const admin = createAdminSupabaseClient()
  try { student = await getStudentById(admin, orgId, id) }
  catch { notFound() }

  const [sites, levels, students] = await Promise.all([
    getSites(admin, orgId), getLevels(admin, orgId), getStudents(admin, orgId),
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
