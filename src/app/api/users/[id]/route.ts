import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/with-api-auth'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

const VALID_ROLES = ['admin', 'teacher', 'viewer'] as const

/** La cible doit appartenir à l'organisation de l'appelant. */
async function assertSameOrg(targetId: string, organizationId: string) {
  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('users')
    .select('organization_id')
    .eq('id', targetId)
    .maybeSingle()
  return data?.organization_id === organizationId
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  const { id } = params
  if (!(await assertSameOrg(id, auth.organizationId))) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }

  const body = await request.json()
  const { email, password, displayName, role } = body

  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }
  if (role && id === auth.userId) {
    return NextResponse.json({ error: 'Impossible de changer votre propre rôle.' }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  if (email) update.email = email
  if (password) update.password = password

  const meta: Record<string, string> = {}
  if (displayName !== undefined) meta.display_name = displayName
  if (Object.keys(meta).length) update.user_metadata = meta
  if (role) update.app_metadata = { role }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.auth.admin.updateUserById(id, update)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Le rôle effectif (celui que lit la RLS) vit dans public.users —
  // le metadata seul ne changerait rien aux permissions.
  const profileUpdate: Record<string, unknown> = {}
  if (role) profileUpdate.role = role
  if (displayName !== undefined) profileUpdate.full_name = displayName
  if (Object.keys(profileUpdate).length) {
    const { error: profileError } = await admin
      .from('users')
      .update(profileUpdate)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: role ?? undefined,
      displayName: (data.user.user_metadata?.display_name as string) ?? null,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  if (params.id === auth.userId) {
    return NextResponse.json({ error: 'Impossible de supprimer votre propre compte.' }, { status: 403 })
  }

  if (!(await assertSameOrg(params.id, auth.organizationId))) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
