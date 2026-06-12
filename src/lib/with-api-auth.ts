/**
 * Helper : authentification hybride pour les routes API
 * Accepte :
 *   1. Session Supabase (cookie) → usage normal depuis le dashboard
 *   2. Header X-API-Key: rtk_xxx → usage externe (n8n, Make, Zapier...)
 *   3. Header Authorization: Bearer rtk_xxx → idem
 *
 * Usage dans une route :
 *   const auth = await withApiAuth(request)
 *   if (!auth.ok) return auth.response
 *   const { userId, scopes } = auth
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { validateApiKey, hasScope } from '@/lib/api-key'

type Scope = 'read' | 'write' | 'admin'

type AuthSuccess = {
  ok: true
  userId: string
  scopes: string[]
  via: 'session' | 'api-key'
  hasScope: (s: Scope) => boolean
}

type AuthFailure = {
  ok: false
  response: NextResponse
}

export async function withApiAuth(
  request: NextRequest,
  requiredScope: Scope = 'read'
): Promise<AuthSuccess | AuthFailure> {

  // ── 1. Essai par clé API (header X-API-Key ou Authorization: Bearer rtk_) ──
  const rawKey =
    request.headers.get('X-API-Key') ??
    request.headers.get('Authorization')?.replace(/^Bearer\s+/, '') ??
    null

  if (rawKey?.startsWith('rtk_')) {
    const result = await validateApiKey(rawKey)

    if (!result.valid) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: result.error ?? 'Clé API invalide' },
          { status: 401, headers: { 'WWW-Authenticate': 'ApiKey' } }
        ),
      }
    }

    const scopes = result.scopes ?? ['read']

    if (!hasScope(scopes, requiredScope)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Scope insuffisant. Requis : ${requiredScope}` },
          { status: 403 }
        ),
      }
    }

    return {
      ok: true,
      userId: result.userId!,
      scopes,
      via: 'api-key',
      hasScope: (s) => hasScope(scopes, s),
    }
  }

  // ── 2. Essai par session Supabase (cookie) ───────────────────
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Non authentifié. Fournissez une session ou un header X-API-Key.' },
          { status: 401 }
        ),
      }
    }

    return {
      ok: true,
      userId: user.id,
      scopes: ['admin'],
      via: 'session',
      hasScope: () => true,   // session = tous les droits
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 500 }),
    }
  }
}
