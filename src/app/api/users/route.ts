import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/with-api-auth'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

const VALID_ROLES = ['admin', 'teacher', 'viewer'] as const

export async function GET(request: NextRequest) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  const admin = createAdminSupabaseClient()

  // Membres de l'organisation de l'appelant uniquement — jamais toute
  // l'instance (multi-tenant : les autres écoles sont invisibles).
  const { data: members, error } = await admin
    .from('users')
    .select('id, full_name, role, created_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.id)
      const u = data?.user
      return {
        id: m.id,
        email: u?.email ?? null,
        role: m.role,
        displayName: m.full_name ?? (u?.user_metadata?.display_name as string) ?? null,
        createdAt: m.created_at,
        lastSignIn: u?.last_sign_in_at ?? null,
        confirmed: !!u?.email_confirmed_at,
        banned: u?.banned_until ? new Date(u.banned_until) > new Date() : false,
      }
    })
  )

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  const body = await request.json()
  const { email, password, displayName, role = 'teacher' } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Mot de passe : 8 caracteres minimum.' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // organization_id dans app_metadata : posé UNIQUEMENT côté service-role,
  // le trigger handle_new_user() rattache l'invité à l'org de l'admin.
  // (user_metadata serait falsifiable par un client → jamais utilisé ici.)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName ?? '', full_name: displayName ?? '' },
    app_metadata: { organization_id: auth.organizationId, role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role,
      displayName: displayName ?? null,
      createdAt: data.user.created_at,
    },
  }, { status: 201 })
}
