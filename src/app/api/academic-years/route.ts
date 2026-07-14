// ─── API /api/academic-years ──────────────────────────────────────────────────
// GET  → liste toutes les années
// POST → créer une nouvelle année (avec option de copie des groupes)

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'

export async function GET() {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      // DEBUG TEMPORAIRE (retirer apres diagnostic) — voir ERRORS/008.
      const hdrs = await headers()
      return NextResponse.json({
        error: 'Non authentifié',
        debugVerifiedHeader: hdrs.get('x-mw-verified-user-id'),
      }, { status: 401 })
    }
    const supabase = await createServerSupabaseClient()

    // Années de l'ORGANISATION (pas du user) — tous les membres voient les mêmes
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, is_active, color')
      .eq('organization_id', ctx.organizationId)
      .order('start_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Pour chaque année, compte les groupes et élèves associés
    const yearIds = (data ?? []).map((y) => y.id)

    const { data: groupCounts } = await supabase
      .from('groups')
      .select('academic_year_id')
      .eq('organization_id', ctx.organizationId)
      .in('academic_year_id', yearIds)

    const countMap = new Map<string, number>()
    for (const g of (groupCounts ?? [])) {
      if (g.academic_year_id) {
        countMap.set(g.academic_year_id, (countMap.get(g.academic_year_id) ?? 0) + 1)
      }
    }

    const years = (data ?? []).map((y) => ({
      ...y,
      group_count: countMap.get(y.id) ?? 0,
    }))

    return NextResponse.json({ years })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Config : admin uniquement (matrice RLS)
    if (ctx.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    const supabase = await createServerSupabaseClient()

    const body = await req.json() as {
      name:        string
      start_date:  string
      end_date:    string
      color?:      string
      copy_from_year_id?: string  // copier les groupes d'une année précédente
    }

    if (!body.name || !body.start_date || !body.end_date) {
      return NextResponse.json({ error: 'name, start_date et end_date requis' }, { status: 400 })
    }

    // Créer l'année
    const { data: newYear, error: yearErr } = await supabase
      .from('academic_years')
      .insert({
        organization_id: ctx.organizationId,
        // user_id NOT NULL jusqu'à la migration 019
        user_id:    ctx.user.id,
        name:       body.name,
        start_date: body.start_date,
        end_date:   body.end_date,
        color:      body.color ?? '#6366f1',
        is_active:  false,
      })
      .select('id, name, start_date, end_date, is_active, color')
      .single()

    if (yearErr || !newYear) {
      return NextResponse.json({ error: yearErr?.message ?? 'Erreur création' }, { status: 500 })
    }

    let copiedGroups = 0

    // Copier les groupes de l'année source si demandé
    if (body.copy_from_year_id) {
      const { data: sourceGroups } = await supabase
        .from('groups')
        .select('name, level_id, site_id, max_students, description')
        .eq('organization_id', ctx.organizationId)
        .eq('academic_year_id', body.copy_from_year_id)
        .eq('is_active', true)

      if (sourceGroups && sourceGroups.length > 0) {
        const newGroups = sourceGroups.map((g) => ({
          organization_id:  ctx.organizationId,
          user_id:          ctx.user.id,
          academic_year_id: newYear.id,
          name:             g.name,
          level_id:         g.level_id,
          site_id:          g.site_id,
          max_students:     g.max_students,
          description:      g.description,
          is_active:        true,
        }))

        const { data: inserted } = await supabase
          .from('groups')
          .insert(newGroups)
          .select('id')

        copiedGroups = inserted?.length ?? 0
      }
    }

    return NextResponse.json({
      year:         newYear,
      copied_groups: copiedGroups,
      message:      `Année ${body.name} créée${copiedGroups > 0 ? ` avec ${copiedGroups} groupe(s) copiés` : ''}`,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
