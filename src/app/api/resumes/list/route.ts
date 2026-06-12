import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/resumes/list
// Query params: levelId, siteId, search, status, page, limit
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const levelId  = searchParams.get('levelId')  ?? ''
  const siteId   = searchParams.get('siteId')   ?? ''
  const search   = searchParams.get('search')   ?? ''
  const status   = searchParams.get('status')   ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit    = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const offset   = (page - 1) * limit

  try {
    // Build the query — résumés with their session + group + level + site joins
    let query = supabase
      .from('resumes')
      .select(`
        id,
        title,
        intro,
        body_text,
        status,
        version,
        is_current,
        created_at,
        updated_at,
        session:sessions (
          id,
          session_date,
          title,
          theme,
          group:groups (
            id,
            name,
            level:levels ( id, name, slug, emoji, color ),
            site:sites   ( id, name, slug, color )
          )
        )
      `, { count: 'exact' })
      .eq('is_current', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtre statut
    if (status) query = query.eq('status', status)

    // Filtre recherche sur le titre
    if (search) query = query.ilike('title', `%${search}%`)

    const { data, error, count } = await query

    if (error) throw error

    // Filtrage côté JS pour level/site (les FK sont sur groups, pas sur resumes)
    let filtered = data ?? []

    if (levelId) {
      filtered = filtered.filter((r) => {
        const session = (r.session as unknown as Record<string, unknown> | null)
        const group   = session?.group as Record<string, unknown> | null
        const level   = group?.level   as Record<string, unknown> | null
        return level?.id === levelId
      })
    }

    if (siteId) {
      filtered = filtered.filter((r) => {
        const session = (r.session as unknown as Record<string, unknown> | null)
        const group   = session?.group as Record<string, unknown> | null
        const site    = group?.site    as Record<string, unknown> | null
        return site?.id === siteId
      })
    }

    return NextResponse.json({
      resumes:  filtered,
      total:    count ?? 0,
      page,
      limit,
      hasMore:  offset + limit < (count ?? 0),
    })
  } catch (err) {
    console.error('GET /api/resumes/list error:', err)
    return NextResponse.json({ error: 'Erreur lors du chargement.' }, { status: 500 })
  }
}
