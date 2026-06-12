/**
 * /api/keys — Gestion des clés API externes
 * GET  → liste les clés de l'utilisateur connecté
 * POST → crée une nouvelle clé
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-key'

// ── GET : lister les clés ─────────────────────────────────────
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data })
}

// ── POST : créer une clé ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { name, scopes = ['read'], expires_at } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom de la clé est requis' }, { status: 400 })
  }

  // Générer la clé
  const { raw, hash, prefix } = generateApiKey()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id:    user.id,
      name:       name.trim(),
      key_hash:   hash,
      key_prefix: prefix,
      scopes,
      expires_at: expires_at ?? null,
    })
    .select('id, name, key_prefix, scopes, expires_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // On retourne la clé RAW une seule fois — elle ne sera plus jamais lisible ensuite
  return NextResponse.json({
    ...data,
    key: raw,
    warning: '⚠️ Sauvegarde cette clé maintenant — elle ne sera plus affichée.',
  }, { status: 201 })
}
