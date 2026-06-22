// ─── API /api/attendance/sessions ────────────────────────────────────────────
// GET  → sessions disponibles pour faire l'appel (par date + groupe)
// POST → créer une session à la volée si elle n'existe pas encore

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminSupabaseClient()
    const { searchParams } = new URL(req.url)
    const date    = searchParams.get('date')
    const groupId = searchParams.get('groupId')

    // sessions n'a pas de colonne user_id — admin client
    let query = admin
      .from('sessions')
      .select(`
        id, session_date, title,
        group:groups(
          id, name,
          level:levels(id, name, emoji, color),
          site:sites(id, name)
        )
      `)
      .order('session_date', { ascending: false })
      .limit(30)

    if (date)    query = query.eq('session_date', date)
    if (groupId) query = query.eq('group_id', groupId)

    if (!date && !groupId) {
      const since = new Date()
      since.setDate(since.getDate() - 14)
      query = query.gte('session_date', since.toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sessionIds = (data ?? []).map((s) => s.id)
    const { data: attendanceCounts } = await supabase
      .from('attendance')
      .select('session_id, status')
      .in('session_id', sessionIds)
      .eq('user_id', user.id)

    const countMap = new Map<string, { present: number; absent: number; total: number }>()
    for (const a of (attendanceCounts ?? [])) {
      const c = countMap.get(a.session_id) ?? { present: 0, absent: 0, total: 0 }
      c.total++
      if (a.status === 'present' || a.status === 'late') c.present++
      if (a.status === 'absent') c.absent++
      countMap.set(a.session_id, c)
    }

    const sessions = (data ?? []).map((s) => ({
      ...s,
      attendanceDone: (countMap.get(s.id)?.total ?? 0) > 0,
      stats: countMap.get(s.id) ?? null,
    }))

    return NextResponse.json({ sessions })
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

    const { groupId, date } = await req.json() as { groupId: string; date: string }
    if (!groupId || !date) {
      return NextResponse.json({ error: 'groupId et date requis' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    // sessions n'a pas de colonne user_id — admin client
    const { data: existing } = await admin
      .from('sessions')
      .select('id, session_date, title, group:groups(id, name, level:levels(id, name, emoji, color), site:sites(id, name))')
      .eq('group_id', groupId)
      .eq('session_date', date)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ session: existing, created: false })
    }

    const { data: created, error } = await admin
      .from('sessions')
      .insert({ group_id: groupId, session_date: date })
      .select('id, session_date, title, group:groups(id, name, level:levels(id, name, emoji, color), site:sites(id, name))')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ session: created, created: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
