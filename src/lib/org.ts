/**
 * Contexte organisation pour les Server Components et routes qui font
 * auth.getUser() directement (sans passer par withApiAuth).
 *
 * Multi-tenant : chaque utilisateur appartient à exactement une
 * organisation (users.organization_id NOT NULL).
 */
import type { User } from '@supabase/supabase-js'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import type { OrgRole } from '@/lib/with-api-auth'

export interface OrgContext {
  user: User
  organizationId: string
  role: OrgRole
}

/**
 * Résout l'utilisateur courant (cookie de session) + son organisation.
 * Retourne null si non authentifié ou sans organisation.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!data?.organization_id) return null

  const role: OrgRole = data.role === 'admin' || data.role === 'teacher' || data.role === 'viewer'
    ? data.role
    : 'viewer'

  return { user, organizationId: data.organization_id, role }
}

/**
 * Résout l'organisation d'un utilisateur donné (ex. token d'inscription
 * publique legacy qui transporte un userId).
 */
export async function getOrgIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

/**
 * Organisation d'un token d'inscription publique : portée par le token
 * (nouveau format), sinon résolue depuis l'émetteur (token legacy).
 */
export async function resolveRegistrationOrgId(
  payload: { organizationId?: string; userId: string }
): Promise<string | null> {
  return payload.organizationId ?? getOrgIdForUser(payload.userId)
}
