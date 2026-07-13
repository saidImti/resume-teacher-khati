// ─── API /api/feature-flags ───────────────────────────────────────────────────
// GET  → liste tous les feature flags de l'organisation
// PATCH → toggle enabled_for_teacher ou enabled_for_parents (admin uniquement)

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('feature_flags')
      .select('feature_key, label, description, category, icon, sort_order, enabled_for_teacher, enabled_for_parents')
      .eq('organization_id', ctx.organizationId)
      .order('sort_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flags: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Config : admin uniquement (matrice RLS)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    const supabase = await createServerSupabaseClient()

    const body = await req.json() as {
      feature_key: string
      field: 'enabled_for_teacher' | 'enabled_for_parents'
      value: boolean
    }

    if (!body.feature_key || !body.field) {
      return NextResponse.json({ error: 'feature_key et field requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('feature_flags')
      .update({ [body.field]: body.value })
      .eq('organization_id', ctx.organizationId)
      .eq('feature_key', body.feature_key)
      .select('feature_key, enabled_for_teacher, enabled_for_parents')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flag: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
