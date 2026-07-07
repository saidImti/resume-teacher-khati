// ─── Agrégation du registre de présence ─────────────────────────────────────
// Partagé entre l'API /api/attendance/report et la page d'impression A4.
// Client ADMIN obligatoire : la RLS (has_site_access) viderait le join sous
// le client utilisateur (piège documenté MASTER §27). L'appartenance reste
// garantie par le filtre explicite organization_id sur attendance.

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>

export interface AttendanceReportRow {
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

export interface AttendanceReport {
  from: string
  to: string
  rows: AttendanceReportRow[]
  totals: { present: number; absent: number; late: number; excused: number; total: number }
  students: number
}

export interface AttendanceReportParams {
  organizationId: string
  from: string
  to: string
  siteId?: string | null
  groupId?: string | null
}

export async function buildAttendanceReport(
  admin: AnySupabase,
  { organizationId, from, to, siteId, groupId }: AttendanceReportParams
): Promise<AttendanceReport> {
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
    .eq('organization_id', organizationId)
    .gte('session.session_date', from)
    .lte('session.session_date', to)

  if (groupId) query = query.eq('session.group_id', groupId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const byStudent = new Map<string, AttendanceReportRow>()
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

  return { from, to, rows, totals, students: rows.length }
}
