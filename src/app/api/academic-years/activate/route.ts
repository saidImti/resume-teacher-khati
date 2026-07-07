// ─── POST /api/academic-years/activate ────────────────────────────────────────
// Body : { yearId }
// Désactive toutes les autres années de l'organisation, active celle-ci.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Config : admin uniquement (matrice RLS)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    const supabase = await createServerSupabaseClient()

    const { yearId } = await req.json() as { yearId: string }
    if (!yearId) return NextResponse.json({ error: 'yearId requis' }, { status: 400 })

    // Désactiver toutes les années de l'organisation
    await supabase
      .from('academic_years')
      .update({ is_active: false })
      .eq('organization_id', ctx.organizationId)

    // Activer l'année demandée
    const { data, error } = await supabase
      .from('academic_years')
      .update({ is_active: true })
      .eq('id', yearId)
      .eq('organization_id', ctx.organizationId)
      .select('id, name, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ year: data, message: `${data.name} est maintenant l'année active` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
