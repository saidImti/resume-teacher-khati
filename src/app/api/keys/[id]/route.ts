/**
 * /api/keys/[id]
 * PATCH  → renommer ou désactiver une clé
 * DELETE → révoquer définitivement une clé
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// ── PATCH : modifier ──────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  if (body.name      !== undefined) update.name      = body.name
  if (body.is_active !== undefined) update.is_active = body.is_active
  if (body.scopes    !== undefined) update.scopes    = body.scopes

  const { data, error } = await supabase
    .from('api_keys')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, key_prefix, scopes, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── DELETE : révoquer ─────────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
