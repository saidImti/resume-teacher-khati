// ─── PATCH /api/academic-years/[id] ──────────────────────────────────────────
// Met à jour une année (name, start_date, end_date, color, notes)
// ─── DELETE /api/academic-years/[id] ─────────────────────────────────────────
// Supprime une année (seulement si non active et 0 groupes)
// Config : admin de l'organisation uniquement.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    const supabase = await createServerSupabaseClient()

    const { id } = await params
    const body = await req.json() as {
      name?:       string
      start_date?: string
      end_date?:   string
      color?:      string
      notes?:      string
    }

    const { data, error } = await supabase
      .from('academic_years')
      .update(body)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('id, name, start_date, end_date, is_active, color, notes')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ year: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    const supabase = await createServerSupabaseClient()

    const { id } = await params

    // Vérifier que l'année existe et appartient à l'organisation
    const { data: year } = await supabase
      .from('academic_years')
      .select('id, name, is_active')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (!year) return NextResponse.json({ error: 'Année introuvable' }, { status: 404 })
    if (year.is_active) {
      return NextResponse.json({ error: 'Impossible de supprimer l\'année active' }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas de groupes
    const { count } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id)
      .eq('organization_id', ctx.organizationId)

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: `Impossible de supprimer : ${count} groupe(s) associé(s)`,
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: `${year.name} supprimée` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
