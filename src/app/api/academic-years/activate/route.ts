// ─── POST /api/academic-years/activate ────────────────────────────────────────
// Body : { yearId }
// Désactive toutes les autres années, active celle-ci.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { yearId } = await req.json() as { yearId: string }
    if (!yearId) return NextResponse.json({ error: 'yearId requis' }, { status: 400 })

    // Désactiver toutes les années de cet utilisateur
    await supabase
      .from('academic_years')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Activer l'année demandée
    const { data, error } = await supabase
      .from('academic_years')
      .update({ is_active: true })
      .eq('id', yearId)
      .eq('user_id', user.id)
      .select('id, name, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ year: data, message: `${data.name} est maintenant l'année active` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
