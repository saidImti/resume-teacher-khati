import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── POST /api/fiches/save ────────────────────────────────────────────────────
// Sauvegarde une fiche de séance ou un bilan annuel généré par l'IA.

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    type:          'seance' | 'bilan'
    data:          Record<string, unknown>
    title?:        string
    level?:        string
    level_slug?:   string
    theme?:        string
    academic_year?: string
    session_date?:  string
  }

  const { type, data } = body
  if (!type || !data) {
    return NextResponse.json({ error: 'type et data sont requis' }, { status: 400 })
  }

  // Construire les métadonnées d'affichage
  let title = body.title ?? ''
  if (!title) {
    if (type === 'seance') {
      title = [data.theme, data.level].filter(Boolean).join(' · ') || 'Fiche de séance'
    } else {
      title = [data.level, data.academicYear].filter(Boolean).join(' · ') || 'Bilan annuel'
    }
  }

  const { data: row, error } = await supabase
    .from('saved_fiches')
    .insert({
      user_id:      user.id,
      type,
      title,
      level:        (body.level        ?? String(data.level   ?? '')) || 'Inconnu',
      level_slug:   body.level_slug    ?? null,
      theme:        body.theme         ?? (type === 'seance' ? String(data.theme ?? '') : null),
      academic_year: body.academic_year ?? (type === 'bilan' ? String(data.academicYear ?? '') : null),
      session_date: body.session_date  ?? (type === 'seance' ? String(data.date ?? '') : null),
      data,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('save_fiche error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: row.id, created_at: row.created_at })
}

// ─── GET /api/fiches/save ─────────────────────────────────────────────────────
// Liste l'historique des fiches sauvegardées.

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type  = searchParams.get('type')   // 'seance' | 'bilan' | null (all)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  let query = supabase
    .from('saved_fiches')
    .select('id, type, title, level, level_slug, theme, academic_year, session_date, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type === 'seance' || type === 'bilan') {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, fiches: data })
}
