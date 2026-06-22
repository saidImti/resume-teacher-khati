// ─── API /api/attendance/sessions ────────────────────────────────────────────
// GET  → sessions disponibles pour faire l'appel (par date + groupe)
// POST → créer une session à la volée si elle n'existe pas encore

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── GET ─────────────────────────────────────────────────────────────────────
// Params : ?date=2026-06-22&groupId=xxx (optionnels)
// Sans params : retourne les sessions des 7 derniers jours + aujourd'hui

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date    = searchParams.get('date')
    const groupId = searchParams.get('groupId')

    let query = supabase
      .from('sessions')
      .select(`
        id, session_date, title,
        group:groups(
          id, name,
          level:levels(id, name, emoji, color),
          site:sites(id, name)
        )
      `)
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(30)

    if (date)    query = query.eq('session_date', date)
    if (groupId) query = query.eq('group_id', groupId)

    // Par défaut : 14 derniers jours
    if (!date && !groupId) {
      const since = new Date()
      since.setDate(since.getDate() - 14)
      query = query.gte('session_date', since.toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Pour chaque session, compte les présences enregistrées
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
// Body : { groupId, date }
// Trouve ou crée la session pour ce groupe+date, retourne son id

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { groupId, date } = await req.json() as { groupId: string; date: string }
    if (!groupId || !date) {
      return NextResponse.json({ error: 'groupId et date requis' }, { status: 400 })
    }

    // Cherche une session existante
    const { data: existing } = await supabase
      .from('sessions')
      .select('id, session_date, title')
      .eq('group_id', groupId)
      .eq('session_date', date)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ session: existing, created: false })
    }

    // Crée la session automatiquement
    const { data: created, error } = await supabase
      .from('sessions')
      .insert({ group_id: groupId, session_date: date, user_id: user.id })
      .select('id, session_date, title')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ session: created, created: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
