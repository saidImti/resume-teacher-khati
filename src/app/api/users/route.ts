import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/with-api-auth'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await withApiAuth(request, 'admin')
  if (!auth.ok) return auth.response

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    role: (u.user_metadata?.role as string) ?? 'teacher',
    displayName: (u.user_metadata?.display_name as string) ?? null,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
    confirmed: !!u.email_confirmed_at,
    banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
  }))

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

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName ?? '', role },
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
