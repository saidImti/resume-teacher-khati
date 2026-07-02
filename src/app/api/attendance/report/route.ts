// ─── API /api/attendance/report ──────────────────────────────────────────────
// GET → registre de présence agrégé par élève sur une période
//        ?from=YYYY-MM-DD&to=YYYY-MM-DD[&siteId=][&groupId=]
// Chaque appel enregistré (table attendance) est compté, joint à sa
// session (date réelle du cours) — base de la fiche de présence
// mensuelle / trimestrielle / annuelle / personnalisée.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

interface ReportRow {
  student: { id: string; first_name: string; last_name: string }
  group: { id: string; name: string; emoji: string; color: string; site: string } | null
  present: number
  absent: number
  late: number
  excused: number
  total: number
  rate: number
  entries: Array<{ date: string; status: string; notes: string | null }>
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const siteId = searchParams.get('siteId')
    const groupId = searchParams.get('groupId')
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: 'from et to (YYYY-MM-DD) requis' }, { status: 400 })
    }

    // !inner : ne garde que les présences dont la session tombe dans la plage.
    // Client ADMIN obligatoire : sessions/groups/sites/levels n'ont pas de user_id
    // et leur RLS (has_site_access) viderait le join sous le client utilisateur
    // (piège documenté MASTER §27). L'appartenance reste garantie par le filtre
    // explicite user_id sur attendance.
    const admin = createAdminSupabaseClient()
    let query = admin
      .from('attendance')
      .select(`
        id, status, notes, student_id,
        session:sessions!inner(
          id, session_date, group_id,
          group:groups(id, name, site_id, level:levels(name, emoji, color), site:sites(id, name))
        ),
        student:students(id, first_name, last_name)
      `)
      .eq('user_id', user.id)
      .gte('session.session_date', from)
      .lte('session.session_date', to)

    if (groupId) query = query.eq('session.group_id', groupId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Agrégation par élève.
    const byStudent = new Map<string, ReportRow>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const raw of (data ?? []) as any[]) {
      if (!raw.student || !raw.session) continue
      if (siteId && raw.session.group?.site_id !== siteId) continue

      let row = byStudent.get(raw.student.id)
      if (!row) {
        row = {
          student: raw.student,
          group: raw.session.group ? {
            id: raw.session.group.id,
            name: raw.session.group.name,
            emoji: raw.session.group.level?.emoji ?? '📋',
            color: raw.session.group.level?.color ?? '#8b5cf6',
            site: raw.session.group.site?.name ?? '',
          } : null,
          present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0,
          entries: [],
        }
        byStudent.set(raw.student.id, row)
      }
      if (raw.status === 'present') row.present++
      else if (raw.status === 'absent') row.absent++
      else if (raw.status === 'late') row.late++
      else if (raw.status === 'excused') row.excused++
      row.total++
      row.entries.push({ date: raw.session.session_date, status: raw.status, notes: raw.notes })
    }

    const rows = [...byStudent.values()]
      .map(row => ({
        ...row,
        rate: row.total > 0 ? Math.round(((row.present + row.late) / row.total) * 100) : 0,
        entries: row.entries.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => `${a.student.last_name} ${a.student.first_name}`.localeCompare(`${b.student.last_name} ${b.student.first_name}`, 'fr'))

    const totals = rows.reduce(
      (acc, row) => ({
        present: acc.present + row.present,
        absent: acc.absent + row.absent,
        late: acc.late + row.late,
        excused: acc.excused + row.excused,
        total: acc.total + row.total,
      }),
      { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    )

    return NextResponse.json({ from, to, rows, totals, students: rows.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
