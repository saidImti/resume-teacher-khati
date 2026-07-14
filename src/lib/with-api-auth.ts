/**
 * Helper : authentification hybride pour les routes API
 * Accepte :
 *   1. Session Supabase (cookie) → usage normal depuis le dashboard
 *   2. Header X-API-Key: rtk_xxx → usage externe (n8n, Make, Zapier...)
 *   3. Header Authorization: Bearer rtk_xxx → idem
 *
 * Multi-tenant : résout aussi l'organisation et le rôle de l'appelant.
 * Les scopes de session dérivent du rôle en base (public.users.role) —
 * jamais « admin » par défaut (un viewer ne doit pas pouvoir écrire).
 *
 * Usage dans une route :
 *   const auth = await withApiAuth(request)
 *   if (!auth.ok) return auth.response
 *   const { userId, organizationId, role, scopes } = auth
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { validateApiKey, hasScope } from '@/lib/api-key'

type Scope = 'read' | 'write' | 'admin'
export type OrgRole = 'admin' | 'teacher' | 'viewer'

type AuthSuccess = {
  ok: true
  userId: string
  organizationId: string
  role: OrgRole
  scopes: string[]
  via: 'session' | 'api-key'
  hasScope: (s: Scope) => boolean
}

type AuthFailure = {
  ok: false
  response: NextResponse
}

const SCOPES_BY_ROLE: Record<OrgRole, string[]> = {
  admin: ['read', 'write', 'admin'],
  teacher: ['read', 'write'],
  viewer: ['read'],
}

async function resolveOrgAndRole(userId: string): Promise<{ organizationId: string; role: OrgRole } | null> {
  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .maybeSingle()
  if (!data?.organization_id) return null
  const role: OrgRole = data.role === 'admin' || data.role === 'teacher' || data.role === 'viewer'
    ? data.role
    : 'viewer'
  return { organizationId: data.organization_id, role }
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

    const org = await resolveOrgAndRole(result.userId!)
    if (!org) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Utilisateur sans organisation' },
          { status: 403 }
        ),
      }
    }

    // Les scopes de la clé sont plafonnés par le rôle réel de son propriétaire
    const keyScopes = result.scopes ?? ['read']
    const roleScopes = SCOPES_BY_ROLE[org.role]
    const scopes = keyScopes.filter((s) => roleScopes.includes(s))

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
      organizationId: org.organizationId,
      role: org.role,
      scopes,
      via: 'api-key',
      hasScope: (s) => hasScope(scopes, s),
    }
  }

  // ── 2. Essai par session Supabase (cookie) ───────────────────
  try {
    // Identité déjà vérifiée par le middleware pour cette requête (header
    // interne, jamais fourni par le client) — évite un 2e appel réseau à
    // auth.getUser() qui ferait courir une race sur le refresh token en
    // concurrence avec la vérification du middleware. Voir ERRORS/008.
    const verifiedUserId = request.headers.get('x-mw-verified-user-id')

    let userId: string
    if (verifiedUserId) {
      userId = verifiedUserId
    } else {
      // Filet de secours si le middleware n'a pas tourné pour cette route.
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
      userId = user.id
    }

    const org = await resolveOrgAndRole(userId)
    if (!org) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Utilisateur sans organisation' },
          { status: 403 }
        ),
      }
    }

    const scopes = SCOPES_BY_ROLE[org.role]

    if (!hasScope(scopes, requiredScope)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Accès refusé : rôle « ${org.role} » insuffisant (requis : ${requiredScope})` },
          { status: 403 }
        ),
      }
    }

    return {
      ok: true,
      userId,
      organizationId: org.organizationId,
      role: org.role,
      scopes,
      via: 'session',
      hasScope: (s) => hasScope(scopes, s),
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 500 }),
    }
  }
}
