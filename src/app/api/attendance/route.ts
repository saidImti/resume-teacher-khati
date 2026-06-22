// ─── API /api/attendance ──────────────────────────────────────────────────────
// GET  → liste des présences + élèves pour une session
// POST → upsert batch (appel complet d'une session)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })

    const admin = createAdminSupabaseClient()

    // sessions, groups, enrollments n'ont pas de user_id — admin client
    const { data: session, error: sessionErr } = await admin
      .from('sessions')
      .select('id, session_date, title, group_id, group:groups(id, name, level:levels(id, name, emoji, color), site:sites(id, name))')
      .eq('id', sessionId)
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    const { data: enrollments, error: enrErr } = await admin
      .from('enrollments')
      .select(`
        id,
        student:students(
          id, first_name, last_name, photo_url, photo_consent,
          family:families(id, parent1_first, parent1_last, parent1_whatsapp, parent1_phone)
        )
      `)
      .eq('group_id', session.group_id)
      .in('status', ['active', 'trial'])
      .order('student(last_name)')

    if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 })

    // attendance a bien une colonne user_id — client utilisateur
    const { data: attendances } = await supabase
      .from('attendance')
      .select('id, student_id, status, marked_at, notes, notif_sent_at, notif_type')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)

    const attendanceMap = new Map((attendances ?? []).map((a) => [a.student_id, a]))
    const students = (enrollments ?? []).map((e) => e.student).filter(Boolean)

    const stats = { total: students.length, present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 }
    for (const s of students) {
      const a = attendanceMap.get((s as unknown as { id: string }).id)
      if (!a)                       stats.unmarked++
      else if (a.status === 'present') stats.present++
      else if (a.status === 'absent')  stats.absent++
      else if (a.status === 'late')    stats.late++
      else if (a.status === 'excused') stats.excused++
    }

    return NextResponse.json({ session, students, attendance: attendances ?? [], stats })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json() as {
      sessionId: string
      records: Array<{ studentId: string; status: string; notes?: string }>
    }

    if (!body.sessionId || !Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json({ error: 'sessionId et records requis' }, { status: 400 })
    }

    // attendance a user_id — client utilisateur
    const rows = body.records.map((r) => ({
      user_id:    user.id,
      session_id: body.sessionId,
      student_id: r.studentId,
      status:     r.status,
      notes:      r.notes ?? null,
      marked_at:  new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'session_id,student_id', ignoreDuplicates: false })
      .select('id, student_id, status')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const absents = (data ?? []).filter((r) => r.status === 'absent')

    return NextResponse.json({ saved: data?.length ?? 0, absents, message: `${data?.length ?? 0} présences enregistrées` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
