// ─── API /api/attendance/day ─────────────────────────────────────────────────
// POST { date } → l'appel du jour GROUPÉ : tous les groupes qui ont cours
// ce jour-là (d'après les créneaux du planning), avec leur session
// (trouvée ou créée), leurs élèves inscrits et les présences déjà marquées.
// Équivalent RTK de l'« Appel du jour » du dashboard legacy
// (groupé lieu → créneau → niveau).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

// schedules.day_of_week : 0=Lundi … 6=Dimanche (migration 009).
// JS getDay() : 0=Dimanche … 6=Samedi → conversion.
function dayOfWeekFromDate(date: string): number {
  const js = new Date(`${date}T12:00:00`).getDay()
  return js === 0 ? 6 : js - 1
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { date } = await req.json() as { date?: string }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date (YYYY-MM-DD) requise' }, { status: 400 })
    }
    const dow = dayOfWeekFromDate(date)

    // sessions/groups/schedules/enrollments sans user_id → client admin (MASTER §27)
    const admin = createAdminSupabaseClient()

    // 1. Tous les créneaux actifs de ce jour de semaine
    const { data: schedules, error: schedErr } = await admin
      .from('schedules')
      .select(`
        id, day_of_week, start_time, end_time, room, max_students, group_id,
        group:groups(id, name, is_active, level:levels(id, name, emoji, color), site:sites(id, name))
      `)
      .eq('day_of_week', dow)
      .eq('is_active', true)
      .order('start_time')
    if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 })

    // Dédupliquer par groupe (un groupe = un appel, même si plusieurs créneaux)
    const byGroup = new Map<string, NonNullable<typeof schedules>[number]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (schedules ?? []) as any[]) {
      if (!s.group || s.group.is_active === false) continue
      if (!byGroup.has(s.group_id)) byGroup.set(s.group_id, s)
    }
    const daySchedules = [...byGroup.values()]
    if (daySchedules.length === 0) {
      return NextResponse.json({ date, dayOfWeek: dow, groups: [] })
    }

    const groupIds = daySchedules.map(s => s.group_id)

    // 2. Sessions du jour — trouver puis créer les manquantes
    const { data: existingSessions } = await admin
      .from('sessions')
      .select('id, group_id')
      .eq('session_date', date)
      .in('group_id', groupIds)
    const sessionByGroup = new Map((existingSessions ?? []).map(s => [s.group_id, s.id]))

    const missing = groupIds.filter(id => !sessionByGroup.has(id))
    if (missing.length > 0) {
      const { data: created, error: createErr } = await admin
        .from('sessions')
        .insert(missing.map(group_id => ({ group_id, session_date: date })))
        .select('id, group_id')
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
      for (const s of created ?? []) sessionByGroup.set(s.group_id, s.id)
    }

    // 3. Élèves inscrits (actifs/essai) de tous les groupes du jour
    const { data: enrollments, error: enrErr } = await admin
      .from('enrollments')
      .select('group_id, student:students(id, first_name, last_name)')
      .in('group_id', groupIds)
      .in('status', ['active', 'trial'])
    if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 })

    // 4. Présences déjà marquées sur ces sessions (les miennes)
    const sessionIds = [...sessionByGroup.values()]
    const { data: attendance } = await supabase
      .from('attendance')
      .select('session_id, student_id, status')
      .in('session_id', sessionIds)
      .eq('user_id', user.id)
    const attKey = new Map((attendance ?? []).map(a => [`${a.session_id}|${a.student_id}`, a.status]))

    // 5. Assemblage : un bloc par groupe, trié site → heure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = daySchedules.map((s: any) => {
      const sessionId = sessionByGroup.get(s.group_id)!
      const students = (enrollments ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((e: any) => e.group_id === s.group_id && e.student)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => ({
          id: e.student.id,
          first_name: e.student.first_name,
          last_name: e.student.last_name,
          status: attKey.get(`${sessionId}|${e.student.id}`) ?? 'unmarked',
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'))

      return {
        groupId: s.group_id,
        sessionId,
        name: s.group.name,
        level: s.group.level,
        site: s.group.site,
        startTime: String(s.start_time).slice(0, 5),
        endTime: String(s.end_time).slice(0, 5),
        room: s.room,
        students,
      }
    }).sort((a, b) =>
      (a.site?.name ?? '').localeCompare(b.site?.name ?? '', 'fr') || a.startTime.localeCompare(b.startTime)
    )

    return NextResponse.json({ date, dayOfWeek: dow, groups })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
