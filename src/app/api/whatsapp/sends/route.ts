import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── GET /api/whatsapp/sends ──────────────────────────────────────────────────
// Params: resumeId (required) ou groupId (optionnel), page, limit

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const resumeId = searchParams.get('resumeId')
  const groupId = searchParams.get('groupId')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)))
  const offset = (page - 1) * limit

  if (!resumeId && !groupId) {
    return NextResponse.json(
      { error: 'Paramètre resumeId ou groupId requis' },
      { status: 422 }
    )
  }

  let query = supabase
    .from('whatsapp_sends')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (resumeId) query = query.eq('resume_id', resumeId)
  if (groupId) query = query.eq('group_id', groupId)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    sends: data ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  })
}
