// TEMPORAIRE — supprimer après diagnostic
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminSupabaseClient()

  const [
    { data: students,    error: studentsErr    },
    { data: enrollments, error: enrollmentsErr },
  ] = await Promise.all([
    admin.from('students').select('id, first_name, last_name, status').limit(20),
    admin.from('enrollments').select('id, student_id, group_id, status').limit(20),
  ])

  // Test sans .order() pour voir si la query marche
  const { data: enrWithStudents, error: enrErr } = await admin
    .from('enrollments')
    .select('id, status, group_id, student:students(id, first_name, last_name)')
    .in('status', ['active', 'trial'])
    .limit(10)

  return NextResponse.json({
    students:       { count: students?.length, data: students,    error: studentsErr?.message    },
    enrollments:    { count: enrollments?.length, data: enrollments, error: enrollmentsErr?.message },
    enrWithStudents:{ count: enrWithStudents?.length, data: enrWithStudents, error: enrErr?.message },
  })
}
